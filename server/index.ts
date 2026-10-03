// R5: el manejador HTTP ya no contiene cabeceras de seguridad, servido de
// archivos estáticos ni la cadena if/else-if de rutas de la API — cada una
// vive en su propio módulo (security-headers.ts, static-files.ts,
// api-router.ts). Este archivo solo arma el servidor y conecta las piezas.
import http from "node:http";
import { ZodError } from "zod";
import { config } from "./config";
import { raw } from "./database";
import { bootstrap } from "./auth";
import { DomainError, ensure } from "../lib/domain";
import { applySecurityHeaders } from "./security-headers";
import { serveStatic } from "./static-files";
import { routeApi } from "./api-router";

if (config.demo && !raw.prepare("SELECT id FROM members WHERE demo=0").get())
  await bootstrap(
    "admin@demo.local",
    "Administrador de demostración",
    "NexoDemo2026!",
  );

let vite: any;

async function body(req: http.IncomingMessage) {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    ensure(size <= 65536, "Solicitud demasiado grande.", 413);
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString("utf8");
}

const server = http.createServer(async (req, res) => {
  const requestId = crypto.randomUUID();
  applySecurityHeaders(res);
  try {
    const url = new URL(req.url ?? "/", config.origin),
      method = req.method ?? "GET";
    if (url.pathname.startsWith("/api/")) {
      res.setHeader("Cache-Control", "no-store");
      ensure(["GET", "POST"].includes(method), "Método no permitido.", 405);
      const headers = new Headers();
      for (const [k, v] of Object.entries(req.headers))
        if (v) headers.set(k, Array.isArray(v) ? v.join(",") : v);
      let text = "";
      if (method === "POST") {
        ensure(
          req.headers.origin === config.origin,
          "Origen de solicitud no permitido.",
          403,
        );
        ensure(
          req.headers["content-type"]?.startsWith("application/json"),
          "Se requiere JSON.",
          415,
        );
        text = await body(req);
      }
      const request = new Request(url, {
        method,
        headers,
        ...(method === "POST" ? { body: text } : {}),
      });
      const response = await routeApi({
        request,
        rawBody: text,
        remoteAddress: req.socket.remoteAddress ?? "unknown",
      });
      res.statusCode = response.status;
      response.headers.forEach((v, k) => res.setHeader(k, v));
      res.end(Buffer.from(await response.arrayBuffer()));
      return;
    }
    serveStatic(req, res, url, method, vite);
  } catch (e) {
    const status =
      e instanceof DomainError ? e.status : e instanceof ZodError ? 422 : 500;
    const message =
      e instanceof DomainError
        ? e.message
        : e instanceof ZodError
          ? e.issues[0]?.message
          : "No se pudo procesar la solicitud.";
    if (status === 500)
      console.error(
        JSON.stringify({
          requestId,
          error: e instanceof Error ? e.message : "unknown",
        }),
      );
    if (!res.headersSent) {
      res.statusCode = status;
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.setHeader("Cache-Control", "no-store");
    }
    res.end(JSON.stringify({ error: message, requestId }));
  }
});
server.requestTimeout = 15000;
server.headersTimeout = 10000;
server.maxRequestsPerSocket = 100;
if (config.dev) {
  const { createServer } = await import("vite");
  vite = await createServer({
    server: { middlewareMode: true, hmr: { server } },
    appType: "spa",
  });
}
server.listen(config.port, config.host, () =>
  console.log(
    `Nexo ATM disponible en ${config.origin} · ${config.demo ? "DEMOSTRACIÓN" : "OPERACIÓN REAL"}`,
  ),
);
function shutdown() {
  server.close(() => {
    raw.close();
    process.exit(0);
  });
  setTimeout(() => process.exit(0), 5000).unref();
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

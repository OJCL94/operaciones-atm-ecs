// R5: el manejador HTTP ya no contiene cabeceras de seguridad, servido de
// archivos estáticos ni la cadena if/else-if de rutas de la API — cada una
// vive en su propio módulo (security-headers.ts, static-files.ts,
// api-router.ts). Este archivo solo arma el servidor y conecta las piezas.
import http from "node:http";
import { config } from "./config";
import { raw } from "./container";
import { bootstrap } from "./auth";
import { ensure } from "../lib/domain";
import { applySecurityHeaders } from "./security-headers";
import { serveStatic } from "./static-files";
import { routeApi } from "./api-router";
import { buildApiRequest } from "./api-request";
import { describeError } from "./error-response";

if (config.demo && !raw.prepare("SELECT id FROM members WHERE demo=0").get())
  await bootstrap(
    "admin@demo.local",
    "Administrador de demostración",
    "NexoDemo2026!",
  );

let vite: any;

const server = http.createServer(async (req, res) => {
  const requestId = crypto.randomUUID();
  applySecurityHeaders(res);
  try {
    const url = new URL(req.url ?? "/", config.origin),
      method = req.method ?? "GET";
    if (url.pathname.startsWith("/api/")) {
      res.setHeader("Cache-Control", "no-store");
      const { request, rawBody } = await buildApiRequest(req, url, method);
      const response = await routeApi({
        request,
        rawBody,
        remoteAddress: req.socket.remoteAddress ?? "unknown",
      });
      res.statusCode = response.status;
      response.headers.forEach((v, k) => res.setHeader(k, v));
      res.end(Buffer.from(await response.arrayBuffer()));
      return;
    }
    serveStatic(req, res, url, method, vite);
  } catch (e) {
    const { status, message } = describeError(e);
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

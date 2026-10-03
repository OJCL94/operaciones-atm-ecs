import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import { ZodError } from "zod";
import { config } from "./config";
import { raw } from "./database";
import { bootstrap, login, logout, sessionMember } from "./auth";
import { GET } from "./data";
import { POST } from "./actions";
import { DomainError, ensure } from "../lib/domain";
if (config.demo && !raw.prepare("SELECT id FROM members WHERE demo=0").get())
  await bootstrap(
    "admin@demo.local",
    "Administrador de demostración",
    "NexoDemo2026!",
  );
const mime: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".png": "image/png",
  ".woff2": "font/woff2",
};
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
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "same-origin");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()",
  );
  if (config.secure)
    res.setHeader("Strict-Transport-Security", "max-age=31536000");
  res.setHeader(
    "Content-Security-Policy",
    `default-src 'self'; script-src 'self'${config.dev ? " 'unsafe-inline'" : ""}; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'${config.dev ? " ws:" : ""}; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'`,
  );
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
      let response: Response;
      if (url.pathname === "/api/auth/status" && method === "GET") {
        let actor = null;
        try {
          actor = sessionMember(request);
        } catch (e) {
          if (!(e instanceof DomainError)) throw e;
        }
        response = Response.json({
          authenticated: !!actor,
          demoOnly: config.demo,
          setupNeeded: !raw.prepare("SELECT member_id FROM credentials").get(),
        });
      } else if (url.pathname === "/api/auth/login" && method === "POST") {
        let input;
        try {
          input = JSON.parse(text);
        } catch {
          throw new DomainError("JSON inválido.");
        }
        const setCookie = await login(
          input,
          req.socket.remoteAddress ?? "unknown",
        );
        response = Response.json(
          { ok: true },
          { headers: { "Set-Cookie": setCookie } },
        );
      } else if (url.pathname === "/api/auth/logout" && method === "POST")
        response = Response.json(
          { ok: true },
          { headers: { "Set-Cookie": logout(request) } },
        );
      else if (url.pathname === "/api/data" && method === "GET")
        response = await GET(request);
      else if (url.pathname === "/api/actions" && method === "POST")
        response = await POST(request);
      else throw new DomainError("Ruta no encontrada.", 404);
      res.statusCode = response.status;
      response.headers.forEach((v, k) => res.setHeader(k, v));
      res.end(Buffer.from(await response.arrayBuffer()));
      return;
    }
    ensure(method === "GET" || method === "HEAD", "Método no permitido.", 405);
    ensure(
      !decodeURIComponent(url.pathname)
        .split("/")
        .some((part) => part.startsWith(".")),
      "Archivo no encontrado.",
      404,
    );
    if (vite) {
      vite.middlewares(req, res);
      return;
    }
    const publicRoot = path.resolve("dist");
    let file = path.resolve(publicRoot, "." + decodeURIComponent(url.pathname));
    ensure(
      file === publicRoot || file.startsWith(publicRoot + path.sep),
      "Ruta no permitida.",
      403,
    );
    if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {
      ensure(!path.extname(url.pathname), "Archivo no encontrado.", 404);
      file = path.join(publicRoot, "index.html");
    }
    ensure(fs.existsSync(file), "Primero ejecuta npm run build.", 503);
    res.setHeader(
      "Content-Type",
      mime[path.extname(file)] ?? "application/octet-stream",
    );
    res.setHeader(
      "Cache-Control",
      file.includes(path.sep + "assets" + path.sep)
        ? "public,max-age=31536000,immutable"
        : "no-cache",
    );
    if (method === "HEAD") res.end();
    else fs.createReadStream(file).pipe(res);
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

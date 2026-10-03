// Extraído de server/index.ts (R5): sirve el SPA compilado (dist/) y, en
// desarrollo, delega en el middleware de Vite. Misma lógica exacta que
// tenía el "else" final del manejador original: sin cambios de
// comportamiento, solo de ubicación.
import fs from "node:fs";
import path from "node:path";
import type { IncomingMessage, ServerResponse } from "node:http";
import { ensure } from "../lib/domain";

const mime: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".png": "image/png",
  ".woff2": "font/woff2",
};

export function serveStatic(
  req: IncomingMessage,
  res: ServerResponse,
  url: URL,
  method: string,
  vite: any,
) {
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
}

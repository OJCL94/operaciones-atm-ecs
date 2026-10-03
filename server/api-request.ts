// Extensión de R5: al medir después de la extracción mínima que pedía el
// plan (security-headers.ts, static-files.ts, api-router.ts), el manejador
// principal quedó en complejidad 18 y anidamiento 4 — por debajo de la
// meta (≤10 y ≤2). La causa era esta: la lectura del cuerpo y la
// validación de origen/tipo de contenido para POST seguían viviendo
// inline. Se extraen aquí, sin cambiar ninguna validación ni mensaje.
import type http from "node:http";
import { config } from "./config";
import { ensure } from "../lib/domain";

async function readBody(req: http.IncomingMessage) {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    ensure(size <= 65536, "Solicitud demasiado grande.", 413);
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString("utf8");
}

export async function buildApiRequest(
  req: http.IncomingMessage,
  url: URL,
  method: string,
): Promise<{ request: Request; rawBody: string }> {
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
    text = await readBody(req);
  }
  const request = new Request(url, {
    method,
    headers,
    ...(method === "POST" ? { body: text } : {}),
  });
  return { request, rawBody: text };
}

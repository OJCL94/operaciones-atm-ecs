// Extraído de server/index.ts (R5): las cabeceras de seguridad que antes
// vivían al inicio del único manejador HTTP. Se aplican a toda respuesta,
// sea una ruta de /api/ o un archivo estático.
import type { ServerResponse } from "node:http";
import { config } from "./config";

export function applySecurityHeaders(res: ServerResponse) {
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
}

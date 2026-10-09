// R10 — Antes, PORT y APP_ORIGIN eran los únicos valores validados, con
// dos `if` sueltos que lanzaban Error al final del archivo; HOST,
// COOKIE_SECURE, DATA_DIR y DATABASE_PATH se usaban tal cual llegaban de
// process.env, sin comprobar forma ni rango (un PORT vacío, por ejemplo,
// se convertía silenciosamente en NaN y solo fallaba más abajo, lejos de
// la causa). Esta versión valida las variables de entorno reales con el
// mismo Zod que ya valida cada entrada HTTP (lib/handlers/shared-schemas.ts),
// en un solo lugar y con mensajes que nombran la variable y la causa.
import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
if (fs.existsSync(".env")) process.loadEnvFile(".env");

const envSchema = z
  .object({
    HOST: z.string().trim().min(1).default("127.0.0.1"),
    PORT: z.coerce.number().int().min(1).max(65535).default(3000),
    APP_ORIGIN: z.string().trim().url().optional(),
    COOKIE_SECURE: z
      .enum(["true", "false"])
      .optional()
      .transform((v) => v === "true"),
    DATA_DIR: z.string().trim().min(1).default("data"),
    DATABASE_PATH: z.string().trim().min(1).optional(),
    BACKUP_DIR: z.string().trim().min(1).default("backups"),
  })
  .superRefine((env, ctx) => {
    if (env.APP_ORIGIN && new URL(env.APP_ORIGIN).origin !== env.APP_ORIGIN)
      ctx.addIssue({
        code: "custom",
        path: ["APP_ORIGIN"],
        message:
          "APP_ORIGIN debe contener únicamente protocolo, servidor y puerto (sin ruta ni barra final).",
      });
  });

function readEnv() {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const detail = parsed.error.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("; ");
    throw new Error("Configuración de entorno inválida: " + detail);
  }
  return parsed.data;
}

const env = readEnv();

export const config = {
  demo: process.argv.includes("--demo"),
  dev: process.argv.includes("--dev"),
  host: env.HOST,
  port: env.PORT,
  origin: env.APP_ORIGIN ?? `http://127.0.0.1:${env.PORT}`,
  secure: env.COOKIE_SECURE ?? false,
  dataDir: path.resolve(env.DATA_DIR),
  backupDir: path.resolve(env.BACKUP_DIR),
};
export const databasePath = config.demo
  ? path.join(config.dataDir, "demo.sqlite")
  : path.resolve(env.DATABASE_PATH ?? path.join(config.dataDir, "nexo.sqlite"));

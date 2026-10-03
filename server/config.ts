import fs from "node:fs";
import path from "node:path";
if (fs.existsSync(".env")) process.loadEnvFile(".env");
export const config = {
  demo: process.argv.includes("--demo"),
  dev: process.argv.includes("--dev"),
  host: process.env.HOST ?? "127.0.0.1",
  port: Number(process.env.PORT ?? 3000),
  origin:
    process.env.APP_ORIGIN ?? `http://127.0.0.1:${process.env.PORT ?? 3000}`,
  secure: process.env.COOKIE_SECURE === "true",
  dataDir: path.resolve(process.env.DATA_DIR ?? "data"),
};
export const databasePath = config.demo
  ? path.join(config.dataDir, "demo.sqlite")
  : path.resolve(
      process.env.DATABASE_PATH ?? path.join(config.dataDir, "nexo.sqlite"),
    );
if (!Number.isInteger(config.port) || config.port < 1 || config.port > 65535)
  throw new Error("PORT inválido.");
if (new URL(config.origin).origin !== config.origin)
  throw new Error(
    "APP_ORIGIN debe contener únicamente protocolo, servidor y puerto.",
  );

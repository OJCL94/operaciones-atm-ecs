// R8 — Antes de este refactor, este módulo abría el archivo SQLite,
// aplicaba PRAGMAs y corría las migraciones pendientes como efecto
// colateral de importarlo (al nivel superior del archivo, sin que nada lo
// pidiera explícitamente). Cualquier archivo que escribiera
// `import { db } from "./database"` disparaba ese efecto, aunque solo
// quisiera el tipo SqlDatabase o estuviera corriendo en una prueba.
//
// openDatabase(path) convierte eso en una operación explícita: el único
// lugar que la invoca es el raíz de composición (server/container.ts),
// una vez, con la ruta real de datos. Nada más importa este módulo por
// sus efectos.
import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import type {
  SqlDatabase,
  SqlStatement,
  SqlResult,
} from "../lib/database-types";

export function openDatabase(databasePath: string): {
  raw: DatabaseSync;
  db: SqlDatabase;
} {
  fs.mkdirSync(path.dirname(databasePath), { recursive: true });
  const raw = new DatabaseSync(databasePath);
  raw.exec(
    "PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;",
  );
  raw.exec(
    "CREATE TABLE IF NOT EXISTS schema_migrations(name TEXT PRIMARY KEY,checksum TEXT NOT NULL,applied_at TEXT NOT NULL)",
  );
  for (const name of fs
    .readdirSync("drizzle")
    .filter((x) => /^\d+.*\.sql$/.test(x))
    .sort()) {
    const sql = fs.readFileSync(path.join("drizzle", name), "utf8"),
      checksum = createHash("sha256").update(sql).digest("hex");
    const existing = raw
      .prepare("SELECT checksum FROM schema_migrations WHERE name=?")
      .get(name);
    if (existing) {
      if (existing.checksum !== checksum)
        throw new Error("Migración aplicada modificada: " + name);
      continue;
    }
    raw.exec("BEGIN IMMEDIATE");
    try {
      raw.exec(sql);
      raw
        .prepare("INSERT INTO schema_migrations VALUES(?,?,?)")
        .run(name, checksum, new Date().toISOString());
      raw.exec("COMMIT");
    } catch (e) {
      raw.exec("ROLLBACK");
      throw e;
    }
  }
  class Statement implements SqlStatement {
    args: unknown[] = [];
    constructor(public sql: string) {}
    bind(...args: unknown[]) {
      this.args = args;
      return this;
    }
    async first<T>() {
      return (raw.prepare(this.sql).get(...(this.args as any[])) ??
        null) as T | null;
    }
    async all() {
      return { results: raw.prepare(this.sql).all(...(this.args as any[])) };
    }
    async run() {
      const meta = raw.prepare(this.sql).run(...(this.args as any[]));
      return { meta: { ...meta, changes: Number(meta.changes) } };
    }
  }
  const db: SqlDatabase = {
    prepare(sql) {
      return new Statement(sql);
    },
    async batch(statements) {
      raw.exec("BEGIN IMMEDIATE");
      try {
        const results: SqlResult[] = statements.map((s) => {
          const meta = raw.prepare(s.sql).run(...(s.args as any[]));
          return { meta: { ...meta, changes: Number(meta.changes) } };
        });
        raw.exec("COMMIT");
        return results;
      } catch (e) {
        raw.exec("ROLLBACK");
        throw e;
      }
    },
  };
  return { raw, db };
}

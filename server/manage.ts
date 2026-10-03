import { createInterface } from "node:readline/promises";
import fs from "node:fs";
import path from "node:path";
import { raw } from "./database";
import { databasePath, config } from "./config";
import { bootstrap } from "./auth";
async function hiddenPassword() {
  if (!process.stdin.isTTY)
    throw new Error(
      "Usa una terminal interactiva para introducir la contraseña.",
    );
  process.stdout.write("Contraseña (12–128 caracteres, oculta): ");
  process.stdin.setRawMode(true);
  process.stdin.resume();
  return new Promise<string>((resolve, reject) => {
    let value = "";
    function read(chunk: Buffer) {
      for (const ch of chunk.toString()) {
        if (ch === "\r" || ch === "\n") {
          process.stdin.off("data", read);
          process.stdin.setRawMode(false);
          process.stdin.pause();
          process.stdout.write("\n");
          resolve(value);
          return;
        }
        if (ch === "\u0003") {
          process.stdin.setRawMode(false);
          process.exit(130);
        }
        if (ch === "\u007f" || ch === "\b") value = value.slice(0, -1);
        else if (ch >= " ") value += ch;
      }
    }
    process.stdin.on("data", read);
  });
}
try {
  const action = process.argv[2];
  if (action === "admin") {
    if (config.demo)
      throw new Error("La demostración ya dispone de administrador.");
    const rl = createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    const email = await rl.question("Correo del primer administrador: "),
      name = await rl.question("Nombre: ");
    rl.close();
    const password = await hiddenPassword();
    await bootstrap(email, name, password);
    console.log("Administrador creado. Ya puedes iniciar sesión.");
  } else if (action === "check") {
    console.log("Base: " + databasePath);
    const integrity = raw.prepare("PRAGMA integrity_check").all();
    console.log(integrity);
    if (integrity.some((row) => row.integrity_check !== "ok"))
      throw new Error("La verificación detectó daños en la base.");
    const fk = raw.prepare("PRAGMA foreign_key_check").all();
    if (fk.length) throw new Error("Hay inconsistencias de claves foráneas.");
    console.log("Relaciones verificadas.");
    console.log(
      raw
        .prepare("SELECT name,applied_at FROM schema_migrations ORDER BY name")
        .all(),
    );
  } else if (action === "backup") {
    const backupDir = process.env.BACKUP_DIR ?? "backups";
    fs.mkdirSync(backupDir, { recursive: true });
    const target = path.resolve(
      backupDir,
      `nexo-${config.demo ? "demo" : "real"}-${new Date().toISOString().replaceAll(":", "-")}.sqlite`,
    );
    raw.prepare("VACUUM INTO ?").run(target);
    console.log("Respaldo consistente creado: " + target);
  } else throw new Error("Operación desconocida. Usa admin, check o backup.");
} catch (e) {
  console.error(e instanceof Error ? e.message : e);
  process.exitCode = 1;
} finally {
  raw.close();
}

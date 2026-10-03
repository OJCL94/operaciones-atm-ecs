import fs from "node:fs";
import path from "node:path";
const lock = JSON.parse(fs.readFileSync("package-lock.json", "utf8"));
let notices =
  "# Avisos y licencias de terceros\n\nLos componentes reutilizables de la interfaz y estilos de base derivan de shadcn/ui (MIT). Los iconos proceden de Lucide (ISC). Se conserva su atribución. Las referencias visuales externas no aportan código a la aplicación.\n\n## shadcn/ui\n\nFuente: https://github.com/shadcn-ui/ui/blob/main/LICENSE.md\n\n```text\n" +
  fs.readFileSync("vendor/LICENSE-shadcn.txt", "utf8") +
  "\n```\n";
for (const [dir, meta] of Object.entries(lock.packages)
  .filter(([d]) => d)
  .sort(([a], [b]) => a.localeCompare(b))) {
  if (!fs.existsSync(dir)) continue;
  const pkgFile = path.join(dir, "package.json");
  if (!fs.existsSync(pkgFile)) continue;
  const pkg = JSON.parse(fs.readFileSync(pkgFile, "utf8"));
  notices += `\n## ${pkg.name} ${pkg.version}\n\nLicencia declarada: ${typeof pkg.license === "string" ? pkg.license : JSON.stringify(pkg.license ?? meta.license ?? "Consultar paquete")}.\n`;
  const files = fs
    .readdirSync(dir)
    .filter(
      (f) =>
        /^(licen[sc]e|copying|notice)(\.|$)/i.test(f) &&
        fs.statSync(path.join(dir, f)).isFile(),
    );
  for (const f of files)
    notices +=
      "\n" +
      f +
      "\n\n```text\n" +
      fs.readFileSync(path.join(dir, f), "utf8") +
      "\n```\n";
}
fs.writeFileSync("THIRD_PARTY_NOTICES.md", notices);
console.log("Avisos de terceros conservados.");

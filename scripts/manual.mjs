import fs from "node:fs";
const source = fs.readFileSync("docs/manual-usuario.md", "utf8");
const escape = (s) =>
  s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
const inline = (s) =>
  escape(s)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, '<a href="$2">$1</a>');
const lines = source.split(/\r?\n/);
let html = "",
  list = "",
  inCode = false,
  code = [],
  table = false,
  headingNumber = 0;
const toc = [];
const closeList = () => {
  if (list) {
    html += `</${list}>`;
    list = "";
  }
};
for (const line of lines) {
  if (line.startsWith("```")) {
    closeList();
    if (inCode) {
      html += "<pre><code>" + escape(code.join("\n")) + "</code></pre>";
      code = [];
    }
    inCode = !inCode;
    continue;
  }
  if (inCode) {
    code.push(line);
    continue;
  }
  if (line.startsWith("|")) {
    closeList();
    if (/^\|[\s:|\-]+\|$/.test(line)) continue;
    const cells = line
      .split("|")
      .slice(1, -1)
      .map((c) => c.trim());
    if (!table) {
      html +=
        '<div class="table-wrap"><table><thead><tr>' +
        cells.map((c) => "<th>" + inline(c) + "</th>").join("") +
        "</tr></thead><tbody>";
      table = true;
    } else
      html +=
        "<tr>" +
        cells.map((c) => "<td>" + inline(c) + "</td>").join("") +
        "</tr>";
    continue;
  }
  if (table) {
    html += "</tbody></table></div>";
    table = false;
  }
  const heading = line.match(/^(#{1,3})\s+(.+)$/);
  if (heading) {
    closeList();
    const level = heading[1].length,
      id = "seccion-" + ++headingNumber;
    if (level === 2) toc.push({ id, title: heading[2] });
    html += `<h${level} id="${id}">${inline(heading[2])}</h${level}>`;
    continue;
  }
  const item = line.match(/^(\d+\.|-)\s+(.+)$/);
  if (item) {
    const type = item[1] === "-" ? "ul" : "ol";
    if (list !== type) {
      closeList();
      list = type;
      html += `<${type}>`;
    }
    html += "<li>" + inline(item[2]) + "</li>";
    continue;
  }
  closeList();
  if (line.trim()) html += "<p>" + inline(line) + "</p>";
}
closeList();
if (table) html += "</tbody></table></div>";
const page = `<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Manual de Nexo · Operaciones ATM</title><style>body{margin:0;background:#f4f7fb;color:#24354c;font:16px/1.8 'Segoe UI',Arial,sans-serif}nav{padding:30px;background:#edf3ff}nav>a{display:inline-block;margin:4px 20px 4px 0;font-size:14px}main{max-width:1000px;padding:36px 45px;margin:auto;background:white}h1{font-size:34px;line-height:1.3}h2{padding-top:28px;border-top:1px solid #dde6f3;margin-top:36px;scroll-margin-top:20px}h3{color:#365986}a{color:#1459e8}code{font-size:14px;background:#edf3fa;padding:2px 5px;border-radius:4px}pre{padding:20px;background:#edf3fa;overflow:auto}pre code{padding:0}table{width:100%;border-collapse:collapse;font-size:14px}th,td{text-align:left;padding:12px;border:1px solid #dce4ef;vertical-align:top}th{background:#edf3ff}.table-wrap{overflow:auto}li{margin-bottom:8px}.lead{color:#55708c}@media(max-width:600px){main{padding:24px 18px}h1{font-size:28px}}@media print{body{background:white;font-size:11pt}main{padding:0;max-width:none}nav{display:none}pre{white-space:pre-wrap}h1,h2,h3{break-after:avoid}tr{break-inside:avoid}a{color:inherit;text-decoration:none}}</style><main><p class="lead">NEXO · GUÍA DE OPERACIÓN · Versión 1.0</p><nav aria-label="Contenido del manual">${toc.map((t) => `<a href="#${t.id}">${inline(t.title)}</a>`).join("")}</nav>${html}<p class="lead">Puedes imprimir esta guía o guardarla como PDF desde el menú Imprimir del navegador.</p></main></html>`;
fs.writeFileSync("docs/manual-usuario.html", page);
if (fs.existsSync("dist")) fs.writeFileSync("dist/manual.html", page);
console.log("Manual HTML actualizado.");

// Convierte los manuales (src/content/*.md) en HTML dentro de un módulo TS.
import { readFileSync, writeFileSync } from "node:fs";
import { marked } from "marked";

const files = { clientes: "src/content/manual-clientes.md", empresas: "src/content/manual-empresas.md" };
let out = "// Generado por scripts/build-manuals.mjs a partir de src/content/*.md. No editar a mano.\n";
for (const [key, path] of Object.entries(files)) {
  const html = marked.parse(readFileSync(path, "utf8"), { async: false })
    .replace(/<table>/g, '<div class="manual-table"><table>').replace(/<\/table>/g, "</table></div>");
  out += `export const MANUAL_${key.toUpperCase()} = ${JSON.stringify(html)};\n`;
}
writeFileSync("src/content/manuals.ts", out);
console.log("manuales generados");

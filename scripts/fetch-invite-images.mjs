// Descarga, durante el build, las fotos de destinos de la invitación impresa
// para que el PDF no dependa de internet al generarse. Si alguna falla, el
// build sigue y el PDF intenta descargarla al momento.
import { mkdir, writeFile, stat } from "node:fs/promises";
import path from "node:path";

const IMAGES = {
  quito: "photo-1641973240236-250ec59abb1c",
  guayaquil: "photo-1628004566999-83b23fdc411f",
  manta: "photo-1603854690030-13b18ce2a495",
  cuenca: "photo-1660962256234-4ea4f38d444b",
  loja: "photo-1675809367383-ccee004bfab4",
  galapagos: "photo-1595517930215-d2778a56ac93",
  "punta-cana": "photo-1692017827893-f97d95397b49",
  cancun: "photo-1679599767221-4e1128c941ee",
  orlando: "photo-1609184889233-eff6dd93def4",
  paris: "photo-1632168594270-831d770aa8c3",
  roma: "photo-1514896856000-91cb6de818e0",
};

const dir = path.join(process.cwd(), "public", "invitacion", "dest");
await mkdir(dir, { recursive: true });
let ok = 0;
await Promise.all(
  Object.entries(IMAGES).map(async ([slug, id]) => {
    const file = path.join(dir, `${slug}.jpg`);
    try {
      const existing = await stat(file).catch(() => null);
      if (existing && existing.size > 5000) { ok++; return; }
      const res = await fetch(`https://images.unsplash.com/${id}?w=480&h=320&fit=crop&fm=jpg&q=75`, { signal: AbortSignal.timeout(15000) });
      const type = res.headers.get("content-type") ?? "";
      const buf = Buffer.from(await res.arrayBuffer());
      if (!res.ok || !type.startsWith("image/") || buf.length < 5000) throw new Error(`${res.status} ${type}`);
      await writeFile(file, buf);
      ok++;
    } catch (e) {
      console.warn(`[invitacion] no se pudo descargar ${slug}: ${e instanceof Error ? e.message : e}`);
    }
  })
);
console.log(`[invitacion] fotos de destinos listas: ${ok}/${Object.keys(IMAGES).length}`);

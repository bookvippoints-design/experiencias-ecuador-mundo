import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { randomBytes } from "node:crypto";
import sharp from "sharp";
import QRCode from "qrcode";
import { renderToBuffer } from "@react-pdf/renderer";
import { createAdminClient } from "@/lib/supabase/admin";
import { appUrl, whatsappDisplay } from "@/lib/brand";
import { NATIONAL_DESTINATIONS } from "@/lib/destinations";
import { InvitationDocument, type PdfImage } from "@/lib/pdf/InvitationDocument";

/** Fotos referenciales de destinos internacionales (Unsplash, licencia libre). */
const INTERNATIONAL_PRINT = [
  { name: "Punta Cana", imageId: "photo-1692017827893-f97d95397b49" },
  { name: "Cancún", imageId: "photo-1679599767221-4e1128c941ee" },
  { name: "Orlando", imageId: "photo-1609184889233-eff6dd93def4" },
  { name: "París", imageId: "photo-1632168594270-831d770aa8c3" },
  { name: "Roma", imageId: "photo-1514896856000-91cb6de818e0" },
];

/** Respaldo local cuando una foto remota no llega. */
const LOCAL_FALLBACK: Record<string, string> = { Quito: "quito.jpg", Manta: "playa.jpg" };

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function newToken() {
  const bytes = randomBytes(12);
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
}

export function inviteUrl(token: string) {
  return `${appUrl()}/i/${token}`;
}

/** Devuelve el token de la invitación impresa del usuario (lo crea la primera vez). */
export async function printInviteToken(userId: string, actorId: string): Promise<string> {
  const admin = createAdminClient();
  const { data: existing } = await admin.from("print_invites").select("token, printed_count").eq("user_id", userId).maybeSingle();
  if (existing) {
    await admin.from("print_invites").update({ printed_count: existing.printed_count + 1 }).eq("token", existing.token);
    return existing.token as string;
  }
  const token = newToken();
  const { error } = await admin.from("print_invites").insert({ token, user_id: userId, created_by: actorId, printed_count: 1 });
  if (error) throw new Error(error.message);
  return token;
}

async function localImage(file: string): Promise<PdfImage> {
  try {
    const buf = await readFile(path.join(process.cwd(), "public", "invitacion", file));
    return { data: buf, format: file.endsWith(".png") ? "png" : "jpg" };
  } catch {
    return null;
  }
}

/** Descarga una imagen y la deja en JPG o PNG (los únicos formatos que acepta el PDF). */
async function remoteImage(url: string, opts: { w: number; h?: number; keepAlpha?: boolean }): Promise<PdfImage> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000), cache: "no-store" });
    if (!res.ok) return null;
    const input = Buffer.from(await res.arrayBuffer());
    const img = sharp(input, { density: 300 }).resize(opts.w, opts.h, { fit: opts.h ? "cover" : "inside", withoutEnlargement: !opts.h });
    if (opts.keepAlpha) return { data: await img.png().toBuffer(), format: "png" };
    return { data: await img.flatten({ background: "#ffffff" }).jpeg({ quality: 82 }).toBuffer(), format: "jpg" };
  } catch {
    return null;
  }
}

function slugOf(name: string) {
  return name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

/** Foto de destino: primero la descargada en el build; si no está, se descarga ahora. */
async function destinationImage(name: string, imageId: string): Promise<PdfImage> {
  return (
    (await localImage(`dest/${slugOf(name)}.jpg`)) ??
    (await remoteImage(unsplash(imageId), { w: 480, h: 320 })) ??
    (LOCAL_FALLBACK[name] ? await localImage(LOCAL_FALLBACK[name]) : null)
  );
}

function unsplash(imageId: string) {
  return `https://images.unsplash.com/${imageId}?w=480&h=320&fit=crop&fm=jpg&q=75`;
}

export async function generateInvitationPdf(userId: string, actorId: string): Promise<{ pdf: Buffer; fileName: string }> {
  const admin = createAdminClient();
  const { data: person, error } = await admin
    .from("profiles")
    .select("full_name, email, role, company_id, companies(name, logo_url)")
    .eq("user_id", userId)
    .maybeSingle();
  if (error || !person || person.role !== "user") throw new Error("Usuario no encontrado");
  const company = person.companies as unknown as { name: string; logo_url: string | null } | null;

  const token = await printInviteToken(userId, actorId);
  const qr = await QRCode.toBuffer(inviteUrl(token), { margin: 1, width: 480, errorCorrectionLevel: "M", color: { dark: "#102D40", light: "#ffffff" } });

  const [companyLogo, brandLogo, hero1, hero2, national, international] = await Promise.all([
    company?.logo_url ? remoteImage(company.logo_url, { w: 640, keepAlpha: true }) : Promise.resolve(null),
    localImage("logo-bvpoints.png"),
    localImage("hero-1.jpg"),
    localImage("hero-2.jpg"),
    Promise.all(
      NATIONAL_DESTINATIONS.map(async (d) => ({ name: d.name, img: await destinationImage(d.name, d.imageId) }))
    ),
    Promise.all(INTERNATIONAL_PRINT.map(async (d) => ({ name: d.name, img: await destinationImage(d.name, d.imageId) }))),
  ]);

  const pdf = await renderToBuffer(
    <InvitationDocument
      data={{
        recipientName: person.full_name,
        email: person.email,
        companyName: company?.name ?? null,
        companyLogo,
        brandLogo,
        hero1,
        hero2,
        national,
        international,
        qr,
        code: `INV-${token.slice(0, 4)}`,
        whatsapp: whatsappDisplay(),
        site: appUrl().replace(/^https?:\/\//, ""),
      }}
    />
  );
  const slug = person.full_name.normalize("NFD").replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "-").toLowerCase() || "cliente";
  return { pdf, fileName: `invitacion-${slug}.pdf` };
}

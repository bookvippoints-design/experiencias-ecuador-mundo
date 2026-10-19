import { getCurrentProfile } from "@/lib/auth/identity";
import { generateInvitationPdf } from "@/lib/print-invite";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Invitación impresa (A4) de cualquier cliente, desde administración. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const profile = await getCurrentProfile();
  if (profile?.role !== "admin") return new Response("Acceso no autorizado", { status: 403 });
  const { id } = await params;
  try {
    const { pdf, fileName } = await generateInvitationPdf(id, profile.userId);
    return new Response(new Uint8Array(pdf), {
      headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="${fileName}"`, "Cache-Control": "private, no-store" },
    });
  } catch (e) {
    return new Response(e instanceof Error ? e.message : "No se pudo generar", { status: 404 });
  }
}

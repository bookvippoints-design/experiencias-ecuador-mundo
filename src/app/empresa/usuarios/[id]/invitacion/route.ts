import { getCurrentProfile, isCompanyManager } from "@/lib/auth/identity";
import { createClient } from "@/lib/supabase/server";
import { generateInvitationPdf } from "@/lib/print-invite";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Invitación impresa (A4) de un usuario de la empresa. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const profile = await getCurrentProfile();
  if (!profile || !isCompanyManager(profile)) return new Response("Acceso no autorizado", { status: 403 });
  const { id } = await params;
  const supabase = await createClient();
  const { error } = await supabase.rpc("company_can_resend", { p_user_id: id });
  if (error) return new Response("Usuario no encontrado", { status: 404 });
  const { pdf, fileName } = await generateInvitationPdf(id, profile.userId);
  return new Response(new Uint8Array(pdf), {
    headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="${fileName}"`, "Cache-Control": "private, no-store" },
  });
}

import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * El navegador avisa que Google Ads ya recibió la conversión de esta compra.
 * Solo marca compras de acceso aprobadas y solo la primera vez: así no se vuelve
 * a enviar si el cliente recarga o abre de nuevo el enlace.
 */
export async function POST(request: NextRequest) {
  let tx = "";
  try { tx = String((await request.json())?.tx ?? ""); } catch { /* cuerpo vacío */ }
  if (!tx.startsWith("ACC-") || tx.length > 50) return NextResponse.json({ ok: false }, { status: 400 });
  const { data } = await createAdminClient()
    .from("access_purchases")
    .update({ ads_conversion_sent_at: new Date().toISOString() })
    .eq("client_tx_id", tx)
    .eq("status", "approved")
    .is("ads_conversion_sent_at", null)
    .select("id");
  return NextResponse.json({ ok: true, marked: (data ?? []).length === 1 }, { headers: { "Cache-Control": "no-store" } });
}

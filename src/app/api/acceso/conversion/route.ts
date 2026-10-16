import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const OUTCOMES = new Set(["sent", "blocked", "timeout", "offline"]);

/**
 * El navegador informa el resultado del envío de la conversión de una compra de acceso.
 * - "sent": gtag despachó el envío; se marca la compra y no se vuelve a enviar.
 * - otros: solo se anota el intento; la conversión se reintentará en la próxima visita.
 * Solo afecta compras aprobadas; nunca cambia el pago ni la cuenta.
 */
export async function POST(request: NextRequest) {
  let tx = "", outcome = "";
  try { const b = await request.json(); tx = String(b?.tx ?? ""); outcome = String(b?.outcome ?? "sent"); } catch { /* cuerpo vacío */ }
  if (!tx.startsWith("ACC-") || tx.length > 50 || !OUTCOMES.has(outcome)) return NextResponse.json({ ok: false }, { status: 400 });
  const admin = createAdminClient();
  const now = new Date().toISOString();
  await admin.from("access_purchases")
    .update({ ads_conversion_last_attempt_at: now, ads_conversion_last_outcome: outcome })
    .eq("client_tx_id", tx).eq("status", "approved").is("ads_conversion_sent_at", null);
  let marked = false;
  if (outcome === "sent") {
    const { data } = await admin.from("access_purchases")
      .update({ ads_conversion_sent_at: now })
      .eq("client_tx_id", tx).eq("status", "approved").is("ads_conversion_sent_at", null)
      .select("id");
    marked = (data ?? []).length === 1;
  }
  return NextResponse.json({ ok: true, marked }, { headers: { "Cache-Control": "no-store" } });
}

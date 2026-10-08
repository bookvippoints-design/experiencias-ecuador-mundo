import { createClient } from "@/lib/supabase/server";
import { giftCardPdf } from "@/lib/notifications";

/**
 * Descarga de la tarjeta de regalo. Primero se verifica con la sesión del
 * usuario (gift_card_data valida que sea comprador, destinatario o admin);
 * solo entonces se genera el PDF con la llave de servidor.
 */
export async function giftCardResponse(giftId: string): Promise<Response> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("gift_card_data", { p_gift_id: giftId });
  if (error) return new Response("Regalo no encontrado", { status: 404 });

  const { pdf, code } = await giftCardPdf(giftId);
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="regalo-${code}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}

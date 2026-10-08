"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth/identity";
import { ensureAccountAndLink } from "@/lib/auth/access-links";
import { sendGiftEmails } from "@/lib/notifications";

export interface GiftResult {
  error: string | null;
  message: string | null;
}

/**
 * Regala experiencias que el usuario ya tiene. Es definitivo: los beneficios
 * pasan en ese momento a la cuenta del destinatario.
 */
export async function giftEntitlementsAction(input: {
  ids: string[];
  name: string;
  email: string;
  confirm: string;
  dedication: string;
}): Promise<GiftResult> {
  const profile = await getCurrentProfile();
  if (profile?.role !== "user") return { error: "Acceso no autorizado", message: null };

  const supabase = await createClient();
  // 1. Validación sin efectos (dueño, vigencia, correos iguales, no a empresas)
  const { error: checkError } = await supabase.rpc("gift_precheck", {
    p_entitlement_ids: input.ids,
    p_recipient_name: input.name,
    p_email: input.email,
    p_email_confirm: input.confirm,
  });
  if (checkError) return { error: checkError.message, message: null };

  // 2. Cuenta del destinatario (se crea si no existe; no consume cupos)
  let access;
  try {
    access = await ensureAccountAndLink(input.email, input.name);
  } catch (e) {
    return { error: `No se pudo preparar la cuenta del destinatario: ${e instanceof Error ? e.message : ""}`, message: null };
  }

  // 3. Transferencia (bloquea y vuelve a validar dentro de la transacción)
  const { data, error } = await supabase.rpc("gift_entitlements", {
    p_entitlement_ids: input.ids,
    p_recipient_name: input.name,
    p_email: input.email,
    p_email_confirm: input.confirm,
    p_dedication: input.dedication || null,
  });
  if (error) return { error: error.message, message: null };

  const giftId = (data as { gift_id: string }).gift_id;
  const warning = await sendGiftEmails(giftId, access);

  revalidatePath("/cuenta/experiencias");
  revalidatePath("/cuenta/regalos");
  return {
    error: null,
    message: `¡Regalo enviado a ${input.name}! Ya está en su cuenta.${warning ? ` Aviso: el correo no salió (${warning}); descarga la tarjeta en "Regalos" y envíasela.` : ""}`,
  };
}

import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

export interface PurchaseWindow {
  endsAt: string | null;
  open: boolean;
}

/** Margen para terminar de pagar un pedido creado justo antes de que venza el plazo. */
export const PAYMENT_GRACE_MS = 24 * 60 * 60 * 1000;

/** Abre el plazo la primera vez que el cliente entra a su portal y devuelve su estado. */
export async function ensurePurchaseWindow(supabase: SupabaseClient): Promise<PurchaseWindow> {
  const { data } = await supabase.rpc("ensure_purchase_window");
  return toWindow((data as string | null) ?? null);
}

/** Estado del plazo del cliente actual (sin abrirlo). */
export async function loadPurchaseWindow(supabase: SupabaseClient, userId: string): Promise<PurchaseWindow> {
  const { data } = await supabase.from("profiles").select("purchase_window_ends_at").eq("user_id", userId).maybeSingle();
  return toWindow((data?.purchase_window_ends_at as string | null) ?? null);
}

function toWindow(endsAt: string | null): PurchaseWindow {
  // Sin fecha = cuenta anterior al plazo: se considera abierto hasta que entre al portal.
  return { endsAt, open: !endsAt || new Date(endsAt).getTime() > Date.now() };
}

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Cliente con la service_role de Supabase. SOLO debe usarse en Server Actions o
 * Route Handlers — NUNCA importar esto desde un componente "use client",
 * porque la llave nunca debe llegar al navegador.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY;

  if (!url || !secret) {
    throw new Error(
      "Falta configurar SUPABASE_SECRET_KEY en las variables de entorno del servidor."
    );
  }

  return createSupabaseClient(url, secret, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

import { createClient } from "@/lib/supabase/server";

export interface Person {
  user_id: string;
  full_name: string;
  email: string;
  company_name: string | null;
}

/** Nombre y correo de varias personas (solo administración). */
export async function loadPeople(ids: string[]): Promise<Map<string, Person>> {
  const unique = [...new Set(ids.filter(Boolean))];
  if (unique.length === 0) return new Map();
  const supabase = await createClient();
  const { data } = await supabase.rpc("admin_people", { p_ids: unique });
  return new Map(((data ?? []) as Person[]).map((p) => [p.user_id, p]));
}

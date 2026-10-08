import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { AppRole } from "./portal-routes";
import { getInitials } from "@/lib/initials";

export type { AppRole };
export { portalPathForRole } from "./portal-routes";
export { getInitials };

export interface CurrentProfile {
  userId: string;
  role: AppRole;
  fullName: string;
  email: string;
  companyId: string | null;
  initials: string;
}

/**
 * Perfil real del usuario autenticado (o null si no hay sesión).
 * Es el ÚNICO lugar del que la interfaz lee nombre, rol e iniciales.
 */
export async function getCurrentProfile(): Promise<CurrentProfile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("user_id, role, full_name, email, company_id")
    .eq("user_id", user.id)
    .single();

  if (error || !profile) return null;

  return {
    userId: profile.user_id,
    role: profile.role as AppRole,
    fullName: profile.full_name,
    email: profile.email,
    companyId: profile.company_id,
    initials: getInitials(profile.full_name),
  };
}

/** Exige un rol concreto en páginas de servidor; si no, devuelve al login. */
export async function requireRole(role: AppRole): Promise<CurrentProfile> {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== role) redirect("/login");
  return profile;
}

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
  /** Dentro de una empresa: dueño, administrador o usuario de departamento. */
  companyRole: "owner" | "admin" | "member" | null;
  department: string | null;
  memberStatus: "active" | "paused";
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
    .select("user_id, role, full_name, email, company_id, company_role, department, member_status")
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
    companyRole: (profile.company_role ?? null) as CurrentProfile["companyRole"],
    department: profile.department ?? null,
    memberStatus: profile.member_status === "paused" ? "paused" : "active",
  };
}

/** Exige un rol concreto en páginas de servidor; si no, devuelve al login. */
export async function requireRole(role: AppRole): Promise<CurrentProfile> {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== role) redirect("/login");
  return profile;
}

/** Dueño o administrador de la empresa (maneja el equipo). */
export function isCompanyManager(p: CurrentProfile | null): boolean {
  return p?.role === "company" && (p.companyRole === "owner" || p.companyRole === "admin");
}

/** Exige dueño o administrador de empresa; si no, vuelve al inicio de la empresa. */
export async function requireCompanyManager(): Promise<CurrentProfile> {
  const profile = await requireRole("company");
  if (!isCompanyManager(profile)) redirect("/empresa");
  return profile;
}

/** Exige al dueño de la cuenta (por ejemplo, para comprar cupos). */
export async function requireCompanyOwner(): Promise<CurrentProfile> {
  const profile = await requireRole("company");
  if (profile.companyRole !== "owner") redirect("/empresa");
  return profile;
}

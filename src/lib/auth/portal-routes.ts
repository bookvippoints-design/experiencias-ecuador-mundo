export type AppRole = "admin" | "company" | "user";

export const PORTAL_PATH: Record<AppRole, string> = {
  admin: "/admin",
  company: "/empresa",
  user: "/cuenta",
};

export function portalPathForRole(role: AppRole): string {
  return PORTAL_PATH[role];
}

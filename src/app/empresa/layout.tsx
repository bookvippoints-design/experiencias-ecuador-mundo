import { requireRole } from "@/lib/auth/identity";
import { PortalShell } from "@/components/PortalShell";
import { companyNav } from "@/components/Sidebar";

export default async function EmpresaLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireRole("company");
  return <PortalShell role="company" nav={companyNav(profile.companyRole)}>{children}</PortalShell>;
}

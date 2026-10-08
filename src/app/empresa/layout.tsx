import { requireRole } from "@/lib/auth/identity";
import { PortalShell } from "@/components/PortalShell";

export default async function EmpresaLayout({ children }: { children: React.ReactNode }) {
  await requireRole("company");
  return <PortalShell role="company">{children}</PortalShell>;
}

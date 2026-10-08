import { requireRole } from "@/lib/auth/identity";
import { PortalShell } from "@/components/PortalShell";

export default async function CuentaLayout({ children }: { children: React.ReactNode }) {
  await requireRole("user");
  return <PortalShell role="user">{children}</PortalShell>;
}

import { requireRole } from "@/lib/auth/identity";
import { PortalShell } from "@/components/PortalShell";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireRole("admin");
  return <PortalShell role="admin">{children}</PortalShell>;
}

import { requireRole } from "@/lib/auth/identity";
import { createClient } from "@/lib/supabase/server";
import { PortalShell } from "@/components/PortalShell";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireRole("admin");
  const supabase = await createClient();
  const { data } = await supabase.rpc("admin_dashboard");
  const d = (data ?? {}) as Record<string, number>;
  // Contadores rojos en el menú: lo que está esperando por administración.
  const badges = {
    "/admin": (d.reported_orders ?? 0) + (d.pending_quota_purchases ?? 0) + (d.open_bookings ?? 0),
    "/admin/pedidos": d.reported_orders ?? 0,
    "/admin/compras": d.pending_quota_purchases ?? 0,
    "/admin/reservas": d.open_bookings ?? 0,
  };
  return <PortalShell role="admin" badges={badges}>{children}</PortalShell>;
}

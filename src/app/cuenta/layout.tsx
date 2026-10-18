import { requireRole } from "@/lib/auth/identity";
import { createClient } from "@/lib/supabase/server";
import { PortalShell } from "@/components/PortalShell";
import { ensurePurchaseWindow } from "@/lib/purchase-window";

export default async function CuentaLayout({ children }: { children: React.ReactNode }) {
  await requireRole("user");
  const supabase = await createClient();
  // El plazo de 14 días empieza la primera vez que el cliente entra a su portal.
  await ensurePurchaseWindow(supabase);
  const { data: unread } = await supabase.rpc("my_unread_messages");
  return <PortalShell role="user" badges={{ "/cuenta/mensajes": Number(unread ?? 0) }}>{children}</PortalShell>;
}

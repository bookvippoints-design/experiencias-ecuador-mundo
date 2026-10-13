import { requireRole } from "@/lib/auth/identity";
import { createClient } from "@/lib/supabase/server";
import { PortalShell } from "@/components/PortalShell";

export default async function CuentaLayout({ children }: { children: React.ReactNode }) {
  await requireRole("user");
  const supabase = await createClient();
  const { data: unread } = await supabase.rpc("my_unread_messages");
  return <PortalShell role="user" badges={{ "/cuenta/mensajes": Number(unread ?? 0) }}>{children}</PortalShell>;
}

import { requireRole } from "@/lib/auth/identity";
import { TopBar } from "@/components/TopBar";
import { ManualView } from "@/components/ManualView";
import { PrintLink } from "@/components/PrintLink";
import { MANUAL_CLIENTES } from "@/content/manuals";

export default async function ManualClientes() {
  const profile = await requireRole("user");
  return (
    <>
      <TopBar profile={profile} eyebrow="AYUDA" title="Manual de usuario" />
      <main className="portal-content">
        <ManualView html={MANUAL_CLIENTES} title="Manual de usuario" lead="Todo lo que necesitas para activar, usar y regalar tus experiencias, paso a paso." />
        <PrintLink />
      </main>
    </>
  );
}

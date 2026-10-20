import { requireRole } from "@/lib/auth/identity";
import { TopBar } from "@/components/TopBar";
import { ManualView } from "@/components/ManualView";
import { PrintLink } from "@/components/PrintLink";
import { MANUAL_EMPRESAS } from "@/content/manuals";

export default async function ManualEmpresas() {
  const profile = await requireRole("company");
  return (
    <>
      <TopBar profile={profile} eyebrow="AYUDA" title="Manual de usuario" />
      <main className="portal-content">
        <ManualView html={MANUAL_EMPRESAS} title="Manual de usuario para empresas" lead="Cómo crear accesos para tus clientes, manejar tu equipo y comprar cupos, paso a paso." />
        <PrintLink />
      </main>
    </>
  );
}

import { requireRole } from "@/lib/auth/identity";
import { createClient } from "@/lib/supabase/server";
import { TopBar } from "@/components/TopBar";
import { INTL_DESTINATION_FIELDS, type IntlDestination } from "@/lib/intl-destinations";
import { DestinationEditor } from "./DestinationEditor";

export default async function AdminDestinos() {
  const profile = await requireRole("admin");
  const supabase = await createClient();
  const { data } = await supabase.from("international_destinations").select(INTL_DESTINATION_FIELDS).order("country").order("city");
  const list = (data ?? []) as IntlDestination[];

  return (
    <>
      <TopBar profile={profile} eyebrow="ADMINISTRACIÓN" title="Destinos internacionales" />
      <main className="portal-content">
        <p className="content-lead" style={{ marginTop: 0 }}>
          Esta lista es la que ven los clientes al pedir su invitación: estadía, impuesto por noche y total estimado.
          Si un impuesto cambia, actualízalo aquí. Un destino inactivo deja de aparecer y no se puede pedir.
        </p>
        <DestinationEditor destinations={list} />
      </main>
    </>
  );
}

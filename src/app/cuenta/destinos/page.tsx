import Link from "next/link";
import { requireRole } from "@/lib/auth/identity";
import { createClient } from "@/lib/supabase/server";
import { TopBar } from "@/components/TopBar";
import { INTL_DESTINATION_FIELDS, type IntlDestination } from "@/lib/intl-destinations";
import { DestinationFinder } from "./DestinationFinder";

export default async function Destinos() {
  const profile = await requireRole("user");
  const supabase = await createClient();
  const [{ data }, { data: ents }] = await Promise.all([
    supabase.from("international_destinations").select(INTL_DESTINATION_FIELDS).eq("active", true).order("country").order("city"),
    supabase.from("entitlements").select("id").eq("kind", "international").eq("status", "available").gt("valid_until", new Date().toISOString()),
  ]);
  const list = (data ?? []) as IntlDestination[];
  const available = ents?.length ?? 0;

  return (
    <>
      <TopBar profile={profile} eyebrow="INVITACIÓN INTERNACIONAL" title="Destinos, estadías e impuestos" />
      <main className="portal-content">
        <p className="content-lead" style={{ marginTop: 0 }}>
          {list.length} destinos en el mundo. Fee de emisión <strong>US$0</strong> en tu paquete: solo pagas los impuestos y tasas del hotel.
        </p>
        {available === 0 && (
          <p className="info-box">
            Todavía no tienes invitaciones disponibles. Vienen incluidas en Escape Plus y Escape Premium.{" "}
            <Link href="/cuenta/catalogo" style={{ color: "var(--naranja-oscuro)", fontWeight: 700 }}>Ver paquetes</Link>
          </p>
        )}
        <DestinationFinder destinations={list} canRequest={available > 0} />
      </main>
    </>
  );
}

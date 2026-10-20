import Link from "next/link";
import { AccountTabs } from "@/components/AccountTabs";
import { Crumbs } from "@/components/Crumbs";
import { requireRole } from "@/lib/auth/identity";
import { TopBar } from "@/components/TopBar";
import { loadMyExperiences } from "@/lib/entitlements";
import { effectiveStatus } from "@/lib/format";
import { ExperienceBoard } from "./ExperienceBoard";
import { createClient } from "@/lib/supabase/server";
import { INTL_DESTINATION_FIELDS, type IntlDestination } from "@/lib/intl-destinations";

export default async function MisExperiencias({ searchParams }: { searchParams: Promise<{ invitacion?: string }> }) {
  const profile = await requireRole("user");
  const { invitacion } = await searchParams;
  const supabase = await createClient();
  const [items, { data: dests }] = await Promise.all([
    loadMyExperiences(),
    supabase.from("international_destinations").select(INTL_DESTINATION_FIELDS).eq("active", true).order("country").order("city"),
  ]);
  const destinations = (dests ?? []) as IntlDestination[];
  const active = items.filter((e) => ["available", "requested"].includes(effectiveStatus(e)));
  const past = items.filter((e) => !["available", "requested"].includes(effectiveStatus(e)));

  return (
    <>
      <TopBar profile={profile} eyebrow="MI CUENTA" title="Mis beneficios activados" />
      <main className="portal-content">
        <Crumbs trail={[{ href: "/cuenta", label: "Inicio" }, { label: "Mis beneficios activados" }]} />
        <AccountTabs current="/cuenta/experiencias" />
        <p className="info-box lead-justify" style={{ marginTop: 0 }}>
          Tus experiencias son tuyas hasta su fecha de vencimiento. <strong>En cualquier momento puedes usarlas o regalarlas</strong> a una
          persona especial. Si regalas una, conserva la misma fecha de vencimiento.
        </p>
        {items.length === 0 ? (
          <div className="empty-card">
            <p>Aquí verás tus escapadas e invitaciones cuando actives un paquete, con el tiempo que te queda para usarlas o regalarlas.</p>
            <Link href="/cuenta/catalogo" className="btn-orange">Ver los paquetes</Link>
          </div>
        ) : (
          <>
            <ExperienceBoard items={active} userEmail={profile.email} userName={profile.fullName} destinations={destinations} requestInvitation={invitacion} />
            <details className="how-details">
              <summary>¿Cómo canjear o regalar?</summary>
              <ol>
                <li><strong>Escapada nacional:</strong> toca &quot;Reservar una&quot;, elige ciudad y fecha con al menos 30 días de anticipación. Te confirmamos hotel y fecha en 24 a 48 horas hábiles. No se puede usar en temporada alta, vacaciones ni feriados.</li>
                <li><strong>Invitación internacional:</strong> toca &quot;Pedir una&quot; y elige el destino de la <Link href="/cuenta/destinos">lista de destinos</Link>. Te emitimos la invitación; la registras en 30 días y pagas impuestos y tasas en 7 días.</li>
                <li><strong>Regalar:</strong> toca &quot;Regalar&quot; y elige cuántas. El regalo es definitivo.</li>
              </ol>
              <Link href="/cuenta/como-funciona">Ver la guía completa</Link>
            </details>
            {past.length > 0 && (
              <>
                <div className="section-title"><h2>Utilizadas y vencidas</h2></div>
                <ExperienceBoard items={past} readOnly />
              </>
            )}
          </>
        )}
      </main>
    </>
  );
}

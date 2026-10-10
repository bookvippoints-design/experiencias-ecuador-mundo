import Link from "next/link";
import { AccountTabs } from "@/components/AccountTabs";
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
      <TopBar profile={profile} eyebrow="MI CUENTA" title="Mis experiencias" />
      <main className="portal-content">
        <AccountTabs current="/cuenta/experiencias" />
        {items.length === 0 ? (
          <div className="empty-card">
            <p>Aquí verás tus escapadas, invitaciones y puntos, con el tiempo que te queda para usarlos.</p>
            <Link href="/cuenta/catalogo" className="btn-orange">Explorar el catálogo</Link>
          </div>
        ) : (
          <>
            <section className="panel">
              <h2>Cómo canjear tus experiencias</h2>
              <ol style={{ margin: 0, paddingLeft: "1.2rem", lineHeight: 1.7 }}>
                <li><strong>Escapada nacional:</strong> pulsa &quot;Canjear: reservar escapada&quot;, elige ciudad y fechas con al menos 30 días de anticipación. Te confirmamos hotel y fechas en 24 a 48 horas hábiles. <strong>No se puede usar en temporada alta, vacaciones ni feriados.</strong></li>
                <li><strong>Invitación internacional:</strong> pulsa &quot;Canjear: pedir invitación&quot; y elige destino de la <Link href="/cuenta/destinos" style={{ color: "var(--naranja-oscuro)", fontWeight: 700 }}>lista de destinos con impuestos</Link>. Te emitimos la invitación; la registras en 30 días y pagas impuestos y tasas en 7 días.</li>
                <li><strong>Puntos:</strong> pulsa &quot;Canjear mis puntos&quot; y los acreditamos en tu cuenta BookVipPoints.</li>
              </ol>
              <p className="field-hint" style={{ marginBottom: 0 }}>
                Cada experiencia muestra cuánto tiempo te queda. También puedes regalarla mientras esté disponible; un regalo es definitivo.
                {" "}<Link href="/cuenta/como-funciona" style={{ color: "var(--naranja-oscuro)", fontWeight: 700 }}>Ver la guía completa</Link>
              </p>
            </section>
            <ExperienceBoard items={active} userEmail={profile.email} destinations={destinations} requestInvitation={invitacion} />
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

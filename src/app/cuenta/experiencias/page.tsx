import Link from "next/link";
import { requireRole } from "@/lib/auth/identity";
import { TopBar } from "@/components/TopBar";
import { loadMyExperiences } from "@/lib/entitlements";
import { effectiveStatus } from "@/lib/format";
import { ExperienceBoard } from "./ExperienceBoard";

export default async function MisExperiencias() {
  const profile = await requireRole("user");
  const items = await loadMyExperiences();
  const active = items.filter((e) => ["available", "requested"].includes(effectiveStatus(e)));
  const past = items.filter((e) => !["available", "requested"].includes(effectiveStatus(e)));

  return (
    <>
      <TopBar profile={profile} eyebrow="MI CUENTA" title="Mis experiencias" />
      <main className="portal-content">
        {items.length === 0 ? (
          <div className="empty-card">
            <p>Aquí verás tus escapadas, invitaciones y puntos, con el tiempo que te queda para usarlos.</p>
            <Link href="/cuenta/catalogo" className="btn-orange">Explorar el catálogo</Link>
          </div>
        ) : (
          <>
            <p className="content-lead">
              Cada experiencia muestra cuánto tiempo te queda. Puedes usarla o regalarla mientras esté disponible; un regalo es
              definitivo y no cambia la fecha de vencimiento.
            </p>
            <ExperienceBoard items={active} />
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

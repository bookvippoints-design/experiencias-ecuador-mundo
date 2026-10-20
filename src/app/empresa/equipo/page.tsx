import Link from "next/link";
import { requireCompanyManager } from "@/lib/auth/identity";
import { createClient } from "@/lib/supabase/server";
import { TopBar } from "@/components/TopBar";
import { MemberActions } from "./MemberActions";
import { ROLE_NAME, type TeamMember } from "./types";

function limitText(m: TeamMember) {
  if (m.company_role === "owner") return "Sin límite · compra cupos y maneja todo";
  if (m.company_role === "admin") return "Sin límite · puede administrar el equipo";
  if (m.daily_limit === null) return `Sin límite (de confianza) · hoy creó ${m.today}`;
  const cap = m.daily_limit + m.extra_today;
  const extra = m.extra_today > 0 ? ` (incluye ${m.extra_today} extra de hoy)` : "";
  return m.today >= cap ? `Hoy creó ${m.today} de ${cap} · llegó a su límite diario${extra}` : `Hoy creó ${m.today} de ${cap}${extra}`;
}

/** Mi equipo: las personas de la empresa que pueden crear accesos con el saldo de la empresa. */
export default async function EquipoPage({ searchParams }: { searchParams: Promise<{ depto?: string }> }) {
  const profile = await requireCompanyManager();
  const { depto } = await searchParams;
  const supabase = await createClient();
  const [{ data: team, error }, { data: dash }] = await Promise.all([supabase.rpc("company_team"), supabase.rpc("company_dashboard")]);
  const all = (team ?? []) as TeamMember[];
  const available = ((Array.isArray(dash) ? dash[0] : dash) as { available: number } | null)?.available ?? 0;
  const depts = [...new Set(all.map((m) => m.department).filter((d): d is string => !!d))].sort();
  const list = depto ? all.filter((m) => m.department === depto) : all;

  return (
    <>
      <TopBar profile={profile} eyebrow="PANEL EMPRESARIAL" title="Mi equipo" />
      <main className="portal-content flow">
        {error && <p className="error-state">No se pudo cargar tu equipo: {error.message}</p>}
        <section className="balance-bar">
          <div>
            <span className="balance-bar__eyebrow">SALDO DE LA EMPRESA</span>
            <span className="balance-bar__hint">Lo comparte todo el equipo</span>
          </div>
          <strong>{available} <small>{available === 1 ? "cupo" : "cupos"}</small></strong>
        </section>

        <Link href="/empresa/equipo/nuevo" className="btn-orange btn-wide">+ Agregar usuario del equipo</Link>

        {depts.length > 0 && (
          <nav className="chip-row" aria-label="Filtrar por departamento">
            <Link href="/empresa/equipo" className={!depto ? "chip is-active" : "chip"}>Todos ({all.length})</Link>
            {depts.map((d) => (
              <Link key={d} href={`/empresa/equipo?depto=${encodeURIComponent(d)}`} className={depto === d ? "chip is-active" : "chip"}>{d}</Link>
            ))}
          </nav>
        )}

        <div className="team-list">
          {list.map((m) => {
            const cap = (m.daily_limit ?? 0) + m.extra_today;
            const pct = m.daily_limit !== null && cap > 0 ? Math.min(100, Math.round((m.today / cap) * 100)) : 0;
            const status = m.member_status === "paused" ? ["Pausado", "pill--used"] : !m.activated ? ["Invitación enviada", "pill--orange"] : ["Activo", "pill--available"];
            return (
              <article key={m.user_id} className="team-card">
                <div className="team-card__head">
                  <div>
                    <strong className="team-card__name">{m.full_name}</strong>
                    <span className="team-card__meta">{m.department ? `${m.department} · ` : ""}{ROLE_NAME[m.company_role]}</span>
                    <span className="team-card__meta">{m.email}</span>
                  </div>
                  <span className={`pill ${status[1]}`}>{status[0]}</span>
                </div>
                <p className="team-card__limit">{limitText(m)}</p>
                {m.company_role === "member" && m.daily_limit !== null && (
                  <div className="mini-bar" aria-hidden="true"><span style={{ width: `${pct}%` }} className={pct >= 100 ? "is-full" : undefined} /></div>
                )}
                <MemberActions m={m} isSelf={m.user_id === profile.userId} />
              </article>
            );
          })}
          {list.length === 0 && <p className="empty-state">No hay personas en este departamento.</p>}
        </div>

        <Link href="/empresa/equipo/reporte" className="text-link-center">Ver reporte por departamento</Link>
      </main>
    </>
  );
}

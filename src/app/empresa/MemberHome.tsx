import Link from "next/link";
import type { CurrentProfile } from "@/lib/auth/identity";
import { createClient } from "@/lib/supabase/server";
import { TopBar } from "@/components/TopBar";
import { shortDate } from "@/lib/format";

interface Me { daily_limit: number | null; member_status: string; today: number; extra_today: number; remaining: number | null }
interface Client { user_id: string; full_name: string; email: string; created_at: string; activated: boolean }

/** Inicio de un usuario de departamento: lo que puede crear hoy, el saldo y sus clientes. */
export async function MemberHome({ profile }: { profile: CurrentProfile }) {
  const supabase = await createClient();
  const [{ data: meData }, { data: dash }, { data: users }] = await Promise.all([
    supabase.rpc("company_me"),
    supabase.rpc("company_dashboard"),
    supabase.rpc("company_users"),
  ]);
  const me = (Array.isArray(meData) ? meData[0] : meData) as Me | null;
  const d = (Array.isArray(dash) ? dash[0] : dash) as { company_name: string; logo_url: string | null; available: number; access_status: string } | null;
  const clients = ((users ?? []) as Client[]).slice(0, 8);
  const paused = profile.memberStatus === "paused";
  const cap = me && me.daily_limit !== null ? me.daily_limit + me.extra_today : null;
  const left = me?.remaining ?? null;
  const available = d?.available ?? 0;
  const canCreate = !paused && d?.access_status === "active" && available > 0 && (left === null || left > 0);
  const first = profile.fullName.split(" ")[0];

  return (
    <>
      <TopBar profile={profile} eyebrow={d?.company_name ?? "PANEL EMPRESARIAL"} title={`Hola, ${first}`} />
      <main className="portal-content flow">
        {d?.logo_url && <img src={d.logo_url} alt={d.company_name} style={{ maxHeight: 56, maxWidth: 200 }} />}
        {paused && (
          <p className="notice-banner">Tu usuario está <strong>pausado</strong>. Puedes ver tu información, pero no crear accesos ni reenviar invitaciones. Habla con el administrador de tu empresa.</p>
        )}
        <div className="stat-pair">
          <div className="stat-tile">
            <span className="stat-tile__eyebrow">HOY PUEDES CREAR</span>
            {cap === null ? (
              <strong className="stat-tile__value">Sin límite</strong>
            ) : (
              <>
                <strong className="stat-tile__value stat-tile__value--orange">{left ?? 0} <small>de {cap}</small></strong>
                <span className="mini-bar" aria-hidden="true"><span style={{ width: `${cap > 0 ? Math.min(100, Math.round(((me?.today ?? 0) / cap) * 100)) : 100}%` }} /></span>
              </>
            )}
          </div>
          <div className="stat-tile">
            <span className="stat-tile__eyebrow">SALDO DE LA EMPRESA</span>
            <strong className="stat-tile__value">{available}</strong>
            <span className="stat-tile__hint">cupos para todo el equipo</span>
          </div>
        </div>

        {canCreate ? (
          <Link href="/empresa/usuarios" className="btn-orange btn-wide">+ Crear acceso para un cliente</Link>
        ) : !paused && (
          <p className="notice-banner">
            {available <= 0
              ? "La empresa no tiene cupos disponibles en este momento. Avísale al administrador de tu empresa."
              : `Ya creaste tus ${cap} accesos de hoy. Mañana podrás crear ${me?.daily_limit} más. Si necesitas más hoy, pídele cupos extra a tu administrador.`}
          </p>
        )}

        <section className="panel">
          <h2>Mis accesos creados</h2>
          {clients.length === 0 ? (
            <p className="empty-state">Todavía no has creado accesos.</p>
          ) : (
            <ul className="activity-list">
              {clients.map((u) => (
                <li key={u.user_id} className="activity-item">
                  <span className="activity-name">{u.full_name} · {u.activated ? "Activó su cuenta" : "Invitación enviada"}</span>
                  <span className="activity-date">{shortDate(u.created_at)}</span>
                </li>
              ))}
            </ul>
          )}
          <p className="field-hint">Solo ves los accesos que tú creaste. <Link href="/empresa/usuarios">Ver todos mis clientes</Link></p>
        </section>
      </main>
    </>
  );
}

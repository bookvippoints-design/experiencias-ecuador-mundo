import Link from "next/link";
import { requireRole, getInitials } from "@/lib/auth/identity";
import { createClient } from "@/lib/supabase/server";
import { TopBar } from "@/components/TopBar";
import { CircularGauge } from "@/components/CircularGauge";
import { ProgressBar } from "@/components/ProgressBar";
import { PlanCards } from "./PlanCards";
import { loadPlans } from "@/lib/plans";
import { shortDate } from "@/lib/format";

interface Dash {
  company_name: string;
  logo_url: string | null;
  access_status: "active" | "read_only" | "blocked";
  purchased: number;
  used: number;
  available: number;
}

export default async function EmpresaHome() {
  const profile = await requireRole("company");
  const supabase = await createClient();
  const [{ data, error }, { data: users }, plans] = await Promise.all([
    supabase.rpc("company_dashboard"),
    supabase.rpc("company_users"),
    loadPlans(),
  ]);
  const d = (Array.isArray(data) ? data[0] : data) as Dash | null;
  const purchased = d?.purchased ?? 0;
  const used = d?.used ?? 0;
  const available = d?.available ?? 0;
  const low = purchased > 0 && available / purchased <= 0.15;
  const recent = ((users ?? []) as { user_id: string; full_name: string; created_at: string; activated: boolean }[]).slice(0, 5);

  return (
    <>
      <TopBar profile={profile} eyebrow="PANEL EMPRESARIAL" title={d?.company_name ?? "Tu empresa"} />
      <main className="portal-content">
        {d?.logo_url && <img src={d.logo_url} alt={d.company_name} style={{ maxHeight: 56, maxWidth: 200, marginBottom: "1rem" }} />}
        {error && <p className="error-state">No se pudo cargar tu información: {error.message}</p>}
        {d?.access_status === "read_only" && (
          <p className="notice-banner">Tu cuenta está en modo solo consulta: puedes ver tu información, pero no crear usuarios ni comprar cupos.</p>
        )}

        <section className="panel gauge-panel">
          <div className="gauge-panel__gauge">
            <CircularGauge value={available} max={Math.max(purchased, 1)} label="Disponibles" color={low ? "#c0392b" : "#f07a1f"} />
          </div>
          <div className="gauge-panel__stats">
            <div className="gauge-stat-row">
              <div className="gauge-stat"><span className="gauge-stat__value">{purchased}</span><span className="gauge-stat__label">Comprados</span></div>
              <div className="gauge-stat"><span className="gauge-stat__value">{used}</span><span className="gauge-stat__label">Utilizados</span></div>
              <div className="gauge-stat"><span className="gauge-stat__value">{available}</span><span className="gauge-stat__label">Disponibles</span></div>
            </div>
            <ProgressBar value={used} max={Math.max(purchased, 1)} />
            <p className="modal__note">Cada cuenta nueva usa un cupo. Reenviar una invitación no usa cupos.</p>
            <div className="btn-row">
              <Link href="/empresa/usuarios" className="btn-orange">Crear usuario</Link>
              <Link href="/empresa/compras" className="btn-ghost">Comprar más cupos</Link>
            </div>
          </div>
        </section>

        {(low || purchased === 0) && d?.access_status === "active" && (
          <section className="panel">
            <h2>{purchased === 0 ? "Compra tu primer plan de cupos" : "Te quedan pocos cupos"}</h2>
            <PlanCards plans={plans} />
          </section>
        )}

        <section className="panel">
          <h2>Últimos usuarios creados</h2>
          {recent.length === 0 ? (
            <p className="empty-state">Todavía no has creado usuarios.</p>
          ) : (
            <ul className="activity-list">
              {recent.map((u) => (
                <li key={u.user_id} className="activity-item">
                  <span className="activity-avatar">{getInitials(u.full_name)}</span>
                  <span className="activity-name">{u.full_name} · {u.activated ? "Activó su cuenta" : "Invitación enviada"}</span>
                  <span className="activity-date">{shortDate(u.created_at)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </>
  );
}

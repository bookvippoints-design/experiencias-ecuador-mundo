import Link from "next/link";
import { requireRole } from "@/lib/auth/identity";
import { createClient } from "@/lib/supabase/server";
import { loadPeople } from "@/lib/people";
import { TopBar } from "@/components/TopBar";
import { RpcButton } from "@/components/RpcButton";
import { StatusPill } from "@/components/StatusPill";
import { effectiveStatus, entitlementTitle, shortDate, type EntitlementRow, type EffectiveStatus } from "@/lib/format";

const FILTERS: { key: string; label: string; match: (s: EffectiveStatus) => boolean }[] = [
  { key: "todos", label: "Todos", match: () => true },
  { key: "disponibles", label: "Disponibles", match: (s) => s === "available" },
  { key: "solicitados", label: "Con reserva solicitada", match: (s) => s === "requested" },
  { key: "utilizados", label: "Utilizados", match: (s) => s === "used" },
  { key: "vencidos", label: "Vencidos", match: (s) => s === "expired" },
];

export default async function AdminBeneficios({ searchParams }: { searchParams: Promise<{ f?: string; q?: string }> }) {
  const profile = await requireRole("admin");
  const { f = "todos", q = "" } = await searchParams;
  const filter = FILTERS.find((x) => x.key === f) ?? FILTERS[0];
  const supabase = await createClient();

  const { data } = await supabase.from("entitlements").select("*").order("created_at", { ascending: false }).limit(1000);
  const all = (data ?? []) as EntitlementRow[];
  const byId = await loadPeople(all.flatMap((e) => [e.owner_id, e.purchaser_id]));

  const term = q.trim().toLowerCase();
  const rows = all.filter((e) => {
    if (!filter.match(effectiveStatus(e))) return false;
    if (!term) return true;
    const owner = byId.get(e.owner_id);
    return [e.code, owner?.full_name, owner?.email].some((v) => (v ?? "").toLowerCase().includes(term));
  });

  return (
    <>
      <TopBar profile={profile} eyebrow="ADMINISTRACIÓN" title="Beneficios" />
      <main className="portal-content">
        <nav className="tabs">
          {FILTERS.map((x) => (
            <Link key={x.key} href={`/admin/beneficios?f=${x.key}`} aria-current={x.key === filter.key ? "page" : undefined}>
              {x.label}
            </Link>
          ))}
        </nav>
        <form className="inline-form" style={{ marginBottom: "1rem" }}>
          <input type="hidden" name="f" value={filter.key} />
          <input name="q" defaultValue={q} placeholder="Buscar por código, nombre o correo" style={{ minWidth: 280 }} />
          <button className="btn-blue btn-small" type="submit">Buscar</button>
        </form>
        <div className="table-card">
          <table className="simple-table">
            <thead>
              <tr>
                <th>Código</th>
                <th>Beneficio</th>
                <th>Dueño actual</th>
                <th>Compró</th>
                <th>Vence</th>
                <th>Estado</th>
                <th>Seguimiento</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && <tr><td colSpan={7} className="empty-state">Sin beneficios en esta vista.</td></tr>}
              {rows.map((e) => {
                const owner = byId.get(e.owner_id);
                const buyer = byId.get(e.purchaser_id);
                return (
                  <tr key={e.id}>
                    <td><strong>{e.code}</strong>{e.gift_id && <div><span className="pill pill--orange">Regalo</span></div>}</td>
                    <td>{entitlementTitle(e)}{e.destination && <div className="exp-card__meta">Destino: {e.destination}</div>}</td>
                    <td>{owner?.full_name}<div className="exp-card__meta">{owner?.email}</div></td>
                    <td>{e.purchaser_id === e.owner_id ? "—" : buyer?.full_name}</td>
                    <td>{e.kind === "points" ? "No caducan" : shortDate(e.valid_until)}</td>
                    <td><StatusPill status={effectiveStatus(e)} /></td>
                    <td>
                      {e.kind === "international" && (
                        <div className="btn-row">
                          {e.invitation_delivered_at ? (
                            <span className="exp-card__meta">Emitida {shortDate(e.invitation_delivered_at)}</span>
                          ) : (
                            <RpcButton fn="admin_update_invitation" args={{ p_entitlement_id: e.id, p_step: "delivered" }} label="Invitación emitida" variant="btn-ghost" />
                          )}
                          {e.invitation_registered_at ? (
                            <span className="exp-card__meta">Activada {shortDate(e.invitation_registered_at)} · viajar hasta {shortDate(e.travel_deadline)}</span>
                          ) : (
                            <RpcButton
                              fn="admin_update_invitation"
                              args={{ p_entitlement_id: e.id, p_step: "registered" }}
                              label="Registrada y activada"
                              variant="btn-ghost"
                              confirm="Desde hoy correrán 18 meses para viajar y la invitación ya no podrá regalarse. ¿Continuar?"
                            />
                          )}
                          {e.status !== "used" && (
                            <RpcButton fn="admin_update_invitation" args={{ p_entitlement_id: e.id, p_step: "used" }} label="Marcar utilizada" variant="btn-ghost" confirm="¿Marcar esta invitación como utilizada?" />
                          )}
                        </div>
                      )}
                      {e.kind === "points" &&
                        (e.points_credited_at ? (
                          <span className="exp-card__meta">Acreditados {shortDate(e.points_credited_at)}</span>
                        ) : (
                          <RpcButton
                            fn="admin_mark_points_credited"
                            args={{ p_entitlement_id: e.id }}
                            label="Acreditados en BookVipPoints"
                            variant="btn-ghost"
                            confirm="¿Ya creaste la cuenta y acreditaste estos puntos en BookVipPoints? Después ya no podrán regalarse."
                          />
                        ))}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </main>
    </>
  );
}

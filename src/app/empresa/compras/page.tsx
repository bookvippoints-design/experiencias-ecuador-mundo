import { requireRole } from "@/lib/auth/identity";
import { createClient } from "@/lib/supabase/server";
import { TopBar } from "@/components/TopBar";
import { PlanCards } from "../PlanCards";
import { loadPlans } from "@/lib/plans";
import { money, shortDate } from "@/lib/format";

const STATUS: Record<string, string> = { pending: "En revisión", approved: "Aprobada", rejected: "Rechazada" };

export default async function EmpresaCompras() {
  const profile = await requireRole("company");
  const supabase = await createClient();
  const [plans, { data: company }, { data: purchases }, { data: ledger }] = await Promise.all([
    loadPlans(),
    supabase.from("companies").select("status").eq("id", profile.companyId ?? "").single(),
    supabase.from("quota_purchases").select("id, plan_key, quantity, total_price, status, payment_reference, requested_at, notes").order("requested_at", { ascending: false }),
    supabase.from("quota_ledger").select("id, delta, reason, note, created_at").order("created_at", { ascending: false }).limit(50),
  ]);

  return (
    <>
      <TopBar profile={profile} eyebrow="PANEL EMPRESARIAL" title="Comprar cupos" />
      <main className="portal-content">
        <p className="content-lead">
          Paga el plan con PayPhone y luego pulsa &quot;Ya pagué&quot;. Sumamos los cupos cuando confirmamos el pago.
        </p>
        <PlanCards plans={plans} disabled={company?.status !== "active"} />

        <section className="panel">
          <h2>Tus compras</h2>
          <div className="table-card">
            <table className="simple-table">
              <thead><tr><th>Fecha</th><th>Plan</th><th>Total</th><th>Referencia</th><th>Estado</th></tr></thead>
              <tbody>
                {(purchases ?? []).length === 0 && <tr><td colSpan={5} className="empty-state">Todavía no has comprado cupos.</td></tr>}
                {(purchases ?? []).map((p) => (
                  <tr key={p.id}>
                    <td>{shortDate(p.requested_at)}</td>
                    <td>{p.plan_key} · {p.quantity} cupos</td>
                    <td>{money(p.total_price)}</td>
                    <td>{p.payment_reference ?? "—"}</td>
                    <td>{STATUS[p.status]}{p.notes ? <div className="exp-card__meta">{p.notes}</div> : null}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="panel">
          <h2>Movimientos de cupos</h2>
          <div className="table-card">
            <table className="simple-table">
              <thead><tr><th>Fecha</th><th>Movimiento</th><th>Cupos</th></tr></thead>
              <tbody>
                {(ledger ?? []).map((l) => (
                  <tr key={l.id}>
                    <td>{shortDate(l.created_at)}</td>
                    <td>{l.reason === "purchase" ? "Compra aprobada" : l.reason === "user_created" ? "Usuario creado" : `Ajuste: ${l.note ?? ""}`}</td>
                    <td style={{ color: l.delta > 0 ? "#1a7f4e" : "#b3261e", fontWeight: 700 }}>{l.delta > 0 ? `+${l.delta}` : l.delta}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </>
  );
}

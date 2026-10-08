import { requireRole } from "@/lib/auth/identity";
import { createClient } from "@/lib/supabase/server";
import { TopBar } from "@/components/TopBar";
import { RpcButton } from "@/components/RpcButton";
import { money, shortDate } from "@/lib/format";

const STATUS: Record<string, string> = { pending: "Por aprobar", approved: "Aprobada", rejected: "Rechazada" };

export default async function AdminCompras() {
  const profile = await requireRole("admin");
  const supabase = await createClient();
  const { data: purchases } = await supabase
    .from("quota_purchases")
    .select("id, plan_key, quantity, total_price, status, payment_reference, requested_at, reviewed_at, notes, companies(name)")
    .order("requested_at", { ascending: false });

  return (
    <>
      <TopBar profile={profile} eyebrow="ADMINISTRACIÓN" title="Compras de cupos" />
      <main className="portal-content">
        <p className="content-lead">
          Aprueba solo después de confirmar el pago en PayPhone. Al aprobar, los cupos se suman una sola vez.
        </p>
        <div className="table-card">
          <table className="simple-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Empresa</th>
                <th>Plan</th>
                <th>Total</th>
                <th>Referencia</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {(purchases ?? []).length === 0 && (
                <tr><td colSpan={7} className="empty-state">Todavía no hay compras de cupos.</td></tr>
              )}
              {(purchases ?? []).map((p) => (
                <tr key={p.id}>
                  <td>{shortDate(p.requested_at)}</td>
                  <td>{(p.companies as unknown as { name: string } | null)?.name}</td>
                  <td>{p.plan_key} · {p.quantity} cupos</td>
                  <td>{money(p.total_price)}</td>
                  <td>{p.payment_reference ?? "—"}</td>
                  <td>{STATUS[p.status]}{p.notes ? <div className="exp-card__meta">{p.notes}</div> : null}</td>
                  <td>
                    {p.status === "pending" && (
                      <div className="btn-row">
                        <RpcButton
                          fn="review_quota_purchase"
                          args={{ p_purchase_id: p.id, p_approve: true, p_notes: null }}
                          label="Pago confirmado: aprobar"
                          variant="btn-orange"
                          confirm={`¿Confirmaste el pago de ${money(p.total_price)} en PayPhone? Se sumarán ${p.quantity} cupos.`}
                        />
                        <RpcButton
                          fn="review_quota_purchase"
                          args={{ p_purchase_id: p.id, p_approve: false }}
                          label="Rechazar"
                          variant="btn-ghost"
                          askNote={{ param: "p_notes", question: "Motivo del rechazo" }}
                        />
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </>
  );
}

import Link from "next/link";
import { requireRole } from "@/lib/auth/identity";
import { createClient } from "@/lib/supabase/server";
import { loadPeople } from "@/lib/people";
import { TopBar } from "@/components/TopBar";
import { RpcButton } from "@/components/RpcButton";
import { ApproveOrderButton } from "./ApproveOrderButton";
import { money, shortDate, ORDER_STATUS_LABEL } from "@/lib/format";

const FILTERS: { key: string; label: string; statuses: string[] }[] = [
  { key: "revisar", label: "Por revisar", statuses: ["payment_reported", "pending_payment"] },
  { key: "aprobados", label: "Aprobados", statuses: ["approved"] },
  { key: "otros", label: "Rechazados y cancelados", statuses: ["rejected", "cancelled"] },
];

export default async function AdminPedidos({ searchParams }: { searchParams: Promise<{ f?: string }> }) {
  const profile = await requireRole("admin");
  const { f = "revisar" } = await searchParams;
  const filter = FILTERS.find((x) => x.key === f) ?? FILTERS[0];
  const supabase = await createClient();

  const { data: orders } = await supabase
    .from("orders")
    .select("id, code, buyer_id, product_snapshot, price, mode, recipient_name, recipient_email, status, payment_reference, payment_reported_at, created_at, review_notes")
    .in("status", filter.statuses)
    .order("created_at", { ascending: false });

  const byId = await loadPeople((orders ?? []).map((o) => o.buyer_id));

  return (
    <>
      <TopBar profile={profile} eyebrow="ADMINISTRACIÓN" title="Pedidos y pagos" />
      <main className="portal-content">
        <p className="content-lead">
          Verifica cada pago en PayPhone antes de aprobarlo. Los regalos se entregan al destinatario solo con este paso.
        </p>
        <nav className="tabs">
          {FILTERS.map((x) => (
            <Link key={x.key} href={`/admin/pedidos?f=${x.key}`} aria-current={x.key === filter.key ? "page" : undefined}>
              {x.label}
            </Link>
          ))}
        </nav>
        <div className="table-card">
          <table className="simple-table">
            <thead>
              <tr>
                <th>Pedido</th>
                <th>Comprador</th>
                <th>Producto</th>
                <th>Tipo</th>
                <th>Pago</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {(orders ?? []).length === 0 && (
                <tr><td colSpan={7} className="empty-state">No hay pedidos en esta vista.</td></tr>
              )}
              {(orders ?? []).map((o) => {
                const buyer = byId.get(o.buyer_id);
                const product = o.product_snapshot as { name: string };
                const summary = `${product.name} (${money(o.price)})${o.mode === "gift" ? ` para ${o.recipient_name} <${o.recipient_email}>` : ""}`;
                return (
                  <tr key={o.id}>
                    <td><strong>{o.code}</strong><div className="exp-card__meta">{shortDate(o.created_at)}</div></td>
                    <td>
                      {buyer?.full_name}
                      <div className="exp-card__meta">{buyer?.email}{buyer?.company_name ? ` · ${buyer.company_name}` : ""}</div>
                    </td>
                    <td>{product.name}<div className="exp-card__meta">{money(o.price)}</div></td>
                    <td>
                      {o.mode === "gift" ? (
                        <>
                          <span className="pill pill--orange">Regalo</span>
                          <div className="exp-card__meta">{o.recipient_name} · {o.recipient_email}</div>
                        </>
                      ) : (
                        <span className="pill">Para sí</span>
                      )}
                    </td>
                    <td>
                      {o.payment_reference ?? "—"}
                      <div className="exp-card__meta">{o.payment_reported_at ? `Reportado ${shortDate(o.payment_reported_at)}` : "Sin reporte"}</div>
                    </td>
                    <td>{ORDER_STATUS_LABEL[o.status]}{o.review_notes ? <div className="exp-card__meta">{o.review_notes}</div> : null}</td>
                    <td>
                      {["pending_payment", "payment_reported"].includes(o.status) && (
                        <div className="btn-row">
                          <ApproveOrderButton orderId={o.id} isGift={o.mode === "gift"} summary={summary} />
                          <RpcButton
                            fn="admin_reject_order"
                            args={{ p_order_id: o.id }}
                            label="Rechazar"
                            variant="btn-ghost"
                            askNote={{ param: "p_notes", question: "Motivo del rechazo (lo verá el comprador)", required: true }}
                          />
                        </div>
                      )}
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

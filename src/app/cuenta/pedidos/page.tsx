import { requireRole } from "@/lib/auth/identity";
import { createClient } from "@/lib/supabase/server";
import { TopBar } from "@/components/TopBar";
import { productPaymentUrl } from "@/lib/payphone";
import { money, shortDate, ORDER_STATUS_LABEL } from "@/lib/format";
import { ReportPayment } from "./ReportPayment";

export default async function MisPedidos({ searchParams }: { searchParams: Promise<{ nuevo?: string }> }) {
  const profile = await requireRole("user");
  const { nuevo } = await searchParams;
  const supabase = await createClient();
  const { data: orders } = await supabase
    .from("orders")
    .select("id, code, product_snapshot, price, mode, recipient_name, recipient_email, status, payment_reference, created_at, review_notes")
    .eq("buyer_id", profile.userId)
    .order("created_at", { ascending: false });

  return (
    <>
      <TopBar profile={profile} eyebrow="MI CUENTA" title="Mis pedidos" />
      <main className="portal-content">
        {nuevo && (
          <div className="success-box">
            <strong>Pedido {nuevo} creado.</strong> Paga con PayPhone y luego pulsa &quot;Ya pagué&quot;. Cuando confirmemos tu
            pago, tus experiencias se acreditarán (o el regalo se enviará a su destinatario).
          </div>
        )}
        {(orders ?? []).length === 0 && <div className="empty-card">Todavía no tienes pedidos.</div>}
        <div className="exp-grid">
          {(orders ?? []).map((o) => {
            const product = o.product_snapshot as { name: string; slug: string; image_url: string | null };
            const open = ["pending_payment", "payment_reported"].includes(o.status);
            return (
              <article key={o.id} className="exp-card">
                <div className="exp-card__photo" style={{ backgroundImage: product.image_url ? `url('${product.image_url}')` : undefined }}>
                  <span className="exp-card__kind">{o.code}</span>
                </div>
                <div className="exp-card__body">
                  <h3 className="exp-card__title">{product.name} · {money(o.price)}</h3>
                  <div className="exp-card__meta">Creado el {shortDate(o.created_at)}</div>
                  {o.mode === "gift" && (
                    <div className="exp-card__gift">🎁 Regalo para {o.recipient_name} ({o.recipient_email})</div>
                  )}
                  <div>
                    <span className={`pill ${o.status === "approved" ? "pill--available" : o.status === "payment_reported" ? "pill--requested" : open ? "pill--orange" : "pill--used"}`}>
                      {ORDER_STATUS_LABEL[o.status]}
                    </span>
                  </div>
                  {o.status === "payment_reported" && (
                    <p className="field-hint">
                      Estamos verificando tu pago{o.payment_reference ? ` (ref. ${o.payment_reference})` : ""}.
                      {o.mode === "gift" ? " Tu regalo se enviará al confirmar tu pago." : ""}
                    </p>
                  )}
                  {o.status === "rejected" && o.review_notes && <p className="field-error">{o.review_notes}</p>}
                  {open && (
                    <div className="exp-card__actions">
                      <ReportPayment orderId={o.id} payUrl={productPaymentUrl(product.slug)} reported={o.status === "payment_reported"} />
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </main>
    </>
  );
}

import Link from "next/link";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/identity";
import { createClient } from "@/lib/supabase/server";
import { TopBar } from "@/components/TopBar";
import { payphoneBoxEnabled } from "@/lib/payphone-box";
import { money } from "@/lib/format";
import { OrderPayBox } from "./OrderPayBox";

export default async function PagarPedido({ params }: { params: Promise<{ id: string }> }) {
  const profile = await requireRole("user");
  const { id } = await params;
  const supabase = await createClient();
  const { data: o } = await supabase
    .from("orders")
    .select("id, code, price, mode, status, recipient_name, recipient_email, product_snapshot")
    .eq("id", id)
    .eq("buyer_id", profile.userId)
    .maybeSingle();
  if (!o) redirect("/cuenta/pedidos");
  if (!payphoneBoxEnabled()) redirect(`/cuenta/pedidos?nuevo=${o.code}`);
  if (!["pending_payment", "payment_reported"].includes(o.status)) redirect("/cuenta/pedidos");
  const product = o.product_snapshot as { name: string; image_url: string | null };

  return (
    <>
      <TopBar profile={profile} eyebrow="PAGO SEGURO" title="Paga tu pedido" />
      <main className="portal-content">
        <div className="checkout">
          <section className="checkout__summary">
            {product.image_url && <div className="checkout__photo" style={{ backgroundImage: `url('${product.image_url}')` }} />}
            <span className="how-block__eyebrow">Pedido {o.code}</span>
            <h2>{product.name}</h2>
            {o.mode === "gift" && <p className="exp-card__gift">🎁 Regalo para {o.recipient_name} ({o.recipient_email})</p>}
            <div className="checkout__total"><span>Total a pagar</span><strong>{money(o.price)}</strong></div>
            <ul className="check-list">
              <li>Pago con tarjeta de crédito o débito procesado por PayPhone.</li>
              <li>{o.mode === "gift" ? "El regalo llega a su destinatario apenas se apruebe el pago." : "Tus experiencias se acreditan apenas se apruebe el pago."}</li>
              <li>No guardamos los datos de tu tarjeta.</li>
            </ul>
            <Link href="/cuenta/pedidos" className="field-hint">← Volver a mis pedidos</Link>
          </section>
          <section className="checkout__pay">
            <h3>Datos de pago</h3>
            <OrderPayBox orderId={o.id} />
          </section>
        </div>
      </main>
    </>
  );
}

import Link from "next/link";
import { redirect } from "next/navigation";
import { requireCompanyOwner } from "@/lib/auth/identity";
import { createClient } from "@/lib/supabase/server";
import { TopBar } from "@/components/TopBar";
import { payphoneBoxEnabled } from "@/lib/payphone-box";
import { money } from "@/lib/format";
import { QuotaPayBox } from "./QuotaPayBox";

export default async function PagarPlan({ params }: { params: Promise<{ plan: string }> }) {
  const profile = await requireCompanyOwner();
  const { plan: key } = await params;
  if (!payphoneBoxEnabled()) redirect("/empresa/compras");
  const supabase = await createClient();
  const [{ data: plan }, { data: company }] = await Promise.all([
    supabase.from("company_plans").select("key, name, quantity, total_price").eq("key", key).maybeSingle(),
    supabase.from("companies").select("name, status").eq("id", profile.companyId ?? "").single(),
  ]);
  if (!plan || company?.status !== "active") redirect("/empresa/compras");

  return (
    <>
      <TopBar profile={profile} eyebrow="PAGO SEGURO" title="Comprar cupos" />
      <main className="portal-content">
        <div className="checkout">
          <section className="checkout__summary">
            <span className="how-block__eyebrow">{company.name}</span>
            <h2>{plan.name}</h2>
            <p className="content-lead">{plan.quantity} cupos de usuario · {money(Number(plan.total_price) / plan.quantity)} por usuario</p>
            <div className="checkout__total"><span>Total a pagar</span><strong>{money(plan.total_price)}</strong></div>
            <ul className="check-list">
              <li>Pago con tarjeta de crédito o débito procesado por PayPhone.</li>
              <li>Los cupos se suman a tu empresa apenas se apruebe el pago.</li>
            </ul>
            <Link href="/empresa/compras" className="field-hint">← Volver a planes</Link>
          </section>
          <section className="checkout__pay">
            <h3>Datos de pago</h3>
            <QuotaPayBox planKey={plan.key} />
          </section>
        </div>
      </main>
    </>
  );
}

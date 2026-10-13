import Link from "next/link";
import { requireRole } from "@/lib/auth/identity";
import { createClient } from "@/lib/supabase/server";
import { loadPeople } from "@/lib/people";
import { TopBar } from "@/components/TopBar";
import { money, shortDate } from "@/lib/format";

type Dash = Record<string, number>;

const PLAN_LABEL: Record<string, string> = { inicial: "Plan Inicial", comercial: "Plan Comercial", crecimiento: "Plan Crecimiento", corporativo: "Plan Corporativo" };

export default async function AdminHome() {
  const profile = await requireRole("admin");
  const supabase = await createClient();
  const [{ data, error }, { data: sales }, { data: quotas }, { data: allQuotas }, { data: accessSales }] = await Promise.all([
    supabase.rpc("admin_dashboard"),
    supabase
      .from("orders")
      .select("id, code, buyer_id, product_snapshot, price, mode, recipient_name, reviewed_at, created_at")
      .eq("status", "approved")
      .order("reviewed_at", { ascending: false })
      .limit(8),
    supabase
      .from("quota_purchases")
      .select("id, plan_key, quantity, total_price, reviewed_at, companies(name)")
      .eq("status", "approved")
      .order("reviewed_at", { ascending: false })
      .limit(5),
    supabase.from("quota_purchases").select("total_price").eq("status", "approved"),
    supabase.from("access_purchases").select("id, full_name, email, amount_cents, confirmed_at, credited_at").eq("status", "approved").order("confirmed_at", { ascending: false }),
  ]);
  const accessList = accessSales ?? [];
  const accessTotal = accessList.reduce((sum, a) => sum + a.amount_cents / 100, 0);
  const quotaSales = (allQuotas ?? []).reduce((sum, q) => sum + Number(q.total_price), 0);
  const d = (data ?? {}) as Dash;
  const people = await loadPeople((sales ?? []).map((s) => s.buyer_id));

  const todo = [
    { n: d.reported_orders ?? 0, title: "Pagos por verificar", text: "Clientes que dicen que ya pagaron. Revisa el pago en PayPhone y apruébalo.", href: "/admin/pedidos?f=revisar" },
    { n: d.pending_quota_purchases ?? 0, title: "Compras de cupos por aprobar", text: "Empresas que reportaron el pago de un plan.", href: "/admin/compras" },
    { n: d.open_bookings ?? 0, title: "Solicitudes de canje", text: "Escapadas, invitaciones y puntos por gestionar. Responde en 24 a 48 horas hábiles.", href: "/admin/reservas" },
  ];
  const pendingTotal = todo.reduce((s, t) => s + t.n, 0);
  const waitingPayment = Math.max(0, (d.pending_orders ?? 0) - (d.reported_orders ?? 0));
  const quotaRevenue = (quotas ?? []).length;


  const numbers: { value: string | number; label: string; hint: string; href: string }[] = [
    { value: money(d.sales_total ?? 0), label: "Ventas aprobadas a clientes", hint: `${d.approved_orders ?? 0} ${(d.approved_orders ?? 0) === 1 ? "pedido" : "pedidos"} · ver quién compró`, href: "/admin/pedidos?f=aprobados" },
    { value: money(quotaSales), label: "Ventas de cupos a empresas", hint: `${(allQuotas ?? []).length} ${(allQuotas ?? []).length === 1 ? "compra aprobada" : "compras aprobadas"} · ver detalle`, href: "/admin/compras" },
    { value: money(accessTotal), label: "Accesos vendidos al público", hint: `${accessList.length} ${accessList.length === 1 ? "acceso" : "accesos"} · ver clientes`, href: "/admin/usuarios" },
    { value: d.companies ?? 0, label: "Empresas", hint: `${d.quota_purchased ?? 0} cupos comprados · ${d.quota_used ?? 0} usados`, href: "/admin/empresas" },
    { value: d.users ?? 0, label: "Clientes con cuenta", hint: "Ver la lista de usuarios", href: "/admin/usuarios" },
    { value: d.gifts ?? 0, label: "Regalos enviados", hint: "Ver quién regaló a quién", href: "/admin/regalos" },
    { value: d.entitlements_available ?? 0, label: "Beneficios sin usar", hint: "Escapadas, invitaciones y puntos disponibles", href: "/admin/beneficios?f=disponibles" },
    { value: d.entitlements_used ?? 0, label: "Beneficios utilizados", hint: "Ya canjeados", href: "/admin/beneficios?f=utilizados" },
    { value: d.entitlements_expired ?? 0, label: "Beneficios vencidos", hint: "No se usaron a tiempo", href: "/admin/beneficios?f=vencidos" },
  ];

  return (
    <>
      <TopBar profile={profile} eyebrow="ADMINISTRACIÓN" title="Resumen" />
      <main className="portal-content">
        {error && <p className="error-state">No se pudo cargar el resumen: {error.message}</p>}

        {/* 1. Lo que hay que hacer */}
        <div className="section-title" style={{ marginTop: 0 }}>
          <h2>{pendingTotal > 0 ? `Tienes ${pendingTotal} ${pendingTotal === 1 ? "cosa" : "cosas"} por atender` : "Todo al día"}</h2>
        </div>
        {pendingTotal === 0 ? (
          <p className="success-box">✓ No hay pagos, compras de cupos ni solicitudes esperando por ti.</p>
        ) : null}
        <div className="todo-grid">
          {todo.map((t) => (
            <Link key={t.title} href={t.href} className={`todo-card${t.n > 0 ? " todo-card--alert" : ""}`}>
              <span className="todo-card__n">{t.n}</span>
              <span className="todo-card__body">
                <strong>{t.title}</strong>
                <span>{t.n > 0 ? t.text : "Nada pendiente."}</span>
              </span>
              <span className="todo-card__go" aria-hidden="true">→</span>
            </Link>
          ))}
        </div>
        {waitingPayment > 0 && (
          <p className="field-hint">
            Además hay {waitingPayment} {waitingPayment === 1 ? "pedido" : "pedidos"} esperando que el cliente pague.{" "}
            <Link href="/admin/pedidos?f=revisar" style={{ color: "var(--naranja-oscuro)", fontWeight: 700 }}>Verlos</Link>
          </p>
        )}

        {/* 2. Últimas ventas */}
        <div className="section-title">
          <h2>Últimas ventas</h2>
          <Link href="/admin/pedidos?f=aprobados">Ver todas →</Link>
        </div>
        {(sales ?? []).length === 0 && quotaRevenue === 0 && accessList.length === 0 ? (
          <div className="empty-card">Todavía no hay ventas aprobadas.</div>
        ) : (
          <div className="sales-list">
            {(sales ?? []).map((s) => {
              const product = s.product_snapshot as { name: string };
              const buyer = people.get(s.buyer_id);
              return (
                <Link key={s.id} href="/admin/pedidos?f=aprobados" className="sale-row">
                  <span className="sale-row__date">{shortDate(s.reviewed_at ?? s.created_at)}</span>
                  <span className="sale-row__who">
                    <strong>{buyer?.full_name ?? "Cliente"}</strong>
                    <span>{buyer?.email}{buyer?.company_name ? ` · ${buyer.company_name}` : ""}</span>
                  </span>
                  <span className="sale-row__what">
                    {product.name} <span className="exp-card__meta">Pedido {s.code}</span>
                    {s.mode === "gift" && <span className="sale-row__gift">🎁 Regalo para {s.recipient_name}</span>}
                  </span>
                  <span className="sale-row__amount">{money(s.price)}</span>
                </Link>
              );
            })}
            {accessList.slice(0, 5).map((a) => (
              <Link key={a.id} href="/admin/usuarios" className="sale-row">
                <span className="sale-row__date">{shortDate(a.confirmed_at)}</span>
                <span className="sale-row__who">
                  <strong>{a.full_name}</strong>
                  <span>{a.email}</span>
                </span>
                <span className="sale-row__what">
                  Acceso al catálogo <span className="exp-card__meta">Página pública · tarjeta</span>
                  {!a.credited_at && <span className="field-error">Pagado sin cuenta creada: revisa el correo de alerta</span>}
                </span>
                <span className="sale-row__amount">{money(a.amount_cents / 100)}</span>
              </Link>
            ))}
            {(quotas ?? []).map((q) => (
              <Link key={q.id} href="/admin/compras" className="sale-row">
                <span className="sale-row__date">{shortDate(q.reviewed_at)}</span>
                <span className="sale-row__who">
                  <strong>{(q.companies as unknown as { name: string } | null)?.name ?? "Empresa"}</strong>
                  <span>Empresa</span>
                </span>
                <span className="sale-row__what">{PLAN_LABEL[q.plan_key] ?? q.plan_key} <span className="exp-card__meta">{q.quantity} cupos</span></span>
                <span className="sale-row__amount">{money(q.total_price)}</span>
              </Link>
            ))}
          </div>
        )}

        {/* 3. Números */}
        <div className="section-title"><h2>Tu negocio en números</h2></div>
        <p className="field-hint" style={{ marginTop: 0 }}>Toca cualquier recuadro para ver el detalle.</p>
        <div className="numbers-grid">
          {numbers.map((c) => (
            <Link key={c.label} href={c.href} className="number-card">
              <span className="number-card__value">{c.value}</span>
              <span className="number-card__label">{c.label}</span>
              <span className="number-card__hint">{c.hint} →</span>
            </Link>
          ))}
        </div>
      </main>
    </>
  );
}

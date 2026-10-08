import Link from "next/link";
import { requireRole } from "@/lib/auth/identity";
import { createClient } from "@/lib/supabase/server";
import { TopBar } from "@/components/TopBar";
import { money } from "@/lib/format";

type Dash = Record<string, number>;

export default async function AdminHome() {
  const profile = await requireRole("admin");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_dashboard");
  const d = (data ?? {}) as Dash;

  const cards: { label: string; value: string | number; href?: string }[] = [
    { label: "Pagos por revisar", value: d.reported_orders ?? 0, href: "/admin/pedidos" },
    { label: "Pedidos pendientes", value: d.pending_orders ?? 0, href: "/admin/pedidos" },
    { label: "Compras de cupos por aprobar", value: d.pending_quota_purchases ?? 0, href: "/admin/compras" },
    { label: "Reservas abiertas", value: d.open_bookings ?? 0, href: "/admin/reservas" },
    { label: "Ventas aprobadas", value: money(d.sales_total ?? 0) },
    { label: "Empresas", value: d.companies ?? 0, href: "/admin/empresas" },
    { label: "Usuarios", value: d.users ?? 0, href: "/admin/usuarios" },
    { label: "Cupos comprados", value: d.quota_purchased ?? 0 },
    { label: "Cupos utilizados", value: d.quota_used ?? 0 },
    { label: "Regalos enviados", value: d.gifts ?? 0, href: "/admin/regalos" },
    { label: "Beneficios disponibles", value: d.entitlements_available ?? 0, href: "/admin/beneficios" },
    { label: "Beneficios utilizados", value: d.entitlements_used ?? 0, href: "/admin/beneficios" },
    { label: "Beneficios vencidos", value: d.entitlements_expired ?? 0, href: "/admin/beneficios" },
  ];

  return (
    <>
      <TopBar profile={profile} eyebrow="ADMINISTRACIÓN" title="Resumen" />
      <main className="portal-content">
        {error && <p className="error-state">No se pudo cargar el resumen: {error.message}</p>}
        <div className="stat-grid">
          {cards.map((c) => {
            const inner = (
              <>
                <span className="stat-card__value">{c.value}</span>
                <span className="stat-card__label">{c.label}</span>
              </>
            );
            return c.href ? (
              <Link key={c.label} href={c.href} className="stat-card" style={{ textDecoration: "none" }}>
                {inner}
              </Link>
            ) : (
              <div key={c.label} className="stat-card">
                {inner}
              </div>
            );
          })}
        </div>
      </main>
    </>
  );
}

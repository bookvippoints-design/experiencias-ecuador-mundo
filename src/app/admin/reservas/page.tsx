import Link from "next/link";
import { requireRole } from "@/lib/auth/identity";
import { createClient } from "@/lib/supabase/server";
import { loadPeople } from "@/lib/people";
import { TopBar } from "@/components/TopBar";
import { RpcButton } from "@/components/RpcButton";
import { BOOKING_STATUS_LABEL, shortDate } from "@/lib/format";

export default async function AdminReservas({ searchParams }: { searchParams: Promise<{ f?: string }> }) {
  const profile = await requireRole("admin");
  const { f = "abiertas" } = await searchParams;
  const supabase = await createClient();
  let query = supabase
    .from("booking_requests")
    .select("id, kind, destination, preferred_dates, travelers, notes, status, admin_message, created_at, user_id, entitlements(code, valid_until, points, product_name)")
    .order("created_at", { ascending: false });
  query = f === "abiertas" ? query.in("status", ["requested", "in_progress"]) : query.in("status", ["confirmed", "cancelled"]);
  const { data: bookings } = await query;

  const byId = await loadPeople((bookings ?? []).map((b) => b.user_id));

  return (
    <>
      <TopBar profile={profile} eyebrow="ADMINISTRACIÓN" title="Solicitudes de reserva" />
      <main className="portal-content">
        <nav className="tabs">
          <Link href="/admin/reservas?f=abiertas" aria-current={f === "abiertas" ? "page" : undefined}>Abiertas</Link>
          <Link href="/admin/reservas?f=cerradas" aria-current={f !== "abiertas" ? "page" : undefined}>Confirmadas y canceladas</Link>
        </nav>
        <p className="field-hint">
          Confirmar una escapada nacional la marca como utilizada. Confirmar un canje de puntos los marca como acreditados (hazlo después de acreditarlos en BookVipPoints). Para invitaciones internacionales registra la emisión
          y la activación en &quot;Beneficios&quot;. Cancelar devuelve el beneficio a disponible.
        </p>
        <div className="table-card">
          <table className="simple-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Viajero</th>
                <th>Beneficio</th>
                <th>Destino y detalles</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {(bookings ?? []).length === 0 && <tr><td colSpan={6} className="empty-state">No hay solicitudes en esta vista.</td></tr>}
              {(bookings ?? []).map((b) => {
                const ent = b.entitlements as unknown as { code: string; valid_until: string | null; points: number | null; product_name: string | null } | null;
                const person = byId.get(b.user_id);
                return (
                  <tr key={b.id}>
                    <td>{shortDate(b.created_at)}</td>
                    <td>{person?.full_name}<div className="exp-card__meta">{person?.email}</div></td>
                    <td>
                      {b.kind === "national" ? "Escapada nacional" : b.kind === "international" ? "Invitación internacional" : "Canje de puntos"}
                      {b.kind === "points" && (
                        <div style={{ fontSize: "1.15rem", fontWeight: 800, color: "var(--naranja-oscuro)" }}>
                          {(ent?.points ?? 0).toLocaleString("es-EC")} puntos
                        </div>
                      )}
                      <div className="exp-card__meta">
                        {ent?.product_name ? `${ent.product_name} · ` : ""}{ent?.code} · {b.kind === "points" ? "no caducan" : `vence ${shortDate(ent?.valid_until)}`}
                      </div>
                    </td>
                    <td>
                      {b.kind === "points" ? <>Acreditar en BookVipPoints: <strong>{b.destination}</strong></> : <strong>{b.destination}</strong>}
                      {b.preferred_dates && <div className="exp-card__meta">Fechas: {b.preferred_dates}</div>}
                      {b.travelers && <div className="exp-card__meta">Viajeros: {b.travelers}</div>}
                      {b.notes && <div className="exp-card__meta">Notas: {b.notes}</div>}
                    </td>
                    <td>
                      {BOOKING_STATUS_LABEL[b.status]}
                      {b.admin_message && <div className="exp-card__meta">Mensaje: {b.admin_message}</div>}
                    </td>
                    <td>
                      {["requested", "in_progress"].includes(b.status) && (
                        <div className="btn-row">
                          {b.status === "requested" && (
                            <RpcButton fn="admin_update_booking" args={{ p_booking_id: b.id, p_status: "in_progress" }} label="En gestión" variant="btn-ghost"
                              askNote={{ param: "p_message", question: "Mensaje para el viajero (opcional)" }} />
                          )}
                          <RpcButton fn="admin_update_booking" args={{ p_booking_id: b.id, p_status: "confirmed" }}
                            label={b.kind === "points" ? `Confirmar: ${(ent?.points ?? 0).toLocaleString("es-EC")} puntos acreditados` : "Confirmar"} variant="btn-orange"
                            confirm={b.kind === "points" ? `¿Ya acreditaste ${(ent?.points ?? 0).toLocaleString("es-EC")} puntos en la cuenta BookVipPoints ${b.destination}?` : undefined}
                            askNote={{ param: "p_message", question: b.kind === "points" ? "Mensaje para el cliente (opcional)" : "Detalle de la confirmación para el viajero (hotel, fechas)" }} />
                          <RpcButton fn="admin_update_booking" args={{ p_booking_id: b.id, p_status: "cancelled" }} label="Cancelar" variant="btn-ghost"
                            askNote={{ param: "p_message", question: "Motivo de la cancelación (lo verá el viajero)", required: true }} />
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

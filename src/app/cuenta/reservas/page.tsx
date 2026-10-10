import Link from "next/link";
import { AccountTabs } from "@/components/AccountTabs";
import { requireRole } from "@/lib/auth/identity";
import { createClient } from "@/lib/supabase/server";
import { TopBar } from "@/components/TopBar";
import { BOOKING_STATUS_LABEL, shortDate } from "@/lib/format";
import { ChangeDates } from "./ChangeDates";

function longDate(d: string) {
  return new Date(d + "T12:00:00").toLocaleDateString("es-EC", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
}

export default async function MisReservas() {
  const profile = await requireRole("user");
  const supabase = await createClient();
  const { data: bookings } = await supabase
    .from("booking_requests")
    .select("id, kind, destination, preferred_dates, travelers, status, admin_message, created_at, check_in, alt_check_in, entitlements(code)")
    .order("created_at", { ascending: false });

  return (
    <>
      <TopBar profile={profile} eyebrow="MI CUENTA" title="Mis canjes y reservas" />
      <main className="portal-content">
        <AccountTabs current="/cuenta/reservas" />
        <p className="content-lead">
          Solicita tus reservas desde <Link href="/cuenta/experiencias" style={{ color: "var(--naranja-oscuro)" }}>Mis experiencias</Link>. Aquí ves en qué estado está cada una. Las escapadas nacionales pendientes pueden cambiar de fecha; una vez confirmadas no se pueden anular ni reintegrar.
        </p>
        {(bookings ?? []).length === 0 ? (
          <div className="empty-card">Todavía no tienes solicitudes de reserva.</div>
        ) : (
          <div className="table-card">
            <table className="simple-table">
              <thead><tr><th>Fecha</th><th>Experiencia</th><th>Destino</th><th>Estado</th><th>Mensaje del equipo</th><th></th></tr></thead>
              <tbody>
                {(bookings ?? []).map((b) => (
                  <tr key={b.id}>
                    <td>{shortDate(b.created_at)}</td>
                    <td>{b.kind === "national" ? "Escapada nacional" : b.kind === "international" ? "Invitación internacional" : "Canje de puntos"}<div className="exp-card__meta">{(b.entitlements as unknown as { code: string } | null)?.code}</div></td>
                    <td>
                      <strong>{b.destination}</strong>
                      {b.check_in && <div className="exp-card__meta">Entrada: {longDate(b.check_in)}{b.alt_check_in ? ` · alternativa: ${longDate(b.alt_check_in)}` : ""}</div>}
                      {b.preferred_dates && <div className="exp-card__meta">{b.preferred_dates}</div>}
                    </td>
                    <td>{BOOKING_STATUS_LABEL[b.status]}</td>
                    <td>{b.admin_message ?? "—"}</td>
                    <td>
                      {b.kind === "national" && ["requested", "in_progress"].includes(b.status) && (
                        <ChangeDates bookingId={b.id} checkIn={b.check_in} altCheckIn={b.alt_check_in} />
                      )}
                      {b.kind === "national" && b.status === "confirmed" && <span className="field-hint">Confirmada: no se puede anular ni reintegrar.</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </>
  );
}

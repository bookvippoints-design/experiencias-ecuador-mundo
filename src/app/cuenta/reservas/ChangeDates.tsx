"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Modal } from "@/components/Modal";
import { NATIONAL_MIN_DAYS } from "@/lib/brand";
import { notifyAdmin } from "@/app/alert-actions";

function isoDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Cambiar las fechas de una escapada nacional mientras no esté confirmada. */
export function ChangeDates({ bookingId, checkIn, altCheckIn }: { bookingId: string; checkIn: string | null; altCheckIn: string | null }) {
  const [open, setOpen] = useState(false);
  const [a, setA] = useState(checkIn ?? "");
  const [b, setB] = useState(altCheckIn ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const min = isoDate(new Date(Date.now() + NATIONAL_MIN_DAYS * 86400000));

  async function save() {
    setLoading(true);
    setError(null);
    const { error: e } = await createClient().rpc("user_update_booking_dates", {
      p_booking_id: bookingId, p_check_in: a || null, p_alt_check_in: b || null,
    });
    setLoading(false);
    if (e) return setError(e.message);
    await notifyAdmin("booking_dates", bookingId);
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <button className="btn-ghost btn-small" onClick={() => setOpen(true)}>Cambiar fechas</button>
      {open && (
        <Modal open onClose={() => setOpen(false)} labelledBy="cd-title">
          <h2 id="cd-title">Cambiar fechas</h2>
          <p className="modal__subtitle">Mínimo {NATIONAL_MIN_DAYS} días de anticipación. Una vez confirmado el hospedaje ya no se podrá cambiar.</p>
          <div className="field"><label htmlFor="cd-a">Fecha de entrada</label><input id="cd-a" type="date" min={min} value={a} onChange={(e) => setA(e.target.value)} /></div>
          <div className="field"><label htmlFor="cd-b">Fecha alternativa (opcional)</label><input id="cd-b" type="date" min={min} value={b} onChange={(e) => setB(e.target.value)} /></div>
          {error && <p className="field-error">{error}</p>}
          <div className="modal-actions">
            <button className="btn-ghost" onClick={() => setOpen(false)}>Cancelar</button>
            <button className="btn-orange" onClick={save} disabled={loading || !a}>{loading ? "Guardando..." : "Guardar fechas"}</button>
          </div>
        </Modal>
      )}
    </>
  );
}

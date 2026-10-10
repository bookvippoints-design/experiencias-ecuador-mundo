"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { notifyAdmin } from "@/app/alert-actions";

/** Minutos que deben pasar desde que se abre PayPhone hasta poder reportar el pago. */
const WAIT_MS = 3 * 60 * 1000;

function mmss(ms: number) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export function ReportPayment({ orderId, payUrl, reported, payClickedAt }: {
  orderId: string; payUrl: string | null; reported: boolean; payClickedAt: string | null;
}) {
  const [clickedAt, setClickedAt] = useState<number | null>(payClickedAt ? new Date(payClickedAt).getTime() : null);
  const [now, setNow] = useState(() => Date.now());
  const [open, setOpen] = useState(false);
  const [reference, setReference] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const remaining = clickedAt ? clickedAt + WAIT_MS - now : WAIT_MS;
  const canReport = clickedAt !== null && remaining <= 0;

  useEffect(() => {
    if (!clickedAt || remaining <= 0) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [clickedAt, remaining]);

  async function startPayment() {
    // La hora queda guardada en el servidor; el enlace se abre igual (no bloquea el pago).
    if (!clickedAt) setClickedAt(Date.now());
    const { data } = await createClient().rpc("mark_payment_started", { p_order_id: orderId });
    if (data) setClickedAt(new Date(data as string).getTime());
  }

  async function send() {
    setLoading(true);
    setError(null);
    const { error: e } = await createClient().rpc("report_order_payment", { p_order_id: orderId, p_reference: reference });
    setLoading(false);
    if (e) setError(e.message);
    else {
      await notifyAdmin("payment", orderId);
      setOpen(false);
      router.refresh();
    }
  }

  async function cancel() {
    if (!window.confirm("¿Cancelar este pedido?")) return;
    const { error: e } = await createClient().rpc("cancel_order", { p_order_id: orderId });
    if (e) setError(e.message);
    else router.refresh();
  }

  return (
    <div>
      <div className="btn-row">
        {reported ? null : payUrl ? (
          <a className="btn-orange btn-small" href={payUrl} target="_blank" rel="noreferrer" onClick={startPayment}>Pagar con PayPhone</a>
        ) : (
          <span className="btn-orange btn-small" aria-disabled="true" style={{ opacity: 0.55 }}>Enlace de pago pendiente</span>
        )}
        {canReport && !open && (
          <button className="btn-ghost btn-small" onClick={() => setOpen(true)}>
            {reported ? "Actualizar número de transacción" : "Ya pagué"}
          </button>
        )}
        {!reported && !open && (
          <button className="btn-ghost btn-small" onClick={cancel}>Cancelar pedido</button>
        )}
      </div>

      {!reported && !canReport && (
        <p className="field-hint" style={{ marginTop: ".5rem" }}>
          {clickedAt
            ? <>Cuando termines tu pago en PayPhone, aquí aparecerá el botón &quot;Ya pagué&quot; en <strong>{mmss(remaining)}</strong>.</>
            : <>Paga con PayPhone. Unos minutos después aparecerá aquí el botón para reportar tu pago.</>}
        </p>
      )}

      {open && (
        <div style={{ marginTop: ".75rem" }}>
          <div className="field">
            <label htmlFor={`ref-${orderId}`}>Número de transacción de PayPhone</label>
            <input id={`ref-${orderId}`} value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Lo encuentras en tu comprobante de PayPhone" />
          </div>
          <p className="warn-box" style={{ fontSize: ".85rem" }}>
            Activamos tus experiencias solo después de verificar el pago en PayPhone. Los reportes de pago falsos bloquean la cuenta.
          </p>
          <div className="btn-row">
            <button className="btn-orange btn-small" onClick={send} disabled={loading || reference.replace(/\s/g, "").length < 4}>
              {loading ? "Enviando..." : "Reportar pago"}
            </button>
            <button className="btn-ghost btn-small" onClick={() => setOpen(false)}>Cerrar</button>
          </div>
        </div>
      )}
      {error && <p className="field-error">{error}</p>}
    </div>
  );
}

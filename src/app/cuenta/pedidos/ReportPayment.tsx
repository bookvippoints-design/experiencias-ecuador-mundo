"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function ReportPayment({ orderId, payUrl, reported }: { orderId: string; payUrl: string | null; reported: boolean }) {
  const [open, setOpen] = useState(false);
  const [reference, setReference] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function send() {
    setLoading(true);
    setError(null);
    const { error: e } = await createClient().rpc("report_order_payment", { p_order_id: orderId, p_reference: reference || null });
    setLoading(false);
    if (e) setError(e.message);
    else {
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
        {payUrl ? (
          <a className="btn-orange btn-small" href={payUrl} target="_blank" rel="noreferrer">Pagar con PayPhone</a>
        ) : (
          <span className="btn-orange btn-small" aria-disabled="true" style={{ opacity: 0.55 }}>Enlace de pago pendiente</span>
        )}
        {!open && (
          <button className="btn-ghost btn-small" onClick={() => setOpen(true)}>
            {reported ? "Actualizar referencia" : "Ya pagué"}
          </button>
        )}
        {!reported && !open && (
          <button className="btn-ghost btn-small" onClick={cancel}>Cancelar pedido</button>
        )}
      </div>
      {open && (
        <div style={{ marginTop: ".75rem" }}>
          <div className="field">
            <label htmlFor={`ref-${orderId}`}>Referencia o número de transacción de PayPhone (opcional)</label>
            <input id={`ref-${orderId}`} value={reference} onChange={(e) => setReference(e.target.value)} />
          </div>
          <div className="btn-row">
            <button className="btn-orange btn-small" onClick={send} disabled={loading}>{loading ? "Enviando..." : "Reportar pago"}</button>
            <button className="btn-ghost btn-small" onClick={() => setOpen(false)}>Cerrar</button>
          </div>
        </div>
      )}
      {error && <p className="field-error">{error}</p>}
    </div>
  );
}

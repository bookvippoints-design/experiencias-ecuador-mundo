"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { approveOrderAction } from "./actions";

export function ApproveOrderButton({ orderId, isGift, summary }: { orderId: string; isGift: boolean; summary: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const router = useRouter();

  async function run() {
    const question = isGift
      ? `¿Confirmaste el pago en PayPhone? Se entregará el regalo: ${summary}. Esta acción no se puede deshacer.`
      : `¿Confirmaste el pago en PayPhone? Se acreditarán los beneficios: ${summary}.`;
    if (!window.confirm(question)) return;
    setLoading(true);
    setError(null);
    const r = await approveOrderAction(orderId, null);
    setLoading(false);
    if (r.error) setError(r.error);
    else {
      setMessage(r.message);
      router.refresh();
    }
  }

  return (
    <span style={{ display: "inline-flex", flexDirection: "column", gap: ".25rem" }}>
      <button type="button" className="btn-orange btn-small" onClick={run} disabled={loading}>
        {loading ? "Procesando..." : isGift ? "Pago confirmado: entregar regalo" : "Pago confirmado: aprobar"}
      </button>
      {error && <span className="field-error">{error}</span>}
      {message && <span className="field-hint">{message}</span>}
    </span>
  );
}

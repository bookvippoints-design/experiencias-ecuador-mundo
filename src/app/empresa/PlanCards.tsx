"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export interface Plan {
  key: string;
  name: string;
  quantity: number;
  total_price: number;
  badge: string | null;
  payUrl: string | null;
}

function money(n: number) {
  return `US$${Number(n).toLocaleString("es-EC", { maximumFractionDigits: 2 })}`;
}

/** Planes fijos. La cantidad y el precio los toma el servidor del plan elegido. */
export function PlanCards({ plans, disabled }: { plans: Plan[]; disabled?: boolean }) {
  const [reporting, setReporting] = useState<string | null>(null);
  const [reference, setReference] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function report(planKey: string) {
    setError(null);
    const { error: e } = await createClient().rpc("request_quota_purchase", {
      p_plan_key: planKey,
      p_payment_reference: reference || null,
    });
    if (e) return setError(e.message);
    setReporting(null);
    setReference("");
    setMsg("Recibimos tu reporte de pago. Los cupos se sumarán cuando confirmemos el pago en PayPhone.");
    router.refresh();
  }

  return (
    <>
      {msg && <p className="success-box">{msg}</p>}
      <div className="plan-grid">
        {plans.map((p) => (
          <div key={p.key} className={`package-card${p.badge ? " package-card--featured" : ""}`}>
            {p.badge && <span className="package-card__badge">{p.badge}</span>}
            <div className="package-card__name">{p.name}</div>
            <div className="package-card__quantity">{p.quantity} cupos de usuario</div>
            <div className="package-card__price">{money(p.total_price)}</div>
            <div className="package-card__unit">{money(p.total_price / p.quantity)} por usuario</div>
            <ul className="package-card__benefits">
              <li>Crea cuentas para tus clientes o colaboradores</li>
              <li>Cada cuenta recibe su invitación por correo</li>
              <li>Acceso al catálogo privado de experiencias</li>
            </ul>
            {disabled ? (
              <p className="field-hint">Tu cuenta no está habilitada para comprar.</p>
            ) : reporting === p.key ? (
              <div>
                <div className="field">
                  <label htmlFor={`ref-${p.key}`}>Referencia del pago (opcional)</label>
                  <input id={`ref-${p.key}`} value={reference} onChange={(e) => setReference(e.target.value)} />
                </div>
                {error && <p className="field-error">{error}</p>}
                <div className="btn-row">
                  <button className="btn-orange btn-small" onClick={() => report(p.key)}>Enviar reporte</button>
                  <button className="btn-ghost btn-small" onClick={() => setReporting(null)}>Cancelar</button>
                </div>
              </div>
            ) : (
              <div className="btn-row">
                {p.payUrl ? (
                  <a className="btn-orange btn-small" href={p.payUrl} target="_blank" rel="noreferrer">Pagar con PayPhone</a>
                ) : (
                  <span className="btn-orange btn-small" aria-disabled="true" style={{ opacity: 0.55 }}>Enlace de pago pendiente</span>
                )}
                <button className="btn-ghost btn-small" onClick={() => setReporting(p.key)}>Ya pagué</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  );
}

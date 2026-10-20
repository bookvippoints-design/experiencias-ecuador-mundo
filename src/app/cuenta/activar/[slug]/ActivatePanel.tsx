"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { PayphoneBox } from "@/components/PayphoneBox";
import { startActivationPayment } from "@/app/pago/actions";

/** Términos y, al aceptarlos, la cajita de PayPhone. */
export function ActivatePanel({ slug }: { slug: string }) {
  const [accepted, setAccepted] = useState(false);
  const start = useCallback(() => startActivationPayment(slug), [slug]);
  return (
    <>
      <label className="consent">
        <input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} />
        <span>
          Revisé lo que incluye y las condiciones, y acepto los{" "}
          <Link href="/terminos" target="_blank" style={{ color: "var(--naranja-oscuro)" }}>términos y condiciones</Link>.
        </span>
      </label>
      <section className="pay-card">
        <h3>Pago con tarjeta</h3>
        {accepted ? <PayphoneBox start={start} /> : <p className="field-hint">Marca la casilla de arriba para continuar al pago.</p>}
      </section>
    </>
  );
}

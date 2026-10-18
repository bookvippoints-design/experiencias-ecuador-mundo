"use client";

import { useState } from "react";
import { PayphoneBox } from "@/components/PayphoneBox";
import { startReactivationPayment } from "@/app/pago/actions";

/** El pago aparece solo después de aceptar las condiciones de la reactivación. */
export function ReactivationPayBox() {
  const [accepted, setAccepted] = useState(false);
  return (
    <>
      <label className="check-row" style={{ display: "flex", gap: ".6rem", alignItems: "flex-start", marginBottom: "1rem" }}>
        <input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} style={{ marginTop: ".25rem" }} />
        <span>Leí y acepto las condiciones de la reactivación.</span>
      </label>
      {accepted ? <PayphoneBox start={startReactivationPayment} /> : <p className="field-hint">Marca la casilla para continuar al pago.</p>}
    </>
  );
}

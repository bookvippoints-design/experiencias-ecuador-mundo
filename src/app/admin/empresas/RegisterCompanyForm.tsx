"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { registerCompanyAction, type FormState } from "./actions";

const initial: FormState = { error: null, success: null };

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-orange" disabled={pending}>
      {pending ? "Creando..." : "Crear empresa y enviar invitación"}
    </button>
  );
}

export function RegisterCompanyForm() {
  const [state, action] = useActionState(registerCompanyAction, initial);
  return (
    <form action={action}>
      <div className="plan-grid" style={{ marginTop: 0 }}>
        <div className="field">
          <label htmlFor="name">Nombre de la empresa</label>
          <input id="name" name="name" required />
        </div>
        <div className="field">
          <label htmlFor="email">Correo de acceso (único)</label>
          <input id="email" name="email" type="email" required />
        </div>
      </div>
      {state.error && <p className="field-error">{state.error}</p>}
      {state.success && <p className="success-box">{state.success}</p>}
      <Submit />
    </form>
  );
}

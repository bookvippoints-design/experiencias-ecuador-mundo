"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { createUserAction, type CreateUserState } from "./actions";

const initial: CreateUserState = { error: null, success: null };

function Submit({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-orange" disabled={pending || disabled}>
      {pending ? "Creando..." : "Crear usuario y enviar invitación"}
    </button>
  );
}

export function CreateUserForm({ available, enabled }: { available: number; enabled: boolean }) {
  const [state, action] = useActionState(createUserAction, initial);
  return (
    <form action={action} key={state.success ?? "form"}>
      <div className="plan-grid" style={{ marginTop: 0 }}>
        <div className="field"><label htmlFor="name">Nombre completo</label><input id="name" name="name" required /></div>
        <div className="field"><label htmlFor="email">Correo electrónico</label><input id="email" name="email" type="email" required /></div>
        <div className="field"><label htmlFor="phone">Teléfono (opcional)</label><input id="phone" name="phone" /></div>
      </div>
      <p className="field-hint">
        Se usará 1 de tus {available} cupos disponibles. Cada correo puede registrarse una sola vez en la plataforma.
      </p>
      {state.error && <p className="field-error">{state.error}</p>}
      {state.success && <p className="success-box">{state.success}</p>}
      <Submit disabled={!enabled || available <= 0} />
      {available <= 0 && enabled && <p className="field-hint">No tienes cupos disponibles. Compra un plan en &quot;Comprar cupos&quot;.</p>}
    </form>
  );
}

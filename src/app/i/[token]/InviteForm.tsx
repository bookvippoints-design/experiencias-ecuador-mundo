"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { confirmInviteAction, type InviteState } from "./actions";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-primary">
      {pending ? "Verificando..." : "Continuar"}
    </button>
  );
}

export function InviteForm({ token }: { token: string }) {
  const [state, action] = useActionState<InviteState, FormData>(confirmInviteAction.bind(null, token), { error: null });
  return (
    <form action={action} className="login-form">
      <label htmlFor="email">Tu correo electrónico</label>
      <input id="email" name="email" type="email" required autoComplete="email" placeholder="El que aparece en tu invitación" />
      {state.error && <p role="alert" className="form-error">{state.error}</p>}
      <Submit />
    </form>
  );
}

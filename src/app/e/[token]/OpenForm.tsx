"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { openTeamInviteAction, type TeamInviteState } from "./actions";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-orange" style={{ width: "100%" }} disabled={pending}>
      {pending ? "Abriendo..." : "Activar mi cuenta y crear contraseña"}
    </button>
  );
}

export function OpenForm({ token }: { token: string }) {
  const [state, action] = useActionState(openTeamInviteAction.bind(null, token), { error: null } as TeamInviteState);
  return (
    <form action={action}>
      {state.error && <p className="field-error">{state.error}</p>}
      <Submit />
    </form>
  );
}

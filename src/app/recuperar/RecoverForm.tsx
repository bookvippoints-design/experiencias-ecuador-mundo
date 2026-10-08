"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { recoverAction, type RecoverState } from "./actions";

const initial: RecoverState = { sent: false, error: null };

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary" disabled={pending}>
      {pending ? "Enviando..." : "Enviar instrucciones"}
    </button>
  );
}

export function RecoverForm() {
  const [state, action] = useActionState(recoverAction, initial);

  if (state.sent) {
    return (
      <div className="login-form">
        <p className="notice-banner">
          Si el correo está registrado, recibirás un enlace para crear o restablecer tu contraseña. Revisa también
          tu carpeta de correo no deseado.
        </p>
        <Link href="/login" className="forgot-link">
          Volver al inicio de sesión
        </Link>
      </div>
    );
  }

  return (
    <form action={action} className="login-form">
      <label htmlFor="email">Correo electrónico</label>
      <input id="email" name="email" type="email" required autoComplete="email" />
      {state.error && (
        <p role="alert" className="form-error">
          {state.error}
        </p>
      )}
      <Submit />
      <Link href="/login" className="forgot-link">
        Volver al inicio de sesión
      </Link>
    </form>
  );
}

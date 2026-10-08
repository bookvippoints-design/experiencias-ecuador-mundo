"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { signInAction, type LoginState } from "./actions";

const initialState: LoginState = { error: null };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-primary">
      {pending ? "Ingresando..." : "Ingresar"}
    </button>
  );
}

export function LoginForm() {
  const [state, formAction] = useActionState(signInAction, initialState);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <form action={formAction} className="login-form">
      <label htmlFor="email">Correo electrónico</label>
      <input id="email" name="email" type="email" required autoComplete="email" />

      <label htmlFor="password">Contraseña</label>
      <div className="password-field">
        <input
          id="password"
          name="password"
          type={showPassword ? "text" : "password"}
          required
          autoComplete="current-password"
        />
        <button
          type="button"
          onClick={() => setShowPassword((v) => !v)}
          aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
        >
          {showPassword ? "Ocultar" : "Mostrar"}
        </button>
      </div>

      {state.error && (
        <p role="alert" className="form-error">
          {state.error}
        </p>
      )}

      <SubmitButton />

      <Link href="/recuperar" className="forgot-link">
        ¿Olvidaste tu contraseña?
      </Link>
    </form>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { portalPathForRole, type AppRole } from "@/lib/auth/portal-routes";

export function SetPasswordForm({ email }: { email: string | null }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    if (password !== confirm) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setLoading(true);
    const supabase = createClient();

    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      setLoading(false);
      setError("No se pudo guardar la contraseña. Intenta de nuevo.");
      return;
    }

    // Entrar directo a su portal, sin pedirle iniciar sesión otra vez.
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/login?bienvenido=1");
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    setLoading(false);

    if (profile?.role) {
      router.push(portalPathForRole(profile.role as AppRole));
      router.refresh();
    } else {
      router.push("/login?bienvenido=1");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="login-form">
      {email && <p className="modal__subtitle">Configurando el acceso de <strong>{email}</strong></p>}

      <label htmlFor="password">Nueva contraseña</label>
      <div className="password-field">
        <input
          id="password"
          type={showPassword ? "text" : "password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
        />
        <button type="button" onClick={() => setShowPassword((v) => !v)}>
          {showPassword ? "Ocultar" : "Mostrar"}
        </button>
      </div>

      <label htmlFor="confirm">Confirmar contraseña</label>
      <input
        id="confirm"
        type={showPassword ? "text" : "password"}
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        required
        minLength={8}
      />

      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}

      <button type="submit" className="btn-primary" disabled={loading}>
        {loading ? "Guardando..." : "Guardar y entrar al portal"}
      </button>
    </form>
  );
}

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SetPasswordForm } from "./SetPasswordForm";
import { APP_NAME, APP_SLOGAN, whatsappUrl } from "@/lib/brand";

export default async function SetPasswordPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Solo se llega aqui con una sesion temporal valida (desde el enlace del correo).
  if (!user) redirect("/login");

  return (
    <main className="login-page">
      <div className="login-card">
        <h1>{APP_NAME}</h1>
        <p className="tagline">{APP_SLOGAN}</p>
        <div className="step-progress" aria-hidden="true"><span className="is-done"></span><span className="is-done"></span><span></span></div>
        <p className="step-eyebrow">PASO 2 DE 3</p>
        <h2 className="step-title">Último paso: crea tu contraseña</h2>
        <p className="step-text">Elígela tú. La usarás junto con tu correo para entrar a tu portal cuando quieras.</p>
        {user.email && <p className="step-email">Tu correo para entrar: <strong>{user.email}</strong></p>}
        <SetPasswordForm email={null} />
        <p className="step-help">¿Problemas? <a href={whatsappUrl("Hola, necesito ayuda para activar mi cuenta en Experiencias Ecuador y el Mundo")} target="_blank" rel="noreferrer">Escríbenos por WhatsApp</a></p>
      </div>
    </main>
  );
}

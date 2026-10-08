import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SetPasswordForm } from "./SetPasswordForm";
import { APP_NAME } from "@/lib/brand";

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
        <p className="tagline">Crea tu contraseña</p>
        <SetPasswordForm email={user.email ?? null} />
      </div>
    </main>
  );
}

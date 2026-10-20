import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { APP_NAME, APP_SLOGAN } from "@/lib/brand";
import { hasPassword } from "@/lib/auth/access-links";
import { OpenForm } from "./OpenForm";

export const dynamic = "force-dynamic";
export const metadata = { title: `Invitación al equipo · ${APP_NAME}`, robots: { index: false } };

/** Enlace del correo de invitación al equipo de una empresa (vence en 7 días). */
export default async function TeamInvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const admin = createAdminClient();
  const { data: inv } = /^[A-Z0-9]{16,32}$/.test(token)
    ? await admin.from("team_invites").select("user_id, expires_at").eq("token", token).maybeSingle()
    : { data: null };
  let state: "invalid" | "expired" | "active" | "pending" = "invalid";
  let firstName = "";
  let company = "";
  if (inv) {
    const [{ data: person }, active] = await Promise.all([
      admin.from("profiles").select("full_name, company_id").eq("user_id", inv.user_id).maybeSingle(),
      hasPassword(inv.user_id),
    ]);
    firstName = person?.full_name?.split(" ")[0] ?? "";
    if (person?.company_id) {
      const { data: c } = await admin.from("companies").select("name").eq("id", person.company_id).maybeSingle();
      company = c?.name ?? "";
    }
    state = active ? "active" : new Date(inv.expires_at).getTime() < Date.now() ? "expired" : "pending";
  }

  return (
    <main className="login-page">
      <div className="login-card">
        <h1>{APP_NAME}</h1>
        <p className="tagline">{APP_SLOGAN}</p>
        {state === "pending" && (
          <>
            <h2 className="step-title">¡Hola{firstName ? `, ${firstName}` : ""}!</h2>
            <p className="step-text">Te invitaron al equipo de <strong>{company}</strong>. Activa tu cuenta y crea tu contraseña para empezar.</p>
            <OpenForm token={token} />
          </>
        )}
        {state === "active" && (
          <>
            <h2 className="step-title">Tu cuenta ya está activa</h2>
            <p className="step-text">Entra con tu correo y tu contraseña. Si no la recuerdas, usa &quot;¿Olvidaste tu contraseña?&quot;.</p>
            <Link className="btn-orange" href="/login" style={{ display: "block", textAlign: "center" }}>Entrar</Link>
          </>
        )}
        {state === "expired" && (
          <>
            <h2 className="step-title">Esta invitación venció</h2>
            <p className="step-text">Pídele al administrador de {company || "tu empresa"} que te reenvíe la invitación.</p>
          </>
        )}
        {state === "invalid" && (
          <>
            <h2 className="step-title">Invitación no válida</h2>
            <p className="step-text">No encontramos esta invitación. Revisa que hayas abierto el enlace completo del correo.</p>
          </>
        )}
      </div>
    </main>
  );
}

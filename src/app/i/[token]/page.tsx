import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { APP_NAME, APP_SLOGAN, whatsappUrl } from "@/lib/brand";
import { InviteForm } from "./InviteForm";

export const dynamic = "force-dynamic";
export const metadata = { title: `Activa tu invitación · ${APP_NAME}`, robots: { index: false } };

/** Destino del QR de la invitación impresa. No vence: genera el enlace al momento. */
export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const valid = /^[A-Z0-9]{8,32}$/.test(token);
  const admin = createAdminClient();
  const { data: inv } = valid
    ? await admin.from("print_invites").select("user_id").eq("token", token).maybeSingle()
    : { data: null };
  let state: "invalid" | "active" | "pending" = "invalid";
  let firstName = "";
  if (inv) {
    const [{ data: auth }, { data: person }] = await Promise.all([
      admin.auth.admin.getUserById(inv.user_id),
      admin.from("profiles").select("full_name").eq("user_id", inv.user_id).maybeSingle(),
    ]);
    firstName = person?.full_name?.split(" ")[0] ?? "";
    state = auth.user?.last_sign_in_at ? "active" : "pending";
  }
  const help = whatsappUrl("Hola, necesito ayuda para activar mi invitación impresa de Experiencias Ecuador y el Mundo");

  return (
    <main className="login-page">
      <div className="login-card">
        <h1>{APP_NAME}</h1>
        <p className="tagline">{APP_SLOGAN}</p>
        {state === "pending" && (
          <>
            <h2 className="step-title">¡Bienvenid@{firstName ? `, ${firstName}` : ""}!</h2>
            <p className="step-text">Para proteger tu invitación, confirma tu correo. Luego crearás tu propia contraseña y entrarás a tu catálogo privado.</p>
            <InviteForm token={token} />
          </>
        )}
        {state === "active" && (
          <>
            <h2 className="step-title">Tu cuenta ya está activa</h2>
            <p className="step-text">Entra con tu correo y tu contraseña. Si no la recuerdas, usa &quot;¿Olvidaste tu contraseña?&quot;.</p>
            <Link className="btn-orange" href="/login" style={{ display: "block", textAlign: "center" }}>Entrar a mi cuenta</Link>
          </>
        )}
        {state === "invalid" && (
          <>
            <h2 className="step-title">Invitación no válida</h2>
            <p className="step-text">No encontramos esta invitación. Revisa que hayas escaneado el código completo.</p>
          </>
        )}
        <p className="step-help">¿Dudas? <a href={help} target="_blank" rel="noreferrer">Escríbenos por WhatsApp</a></p>
      </div>
    </main>
  );
}

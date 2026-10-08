import { LoginForm } from "./LoginForm";
import { APP_NAME, APP_SLOGAN } from "@/lib/brand";

const MESSAGES: Record<string, string> = {
  enlace_invalido:
    "El enlace ya se usó o venció. Escribe tu correo en \"¿Olvidaste tu contraseña?\" y te enviaremos uno nuevo.",
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; bienvenido?: string }> }) {
  const params = await searchParams;
  const notice = params.error ? MESSAGES[params.error] : params.bienvenido ? "Tu contraseña quedó guardada. Ya puedes entrar." : null;

  return (
    <main className="login-page">
      <div className="login-card">
        <h1>{APP_NAME}</h1>
        <p className="tagline">{APP_SLOGAN}</p>
        {notice && <p className="notice-banner" style={{ marginTop: 0 }}>{notice}</p>}
        <LoginForm />
      </div>
    </main>
  );
}

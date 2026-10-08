import { RecoverForm } from "./RecoverForm";
import { APP_NAME } from "@/lib/brand";

export default function RecuperarPage() {
  return (
    <main className="login-page">
      <div className="login-card">
        <h1>{APP_NAME}</h1>
        <p className="tagline">Crea o recupera tu contraseña</p>
        <RecoverForm />
      </div>
    </main>
  );
}

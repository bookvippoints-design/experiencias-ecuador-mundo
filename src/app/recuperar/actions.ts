"use server";

import { passwordLink, findAuthUserByEmail } from "@/lib/auth/access-links";
import { sendMail, emailLayout } from "@/lib/email";

export interface RecoverState {
  sent: boolean;
  error: string | null;
}

/**
 * Envía el enlace para restablecer la contraseña con nuestro propio correo.
 * La respuesta es la misma exista o no la cuenta, para no revelar qué correos
 * están registrados.
 */
export async function recoverAction(_prev: RecoverState, formData: FormData): Promise<RecoverState> {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return { sent: false, error: "Ingresa un correo válido." };
  }

  try {
    const user = await findAuthUserByEmail(email);
    if (user) {
      const { url } = await passwordLink(email);
      await sendMail({
        to: email,
        subject: "Crea o restablece tu contraseña",
        html: emailLayout(
          `<p>Recibimos una solicitud para crear o restablecer la contraseña de tu cuenta.</p>
           <p>Si no la pediste, ignora este correo; tu contraseña no cambiará.</p>`,
          { label: "Crear nueva contraseña", url }
        ),
      });
    }
  } catch (e) {
    console.error("recoverAction", e);
  }

  return { sent: true, error: null };
}

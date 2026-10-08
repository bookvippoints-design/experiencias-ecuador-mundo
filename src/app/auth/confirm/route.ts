import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";

/**
 * El enlace que llega en el correo de invitacion/recuperacion de Supabase
 * apunta aqui. Verificamos el token y mandamos al usuario a crear su
 * contrasena, sin pasar nunca por el login normal.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  if (token_hash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });

    if (!error) {
      redirect("/set-password");
    }
  }

  redirect("/login?error=enlace_invalido");
}

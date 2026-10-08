"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile, portalPathForRole } from "@/lib/auth/identity";
import { redirect } from "next/navigation";

export interface LoginState {
  error: string | null;
}

export async function signInAction(
  _prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");

  if (!email || !password) {
    return { error: "Ingresa tu correo y tu contraseña." };
  }

  const supabase = await createClient();

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (signInError) {
    return { error: "Correo o contraseña incorrectos." };
  }

  const profile = await getCurrentProfile();

  if (!profile) {
    await supabase.auth.signOut();
    return {
      error:
        "Tu cuenta no tiene un perfil asignado. Comunícate con el equipo de Experiencias Ecuador y el Mundo.",
    };
  }

  if (profile.role === "company" && profile.companyId) {
    const { data: company } = await supabase
      .from("companies")
      .select("status")
      .eq("id", profile.companyId)
      .single();

    if (company?.status === "blocked") {
      await supabase.auth.signOut();
      return {
        error:
          "No es posible iniciar sesión. Comunícate con el equipo de Experiencias Ecuador y el Mundo.",
      };
    }
  }

  redirect(portalPathForRole(profile.role));
}

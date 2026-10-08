import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { appUrl } from "@/lib/brand";

/**
 * Enlaces de acceso firmados por Supabase, enviados con nuestro propio correo.
 * - Cuenta nueva: enlace de invitación (crea la cuenta y lleva a crear contraseña).
 * - Cuenta existente que nunca entró: enlace para crear contraseña.
 * - Cuenta existente activa: enlace al inicio de sesión.
 */
export interface AccessLink {
  userId: string;
  url: string;
  isNew: boolean;
  mustSetPassword: boolean;
}

function confirmUrl(hashedToken: string, type: "invite" | "recovery") {
  return `${appUrl()}/auth/confirm?token_hash=${encodeURIComponent(hashedToken)}&type=${type}`;
}

export async function findAuthUserByEmail(email: string) {
  const admin = createAdminClient();
  const target = email.trim().toLowerCase();
  // La API de administración pagina los usuarios; buscamos página por página.
  for (let page = 1; page <= 50; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw new Error(error.message);
    const found = data.users.find((u) => (u.email ?? "").toLowerCase() === target);
    if (found) return found;
    if (data.users.length < 1000) break;
  }
  return null;
}

/** Crea la cuenta si no existe y devuelve el enlace adecuado. */
export async function ensureAccountAndLink(email: string, fullName: string): Promise<AccessLink> {
  const admin = createAdminClient();
  const normalized = email.trim().toLowerCase();
  const existing = await findAuthUserByEmail(normalized);

  if (!existing) {
    const { data, error } = await admin.auth.admin.generateLink({
      type: "invite",
      email: normalized,
      options: { data: { full_name: fullName } },
    });
    if (error || !data.user) throw new Error(error?.message ?? "No se pudo crear la cuenta");
    return {
      userId: data.user.id,
      url: confirmUrl(data.properties.hashed_token, "invite"),
      isNew: true,
      mustSetPassword: true,
    };
  }

  if (!existing.last_sign_in_at) {
    return { userId: existing.id, ...(await passwordLink(normalized)), isNew: false, mustSetPassword: true };
  }

  return { userId: existing.id, url: `${appUrl()}/login`, isNew: false, mustSetPassword: false };
}

/** Enlace para crear o restablecer contraseña de una cuenta existente. */
export async function passwordLink(email: string): Promise<{ url: string }> {
  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.generateLink({ type: "recovery", email: email.trim().toLowerCase() });
  if (error) throw new Error(error.message);
  return { url: confirmUrl(data.properties.hashed_token, "recovery") };
}

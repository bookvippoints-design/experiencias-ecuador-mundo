import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth/identity";
import { TopBar } from "@/components/TopBar";
import { CompanyLogoUploader } from "@/components/CompanyLogoUploader";

export default async function EmpresaConfiguracionPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const supabase = await createClient();
  const { data: company, error } = await supabase
    .from("companies")
    .select("id, name, logo_url")
    .eq("id", profile.companyId ?? "")
    .maybeSingle();

  return (
    <>
      <TopBar profile={profile} eyebrow="MI EMPRESA" title="Configuración" />
      <main className="portal-content">
        <p className="content-lead">
          Tu logotipo aparecerá en tu panel y en la invitación que reciben tus clientes o colaboradores.
          Puedes cambiarlo cuando quieras.
        </p>

        {error && <p className="error-state">No se pudo cargar tu empresa: {error.message}</p>}

        {company && (
          <section className="panel">
            <h2>Logotipo</h2>
            <CompanyLogoUploader
              companyId={company.id}
              companyName={company.name}
              currentLogoUrl={company.logo_url}
            />
          </section>
        )}
      </main>
    </>
  );
}

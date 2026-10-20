import { requireCompanyManager } from "@/lib/auth/identity";
import { createClient } from "@/lib/supabase/server";
import { TopBar } from "@/components/TopBar";
import { Crumbs } from "@/components/Crumbs";
import { MemberForm } from "../MemberForm";
import { addMemberAction } from "../actions";

export default async function NuevoMiembro() {
  const profile = await requireCompanyManager();
  const supabase = await createClient();
  const { data } = await supabase.from("companies").select("departments").eq("id", profile.companyId ?? "").single();
  return (
    <>
      <TopBar profile={profile} eyebrow="MI EQUIPO" title="Agregar usuario del equipo" />
      <main className="portal-content flow narrow">
        <Crumbs trail={[{ href: "/empresa/equipo", label: "Mi equipo" }, { label: "Agregar usuario" }]} />
        <MemberForm action={addMemberAction} departments={(data?.departments as string[]) ?? []} isNew />
      </main>
    </>
  );
}

import { notFound, redirect } from "next/navigation";
import { requireCompanyManager } from "@/lib/auth/identity";
import { createClient } from "@/lib/supabase/server";
import { TopBar } from "@/components/TopBar";
import { Crumbs } from "@/components/Crumbs";
import { MemberForm } from "../MemberForm";
import { updateMemberAction } from "../actions";
import type { TeamMember } from "../types";

export default async function EditarMiembro({ params }: { params: Promise<{ id: string }> }) {
  const profile = await requireCompanyManager();
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: team }, { data: company }] = await Promise.all([
    supabase.rpc("company_team"),
    supabase.from("companies").select("departments").eq("id", profile.companyId ?? "").single(),
  ]);
  const m = ((team ?? []) as TeamMember[]).find((x) => x.user_id === id);
  if (!m) notFound();
  if (m.company_role === "owner") redirect("/empresa/equipo");
  return (
    <>
      <TopBar profile={profile} eyebrow="MI EQUIPO" title="Editar usuario del equipo" />
      <main className="portal-content flow narrow">
        <Crumbs trail={[{ href: "/empresa/equipo", label: "Mi equipo" }, { label: m.full_name }]} />
        <MemberForm action={updateMemberAction.bind(null, m.user_id)} departments={(company?.departments as string[]) ?? []} isNew={false}
          initial={{ name: m.full_name, email: m.email, role: m.company_role === "admin" ? "admin" : "member", department: m.department, dailyLimit: m.daily_limit }} />
      </main>
    </>
  );
}

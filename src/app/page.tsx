import { redirect } from "next/navigation";
import { getCurrentProfile, portalPathForRole } from "@/lib/auth/identity";

export default async function RootPage() {
  const profile = await getCurrentProfile();

  if (!profile) redirect("/login");
  redirect(portalPathForRole(profile.role));
}

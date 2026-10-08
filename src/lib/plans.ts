import { createClient } from "@/lib/supabase/server";
import { planPaymentUrl } from "@/lib/payphone";
import type { Plan } from "@/app/empresa/PlanCards";

export async function loadPlans(): Promise<Plan[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("company_plans").select("key, name, quantity, total_price, badge").order("sort");
  return (data ?? []).map((p) => ({ ...p, total_price: Number(p.total_price), payUrl: planPaymentUrl(p.key) }));
}

import { getCurrentProfile, isCompanyManager } from "@/lib/auth/identity";
import { createClient } from "@/lib/supabase/server";
import { reportRange, type ReportRow } from "../range";

export const dynamic = "force-dynamic";

const cell = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;

/** Reporte del equipo en CSV (se abre en Excel). */
export async function GET(req: Request) {
  const profile = await getCurrentProfile();
  if (!profile || !isCompanyManager(profile)) return new Response("Acceso no autorizado", { status: 403 });
  const url = new URL(req.url);
  const r = reportRange(Object.fromEntries(url.searchParams));
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("company_team_report", { p_from: r.from, p_to: r.to });
  if (error) return new Response(error.message, { status: 400 });
  const rows = (data ?? []) as ReportRow[];
  const lines = [
    ["Departamento", "Persona", "Accesos creados", "Clientes que activaron su cuenta"].map(cell).join(";"),
    ...rows.map((x) => [x.department, x.member_name, x.created, x.activated].map(cell).join(";")),
    "",
    [cell(`Periodo: ${r.from} a ${r.to}`)].join(";"),
  ];
  return new Response("﻿" + lines.join("\r\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="reporte-equipo-${r.from}-a-${r.to}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}

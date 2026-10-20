/** Rango de fechas del reporte (hora de Ecuador). */
export function reportRange(sp: { periodo?: string; desde?: string; hasta?: string }) {
  const today = new Date(Date.now() - 5 * 3600000).toISOString().slice(0, 10);
  const valid = (d?: string) => (d && /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : null);
  if (sp.periodo === "hoy") return { periodo: "hoy", from: today, to: today };
  if (sp.periodo === "rango") {
    const from = valid(sp.desde) ?? today.slice(0, 8) + "01";
    const to = valid(sp.hasta) ?? today;
    return { periodo: "rango", from: from <= to ? from : to, to: from <= to ? to : from };
  }
  return { periodo: "mes", from: today.slice(0, 8) + "01", to: today };
}

export interface ReportRow {
  member_id: string;
  member_name: string;
  department: string;
  created: number;
  activated: number;
}

import { requireRole } from "@/lib/auth/identity";
import { createClient } from "@/lib/supabase/server";
import { loadPeople } from "@/lib/people";
import { TopBar } from "@/components/TopBar";
import { shortDate } from "@/lib/format";

export default async function AdminRegalos() {
  const profile = await requireRole("admin");
  const supabase = await createClient();
  const { data: gifts } = await supabase
    .from("gifts")
    .select("id, code, sender_id, recipient_id, recipient_name, recipient_email, dedication, order_id, created_at")
    .order("created_at", { ascending: false });

  const byId = await loadPeople((gifts ?? []).flatMap((g) => [g.sender_id, g.recipient_id]));
  const { data: ents } = await supabase.from("entitlements").select("gift_id, code");
  const codesByGift = new Map<string, string[]>();
  for (const e of ents ?? []) {
    if (!e.gift_id) continue;
    codesByGift.set(e.gift_id, [...(codesByGift.get(e.gift_id) ?? []), e.code]);
  }

  return (
    <>
      <TopBar profile={profile} eyebrow="ADMINISTRACIÓN" title="Regalos" />
      <main className="portal-content">
        <p className="content-lead">Cada regalo queda registrado con quién lo envió, quién lo recibió y qué beneficios incluye.</p>
        <div className="table-card">
          <table className="simple-table">
            <thead>
              <tr>
                <th>Regalo</th>
                <th>De</th>
                <th>Para</th>
                <th>Origen</th>
                <th>Beneficios</th>
                <th>Tarjeta</th>
              </tr>
            </thead>
            <tbody>
              {(gifts ?? []).length === 0 && <tr><td colSpan={6} className="empty-state">Todavía no hay regalos.</td></tr>}
              {(gifts ?? []).map((g) => (
                <tr key={g.id}>
                  <td><strong>{g.code}</strong><div className="exp-card__meta">{shortDate(g.created_at)}</div></td>
                  <td>{byId.get(g.sender_id)?.full_name}<div className="exp-card__meta">{byId.get(g.sender_id)?.email}</div></td>
                  <td>{g.recipient_name}<div className="exp-card__meta">{g.recipient_email}</div></td>
                  <td>{g.order_id ? "Compra para regalo" : "Regalo de experiencias propias"}</td>
                  <td>{(codesByGift.get(g.id) ?? []).join(", ")}</td>
                  <td><a className="btn-ghost btn-small" href={`/admin/regalos/${g.id}/tarjeta`} target="_blank" rel="noreferrer">PDF</a></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </>
  );
}

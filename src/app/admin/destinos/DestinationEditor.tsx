"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { estimatedTaxes, usd, type IntlDestination } from "@/lib/intl-destinations";

type Draft = Omit<IntlDestination, "id"> & { id: string | null };

const EMPTY: Draft = { id: null, city: "", country: "", region: "América", days: 4, nights: 3, tax_per_night: 0, active: true };

function Row({ d, onSaved }: { d: Draft; onSaved: () => void }) {
  const [v, setV] = useState<Draft>(d);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const dirty = JSON.stringify(v) !== JSON.stringify(d);

  async function save() {
    setSaving(true);
    setMsg(null);
    const { error } = await createClient().rpc("admin_save_destination", {
      p_id: v.id, p_city: v.city, p_country: v.country, p_region: v.region,
      p_days: Number(v.days), p_nights: Number(v.nights), p_tax: Number(v.tax_per_night), p_active: v.active,
    });
    setSaving(false);
    if (error) return setMsg(error.message);
    setMsg("Guardado");
    if (!v.id) setV(EMPTY);
    onSaved();
  }

  return (
    <tr>
      <td><input aria-label="Ciudad" value={v.city} onChange={(e) => setV({ ...v, city: e.target.value })} /></td>
      <td><input aria-label="País" value={v.country} onChange={(e) => setV({ ...v, country: e.target.value })} /></td>
      <td><input aria-label="Región" value={v.region} onChange={(e) => setV({ ...v, region: e.target.value })} /></td>
      <td><input aria-label="Días" type="number" min={1} max={30} value={v.days} onChange={(e) => setV({ ...v, days: Number(e.target.value) })} style={{ width: 70 }} /></td>
      <td><input aria-label="Noches" type="number" min={1} max={30} value={v.nights} onChange={(e) => setV({ ...v, nights: Number(e.target.value) })} style={{ width: 70 }} /></td>
      <td><input aria-label="Impuesto por noche" type="number" min={0} step="0.01" value={v.tax_per_night} onChange={(e) => setV({ ...v, tax_per_night: Number(e.target.value) })} style={{ width: 90 }} /></td>
      <td><strong>{usd(estimatedTaxes(v))}</strong></td>
      <td><label className="consent" style={{ margin: 0 }}><input type="checkbox" checked={v.active} onChange={(e) => setV({ ...v, active: e.target.checked })} /> <span>Activo</span></label></td>
      <td>
        <button className="btn-orange btn-small" onClick={save} disabled={saving || !dirty || !v.city.trim() || !v.country.trim()}>
          {saving ? "..." : v.id ? "Guardar" : "Agregar"}
        </button>
        {msg && <div className="field-hint">{msg}</div>}
      </td>
    </tr>
  );
}

export function DestinationEditor({ destinations }: { destinations: IntlDestination[] }) {
  const [q, setQ] = useState("");
  const router = useRouter();
  const shown = useMemo(
    () => destinations.filter((d) => !q.trim() || `${d.city} ${d.country} ${d.region}`.toLowerCase().includes(q.trim().toLowerCase())),
    [destinations, q]
  );

  return (
    <>
      <div className="field" style={{ maxWidth: 360 }}>
        <label htmlFor="ad-q">Buscar</label>
        <input id="ad-q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ciudad, país o región" />
      </div>
      <p className="field-hint">{destinations.filter((d) => d.active).length} activos de {destinations.length}.</p>
      <div className="table-card">
        <table className="simple-table dest-admin-table">
          <thead>
            <tr><th>Ciudad</th><th>País</th><th>Región</th><th>Días</th><th>Noches</th><th>Impuesto/noche (US$)</th><th>Total estimado</th><th>Estado</th><th></th></tr>
          </thead>
          <tbody>
            <Row key="new" d={EMPTY} onSaved={() => router.refresh()} />
            {shown.map((d) => <Row key={`${d.id}-${d.tax_per_night}-${d.active}-${d.nights}`} d={{ ...d, tax_per_night: Number(d.tax_per_night) }} onSaved={() => router.refresh()} />)}
          </tbody>
        </table>
      </div>
    </>
  );
}

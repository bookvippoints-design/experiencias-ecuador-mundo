"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Product } from "@/lib/products";

const NUM_FIELDS: { key: keyof Product; label: string }[] = [
  { key: "price", label: "Precio (US$)" },
  { key: "validity_months", label: "Vigencia (meses)" },
  { key: "national_count", label: "Escapadas nacionales" },
  { key: "national_days", label: "Días por escapada" },
  { key: "national_nights", label: "Noches por escapada" },
  { key: "national_people", label: "Personas por escapada" },
  { key: "international_count", label: "Invitaciones internacionales" },
  { key: "points", label: "Puntos" },
  { key: "sort", label: "Orden" },
];

export function ProductEditor({ product }: { product: Product }) {
  const [form, setForm] = useState<Record<string, string | boolean>>(() => ({
    name: product.name,
    tagline: product.tagline ?? "",
    description: product.description ?? "",
    conditions: product.conditions ?? "",
    image_url: product.image_url ?? "",
    highlight: product.highlight ?? "",
    purchasable: product.purchasable,
    active: product.active,
    breakfast_included: product.breakfast_included,
    ...Object.fromEntries(NUM_FIELDS.map((f) => [f.key, product[f.key] === null ? "" : String(product[f.key])])),
  }));
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const router = useRouter();

  const set = (k: string, v: string | boolean) => setForm((f) => ({ ...f, [k]: v }));

  async function save() {
    setSaving(true);
    setMsg(null);
    const { error } = await createClient().rpc("admin_save_product", { p_id: product.id, p_data: form });
    setSaving(false);
    if (error) setMsg(error.message);
    else {
      setMsg("Guardado. Los pedidos ya creados conservan las condiciones con las que se compraron.");
      router.refresh();
    }
  }

  if (!open) {
    return (
      <button className="btn-ghost btn-small" onClick={() => setOpen(true)}>
        Editar
      </button>
    );
  }

  return (
    <div style={{ marginTop: ".75rem", borderTop: "1px solid #eef3f7", paddingTop: ".75rem" }}>
      <div className="plan-grid" style={{ marginTop: 0 }}>
        <div className="field"><label>Nombre</label><input value={String(form.name)} onChange={(e) => set("name", e.target.value)} /></div>
        <div className="field"><label>Frase corta</label><input value={String(form.tagline)} onChange={(e) => set("tagline", e.target.value)} /></div>
        <div className="field"><label>Etiqueta destacada</label><input value={String(form.highlight)} onChange={(e) => set("highlight", e.target.value)} placeholder="Ej. Más elegido" /></div>
        {NUM_FIELDS.map((f) => (
          <div className="field" key={f.key}>
            <label>{f.label}</label>
            <input inputMode="decimal" value={String(form[f.key])} onChange={(e) => set(f.key, e.target.value)} />
          </div>
        ))}
      </div>
      <div className="field"><label>Imagen (URL)</label><input value={String(form.image_url)} onChange={(e) => set("image_url", e.target.value)} /></div>
      <div className="field"><label>Descripción</label><textarea rows={2} value={String(form.description)} onChange={(e) => set("description", e.target.value)} /></div>
      <div className="field"><label>Condiciones (una por línea)</label><textarea rows={7} value={String(form.conditions)} onChange={(e) => set("conditions", e.target.value)} /></div>
      <div className="btn-row" style={{ marginBottom: ".75rem" }}>
        <label className="consent"><input type="checkbox" checked={Boolean(form.purchasable)} onChange={(e) => set("purchasable", e.target.checked)} /> Compra habilitada (requiere precio)</label>
        <label className="consent"><input type="checkbox" checked={Boolean(form.breakfast_included)} onChange={(e) => set("breakfast_included", e.target.checked)} /> Desayuno incluido</label>
        <label className="consent"><input type="checkbox" checked={Boolean(form.active)} onChange={(e) => set("active", e.target.checked)} /> Visible en el catálogo</label>
      </div>
      {msg && <p className="field-hint">{msg}</p>}
      <div className="btn-row">
        <button className="btn-orange btn-small" onClick={save} disabled={saving}>{saving ? "Guardando..." : "Guardar cambios"}</button>
        <button className="btn-ghost btn-small" onClick={() => setOpen(false)}>Cerrar</button>
      </div>
    </div>
  );
}

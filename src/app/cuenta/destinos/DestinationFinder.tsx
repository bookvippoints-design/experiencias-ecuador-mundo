"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { destinationLabel, estimatedTaxes, usd, TAX_NOTE, type IntlDestination } from "@/lib/intl-destinations";

const TAX_RANGES = [
  { key: "all", label: "Cualquier impuesto", test: () => true },
  { key: "a", label: "Menos de US$35 por noche", test: (t: number) => t < 35 },
  { key: "b", label: "US$35 a US$49", test: (t: number) => t >= 35 && t < 50 },
  { key: "c", label: "US$50 a US$64", test: (t: number) => t >= 50 && t < 65 },
  { key: "d", label: "US$65 o más", test: (t: number) => t >= 65 },
];

function norm(s: string) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

export function DestinationFinder({ destinations, canRequest }: { destinations: IntlDestination[]; canRequest: boolean }) {
  const [q, setQ] = useState("");
  const [region, setRegion] = useState("all");
  const [nights, setNights] = useState("all");
  const [tax, setTax] = useState("all");
  const [sort, setSort] = useState<"name" | "tax" | "nights">("name");

  const regions = useMemo(() => Array.from(new Set(destinations.map((d) => d.region))).sort(), [destinations]);
  const nightOptions = useMemo(() => Array.from(new Set(destinations.map((d) => d.nights))).sort((a, b) => a - b), [destinations]);

  const shown = useMemo(() => {
    const range = TAX_RANGES.find((r) => r.key === tax)!;
    const nq = norm(q.trim());
    return destinations
      .filter((d) => (region === "all" || d.region === region)
        && (nights === "all" || d.nights === Number(nights))
        && range.test(Number(d.tax_per_night))
        && (!nq || norm(`${d.city} ${d.country}`).includes(nq)))
      .sort((a, b) => sort === "tax" ? estimatedTaxes(a) - estimatedTaxes(b)
        : sort === "nights" ? b.nights - a.nights || a.city.localeCompare(b.city)
        : a.country.localeCompare(b.country) || a.city.localeCompare(b.city));
  }, [destinations, q, region, nights, tax, sort]);

  return (
    <>
      <div className="finder-filters">
        <div className="field">
          <label htmlFor="df-q">Buscar</label>
          <input id="df-q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ciudad o país" />
        </div>
        <div className="field">
          <label htmlFor="df-r">Región</label>
          <select id="df-r" value={region} onChange={(e) => setRegion(e.target.value)}>
            <option value="all">Todas</option>
            {regions.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="df-n">Noches</label>
          <select id="df-n" value={nights} onChange={(e) => setNights(e.target.value)}>
            <option value="all">Todas</option>
            {nightOptions.map((n) => <option key={n} value={n}>{n + 1} días / {n} noches</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="df-t">Impuesto por noche</label>
          <select id="df-t" value={tax} onChange={(e) => setTax(e.target.value)}>
            {TAX_RANGES.map((r) => <option key={r.key} value={r.key}>{r.label}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="df-s">Ordenar</label>
          <select id="df-s" value={sort} onChange={(e) => setSort(e.target.value as typeof sort)}>
            <option value="name">Por país</option>
            <option value="tax">Menor total de impuestos</option>
            <option value="nights">Más noches</option>
          </select>
        </div>
      </div>
      <p className="field-hint">{shown.length} {shown.length === 1 ? "destino" : "destinos"}. {TAX_NOTE}</p>

      <div className="dest-grid">
        {shown.map((d) => (
          <article key={d.id} className="dest-card">
            <div>
              <h3 className="dest-card__city">{d.city}</h3>
              <div className="dest-card__country">{d.country} · {d.region}</div>
            </div>
            <div className="dest-card__stay">{d.days} días / {d.nights} noches</div>
            <dl className="dest-card__money">
              <div><dt>Impuesto por noche</dt><dd>{usd(Number(d.tax_per_night))}</dd></div>
              <div className="is-total"><dt>Total estimado</dt><dd>{usd(estimatedTaxes(d))}</dd></div>
            </dl>
            {canRequest && (
              <Link className="btn-orange btn-small" href={`/cuenta/experiencias?invitacion=${encodeURIComponent(destinationLabel(d))}`}>
                Pedir esta invitación
              </Link>
            )}
          </article>
        ))}
      </div>
    </>
  );
}

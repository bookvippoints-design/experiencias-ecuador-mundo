import Link from "next/link";

/** Ruta de la página ("Paquetes › Escape Plus") para que la persona sepa dónde está. */
export function Crumbs({ trail }: { trail: { href?: string; label: string }[] }) {
  return (
    <nav className="crumbs" aria-label="Estás aquí">
      {trail.map((t, i) => (
        <span key={t.label}>
          {i > 0 && <span className="crumbs__sep" aria-hidden="true">›</span>}
          {t.href ? <Link href={t.href}>{t.label}</Link> : <span aria-current="page">{t.label}</span>}
        </span>
      ))}
    </nav>
  );
}

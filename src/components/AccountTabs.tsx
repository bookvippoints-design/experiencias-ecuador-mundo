import Link from "next/link";

const TABS = [
  { href: "/cuenta/experiencias", label: "Mis experiencias" },
  { href: "/cuenta/reservas", label: "Canjes y reservas" },
  { href: "/cuenta/puntos", label: "Mis puntos" },
  { href: "/cuenta/pedidos", label: "Mis pedidos" },
];

/** Pestañas que agrupan todo lo que el cliente tiene: experiencias, canjes, puntos y pedidos. */
export function AccountTabs({ current }: { current: string }) {
  return (
    <nav className="account-tabs" aria-label="Mis cosas">
      {TABS.map((t) => (
        <Link key={t.href} href={t.href} className={t.href === current ? "is-active" : undefined} aria-current={t.href === current ? "page" : undefined}>
          {t.label}
        </Link>
      ))}
    </nav>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export interface NavItem {
  href: string;
  label: string;
  /** Otras rutas que pertenecen a esta sección (para resaltarla). */
  also?: string[];
  gift?: boolean;
  icon?: string;
}

export function isActive(path: string, item: NavItem, exactRoot: boolean) {
  const bases = [item.href, ...(item.also ?? [])];
  return bases.some((b) => (exactRoot && b === item.href && b.split("/").length <= 2 ? path === b : path === b || path.startsWith(b + "/")));
}

/** Enlaces del menú lateral, con la sección actual resaltada. */
export function SidebarLinks({ items, badges }: { items: NavItem[]; badges: Record<string, number> }) {
  const path = usePathname();
  return (
    <>
      {items.map((item) => {
        const active = isActive(path, item, true);
        return (
          <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined}
            className={`sidebar__link${item.gift ? " is-gift" : ""}${active ? " is-active" : ""}`}>
            {item.label}
            {(badges[item.href] ?? 0) > 0 && (
              <span className="sidebar__badge" aria-label={`${badges[item.href]} pendientes`}>{badges[item.href]}</span>
            )}
          </Link>
        );
      })}
    </>
  );
}

const ICONS: Record<string, React.ReactNode> = {
  home: <path d="M3 11.5 12 4l9 7.5M5.5 9.5V20h13V9.5" />,
  bag: <><path d="M5 8h14l-1 12H6L5 8z" /><path d="M9 8V6a3 3 0 0 1 6 0v2" /></>,
  suitcase: <><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M9 7V5h6v2M3 13h18" /></>,
  mail: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m4 7 8 6 8-6" /></>,
  help: <><circle cx="12" cy="12" r="9" /><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6v.6M12 17h.01" /></>,
};

/** Barra fija inferior en el celular (portal del cliente). */
export function BottomNav({ items, badges }: { items: NavItem[]; badges: Record<string, number> }) {
  const path = usePathname();
  return (
    <nav className="bottom-nav" aria-label="Menú principal">
      {items.map((item) => {
        const active = isActive(path, item, true);
        return (
          <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} className={`bottom-nav__item${active ? " is-active" : ""}`}>
            <span className="bottom-nav__icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                {ICONS[item.icon ?? "home"]}
              </svg>
              {(badges[item.href] ?? 0) > 0 && <span className="bottom-nav__badge">{badges[item.href]}</span>}
            </span>
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

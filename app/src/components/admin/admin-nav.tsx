"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Trophy, CalendarRange, Users } from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/admin", label: "Übersicht", icon: LayoutDashboard, exact: true },
  { href: "/admin/competitions", label: "Wettbewerbe", icon: Trophy },
  { href: "/admin/seasons", label: "Seasons", icon: CalendarRange },
  { href: "/admin/users", label: "Nutzer", icon: Users },
];

function isActive(pathname: string, href: string, exact?: boolean) {
  return exact ? pathname === href : pathname === href || pathname.startsWith(href + "/");
}

export function AdminSideNav() {
  const pathname = usePathname();
  return (
    <aside className="hidden w-48 shrink-0 md:block">
      <nav aria-label="Admin-Navigation" className="sticky top-20 flex flex-col gap-1">
        {ITEMS.map(({ href, label, icon: Icon, exact }) => {
          const active = isActive(pathname, href, exact);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-sm border-l-4 px-3 py-2.5 text-sm font-semibold uppercase tracking-wide",
                active ? "border-gold bg-card text-gold" : "border-transparent text-text-2 hover:bg-card hover:text-text",
              )}
            >
              <Icon className="h-5 w-5" strokeWidth={2} />
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

export function AdminTopTabs() {
  const pathname = usePathname();
  return (
    <nav aria-label="Admin-Navigation" className="-mx-4 mb-4 overflow-x-auto border-b border-border px-4 md:hidden">
      <div className="flex min-w-max gap-1">
        {ITEMS.map(({ href, label, exact }) => {
          const active = isActive(pathname, href, exact);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex h-11 items-center border-b-2 px-3 text-xs font-semibold uppercase tracking-wide",
                active ? "border-gold text-gold" : "border-transparent text-muted hover:text-text",
              )}
            >
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function SeasonTabs({ seasonId }: { seasonId: string }) {
  const pathname = usePathname();
  const base = `/admin/seasons/${seasonId}`;
  const tabs = [
    { href: base, label: "Season", exact: true },
    { href: `${base}/teams`, label: "Teams" },
    { href: `${base}/players`, label: "Spieler" },
    { href: `${base}/rounds`, label: "Spieltage" },
    { href: `${base}/stats`, label: "Statistik" },
    { href: `${base}/scoring`, label: "Punkte" },
    { href: `${base}/prizes`, label: "Preise" },
  ];
  return (
    <nav aria-label="Season-Bereiche" className="-mx-4 overflow-x-auto border-b border-border px-4">
      <div className="flex min-w-max gap-1">
        {tabs.map(({ href, label, exact }) => {
          const active = isActive(pathname, href, exact);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex h-11 items-center border-b-2 px-3 text-xs font-semibold uppercase tracking-wide",
                active ? "border-gold text-gold" : "border-transparent text-muted hover:text-text",
              )}
            >
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

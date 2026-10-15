"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Shirt, Store, BarChart3, UserRound, Users, Shield, CircleHelp } from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/app", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/app/team", label: "Mein Team", icon: Shirt },
  { href: "/app/market", label: "Markt", icon: Store },
  { href: "/app/leaderboard", label: "Ranking", icon: BarChart3 },
  { href: "/app/profile", label: "Profil", icon: UserRound },
];

function isActive(pathname: string, href: string, exact?: boolean) {
  return exact ? pathname === href : pathname === href || pathname.startsWith(href + "/");
}

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Hauptnavigation" className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-ground/95 backdrop-blur md:hidden">
      <div className="pb-safe flex px-2 pt-1.5">
        {ITEMS.map(({ href, label, icon: Icon, exact }) => {
          const active = isActive(pathname, href, exact);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex h-14 flex-1 flex-col items-center justify-center gap-1 text-[10px] font-semibold uppercase tracking-wide",
                active ? "text-gold" : "text-muted hover:text-text-2",
              )}
            >
              <Icon className="h-[22px] w-[22px]" strokeWidth={2} />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function SideNav({ isStaff }: { isStaff: boolean }) {
  const pathname = usePathname();
  const items = [...ITEMS, { href: "/app/leagues", label: "Private Ligen", icon: Users }, { href: "/app/faq", label: "FAQ", icon: CircleHelp }];
  return (
    <aside className="hidden w-52 shrink-0 md:block">
      <nav aria-label="Hauptnavigation" className="sticky top-20 flex flex-col gap-1">
        {items.map(({ href, label, icon: Icon, exact }) => {
          const active = isActive(pathname, href, exact);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-sm px-3 py-2.5 text-sm font-semibold uppercase tracking-wide",
                active ? "bg-card text-gold border-l-4 border-gold" : "text-text-2 hover:bg-card hover:text-text border-l-4 border-transparent",
              )}
            >
              <Icon className="h-5 w-5" strokeWidth={2} />
              {label}
            </Link>
          );
        })}
        {isStaff && (
          <Link href="/admin" className="mt-4 flex items-center gap-3 rounded-sm border border-border-strong px-3 py-2.5 text-sm font-semibold uppercase tracking-wide text-text-2 hover:text-text">
            <Shield className="h-5 w-5" /> Admin
          </Link>
        )}
      </nav>
    </aside>
  );
}

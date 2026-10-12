"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { LayoutGrid, LogOut, Shield, UserRound } from "lucide-react";
import { signOutAction } from "@/app/app/actions";

/** Profil-Kürzel im Header; Klick öffnet ein kleines Menü mit Profil, Wettbewerben, Admin und Abmelden. */
export function UserMenu({ initials, username, isStaff }: { initials: string; username: string; isStaff: boolean }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const item = "flex min-h-[44px] w-full items-center gap-3 px-4 text-sm text-text-2 hover:bg-surface hover:text-text";
  const close = () => setOpen(false);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Benutzermenü"
        className="num flex h-9 w-9 cursor-pointer items-center justify-center bg-gold text-sm text-gold-fg outline outline-1 outline-offset-2 outline-transparent transition skew hover:bg-text hover:outline-border-strong aria-expanded:bg-text aria-expanded:outline-border-strong"
      >
        <span>{initials}</span>
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-11 z-40 w-56 overflow-hidden rounded border border-border bg-card py-1 shadow-kf">
          <div className="border-b border-border px-4 py-2 text-xs text-muted">
            Angemeldet als <span className="font-semibold text-text">{username}</span>
          </div>
          <Link href="/app/profile" role="menuitem" className={item} onClick={close}>
            <UserRound className="h-4 w-4" /> Profil
          </Link>
          <Link href="/app/competitions" role="menuitem" className={item} onClick={close}>
            <LayoutGrid className="h-4 w-4" /> Alle Wettbewerbe
          </Link>
          {isStaff && (
            <Link href="/admin" role="menuitem" className={item} onClick={close}>
              <Shield className="h-4 w-4" /> Admin
            </Link>
          )}
          <form action={signOutAction} className="border-t border-border">
            <button type="submit" role="menuitem" className={item}>
              <LogOut className="h-4 w-4" /> Abmelden
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

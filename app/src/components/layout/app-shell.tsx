import Link from "next/link";
import Image from "next/image";
import { Stripe } from "@/components/ui/tricolore";
import { BottomNav, SideNav } from "./nav";
import { SeasonSwitcher } from "./season-switcher";
import type { Season } from "@/lib/data/season";
import type { Profile } from "@/lib/auth";
import { initials } from "@/lib/utils";

export function AppShell({
  children,
  season,
  seasons,
  profile,
}: {
  children: React.ReactNode;
  season: Season | null;
  seasons: Season[];
  profile: Profile;
}) {
  const isStaff = profile.role === "admin" || profile.role === "editor";
  return (
    <div className="flex min-h-dvh flex-1 flex-col">
      <div aria-hidden className="h-[5px] tricolore" />
      <header className="sticky top-0 z-30 border-b border-border bg-ground/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4">
          <div className="flex items-center gap-3">
            <Link href="/app/competitions" className="display hidden text-xl md:block" title="Alle Wettbewerbe">
              Kleinfeld <span className="text-gold">Fantasy</span>
            </Link>
            <Link href="/app/competitions" aria-label="Alle Wettbewerbe" className="display flex h-8 w-8 items-center justify-center border border-border-strong text-sm md:hidden">
              K<span className="text-gold">F</span>
            </Link>
            <span className="hidden h-6 w-px bg-border md:block" />
            {season ? <SeasonSwitcher current={season} seasons={seasons} /> : <span className="display text-lg"><Stripe className="mr-2" />Kleinfeld Fantasy</span>}
          </div>
          <div className="flex items-center gap-3">
            <Image src="/brand/dkfv-logo-small-white.png" alt="DKFV" width={72} height={25} className="hidden h-5 w-auto opacity-90 sm:block" />
            {isStaff && (
              <Link href="/admin" className="hidden rounded-sm border border-border-strong px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-text-2 hover:text-text md:block">
                Admin
              </Link>
            )}
            <Link href="/app/profile" aria-label="Profil" className="num flex h-9 w-9 items-center justify-center bg-gold text-gold-fg text-sm skew">
              <span>{initials(profile.display_name ?? profile.username)}</span>
            </Link>
          </div>
        </div>
      </header>
      <div className="mx-auto flex w-full max-w-6xl flex-1 gap-8 px-4 pb-28 pt-4 md:pb-10 md:pt-6">
        <SideNav isStaff={isStaff} />
        <main className="min-w-0 flex-1">{children}</main>
      </div>
      <BottomNav />
    </div>
  );
}

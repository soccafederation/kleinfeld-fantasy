import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Eyebrow, Stripe, TricoloreBar } from "@/components/ui/tricolore";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/server";
import { formatDateTime, formatPoints, initials } from "@/lib/utils";
import { parseSeasonRules } from "@/lib/rules";
import { redirect } from "next/navigation";
import { REGISTRATION_OPEN } from "@/lib/config";

export default async function LandingPage() {
  const supabase = await createClient();
  if (!REGISTRATION_OPEN) {
    // Geschlossene Runde: keine öffentliche Startseite
    const { data: { user } } = await supabase.auth.getUser();
    redirect(user ? "/app" : "/login");
  }
  const [{ data: seasons }, { data: comps }, { data: prizes }] = await Promise.all([
    supabase.from("seasons").select("*, competition:competitions(*)").in("status", ["open", "live"]).order("created_at"),
    supabase.from("competitions").select("*").eq("is_active", true).order("sort_order"),
    supabase.from("prizes").select("*").order("sort_order").limit(3),
  ]);
  const active = seasons?.[0] ?? null;
  const rules = parseSeasonRules(active?.rules);
  const [{ data: top5 }, { data: nextRound }, { count: managerCount }] = active
    ? await Promise.all([
        supabase.rpc("leaderboard_window", { p_season_id: active.id, p_from: 1, p_to: 5 }),
        supabase.from("fantasy_rounds").select("*").eq("season_id", active.id).eq("status", "upcoming").gt("deadline_at", new Date().toISOString()).order("deadline_at").limit(1).maybeSingle(),
        supabase.from("fantasy_teams").select("id", { count: "exact", head: true }).eq("season_id", active.id).eq("is_complete", true),
      ])
    : [{ data: [] }, { data: null }, { count: 0 }];

  const squadTotal = rules.squad.GK + rules.squad.FIELD + rules.squad.BENCH;

  return (
    <div className="flex min-h-dvh flex-1 flex-col">
      <TricoloreBar />
      {/* Header */}
      <header className="border-b border-border">
        <div className="mx-auto flex h-20 max-w-6xl items-center justify-between gap-6 px-4">
          <Link href="/" className="flex items-center gap-4">
            <span className="display text-3xl">
              Kleinfeld <span className="text-gold">Fantasy</span>
            </span>
            <span className="hidden h-7 w-px bg-border sm:block" />
            <Image src="/brand/dkfv-logo-white.png" alt="Deutscher Kleinfeld-Fußball-Verband" width={140} height={30} className="hidden h-7 w-auto sm:block" priority />
          </Link>
          <nav className="flex items-center gap-3 md:gap-6">
            <a href="#how" className="hidden text-sm font-semibold uppercase tracking-wide text-text-2 hover:text-text md:block">So funktioniert&apos;s</a>
            <a href="#prizes" className="hidden text-sm font-semibold uppercase tracking-wide text-text-2 hover:text-text md:block">Preise</a>
            <a href="#leaderboard" className="hidden text-sm font-semibold uppercase tracking-wide text-text-2 hover:text-text md:block">Leaderboard</a>
            <Link href="/login" className="text-sm font-semibold uppercase tracking-wide text-text hover:text-gold">Login</Link>
            <Button asChild size="sm"><Link href="/register"><span>Team erstellen</span></Link></Button>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <Image src="/brand/pitch-side.jpg" alt="" fill priority className="object-cover object-[center_30%] brightness-50" sizes="100vw" />
        <div className="absolute inset-0 bg-gradient-to-r from-ground via-ground/85 to-ground/20" />
        <div className="absolute inset-0 bg-gradient-to-b from-ground/10 via-transparent to-ground" />
        <div aria-hidden className="absolute -right-20 top-0 bottom-0 hidden w-[120px] tricolore-skew border-0 opacity-95 lg:block" />
        <div className="relative mx-auto grid max-w-6xl gap-10 px-4 pb-24 pt-16 lg:grid-cols-[1.05fr_1fr] lg:items-center lg:pt-24">
          <div className="flex flex-col gap-6">
            <Eyebrow>{active ? `Offizielles Fantasy Game · ${active.competition.name} ${active.name}` : "Offizielles Fantasy Game für Kleinfeldfußball"}</Eyebrow>
            <h1 className="display text-[56px] sm:text-[76px] lg:text-[88px]">
              Build your team.
              <br />
              <span className="text-gold">Own the game.</span>
            </h1>
            <p className="max-w-lg text-lg leading-relaxed text-text-2">
              Stell dein Fantasy-Team aus den besten Kleinfeldfußballern zusammen, sammle Punkte mit echten Spielerleistungen und kämpfe um die Spitze der Rangliste.
            </p>
            <div className="flex flex-wrap gap-4 pl-1">
              <Button asChild size="lg"><Link href="/register"><span>Jetzt Team erstellen</span></Link></Button>
              <Button asChild size="lg" variant="outline"><a href="#how"><span>So funktioniert&apos;s</span></a></Button>
            </div>
            <div className="inline-grid grid-cols-3 self-start border border-border bg-ground/70">
              <HeroStat value={`${rules.budget_m}M`} label="Budget" />
              <HeroStat value={`${rules.squad.GK}+${rules.squad.FIELD}+${rules.squad.BENCH}`} label="TW · Feld · Bank" />
              <HeroStat value={`${rules.captain_multiplier}x`} label="Kapitän" gold last />
            </div>
          </div>

          {/* Hero-Visual: Rang-Karte + Beispielkarten */}
          <div className="relative hidden h-[480px] lg:block">
            <DemoCard className="absolute left-0 top-20 -rotate-6" name="Torwart" pos="TW" pts="64" value="9,5M" />
            <DemoCard className="absolute left-40 top-2 z-10 shadow-kf" name="Kapitän" pos="FS" pts="118" value="15,0M" captain />
            <DemoCard className="absolute left-80 top-24 rotate-6" name="Feldspieler" pos="FS" pts="87" value="11,5M" />
            <div className="absolute left-8 top-[380px] grid w-[440px] grid-cols-[auto_1fr_auto] items-center gap-4 rounded border border-border border-l-[6px] border-l-gold bg-[#0f0f11] px-5 py-4">
              <div className="num text-5xl">#133</div>
              <div>
                <div className="eyebrow">Your Rank · of 800</div>
                <div className="mt-0.5 text-sm font-semibold text-text-2">421 PTS · <span className="text-positive">▲ 12 Plätze</span></div>
              </div>
              <div className="num border border-border px-2.5 py-1.5 text-xl text-gold">MD4 · 79</div>
            </div>
            <span className="absolute bottom-0 right-0 text-[10px] uppercase tracking-widest text-muted-2">Beispielansicht</span>
          </div>
        </div>
      </section>

      {/* Competitions */}
      <section id="competitions" className="mx-auto w-full max-w-6xl px-4 pb-8 pt-20">
        <SectionHead eyebrow="Choose your competition" title="Ein Account. Alle Wettbewerbe." />
        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {(comps ?? []).map((c) => {
            const s = seasons?.find((x) => x.competition_id === c.id);
            return s ? (
              <Link key={c.id} href="/register" className="relative flex min-h-[240px] flex-col overflow-hidden rounded border border-gold bg-card">
                <Image src="/brand/pitch-aerial.jpg" alt="" fill className="object-cover opacity-50" sizes="(min-width:768px) 33vw, 100vw" />
                <div className="absolute inset-0 bg-gradient-to-b from-ground/10 to-ground" />
                <div className="relative mt-auto flex flex-col gap-2 p-5">
                  <Eyebrow stripe={false}><span className="h-2 w-2 rounded-full bg-positive" /> Aktiv · {s.name}</Eyebrow>
                  <div className="display text-4xl">{c.name}</div>
                  <div className="text-sm text-text-2">{nextRound ? `Deadline ${nextRound.name}: ${formatDateTime(nextRound.deadline_at)}` : "Registrierung offen"}</div>
                </div>
              </Link>
            ) : (
              <div key={c.id} className="flex min-h-[240px] flex-col gap-2 rounded border border-border bg-card p-5">
                <span className="eyebrow text-muted">Demnächst</span>
                <div className="display mt-auto text-4xl text-text-2">{c.name}</div>
                <div className="text-sm text-muted">Vormerken – mit deinem Account bist du automatisch dabei.</div>
              </div>
            );
          })}
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="mx-auto w-full max-w-6xl px-4 py-20">
        <SectionHead eyebrow="How it works" title="Drei Schritte zum ersten Team" />
        <div className="mt-8 grid gap-5 md:grid-cols-3">
          <Step n="01" color="border-t-white" numColor="text-white" title="Build your squad">
            {rules.budget_m} Mio. Fantasy Credits, {rules.squad.GK} Torwart, {rules.squad.FIELD} Feldspieler, {rules.squad.BENCH} Ersatz – {squadTotal} Spieler. Jeder hat einen Marktwert, maximal {rules.max_per_club} pro Team. Stell clever zusammen.
          </Step>
          <Step n="02" color="border-t-red" numColor="text-red" title="Earn points">
            Tore, Assists, Dribblings, Balleroberungen, Paraden: Echte Statistiken werden nach jedem Spieltag in Fantasy-Punkte umgerechnet. Dein Kapitän zählt {rules.captain_multiplier}-fach.
          </Step>
          <Step n="03" color="border-t-gold" numColor="text-gold" title="Climb the ranks">
            Jeder gegen jeden: Spieltagswertung, Gesamtwertung und deine persönlichen Rivalen direkt über und unter dir. {rules.transfers.free_per_round} freie Transfers pro Spieltag.
          </Step>
        </div>
      </section>

      {/* Prizes */}
      <section id="prizes" className="border-y border-border bg-[#0f0f11] py-20">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 lg:grid-cols-[1fr_1.2fr] lg:items-center">
          <div>
            <SectionHead eyebrow="Prizes" title="Echte Leistung. Echte Preise." />
            <p className="mt-4 max-w-md text-text-2">Für den Manager of the Matchday und den Fantasy Champion der Saison.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {(prizes?.length ? prizes : [
              { id: "a", title: "Manager of the Matchday", description: "Preis je Spieltag", round_id: "x" },
              { id: "b", title: "Top 3 der Saison", description: "Podium", round_id: null },
              { id: "c", title: "Fantasy Champion", description: "Hall of Fame", round_id: null },
            ]).map((p, i) => (
              <div key={p.id} className={`flex min-h-[170px] flex-col gap-2 rounded border bg-card p-5 ${i === 2 ? "border-gold" : "border-border"}`}>
                <Badge variant={p.round_id ? "muted" : "gold"} className="self-start">{p.round_id ? "Matchday" : "Saison"}</Badge>
                <div className="display mt-auto text-2xl">{p.title}</div>
                {p.description && <div className="text-sm text-muted">{p.description}</div>}
              </div>
            ))}
          </div>
        </div>
        {!prizes?.length && <p className="mx-auto mt-6 max-w-6xl px-4 text-xs text-muted-2">Die konkreten Preise werden vor dem Saisonstart bekannt gegeben.</p>}
      </section>

      {/* Leaderboard preview */}
      <section id="leaderboard" className="mx-auto w-full max-w-6xl px-4 py-20">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <SectionHead eyebrow={active ? `Leaderboard · ${active.competition.name} ${active.name}` : "Leaderboard"} title="Top 5 der Gesamtwertung" />
          {managerCount ? <span className="text-xs uppercase tracking-widest text-muted">{managerCount} Manager am Start</span> : null}
        </div>
        <div className="mt-8 overflow-hidden rounded border border-border bg-card">
          {top5?.length ? (
            top5.map((row) => (
              <div key={row.fantasy_team_id} className={`grid grid-cols-[48px_1fr_90px] items-center gap-4 border-t border-border px-5 py-3.5 first:border-t-0 ${row.rank === 1 ? "border-l-[6px] border-l-gold" : ""}`}>
                <span className={`num text-2xl ${row.rank === 1 ? "text-gold" : "text-text-2"}`}>{row.rank}</span>
                <div className="flex items-center gap-3">
                  <span className="num flex h-9 w-9 items-center justify-center bg-surface text-xs">{initials(row.username)}</span>
                  <div><div className="font-bold">{row.username}</div><div className="text-sm text-muted">{row.team_name}</div></div>
                </div>
                <span className="num text-right text-2xl">{formatPoints(row.total_points)}</span>
              </div>
            ))
          ) : (
            <div className="px-5 py-10 text-center text-muted">Die Rangliste füllt sich nach dem ersten Spieltag. Sei von Anfang an dabei.</div>
          )}
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative overflow-hidden py-28">
        <Image src="/brand/pitch-night.jpg" alt="" fill className="object-cover brightness-[.35]" sizes="100vw" />
        <div className="absolute inset-0 bg-gradient-to-b from-ground via-ground/50 to-ground" />
        <div className="relative mx-auto flex max-w-3xl flex-col items-center gap-6 px-4 text-center">
          <Eyebrow>Kostenlos · Keine App nötig <Stripe /></Eyebrow>
          <h2 className="display text-[56px] sm:text-[88px]">Jetzt kostenlos <span className="text-gold">mitspielen.</span></h2>
          <p className="max-w-md text-text-2">In drei bis fünf Minuten steht dein erstes Team. Die Rangliste wartet.</p>
          <Button asChild size="lg" className="h-14 px-10 text-xl"><Link href="/register"><span>Jetzt Team erstellen</span></Link></Button>
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-6 px-4 py-8">
          <div className="flex items-center gap-4"><span className="display text-xl">Kleinfeld Fantasy</span><span className="text-[11px] uppercase tracking-[0.12em] text-muted">Your team. Your game.</span></div>
          <Image src="/brand/dkfv-logo-white.png" alt="Deutscher Kleinfeld-Fußball-Verband" width={170} height={36} className="h-9 w-auto" />
          <div className="flex gap-5 text-sm text-muted">
            <Link href="/imprint" className="hover:text-text">Impressum</Link>
            <Link href="/privacy" className="hover:text-text">Datenschutz</Link>
            <Link href="/terms" className="hover:text-text">Teilnahmebedingungen</Link>
          </div>
        </div>
        <TricoloreBar />
      </footer>
    </div>
  );
}

function HeroStat({ value, label, gold, last }: { value: string; label: string; gold?: boolean; last?: boolean }) {
  return (
    <div className={`px-5 py-3 ${last ? "" : "border-r border-border"}`}>
      <div className={`num text-2xl ${gold ? "text-gold" : ""}`}>{value}</div>
      <div className="text-[11px] uppercase tracking-[0.12em] text-muted">{label}</div>
    </div>
  );
}

function SectionHead({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="relative pl-6 before:absolute before:left-0 before:top-1 before:bottom-1 before:w-1.5 before:tricolore before:[background:linear-gradient(180deg,#0a0a0b_0_33%,#e30613_33%_66%,#ffd400_66%)] before:border before:border-border">
      <div className="eyebrow">{eyebrow}</div>
      <h2 className="display mt-2 text-4xl sm:text-5xl lg:text-6xl">{title}</h2>
    </div>
  );
}

function Step({ n, title, color, numColor, children }: { n: string; title: string; color: string; numColor: string; children: React.ReactNode }) {
  return (
    <div className={`flex flex-col gap-3 rounded border border-border border-t-4 bg-card p-6 ${color}`}>
      <div className={`num text-5xl ${numColor}`}>{n}</div>
      <div className="display text-3xl">{title}</div>
      <p className="text-[15px] leading-relaxed text-muted">{children}</p>
    </div>
  );
}

function DemoCard({ className, name, pos, pts, value, captain }: { className?: string; name: string; pos: string; pts: string; value: string; captain?: boolean }) {
  return (
    <div className={`flex w-[196px] flex-col gap-2.5 rounded border border-border border-t-4 border-t-gold bg-card p-3 ${className ?? ""}`}>
      <div className="relative flex h-[150px] items-end justify-center overflow-hidden rounded-sm bg-ground">
        <svg width="116" height="135" viewBox="0 0 110 130" fill="none" aria-hidden><circle cx="55" cy="40" r="26" fill={captain ? "#3a3420" : "#26262b"} /><path d="M8 130c4-34 24-50 47-50s43 16 47 50" fill={captain ? "#3a3420" : "#26262b"} /></svg>
        <span aria-hidden className="absolute -right-8 top-0 h-full w-10 skew-x-[-18deg] bg-[linear-gradient(100deg,#e30613_0_50%,#ffd400_50%)] opacity-90" />
        {captain && <span className="num absolute left-2 top-2 flex h-7 w-7 items-center justify-center bg-gold text-gold-fg skew"><span>C</span></span>}
      </div>
      <div className="flex items-baseline justify-between"><span className="display-upright text-lg">{name}</span><span className="text-[11px] tracking-widest text-muted">{pos}</span></div>
      <div className="flex items-baseline justify-between"><span className="num text-3xl text-gold">{pts}<span className="text-xs text-muted"> PTS</span></span><span className="num text-[15px]">{value}</span></div>
    </div>
  );
}

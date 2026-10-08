import Link from "next/link";
import { ArrowRight, Clock, Trophy } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eyebrow } from "@/components/ui/tricolore";
import { RankCard } from "@/components/fantasy/rank-card";
import { Countdown } from "@/components/fantasy/countdown";
import { Pitch, type PitchPlayer } from "@/components/fantasy/pitch";
import { getAppContext } from "@/lib/data/context";
import { getMyRank } from "@/lib/data/season";
import { createClient } from "@/lib/supabase/server";
import { formatDateTime, formatPoints } from "@/lib/utils";
import { buildInsights } from "@/lib/insights";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const { profile, season, ctx, myTeam } = await getAppContext();

  if (!season || !ctx) {
    return (
      <EmptyState title="Noch kein Wettbewerb offen" text="Sobald der erste Wettbewerb startet, kannst du hier dein Team erstellen." />
    );
  }

  // Kein vollständiges Team → Onboarding-Einstieg
  if (!myTeam?.team.is_complete) {
    return (
      <div className="flex flex-col gap-6">
        <Eyebrow>{season.competition.name} · {season.name}</Eyebrow>
        <h1 className="display text-5xl sm:text-6xl">
          Willkommen, {profile.display_name ?? profile.username}.<br />
          <span className="text-gold">Bau dein Team.</span>
        </h1>
        <p className="max-w-lg text-text-2">
          {ctx.rules.budget_m} Mio. Budget, {ctx.rules.squad.GK} Torwart, {ctx.rules.squad.FIELD} Feldspieler, {ctx.rules.squad.BENCH} Ersatz, ein Kapitän. In drei bis fünf Minuten steht dein erstes Team.
        </p>
        {ctx.nextRound ? (
          <Card className="flex items-center gap-4 p-4">
            <Clock className="h-5 w-5 text-gold" />
            <div className="flex-1">
              <div className="font-bold">{ctx.nextRound.name} · Deadline</div>
              <div className="text-sm text-muted">{formatDateTime(ctx.nextRound.deadline_at)}</div>
            </div>
            <Countdown deadline={ctx.nextRound.deadline_at} className="num text-2xl" />
          </Card>
        ) : (
          <Card className="p-4 text-sm text-muted">Aktuell ist keine Spieltagsrunde offen. Du kannst dein Team vorbereiten, sobald der nächste Spieltag angelegt ist.</Card>
        )}
        <div>
          <Button asChild size="lg">
            <Link href="/app/team?onboarding=1">
              <span>{myTeam ? "Team vervollständigen" : "Jetzt Team erstellen"}</span>
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  const supabase = await createClient();
  const [rank, { data: lastScore }, { data: winner }, { data: history }] = await Promise.all([
    getMyRank(season.id),
    ctx.lastCompletedRound
      ? supabase.from("fantasy_team_scores").select("*").eq("fantasy_team_id", myTeam.team.id).eq("round_id", ctx.lastCompletedRound.id).maybeSingle()
      : Promise.resolve({ data: null }),
    ctx.lastCompletedRound
      ? supabase.from("round_winners").select("points, team:fantasy_teams(name, user:profiles(username))").eq("round_id", ctx.lastCompletedRound.id).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase.from("leaderboard_history").select("round_number, rank, total_points, round_points").eq("fantasy_team_id", myTeam.team.id).order("round_number"),
  ]);

  const captainId = myTeam.team.captain_season_player_id;
  const lastRoundPlayerPoints = new Map<string, number>();
  if (ctx.lastCompletedRound) {
    const { data: ps } = await supabase
      .from("fantasy_player_scores")
      .select("season_player_id, points")
      .eq("round_id", ctx.lastCompletedRound.id)
      .in("season_player_id", myTeam.roster.map((r) => r.season_player_id));
    for (const p of ps ?? []) lastRoundPlayerPoints.set(p.season_player_id, Number(p.points));
  }

  const pitchPlayers: PitchPlayer[] = myTeam.roster.map((r) => ({
    id: r.season_player_id,
    name: r.player.player.display_name,
    shortName: r.player.player.last_name,
    club: r.player.team.club.short_name,
    imageUrl: r.player.player.image_url,
    slot: r.slot,
    slotOrder: r.slot_order,
    points: ctx.lastCompletedRound ? (lastRoundPlayerPoints.get(r.season_player_id) ?? 0) : null,
    value: r.player.market_value_m,
    isCaptain: r.season_player_id === captainId,
    href: `/app/players/${r.season_player_id}`,
  }));

  const winnerTeam = winner?.team as unknown as { name: string; user: { username: string } } | null;
  const insights = buildInsights({
    rank,
    lastScore: lastScore ? { total: Number(lastScore.total_points), captainBonus: Number(lastScore.captain_bonus), penalty: Number(lastScore.transfer_penalty) } : null,
    history: (history ?? []).map((h) => ({ round: h.round_number, rank: h.rank, points: Number(h.round_points) })),
    captainName: myTeam.roster.find((r) => r.season_player_id === captainId)?.player.player.last_name ?? null,
    captainPoints: captainId ? lastRoundPlayerPoints.get(captainId) ?? null : null,
    cheapestBestValue: (() => {
      const starters = myTeam.roster.filter((r) => r.slot !== "BENCH");
      if (!starters.length) return null;
      const best = [...starters].sort((a, b) => b.player.stats.points_per_m - a.player.stats.points_per_m)[0];
      const cheapest = [...starters].sort((a, b) => a.player.market_value_m - b.player.market_value_m)[0];
      return best && cheapest && best.id === cheapest.id ? best.player.player.last_name : null;
    })(),
  });

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-end justify-between gap-3">
        <div>
          <Eyebrow>{season.competition.name} · {season.name}</Eyebrow>
          <h1 className="display mt-1 text-4xl">{myTeam.team.name}</h1>
        </div>
        <Link href="/app/leaderboard" className="hidden items-center gap-1 text-sm font-semibold text-gold hover:text-gold-hover sm:flex">
          Leaderboard <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.1fr_1fr]">
        <div className="flex flex-col gap-4">
          <RankCard rank={rank} roundLabel={ctx.lastCompletedRound ? `Stand: ${ctx.lastCompletedRound.name}` : null} />

          {ctx.nextRound ? (
            <Card className="flex items-center gap-4 px-4 py-3">
              <Clock className="h-5 w-5 shrink-0 text-gold" />
              <div className="min-w-0 flex-1">
                <div className="display-upright text-base">{ctx.nextRound.name} · Deadline</div>
                <div className="truncate text-xs text-muted">{formatDateTime(ctx.nextRound.deadline_at)} Uhr</div>
              </div>
              <Countdown deadline={ctx.nextRound.deadline_at} className="num text-2xl" />
            </Card>
          ) : (
            <Card className="px-4 py-3 text-sm text-muted">
              {ctx.rounds.some((r) => r.status === "locked" || r.status === "live" || r.status === "under_review")
                ? "Der Spieltag läuft – deine Aufstellung ist gesperrt. Punkte folgen nach der Auswertung."
                : "Aktuell ist keine Spieltagsrunde offen."}
            </Card>
          )}

          <div className="grid grid-cols-2 gap-4">
            <Card className="px-4 py-3">
              <div className="text-[10px] uppercase tracking-[0.14em] text-muted">{ctx.lastCompletedRound?.name ?? "Letzter Spieltag"}</div>
              <div className="num mt-1 text-4xl">
                {lastScore ? formatPoints(lastScore.total_points) : "–"} <span className="text-xs text-muted">PTS</span>
              </div>
              {lastScore && Number(lastScore.transfer_penalty) > 0 && <div className="mt-1 text-xs text-red">inkl. −{formatPoints(lastScore.transfer_penalty)} Transferabzug</div>}
              {lastScore && insights.isBestRound && <div className="mt-1 text-xs font-bold text-positive">Beste Leistung</div>}
            </Card>
            <Card accent="red" className="px-4 py-3">
              <div className="eyebrow text-[10px]">Insight</div>
              <p className="mt-1 text-[13px] leading-snug text-text">{insights.primary}</p>
            </Card>
          </div>

          {winnerTeam && ctx.lastCompletedRound && (
            <Card className="flex items-center gap-4 border-gold/60 px-4 py-3">
              <Trophy className="h-5 w-5 shrink-0 text-gold" />
              <div className="min-w-0 flex-1">
                <div className="eyebrow text-[10px]">Manager of the Matchday · {ctx.lastCompletedRound.name}</div>
                <div className="truncate font-bold">{winnerTeam.user.username} <span className="font-normal text-muted">· {winnerTeam.name}</span></div>
              </div>
              <div className="num text-2xl text-gold">{formatPoints(winner?.points)}</div>
            </Card>
          )}
        </div>

        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Mein Team</CardTitle>
              <Link href="/app/team" className="text-xs font-bold uppercase tracking-wide text-gold hover:text-gold-hover">
                Bearbeiten →
              </Link>
            </CardHeader>
            <CardContent>
              <Pitch players={pitchPlayers} compact pointsLabel={ctx.lastCompletedRound ? "PTS" : ""} emptySlots={ctx.rules.squad} />
              <div className="mt-3 flex items-center justify-between text-xs text-muted">
                <span>{ctx.lastCompletedRound ? `Punkte: ${ctx.lastCompletedRound.name}` : "Noch keine gewerteten Spieltage"}</span>
                {myTeam.transfersThisRound.length > 0 && <Badge variant="outline">{myTeam.transfersThisRound.length} Transfer{myTeam.transfersThisRound.length > 1 ? "s" : ""} offen</Badge>}
              </div>
            </CardContent>
          </Card>

          {history && history.length > 1 && (
            <Card>
              <CardHeader><CardTitle>Ranking-Verlauf</CardTitle><span className="text-xs text-muted">Beste Platzierung: #{Math.min(...history.map((h) => h.rank))}</span></CardHeader>
              <CardContent>
                <RankSparkline data={history.map((h) => ({ round: h.round_number, rank: h.rank }))} />
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <div className="flex flex-col items-start gap-4 py-10">
      <h1 className="display text-5xl">{title}</h1>
      <p className="max-w-md text-text-2">{text}</p>
    </div>
  );
}

/** Kleines SVG-Liniendiagramm: Rang je Spieltag (niedriger = besser, Achse invertiert) */
function RankSparkline({ data }: { data: { round: number; rank: number }[] }) {
  const w = 600, h = 160, pad = 28;
  const maxRank = Math.max(...data.map((d) => d.rank));
  const minRank = Math.min(...data.map((d) => d.rank));
  const span = Math.max(1, maxRank - minRank);
  const x = (i: number) => pad + (i * (w - pad * 2)) / Math.max(1, data.length - 1);
  const y = (r: number) => pad + ((r - minRank) / span) * (h - pad * 2);
  const path = data.map((d, i) => `${i === 0 ? "M" : "L"}${x(i)},${y(d.rank)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-40 w-full" role="img" aria-label={`Ranglistenverlauf über ${data.length} Spieltage`}>
      <line x1={pad} x2={w - pad} y1={h - pad} y2={h - pad} stroke="var(--kf-border)" />
      <path d={path} fill="none" stroke="var(--kf-gold)" strokeWidth={3} strokeLinejoin="round" strokeLinecap="round" />
      {data.map((d, i) => (
        <g key={d.round}>
          <circle cx={x(i)} cy={y(d.rank)} r={5} fill="var(--kf-ground)" stroke="var(--kf-gold)" strokeWidth={3} />
          <text x={x(i)} y={y(d.rank) - 12} textAnchor="middle" fill="var(--kf-text)" fontSize={13} fontWeight={700}>#{d.rank}</text>
          <text x={x(i)} y={h - 8} textAnchor="middle" fill="var(--kf-muted)" fontSize={11}>MD {d.round}</text>
        </g>
      ))}
    </svg>
  );
}

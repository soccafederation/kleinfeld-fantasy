import Link from "next/link";
import { Eyebrow } from "@/components/ui/tricolore";
import { Card } from "@/components/ui/card";
import { Delta } from "@/components/ui/badge";
import { getAppContext } from "@/lib/data/context";
import { getMyRank } from "@/lib/data/season";
import { createClient } from "@/lib/supabase/server";
import { cn, formatPoints, initials } from "@/lib/utils";
import { LeaderboardTabs } from "./tabs";
import { JumpToMyRank } from "./jump";

export const metadata = { title: "Leaderboard" };

const PAGE = 50;

type SP = { view?: string; round?: string; page?: string; from?: string };

export default async function LeaderboardPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const { season, ctx, myTeam } = await getAppContext();
  if (!season || !ctx) return <p className="text-muted">Kein Wettbewerb aktiv.</p>;

  const view = sp.view === "matchday" ? "matchday" : sp.view === "leagues" ? "leagues" : "overall";
  const completedRounds = ctx.rounds.filter((r) => r.status === "completed");
  const supabase = await createClient();
  const rank = await getMyRank(season.id);

  // Seite bestimmen: ?from=<rank> (Jump to My Rank) oder ?page=n
  const total = rank.total_managers ?? (await supabase.from("leaderboard_overall").select("rank", { count: "exact", head: true }).eq("season_id", season.id)).count ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE));
  let page = Math.min(pages, Math.max(1, parseInt(sp.page ?? "1", 10) || 1));
  if (sp.from) {
    const fromRank = parseInt(sp.from, 10);
    if (fromRank > 0) page = Math.min(pages, Math.floor((fromRank - 1) / PAGE) + 1);
  }
  const from = (page - 1) * PAGE + 1;
  const to = page * PAGE;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Eyebrow>{season.competition.name} · {season.name}</Eyebrow>
        <h1 className="display mt-1 text-4xl sm:text-5xl">Leaderboard</h1>
      </div>

      <LeaderboardTabs view={view} />

      {view === "overall" && (
        <>
          {rank.rank != null && (
            <Card accent="gold" className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="flex items-center gap-4">
                <div className="num text-4xl">#{rank.rank}</div>
                <div>
                  <div className="eyebrow text-[10px]">Your Rank · of {rank.total_managers}</div>
                  <div className="text-sm text-text-2">
                    <span className="num text-base text-text">{formatPoints(rank.total_points)}</span> PTS · <Delta value={rank.rank_delta} />
                  </div>
                </div>
              </div>
              <JumpToMyRank rank={rank.rank} />
            </Card>
          )}

          {rank.rank != null && rank.rank > 3 && <Rivals seasonId={season.id} myRank={rank.rank} />}

          <OverallTable seasonId={season.id} from={from} to={to} highlightTeam={myTeam?.team.id} />
          <Pagination page={page} pages={pages} view="overall" />
        </>
      )}

      {view === "matchday" && (
        <MatchdayView
          rounds={completedRounds}
          roundId={sp.round ?? completedRounds[completedRounds.length - 1]?.id}
          myTeamId={myTeam?.team.id}
          page={page}
        />
      )}

      {view === "leagues" && <LeaguesView seasonId={season.id} />}
    </div>
  );
}

async function OverallTable({ seasonId, from, to, highlightTeam }: { seasonId: string; from: number; to: number; highlightTeam?: string }) {
  const supabase = await createClient();
  const { data } = await supabase.rpc("leaderboard_window", { p_season_id: seasonId, p_from: from, p_to: to });
  if (!data?.length) return <Participants seasonId={seasonId} highlightTeam={highlightTeam} />;
  return (
    <Card className="overflow-hidden">
      <div className="grid grid-cols-[44px_1fr_64px_76px] items-center gap-2 bg-[#0f0f11] px-3 py-2 text-[10px] uppercase tracking-[0.14em] text-muted sm:grid-cols-[56px_1fr_90px_90px_100px]">
        <span>Rang</span><span>Manager · Team</span><span className="hidden text-right sm:block">Δ</span><span className="text-right">Letzter</span><span className="text-right">Gesamt</span>
      </div>
      {data.map((row) => (
        <div
          key={row.fantasy_team_id}
          id={`rank-${row.rank}`}
          className={cn(
            "grid grid-cols-[44px_1fr_64px_76px] items-center gap-2 border-t border-border px-3 py-2.5 sm:grid-cols-[56px_1fr_90px_90px_100px]",
            row.is_me && "border-l-[6px] border-l-gold bg-gold/10",
            !row.is_me && row.rank === 1 && "border-l-[6px] border-l-gold",
            !row.is_me && row.rank === 2 && "border-l-[6px] border-l-text-2",
            !row.is_me && row.rank === 3 && "border-l-[6px] border-l-[#b07a3a]",
            !row.is_me && row.rank > 3 && "border-l-[6px] border-l-transparent",
            row.fantasy_team_id === highlightTeam && "scroll-mt-24",
          )}
        >
          <span className={cn("num text-xl", row.rank === 1 ? "text-gold" : row.rank <= 3 ? "text-text-2" : "text-muted")}>{row.rank}</span>
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="num hidden h-8 w-8 shrink-0 items-center justify-center bg-surface text-[11px] sm:flex">{initials(row.username)}</span>
            <Link href={`/app/managers/${row.fantasy_team_id}`} className="min-w-0 hover:text-gold">
              <div className="truncate text-sm font-bold">{row.is_me ? "Du" : row.username}</div>
              <div className="truncate text-xs text-muted">{row.team_name}</div>
            </Link>
          </div>
          <span className="hidden text-right sm:block"><Delta value={row.rank_delta} /></span>
          <span className="num text-right text-base text-text-2">{formatPoints(row.last_round_points)}</span>
          <span className="num text-right text-xl">{formatPoints(row.total_points)}</span>
        </div>
      ))}
    </Card>
  );
}

async function Rivals({ seasonId, myRank }: { seasonId: string; myRank: number }) {
  const supabase = await createClient();
  const { data } = await supabase.rpc("leaderboard_window", { p_season_id: seasonId, p_from: Math.max(1, myRank - 2), p_to: myRank + 2 });
  if (!data || data.length < 2) return null;
  return (
    <Card className="overflow-hidden">
      <div className="px-3 pt-3"><span className="eyebrow">Deine Rivalen</span></div>
      <div className="mt-2">
        {data.map((row) => (
          <div key={row.fantasy_team_id} className={cn("flex items-center gap-3 border-t border-border px-3 py-2 text-sm", row.is_me && "bg-gold/10 font-bold")}>
            <span className="num w-10 text-base">{row.rank}</span>
            <Link href={`/app/managers/${row.fantasy_team_id}`} className="flex-1 truncate hover:text-gold">{row.is_me ? "Du" : row.username}</Link>
            <span className="num text-base">{formatPoints(row.total_points)}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

async function MatchdayView({ rounds, roundId, myTeamId, page }: { rounds: { id: string; number: number; name: string }[]; roundId?: string; myTeamId?: string; page: number }) {
  if (!rounds.length) return <Card className="px-4 py-10 text-center text-muted">Noch kein Spieltag gewertet.</Card>;
  const round = rounds.find((r) => r.id === roundId) ?? rounds[rounds.length - 1];
  const supabase = await createClient();
  const from = (page - 1) * PAGE + 1;
  const [{ data }, { data: winner }, { count }] = await Promise.all([
    supabase.rpc("round_leaderboard_window", { p_round_id: round.id, p_from: from, p_to: page * PAGE }),
    supabase.from("round_winners").select("points, team:fantasy_teams(name, user:profiles(username))").eq("round_id", round.id).maybeSingle(),
    supabase.from("leaderboard_round").select("rank", { count: "exact", head: true }).eq("round_id", round.id),
  ]);
  const w = winner?.team as unknown as { name: string; user: { username: string } } | null;
  const pages = Math.max(1, Math.ceil((count ?? 0) / PAGE));
  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2 overflow-x-auto pb-1">
        {rounds.map((r) => (
          <Link
            key={r.id}
            href={`/app/leaderboard?view=matchday&round=${r.id}`}
            className={cn("num shrink-0 border px-3 py-1.5 text-sm", r.id === round.id ? "border-gold bg-gold text-gold-fg" : "border-border-strong text-text-2 hover:text-text")}
          >
            MD {String(r.number).padStart(2, "0")}
          </Link>
        ))}
      </div>
      {w && (
        <Card accent="gold" className="flex items-center gap-4 px-4 py-3">
          <div className="min-w-0 flex-1">
            <div className="eyebrow text-[10px]">Manager of the Matchday · {round.name}</div>
            <div className="truncate text-lg font-bold">{w.user.username} <span className="font-normal text-muted">· {w.name}</span></div>
          </div>
          <div className="num text-3xl text-gold">{formatPoints(winner?.points)}</div>
        </Card>
      )}
      <Card className="overflow-hidden">
        {(data ?? []).map((row) => (
          <div key={row.fantasy_team_id} className={cn("grid grid-cols-[44px_1fr_80px] items-center gap-2 border-t border-border px-3 py-2.5 first:border-t-0", row.is_me && "border-l-[6px] border-l-gold bg-gold/10", row.fantasy_team_id === myTeamId && "font-bold")}>
            <span className={cn("num text-xl", row.rank === 1 ? "text-gold" : "text-muted")}>{row.rank}</span>
            <Link href={`/app/managers/${row.fantasy_team_id}?round=${round?.number ?? ""}`} className="min-w-0 hover:text-gold"><div className="truncate text-sm font-bold">{row.is_me ? "Du" : row.username}</div><div className="truncate text-xs text-muted">{row.team_name}</div></Link>
            <span className="num text-right text-xl">{formatPoints(row.points)}</span>
          </div>
        ))}
        {!data?.length && <div className="px-4 py-8 text-center text-muted">Keine Einträge.</div>}
      </Card>
      <Pagination page={page} pages={pages} view="matchday" extra={`&round=${round.id}`} />
    </div>
  );
}

async function LeaguesView({ seasonId }: { seasonId: string }) {
  const supabase = await createClient();
  const { data: leagues } = await supabase.from("fantasy_leagues").select("id, name, invite_code").eq("season_id", seasonId).order("created_at");
  if (!leagues?.length) {
    return (
      <Card className="flex flex-col items-start gap-3 px-4 py-8">
        <div className="display text-2xl">Noch keine private Liga</div>
        <p className="text-sm text-muted">Spiel mit Freunden in einer eigenen Rangliste – dein Team bleibt dasselbe.</p>
        <Link href="/app/leagues" className="text-sm font-bold uppercase tracking-wide text-gold">Liga erstellen oder beitreten →</Link>
      </Card>
    );
  }
  const tables = await Promise.all(leagues.map(async (l) => ({ league: l, rows: (await supabase.rpc("league_table", { p_league_id: l.id })).data ?? [] })));
  return (
    <div className="flex flex-col gap-4">
      {tables.map(({ league, rows }) => (
        <Card key={league.id} className="overflow-hidden">
          <div className="flex items-center justify-between px-3 pt-3">
            <span className="display-upright text-lg">{league.name}</span>
            <Link href={`/app/leagues/${league.id}`} className="text-xs font-bold uppercase tracking-wide text-gold">Details →</Link>
          </div>
          <div className="mt-2">
            {rows.map((row) => (
              <div key={row.fantasy_team_id} className={cn("flex items-center gap-3 border-t border-border px-3 py-2 text-sm", row.is_me && "bg-gold/10 font-bold")}>
                <span className="num w-8 text-base">{row.rank}</span>
                <Link href={`/app/managers/${row.fantasy_team_id}`} className="flex-1 truncate hover:text-gold">{row.is_me ? "Du" : row.username} <span className="text-muted">· {row.team_name}</span></Link>
                <span className="num text-base">{formatPoints(row.total_points)}</span>
              </div>
            ))}
          </div>
        </Card>
      ))}
      <Link href="/app/leagues" className="text-sm font-bold uppercase tracking-wide text-gold">Ligen verwalten →</Link>
    </div>
  );
}

function Pagination({ page, pages, view, extra = "" }: { page: number; pages: number; view: string; extra?: string }) {
  if (pages <= 1) return null;
  return (
    <div className="flex items-center justify-between text-sm">
      <Link aria-disabled={page <= 1} className={cn("font-bold uppercase tracking-wide", page <= 1 ? "pointer-events-none text-muted-2" : "text-gold")} href={`/app/leaderboard?view=${view}&page=${page - 1}${extra}`}>← Zurück</Link>
      <span className="text-muted">Seite {page} von {pages}</span>
      <Link aria-disabled={page >= pages} className={cn("font-bold uppercase tracking-wide", page >= pages ? "pointer-events-none text-muted-2" : "text-gold")} href={`/app/leaderboard?view=${view}&page=${page + 1}${extra}`}>Weiter →</Link>
    </div>
  );
}

/** Vor dem ersten gewerteten Spieltag: wer spielt mit? (Teamnamen öffentlich, Kader bleiben privat) */
async function Participants({ seasonId, highlightTeam }: { seasonId: string; highlightTeam?: string }) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("fantasy_teams")
    .select("id, name, is_complete, created_at, profile:profiles(username)")
    .eq("season_id", seasonId)
    .order("is_complete", { ascending: false })
    .order("created_at", { ascending: true });
  const teams = (data ?? []) as unknown as Array<{ id: string; name: string; is_complete: boolean; profile: { username: string } | null }>;
  const ready = teams.filter((t) => t.is_complete).length;
  if (!teams.length) return <Card className="px-4 py-10 text-center text-muted">Noch kein Team angelegt – sei der Erste.</Card>;
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-text-2">
        <span className="num text-text">{teams.length}</span> Teilnehmer · <span className="num text-text">{ready}</span> mit fertigem Team. Punkte und Platzierungen gibt es nach dem ersten Spieltag – die Kader bleiben bis zur Deadline geheim.
      </p>
      <Card className="overflow-hidden">
        <div className="grid grid-cols-[44px_1fr_auto] items-center gap-2 bg-surface px-3 py-2 text-[10px] uppercase tracking-[0.14em] text-muted sm:grid-cols-[56px_1fr_auto]">
          <span>#</span><span>Manager · Team</span><span className="text-right">Status</span>
        </div>
        {teams.map((t, i) => {
          const me = t.id === highlightTeam;
          return (
            <div
              key={t.id}
              className={cn(
                "grid grid-cols-[44px_1fr_auto] items-center gap-2 border-t border-border border-l-[6px] px-3 py-2.5 sm:grid-cols-[56px_1fr_auto]",
                me ? "border-l-gold bg-gold/10" : "border-l-transparent",
              )}
            >
              <span className="num text-xl text-muted">{i + 1}</span>
              <div className="flex min-w-0 items-center gap-2.5">
                <span className="num hidden h-8 w-8 shrink-0 items-center justify-center bg-surface text-[11px] sm:flex">{initials(t.profile?.username ?? "?")}</span>
                <Link href={`/app/managers/${t.id}`} className="min-w-0 hover:text-gold">
                  <div className="truncate text-sm font-bold">{me ? "Du" : (t.profile?.username ?? "–")}</div>
                  <div className="truncate text-xs text-muted">{t.name}</div>
                </Link>
              </div>
              <span className={cn("text-right text-[11px] font-semibold uppercase tracking-wider", t.is_complete ? "text-positive" : "text-muted")}>
                {t.is_complete ? "Team steht" : "Baut noch"}
              </span>
            </div>
          );
        })}
      </Card>
    </div>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Lock } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getAppContext } from "@/lib/data/context";
import { getSeasonPlayers } from "@/lib/data/season";
import { Pitch, type PitchPlayer } from "@/components/fantasy/pitch";
import { Card } from "@/components/ui/card";
import { Eyebrow } from "@/components/ui/tricolore";
import { cn, formatPoints } from "@/lib/utils";

export const metadata = { title: "Team ansehen" };

/**
 * Aufstellung eines anderen Managers. Sichtbar sind nur eingefrorene Aufstellungen
 * (Spieltage nach der Deadline) – das stellt auch die Datenbank sicher (RLS auf fantasy_lineups).
 */
export default async function ManagerTeamPage({ params, searchParams }: { params: Promise<{ teamId: string }>; searchParams: Promise<{ round?: string }> }) {
  const [{ teamId }, sp] = await Promise.all([params, searchParams]);
  const { season, myTeam } = await getAppContext();
  if (!season) notFound();
  const supabase = await createClient();

  const [{ data: team }, { data: lineups }, players] = await Promise.all([
    supabase.from("fantasy_teams").select("id, name, season_id, profile:profiles(username)").eq("id", teamId).maybeSingle(),
    supabase
      .from("fantasy_lineups")
      .select("id, captain_season_player_id, round:fantasy_rounds!inner(id, number, name, status)")
      .eq("fantasy_team_id", teamId)
      .neq("round.status", "upcoming"),
    getSeasonPlayers(season.id),
  ]);
  if (!team || team.season_id !== season.id) notFound();
  const username = (team.profile as unknown as { username: string } | null)?.username ?? "–";
  const isMe = myTeam?.team.id === team.id;

  type L = { id: string; captain_season_player_id: string | null; round: { id: string; number: number; name: string; status: string } };
  const list = ((lineups ?? []) as unknown as L[]).sort((a, b) => b.round.number - a.round.number);
  const showTotal = sp.round === "gesamt";
  const selected = showTotal ? list[0] : (list.find((l) => String(l.round.number) === sp.round) ?? list[0]);

  const header = (
    <div>
      <Link href="/app/leaderboard" className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wider text-muted hover:text-gold">
        <ArrowLeft className="h-3.5 w-3.5" /> Ranking
      </Link>
      <Eyebrow className="mt-3">{isMe ? "Dein Team" : username}</Eyebrow>
      <h1 className="display mt-1 text-4xl sm:text-5xl">{team.name}</h1>
    </div>
  );

  if (!selected) {
    return (
      <div className="flex flex-col gap-4">
        {header}
        <Card className="flex items-center gap-3 px-4 py-8 text-sm text-muted">
          <Lock className="h-5 w-5 shrink-0" />
          Die Aufstellung wird sichtbar, sobald die Deadline des ersten Spieltags vorbei ist.
        </Card>
      </div>
    );
  }

  // Alle eingefrorenen Aufstellungen dieses Teams mit Spielern, Spielerpunkten und Teampunkten
  const lineupIds = list.map((l) => l.id);
  const roundIds = list.map((l) => l.round.id);
  const [{ data: allLps }, { data: allScores }] = await Promise.all([
    supabase.from("fantasy_lineup_players").select("lineup_id, season_player_id, slot, slot_order").in("lineup_id", lineupIds),
    supabase.from("fantasy_team_scores").select("round_id, total_points, transfer_penalty, auto_subs").eq("fantasy_team_id", team.id).in("round_id", roundIds),
  ]);
  const playerIds = [...new Set((allLps ?? []).map((l) => l.season_player_id))];
  const { data: pscores } = playerIds.length
    ? await supabase.from("fantasy_player_scores").select("round_id, season_player_id, points").in("round_id", roundIds).in("season_player_id", playerIds)
    : { data: [] as { round_id: string; season_player_id: string; points: number }[] };
  const pts = new Map((pscores ?? []).map((p) => [`${p.round_id}:${p.season_player_id}`, Number(p.points)]));
  const roundsWithStats = new Set((pscores ?? []).map((p) => p.round_id));
  const scoreByRound = new Map((allScores ?? []).map((s) => [s.round_id, s]));
  const byId = new Map(players.map((p) => [p.id, p]));

  type Sub = { in: string; out: string };
  /** Punkte, die ein Spieler in diesem Spieltag für das Team geholt hat (Kapitän doppelt, Bank nur als Nachrücker). */
  const contribution = (l: L, playerId: string, slot: string) => {
    const s = scoreByRound.get(l.round.id);
    const subs = ((s?.auto_subs ?? []) as Sub[]);
    const counted = slot === "BENCH" ? subs.some((x) => x.in === playerId) : !subs.some((x) => x.out === playerId);
    const raw = pts.get(`${l.round.id}:${playerId}`) ?? 0;
    return { raw: raw * (l.captain_season_player_id === playerId && slot !== "BENCH" ? 2 : 1), counted };
  };

  const lpsOf = (lineupId: string) => (allLps ?? []).filter((x) => x.lineup_id === lineupId);
  const toPitch = (l: { season_player_id: string; slot: string; slot_order: number }, points: number | null, counted: boolean, isCap: boolean): PitchPlayer[] => {
    const p = byId.get(l.season_player_id);
    if (!p) return [];
    return [
      {
        id: p.id,
        name: p.player.display_name,
        shortName: p.player.last_name || p.player.display_name,
        club: p.team.club.short_name,
        imageUrl: p.player.image_url,
        slot: l.slot as PitchPlayer["slot"],
        slotOrder: l.slot_order,
        points,
        isCaptain: isCap,
        counted,
        href: `/app/players/${p.id}`,
      },
    ];
  };

  // Gesamt: aktuelle Aufstellung, je Spieler alle Punkte, die er für dieses Team geholt hat
  const seasonTotal = (allScores ?? []).reduce((sum, s) => sum + Number(s.total_points), 0);
  const seasonPenalty = (allScores ?? []).reduce((sum, s) => sum + Number(s.transfer_penalty), 0);
  const totalByPlayer = new Map<string, number>();
  for (const l of list) {
    if (!scoreByRound.has(l.round.id)) continue;
    for (const lp of lpsOf(l.id)) {
      const c = contribution(l, lp.season_player_id, lp.slot);
      if (c.counted) totalByPlayer.set(lp.season_player_id, (totalByPlayer.get(lp.season_player_id) ?? 0) + c.raw);
    }
  }
  const currentIds = new Set(lpsOf(selected.id).map((x) => x.season_player_id));
  const formerPlayers = [...totalByPlayer.entries()]
    .filter(([id, v]) => !currentIds.has(id) && v !== 0)
    .map(([id, v]) => ({ id, name: byId.get(id)?.player.display_name ?? "?", points: v }))
    .sort((a, b) => b.points - a.points);

  const score = scoreByRound.get(selected.round.id);
  const hasStats = roundsWithStats.has(selected.round.id);
  const pitch: PitchPlayer[] = showTotal
    ? lpsOf(selected.id).flatMap((l) => toPitch(l, totalByPlayer.get(l.season_player_id) ?? 0, true, false))
    : lpsOf(selected.id).flatMap((l) => {
        const c = contribution(selected, l.season_player_id, l.slot);
        return toPitch(l, hasStats ? c.raw : null, c.counted, selected.captain_season_player_id === l.season_player_id);
      });

  const tabCls = (active: boolean) =>
    cn(
      "rounded-sm border px-3 py-1.5 text-xs font-semibold uppercase tracking-wider",
      active ? "border-gold bg-gold text-gold-fg" : "border-border text-text-2 hover:text-text",
    );

  return (
    <div className="flex flex-col gap-4">
      {header}

      <div className="flex flex-wrap gap-2">
        {list
          .slice()
          .reverse()
          .map((l) => (
            <Link key={l.id} href={`/app/managers/${team.id}?round=${l.round.number}`} className={tabCls(!showTotal && l.id === selected.id)}>
              Spieltag {l.round.number}
            </Link>
          ))}
        <Link href={`/app/managers/${team.id}?round=gesamt`} className={tabCls(showTotal)}>
          Gesamt
        </Link>
      </div>

      <Card className="flex items-center justify-between gap-4 px-4 py-3">
        <div>
          <div className="eyebrow text-[10px] text-muted">{showTotal ? "Saison gesamt" : selected.round.name}</div>
          <div className="text-sm text-text-2">
            {showTotal
              ? "Punkte, die jeder Spieler für dieses Team geholt hat"
              : score
                ? "Punkte inkl. Kapitänsbonus"
                : "Aufstellung eingefroren, Punkte folgen nach der Auswertung"}
          </div>
        </div>
        {showTotal ? (
          <div className="text-right">
            <div className="num text-3xl text-gold">{formatPoints(seasonTotal)}</div>
            {seasonPenalty > 0 && <div className="text-xs text-red">inkl. −{formatPoints(seasonPenalty)} Transfers</div>}
          </div>
        ) : (
          score && (
            <div className="text-right">
              <div className="num text-3xl text-gold">{formatPoints(Number(score.total_points))}</div>
              {Number(score.transfer_penalty) > 0 && <div className="text-xs text-red">−{formatPoints(Number(score.transfer_penalty))} Transfers</div>}
            </div>
          )
        )}
      </Card>

      <Pitch players={pitch} pointsLabel="PTS" />
      {showTotal && formerPlayers.length > 0 && (
        <Card className="px-4 py-3">
          <div className="eyebrow mb-2 text-[10px] text-muted">Nicht mehr im Team</div>
          <div className="flex flex-col gap-1 text-sm">
            {formerPlayers.map((f) => (
              <div key={f.id} className="flex justify-between">
                <Link href={`/app/players/${f.id}`} className="text-text-2 hover:text-gold">{f.name}</Link>
                <span className="num text-gold">{formatPoints(f.points)}</span>
              </div>
            ))}
          </div>
        </Card>
      )}
      {!showTotal && hasStats && (
        <p className="text-xs text-muted">Gewertet werden nur die 5 Startspieler. Ein Bankspieler zählt nur, wenn er für einen Starter ohne Einsatz nachrückt. Durchgestrichene Punkte zählen nicht. Kapitänspunkte zählen doppelt.</p>
      )}
      {showTotal && <p className="text-xs text-muted">Aufstellung vom letzten Spieltag. Kapitänspunkte sind doppelt eingerechnet, Bankpunkte nur bei Nachrücken.</p>}
    </div>
  );
}

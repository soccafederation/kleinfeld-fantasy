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
  const selected = list.find((l) => String(l.round.number) === sp.round) ?? list[0];

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

  const [{ data: lps }, { data: score }] = await Promise.all([
    supabase.from("fantasy_lineup_players").select("season_player_id, slot, slot_order").eq("lineup_id", selected.id),
    supabase.from("fantasy_team_scores").select("base_points, captain_bonus, transfer_penalty, total_points, auto_subs").eq("fantasy_team_id", team.id).eq("round_id", selected.round.id).maybeSingle(),
  ]);
  const ids = (lps ?? []).map((l) => l.season_player_id);
  const { data: pscores } = ids.length
    ? await supabase.from("fantasy_player_scores").select("season_player_id, points").eq("round_id", selected.round.id).in("season_player_id", ids)
    : { data: [] as { season_player_id: string; points: number }[] };
  const pts = new Map((pscores ?? []).map((p) => [p.season_player_id, Number(p.points)]));
  const byId = new Map(players.map((p) => [p.id, p]));
  const scored = !!score;
  const subs = ((score?.auto_subs ?? []) as { in: string; out: string }[]);
  const subIn = new Set(subs.map((x) => x.in));
  const subOut = new Set(subs.map((x) => x.out));

  const pitch: PitchPlayer[] = (lps ?? []).flatMap((l) => {
    const p = byId.get(l.season_player_id);
    if (!p) return [];
    const isCap = selected.captain_season_player_id === p.id;
    const raw = pts.get(p.id);
    return [
      {
        id: p.id,
        name: p.player.display_name,
        shortName: p.player.last_name || p.player.display_name,
        club: p.team.club.short_name,
        imageUrl: p.player.image_url,
        slot: l.slot as PitchPlayer["slot"],
        slotOrder: l.slot_order,
        points: scored ? (raw ?? 0) * (isCap && l.slot !== "BENCH" ? 2 : 1) : null,
        value: p.market_value_m,
        isCaptain: isCap,
        counted: l.slot === "BENCH" ? subIn.has(p.id) : !subOut.has(p.id),
        href: `/app/players/${p.id}`,
      },
    ];
  });

  return (
    <div className="flex flex-col gap-4">
      {header}

      {list.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {list
            .slice()
            .reverse()
            .map((l) => (
              <Link
                key={l.id}
                href={`/app/managers/${team.id}?round=${l.round.number}`}
                className={cn(
                  "rounded-sm border px-3 py-1.5 text-xs font-semibold uppercase tracking-wider",
                  l.id === selected.id ? "border-gold bg-gold text-gold-fg" : "border-border text-text-2 hover:text-text",
                )}
              >
                Spieltag {l.round.number}
              </Link>
            ))}
        </div>
      )}

      <Card className="flex items-center justify-between gap-4 px-4 py-3">
        <div>
          <div className="eyebrow text-[10px] text-muted">{selected.round.name}</div>
          <div className="text-sm text-text-2">{scored ? "Punkte inkl. Kapitänsbonus" : "Aufstellung eingefroren, Punkte folgen nach der Auswertung"}</div>
        </div>
        {scored && (
          <div className="text-right">
            <div className="num text-3xl text-gold">{formatPoints(Number(score!.total_points))}</div>
            {Number(score!.transfer_penalty) > 0 && <div className="text-xs text-red">−{formatPoints(Number(score!.transfer_penalty))} Transfers</div>}
          </div>
        )}
      </Card>

      <Pitch players={pitch} pointsLabel="PTS" />
      {scored && <p className="text-xs text-muted">Gewertet werden nur die 5 Startspieler. Ein Bankspieler zählt nur, wenn er für einen Starter ohne Einsatz nachrückt. Durchgestrichene Punkte zählen nicht. Kapitänspunkte zählen doppelt.</p>}
    </div>
  );
}

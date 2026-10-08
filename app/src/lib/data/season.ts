import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { parseBranding, parseSeasonRules, type SeasonRules } from "@/lib/rules";
import type { Tables } from "@/lib/database.types";

export type Season = Tables<"seasons"> & { competition: Tables<"competitions"> };
export type Round = Tables<"fantasy_rounds">;

export type SeasonContext = {
  season: Season;
  rules: SeasonRules;
  branding: ReturnType<typeof parseBranding>;
  rounds: Round[];
  nextRound: Round | null; // nächste offene Round (Deadline in der Zukunft)
  lastCompletedRound: Round | null;
};

/** Alle sichtbaren Seasons (offen/live/abgeschlossen) mit Wettbewerb. */
export const listSeasons = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("seasons")
    .select("*, competition:competitions(*)")
    .in("status", ["open", "live", "completed"])
    .order("created_at", { ascending: false });
  return (data ?? []) as Season[];
});

/** Aktive Season des Nutzers (Profil) oder die erste offene. */
export const resolveActiveSeason = cache(async (preferredSeasonId: string | null) => {
  const seasons = await listSeasons();
  if (!seasons.length) return null;
  return seasons.find((s) => s.id === preferredSeasonId) ?? seasons.find((s) => s.status === "open" || s.status === "live") ?? seasons[0];
});

export const getSeasonContext = cache(async (seasonId: string): Promise<SeasonContext | null> => {
  const supabase = await createClient();
  const [{ data: season }, { data: rounds }] = await Promise.all([
    supabase.from("seasons").select("*, competition:competitions(*)").eq("id", seasonId).maybeSingle(),
    supabase.from("fantasy_rounds").select("*").eq("season_id", seasonId).order("number"),
  ]);
  if (!season) return null;
  const now = Date.now();
  const list = (rounds ?? []) as Round[];
  const nextRound = list.find((r) => r.status === "upcoming" && new Date(r.deadline_at).getTime() > now) ?? null;
  const completed = list.filter((r) => r.status === "completed");
  return {
    season: season as Season,
    rules: parseSeasonRules(season.rules),
    branding: parseBranding(season.branding),
    rounds: list,
    nextRound,
    lastCompletedRound: completed.length ? completed[completed.length - 1] : null,
  };
});

export type PlayerRow = {
  id: string;
  position: "GK" | "FIELD";
  shirt_number: number | null;
  status: Tables<"season_players">["status"];
  market_value_m: number;
  player: Pick<Tables<"players">, "id" | "display_name" | "first_name" | "last_name" | "image_url" | "nationality">;
  team: { id: string; club: Pick<Tables<"clubs">, "id" | "name" | "short_name" | "logo_url" | "primary_color"> };
  stats: {
    total_points: number;
    rounds_played: number;
    avg_points: number;
    last_points: number | null;
    best_points: number;
    form3: number;
    points_per_m: number;
    goals: number;
    assists: number;
    owned_by: number;
  };
};

/** Alle Spieler einer Season inkl. Club und Saison-Statistik (für Markt, Team Builder). */
export const getSeasonPlayers = cache(async (seasonId: string): Promise<PlayerRow[]> => {
  const supabase = await createClient();
  const [{ data: players }, { data: stats }] = await Promise.all([
    supabase
      .from("season_players")
      .select(
        "id, position, shirt_number, status, market_value_m, player:players(id, display_name, first_name, last_name, image_url, nationality), team:season_teams(id, club:clubs(id, name, short_name, logo_url, primary_color))",
      )
      .eq("season_id", seasonId)
      .neq("status", "left"),
    supabase.from("player_season_stats").select("*").eq("season_id", seasonId),
  ]);
  const statMap = new Map((stats ?? []).map((s) => [s.season_player_id, s]));
  return ((players ?? []) as unknown as Array<Omit<PlayerRow, "stats">>).map((p) => {
    const s = statMap.get(p.id);
    return {
      ...p,
      market_value_m: Number(p.market_value_m),
      stats: {
        total_points: Number(s?.total_points ?? 0),
        rounds_played: Number(s?.rounds_played ?? 0),
        avg_points: Number(s?.avg_points ?? 0),
        last_points: s?.last_points == null ? null : Number(s.last_points),
        best_points: Number(s?.best_points ?? 0),
        form3: Number(s?.form3 ?? 0),
        points_per_m: Number(s?.points_per_m ?? 0),
        goals: Number(s?.goals ?? 0),
        assists: Number(s?.assists ?? 0),
        owned_by: Number(s?.owned_by ?? 0),
      },
    };
  });
});

export type MyTeam = {
  team: Tables<"fantasy_teams">;
  roster: Array<Tables<"fantasy_rosters"> & { player: PlayerRow }>;
  transfersThisRound: Tables<"fantasy_transfers">[];
};

export const getMyTeam = cache(async (seasonId: string, userId: string): Promise<MyTeam | null> => {
  const supabase = await createClient();
  const { data: team } = await supabase.from("fantasy_teams").select("*").eq("season_id", seasonId).eq("user_id", userId).maybeSingle();
  if (!team) return null;
  const [players, { data: roster }, ctx] = await Promise.all([
    getSeasonPlayers(seasonId),
    supabase.from("fantasy_rosters").select("*").eq("fantasy_team_id", team.id).order("slot_order"),
    getSeasonContext(seasonId),
  ]);
  const map = new Map(players.map((p) => [p.id, p]));
  const { data: transfers } = ctx?.nextRound
    ? await supabase.from("fantasy_transfers").select("*").eq("fantasy_team_id", team.id).eq("round_id", ctx.nextRound.id)
    : { data: [] as Tables<"fantasy_transfers">[] };
  return {
    team,
    roster: (roster ?? []).filter((r) => map.has(r.season_player_id)).map((r) => ({ ...r, player: map.get(r.season_player_id)! })),
    transfersThisRound: transfers ?? [],
  };
});

export type MyRank = {
  rank?: number;
  total_points?: number;
  last_round_points?: number;
  rank_delta?: number | null;
  prev_rank?: number | null;
  total_managers?: number;
  fantasy_team_id?: string;
  points_to_next?: number | null;
  points_to_top100?: number | null;
};

export const getMyRank = cache(async (seasonId: string): Promise<MyRank> => {
  const supabase = await createClient();
  const { data } = await supabase.rpc("my_rank", { p_season_id: seasonId });
  return (data ?? {}) as MyRank;
});

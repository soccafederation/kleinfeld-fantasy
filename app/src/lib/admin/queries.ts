import "server-only";
import { cache } from "react";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/database.types";

export type AdminSeason = Tables<"seasons"> & { competition: Tables<"competitions"> | null };

export const getAdminSeason = cache(async (id: string): Promise<AdminSeason> => {
  const supabase = await createClient();
  const { data } = await supabase.from("seasons").select("*, competition:competitions(*)").eq("id", id).maybeSingle();
  if (!data) notFound();
  return data as unknown as AdminSeason;
});

export const listAdminSeasons = cache(async (): Promise<AdminSeason[]> => {
  const supabase = await createClient();
  const { data } = await supabase.from("seasons").select("*, competition:competitions(*)").order("created_at", { ascending: false });
  return (data ?? []) as unknown as AdminSeason[];
});

export const listRounds = cache(async (seasonId: string) => {
  const supabase = await createClient();
  const { data } = await supabase.from("fantasy_rounds").select("*").eq("season_id", seasonId).order("number");
  return data ?? [];
});

export const listStatDefinitions = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.from("stat_definitions").select("*").order("sort_order");
  return data ?? [];
});

export type SeasonTeamRow = Tables<"season_teams"> & { club: Tables<"clubs"> | null };

export const listSeasonTeams = cache(async (seasonId: string): Promise<SeasonTeamRow[]> => {
  const supabase = await createClient();
  const { data } = await supabase.from("season_teams").select("*, club:clubs(*)").eq("season_id", seasonId);
  const rows = (data ?? []) as unknown as SeasonTeamRow[];
  return rows.sort((a, b) => (a.club?.name ?? "").localeCompare(b.club?.name ?? "", "de"));
});

export type SeasonPlayerRow = Tables<"season_players"> & {
  player: Tables<"players"> | null;
  team: (Tables<"season_teams"> & { club: Tables<"clubs"> | null }) | null;
};

export const listSeasonPlayers = cache(async (seasonId: string): Promise<SeasonPlayerRow[]> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("season_players")
    .select("*, player:players(*), team:season_teams(*, club:clubs(*))")
    .eq("season_id", seasonId);
  const rows = (data ?? []) as unknown as SeasonPlayerRow[];
  return rows.sort((a, b) => (a.player?.display_name ?? "").localeCompare(b.player?.display_name ?? "", "de"));
});

export async function countTeamsForSeason(seasonId: string) {
  const supabase = await createClient();
  const { count } = await supabase.from("fantasy_teams").select("id", { count: "exact", head: true }).eq("season_id", seasonId);
  return count ?? 0;
}

import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getAppContext } from "@/lib/data/context";
import { getSeasonPlayers } from "@/lib/data/season";
import { PlayerList } from "@/components/fantasy/player-list";
import { Card } from "@/components/ui/card";
import { Eyebrow } from "@/components/ui/tricolore";

export const metadata: Metadata = { title: "Spielermarkt · Kleinfeld Fantasy" };

export default async function MarketPage() {
  const { season, myTeam } = await getAppContext();
  if (!season) {
    return (
      <Card className="p-6 text-center">
        <Eyebrow>Spielermarkt</Eyebrow>
        <h1 className="display mt-2 text-3xl">Noch kein Wettbewerb</h1>
        <p className="mt-2 text-sm text-muted">Der Spielermarkt öffnet, sobald eine Saison offen ist.</p>
      </Card>
    );
  }

  const supabase = await createClient();
  const [players, { count }] = await Promise.all([
    getSeasonPlayers(season.id),
    supabase.from("fantasy_teams").select("id", { count: "exact", head: true }).eq("season_id", season.id).eq("is_complete", true),
  ]);

  return (
    <div className="space-y-4">
      <header>
        <Eyebrow>{season.competition.name}</Eyebrow>
        <h1 className="display mt-1 text-3xl">Spielermarkt</h1>
        <p className="mt-1 text-sm text-muted">
          {players.length} Spieler · {count ?? 0} komplette Teams
        </p>
      </header>
      <PlayerList players={players} teamCount={count ?? 0} myPlayerIds={myTeam?.roster.map((r) => r.season_player_id) ?? []} />
    </div>
  );
}

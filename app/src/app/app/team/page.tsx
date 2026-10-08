import type { Metadata } from "next";
import { getAppContext } from "@/lib/data/context";
import { getSeasonPlayers } from "@/lib/data/season";
import { TeamBuilder } from "@/components/fantasy/team-builder/team-builder";
import { Card } from "@/components/ui/card";
import { Eyebrow } from "@/components/ui/tricolore";

export const metadata: Metadata = { title: "Mein Team · Kleinfeld Fantasy" };

export default async function TeamPage({ searchParams }: { searchParams: Promise<{ onboarding?: string }> }) {
  const [{ onboarding }, { season, ctx, myTeam }] = await Promise.all([searchParams, getAppContext()]);

  if (!season || !ctx) {
    return (
      <Card className="p-6 text-center">
        <Eyebrow>Mein Team</Eyebrow>
        <h1 className="display mt-2 text-3xl">Noch kein Wettbewerb</h1>
        <p className="mt-2 text-sm text-muted">Sobald eine Saison offen ist, kannst du hier dein Team zusammenstellen.</p>
      </Card>
    );
  }

  const players = await getSeasonPlayers(season.id);
  const isOnboarding = onboarding === "1" || !myTeam?.team.is_complete;

  return (
    <div className="space-y-4">
      <header>
        <Eyebrow>{season.competition.name}</Eyebrow>
        <h1 className="display mt-1 text-3xl">{isOnboarding ? "Team erstellen" : "Mein Team"}</h1>
        {isOnboarding && (
          <p className="mt-1 text-sm text-muted">
            Budget {ctx.rules.budget_m} Mio · {ctx.rules.squad.GK} Torwart, {ctx.rules.squad.FIELD} Feldspieler, {ctx.rules.squad.BENCH} auf der Bank · max. {ctx.rules.max_per_club} pro Club
          </p>
        )}
      </header>
      <TeamBuilder players={players} myTeam={myTeam} rules={ctx.rules} nextRound={ctx.nextRound} seasonId={season.id} onboarding={onboarding === "1"} />
    </div>
  );
}

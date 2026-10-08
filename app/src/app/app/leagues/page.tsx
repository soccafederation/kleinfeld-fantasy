import Link from "next/link";
import { Eyebrow } from "@/components/ui/tricolore";
import { Card } from "@/components/ui/card";
import { getAppContext } from "@/lib/data/context";
import { createClient } from "@/lib/supabase/server";
import { LeagueForms } from "./forms";

export const metadata = { title: "Private Ligen" };

export default async function LeaguesPage() {
  const { season, myTeam } = await getAppContext();
  if (!season) return <p className="text-muted">Kein Wettbewerb aktiv.</p>;
  const supabase = await createClient();
  const { data: leagues } = await supabase.from("fantasy_leagues").select("id, name, invite_code, owner_id").eq("season_id", season.id).order("created_at");
  const counts = await Promise.all((leagues ?? []).map(async (l) => (await supabase.from("fantasy_league_members").select("league_id", { count: "exact", head: true }).eq("league_id", l.id)).count ?? 0));

  return (
    <div className="flex flex-col gap-5">
      <div>
        <Eyebrow>{season.competition.name} · {season.name}</Eyebrow>
        <h1 className="display mt-1 text-4xl sm:text-5xl">Private Ligen</h1>
        <p className="mt-2 max-w-lg text-sm text-text-2">Spiel gegen Freunde in einer eigenen Rangliste. Dein Team bleibt dasselbe, die globale Wertung bleibt unberührt.</p>
      </div>

      {!myTeam?.team.is_complete ? (
        <Card className="px-4 py-6 text-sm text-muted">
          Erstelle zuerst dein Team, dann kannst du Ligen gründen oder beitreten.{" "}
          <Link href="/app/team?onboarding=1" className="font-bold text-gold">Zum Team →</Link>
        </Card>
      ) : (
        <LeagueForms seasonId={season.id} />
      )}

      <div className="flex flex-col gap-3">
        {(leagues ?? []).map((l, i) => (
          <Link key={l.id} href={`/app/leagues/${l.id}`} className="flex items-center justify-between gap-3 rounded border border-border bg-card px-4 py-3 hover:bg-card-hover">
            <div>
              <div className="display-upright text-lg">{l.name}</div>
              <div className="text-xs text-muted">{counts[i]} Mitglied{counts[i] === 1 ? "" : "er"} · Code {l.invite_code}</div>
            </div>
            <span className="text-sm font-bold uppercase tracking-wide text-gold">Tabelle →</span>
          </Link>
        ))}
        {!leagues?.length && <p className="text-sm text-muted">Du bist noch in keiner privaten Liga.</p>}
      </div>
    </div>
  );
}

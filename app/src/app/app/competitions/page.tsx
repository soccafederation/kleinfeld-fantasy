import Image from "next/image";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getMyRank, listSeasons } from "@/lib/data/season";
import { Eyebrow } from "@/components/ui/tricolore";
import { formatPoints } from "@/lib/utils";
import { OpenSeasonButton } from "./open-season-button";

export const metadata = { title: "Wettbewerbe" };

/** Übersicht aller Wettbewerbe: Einstieg über das Kleinfeld-Fantasy-Logo. */
export default async function CompetitionsPage() {
  const { user, profile } = await requireUser();
  const supabase = await createClient();
  const [{ data: comps }, seasons, { data: teams }] = await Promise.all([
    supabase.from("competitions").select("*").eq("is_active", true).order("sort_order"),
    listSeasons(),
    supabase.from("fantasy_teams").select("season_id, name, is_complete").eq("user_id", user.id),
  ]);
  const playable = seasons.filter((s) => s.status === "open" || s.status === "live");
  const ranks = new Map(await Promise.all(playable.map(async (s) => [s.id, await getMyRank(s.id)] as const)));
  const teamBySeason = new Map((teams ?? []).map((t) => [t.season_id, t]));

  return (
    <div className="space-y-6">
      <div>
        <Eyebrow>Kleinfeld Fantasy</Eyebrow>
        <h1 className="display mt-2 text-4xl md:text-5xl">
          Deine <span className="text-gold">Wettbewerbe</span>
        </h1>
        <p className="mt-2 text-sm text-text-2">Ein Account, alle Wettbewerbe. Wähle, wo du spielen willst.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {(comps ?? []).map((c) => {
          const s = playable.find((x) => x.competition_id === c.id);
          if (!s) {
            return (
              <div key={c.id} className="flex min-h-[200px] flex-col rounded border border-border bg-card p-5">
                <span className="eyebrow text-muted">Demnächst</span>
                <div className="display mt-auto text-3xl text-text-2">{c.name}</div>
                <p className="mt-1 text-sm text-muted">{c.description ?? "Sobald der Wettbewerb startet, kannst du hier mit deinem Account einsteigen."}</p>
              </div>
            );
          }
          const team = teamBySeason.get(s.id);
          const rank = ranks.get(s.id);
          const isCurrent = profile.active_season_id === s.id;
          return (
            <div key={c.id} className="relative flex min-h-[200px] flex-col overflow-hidden rounded border border-gold bg-card">
              <Image src="/brand/pitch-aerial.jpg" alt="" fill className="object-cover opacity-40" sizes="(min-width:768px) 50vw, 100vw" />
              <div className="absolute inset-0 bg-gradient-to-b from-ground/10 to-ground" />
              <div className="relative mt-auto flex flex-col gap-3 p-5">
                <Eyebrow stripe={false}>
                  <span className="h-2 w-2 rounded-full bg-positive" /> {s.status === "live" ? "Läuft" : "Offen"} · {s.name}
                </Eyebrow>
                <div className="display text-3xl md:text-4xl">{c.name}</div>
                <div className="text-sm text-text-2">
                  {team?.is_complete ? (
                    <>
                      {team.name}
                      {rank?.rank ? (
                        <>
                          {" · "}Platz <span className="num text-gold">{rank.rank}</span> · <span className="num">{formatPoints(rank.total_points ?? 0)}</span> Punkte
                        </>
                      ) : null}
                    </>
                  ) : (
                    "Noch kein Team – jetzt einsteigen"
                  )}
                </div>
                <OpenSeasonButton seasonId={s.id} label={team?.is_complete ? (isCurrent ? "Weiterspielen" : "Öffnen") : "Team erstellen"} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

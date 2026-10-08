import Link from "next/link";
import { Eyebrow } from "@/components/ui/tricolore";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getAppContext } from "@/lib/data/context";
import { createClient } from "@/lib/supabase/server";
import { formatDate, formatPoints } from "@/lib/utils";
import { ProfileForms } from "./forms";

export const metadata = { title: "Profil" };

export default async function ProfilePage() {
  const { user, profile } = await getAppContext();
  const supabase = await createClient();
  const [{ data: prefs }, { data: teams }, { data: wins }] = await Promise.all([
    supabase.from("user_preferences").select("*").eq("user_id", user.id).maybeSingle(),
    supabase.from("fantasy_teams").select("id, name, season:seasons(name, status, competition:competitions(name))").eq("user_id", user.id),
    supabase.from("round_winners").select("round:fantasy_rounds(name, season:seasons(name))").in("fantasy_team_id", (await supabase.from("fantasy_teams").select("id").eq("user_id", user.id)).data?.map((t) => t.id) ?? []),
  ]);
  const teamIds = (teams ?? []).map((t) => t.id);
  const { data: ranks } = teamIds.length ? await supabase.from("leaderboard_overall").select("fantasy_team_id, rank, total_points").in("fantasy_team_id", teamIds) : { data: [] };
  const rankMap = new Map((ranks ?? []).map((r) => [r.fantasy_team_id, r]));

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <Eyebrow>Profil</Eyebrow>
          <h1 className="display mt-1 text-4xl sm:text-5xl">{profile.display_name ?? profile.username}</h1>
          <div className="mt-1 text-sm text-muted">@{profile.username} · dabei seit {formatDate(profile.created_at)}</div>
        </div>
        {profile.role !== "user" && <Badge variant="gold">{profile.role}</Badge>}
      </div>

      <Card className="p-4">
        <div className="eyebrow">Meine Wettbewerbe</div>
        <div className="mt-3 flex flex-col gap-2">
          {(teams ?? []).map((t) => {
            const s = t.season as unknown as { name: string; status: string; competition: { name: string } };
            const r = rankMap.get(t.id);
            return (
              <div key={t.id} className="flex items-center justify-between gap-3 border-t border-border pt-2 first:border-t-0 first:pt-0">
                <div className="min-w-0">
                  <div className="truncate font-bold">{t.name}</div>
                  <div className="text-xs text-muted">{s.competition.name} · {s.name}</div>
                </div>
                <div className="text-right">
                  <div className="num text-xl">{r ? `#${r.rank}` : "–"}</div>
                  <div className="text-xs text-muted">{r ? `${formatPoints(r.total_points)} PTS` : "noch nicht gewertet"}</div>
                </div>
              </div>
            );
          })}
          {!teams?.length && <p className="text-sm text-muted">Noch kein Team. <Link href="/app/team?onboarding=1" className="font-bold text-gold">Jetzt erstellen →</Link></p>}
        </div>
        {!!wins?.length && (
          <div className="mt-4 border-t border-border pt-3">
            <div className="eyebrow">Auszeichnungen</div>
            <ul className="mt-2 flex flex-wrap gap-2">
              {wins.map((w, i) => {
                const r = w.round as unknown as { name: string; season: { name: string } };
                return <Badge key={i} variant="gold">Manager of the Matchday · {r.name} ({r.season.name})</Badge>;
              })}
            </ul>
          </div>
        )}
      </Card>

      <ProfileForms
        profile={{ username: profile.username, display_name: profile.display_name, username_changed_at: profile.username_changed_at }}
        prefs={{ email_round_reminder: prefs?.email_round_reminder ?? true, email_round_result: prefs?.email_round_result ?? true }}
        email={user.email ?? ""}
      />
    </div>
  );
}

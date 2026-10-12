import "server-only";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getMyTeam, getSeasonContext, listSeasons, resolveActiveSeason } from "@/lib/data/season";

/** Standard-Kontext für alle /app-Seiten: Nutzer, aktive Season, Regeln, eigenes Team. */
export async function getAppContext() {
  const [{ user, profile }] = await Promise.all([requireUser(), listSeasons()]);
  const season = await resolveActiveSeason(profile.active_season_id);
  if (!season) return { user, profile, season: null, ctx: null, myTeam: null };
  const [ctx, myTeam] = await Promise.all([getSeasonContext(season.id), getMyTeam(season.id, user.id)]);
  return { user, profile, season, ctx, myTeam };
}

/** Wie getAppContext, leitet aber zum Onboarding um, wenn noch kein vollständiges Team existiert. */
export async function requireCompleteTeam() {
  const c = await getAppContext();
  if (!c.season || !c.ctx) return c;
  if (!c.myTeam?.team.is_complete) redirect("/app/team?onboarding=1");
  return c;
}

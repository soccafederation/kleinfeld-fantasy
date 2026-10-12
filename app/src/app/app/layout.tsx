import { AppShell } from "@/components/layout/app-shell";
import { requireUser } from "@/lib/auth";
import { listSeasons, resolveActiveSeason } from "@/lib/data/season";
import { competitionThemeCss } from "@/lib/themes";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // Seasons parallel zum Login-Check laden (gecacht, wird von resolveActiveSeason wiederverwendet).
  const [{ profile }, seasons] = await Promise.all([requireUser(), listSeasons()]);
  const season = await resolveActiveSeason(profile.active_season_id);
  return (
    <>
    {/* Farbwelt des aktiven Wettbewerbs (gilt für die ganze Seite inkl. Popups) */}
    {season && <style>{competitionThemeCss(season.competition.slug)}</style>}
    <AppShell season={season} seasons={seasons} profile={profile}>
      {children}
    </AppShell>
    </>
  );
}

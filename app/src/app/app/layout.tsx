import { AppShell } from "@/components/layout/app-shell";
import { requireUser } from "@/lib/auth";
import { listSeasons, resolveActiveSeason } from "@/lib/data/season";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // Seasons parallel zum Login-Check laden (gecacht, wird von resolveActiveSeason wiederverwendet).
  const [{ profile }, seasons] = await Promise.all([requireUser(), listSeasons()]);
  const season = await resolveActiveSeason(profile.active_season_id);
  return (
    <AppShell season={season} seasons={seasons} profile={profile}>
      {children}
    </AppShell>
  );
}

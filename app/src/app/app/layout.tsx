import { AppShell } from "@/components/layout/app-shell";
import { requireUser } from "@/lib/auth";
import { listSeasons, resolveActiveSeason } from "@/lib/data/season";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireUser();
  const [seasons, season] = await Promise.all([listSeasons(), resolveActiveSeason(profile.active_season_id)]);
  return (
    <AppShell season={season} seasons={seasons} profile={profile}>
      {children}
    </AppShell>
  );
}

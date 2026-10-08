import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { getAdminSeason } from "@/lib/admin/queries";
import { SeasonTabs } from "@/components/admin/admin-nav";
import { SeasonStatusBadge } from "@/components/admin/status-badges";

export default async function SeasonLayout({ children, params }: { children: React.ReactNode; params: Promise<{ id: string }> }) {
  await requireStaff();
  const { id } = await params;
  const season = await getAdminSeason(id);
  return (
    <div className="flex flex-col gap-5">
      <div>
        <Link href="/admin/seasons" className="text-xs uppercase tracking-wider text-muted hover:text-gold">
          ← Alle Seasons
        </Link>
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <h1 className="display text-3xl">{season.name}</h1>
          <SeasonStatusBadge status={season.status} />
          <span className="text-sm text-muted">{season.competition?.name}</span>
        </div>
        <div className="mt-3">
          <SeasonTabs seasonId={season.id} />
        </div>
      </div>
      {children}
    </div>
  );
}

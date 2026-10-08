import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { listAdminSeasons } from "@/lib/admin/queries";
import { formatDateTime } from "@/lib/utils";
import { nowMs } from "@/lib/admin/time";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, PageHeader, Stat } from "@/components/admin/admin-shell";
import { RoundStatusBadge, SeasonStatusBadge } from "@/components/admin/status-badges";

export default async function AdminOverviewPage() {
  await requireStaff();
  const supabase = await createClient();
  const seasons = await listAdminSeasons();
  const active = seasons.filter((s) => s.status === "open" || s.status === "live");
  const activeIds = active.map((s) => s.id);

  const [{ data: rounds }, { data: imports }, { data: teamCounts }] = await Promise.all([
    activeIds.length ? supabase.from("fantasy_rounds").select("*").in("season_id", activeIds).order("deadline_at") : Promise.resolve({ data: [] }),
    supabase.from("statistic_imports").select("id, season_id, round_id, file_name, created_at, status, notes").eq("status", "review").order("created_at", { ascending: false }),
    activeIds.length ? supabase.from("fantasy_teams").select("season_id, is_complete").in("season_id", activeIds) : Promise.resolve({ data: [] }),
  ]);

  const now = nowMs();
  const nextDeadline = (rounds ?? []).find((r) => r.status === "upcoming" && new Date(r.deadline_at).getTime() > now) ?? null;
  const dueRounds = (rounds ?? []).filter((r) => r.status === "upcoming" && new Date(r.deadline_at).getTime() <= now);
  const teamsBySeason = new Map<string, { total: number; complete: number }>();
  for (const t of teamCounts ?? []) {
    const e = teamsBySeason.get(t.season_id) ?? { total: 0, complete: 0 };
    e.total++;
    if (t.is_complete) e.complete++;
    teamsBySeason.set(t.season_id, e);
  }
  const totalTeams = [...teamsBySeason.values()].reduce((a, b) => a + b.total, 0);
  const seasonName = (id: string) => seasons.find((s) => s.id === id)?.name ?? "–";

  return (
    <>
      <PageHeader title="Übersicht" eyebrow="Admin">
        Stand {formatDateTime(new Date().toISOString())}
      </PageHeader>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Aktive Seasons" value={active.length} hint={active.map((s) => s.name).join(", ") || "keine"} />
        <Stat label="Nächste Deadline" value={nextDeadline ? formatDateTime(nextDeadline.deadline_at) : "–"} hint={nextDeadline ? `${seasonName(nextDeadline.season_id)} · ${nextDeadline.name}` : "kein offener Spieltag"} />
        <Stat label="Offene Imports" value={imports?.length ?? 0} hint="Status „review“" />
        <Stat label="Teams" value={totalTeams} hint={`${[...teamsBySeason.values()].reduce((a, b) => a + b.complete, 0)} vollständig`} />
      </div>

      {dueRounds.length > 0 && (
        <Card accent="red" className="mt-5">
          <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="font-semibold">Deadline abgelaufen, noch nicht gesperrt</div>
              <div className="text-sm text-muted">{dueRounds.map((r) => `${seasonName(r.season_id)} · ${r.name}`).join(" · ")}</div>
            </div>
            <Button asChild variant="secondary" size="sm">
              <Link href={`/admin/seasons/${dueRounds[0].season_id}/rounds`}>Zu den Spieltagen</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Seasons</CardTitle>
            <Button asChild variant="link" size="sm">
              <Link href="/admin/seasons">Alle</Link>
            </Button>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {seasons.length === 0 && <Empty>Noch keine Season. Lege zuerst einen Wettbewerb und dann eine Season an.</Empty>}
            {seasons.slice(0, 6).map((s) => {
              const rs = (rounds ?? []).filter((r) => r.season_id === s.id);
              const tc = teamsBySeason.get(s.id);
              return (
                <Link key={s.id} href={`/admin/seasons/${s.id}`} className="flex items-center justify-between gap-3 rounded-sm border border-border px-3 py-2.5 hover:bg-card-hover">
                  <div className="min-w-0">
                    <div className="truncate font-semibold">{s.name}</div>
                    <div className="truncate text-xs text-muted">
                      {s.competition?.name ?? "–"}
                      {tc ? ` · ${tc.total} Teams` : ""}
                      {rs.length ? ` · ${rs.filter((r) => r.status === "completed").length}/${rs.length} Spieltage fertig` : ""}
                    </div>
                  </div>
                  <SeasonStatusBadge status={s.status} />
                </Link>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Spieltage (aktive Seasons)</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {(rounds ?? []).length === 0 && <Empty>Keine Spieltage in aktiven Seasons.</Empty>}
            {(rounds ?? []).slice(0, 8).map((r) => (
              <Link key={r.id} href={`/admin/seasons/${r.season_id}/rounds`} className="flex items-center justify-between gap-3 rounded-sm border border-border px-3 py-2.5 hover:bg-card-hover">
                <div className="min-w-0">
                  <div className="truncate font-semibold">{r.name}</div>
                  <div className="text-xs text-muted">
                    {seasonName(r.season_id)} · Deadline {formatDateTime(r.deadline_at)}
                  </div>
                </div>
                <RoundStatusBadge status={r.status} />
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Offene Statistikimporte</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {(imports ?? []).length === 0 && <Empty>Keine Imports im Status „review“.</Empty>}
            {(imports ?? []).map((i) => (
              <Link
                key={i.id}
                href={i.round_id ? `/admin/seasons/${i.season_id}/stats/${i.round_id}` : `/admin/seasons/${i.season_id}/stats`}
                className="flex items-center justify-between gap-3 rounded-sm border border-border px-3 py-2.5 hover:bg-card-hover"
              >
                <div className="min-w-0">
                  <div className="truncate font-semibold">{i.file_name ?? "Import"}</div>
                  <div className="truncate text-xs text-muted">
                    {seasonName(i.season_id)} · {formatDateTime(i.created_at)}
                    {i.notes ? ` · ${i.notes}` : ""}
                  </div>
                </div>
                <Badge variant={i.notes ? "red" : "gold"}>{i.notes ? "blockiert" : "review"}</Badge>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="mt-6">
        <div className="eyebrow mb-2">Quick-Actions</div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="secondary" size="sm">
            <Link href="/admin/competitions">Wettbewerb anlegen</Link>
          </Button>
          <Button asChild variant="secondary" size="sm">
            <Link href="/admin/seasons">Season anlegen</Link>
          </Button>
          {active[0] && (
            <>
              <Button asChild variant="secondary" size="sm">
                <Link href={`/admin/seasons/${active[0].id}/stats`}>Statistik importieren</Link>
              </Button>
              <Button asChild variant="secondary" size="sm">
                <Link href={`/admin/seasons/${active[0].id}/rounds`}>Spieltage verwalten</Link>
              </Button>
            </>
          )}
          <Button asChild variant="secondary" size="sm">
            <Link href="/admin/users">Nutzer</Link>
          </Button>
        </div>
      </div>
    </>
  );
}

import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getAdminSeason, listRounds } from "@/lib/admin/queries";
import { isoToBerlinLocal, nowMs } from "@/lib/admin/time";
import { formatCountdown, formatDateTime } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label, Notice } from "@/components/ui/input";
import { ActionForm } from "@/components/admin/action-form";
import { Empty } from "@/components/admin/admin-shell";
import { RoundStatusBadge } from "@/components/admin/status-badges";
import { computeRoundAction, lockRoundAction, rebuildLeaderboardAction, saveRoundAction } from "../../../actions";

export default async function SeasonRoundsPage({ params }: { params: Promise<{ id: string }> }) {
  await requireStaff();
  const { id } = await params;
  const supabase = await createClient();
  const [season, rounds] = await Promise.all([getAdminSeason(id), listRounds(id)]);
  const roundIds = rounds.map((r) => r.id);
  const [{ data: lineups }, { data: scores }, { data: stats }, { data: scoring }] = await Promise.all([
    roundIds.length ? supabase.from("fantasy_lineups").select("round_id").in("round_id", roundIds) : Promise.resolve({ data: [] }),
    roundIds.length ? supabase.from("fantasy_team_scores").select("round_id, status").in("round_id", roundIds) : Promise.resolve({ data: [] }),
    roundIds.length ? supabase.from("player_round_statistics").select("round_id, status").in("round_id", roundIds) : Promise.resolve({ data: [] }),
    supabase.from("scoring_rule_versions").select("id").eq("season_id", id).eq("is_active", true).maybeSingle(),
  ]);
  const count = (list: { round_id: string }[] | null, rid: string, pred?: (x: { round_id: string; status?: string }) => boolean) =>
    (list ?? []).filter((x) => x.round_id === rid && (!pred || pred(x))).length;

  const nextNumber = (rounds.at(-1)?.number ?? 0) + 1;
  const now = nowMs();

  return (
    <div className="flex flex-col gap-5">
      {!scoring && (
        <Notice kind="error">
          Kein aktives Punktesystem – Berechnung ist blockiert.{" "}
          <Link href={`/admin/seasons/${id}/scoring`} className="text-gold">
            Punktesystem aktivieren
          </Link>
          .
        </Notice>
      )}

      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <div className="order-2 flex flex-col gap-3 lg:order-1">
          {rounds.length === 0 && <Empty>Noch keine Spieltage in {season.name}.</Empty>}
          {rounds.map((r) => {
            const due = r.status === "upcoming" && new Date(r.deadline_at).getTime() <= now;
            const lineupCount = count(lineups, r.id);
            const scoreCount = count(scores, r.id);
            const statCount = count(stats, r.id);
            const publishedStats = count(stats, r.id, (x) => x.status === "published" || x.status === "corrected" || x.status === "confirmed");
            return (
              <Card key={r.id} accent={due ? "red" : r.status === "completed" ? "none" : "gold"}>
                <CardHeader>
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="num text-xl text-gold">{r.number}</span>
                    <CardTitle className="truncate text-text">{r.name}</CardTitle>
                    <RoundStatusBadge status={r.status} />
                  </div>
                  <span className="shrink-0 text-xs text-muted">
                    {r.status === "upcoming" ? formatCountdown(r.deadline_at) : r.completed_at ? `fertig ${formatDateTime(r.completed_at)}` : r.locked_at ? `gesperrt ${formatDateTime(r.locked_at)}` : ""}
                  </span>
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                  <div className="grid grid-cols-2 gap-2 text-xs text-muted sm:grid-cols-4">
                    <span>
                      Deadline <span className="text-text">{formatDateTime(r.deadline_at)}</span>
                    </span>
                    <span>
                      Aufstellungen <span className="num text-text">{lineupCount}</span>
                    </span>
                    <span>
                      Teamscores <span className="num text-text">{scoreCount}</span>
                    </span>
                    <span>
                      Stat-Werte <span className="num text-text">{publishedStats}</span>
                      <span className="text-muted-2">/{statCount}</span>
                    </span>
                  </div>
                  {due && <Notice kind="error">Deadline abgelaufen – Spieltag jetzt sperren (sonst übernimmt der Cron).</Notice>}

                  <div className="flex flex-wrap items-start gap-2">
                    {r.status === "upcoming" && (
                      <ActionForm action={lockRoundAction} submitLabel="Spieltag sperren" variant={due ? "primary" : "secondary"} size="sm" inline>
                        <input type="hidden" name="round_id" value={r.id} />
                        <input type="hidden" name="season_id" value={id} />
                      </ActionForm>
                    )}
                    {r.status !== "upcoming" && (
                      <>
                        <ActionForm action={computeRoundAction} submitLabel="Punkte berechnen (vorläufig)" variant="secondary" size="sm" inline>
                          <input type="hidden" name="round_id" value={r.id} />
                          <input type="hidden" name="season_id" value={id} />
                        </ActionForm>
                        <Link href={`/admin/seasons/${id}/stats/${r.id}`} className="inline-flex h-9 items-center px-2 text-xs font-semibold uppercase tracking-wide text-gold hover:underline">
                          Statistik prüfen
                        </Link>
                      </>
                    )}
                  </div>
                  {r.status !== "upcoming" && (
                    <details className="rounded-sm border border-border p-3">
                      <summary className="cursor-pointer text-sm font-semibold">{r.status === "completed" ? "Erneut final berechnen" : "Punkte berechnen & abschließen"}</summary>
                      <div className="mt-3">
                        <ActionForm
                          action={computeRoundAction}
                          submitLabel={r.status === "completed" ? "Erneut abschließen" : "Berechnen & abschließen"}
                          size="sm"
                          confirm="Statistiken sind geprüft und freigegeben. Spieltag final berechnen (Rangliste, Sieger)."
                        >
                          <input type="hidden" name="round_id" value={r.id} />
                          <input type="hidden" name="season_id" value={id} />
                          <input type="hidden" name="finalize" value="1" />
                          {publishedStats === 0 && <Notice kind="error">Noch keine freigegebenen Statistiken für diesen Spieltag – alle Spieler bekämen 0 Punkte.</Notice>}
                        </ActionForm>
                      </div>
                    </details>
                  )}
                  {r.status === "upcoming" && (
                    <details className="rounded-sm border border-border p-3">
                      <summary className="cursor-pointer text-sm font-semibold">Deadline ändern</summary>
                      <div className="mt-3">
                        <ActionForm action={saveRoundAction} submitLabel="Speichern" variant="secondary" size="sm" inline>
                          <input type="hidden" name="id" value={r.id} />
                          <input type="hidden" name="season_id" value={id} />
                          <Input name="name" defaultValue={r.name} aria-label="Name" className="h-9 w-40 text-sm" />
                          <Input name="deadline_at" type="datetime-local" defaultValue={isoToBerlinLocal(r.deadline_at)} required aria-label="Deadline (Europe/Berlin)" className="h-9 w-auto text-sm" />
                        </ActionForm>
                      </div>
                    </details>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="order-1 flex flex-col gap-4 lg:order-2">
          <Card accent="gold">
            <CardHeader>
              <CardTitle>Spieltag anlegen</CardTitle>
            </CardHeader>
            <CardContent>
              <ActionForm action={saveRoundAction} submitLabel="Anlegen" resetOnSuccess>
                <input type="hidden" name="season_id" value={id} />
                <div className="grid grid-cols-[80px_1fr] gap-3">
                  <div>
                    <Label htmlFor="number">Nr.</Label>
                    <Input id="number" name="number" type="number" min={1} defaultValue={nextNumber} required className="num" />
                  </div>
                  <div>
                    <Label htmlFor="round_name">Name</Label>
                    <Input id="round_name" name="name" placeholder={`Spieltag ${nextNumber}`} />
                  </div>
                </div>
                <div>
                  <Label htmlFor="deadline_at">Deadline (Europe/Berlin)</Label>
                  <Input id="deadline_at" name="deadline_at" type="datetime-local" required />
                </div>
                <div>
                  <Label htmlFor="match_date">Spieltermin (optional)</Label>
                  <Input id="match_date" name="match_date" type="date" />
                </div>
              </ActionForm>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Gesamtrangliste</CardTitle>
            </CardHeader>
            <CardContent>
              <ActionForm action={rebuildLeaderboardAction} submitLabel="Neu aufbauen" variant="secondary" size="sm">
                <input type="hidden" name="season_id" value={id} />
                <p className="text-xs text-muted">Summiert alle abgeschlossenen Spieltage neu (Tie-Break, Rangdelta, Verlauf).</p>
              </ActionForm>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

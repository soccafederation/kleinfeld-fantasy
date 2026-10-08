import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { listRounds, listStatDefinitions } from "@/lib/admin/queries";
import { formatDateTime } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label, Select } from "@/components/ui/input";
import { ActionForm } from "@/components/admin/action-form";
import { Empty } from "@/components/admin/admin-shell";
import { ImportStatusBadge, RoundStatusBadge } from "@/components/admin/status-badges";
import { importStatsCsvAction, rejectImportAction } from "../../../stats-actions";
import type { Tables } from "@/lib/database.types";

type ImportRow = Tables<"statistic_imports"> & { importer: { username: string } | null };

export default async function SeasonStatsPage({ params }: { params: Promise<{ id: string }> }) {
  await requireStaff();
  const { id } = await params;
  const supabase = await createClient();
  const [rounds, defs, { data: importsRaw }] = await Promise.all([
    listRounds(id),
    listStatDefinitions(),
    supabase.from("statistic_imports").select("*, importer:profiles(username)").eq("season_id", id).order("created_at", { ascending: false }).limit(50),
  ]);
  const imports = (importsRaw ?? []) as unknown as ImportRow[];
  const roundName = (rid: string | null) => rounds.find((r) => r.id === rid)?.name ?? "–";
  const defaultRound = rounds.find((r) => r.status === "locked" || r.status === "live" || r.status === "under_review") ?? rounds.find((r) => r.status === "upcoming") ?? rounds.at(-1);
  const roundIds = rounds.map((r) => r.id);
  const { data: counts } = roundIds.length
    ? await supabase.from("player_round_statistics").select("round_id, status").in("round_id", roundIds)
    : { data: [] as { round_id: string; status: string }[] };
  const perRound = new Map<string, { total: number; published: number }>();
  for (const s of counts ?? []) {
    const e = perRound.get(s.round_id) ?? { total: 0, published: 0 };
    e.total++;
    if (s.status === "published" || s.status === "corrected") e.published++;
    perRound.set(s.round_id, e);
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[400px_1fr]">
      <Card accent="gold">
        <CardHeader>
          <CardTitle>Statistik importieren (CSV)</CardTitle>
        </CardHeader>
        <CardContent>
          {rounds.length === 0 ? (
            <Empty>
              Zuerst{" "}
              <Link href={`/admin/seasons/${id}/rounds`} className="text-gold">
                Spieltage anlegen
              </Link>
              .
            </Empty>
          ) : (
            <ActionForm
              action={importStatsCsvAction}
              submitLabel="Importieren & prüfen"
              pendingLabel="Wird verarbeitet…"
              blockedHint="Der Import steht im Status „Review“ und ist in der Historie gelistet. Verwirf ihn oder importiere zuerst den fehlenden Spieltag."
            >
              <input type="hidden" name="season_id" value={id} />
              <div>
                <Label htmlFor="round_id">Spieltag</Label>
                <Select id="round_id" name="round_id" defaultValue={defaultRound?.id ?? ""} required>
                  {rounds.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.number} · {r.name} ({r.status})
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label htmlFor="mode">Modus</Label>
                <Select id="mode" name="mode" defaultValue="cumulative">
                  <option value="cumulative">Kumuliert (Saisonstand → Delta zum Vor-Snapshot)</option>
                  <option value="round">Spieltagswerte (Werte gelten direkt für diesen Spieltag)</option>
                </Select>
              </div>
              <div>
                <Label htmlFor="file">CSV-Datei</Label>
                <Input id="file" name="file" type="file" accept=".csv,text/csv" required className="py-2 text-sm file:mr-3 file:rounded-sm file:border-0 file:bg-surface file:px-2 file:text-text-2" />
              </div>
              <details className="text-xs text-muted">
                <summary className="cursor-pointer text-text-2">Format</summary>
                <p className="mt-2">Erste Spalte: Spielername (wie Anzeigename oder Nachname). Weitere Spalten: Statistik-Keys oder deutsche Bezeichnungen. Leere Zellen = kein Wert (nicht 0).</p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {defs
                    .filter((d) => !d.is_derived)
                    .map((d) => (
                      <code key={d.key} className="rounded-sm bg-surface px-1 py-0.5 text-text-2" title={d.label_de}>
                        {d.key}
                      </code>
                    ))}
                </div>
              </details>
            </ActionForm>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-col gap-5">
        <Card>
          <CardHeader>
            <CardTitle>Spieltage</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {rounds.length === 0 && <Empty>Keine Spieltage.</Empty>}
            {rounds.map((r) => {
              const c = perRound.get(r.id);
              return (
                <Link key={r.id} href={`/admin/seasons/${id}/stats/${r.id}`} className="flex items-center justify-between gap-3 rounded-sm border border-border px-3 py-2.5 hover:bg-card-hover">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="num text-gold">{r.number}</span>
                    <span className="truncate font-semibold">{r.name}</span>
                    <RoundStatusBadge status={r.status} />
                  </div>
                  <span className="num shrink-0 text-xs text-muted">
                    {c ? `${c.published}/${c.total} freigegeben` : "keine Werte"}
                  </span>
                </Link>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Import-Historie</CardTitle>
          </CardHeader>
          <CardContent>
            {imports.length === 0 ? (
              <Empty>Noch keine Imports.</Empty>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-sm">
                  <thead className="text-left text-xs uppercase tracking-wide text-muted">
                    <tr>
                      <th className="px-2 py-2">Datei</th>
                      <th className="px-2 py-2">Spieltag</th>
                      <th className="px-2 py-2">Modus</th>
                      <th className="px-2 py-2">Datum</th>
                      <th className="px-2 py-2">Von</th>
                      <th className="px-2 py-2">Status</th>
                      <th className="px-2 py-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {imports.map((i) => (
                      <tr key={i.id} className="border-t border-border align-top">
                        <td className="max-w-[200px] px-2 py-2">
                          <div className="truncate" title={i.file_name ?? ""}>
                            {i.file_name ?? "–"}
                          </div>
                          {i.notes && <div className="mt-0.5 text-xs text-red">{i.notes}</div>}
                        </td>
                        <td className="px-2 py-2">
                          {i.round_id ? (
                            <Link href={`/admin/seasons/${id}/stats/${i.round_id}`} className="text-gold hover:underline">
                              {roundName(i.round_id)}
                            </Link>
                          ) : (
                            "–"
                          )}
                        </td>
                        <td className="px-2 py-2 text-xs">{i.mode === "round" ? "Spieltag" : "kumuliert"}</td>
                        <td className="px-2 py-2 text-xs">{formatDateTime(i.created_at)}</td>
                        <td className="px-2 py-2 text-xs">{i.importer?.username ?? "–"}</td>
                        <td className="px-2 py-2">
                          <ImportStatusBadge status={i.status} />
                        </td>
                        <td className="px-2 py-2 text-right">
                          {(i.status === "review" || i.status === "uploaded") && (
                            <ActionForm action={rejectImportAction} submitLabel="Verwerfen" variant="ghost" size="sm" inline silent>
                              <input type="hidden" name="import_id" value={i.id} />
                              <input type="hidden" name="season_id" value={id} />
                            </ActionForm>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

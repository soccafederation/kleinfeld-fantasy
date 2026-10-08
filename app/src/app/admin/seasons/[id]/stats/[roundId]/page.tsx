import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { listSeasonPlayers, listStatDefinitions } from "@/lib/admin/queries";
import { formatDateTime } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label, Notice, Select } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ActionForm } from "@/components/admin/action-form";
import { Empty } from "@/components/admin/admin-shell";
import { ImportStatusBadge, RoundStatusBadge } from "@/components/admin/status-badges";
import { StatsReviewTable, type ReviewCol, type ReviewRow } from "@/components/admin/stats-review-table";
import { correctStatAction, manualStatAction, publishRoundStatsAction, type ImportErrorEntry } from "../../../../stats-actions";
import type { Tables } from "@/lib/database.types";

type ImportRow = Tables<"statistic_imports"> & { importer: { username: string } | null };

export default async function RoundStatsReviewPage({ params, searchParams }: { params: Promise<{ id: string; roundId: string }>; searchParams: Promise<{ imported?: string }> }) {
  await requireStaff();
  const { id, roundId } = await params;
  const sp = await searchParams;
  const supabase = await createClient();
  const [{ data: round }, players, defs, { data: stats }, { data: importsRaw }, { data: snapshotFlags }] = await Promise.all([
    supabase.from("fantasy_rounds").select("*").eq("id", roundId).eq("season_id", id).maybeSingle(),
    listSeasonPlayers(id),
    listStatDefinitions(),
    supabase.from("player_round_statistics").select("id, season_player_id, stat_key, value, status").eq("round_id", roundId),
    supabase.from("statistic_imports").select("*, importer:profiles(username)").eq("round_id", roundId).order("created_at", { ascending: false }),
    supabase.from("statistic_snapshot_values").select("season_player_id, snapshot:statistic_snapshots!inner(as_of_round_id)").eq("needs_review", true).eq("snapshot.as_of_round_id", roundId),
  ]);
  if (!round) notFound();
  const imports = (importsRaw ?? []) as unknown as ImportRow[];
  const needsReview = new Set(((snapshotFlags ?? []) as unknown as { season_player_id: string }[]).map((s) => s.season_player_id));

  const usedKeys = new Set((stats ?? []).map((s) => s.stat_key));
  const cols: ReviewCol[] = defs.filter((d) => usedKeys.has(d.key)).map((d) => ({ key: d.key, label: d.label_de, short: d.short_de ?? d.key }));
  const byPlayer = new Map<string, ReviewRow>();
  for (const s of stats ?? []) {
    let row = byPlayer.get(s.season_player_id);
    if (!row) {
      const p = players.find((x) => x.id === s.season_player_id);
      row = {
        seasonPlayerId: s.season_player_id,
        name: p?.player?.display_name ?? "Unbekannt",
        team: p?.team?.club?.short_name ?? "–",
        position: p?.position ?? "FIELD",
        needsReview: needsReview.has(s.season_player_id),
        cells: {},
      };
      byPlayer.set(s.season_player_id, row);
    }
    row.cells[s.stat_key] = { id: s.id, value: Number(s.value), status: s.status };
  }
  const rows = [...byPlayer.values()].sort((a, b) => a.team.localeCompare(b.team, "de") || a.name.localeCompare(b.name, "de"));
  const total = stats?.length ?? 0;
  const published = (stats ?? []).filter((s) => s.status === "published" || s.status === "corrected").length;
  const unpublished = total - published;
  const unmatched: (ImportErrorEntry & { file: string })[] = imports.flatMap((i) => ((i.error_log as unknown as ImportErrorEntry[]) ?? []).map((e) => ({ ...e, file: i.file_name ?? "Import" })));

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Link href={`/admin/seasons/${id}/stats`} className="text-xs uppercase tracking-wider text-muted hover:text-gold">
            ← Statistik
          </Link>
          <h2 className="display text-2xl">
            {round.number} · {round.name}
          </h2>
          <RoundStatusBadge status={round.status} />
        </div>
        <div className="flex items-center gap-2 text-xs text-muted">
          <Badge variant="outline">{total} Werte</Badge>
          <Badge variant={unpublished ? "gold" : "positive"}>{unpublished ? `${unpublished} offen` : "alles freigegeben"}</Badge>
        </div>
      </div>

      {sp.imported && <Notice kind="success">Import verarbeitet. Prüfe die Werte, korrigiere bei Bedarf und gib dann frei.</Notice>}

      {unmatched.length > 0 && (
        <Card accent="red">
          <CardHeader>
            <CardTitle>Hinweise aus dem Import ({unmatched.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="max-h-48 space-y-1 overflow-y-auto text-sm">
              {unmatched.map((u, i) => (
                <li key={i} className="flex flex-wrap gap-x-2">
                  <span className="text-muted">Zeile {u.row}</span>
                  <span className="font-semibold">{u.name}</span>
                  <span className="text-text-2">– {u.reason}</span>
                  <span className="text-xs text-muted-2">({u.file})</span>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-muted">Nicht zugeordnete Spieler unten manuell nachtragen oder den Anzeigenamen des Spielers anpassen und neu importieren.</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Werte prüfen</CardTitle>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? <Empty>Noch keine Statistikwerte für diesen Spieltag. Importiere eine CSV oder trage Werte manuell ein.</Empty> : <StatsReviewTable rows={rows} cols={cols} seasonId={id} roundId={roundId} correctAction={correctStatAction} />}
        </CardContent>
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card accent="gold">
          <CardHeader>
            <CardTitle>Freigeben</CardTitle>
          </CardHeader>
          <CardContent>
            <ActionForm action={publishRoundStatsAction} submitLabel={`${unpublished} Werte freigeben`} confirm="Werte sind geprüft. Freigabe macht sie öffentlich sichtbar und für die Punkteberechnung gültig." successLink={{ href: `/admin/seasons/${id}/rounds`, label: "Zu den Spieltagen" }}>
              <input type="hidden" name="season_id" value={id} />
              <input type="hidden" name="round_id" value={roundId} />
              <p className="text-xs text-muted">Danach unter „Spieltage“ die Punkte berechnen. Spätere Korrekturen bleiben über die Tabelle möglich (mit Protokoll).</p>
            </ActionForm>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Manuelle Eingabe</CardTitle>
          </CardHeader>
          <CardContent>
            <ActionForm action={manualStatAction} submitLabel="Wert speichern" variant="secondary" size="sm" resetOnSuccess>
              <input type="hidden" name="season_id" value={id} />
              <input type="hidden" name="round_id" value={roundId} />
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <Label htmlFor="m_player">Spieler</Label>
                  <Select id="m_player" name="season_player_id" required defaultValue="">
                    <option value="" disabled>
                      Wählen…
                    </option>
                    {players.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.player?.display_name} ({p.team?.club?.short_name})
                      </option>
                    ))}
                  </Select>
                </div>
                <div>
                  <Label htmlFor="m_stat">Statistik</Label>
                  <Select id="m_stat" name="stat_key" required defaultValue="goals">
                    {defs
                      .filter((d) => !d.is_derived)
                      .map((d) => (
                        <option key={d.key} value={d.key}>
                          {d.label_de}
                        </option>
                      ))}
                  </Select>
                </div>
                <div>
                  <Label htmlFor="m_value">Wert (Spieltag)</Label>
                  <Input id="m_value" name="value" type="number" inputMode="decimal" step="any" required className="num" />
                </div>
              </div>
              <p className="text-xs text-muted">Datenquelle C: Werte gelten direkt für diesen Spieltag (kein Delta). Bereits veröffentlichte Werte nur über die Tabelle korrigieren.</p>
            </ActionForm>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Imports für diesen Spieltag</CardTitle>
        </CardHeader>
        <CardContent>
          {imports.length === 0 ? (
            <Empty>Keine Imports.</Empty>
          ) : (
            <ul className="flex flex-col gap-2 text-sm">
              {imports.map((i) => (
                <li key={i.id} className="flex flex-wrap items-center justify-between gap-2 rounded-sm border border-border px-3 py-2">
                  <div className="min-w-0">
                    <div className="truncate font-semibold">{i.file_name ?? "Import"}</div>
                    <div className="text-xs text-muted">
                      {formatDateTime(i.created_at)} · {i.importer?.username ?? "–"} · {i.mode === "round" ? "Spieltagswerte" : "kumuliert"}
                      {i.notes ? ` · ${i.notes}` : ""}
                    </div>
                  </div>
                  <ImportStatusBadge status={i.status} />
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

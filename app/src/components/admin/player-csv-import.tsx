"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label, Notice } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatMillions } from "@/lib/utils";
import type { FormAction } from "@/lib/admin/result";
import type { PlayerImportRow } from "@/app/admin/actions";

export function PlayerCsvImport({ seasonId, previewAction, confirmAction }: { seasonId: string; previewAction: FormAction; confirmAction: FormAction }) {
  const [preview, runPreview, previewing] = useActionState(previewAction, undefined);
  const [result, runConfirm, confirming] = useActionState(confirmAction, undefined);
  const rows = preview?.ok ? (preview.data as PlayerImportRow[]) : null;
  const importable = rows?.filter((r) => r.errors.length === 0 && !r.duplicate) ?? [];

  return (
    <div className="flex flex-col gap-4">
      <form action={runPreview} className="flex flex-col gap-3">
        <input type="hidden" name="season_id" value={seasonId} />
        <div>
          <Label htmlFor="csv_file">CSV-Datei</Label>
          <Input id="csv_file" name="file" type="file" accept=".csv,text/csv" required className="py-2 text-sm file:mr-3 file:rounded-sm file:border-0 file:bg-surface file:px-2 file:text-text-2" />
        </div>
        <p className="text-xs text-muted">
          Spalten: <code className="text-text-2">first_name,last_name,display_name,team_short_name,position,shirt_number,market_value_m</code> – Position GK oder FIELD, Komma oder Semikolon als Trenner.
        </p>
        {preview && !preview.ok && <Notice kind="error">{preview.error}</Notice>}
        <Button type="submit" variant="secondary" size="sm" disabled={previewing}>
          {previewing ? "Wird geprüft…" : "Vorschau"}
        </Button>
      </form>

      {rows && !result?.ok && (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <Badge variant="positive">{importable.length} importierbar</Badge>
            <Badge variant="muted">{rows.filter((r) => r.duplicate).length} bereits vorhanden</Badge>
            <Badge variant="red">{rows.filter((r) => r.errors.length).length} fehlerhaft</Badge>
          </div>
          <div className="max-h-80 overflow-auto rounded-sm border border-border">
            <table className="w-full min-w-[560px] text-sm">
              <thead className="sticky top-0 bg-surface text-left text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-2 py-2">Name</th>
                  <th className="px-2 py-2">Team</th>
                  <th className="px-2 py-2">Pos</th>
                  <th className="px-2 py-2 text-right">Nr.</th>
                  <th className="px-2 py-2 text-right">Wert</th>
                  <th className="px-2 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} className="border-t border-border">
                    <td className="px-2 py-1.5">{r.display_name || "–"}</td>
                    <td className="px-2 py-1.5">{r.team_short_name}</td>
                    <td className="px-2 py-1.5">{r.position ?? "?"}</td>
                    <td className="num px-2 py-1.5 text-right">{r.shirt_number ?? "–"}</td>
                    <td className="num px-2 py-1.5 text-right">{formatMillions(r.market_value_m)}</td>
                    <td className="px-2 py-1.5 text-xs">
                      {r.errors.length ? <span className="text-red">{r.errors.join(", ")}</span> : r.duplicate ? <span className="text-muted">vorhanden, wird übersprungen</span> : <span className="text-positive">ok</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <form action={runConfirm} className="flex flex-wrap items-center gap-3">
            <input type="hidden" name="season_id" value={seasonId} />
            <input type="hidden" name="rows" value={JSON.stringify(rows)} />
            {result && !result.ok && <Notice kind="error">{result.error}</Notice>}
            <Button type="submit" size="sm" disabled={confirming || importable.length === 0}>
              {confirming ? "Importiere…" : `${importable.length} Spieler importieren`}
            </Button>
          </form>
        </div>
      )}
      {result?.ok && <Notice kind="success">{result.message}</Notice>}
    </div>
  );
}

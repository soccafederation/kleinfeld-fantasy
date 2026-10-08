"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label, Notice } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatPoints, cn } from "@/lib/utils";
import type { FormAction } from "@/lib/admin/result";

export type ReviewCell = { id: string; value: number; status: "computed" | "confirmed" | "published" | "corrected" };
export type ReviewRow = {
  seasonPlayerId: string;
  name: string;
  team: string;
  position: "GK" | "FIELD";
  needsReview: boolean;
  cells: Record<string, ReviewCell | undefined>;
};
export type ReviewCol = { key: string; label: string; short: string };

export function StatsReviewTable({ rows, cols, seasonId, roundId, correctAction }: { rows: ReviewRow[]; cols: ReviewCol[]; seasonId: string; roundId: string; correctAction: FormAction }) {
  const [sel, setSel] = useState<{ row: ReviewRow; col: ReviewCol; cell: ReviewCell } | null>(null);
  const [filter, setFilter] = useState("");
  const [state, action, pending] = useActionState(correctAction, undefined);
  const [seenState, setSeenState] = useState<typeof state>(undefined);

  if (state !== seenState) {
    setSeenState(state);
    if (state?.ok) setSel(null);
  }

  const q = filter.trim().toLowerCase();
  const visible = q ? rows.filter((r) => r.name.toLowerCase().includes(q) || r.team.toLowerCase().includes(q)) : rows;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Spieler oder Team filtern…" aria-label="Filter" className="h-9 w-full text-sm sm:w-64" />
        <span className="text-xs text-muted">
          {visible.length} Spieler · {cols.length} Statistiken · Zelle antippen zum Korrigieren
        </span>
      </div>

      {state && (state.ok ? <Notice kind="success">{state.message}</Notice> : <Notice kind="error">{state.error}</Notice>)}

      {sel && (
        <form action={action} className="flex flex-col gap-3 rounded border border-gold/50 bg-card p-3">
          <input type="hidden" name="round_stat_id" value={sel.cell.id} />
          <input type="hidden" name="season_id" value={seasonId} />
          <input type="hidden" name="round_id" value={roundId} />
          <div className="text-sm">
            <span className="font-semibold">{sel.row.name}</span> <span className="text-muted">({sel.row.team})</span> · {sel.col.label}: aktuell <span className="num">{formatPoints(sel.cell.value)}</span>
          </div>
          <div className="grid gap-3 sm:grid-cols-[140px_1fr_auto] sm:items-end">
            <div>
              <Label htmlFor="corr_value">Neuer Wert</Label>
              <Input id="corr_value" name="value" type="number" inputMode="decimal" step="any" defaultValue={sel.cell.value} required autoFocus className="num" />
            </div>
            <div>
              <Label htmlFor="corr_reason">Begründung</Label>
              <Input id="corr_reason" name="reason" required minLength={3} placeholder="z. B. Tippfehler im Protokoll" />
            </div>
            <div className="flex gap-2">
              <Button type="submit" size="md" disabled={pending}>
                {pending ? "Speichert…" : "Korrigieren"}
              </Button>
              <Button type="button" variant="ghost" onClick={() => setSel(null)}>
                Abbrechen
              </Button>
            </div>
          </div>
        </form>
      )}

      <div className="overflow-x-auto rounded-sm border border-border">
        <table className="w-full text-sm">
          <thead className="bg-surface text-left text-[11px] uppercase tracking-wide text-muted">
            <tr>
              <th className="sticky left-0 z-10 bg-surface px-2 py-2">Spieler</th>
              {cols.map((c) => (
                <th key={c.key} className="px-2 py-2 text-right" title={c.label}>
                  {c.short}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.map((r) => (
              <tr key={r.seasonPlayerId} className={cn("border-t border-border", r.needsReview && "bg-red/5")}>
                <td className="sticky left-0 z-10 max-w-[160px] bg-card px-2 py-1.5">
                  <div className="flex items-center gap-1.5">
                    <div className="min-w-0">
                      <div className="truncate font-semibold">{r.name}</div>
                      <div className="truncate text-[11px] text-muted">
                        {r.team} · {r.position}
                      </div>
                    </div>
                    {r.needsReview && <Badge variant="red">?</Badge>}
                  </div>
                </td>
                {cols.map((c) => {
                  const cell = r.cells[c.key];
                  if (!cell) return <td key={c.key} className="px-2 py-1.5 text-right text-muted-2">–</td>;
                  const active = sel?.cell.id === cell.id;
                  return (
                    <td key={c.key} className="p-0 text-right">
                      <button
                        type="button"
                        onClick={() => setSel({ row: r, col: c, cell })}
                        className={cn(
                          "num h-10 w-full min-w-[52px] px-2 text-right hover:bg-card-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/70",
                          active && "bg-gold/15 text-gold",
                          cell.status === "corrected" && "text-red",
                          cell.status === "published" && "text-positive",
                        )}
                        title={`${c.label} · ${cell.status}`}
                      >
                        {formatPoints(cell.value)}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap gap-3 text-[11px] text-muted">
        <span>
          <span className="text-positive">grün</span> veröffentlicht
        </span>
        <span>
          <span className="text-red">rot</span> korrigiert
        </span>
        <span>
          <Badge variant="red">?</Badge> unscharfe Namenszuordnung
        </span>
      </div>
    </div>
  );
}

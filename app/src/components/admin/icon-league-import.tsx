"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Label, Notice, Select } from "@/components/ui/input";
import { importIconLeagueRoundAction, type IconLeagueImportResult } from "@/app/admin/icon-league-actions";

type Round = { id: string; number: number; name: string; status: string };

/** Spieltag direkt von der Icon League holen: erst prüfen, dann eintragen und berechnen. */
export function IconLeagueImport({ seasonId, rounds, defaultRoundId }: { seasonId: string; rounds: Round[]; defaultRoundId?: string }) {
  const [state, action, pending] = useActionState(importIconLeagueRoundAction, undefined);
  const r = state?.data as IconLeagueImportResult | undefined;
  const checked = !!state?.ok && r?.mode === "check";

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="season_id" value={seasonId} />
      <div>
        <Label htmlFor="il_round">Spieltag</Label>
        <Select id="il_round" name="round_id" defaultValue={defaultRoundId ?? ""} required>
          {rounds.map((x) => (
            <option key={x.id} value={x.id}>
              {x.number} · {x.name} ({x.status})
            </option>
          ))}
        </Select>
      </div>

      {state && (
        <Notice kind={state.ok ? (r?.mode === "apply" ? "success" : "info") : "error"}>
          <strong className="block">{state.ok ? state.message : state.error}</strong>
          {r && (
            <div className="mt-2 flex flex-col gap-1.5 text-xs text-text-2">
              {r.topScorers.length > 0 && (
                <div>
                  Top: {r.topScorers.map((t) => `${t.name} ${t.goals} T / ${t.assists} V`).join(" · ")}
                </div>
              )}
              {r.unmatched.length > 0 && <div>Nicht im Kader, wird ignoriert: {r.unmatched.join(", ")}</div>}
              {r.clamped.length > 0 && <div className="text-red">Negative Differenz auf 0 gesetzt: {r.clamped.join(", ")}</div>}
              {r.mode === "check" && r.existingRows > 0 && <div className="text-red">Für diesen Spieltag sind schon {r.existingRows} Werte gespeichert. Sie werden beim Eintragen ersetzt.</div>}
            </div>
          )}
        </Notice>
      )}

      <div className="flex flex-wrap gap-2">
        <Button type="submit" name="mode" value="check" variant={checked ? "secondary" : "primary"} disabled={pending}>
          {pending ? "Bitte warten…" : "1 · Prüfen"}
        </Button>
        <Button type="submit" name="mode" value="apply" variant={checked ? "primary" : "secondary"} disabled={pending || !checked}>
          2 · Eintragen &amp; berechnen
        </Button>
      </div>
      <p className="text-xs text-muted">
        Holt die Saisonwerte von theiconleague.com und zieht die bereits erfassten Spieltage ab. Erfasst werden nur Spieler mit neuem Einsatz. Danach werden Punkte und Ranking berechnet.
      </p>
    </form>
  );
}

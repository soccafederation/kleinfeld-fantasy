"use client";

import { AlertCircle, Check, Crown, Loader2 } from "lucide-react";
import { PlayerAvatar } from "@/components/fantasy/player-avatar";
import { cn, formatPoints } from "@/lib/utils";
import type { PlayerRow } from "@/lib/data/season";
import { SLOT_LABEL, type Draft } from "./draft";

/** Kapitänswahl: alle Starter als Liste, der Kapitän ist gold markiert. */
export function CaptainSection({
  draft,
  byId,
  multiplier,
  onPick,
  disabled,
}: {
  draft: Draft;
  byId: Map<string, PlayerRow>;
  multiplier: number;
  onPick: (id: string) => void;
  disabled?: boolean;
}) {
  const starters = draft.players
    .filter((p) => p.slot !== "BENCH")
    .sort((a, b) => a.slot.localeCompare(b.slot) || a.slot_order - b.slot_order)
    .map((p) => byId.get(p.season_player_id))
    .filter((p): p is PlayerRow => !!p);

  if (starters.length === 0) {
    return <p className="text-sm text-muted">Wähle zuerst deine Startelf – dann bestimmst du hier den Kapitän ({formatPoints(multiplier)}× Punkte).</p>;
  }
  return (
    <div className="space-y-1.5">
      <p className="text-xs text-muted">Dein Kapitän bekommt {formatPoints(multiplier)}× Punkte. Nur Starter sind wählbar.</p>
      <ul className="grid gap-1.5 sm:grid-cols-2">
        {starters.map((p) => {
          const active = draft.captain === p.id;
          return (
            <li key={p.id}>
              <button
                type="button"
                disabled={disabled}
                onClick={() => onPick(p.id)}
                aria-pressed={active}
                className={cn(
                  "flex min-h-[52px] w-full items-center gap-3 rounded border px-3 py-2 text-left transition-colors",
                  active ? "border-gold bg-gold/10" : "border-border bg-surface hover:bg-card-hover",
                )}
              >
                <PlayerAvatar name={p.player.display_name} imageUrl={p.player.image_url} size={36} isCaptain={active} ring={active ? "gold" : "none"} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{p.player.display_name}</span>
                  <span className="block text-xs text-muted">
                    {p.team.club.short_name} · Ø {formatPoints(p.stats.avg_points)}
                  </span>
                </span>
                {active ? <Crown className="h-4 w-4 text-gold" /> : <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">Wählen</span>}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** Zusammenfassung: fehlende Plätze, Kapitän, Serverfehler. */
export function SummaryList({
  missing,
  errors,
  captain,
  complete,
  validating,
}: {
  missing: Record<"GK" | "FIELD" | "BENCH", number>;
  errors: string[];
  captain: boolean;
  complete: boolean;
  validating: boolean;
}) {
  const missingItems = (Object.keys(missing) as Array<keyof typeof missing>).filter((k) => missing[k] > 0);
  const allGood = complete && captain && errors.length === 0;
  return (
    <ul className="space-y-1.5 text-sm">
      {missingItems.map((k) => (
        <Row key={k} ok={false}>
          Noch {missing[k]} {k === "GK" ? SLOT_LABEL.GK : k === "FIELD" ? SLOT_LABEL.FIELD : "Ersatzspieler"} wählen
        </Row>
      ))}
      {complete && <Row ok>Kader vollständig</Row>}
      {complete && <Row ok={captain}>{captain ? "Kapitän bestimmt" : "Kapitän fehlt"}</Row>}
      {errors.map((e) => (
        <Row key={e} ok={false}>
          {e}
        </Row>
      ))}
      {allGood && (
        <Row ok>
          Alles bereit
          {validating && <Loader2 className="ml-1 inline h-3.5 w-3.5 animate-spin text-muted" />}
        </Row>
      )}
    </ul>
  );
}

function Row({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return (
    <li className={cn("flex items-start gap-2", ok ? "text-text-2" : "text-text")}>
      {ok ? <Check className="mt-0.5 h-4 w-4 shrink-0 text-positive" /> : <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red" />}
      <span>{children}</span>
    </li>
  );
}

/** Transferzähler aus dem Dry-Run: "Freie Transfers übrig: X von N · Abzug −P Punkte". */
export function TransferCounter({ transfers, free, penalty, penaltyEach }: { transfers: number; free: number; penalty: number; penaltyEach: number }) {
  const left = Math.max(0, free - transfers);
  return (
    <div className={cn("mt-3 flex items-center justify-between rounded border px-3 py-2 text-sm", penalty > 0 ? "border-red/50 bg-red/10" : "border-border bg-surface")}>
      <span>
        Freie Transfers übrig: <span className="num">{left}</span> von {free}
      </span>
      <span className={cn("num", penalty > 0 ? "text-red" : "text-muted")}>
        {penalty > 0 ? `Abzug −${formatPoints(penalty)} Punkte` : `je weiterer −${formatPoints(penaltyEach)}`}
      </span>
    </div>
  );
}

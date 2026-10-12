import Link from "next/link";
import { cn, formatMillions, formatPoints } from "@/lib/utils";
import { PlayerAvatar } from "./player-avatar";

export type PitchPlayer = {
  id: string;
  name: string;
  shortName: string; // Nachname
  club: string;
  imageUrl?: string | null;
  slot: "GK" | "FIELD" | "BENCH";
  slotOrder: number;
  points?: number | null;
  value?: number;
  isCaptain?: boolean;
  href?: string;
  onClickId?: string;
};

/**
 * Stilisiertes Kleinfeld (1 TW + 4 Feld) + Bank darunter.
 * Rein darstellend; Interaktion über `renderSlot` (Team Builder) oder Links (Profil).
 */
export function Pitch({
  players,
  emptySlots,
  renderAction,
  compact,
  pointsLabel = "PTS",
  className,
}: {
  players: PitchPlayer[];
  emptySlots?: { GK: number; FIELD: number; BENCH: number };
  renderAction?: (slot: "GK" | "FIELD" | "BENCH", index: number, player?: PitchPlayer) => React.ReactNode;
  compact?: boolean;
  pointsLabel?: string;
  className?: string;
}) {
  const of = (slot: PitchPlayer["slot"]) => players.filter((p) => p.slot === slot);
  const gkAll = of("GK");
  const fieldAll = of("FIELD");
  const benchAll = of("BENCH");
  const nGK = emptySlots?.GK ?? Math.max(1, gkAll.length);
  const nField = emptySlots?.FIELD ?? Math.max(4, fieldAll.length);
  const nBench = emptySlots?.BENCH ?? Math.max(2, benchAll.length);
  // Jeder Spieler steht auf dem Platz mit seinem slotOrder (0-basiert) – so passt der angetippte
  // Platz immer zu dem Platz, auf den der Team Builder setzt. Ausreißer füllen freie Plätze auf.
  const gk = placeBySlotOrder(gkAll, nGK);
  const field = placeBySlotOrder(fieldAll, nField);
  const bench = placeBySlotOrder(benchAll, nBench);

  const slotEl = (slot: "GK" | "FIELD" | "BENCH", i: number, p?: PitchPlayer) => {
    if (renderAction) return <div key={`${slot}-${i}`}>{renderAction(slot, i, p)}</div>;
    return <PitchSlot key={`${slot}-${i}`} player={p} compact={compact} pointsLabel={pointsLabel} />;
  };

  const rowTop = field.slice(0, Math.ceil(nField / 2));
  const rowBottom = field.slice(Math.ceil(nField / 2));

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="relative overflow-hidden rounded-lg border border-white/10 bg-pitch" style={{ minHeight: compact ? 220 : 300 }}>
        {/* Linien */}
        <div aria-hidden className="pointer-events-none absolute inset-3 rounded-[3px] border border-white/15" />
        <div aria-hidden className="pointer-events-none absolute left-3 right-3 top-1/2 h-px bg-white/15" />
        <div aria-hidden className="pointer-events-none absolute left-1/2 top-1/2 h-14 w-14 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/15" />
        <div aria-hidden className="pointer-events-none absolute bottom-3 left-1/2 h-9 w-32 -translate-x-1/2 border border-b-0 border-white/15" />
        <div aria-hidden className="pointer-events-none absolute top-3 left-1/2 h-9 w-32 -translate-x-1/2 border border-t-0 border-white/15" />

        <div className="relative flex h-full flex-col justify-between gap-4 px-4 py-5" style={{ minHeight: compact ? 220 : 300 }}>
          <div className="flex justify-around">{rowTop.map((p, i) => slotEl("FIELD", i, p))}</div>
          <div className="flex justify-around">{rowBottom.map((p, i) => slotEl("FIELD", i + rowTop.length, p))}</div>
          <div className="flex justify-center">{Array.from({ length: nGK }, (_, i) => slotEl("GK", i, gk[i]))}</div>
        </div>
      </div>
      <div className="flex items-center gap-3 rounded border border-border bg-surface px-3 py-2">
        <span className="eyebrow text-muted">Bank</span>
        <div className="flex flex-1 justify-around">{Array.from({ length: nBench }, (_, i) => slotEl("BENCH", i, bench[i]))}</div>
      </div>
    </div>
  );
}

function placeBySlotOrder(list: PitchPlayer[], n: number): (PitchPlayer | undefined)[] {
  const out: (PitchPlayer | undefined)[] = Array.from({ length: Math.max(n, list.length) }, () => undefined);
  const rest: PitchPlayer[] = [];
  for (const p of [...list].sort((a, b) => a.slotOrder - b.slotOrder)) {
    if (p.slotOrder >= 0 && p.slotOrder < out.length && !out[p.slotOrder]) out[p.slotOrder] = p;
    else rest.push(p);
  }
  for (const p of rest) {
    const free = out.findIndex((x) => !x);
    if (free >= 0) out[free] = p;
  }
  return out;
}

export function PitchSlot({ player, compact, pointsLabel = "PTS", onClick }: { player?: PitchPlayer; compact?: boolean; pointsLabel?: string; onClick?: () => void }) {
  const size = compact ? 40 : 52;
  if (!player) {
    return (
      <button type="button" onClick={onClick} className="flex w-[72px] flex-col items-center gap-1 text-muted-2" aria-label="Leerer Platz">
        <span className="flex items-center justify-center rounded-sm border-2 border-dashed border-border-strong" style={{ width: size, height: size }}>
          +
        </span>
        <span className="text-[10px] uppercase tracking-wider">frei</span>
      </button>
    );
  }
  const inner = (
    <>
      <PlayerAvatar name={player.name} imageUrl={player.imageUrl} size={size} isCaptain={player.isCaptain} ring={player.isCaptain ? "gold" : "none"} />
      <span className="max-w-[76px] truncate text-[10px] font-semibold uppercase tracking-wide text-text-2">{player.shortName}</span>
      {player.points != null ? (
        <span className="num text-xs text-gold">
          {formatPoints(player.points)} <span className="text-[9px] text-muted">{pointsLabel}</span>
        </span>
      ) : player.value != null ? (
        <span className="num text-xs text-text-2">{formatMillions(player.value)}</span>
      ) : null}
    </>
  );
  const cls = "flex w-[72px] flex-col items-center gap-1 text-center";
  if (onClick) return <button type="button" onClick={onClick} className={cls}>{inner}</button>;
  if (player.href) return <Link href={player.href} className={cls}>{inner}</Link>;
  return <div className={cls}>{inner}</div>;
}

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
  const gk = players.filter((p) => p.slot === "GK").sort((a, b) => a.slotOrder - b.slotOrder);
  const field = players.filter((p) => p.slot === "FIELD").sort((a, b) => a.slotOrder - b.slotOrder);
  const bench = players.filter((p) => p.slot === "BENCH").sort((a, b) => a.slotOrder - b.slotOrder);
  const nGK = emptySlots?.GK ?? Math.max(1, gk.length);
  const nField = emptySlots?.FIELD ?? Math.max(4, field.length);
  const nBench = emptySlots?.BENCH ?? Math.max(2, bench.length);

  const slotEl = (slot: "GK" | "FIELD" | "BENCH", i: number, p?: PitchPlayer) => {
    if (renderAction) return <div key={`${slot}-${i}`}>{renderAction(slot, i, p)}</div>;
    return <PitchSlot key={`${slot}-${i}`} player={p} compact={compact} pointsLabel={pointsLabel} />;
  };

  const fieldRows = nField <= 4 ? [field.slice(0, 2), field.slice(2, 4)] : [field.slice(0, 3), field.slice(3)];
  const fieldSlots = Array.from({ length: nField }, (_, i) => field[i]);
  const rowTop = fieldSlots.slice(0, Math.ceil(nField / 2));
  const rowBottom = fieldSlots.slice(Math.ceil(nField / 2));
  void fieldRows;

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="relative overflow-hidden rounded-lg border border-[#1e3327] bg-pitch" style={{ minHeight: compact ? 220 : 300 }}>
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

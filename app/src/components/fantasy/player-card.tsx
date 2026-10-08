"use client";

import { PlayerAvatar } from "@/components/fantasy/player-avatar";
import { Badge } from "@/components/ui/badge";
import { cn, formatMillions, formatPoints } from "@/lib/utils";
import type { PlayerRow } from "@/lib/data/season";

export const POSITION_SHORT: Record<PlayerRow["position"], string> = { GK: "TW", FIELD: "Feld" };

export function StatusBadge({ status, className }: { status: PlayerRow["status"]; className?: string }) {
  if (status === "active") return null;
  const label = status === "injured" ? "Verletzt" : status === "unavailable" ? "Nicht verfügbar" : "Abgang";
  return (
    <Badge variant={status === "left" ? "muted" : "red"} className={className}>
      {label}
    </Badge>
  );
}

/**
 * Kompakte Spielerzeile für Markt, Spielerwahl und Vergleich.
 * Rein darstellend; Klick-Verhalten kommt über `onClick`/`href` von außen.
 */
export function PlayerCard({
  player,
  onClick,
  disabled,
  disabledReason,
  selected,
  trailing,
  showValueRatio = true,
  className,
}: {
  player: PlayerRow;
  onClick?: () => void;
  disabled?: boolean;
  disabledReason?: string;
  selected?: boolean;
  trailing?: React.ReactNode;
  showValueRatio?: boolean;
  className?: string;
}) {
  const s = player.stats;
  const inner = (
    <>
      <PlayerAvatar name={player.player.display_name} imageUrl={player.player.image_url} size={44} ring={selected ? "gold" : "none"} />
      <div className="min-w-0 flex-1 text-left">
        <div className="flex items-center gap-2">
          <span className="truncate text-[15px] font-semibold leading-tight">{player.player.display_name}</span>
          <StatusBadge status={player.status} />
        </div>
        <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted">
          <span className="truncate">{player.team.club.short_name}</span>
          <span aria-hidden>·</span>
          <span>{POSITION_SHORT[player.position]}</span>
          {player.shirt_number != null && (
            <>
              <span aria-hidden>·</span>
              <span className="num">#{player.shirt_number}</span>
            </>
          )}
        </div>
        {disabled && disabledReason && <div className="mt-1 text-[11px] font-semibold uppercase tracking-wider text-red">{disabledReason}</div>}
      </div>
      <div className="grid shrink-0 grid-cols-3 gap-3 text-right">
        <Metric label="Wert" value={formatMillions(player.market_value_m)} />
        <Metric label="PTS" value={formatPoints(s.total_points)} gold />
        {showValueRatio ? <Metric label="P/Mio" value={formatPoints(s.points_per_m)} /> : <Metric label="Ø" value={formatPoints(s.avg_points)} />}
      </div>
      {trailing}
    </>
  );
  const cls = cn(
    "flex w-full min-h-[64px] items-center gap-3 rounded border border-border bg-card px-3 py-2.5 transition-colors",
    onClick && !disabled && "hover:bg-card-hover active:bg-card-hover",
    selected && "border-gold",
    disabled && "opacity-50",
    className,
  );
  if (onClick) {
    return (
      <button type="button" onClick={onClick} disabled={disabled} aria-disabled={disabled} className={cn(cls, "disabled:cursor-not-allowed")}>
        {inner}
      </button>
    );
  }
  return <div className={cls}>{inner}</div>;
}

export function Metric({ label, value, gold, className }: { label: string; value: string; gold?: boolean; className?: string }) {
  return (
    <div className={cn("min-w-[40px]", className)}>
      <div className="text-[9px] uppercase tracking-[0.12em] text-muted">{label}</div>
      <div className={cn("num text-sm", gold && "text-gold")}>{value}</div>
    </div>
  );
}

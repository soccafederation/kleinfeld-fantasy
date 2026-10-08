"use client";

import Link from "next/link";
import { PlayerAvatar } from "@/components/fantasy/player-avatar";
import { Sheet } from "@/components/fantasy/team-builder/sheet";
import { Button } from "@/components/ui/button";
import { cn, formatMillions, formatPoints } from "@/lib/utils";
import type { PlayerRow } from "@/lib/data/season";

type Row = { label: string; get: (p: PlayerRow) => number; format: (n: number) => string; lowerIsBetter?: boolean };

const ROWS: Row[] = [
  { label: "Marktwert", get: (p) => p.market_value_m, format: formatMillions, lowerIsBetter: true },
  { label: "Gesamtpunkte", get: (p) => p.stats.total_points, format: formatPoints },
  { label: "Ø Punkte", get: (p) => p.stats.avg_points, format: formatPoints },
  { label: "Tore", get: (p) => p.stats.goals, format: formatPoints },
  { label: "Assists", get: (p) => p.stats.assists, format: formatPoints },
  { label: "Form (letzte 3)", get: (p) => p.stats.form3, format: formatPoints },
  { label: "Punkte/Mio", get: (p) => p.stats.points_per_m, format: formatPoints },
];

/** Zwei Spieler nebeneinander; der bessere Wert je Zeile ist gold. */
export function PlayerCompare({
  players,
  open,
  onOpenChange,
  teamCount,
}: {
  players: [PlayerRow, PlayerRow] | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  teamCount?: number;
}) {
  return (
    <Sheet open={open && !!players} onOpenChange={onOpenChange} title="Vergleich" description="Besserer Wert je Zeile ist gold markiert">
      {players && (
        <div className="space-y-4">
          <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-2">
            {players.map((p, i) => (
              <Head key={p.id} player={p} align={i === 0 ? "left" : "right"} teamCount={teamCount} />
            ))}
          </div>
          <table className="w-full text-sm">
            <tbody>
              {ROWS.map((row) => {
                const a = row.get(players[0]);
                const b = row.get(players[1]);
                const aWins = a !== b && (row.lowerIsBetter ? a < b : a > b);
                const bWins = a !== b && !aWins;
                return (
                  <tr key={row.label} className="border-t border-border">
                    <td className={cn("num py-2.5 text-left text-base", aWins ? "text-gold" : "text-text-2")}>{row.format(a)}</td>
                    <td className="px-2 py-2.5 text-center text-[11px] uppercase tracking-wider text-muted">{row.label}</td>
                    <td className={cn("num py-2.5 text-right text-base", bWins ? "text-gold" : "text-text-2")}>{row.format(b)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="grid grid-cols-2 gap-2">
            {players.map((p) => (
              <Button key={p.id} asChild variant="secondary" size="sm">
                <Link href={`/app/players/${p.id}`}>Profil {p.player.last_name || p.player.display_name}</Link>
              </Button>
            ))}
          </div>
        </div>
      )}
    </Sheet>
  );
}

function Head({ player, align, teamCount }: { player: PlayerRow; align: "left" | "right"; teamCount?: number }) {
  const pct = teamCount && teamCount > 0 ? Math.min(100, Math.round((player.stats.owned_by / teamCount) * 100)) : null;
  return (
    <div className={cn("flex min-w-0 flex-col gap-1.5", align === "right" ? "col-start-3 items-end text-right" : "items-start")}>
      <PlayerAvatar name={player.player.display_name} imageUrl={player.player.image_url} size={56} />
      <div className="w-full truncate text-sm font-semibold">{player.player.display_name}</div>
      <div className="text-xs text-muted">
        {player.team.club.short_name} · {player.position === "GK" ? "TW" : "Feld"}
      </div>
      {pct !== null && <div className="text-[11px] text-muted">in {pct} % der Teams</div>}
    </div>
  );
}

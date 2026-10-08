"use client";

import Link from "next/link";
import { ArrowLeftRight, ArrowRightLeft, ChevronRight, Crown, Trash2 } from "lucide-react";
import { PlayerAvatar } from "@/components/fantasy/player-avatar";
import { Metric, StatusBadge, POSITION_SHORT } from "@/components/fantasy/player-card";
import { Button } from "@/components/ui/button";
import { Sheet } from "./sheet";
import { swapCandidates, type Draft } from "./draft";
import { formatMillions, formatPoints } from "@/lib/utils";
import type { PlayerRow } from "@/lib/data/season";

/** Aktionen für einen Spieler im Kader: Kapitän, Bank-Tausch, Transfer, Entfernen. */
export function PlayerActionSheet({
  playerId,
  onOpenChange,
  draft,
  byId,
  locked,
  onCaptain,
  onSwap,
  onTransfer,
  onRemove,
}: {
  playerId: string | null;
  onOpenChange: (o: boolean) => void;
  draft: Draft;
  byId: Map<string, PlayerRow>;
  locked: boolean;
  onCaptain: (id: string) => void;
  onSwap: (a: string, b: string) => void;
  onTransfer: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  const player = playerId ? byId.get(playerId) : undefined;
  const entry = playerId ? draft.players.find((p) => p.season_player_id === playerId) : undefined;
  const open = !!player && !!entry;
  const candidates = player && entry ? swapCandidates(draft, player.id, byId) : [];
  const isStarter = entry?.slot !== "BENCH";
  const isCaptain = draft.captain === playerId;

  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={player?.player.display_name ?? ""} description={player ? `${player.team.club.name} · ${POSITION_SHORT[player.position]}` : undefined}>
      {player && entry && (
        <div className="space-y-4">
          <div className="flex items-center gap-4 rounded border border-border bg-surface p-3">
            <PlayerAvatar name={player.player.display_name} imageUrl={player.player.image_url} size={64} isCaptain={isCaptain} ring={isCaptain ? "gold" : "none"} />
            <div className="grid flex-1 grid-cols-3 gap-2">
              <Metric label="Wert" value={formatMillions(player.market_value_m)} />
              <Metric label="PTS" value={formatPoints(player.stats.total_points)} gold />
              <Metric label="Ø" value={formatPoints(player.stats.avg_points)} />
              <Metric label="Form (3)" value={formatPoints(player.stats.form3)} />
              <Metric label="Tore" value={formatPoints(player.stats.goals)} />
              <Metric label="Assists" value={formatPoints(player.stats.assists)} />
            </div>
          </div>
          <div className="flex items-center justify-between text-xs text-muted">
            <span>
              Platz: {entry.slot === "BENCH" ? "Bank" : "Startelf"} <StatusBadge status={player.status} className="ml-2" />
            </span>
            <Link href={`/app/players/${player.id}`} className="inline-flex h-11 items-center gap-1 font-semibold text-gold hover:text-gold-hover">
              Profil <ChevronRight className="h-4 w-4" />
            </Link>
          </div>

          {locked ? (
            <p className="text-sm text-muted">Die Deadline ist abgelaufen – Änderungen sind erst zum nächsten Spieltag möglich.</p>
          ) : (
            <div className="space-y-2">
              {isStarter && !isCaptain && (
                <ActionRow icon={Crown} label="Zum Kapitän machen" hint="Doppelte Punkte am Spieltag" onClick={() => onCaptain(player.id)} />
              )}
              {isStarter && isCaptain && <p className="px-1 text-sm text-gold">Aktueller Kapitän</p>}
              {candidates.map((c) => {
                const other = byId.get(c.season_player_id)!;
                return (
                  <ActionRow
                    key={c.season_player_id}
                    icon={isStarter ? ArrowRightLeft : ArrowLeftRight}
                    label={isStarter ? `Auf die Bank · ${other.player.display_name} rein` : `In die Startelf · ${other.player.display_name} raus`}
                    hint={`${other.team.club.short_name} · ${formatPoints(other.stats.total_points)} PTS`}
                    onClick={() => onSwap(player.id, c.season_player_id)}
                  />
                );
              })}
              <ActionRow icon={ArrowLeftRight} label="Transfer: ersetzen" hint="Anderen Spieler für diesen Platz wählen" onClick={() => onTransfer(player.id)} />
              <ActionRow icon={Trash2} label="Aus dem Kader entfernen" hint="Platz wird frei" onClick={() => onRemove(player.id)} danger />
            </div>
          )}
        </div>
      )}
    </Sheet>
  );
}

function ActionRow({ icon: Icon, label, hint, onClick, danger }: { icon: typeof Crown; label: string; hint?: string; onClick: () => void; danger?: boolean }) {
  return (
    <Button variant="secondary" onClick={onClick} className="h-auto min-h-[52px] w-full justify-start gap-3 px-3 py-2 text-left normal-case tracking-normal">
      <Icon className={danger ? "text-red" : "text-gold"} />
      <span className="flex min-w-0 flex-col items-start font-sans">
        <span className={danger ? "font-semibold text-red" : "font-semibold"}>{label}</span>
        {hint && <span className="text-xs font-normal text-muted">{hint}</span>}
      </span>
    </Button>
  );
}

"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Input, Select } from "@/components/ui/input";
import { PlayerCard } from "@/components/fantasy/player-card";
import { Sheet } from "./sheet";
import { eligibility, totalValue, SLOT_LABEL, type Draft, type SlotRef } from "./draft";
import { cn, formatMillions } from "@/lib/utils";
import type { PlayerRow } from "@/lib/data/season";
import type { SeasonRules } from "@/lib/rules";

type SortKey = "total_points" | "avg_points" | "market_value_m" | "points_per_m";
const SORTS: Array<{ key: SortKey; label: string }> = [
  { key: "total_points", label: "Punkte" },
  { key: "avg_points", label: "Ø Punkte" },
  { key: "market_value_m", label: "Marktwert" },
  { key: "points_per_m", label: "Punkte/Mio" },
];

function sortValue(p: PlayerRow, key: SortKey) {
  return key === "market_value_m" ? p.market_value_m : p.stats[key];
}

/** Spielerwahl für einen Kaderplatz. Nicht wählbare Spieler bleiben sichtbar, aber deaktiviert mit Grund. */
export function PlayerPicker({
  open,
  onOpenChange,
  slotRef,
  draft,
  players,
  byId,
  rules,
  onPick,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  slotRef: SlotRef | null;
  draft: Draft;
  players: PlayerRow[];
  byId: Map<string, PlayerRow>;
  rules: SeasonRules;
  onPick: (playerId: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("total_points");
  const [club, setClub] = useState<string>("all");

  const replacing = useMemo(() => {
    if (!slotRef) return null;
    return draft.players.find((p) => p.slot === slotRef.slot && p.slot_order === slotRef.index)?.season_player_id ?? null;
  }, [draft, slotRef]);

  const remaining = rules.budget_m - totalValue(draft, byId) + (replacing ? (byId.get(replacing)?.market_value_m ?? 0) : 0);

  const clubs = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of players) m.set(p.team.club.id, p.team.club.short_name);
    return [...m.entries()].sort((a, b) => a[1].localeCompare(b[1], "de"));
  }, [players]);

  const list = useMemo(() => {
    if (!slotRef) return [];
    const q = query.trim().toLowerCase();
    return players
      .filter((p) => slotRef.slot === "BENCH" || p.position === slotRef.slot)
      .filter((p) => club === "all" || p.team.club.id === club)
      .filter((p) => !q || p.player.display_name.toLowerCase().includes(q) || p.team.club.name.toLowerCase().includes(q) || p.team.club.short_name.toLowerCase().includes(q))
      .map((p) => ({ p, el: eligibility(p, slotRef, draft, rules, byId, replacing) }))
      .sort((a, b) => {
        if (a.el.ok !== b.el.ok) return a.el.ok ? -1 : 1;
        return sortValue(b.p, sort) - sortValue(a.p, sort);
      });
  }, [players, slotRef, club, query, sort, draft, rules, byId, replacing]);

  if (!slotRef) return null;
  const title = slotRef.slot === "BENCH" ? `Bank ${slotRef.index + 1}` : slotRef.slot === "GK" ? SLOT_LABEL.GK : `${SLOT_LABEL.FIELD} ${slotRef.index + 1}`;

  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={title} description={`Noch ${formatMillions(remaining)} Budget für diesen Platz`}>
      <div className="sticky top-0 z-10 -mx-4 space-y-2 bg-card px-4 pb-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Spieler oder Club suchen" className="pl-9" aria-label="Spieler suchen" />
        </div>
        <div className="flex gap-2">
          <Select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} aria-label="Sortierung" className="flex-1">
            {SORTS.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </Select>
          <Select value={club} onChange={(e) => setClub(e.target.value)} aria-label="Club" className="flex-1">
            <option value="all">Alle Clubs</option>
            {clubs.map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </Select>
        </div>
      </div>
      <ul className="space-y-2">
        {list.map(({ p, el }) => (
          <li key={p.id}>
            <PlayerCard
              player={p}
              onClick={() => onPick(p.id)}
              disabled={!el.ok}
              disabledReason={el.ok ? undefined : el.reason}
              selected={p.id === replacing}
              className={cn(p.id === replacing && "bg-surface")}
            />
          </li>
        ))}
        {list.length === 0 && <li className="py-8 text-center text-sm text-muted">Keine Spieler gefunden.</li>}
      </ul>
    </Sheet>
  );
}

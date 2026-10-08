"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, GitCompareArrows, Search, X } from "lucide-react";
import { PlayerAvatar } from "@/components/fantasy/player-avatar";
import { PlayerCard, StatusBadge, POSITION_SHORT } from "@/components/fantasy/player-card";
import { PlayerCompare } from "@/components/fantasy/player-compare";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { cn, formatMillions, formatPoints } from "@/lib/utils";
import type { PlayerRow } from "@/lib/data/season";

type SortKey = "total_points" | "avg_points" | "market_value_m" | "points_per_m" | "goals" | "assists" | "form3";
const SORTS: Array<{ key: SortKey; label: string; short: string }> = [
  { key: "total_points", label: "Gesamtpunkte", short: "PTS" },
  { key: "avg_points", label: "Ø Punkte", short: "Ø" },
  { key: "market_value_m", label: "Marktwert", short: "Wert" },
  { key: "points_per_m", label: "Punkte/Mio", short: "P/Mio" },
  { key: "goals", label: "Tore", short: "Tore" },
  { key: "assists", label: "Assists", short: "Ass." },
  { key: "form3", label: "Form (letzte 3)", short: "Form" },
];
const STATUS_OPTIONS: Array<{ value: "all" | PlayerRow["status"]; label: string }> = [
  { value: "all", label: "Alle Status" },
  { value: "active", label: "Fit" },
  { value: "injured", label: "Verletzt" },
  { value: "unavailable", label: "Nicht verfügbar" },
];

function sortValue(p: PlayerRow, key: SortKey) {
  return key === "market_value_m" ? p.market_value_m : p.stats[key];
}

function useDebounced<T>(value: T, ms: number) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

/** Spielermarkt: Filter, Sortierung, Karten (mobil) / Tabelle (Desktop), Vergleichsmodus. */
export function PlayerList({ players, teamCount, myPlayerIds = [] }: { players: PlayerRow[]; teamCount: number; myPlayerIds?: string[] }) {
  const router = useRouter();
  const [queryRaw, setQueryRaw] = useState("");
  const query = useDebounced(queryRaw, 250);
  const [clubs, setClubs] = useState<Set<string>>(() => new Set());
  const [position, setPosition] = useState<"all" | PlayerRow["position"]>("all");
  const [maxValue, setMaxValue] = useState<number | null>(null);
  const [status, setStatus] = useState<"all" | PlayerRow["status"]>("all");
  const [sort, setSort] = useState<SortKey>("total_points");
  const [compareMode, setCompareMode] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);
  const [compareOpen, setCompareOpen] = useState(false);
  const mine = useMemo(() => new Set(myPlayerIds), [myPlayerIds]);

  const clubOptions = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of players) m.set(p.team.club.id, p.team.club.short_name);
    return [...m.entries()].sort((a, b) => a[1].localeCompare(b[1], "de"));
  }, [players]);

  const valueSteps = useMemo(() => {
    const max = Math.max(0, ...players.map((p) => p.market_value_m));
    const steps: number[] = [];
    for (let v = 5; v < max; v += 2.5) steps.push(v);
    return steps;
  }, [players]);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return players
      .filter((p) => position === "all" || p.position === position)
      .filter((p) => clubs.size === 0 || clubs.has(p.team.club.id))
      .filter((p) => maxValue === null || p.market_value_m <= maxValue)
      .filter((p) => status === "all" || p.status === status)
      .filter((p) => !q || p.player.display_name.toLowerCase().includes(q) || p.team.club.name.toLowerCase().includes(q) || p.team.club.short_name.toLowerCase().includes(q))
      .sort((a, b) => sortValue(b, sort) - sortValue(a, sort) || a.player.display_name.localeCompare(b.player.display_name, "de"));
  }, [players, position, clubs, maxValue, status, query, sort]);

  const toggleClub = (id: string) =>
    setClubs((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const byId = useMemo(() => new Map(players.map((p) => [p.id, p])), [players]);
  const comparePair = picked.length === 2 ? ([byId.get(picked[0])!, byId.get(picked[1])!] as [PlayerRow, PlayerRow]) : null;

  const onRow = (p: PlayerRow) => {
    if (!compareMode) {
      router.push(`/app/players/${p.id}`);
      return;
    }
    if (picked.includes(p.id)) {
      setPicked(picked.filter((x) => x !== p.id));
      return;
    }
    const next = [...picked, p.id].slice(-2);
    setPicked(next);
    if (next.length === 2) setCompareOpen(true);
  };

  const ownership = (p: PlayerRow) => (teamCount > 0 ? `${Math.min(100, Math.round((p.stats.owned_by / teamCount) * 100))} %` : "–");
  const activeFilters = (position !== "all" ? 1 : 0) + clubs.size + (maxValue !== null ? 1 : 0) + (status !== "all" ? 1 : 0);

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <Input value={queryRaw} onChange={(e) => setQueryRaw(e.target.value)} placeholder="Spieler oder Club suchen" className="pl-9" aria-label="Spieler suchen" />
      </div>

      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <Select value={position} onChange={(e) => setPosition(e.target.value as typeof position)} aria-label="Position">
          <option value="all">Alle Positionen</option>
          <option value="GK">Torwart</option>
          <option value="FIELD">Feldspieler</option>
        </Select>
        <Select value={maxValue ?? ""} onChange={(e) => setMaxValue(e.target.value ? Number(e.target.value) : null)} aria-label="Maximaler Marktwert">
          <option value="">Jeder Preis</option>
          {valueSteps.map((v) => (
            <option key={v} value={v}>
              bis {formatMillions(v)}
            </option>
          ))}
        </Select>
        <Select value={status} onChange={(e) => setStatus(e.target.value as typeof status)} aria-label="Verfügbarkeit">
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
        <Select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} aria-label="Sortierung">
          {SORTS.map((s) => (
            <option key={s.key} value={s.key}>
              Sortieren: {s.label}
            </option>
          ))}
        </Select>
      </div>

      <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:px-0" role="group" aria-label="Clubs">
        {clubOptions.map(([id, name]) => {
          const on = clubs.has(id);
          return (
            <button
              key={id}
              type="button"
              onClick={() => toggleClub(id)}
              aria-pressed={on}
              className={cn(
                "h-9 shrink-0 rounded-sm border px-3 text-xs font-semibold uppercase tracking-wider transition-colors",
                on ? "border-gold bg-gold text-gold-fg" : "border-border-strong bg-surface text-text-2 hover:bg-card-hover",
              )}
            >
              {name}
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between gap-2 text-xs text-muted">
        <span>
          {list.length} Spieler{activeFilters > 0 && (
            <button type="button" onClick={() => { setClubs(new Set()); setPosition("all"); setMaxValue(null); setStatus("all"); }} className="ml-2 inline-flex h-9 items-center gap-1 text-gold">
              <X className="h-3 w-3" /> Filter zurücksetzen
            </button>
          )}
        </span>
        <Button
          variant={compareMode ? "primary" : "secondary"}
          size="sm"
          onClick={() => {
            setCompareMode((m) => !m);
            setPicked([]);
          }}
        >
          <GitCompareArrows /> {compareMode ? `Vergleichen (${picked.length}/2)` : "Vergleichen"}
        </Button>
      </div>
      {compareMode && <p className="text-xs text-gold">Wähle zwei Spieler zum Vergleichen.</p>}

      {/* Mobil: Karten */}
      <ul className="space-y-2 md:hidden">
        {list.map((p) => (
          <li key={p.id}>
            <PlayerCard
              player={p}
              onClick={() => onRow(p)}
              selected={picked.includes(p.id)}
              trailing={
                mine.has(p.id) ? <span className="ml-1 shrink-0 text-[9px] font-semibold uppercase tracking-wider text-gold">Mein</span> : undefined
              }
            />
          </li>
        ))}
        {list.length === 0 && <li className="py-10 text-center text-sm text-muted">Keine Spieler für diese Auswahl.</li>}
      </ul>

      {/* Desktop: Tabelle */}
      <div className="hidden overflow-x-auto rounded border border-border md:block">
        <table className="w-full text-sm">
          <thead className="bg-surface text-[10px] uppercase tracking-[0.12em] text-muted">
            <tr>
              <th className="px-3 py-2.5 text-left font-semibold">Spieler</th>
              <th className="px-3 py-2.5 text-left font-semibold">Club</th>
              <th className="px-2 py-2.5 text-left font-semibold">Pos.</th>
              {SORTS.map((s) => (
                <th key={s.key} className="px-2 py-2.5 text-right font-semibold">
                  <button type="button" onClick={() => setSort(s.key)} className={cn("inline-flex h-9 items-center gap-1", sort === s.key && "text-gold")}>
                    {s.short} {sort === s.key && <ArrowDown className="h-3 w-3" />}
                  </button>
                </th>
              ))}
              <th className="px-3 py-2.5 text-right font-semibold">Teams</th>
            </tr>
          </thead>
          <tbody>
            {list.map((p) => (
              <tr
                key={p.id}
                onClick={() => onRow(p)}
                className={cn("cursor-pointer border-t border-border transition-colors hover:bg-card-hover", picked.includes(p.id) && "bg-gold/10")}
              >
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2.5">
                    <PlayerAvatar name={p.player.display_name} imageUrl={p.player.image_url} size={32} />
                    <span className="font-semibold">{p.player.display_name}</span>
                    {mine.has(p.id) && <span className="text-[9px] font-semibold uppercase tracking-wider text-gold">Mein</span>}
                    <StatusBadge status={p.status} />
                  </div>
                </td>
                <td className="px-3 py-2 text-text-2">{p.team.club.short_name}</td>
                <td className="px-2 py-2 text-text-2">{POSITION_SHORT[p.position]}</td>
                {SORTS.map((s) => (
                  <td key={s.key} className={cn("num px-2 py-2 text-right", s.key === "total_points" && "text-gold")}>
                    {s.key === "market_value_m" ? formatMillions(p.market_value_m) : formatPoints(sortValue(p, s.key))}
                  </td>
                ))}
                <td className="num px-3 py-2 text-right text-text-2">{ownership(p)}</td>
              </tr>
            ))}
            {list.length === 0 && (
              <tr>
                <td colSpan={SORTS.length + 4} className="py-10 text-center text-muted">
                  Keine Spieler für diese Auswahl.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <PlayerCompare
        players={comparePair}
        open={compareOpen}
        onOpenChange={(o) => {
          setCompareOpen(o);
          if (!o) setPicked([]);
        }}
        teamCount={teamCount}
      />
    </div>
  );
}

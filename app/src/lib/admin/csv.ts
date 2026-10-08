import Papa from "papaparse";

/** Normalisiert Namen für Vergleiche: Kleinschreibung, keine Diakritika, einfache Leerzeichen. */
export function normalizeName(s: string) {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/ß/g, "ss")
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function parseCsv(text: string): { headers: string[]; rows: Record<string, string>[]; errors: string[] } {
  const clean = text.replace(/^﻿/, "");
  const res = Papa.parse<Record<string, string>>(clean, {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: (h) => h.trim(),
    transform: (v) => (typeof v === "string" ? v.trim() : v),
  });
  const headers = (res.meta.fields ?? []).filter(Boolean);
  const errors = res.errors.filter((e) => e.type !== "FieldMismatch").map((e) => `Zeile ${(e.row ?? 0) + 2}: ${e.message}`);
  return { headers, rows: res.data, errors };
}

/** Zahl aus CSV-Zelle: leer → null, "12,5" → 12.5, "85 %" → 85 */
export function parseCell(v: string | undefined | null): number | null | "invalid" {
  if (v === undefined || v === null) return null;
  const s = String(v).trim().replace(/%$/, "").trim();
  if (s === "" || s === "-" || s === "–") return null;
  const normalized = s.includes(",") ? s.replace(/\./g, "").replace(",", ".") : s;
  const n = Number(normalized);
  return Number.isFinite(n) ? n : "invalid";
}

export type StatDef = { key: string; label_de: string; short_de: string | null };

/** Header → stat_key (key, label_de oder short_de; Groß-/Kleinschreibung egal). */
export function mapHeaders(headers: string[], defs: StatDef[]): Record<string, string | null> {
  const lookup = new Map<string, string>();
  for (const d of defs) {
    lookup.set(normalizeName(d.key), d.key);
    lookup.set(normalizeName(d.label_de), d.key);
    if (d.short_de) lookup.set(normalizeName(d.short_de), d.key);
  }
  const out: Record<string, string | null> = {};
  for (const h of headers) out[h] = lookup.get(normalizeName(h)) ?? null;
  return out;
}

export type MatchCandidate = { id: string; display_name: string; last_name: string };
export type MatchResult = { id: string; ambiguous: boolean } | null;

/** Name → season_player: exakt display_name, dann exakt last_name, dann Teilstring-Fallback. */
export function matchPlayer(name: string, players: MatchCandidate[]): MatchResult {
  const q = normalizeName(name);
  if (!q) return null;
  const byDisplay = players.filter((p) => normalizeName(p.display_name) === q);
  if (byDisplay.length === 1) return { id: byDisplay[0].id, ambiguous: false };
  if (byDisplay.length > 1) return { id: byDisplay[0].id, ambiguous: true };
  const byLast = players.filter((p) => normalizeName(p.last_name) === q);
  if (byLast.length === 1) return { id: byLast[0].id, ambiguous: false };
  if (byLast.length > 1) return { id: byLast[0].id, ambiguous: true };
  const loose = players.filter((p) => {
    const d = normalizeName(p.display_name);
    return d.includes(q) || q.includes(d);
  });
  if (loose.length === 1) return { id: loose[0].id, ambiguous: true };
  if (loose.length > 1) return { id: loose[0].id, ambiguous: true };
  return null;
}

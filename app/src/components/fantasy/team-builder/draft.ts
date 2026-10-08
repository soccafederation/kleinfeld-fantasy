import type { PlayerRow, MyTeam } from "@/lib/data/season";
import type { SeasonRules } from "@/lib/rules";
import type { RosterInput } from "@/app/app/actions";

export type Slot = RosterInput["slot"];
export type SlotRef = { slot: Slot; index: number };

/** Lokaler Entwurf des Kaders – wird 1:1 an save_roster geschickt. */
export type Draft = {
  name: string;
  players: RosterInput[];
  captain: string | null;
};

export const EMPTY_DRAFT: Draft = { name: "", players: [], captain: null };

export function draftFromTeam(team: MyTeam | null): Draft {
  if (!team) return EMPTY_DRAFT;
  return {
    name: team.team.name,
    players: team.roster.map((r) => ({ season_player_id: r.season_player_id, slot: r.slot, slot_order: r.slot_order })),
    captain: team.team.captain_season_player_id,
  };
}

export function draftKey(d: Draft) {
  const players = [...d.players].sort((a, b) => a.slot.localeCompare(b.slot) || a.slot_order - b.slot_order);
  return JSON.stringify({ name: d.name.trim(), captain: d.captain, players });
}

export function sameDraft(a: Draft, b: Draft) {
  return draftKey(a) === draftKey(b);
}

export function playerAt(d: Draft, ref: SlotRef) {
  return d.players.find((p) => p.slot === ref.slot && p.slot_order === ref.index) ?? null;
}

export function totalValue(d: Draft, byId: Map<string, PlayerRow>) {
  return d.players.reduce((sum, p) => sum + (byId.get(p.season_player_id)?.market_value_m ?? 0), 0);
}

export function clubCounts(d: Draft, byId: Map<string, PlayerRow>, excludeId?: string | null) {
  const counts = new Map<string, number>();
  for (const p of d.players) {
    if (p.season_player_id === excludeId) continue;
    const club = byId.get(p.season_player_id)?.team.club.id;
    if (!club) continue;
    counts.set(club, (counts.get(club) ?? 0) + 1);
  }
  return counts;
}

/** Fehlende Plätze je Slot laut Regeln. */
export function missingSlots(d: Draft, rules: SeasonRules) {
  const count = (slot: Slot) => d.players.filter((p) => p.slot === slot).length;
  return {
    GK: Math.max(0, rules.squad.GK - count("GK")),
    FIELD: Math.max(0, rules.squad.FIELD - count("FIELD")),
    BENCH: Math.max(0, rules.squad.BENCH - count("BENCH")),
  };
}

export function isDraftComplete(d: Draft, rules: SeasonRules) {
  const m = missingSlots(d, rules);
  return m.GK === 0 && m.FIELD === 0 && m.BENCH === 0;
}

export type Eligibility = { ok: true } | { ok: false; reason: string };

/**
 * Prüft, ob ein Spieler in einen Slot gesetzt werden kann. Der Spieler, der dort aktuell steht
 * (`replacing`), wird für Budget und Club-Limit herausgerechnet.
 */
export function eligibility(
  player: PlayerRow,
  ref: SlotRef,
  d: Draft,
  rules: SeasonRules,
  byId: Map<string, PlayerRow>,
  replacing: string | null,
): Eligibility {
  if (ref.slot !== "BENCH" && player.position !== ref.slot) {
    return { ok: false, reason: ref.slot === "GK" ? "Kein Torwart" : "Kein Feldspieler" };
  }
  if (player.status === "left") return { ok: false, reason: "Nicht mehr im Wettbewerb" };
  if (player.id !== replacing && d.players.some((p) => p.season_player_id === player.id)) {
    return { ok: false, reason: "Bereits im Kader" };
  }
  const spent = totalValue(d, byId) - (replacing ? (byId.get(replacing)?.market_value_m ?? 0) : 0);
  const remaining = rules.budget_m - spent;
  if (player.market_value_m > remaining + 1e-9) return { ok: false, reason: "Zu teuer" };
  const clubs = clubCounts(d, byId, replacing);
  if ((clubs.get(player.team.club.id) ?? 0) >= rules.max_per_club) {
    return { ok: false, reason: `Max. ${rules.max_per_club} pro Team` };
  }
  return { ok: true };
}

/** Setzt einen Spieler auf den Slot; ein vorhandener Spieler dort fliegt raus. */
export function placePlayer(d: Draft, ref: SlotRef, playerId: string): Draft {
  const removedId = playerAt(d, ref)?.season_player_id ?? null;
  const players = d.players
    .filter((p) => !(p.slot === ref.slot && p.slot_order === ref.index))
    .filter((p) => p.season_player_id !== playerId)
    .concat({ season_player_id: playerId, slot: ref.slot, slot_order: ref.index });
  let captain = d.captain;
  if (captain && captain === removedId && removedId !== playerId) captain = null;
  if (captain && ref.slot === "BENCH" && captain === playerId) captain = null;
  return { ...d, players, captain };
}

export function removePlayer(d: Draft, playerId: string): Draft {
  return {
    ...d,
    players: d.players.filter((p) => p.season_player_id !== playerId),
    captain: d.captain === playerId ? null : d.captain,
  };
}

/** Tauscht zwei Kaderplätze (Bank ↔ Startelf). Positionsregel prüft der Aufrufer. */
export function swapSlots(d: Draft, a: string, b: string): Draft {
  const pa = d.players.find((p) => p.season_player_id === a);
  const pb = d.players.find((p) => p.season_player_id === b);
  if (!pa || !pb) return d;
  const players = d.players.map((p) => {
    if (p.season_player_id === a) return { ...p, slot: pb.slot, slot_order: pb.slot_order };
    if (p.season_player_id === b) return { ...p, slot: pa.slot, slot_order: pa.slot_order };
    return p;
  });
  let captain = d.captain;
  const benched = players.find((p) => p.season_player_id === captain)?.slot === "BENCH";
  if (benched) captain = null;
  return { ...d, players, captain };
}

export function setCaptain(d: Draft, playerId: string): Draft {
  const p = d.players.find((x) => x.season_player_id === playerId);
  if (!p || p.slot === "BENCH") return d;
  return { ...d, captain: playerId };
}

/** Bankspieler, die mit diesem Starter tauschen dürfen (GK ↔ GK, FIELD ↔ FIELD). */
export function swapCandidates(d: Draft, playerId: string, byId: Map<string, PlayerRow>) {
  const me = d.players.find((p) => p.season_player_id === playerId);
  const mePlayer = byId.get(playerId);
  if (!me || !mePlayer) return [];
  const targetSlot: Slot = me.slot === "BENCH" ? mePlayer.position : "BENCH";
  return d.players.filter((p) => {
    if (p.slot !== targetSlot) return false;
    const other = byId.get(p.season_player_id);
    return !!other && other.position === mePlayer.position;
  });
}

export function draftStorageKey(seasonId: string) {
  return `kf-draft-${seasonId}`;
}

export function loadDraft(seasonId: string): Draft | null {
  try {
    const raw = window.localStorage.getItem(draftStorageKey(seasonId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Draft>;
    if (!parsed || !Array.isArray(parsed.players)) return null;
    return { name: typeof parsed.name === "string" ? parsed.name : "", players: parsed.players, captain: parsed.captain ?? null };
  } catch {
    return null;
  }
}

export function storeDraft(seasonId: string, d: Draft) {
  try {
    window.localStorage.setItem(draftStorageKey(seasonId), JSON.stringify(d));
  } catch {
    /* Speicher nicht verfügbar – Entwurf lebt nur im State */
  }
}

export function clearDraft(seasonId: string) {
  try {
    window.localStorage.removeItem(draftStorageKey(seasonId));
  } catch {
    /* ignorieren */
  }
}

export const SLOT_LABEL: Record<Slot, string> = { GK: "Torwart", FIELD: "Feldspieler", BENCH: "Bank" };
export const POSITION_LABEL: Record<PlayerRow["position"], string> = { GK: "TW", FIELD: "Feld" };
export const STATUS_LABEL: Record<PlayerRow["status"], string> = { active: "Fit", injured: "Verletzt", unavailable: "Fehlt", left: "Weg" };

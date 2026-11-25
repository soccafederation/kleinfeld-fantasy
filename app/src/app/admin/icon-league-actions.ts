"use server";

import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { writeAudit } from "@/lib/admin/audit";
import { done, fail, str, type ActionState } from "@/lib/admin/result";
import { fetchMatches, iconSeasonSlug, roundMatchIds, STAT_KEYS, type CumulativePlayer, type RoundDelta } from "@/lib/icon-league/stats";

export type IconLeagueImportResult = {
  mode: "check" | "apply";
  round: number;
  players: number;
  goals: number;
  topScorers: { name: string; goals: number; assists: number }[];
  unmatched: string[];
  clamped: string[];
  existingRows: number;
  teams?: number;
};

/**
 * Spieltag direkt von der Icon League auswerten.
 * mode=check: nur rechnen und anzeigen. mode=apply: Werte eintragen, freigeben, Spieltag berechnen.
 */
export async function importIconLeagueRoundAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const { user } = await requireStaff();
  const admin = createAdminClient();
  const seasonId = str(fd, "season_id");
  const roundId = str(fd, "round_id");
  const mode = str(fd, "mode") === "apply" ? "apply" : "check";
  if (!seasonId || !roundId) return fail("Spieltag fehlt.");

  const [{ data: season }, { data: round }] = await Promise.all([
    admin.from("seasons").select("id, slug").eq("id", seasonId).single(),
    admin.from("fantasy_rounds").select("id, number, status, deadline_at, season_id").eq("id", roundId).single(),
  ]);
  if (!season || !round || round.season_id !== seasonId) return fail("Spieltag nicht gefunden.");

  // Werte direkt pro Spiel dieses Spieltags (keine Differenzrechnung, Lücken in Vorspieltagen sind egal)
  const matchIds = roundMatchIds(season.slug, round.number);
  let roundStats: Map<string, CumulativePlayer>;
  try {
    roundStats = await fetchMatches(iconSeasonSlug(season.slug), matchIds);
  } catch (e) {
    return fail(`Icon League nicht erreichbar: ${e instanceof Error ? e.message : String(e)}`);
  }

  const [{ data: sp }, { count: existingRows }] = await Promise.all([
    admin.from("season_players").select("id, player:players(external_refs)").eq("season_id", seasonId),
    admin.from("player_round_statistics").select("id", { count: "exact", head: true }).eq("round_id", roundId),
  ]);
  const bySlug = new Map(
    (sp ?? [])
      .map((r) => [(r.player as unknown as { external_refs: { icon_slug?: string } | null } | null)?.external_refs?.icon_slug ?? "", r.id] as const)
      .filter(([slug]) => slug),
  );

  const deltas: RoundDelta[] = [];
  const unmatched: CumulativePlayer[] = [];
  for (const c of roundStats.values()) {
    if ((c.stats.appearances ?? 0) < 1) continue;
    const spId = bySlug.get(c.slug);
    if (!spId) {
      unmatched.push(c);
      continue;
    }
    const stats = Object.fromEntries(STAT_KEYS.map((k) => [k, Math.max(0, c.stats[k] ?? 0)]));
    deltas.push({ seasonPlayerId: spId, slug: c.slug, name: c.name, stats, clamped: [] });
  }
  deltas.sort((x, y) => x.name.localeCompare(y.name, "de"));
  unmatched.sort((x, y) => x.name.localeCompare(y.name, "de"));
  const tooMany = deltas.filter((d) => d.stats.appearances > 1).map((d) => d.name);
  if (tooMany.length) return fail(`Unplausibel: mehr als ein Einsatz an Spieltag ${round.number} (${tooMany.slice(0, 3).join(", ")}). Bitte Claude Bescheid geben.`);

  const result: IconLeagueImportResult = {
    mode,
    round: round.number,
    players: deltas.length,
    goals: deltas.reduce((s, d) => s + d.stats.goals, 0),
    topScorers: [...deltas]
      .sort((a, b) => b.stats.goals - a.stats.goals || b.stats.assists - a.stats.assists)
      .slice(0, 5)
      .map((d) => ({ name: d.name, goals: d.stats.goals, assists: d.stats.assists })),
    unmatched: unmatched.map((u) => u.name),
    clamped: deltas.filter((d) => d.clamped.length).map((d) => `${d.name} (${d.clamped.join(", ")})`),
    existingRows: existingRows ?? 0,
  };

  if (!deltas.length) return fail(`Für Spieltag ${round.number} gibt es bei der Icon League noch keine neuen Einsätze.`, result);
  if (mode === "check") return done(`Vorschau Spieltag ${round.number}: ${result.players} Spieler, ${result.goals} Tore.`, result);

  // Eintragen: nur nach der Deadline
  if (new Date(round.deadline_at).getTime() > Date.now()) return fail("Die Deadline dieses Spieltags ist noch nicht vorbei.", result);
  await admin.rpc("lock_due_rounds");

  const { error: delErr } = await admin.from("player_round_statistics").delete().eq("round_id", roundId);
  if (delErr) return fail(`Alte Werte konnten nicht gelöscht werden: ${delErr.message}`, result);
  const rows = deltas.flatMap((d) =>
    Object.entries(d.stats).map(([stat_key, value]) => ({ round_id: roundId, season_player_id: d.seasonPlayerId, stat_key, value, status: "published" as const })),
  );
  for (let i = 0; i < rows.length; i += 500) {
    const { error } = await admin.from("player_round_statistics").insert(rows.slice(i, i + 500));
    if (error) return fail(`Werte konnten nicht gespeichert werden: ${error.message}`, result);
  }

  const { data: comp, error: compErr } = await admin.rpc("compute_round", { p_round_id: roundId, p_finalize: true });
  const res = comp as { ok: boolean; error?: string; teams?: number } | null;
  if (compErr || !res?.ok) return fail(`Werte gespeichert, Berechnung fehlgeschlagen: ${compErr?.message ?? res?.error ?? "Fehler"}`, result);
  result.teams = res.teams;

  await writeAudit({ actorId: user.id, entity: "fantasy_rounds", entityId: roundId, action: "icon_league_import", after: { players: result.players, goals: result.goals, rows: rows.length, unmatched: result.unmatched } });
  revalidatePath(`/admin/seasons/${seasonId}`, "layout");
  revalidatePath("/app", "layout");
  return done(`Spieltag ${round.number} ausgewertet: ${result.players} Spieler, ${result.goals} Tore, ${res.teams ?? 0} Teams berechnet.`, result);
}

"use server";

import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { writeAudit } from "@/lib/admin/audit";
import { done, fail, str, type ActionState } from "@/lib/admin/result";
import { computeRoundDeltas, fetchCumulative, iconSeasonSlug, UNTRACKED_PRIOR } from "@/lib/icon-league/stats";

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

type Admin = ReturnType<typeof createAdminClient>;

async function priorSums(admin: Admin, roundIds: string[]) {
  const sums = new Map<string, Record<string, number>>();
  if (!roundIds.length) return sums;
  const pageSize = 1000;
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await admin
      .from("player_round_statistics")
      .select("season_player_id, stat_key, value")
      .in("round_id", roundIds)
      .in("status", ["confirmed", "published", "corrected"])
      .order("id")
      .range(from, from + pageSize - 1);
    if (error) throw new Error(error.message);
    for (const r of data ?? []) {
      const e = sums.get(r.season_player_id) ?? {};
      e[r.stat_key] = (e[r.stat_key] ?? 0) + Number(r.value);
      sums.set(r.season_player_id, e);
    }
    if (!data || data.length < pageSize) break;
  }
  return sums;
}

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

  let cumulative;
  try {
    cumulative = await fetchCumulative(iconSeasonSlug(season.slug));
  } catch (e) {
    return fail(`Icon League nicht erreichbar: ${e instanceof Error ? e.message : String(e)}`);
  }
  if (!cumulative.size) return fail("Die Icon League liefert keine Statistiken für diese Saison.");

  const [{ data: sp }, { data: earlier }, { count: existingRows }] = await Promise.all([
    admin.from("season_players").select("id, player:players(external_refs)").eq("season_id", seasonId),
    admin.from("fantasy_rounds").select("id").eq("season_id", seasonId).lt("number", round.number),
    admin.from("player_round_statistics").select("id", { count: "exact", head: true }).eq("round_id", roundId),
  ]);
  const ourPlayers = (sp ?? [])
    .map((r) => {
      const refs = (r.player as unknown as { external_refs: { icon_slug?: string } | null } | null)?.external_refs;
      return { seasonPlayerId: r.id, slug: refs?.icon_slug ?? "" };
    })
    .filter((p) => p.slug);

  let prior;
  try {
    prior = await priorSums(admin, (earlier ?? []).map((r) => r.id));
  } catch (e) {
    return fail(`Vorspieltage konnten nicht gelesen werden: ${e instanceof Error ? e.message : String(e)}`);
  }

  if (round.number > 1) {
    for (const [slug, extra] of Object.entries(UNTRACKED_PRIOR[season.slug] ?? {})) {
      const spId = ourPlayers.find((p) => p.slug === slug)?.seasonPlayerId;
      if (!spId) continue;
      const e = prior.get(spId) ?? {};
      for (const [k, v] of Object.entries(extra)) e[k] = (e[k] ?? 0) + v;
      prior.set(spId, e);
    }
  }

  const { deltas, unmatched } = computeRoundDeltas(cumulative, ourPlayers, prior);
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

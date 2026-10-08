"use server";

import { createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { writeAudit } from "@/lib/admin/audit";
import { uploadToBucket } from "@/lib/admin/storage";
import { mapHeaders, matchPlayer, parseCell, parseCsv, type MatchCandidate } from "@/lib/admin/csv";
import { done, fail, file, num, str, type ActionState } from "@/lib/admin/result";
import type { Json } from "@/lib/database.types";

type DeriveResult = { ok: boolean; rows?: number; blocked_reason?: string; previous_snapshot_id?: string | null };

export type ImportErrorEntry = { row: number; name: string; reason: string };

/**
 * Statistikimport (CSV). Erste Spalte = Spielername, weitere Spalten = Stat-Keys oder deutsche Labels.
 * mode=cumulative: Snapshot + derive_round_stats_from_snapshot (Deltas).
 * mode=round: Werte direkt als player_round_statistics (Snapshot nur zur Nachvollziehbarkeit).
 */
export async function importStatsCsvAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const { user } = await requireStaff();
  const supabase = await createClient();
  const admin = createAdminClient();
  const seasonId = str(fd, "season_id");
  const roundId = str(fd, "round_id");
  const mode = str(fd, "mode", 12) === "round" ? "round" : "cumulative";
  const f = file(fd, "file");
  if (!seasonId || !roundId) return fail("Season oder Spieltag fehlt.");
  if (!f) return fail("Bitte eine CSV-Datei wählen.");

  const text = await f.text();
  const hash = createHash("sha256").update(text, "utf8").digest("hex");
  const { data: dup } = await supabase.from("statistic_imports").select("id, file_name, created_at, status").eq("season_id", seasonId).eq("file_hash", hash).maybeSingle();
  if (dup) return fail(`Diese Datei wurde bereits importiert (${dup.file_name ?? "ohne Namen"}, Status ${dup.status}). Gleicher Inhalt, gleicher Hash – Import abgebrochen.`);

  const { headers, rows, errors: parseErrors } = parseCsv(text);
  if (parseErrors.length) return fail(parseErrors.slice(0, 5).join(" · "));
  if (headers.length < 2) return fail("Die CSV braucht mindestens eine Namensspalte und eine Statistikspalte.");
  if (!rows.length) return fail("Die Datei enthält keine Datenzeilen.");

  const [{ data: defs }, { data: players }, { data: round }] = await Promise.all([
    supabase.from("stat_definitions").select("key, label_de, short_de, is_derived"),
    supabase.from("season_players").select("id, player:players(display_name, last_name)").eq("season_id", seasonId),
    supabase.from("fantasy_rounds").select("id, number, season_id").eq("id", roundId).maybeSingle(),
  ]);
  if (!round || round.season_id !== seasonId) return fail("Spieltag gehört nicht zu dieser Season.");

  const nameHeader = headers[0];
  const statHeaders = headers.slice(1);
  const mapping = mapHeaders(statHeaders, defs ?? []);
  const derivedKeys = new Set((defs ?? []).filter((d) => d.is_derived).map((d) => d.key));
  const mappedHeaders = statHeaders.filter((h) => mapping[h] && !derivedKeys.has(mapping[h]!));
  const unmappedHeaders = statHeaders.filter((h) => !mapping[h]);
  if (!mappedHeaders.length) return fail(`Keine Spalte konnte einer Statistik zugeordnet werden. Spalten: ${statHeaders.join(", ")}`);

  const candidates: MatchCandidate[] = ((players ?? []) as unknown as { id: string; player: { display_name: string; last_name: string } | null }[])
    .filter((p) => p.player)
    .map((p) => ({ id: p.id, display_name: p.player!.display_name, last_name: p.player!.last_name }));

  const errorLog: ImportErrorEntry[] = [];
  const values: { season_player_id: string; stat_key: string; value: number | null; needs_review: boolean }[] = [];
  const seen = new Set<string>();
  let matched = 0;
  let ambiguous = 0;

  rows.forEach((r, idx) => {
    const rowNo = idx + 2;
    const name = (r[nameHeader] ?? "").trim();
    if (!name) return;
    const m = matchPlayer(name, candidates);
    if (!m) {
      errorLog.push({ row: rowNo, name, reason: "Kein Spieler gefunden" });
      return;
    }
    if (seen.has(m.id)) {
      errorLog.push({ row: rowNo, name, reason: "Spieler kommt mehrfach vor – Zeile übersprungen" });
      return;
    }
    seen.add(m.id);
    matched++;
    if (m.ambiguous) {
      ambiguous++;
      errorLog.push({ row: rowNo, name, reason: `Unscharf zugeordnet zu „${candidates.find((c) => c.id === m.id)?.display_name}“ – bitte prüfen` });
    }
    for (const h of mappedHeaders) {
      const parsed = parseCell(r[h]);
      if (parsed === "invalid") {
        errorLog.push({ row: rowNo, name, reason: `Wert „${r[h]}“ in Spalte „${h}“ ist keine Zahl` });
        continue;
      }
      values.push({ season_player_id: m.id, stat_key: mapping[h]!, value: parsed, needs_review: m.ambiguous });
    }
  });
  if (!matched) return fail("Keine Zeile konnte einem Spieler zugeordnet werden. Prüfe die Namensspalte.", { error_log: errorLog });

  // Datei ablegen (privater Bucket)
  const up = await uploadToBucket("imports", `${seasonId}/${roundId}`, f);
  if (!up.ok) return fail(up.error);

  const columnMapping: Json = { name_column: nameHeader, columns: mapping, unmapped: unmappedHeaders };
  const { data: imp, error: e1 } = await admin
    .from("statistic_imports")
    .insert({
      season_id: seasonId,
      round_id: roundId,
      source: "csv",
      mode,
      file_path: up.path,
      file_name: f.name,
      file_hash: hash,
      imported_by: user.id,
      status: "review",
      column_mapping: columnMapping,
      error_log: errorLog as unknown as Json,
      extraction_log: [{ at: new Date().toISOString(), rows: rows.length, matched, ambiguous, values: values.length }] as unknown as Json,
    })
    .select("id")
    .single();
  if (e1) return fail(e1.message);

  const { data: snap, error: e2 } = await admin
    .from("statistic_snapshots")
    .insert({ season_id: seasonId, import_id: imp.id, as_of_round_id: roundId, notes: mode === "round" ? "Spieltagswerte (kein Delta)" : null })
    .select("id")
    .single();
  if (e2) return fail(e2.message);

  for (let i = 0; i < values.length; i += 500) {
    const chunk = values.slice(i, i + 500).map((v) => ({ ...v, snapshot_id: snap.id }));
    const { error } = await admin.from("statistic_snapshot_values").insert(chunk);
    if (error) return fail(`Snapshot-Werte: ${error.message}`);
  }
  await admin.from("import_audit_logs").insert({ import_id: imp.id, actor_id: user.id, action: "uploaded", details: { file: f.name, mode, rows: rows.length, matched, ambiguous, unmatched: errorLog.filter((e) => e.reason.startsWith("Kein")).length } });

  if (mode === "round") {
    const direct = values
      .filter((v) => v.value !== null)
      .map((v) => ({ round_id: roundId, season_player_id: v.season_player_id, stat_key: v.stat_key, value: v.value as number, derived_from_snapshot_id: snap.id, status: "computed" as const }));
    for (let i = 0; i < direct.length; i += 500) {
      const { error } = await admin.from("player_round_statistics").upsert(direct.slice(i, i + 500), { onConflict: "round_id,season_player_id,stat_key" });
      if (error) return fail(`Spieltagswerte: ${error.message}`);
    }
    // Als "cumulative"-Quelle für spätere Delta-Berechnungen darf dieser Snapshot nicht gelten
    await admin.from("statistic_snapshots").update({ is_valid: false, notes: "Spieltagswerte (kein Delta) – nicht als Basis für Deltas" }).eq("id", snap.id);
    await writeAudit({ actorId: user.id, entity: "statistic_imports", entityId: imp.id, action: "import_round_values", after: { rows: direct.length } });
  } else {
    const { data, error } = await admin.rpc("derive_round_stats_from_snapshot", { p_snapshot_id: snap.id });
    if (error) return fail(error.message);
    const res = data as DeriveResult;
    if (!res.ok) {
      await admin.from("statistic_imports").update({ notes: res.blocked_reason ?? null }).eq("id", imp.id);
      await admin.from("import_audit_logs").insert({ import_id: imp.id, actor_id: user.id, action: "derive_blocked", details: { reason: res.blocked_reason } });
      revalidatePath(`/admin/seasons/${seasonId}/stats`);
      return fail(res.blocked_reason ?? "Delta-Berechnung blockiert.", { blocked: true, import_id: imp.id, error_log: errorLog });
    }
    await writeAudit({ actorId: user.id, entity: "statistic_imports", entityId: imp.id, action: "import_derived", after: { rows: res.rows ?? 0 } });
  }

  revalidatePath(`/admin/seasons/${seasonId}/stats`);
  redirect(`/admin/seasons/${seasonId}/stats/${roundId}?imported=1`);
}

export async function correctStatAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const { user } = await requireStaff();
  const admin = createAdminClient();
  const statId = str(fd, "round_stat_id");
  const seasonId = str(fd, "season_id");
  const roundId = str(fd, "round_id");
  const value = num(fd, "value");
  const reason = str(fd, "reason", 300);
  if (!statId) return fail("Datensatz fehlt.");
  if (value === null) return fail("Neuer Wert fehlt.");
  if (reason.length < 3) return fail("Bitte eine kurze Begründung angeben.");
  const { data, error } = await admin.rpc("correct_round_stat", { p_round_stat_id: statId, p_new_value: value, p_reason: reason });
  if (error) return fail(error.message);
  const res = data as { ok: boolean; old?: number; new?: number };
  // correct_round_stat läuft über Service Role → auth.uid() ist null; Akteur hier festhalten.
  await writeAudit({ actorId: user.id, entity: "player_round_statistics", entityId: statId, action: "correct", before: { value: res.old ?? null }, after: { value, reason } });
  revalidatePath(`/admin/seasons/${seasonId}/stats/${roundId}`);
  return done(`Korrigiert: ${res.old ?? "–"} → ${value}.`);
}

export async function manualStatAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const { user } = await requireStaff();
  const supabase = await createClient();
  const seasonId = str(fd, "season_id");
  const roundId = str(fd, "round_id");
  const seasonPlayerId = str(fd, "season_player_id");
  const statKey = str(fd, "stat_key", 60);
  const value = num(fd, "value");
  if (!roundId || !seasonPlayerId || !statKey) return fail("Spieler und Statistik wählen.");
  if (value === null) return fail("Wert fehlt.");
  const { data: existing } = await supabase
    .from("player_round_statistics")
    .select("id, status, value")
    .eq("round_id", roundId)
    .eq("season_player_id", seasonPlayerId)
    .eq("stat_key", statKey)
    .maybeSingle();
  if (existing && (existing.status === "published" || existing.status === "corrected")) {
    return fail("Wert ist bereits veröffentlicht – bitte über die Korrektur-Funktion in der Tabelle ändern.");
  }
  const { error } = await supabase
    .from("player_round_statistics")
    .upsert({ round_id: roundId, season_player_id: seasonPlayerId, stat_key: statKey, value, status: "computed" }, { onConflict: "round_id,season_player_id,stat_key" });
  if (error) return fail(error.message);
  await writeAudit({ actorId: user.id, entity: "player_round_statistics", entityId: `${roundId}:${seasonPlayerId}:${statKey}`, action: "manual_entry", before: existing ? { value: existing.value } : null, after: { value } });
  revalidatePath(`/admin/seasons/${seasonId}/stats/${roundId}`);
  return done("Wert gespeichert.");
}

export async function publishRoundStatsAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const { user } = await requireStaff();
  const admin = createAdminClient();
  const seasonId = str(fd, "season_id");
  const roundId = str(fd, "round_id");
  const { data, error } = await admin.rpc("publish_round_stats", { p_round_id: roundId });
  if (error) return fail(error.message);
  const res = data as { ok: boolean; rows?: number };
  await writeAudit({ actorId: user.id, entity: "fantasy_rounds", entityId: roundId, action: "publish_stats", after: { rows: res.rows ?? 0 } });
  revalidatePath(`/admin/seasons/${seasonId}`, "layout");
  return done(`${res.rows ?? 0} Werte freigegeben. Jetzt unter „Spieltage“ die Punkte berechnen.`);
}

export async function rejectImportAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const { user } = await requireStaff();
  const admin = createAdminClient();
  const importId = str(fd, "import_id");
  const seasonId = str(fd, "season_id");
  if (!importId) return fail("Import fehlt.");
  const { error } = await admin.from("statistic_imports").update({ status: "rejected" }).eq("id", importId);
  if (error) return fail(error.message);
  await admin.from("statistic_snapshots").update({ is_valid: false }).eq("import_id", importId);
  await admin.from("import_audit_logs").insert({ import_id: importId, actor_id: user.id, action: "rejected", details: {} });
  await writeAudit({ actorId: user.id, entity: "statistic_imports", entityId: importId, action: "reject" });
  revalidatePath(`/admin/seasons/${seasonId}/stats`);
  return done("Import verworfen; Snapshot ist ungültig markiert.");
}

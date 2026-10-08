"use server";

import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { scoringRulesSchema } from "@/lib/rules";
import { writeAudit } from "@/lib/admin/audit";
import { done, fail, str, type ActionState } from "@/lib/admin/result";
import type { Json } from "@/lib/database.types";

export async function createScoringVersionAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const { user } = await requireStaff();
  const supabase = await createClient();
  const seasonId = str(fd, "season_id");
  const name = str(fd, "name", 120);
  const raw = fd.get("rules");
  if (!seasonId || typeof raw !== "string") return fail("Daten fehlen.");
  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(raw);
  } catch {
    return fail("Regeln konnten nicht gelesen werden.");
  }
  const parsed = scoringRulesSchema.safeParse(parsedJson);
  if (!parsed.success) return fail(`Regeln ungültig: ${parsed.error.issues.map((i) => `${i.path.join(".")} ${i.message}`).join("; ")}`);
  if (!parsed.data.rules.length) return fail("Mindestens eine Regel ist nötig.");
  const { data: defs } = await supabase.from("stat_definitions").select("key");
  const keys = new Set((defs ?? []).map((d) => d.key));
  const unknown = parsed.data.rules.map((r) => r.stat).filter((s) => !keys.has(s));
  if (unknown.length) return fail(`Unbekannte Statistik: ${[...new Set(unknown)].join(", ")}`);

  const { data: last } = await supabase.from("scoring_rule_versions").select("version").eq("season_id", seasonId).order("version", { ascending: false }).limit(1).maybeSingle();
  const version = (last?.version ?? 0) + 1;
  const { data, error } = await supabase
    .from("scoring_rule_versions")
    .insert({ season_id: seasonId, version, name: name || `Version ${version}`, is_active: false, rules: parsed.data as unknown as Json, created_by: user.id })
    .select("id")
    .single();
  if (error) return fail(error.message);
  await writeAudit({ actorId: user.id, entity: "scoring_rule_versions", entityId: data.id, action: "create", after: { version, rules: parsed.data.rules.length } });
  revalidatePath(`/admin/seasons/${seasonId}/scoring`);
  return done(`Version ${version} gespeichert (inaktiv). Zum Einsatz „Aktivieren“ klicken.`);
}

export async function activateScoringVersionAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const { user } = await requireStaff();
  const supabase = await createClient();
  const seasonId = str(fd, "season_id");
  const versionId = str(fd, "version_id");
  if (!versionId) return fail("Version fehlt.");
  // RPC prüft is_staff() via auth.uid() → Nutzer-Client
  const { error } = await supabase.rpc("admin_activate_scoring_version", { p_version_id: versionId });
  if (error) return fail(error.message);
  await writeAudit({ actorId: user.id, entity: "scoring_rule_versions", entityId: versionId, action: "activate" });
  revalidatePath(`/admin/seasons/${seasonId}/scoring`);
  return done("Version aktiviert. Abgeschlossene Spieltage müssen neu berechnet werden.");
}

/** Alle abgeschlossenen Rounds der Season nacheinander final neu berechnen, dann Gesamtrangliste. */
export async function recomputeCompletedRoundsAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const { user } = await requireStaff();
  const admin = createAdminClient();
  const seasonId = str(fd, "season_id");
  if (!seasonId) return fail("Season fehlt.");
  const { data: rounds } = await admin.from("fantasy_rounds").select("id, number").eq("season_id", seasonId).eq("status", "completed").order("number");
  if (!rounds?.length) return done("Keine abgeschlossenen Spieltage vorhanden.");
  const failed: string[] = [];
  for (const r of rounds) {
    const { data, error } = await admin.rpc("compute_round", { p_round_id: r.id, p_finalize: true });
    const res = data as { ok: boolean; error?: string } | null;
    if (error || !res?.ok) failed.push(`Spieltag ${r.number}: ${error?.message ?? res?.error ?? "Fehler"}`);
  }
  await admin.rpc("rebuild_overall_leaderboard", { p_season_id: seasonId });
  await writeAudit({ actorId: user.id, entity: "seasons", entityId: seasonId, action: "recompute_all", after: { rounds: rounds.length, failed } });
  revalidatePath(`/admin/seasons/${seasonId}`, "layout");
  revalidatePath("/app", "layout");
  if (failed.length) return fail(`Teilweise fehlgeschlagen: ${failed.join(" · ")}`);
  return done(`${rounds.length} Spieltag${rounds.length === 1 ? "" : "e"} neu berechnet, Rangliste aktualisiert.`);
}

"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { seasonRulesSchema } from "@/lib/rules";
import { slugify } from "@/lib/utils";
import { writeAudit } from "@/lib/admin/audit";
import { uploadToBucket } from "@/lib/admin/storage";
import { berlinLocalToIso } from "@/lib/admin/time";
import { parseCsv } from "@/lib/admin/csv";
import { bool, done, fail, file, int, num, str, type ActionState } from "@/lib/admin/result";
import type { Enums, Json } from "@/lib/database.types";

const SEASON_STATUS: Enums<"season_status">[] = ["draft", "open", "live", "completed", "archived"];
const PLAYER_STATUS: Enums<"player_status">[] = ["active", "injured", "unavailable", "left"];

// ---------------------------------------------------------------------------
// Wettbewerbe
// ---------------------------------------------------------------------------
export async function saveCompetitionAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const { user } = await requireStaff();
  const supabase = await createClient();
  const id = str(fd, "id");
  const name = str(fd, "name", 120);
  if (name.length < 2) return fail("Name ist zu kurz.");
  const slug = slugify(str(fd, "slug", 80) || name);
  if (!slug) return fail("Slug ist ungültig.");
  const payload = {
    name,
    slug,
    short_name: str(fd, "short_name", 40) || null,
    organizer: str(fd, "organizer", 120) || null,
    is_active: bool(fd, "is_active"),
    sort_order: int(fd, "sort_order") ?? 0,
  };
  if (id) {
    const { error } = await supabase.from("competitions").update(payload).eq("id", id);
    if (error) return fail(error.message);
    await writeAudit({ actorId: user.id, entity: "competitions", entityId: id, action: "update", after: payload });
  } else {
    const { data, error } = await supabase.from("competitions").insert(payload).select("id").single();
    if (error) return fail(error.message);
    await writeAudit({ actorId: user.id, entity: "competitions", entityId: data.id, action: "create", after: payload });
  }
  revalidatePath("/admin/competitions");
  return done(id ? "Wettbewerb gespeichert." : "Wettbewerb angelegt.");
}

// ---------------------------------------------------------------------------
// Seasons
// ---------------------------------------------------------------------------
export async function createSeasonAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const { user } = await requireStaff();
  const supabase = await createClient();
  const competitionId = str(fd, "competition_id");
  const name = str(fd, "name", 120);
  const slug = slugify(str(fd, "slug", 80) || name);
  if (!competitionId) return fail("Bitte einen Wettbewerb wählen.");
  if (name.length < 2) return fail("Name ist zu kurz.");
  if (!slug) return fail("Slug ist ungültig.");
  // RPC prüft is_staff() über auth.uid() → Nutzer-Client, nicht Service Role.
  const { data, error } = await supabase.rpc("admin_create_season", { p_competition_id: competitionId, p_slug: slug, p_name: name, p_rules: {} });
  if (error) return fail(error.message);
  await writeAudit({ actorId: user.id, entity: "seasons", entityId: data, action: "create", after: { name, slug, competition_id: competitionId } });
  revalidatePath("/admin/seasons");
  redirect(`/admin/seasons/${data}`);
}

export async function updateSeasonAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const { user } = await requireStaff();
  const supabase = await createClient();
  const id = str(fd, "id");
  if (!id) return fail("Season fehlt.");
  const status = str(fd, "status") as Enums<"season_status">;
  if (!SEASON_STATUS.includes(status)) return fail("Ungültiger Status.");
  const name = str(fd, "name", 120);
  if (name.length < 2) return fail("Name ist zu kurz.");
  const slug = slugify(str(fd, "slug", 80) || name);
  const starts = str(fd, "starts_at", 10);
  const ends = str(fd, "ends_at", 10);
  if (starts && ends && starts > ends) return fail("Saisonende liegt vor dem Saisonstart.");

  const { data: before } = await supabase.from("seasons").select("branding").eq("id", id).maybeSingle();
  const prevBranding = (before?.branding ?? {}) as Record<string, Json | undefined>;
  const branding: Record<string, Json | undefined> = { ...prevBranding };
  const accent = str(fd, "accent", 20);
  const accentFg = str(fd, "accent_fg", 20);
  const heroUrl = str(fd, "hero_image_url", 500);
  branding.accent = accent || undefined;
  branding.accent_fg = accentFg || undefined;
  branding.hero_image_url = heroUrl || undefined;
  const hero = file(fd, "hero_image");
  if (hero) {
    const up = await uploadToBucket("season-assets", `seasons/${id}`, hero);
    if (!up.ok) return fail(up.error);
    branding.hero_image_url = up.publicUrl;
  }
  for (const k of Object.keys(branding)) if (branding[k] === undefined) delete branding[k];

  const payload = { name, slug, status, starts_at: starts || null, ends_at: ends || null, branding: branding as Json };
  const { error } = await supabase.from("seasons").update(payload).eq("id", id);
  if (error) return fail(error.message);
  await writeAudit({ actorId: user.id, entity: "seasons", entityId: id, action: "update", after: payload });
  revalidatePath(`/admin/seasons/${id}`);
  revalidatePath("/admin/seasons");
  return done("Season gespeichert.");
}

export async function updateSeasonRulesAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const { user } = await requireStaff();
  const supabase = await createClient();
  const id = str(fd, "id");
  if (!id) return fail("Season fehlt.");
  const raw = {
    budget_m: num(fd, "budget_m"),
    squad: { GK: int(fd, "squad_gk"), FIELD: int(fd, "squad_field"), BENCH: int(fd, "squad_bench") },
    bench_counts: bool(fd, "bench_counts"),
    auto_sub: bool(fd, "auto_sub"),
    max_per_club: int(fd, "max_per_club"),
    captain_multiplier: num(fd, "captain_multiplier"),
    transfers: {
      free_per_round: int(fd, "free_per_round"),
      penalty_points: num(fd, "penalty_points"),
      max_extra: int(fd, "max_extra"),
      carry_over: bool(fd, "carry_over"),
    },
    late_entry: str(fd, "late_entry", 10),
  };
  const parsed = seasonRulesSchema.safeParse(raw);
  if (!parsed.success) {
    const msg = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    return fail(`Regeln ungültig – ${msg}`);
  }
  const { data: before } = await supabase.from("seasons").select("rules").eq("id", id).maybeSingle();
  const { error } = await supabase.from("seasons").update({ rules: parsed.data as unknown as Json }).eq("id", id);
  if (error) return fail(error.message);
  await writeAudit({ actorId: user.id, entity: "seasons", entityId: id, action: "update_rules", before: before?.rules ?? null, after: parsed.data as unknown as Json });
  revalidatePath(`/admin/seasons/${id}`);
  return done("Regeln gespeichert.");
}

// ---------------------------------------------------------------------------
// Clubs / Season-Teams
// ---------------------------------------------------------------------------
export async function createSeasonTeamAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const { user } = await requireStaff();
  const supabase = await createClient();
  const seasonId = str(fd, "season_id");
  if (!seasonId) return fail("Season fehlt.");
  const existingClubId = str(fd, "club_id");
  let clubId = existingClubId;

  if (!clubId) {
    const name = str(fd, "name", 80);
    const short = str(fd, "short_name", 4).toUpperCase();
    if (name.length < 2) return fail("Teamname ist zu kurz.");
    if (short.length < 2 || short.length > 4) return fail("Kürzel muss 2–4 Zeichen haben.");
    let logo_url: string | null = null;
    const logo = file(fd, "logo");
    if (logo) {
      const up = await uploadToBucket("club-logos", "clubs", logo);
      if (!up.ok) return fail(up.error);
      logo_url = up.publicUrl;
    }
    const { data, error } = await supabase
      .from("clubs")
      .insert({ name, short_name: short, primary_color: str(fd, "primary_color", 20) || null, logo_url })
      .select("id")
      .single();
    if (error) return fail(error.message);
    clubId = data.id;
    await writeAudit({ actorId: user.id, entity: "clubs", entityId: clubId, action: "create", after: { name, short_name: short } });
  }

  const { error } = await supabase.from("season_teams").insert({ season_id: seasonId, club_id: clubId, display_name: str(fd, "display_name", 80) || null });
  if (error) return fail(error.code === "23505" ? "Dieses Team ist bereits in der Season." : error.message);
  revalidatePath(`/admin/seasons/${seasonId}/teams`);
  return done("Team hinzugefügt.");
}

export async function updateClubAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const { user } = await requireStaff();
  const supabase = await createClient();
  const clubId = str(fd, "club_id");
  const seasonId = str(fd, "season_id");
  const name = str(fd, "name", 80);
  const short = str(fd, "short_name", 4).toUpperCase();
  if (!clubId) return fail("Club fehlt.");
  if (name.length < 2) return fail("Teamname ist zu kurz.");
  if (short.length < 2 || short.length > 4) return fail("Kürzel muss 2–4 Zeichen haben.");
  const payload: { name: string; short_name: string; primary_color: string | null; logo_url?: string } = {
    name,
    short_name: short,
    primary_color: str(fd, "primary_color", 20) || null,
  };
  const logo = file(fd, "logo");
  if (logo) {
    const up = await uploadToBucket("club-logos", "clubs", logo);
    if (!up.ok) return fail(up.error);
    payload.logo_url = up.publicUrl;
  }
  const { error } = await supabase.from("clubs").update(payload).eq("id", clubId);
  if (error) return fail(error.message);
  await writeAudit({ actorId: user.id, entity: "clubs", entityId: clubId, action: "update", after: payload });
  revalidatePath(`/admin/seasons/${seasonId}/teams`);
  return done("Team gespeichert.");
}

export async function removeSeasonTeamAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const { user } = await requireStaff();
  const supabase = await createClient();
  const id = str(fd, "season_team_id");
  const seasonId = str(fd, "season_id");
  const { count } = await supabase.from("season_players").select("id", { count: "exact", head: true }).eq("season_team_id", id);
  if ((count ?? 0) > 0) return fail(`Team hat noch ${count} Spieler. Erst Spieler entfernen oder umhängen.`);
  const { error } = await supabase.from("season_teams").delete().eq("id", id);
  if (error) return fail(error.message);
  await writeAudit({ actorId: user.id, entity: "season_teams", entityId: id, action: "delete" });
  revalidatePath(`/admin/seasons/${seasonId}/teams`);
  return done("Team aus der Season entfernt.");
}

// ---------------------------------------------------------------------------
// Spieler
// ---------------------------------------------------------------------------
export async function savePlayerAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const { user } = await requireStaff();
  const supabase = await createClient();
  const seasonId = str(fd, "season_id");
  const seasonPlayerId = str(fd, "season_player_id");
  const playerId = str(fd, "player_id");
  const first = str(fd, "first_name", 60);
  const last = str(fd, "last_name", 60);
  const display = str(fd, "display_name", 80) || `${first} ${last}`.trim();
  const position = str(fd, "position", 5) as Enums<"player_position">;
  const status = (str(fd, "status", 20) || "active") as Enums<"player_status">;
  const teamId = str(fd, "season_team_id");
  const shirt = int(fd, "shirt_number");
  const value = num(fd, "market_value_m");
  if (!seasonId) return fail("Season fehlt.");
  if (!last) return fail("Nachname fehlt.");
  if (position !== "GK" && position !== "FIELD") return fail("Position muss GK oder FIELD sein.");
  if (!PLAYER_STATUS.includes(status)) return fail("Ungültiger Status.");
  if (!teamId) return fail("Bitte ein Team wählen.");
  if (value === null || value < 0) return fail("Marktwert fehlt oder ist ungültig.");

  let image_url: string | undefined;
  const image = file(fd, "image");
  if (image) {
    const up = await uploadToBucket("player-images", `season-${seasonId}`, image);
    if (!up.ok) return fail(up.error);
    image_url = up.publicUrl;
  }

  if (seasonPlayerId && playerId) {
    const { error: e1 } = await supabase
      .from("players")
      .update({ first_name: first, last_name: last, display_name: display, ...(image_url ? { image_url } : {}) })
      .eq("id", playerId);
    if (e1) return fail(e1.message);
    const { data: before } = await supabase.from("season_players").select("market_value_m").eq("id", seasonPlayerId).maybeSingle();
    const { error: e2 } = await supabase
      .from("season_players")
      .update({ position, status, season_team_id: teamId, shirt_number: shirt, market_value_m: value })
      .eq("id", seasonPlayerId);
    if (e2) return fail(e2.message);
    if (before && Number(before.market_value_m) !== value) {
      await supabase.from("player_market_values").insert({ season_player_id: seasonPlayerId, value_m: value, reason: "Admin-Bearbeitung" });
    }
    await writeAudit({ actorId: user.id, entity: "season_players", entityId: seasonPlayerId, action: "update", after: { display, position, status, value } });
  } else {
    const { data: p, error: e1 } = await supabase
      .from("players")
      .insert({ first_name: first, last_name: last, display_name: display, image_url: image_url ?? null })
      .select("id")
      .single();
    if (e1) return fail(e1.message);
    const { data: sp, error: e2 } = await supabase
      .from("season_players")
      .insert({ season_id: seasonId, player_id: p.id, season_team_id: teamId, position, status, shirt_number: shirt, market_value_m: value })
      .select("id")
      .single();
    if (e2) return fail(e2.message);
    await supabase.from("player_market_values").insert({ season_player_id: sp.id, value_m: value, reason: "Anlage" });
    await writeAudit({ actorId: user.id, entity: "season_players", entityId: sp.id, action: "create", after: { display, position, value } });
  }
  revalidatePath(`/admin/seasons/${seasonId}/players`);
  return done(seasonPlayerId ? "Spieler gespeichert." : "Spieler angelegt.");
}

export async function bulkMarketValuesAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const { user } = await requireStaff();
  const supabase = await createClient();
  const seasonId = str(fd, "season_id");
  if (!seasonId) return fail("Season fehlt.");
  const changes: { id: string; value: number; old: number }[] = [];
  for (const [key, raw] of fd.entries()) {
    if (!key.startsWith("mv_") || typeof raw !== "string") continue;
    const id = key.slice(3);
    const value = Number(raw.replace(",", "."));
    const old = Number(String(fd.get(`old_${id}`) ?? "").replace(",", "."));
    if (!Number.isFinite(value) || value < 0) return fail(`Ungültiger Wert für einen Spieler (${raw}).`);
    if (Number.isFinite(old) && Math.abs(old - value) < 0.05) continue;
    changes.push({ id, value, old });
  }
  if (!changes.length) return done("Keine Änderungen.");
  for (const c of changes) {
    const { error } = await supabase.from("season_players").update({ market_value_m: c.value }).eq("id", c.id).eq("season_id", seasonId);
    if (error) return fail(error.message);
  }
  await supabase.from("player_market_values").insert(changes.map((c) => ({ season_player_id: c.id, value_m: c.value, reason: "Sammeländerung" })));
  await writeAudit({ actorId: user.id, entity: "season_players", entityId: seasonId, action: "bulk_market_values", after: { count: changes.length, changes } });
  revalidatePath(`/admin/seasons/${seasonId}/players`);
  return done(`${changes.length} Marktwert${changes.length === 1 ? "" : "e"} aktualisiert.`);
}

export type PlayerImportRow = {
  first_name: string;
  last_name: string;
  display_name: string;
  team_short_name: string;
  season_team_id: string | null;
  position: "GK" | "FIELD" | null;
  shirt_number: number | null;
  market_value_m: number | null;
  errors: string[];
  duplicate: boolean;
};

const PLAYER_CSV_COLUMNS = ["first_name", "last_name", "display_name", "team_short_name", "position", "shirt_number", "market_value_m"];

/** Schritt 1: CSV lesen, prüfen, Vorschau zurückgeben (data: PlayerImportRow[]). */
export async function previewPlayerCsvAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireStaff();
  const supabase = await createClient();
  const seasonId = str(fd, "season_id");
  const f = file(fd, "file");
  if (!seasonId) return fail("Season fehlt.");
  if (!f) return fail("Bitte eine CSV-Datei wählen.");
  const text = await f.text();
  const { headers, rows, errors } = parseCsv(text);
  const missing = ["last_name", "team_short_name", "position"].filter((c) => !headers.includes(c));
  if (missing.length) return fail(`Spalten fehlen: ${missing.join(", ")}. Erwartet: ${PLAYER_CSV_COLUMNS.join(",")}`);
  if (errors.length) return fail(errors.slice(0, 5).join(" · "));

  const [{ data: teams }, { data: existing }] = await Promise.all([
    supabase.from("season_teams").select("id, club:clubs(short_name)").eq("season_id", seasonId),
    supabase.from("season_players").select("player:players(display_name)").eq("season_id", seasonId),
  ]);
  const teamMap = new Map<string, string>();
  for (const t of (teams ?? []) as unknown as { id: string; club: { short_name: string } | null }[]) {
    if (t.club) teamMap.set(t.club.short_name.toUpperCase(), t.id);
  }
  const existingNames = new Set(((existing ?? []) as unknown as { player: { display_name: string } | null }[]).map((e) => e.player?.display_name.toLowerCase().trim()));

  const preview: PlayerImportRow[] = rows.map((r) => {
    const errs: string[] = [];
    const first = (r.first_name ?? "").trim();
    const last = (r.last_name ?? "").trim();
    const display = (r.display_name ?? "").trim() || `${first} ${last}`.trim();
    const short = (r.team_short_name ?? "").trim().toUpperCase();
    const posRaw = (r.position ?? "").trim().toUpperCase();
    const position = posRaw === "GK" || posRaw === "TW" ? "GK" : posRaw === "FIELD" || posRaw === "FS" ? "FIELD" : null;
    const shirt = r.shirt_number?.trim() ? Number(r.shirt_number) : null;
    const mvRaw = (r.market_value_m ?? "").trim().replace(",", ".");
    const mv = mvRaw ? Number(mvRaw) : 5;
    if (!last) errs.push("Nachname fehlt");
    if (!position) errs.push(`Position „${posRaw}“ unbekannt (GK|FIELD)`);
    const teamId = teamMap.get(short) ?? null;
    if (!teamId) errs.push(`Team „${short}“ nicht in der Season`);
    if (shirt !== null && !Number.isFinite(shirt)) errs.push("Rückennummer ungültig");
    if (!Number.isFinite(mv) || mv < 0) errs.push("Marktwert ungültig");
    return {
      first_name: first,
      last_name: last,
      display_name: display,
      team_short_name: short,
      season_team_id: teamId,
      position,
      shirt_number: shirt !== null && Number.isFinite(shirt) ? shirt : null,
      market_value_m: Number.isFinite(mv) ? mv : null,
      errors: errs,
      duplicate: existingNames.has(display.toLowerCase()),
    };
  });
  if (!preview.length) return fail("Die Datei enthält keine Datenzeilen.");
  return done(undefined, preview);
}

/** Schritt 2: geprüfte Zeilen (JSON im Feld rows) anlegen. */
export async function confirmPlayerCsvAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const { user } = await requireStaff();
  const supabase = await createClient();
  const seasonId = str(fd, "season_id");
  const rowsRaw = fd.get("rows");
  if (!seasonId || typeof rowsRaw !== "string") return fail("Daten fehlen.");
  let rows: PlayerImportRow[];
  try {
    rows = JSON.parse(rowsRaw) as PlayerImportRow[];
  } catch {
    return fail("Vorschau konnte nicht gelesen werden.");
  }
  const valid = rows.filter((r) => r.errors.length === 0 && !r.duplicate && r.season_team_id && r.position);
  if (!valid.length) return fail("Keine gültigen Zeilen zum Import.");
  // Team-IDs gegen die Season prüfen (Payload stammt aus dem Browser)
  const { data: teams } = await supabase.from("season_teams").select("id").eq("season_id", seasonId);
  const allowed = new Set((teams ?? []).map((t) => t.id));
  if (valid.some((r) => !allowed.has(r.season_team_id!))) return fail("Ungültige Team-Zuordnung in der Vorschau.");

  let created = 0;
  for (const r of valid) {
    const { data: p, error: e1 } = await supabase
      .from("players")
      .insert({ first_name: r.first_name || "", last_name: r.last_name, display_name: r.display_name })
      .select("id")
      .single();
    if (e1) return fail(`Fehler bei ${r.display_name}: ${e1.message}`);
    const mv = r.market_value_m ?? 5;
    const { data: sp, error: e2 } = await supabase
      .from("season_players")
      .insert({
        season_id: seasonId,
        player_id: p.id,
        season_team_id: r.season_team_id!,
        position: r.position!,
        shirt_number: r.shirt_number,
        market_value_m: mv,
      })
      .select("id")
      .single();
    if (e2) return fail(`Fehler bei ${r.display_name}: ${e2.message}`);
    await supabase.from("player_market_values").insert({ season_player_id: sp.id, value_m: mv, reason: "CSV-Import" });
    created++;
  }
  await writeAudit({ actorId: user.id, entity: "season_players", entityId: seasonId, action: "csv_import", after: { created } });
  revalidatePath(`/admin/seasons/${seasonId}/players`);
  return done(`${created} Spieler importiert.`);
}

// ---------------------------------------------------------------------------
// Spieltage (fantasy_rounds + matchdays)
// ---------------------------------------------------------------------------
export async function saveRoundAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const { user } = await requireStaff();
  const supabase = await createClient();
  const seasonId = str(fd, "season_id");
  const id = str(fd, "id");
  const number = int(fd, "number");
  const name = str(fd, "name", 80);
  const deadlineIso = berlinLocalToIso(str(fd, "deadline_at", 20));
  if (!seasonId) return fail("Season fehlt.");
  if (!deadlineIso) return fail("Deadline fehlt oder ist ungültig.");
  if (id) {
    const { data: before } = await supabase.from("fantasy_rounds").select("deadline_at, status").eq("id", id).maybeSingle();
    if (before?.status !== "upcoming") return fail("Deadline kann nur bei offenen Spieltagen geändert werden.");
    const payload = { deadline_at: deadlineIso, ...(name ? { name } : {}) };
    const { error } = await supabase.from("fantasy_rounds").update(payload).eq("id", id);
    if (error) return fail(error.message);
    await writeAudit({ actorId: user.id, entity: "fantasy_rounds", entityId: id, action: "update", before: { deadline_at: before.deadline_at }, after: payload });
    revalidatePath(`/admin/seasons/${seasonId}/rounds`);
    return done("Spieltag gespeichert.");
  }
  if (number === null || number < 1) return fail("Nummer fehlt.");
  const roundName = name || `Spieltag ${number}`;
  const { data, error } = await supabase
    .from("fantasy_rounds")
    .insert({ season_id: seasonId, number, name: roundName, deadline_at: deadlineIso })
    .select("id")
    .single();
  if (error) return fail(error.code === "23505" ? `Spieltag ${number} existiert bereits.` : error.message);
  const matchDate = str(fd, "match_date", 10);
  await supabase
    .from("matchdays")
    .upsert({ season_id: seasonId, number, name: roundName, round_id: data.id, date: matchDate || null }, { onConflict: "season_id,number" });
  await writeAudit({ actorId: user.id, entity: "fantasy_rounds", entityId: data.id, action: "create", after: { number, name: roundName, deadline_at: deadlineIso } });
  revalidatePath(`/admin/seasons/${seasonId}/rounds`);
  return done(`Spieltag ${number} angelegt.`);
}

type EngineResult = { ok: boolean; error?: string; lineup_players?: number; players?: number; teams?: number };

export async function lockRoundAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const { user } = await requireStaff();
  const id = str(fd, "round_id");
  const seasonId = str(fd, "season_id");
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("lock_round", { p_round_id: id });
  if (error) return fail(error.message);
  const res = data as EngineResult;
  if (!res.ok) return fail(res.error ?? "Sperren fehlgeschlagen.");
  await writeAudit({ actorId: user.id, entity: "fantasy_rounds", entityId: id, action: "lock_by_admin", after: { lineup_players: res.lineup_players ?? 0 } });
  revalidatePath(`/admin/seasons/${seasonId}/rounds`);
  revalidatePath("/app", "layout");
  return done(`Spieltag gesperrt. ${res.lineup_players ?? 0} Aufstellungsplätze eingefroren.`);
}

export async function computeRoundAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const { user } = await requireStaff();
  const id = str(fd, "round_id");
  const seasonId = str(fd, "season_id");
  const finalize = bool(fd, "finalize");
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("compute_round", { p_round_id: id, p_finalize: finalize });
  if (error) return fail(error.message);
  const res = data as EngineResult;
  if (!res.ok) return fail(res.error ?? "Berechnung fehlgeschlagen.");
  await writeAudit({ actorId: user.id, entity: "fantasy_rounds", entityId: id, action: finalize ? "compute_final_by_admin" : "compute_provisional_by_admin", after: { players: res.players, teams: res.teams } });
  revalidatePath(`/admin/seasons/${seasonId}`, "layout");
  revalidatePath("/app", "layout");
  return done(`${finalize ? "Abgeschlossen" : "Vorläufig berechnet"}: ${res.players ?? 0} Spieler, ${res.teams ?? 0} Teams.`);
}

export async function rebuildLeaderboardAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const { user } = await requireStaff();
  const seasonId = str(fd, "season_id");
  const admin = createAdminClient();
  const { error } = await admin.rpc("rebuild_overall_leaderboard", { p_season_id: seasonId });
  if (error) return fail(error.message);
  await writeAudit({ actorId: user.id, entity: "seasons", entityId: seasonId, action: "rebuild_leaderboard" });
  revalidatePath(`/admin/seasons/${seasonId}/rounds`);
  revalidatePath("/app", "layout");
  return done("Gesamtrangliste neu aufgebaut.");
}

// ---------------------------------------------------------------------------
// Nutzer
// ---------------------------------------------------------------------------
export async function setUserRoleAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const { profile } = await requireStaff();
  if (profile.role !== "admin") return fail("Nur Admins dürfen Rollen ändern.");
  const supabase = await createClient();
  const userId = str(fd, "user_id");
  const role = str(fd, "role", 10) as Enums<"user_role">;
  if (!["user", "editor", "admin"].includes(role)) return fail("Ungültige Rolle.");
  if (userId === profile.user_id && role !== "admin") return fail("Du kannst dir nicht selbst die Admin-Rolle entziehen.");
  const { error } = await supabase.rpc("set_user_role", { p_user_id: userId, p_role: role });
  if (error) return fail(error.message);
  revalidatePath("/admin/users");
  return done("Rolle gespeichert.");
}

export async function moderateTeamNameAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const { user } = await requireStaff();
  const supabase = await createClient();
  const teamId = str(fd, "team_id");
  const username = str(fd, "username", 20);
  const decision = str(fd, "decision", 10);
  const name = str(fd, "name", 30);
  if (!teamId) return fail("Team fehlt.");
  const { data: before } = await supabase.from("fantasy_teams").select("name, name_status").eq("id", teamId).maybeSingle();
  let payload: { name: string; name_status: Enums<"name_status"> };
  if (decision === "rejected") {
    payload = { name: `Team ${username}`.slice(0, 30), name_status: "rejected" };
  } else {
    if (name.length < 3) return fail("Teamname muss 3–30 Zeichen haben.");
    payload = { name, name_status: "approved" };
  }
  const { error } = await supabase.from("fantasy_teams").update(payload).eq("id", teamId);
  if (error) return fail(error.message);
  await writeAudit({ actorId: user.id, entity: "fantasy_teams", entityId: teamId, action: "moderate_name", before: before ?? null, after: payload });
  revalidatePath("/admin/users");
  return done(decision === "rejected" ? "Name abgelehnt und zurückgesetzt." : "Teamname gespeichert.");
}

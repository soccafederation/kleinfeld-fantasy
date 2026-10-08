"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function setActiveSeasonAction(seasonId: string) {
  const supabase = await createClient();
  await supabase.rpc("set_active_season", { p_season_id: seasonId });
  revalidatePath("/app", "layout");
  redirect("/app");
}

export type RosterInput = { season_player_id: string; slot: "GK" | "FIELD" | "BENCH"; slot_order: number };

export type SaveRosterResult = {
  ok: boolean;
  errors: string[];
  complete?: boolean;
  total_m?: number;
  budget_m?: number;
  transfers?: number;
  free_transfers?: number;
  penalty?: number;
  team_id?: string;
};

export async function saveRosterAction(input: { seasonId: string; teamName: string; players: RosterInput[]; captain: string | null; dryRun?: boolean }): Promise<SaveRosterResult> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("save_roster", {
    p_season_id: input.seasonId,
    p_team_name: input.teamName,
    p_players: input.players,
    p_captain: input.captain as string, // null erlaubt (SQL-Parameter ist nullable)
    p_dry_run: input.dryRun ?? false,
  });
  if (error) return { ok: false, errors: [error.message] };
  const res = data as SaveRosterResult;
  if (res.ok && !input.dryRun) {
    revalidatePath("/app", "layout");
  }
  return res;
}

export async function createLeagueAction(seasonId: string, name: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_league", { p_season_id: seasonId, p_name: name });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/app/leagues");
  return data as { ok: boolean; league_id?: string; invite_code?: string; error?: string };
}

export async function joinLeagueAction(code: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("join_league", { p_code: code });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/app/leagues");
  return data as { ok: boolean; league_id?: string; error?: string };
}

export async function updateProfileAction(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Nicht eingeloggt." };
  const display_name = String(formData.get("display_name") ?? "").trim().slice(0, 40);
  const email_round_reminder = formData.get("email_round_reminder") === "on";
  const email_round_result = formData.get("email_round_result") === "on";
  await supabase.from("profiles").update({ display_name: display_name || null }).eq("user_id", user.id);
  await supabase.from("user_preferences").upsert({ user_id: user.id, email_round_reminder, email_round_result });
  revalidatePath("/app/profile");
  return { ok: true };
}

export async function changeUsernameAction(username: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("change_username", { p_username: username });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/app", "layout");
  return data as { ok: boolean; error?: string };
}

export async function exportMyDataAction() {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("export_my_data");
  if (error) return { ok: false, error: error.message };
  return { ok: true, data };
}

export async function deleteAccountAction() {
  const supabase = await createClient();
  const { error } = await supabase.rpc("delete_my_account");
  if (error) return { ok: false, error: error.message };
  await supabase.auth.signOut();
  redirect("/?deleted=1");
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

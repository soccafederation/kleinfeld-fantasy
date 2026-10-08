"use server";

import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendPrizeEmail } from "@/lib/email";
import { writeAudit } from "@/lib/admin/audit";
import { uploadToBucket } from "@/lib/admin/storage";
import { done, fail, file, int, str, type ActionState } from "@/lib/admin/result";

export async function savePrizeAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const { user } = await requireStaff();
  const supabase = await createClient();
  const seasonId = str(fd, "season_id");
  const id = str(fd, "id");
  const title = str(fd, "title", 120);
  const rankFrom = int(fd, "rank_from") ?? 1;
  const rankTo = int(fd, "rank_to") ?? rankFrom;
  if (!seasonId) return fail("Season fehlt.");
  if (title.length < 2) return fail("Titel ist zu kurz.");
  if (rankFrom < 1 || rankTo < rankFrom) return fail("Rangbereich ist ungültig.");
  const payload: {
    season_id: string;
    title: string;
    description: string | null;
    round_id: string | null;
    rank_from: number;
    rank_to: number;
    sponsor_name: string | null;
    sort_order: number;
    image_url?: string;
  } = {
    season_id: seasonId,
    title,
    description: str(fd, "description", 1000) || null,
    round_id: str(fd, "round_id") || null,
    rank_from: rankFrom,
    rank_to: rankTo,
    sponsor_name: str(fd, "sponsor_name", 120) || null,
    sort_order: int(fd, "sort_order") ?? 0,
  };
  const image = file(fd, "image");
  if (image) {
    const up = await uploadToBucket("prize-images", `season-${seasonId}`, image);
    if (!up.ok) return fail(up.error);
    payload.image_url = up.publicUrl;
  }
  if (id) {
    const { error } = await supabase.from("prizes").update(payload).eq("id", id);
    if (error) return fail(error.message);
    await writeAudit({ actorId: user.id, entity: "prizes", entityId: id, action: "update", after: payload });
  } else {
    const { data, error } = await supabase.from("prizes").insert(payload).select("id").single();
    if (error) return fail(error.message);
    await writeAudit({ actorId: user.id, entity: "prizes", entityId: data.id, action: "create", after: payload });
  }
  revalidatePath(`/admin/seasons/${seasonId}/prizes`);
  return done(id ? "Preis gespeichert." : "Preis angelegt.");
}

export async function deletePrizeAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const { user } = await requireStaff();
  const supabase = await createClient();
  const id = str(fd, "id");
  const seasonId = str(fd, "season_id");
  const { data: before } = await supabase.from("prizes").select("*").eq("id", id).maybeSingle();
  const { error } = await supabase.from("prizes").delete().eq("id", id);
  if (error) return fail(error.message);
  await writeAudit({ actorId: user.id, entity: "prizes", entityId: id, action: "delete", before });
  revalidatePath(`/admin/seasons/${seasonId}/prizes`);
  return done("Preis gelöscht.");
}

/** Gewinner aus leaderboard_round (Spieltagspreis) bzw. leaderboard_overall (Saisonpreis) ermitteln. */
export async function determineWinnersAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const { user } = await requireStaff();
  const supabase = await createClient();
  const id = str(fd, "prize_id");
  const seasonId = str(fd, "season_id");
  const { data: prize } = await supabase.from("prizes").select("*").eq("id", id).maybeSingle();
  if (!prize) return fail("Preis nicht gefunden.");
  let teamIds: string[] = [];
  if (prize.round_id) {
    const { data } = await supabase.from("leaderboard_round").select("fantasy_team_id, rank").eq("round_id", prize.round_id).gte("rank", prize.rank_from).lte("rank", prize.rank_to);
    teamIds = (data ?? []).map((r) => r.fantasy_team_id);
  } else {
    const { data } = await supabase.from("leaderboard_overall").select("fantasy_team_id, rank").eq("season_id", prize.season_id).gte("rank", prize.rank_from).lte("rank", prize.rank_to);
    teamIds = (data ?? []).map((r) => r.fantasy_team_id);
  }
  if (!teamIds.length) return fail("Keine Teams im Rangbereich – ist die Rangliste schon berechnet?");
  const { error } = await supabase.from("prize_winners").upsert(
    teamIds.map((t) => ({ prize_id: id, fantasy_team_id: t })),
    { onConflict: "prize_id,fantasy_team_id", ignoreDuplicates: true },
  );
  if (error) return fail(error.message);
  await writeAudit({ actorId: user.id, entity: "prizes", entityId: id, action: "determine_winners", after: { teams: teamIds } });
  revalidatePath(`/admin/seasons/${seasonId}/prizes`);
  return done(`${teamIds.length} Gewinner eingetragen.`);
}

export async function notifyWinnerAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const { user } = await requireStaff();
  const supabase = await createClient();
  const admin = createAdminClient();
  const winnerId = str(fd, "winner_id");
  const seasonId = str(fd, "season_id");
  const { data: w } = await supabase
    .from("prize_winners")
    .select("id, prize:prizes(title, season:seasons(name)), team:fantasy_teams(user_id, profile:profiles(username))")
    .eq("id", winnerId)
    .maybeSingle();
  const row = w as unknown as {
    id: string;
    prize: { title: string; season: { name: string } | null } | null;
    team: { user_id: string; profile: { username: string } | null } | null;
  } | null;
  if (!row?.team || !row.prize) return fail("Gewinner nicht gefunden.");
  const { data: authUser, error: authErr } = await admin.auth.admin.getUserById(row.team.user_id);
  if (authErr || !authUser.user?.email) return fail("E-Mail-Adresse des Nutzers nicht gefunden.");
  const res = await sendPrizeEmail({
    to: authUser.user.email,
    username: row.team.profile?.username ?? "Manager",
    prizeTitle: row.prize.title,
    seasonName: row.prize.season?.name ?? "",
  });
  if (!res.ok) return fail(res.error ?? "Versand fehlgeschlagen.");
  await supabase.from("prize_winners").update({ notified_at: new Date().toISOString() }).eq("id", winnerId);
  await writeAudit({ actorId: user.id, entity: "prize_winners", entityId: winnerId, action: "notify" });
  revalidatePath(`/admin/seasons/${seasonId}/prizes`);
  return done("Benachrichtigung verschickt.");
}

export async function removeWinnerAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const { user } = await requireStaff();
  const supabase = await createClient();
  const winnerId = str(fd, "winner_id");
  const seasonId = str(fd, "season_id");
  const { error } = await supabase.from("prize_winners").delete().eq("id", winnerId);
  if (error) return fail(error.message);
  await writeAudit({ actorId: user.id, entity: "prize_winners", entityId: winnerId, action: "delete" });
  revalidatePath(`/admin/seasons/${seasonId}/prizes`);
  return done("Gewinner entfernt.");
}

import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendRoundResultEmail } from "@/lib/email";

/**
 * Nach compute_round(…, true): Ergebnis-Mail an alle Manager mit Team-Score in dieser Round.
 * Idempotent über user_notifications (type = result:<round_id>). Wird aus dem Admin-Bereich aufgerufen.
 */
export async function notifyRoundResults(roundId: string): Promise<{ sent: number; skipped: number; failed: number }> {
  const supabase = createAdminClient();
  const { data: round } = await supabase.from("fantasy_rounds").select("id, name, season_id, season:seasons(name, competition:competitions(name))").eq("id", roundId).single();
  if (!round) return { sent: 0, skipped: 0, failed: 0 };
  const season = round.season as unknown as { name: string; competition: { name: string } };

  const { data: scores } = await supabase.from("fantasy_team_scores").select("fantasy_team_id, total_points, team:fantasy_teams(user_id)").eq("round_id", roundId);
  const { data: overall } = await supabase.from("leaderboard_overall").select("fantasy_team_id, rank, rank_delta").eq("season_id", round.season_id);
  const { count: total } = await supabase.from("leaderboard_overall").select("rank", { count: "exact", head: true }).eq("season_id", round.season_id);
  const rankMap = new Map((overall ?? []).map((o) => [o.fantasy_team_id, o]));

  let sent = 0, skipped = 0, failed = 0;
  for (const s of scores ?? []) {
    const userId = (s.team as unknown as { user_id: string }).user_id;
    const { data: already } = await supabase.from("user_notifications").select("id").eq("user_id", userId).eq("type", `result:${roundId}`).maybeSingle();
    if (already) { skipped++; continue; }
    const { data: prefs } = await supabase.from("user_preferences").select("email_round_result").eq("user_id", userId).maybeSingle();
    if (prefs && !prefs.email_round_result) { skipped++; continue; }
    const { data: profile } = await supabase.from("profiles").select("username").eq("user_id", userId).single();
    const { data: authUser } = await supabase.auth.admin.getUserById(userId);
    const email = authUser.user?.email;
    const r = rankMap.get(s.fantasy_team_id);
    if (!email || !r) { skipped++; continue; }
    const res = await sendRoundResultEmail({
      to: email,
      username: profile?.username ?? "Manager",
      roundName: round.name,
      seasonName: `${season.competition.name} ${season.name}`,
      points: Number(s.total_points),
      rank: r.rank,
      totalManagers: total ?? 0,
      rankDelta: r.rank_delta,
    });
    await supabase.from("user_notifications").insert({ user_id: userId, type: `result:${roundId}`, payload: { ok: res.ok, error: res.error ?? null, points: s.total_points, rank: r.rank }, sent_at: res.ok ? new Date().toISOString() : null });
    if (res.ok) sent++; else failed++;
  }
  return { sent, skipped, failed };
}

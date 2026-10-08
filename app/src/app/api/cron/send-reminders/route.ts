import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendRoundReminderEmail } from "@/lib/email";
import { formatDateTime } from "@/lib/utils";
import { isCronAuthorized } from "@/lib/cron-auth";

/**
 * Vercel Cron (täglich): Erinnerung an alle Manager mit vollständigem Team,
 * wenn eine Deadline in den nächsten 24–48 h liegt und noch keine Erinnerung für diese Round verschickt wurde.
 */
export async function GET(request: NextRequest) {
  if (!isCronAuthorized(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const supabase = createAdminClient();
  const now = Date.now();
  const { data: rounds } = await supabase
    .from("fantasy_rounds")
    .select("id, name, deadline_at, season_id, season:seasons(name, competition:competitions(name))")
    .eq("status", "upcoming")
    .gt("deadline_at", new Date(now).toISOString())
    .lt("deadline_at", new Date(now + 48 * 3600 * 1000).toISOString());

  let sent = 0;
  for (const round of rounds ?? []) {
    const season = round.season as unknown as { name: string; competition: { name: string } };
    const { data: teams } = await supabase.from("fantasy_teams").select("id, user_id").eq("is_complete", true).eq("season_id", round.season_id);
    for (const t of teams ?? []) {
      const { data: already } = await supabase.from("user_notifications").select("id").eq("user_id", t.user_id).eq("type", `reminder:${round.id}`).maybeSingle();
      if (already) continue;
      const { data: prefs } = await supabase.from("user_preferences").select("email_round_reminder").eq("user_id", t.user_id).maybeSingle();
      if (prefs && !prefs.email_round_reminder) continue;
      const { data: profile } = await supabase.from("profiles").select("username").eq("user_id", t.user_id).single();
      const { data: authUser } = await supabase.auth.admin.getUserById(t.user_id);
      const email = authUser.user?.email;
      if (!email) continue;
      const res = await sendRoundReminderEmail({
        to: email,
        username: profile?.username ?? "Manager",
        roundName: round.name,
        deadlineText: `${formatDateTime(round.deadline_at)} Uhr`,
        seasonName: `${season.competition.name} ${season.name}`,
      });
      await supabase.from("user_notifications").insert({ user_id: t.user_id, type: `reminder:${round.id}`, payload: { ok: res.ok, error: res.error ?? null }, sent_at: res.ok ? new Date().toISOString() : null });
      if (res.ok) sent++;
    }
  }
  return NextResponse.json({ ok: true, rounds: rounds?.length ?? 0, sent });
}

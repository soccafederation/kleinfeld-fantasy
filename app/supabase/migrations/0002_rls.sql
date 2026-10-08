-- ============================================================================
-- KLEINFELD FANTASY · Row Level Security
-- Prinzip: öffentlich lesbar = veröffentlichte Spiel-/Rangdaten; eigene Daten = eigene Zeilen;
-- alles Schreibende an Spielregeln läuft über SECURITY-DEFINER-Funktionen (0003_engine.sql).
-- ============================================================================

create or replace function current_role_of(uid uuid) returns user_role language sql stable security definer set search_path = public as $$
  select role from profiles where user_id = uid
$$;

create or replace function is_staff() returns boolean language sql stable as $$
  select coalesce(current_role_of(auth.uid()) in ('admin','editor'), false)
$$;

create or replace function is_admin() returns boolean language sql stable as $$
  select coalesce(current_role_of(auth.uid()) = 'admin', false)
$$;

-- ---------------------------------------------------------------------------
alter table profiles enable row level security;
create policy "profiles: public minimal read" on profiles for select using (true);
create policy "profiles: own update" on profiles for update using (auth.uid() = user_id) with check (auth.uid() = user_id and role = (select role from profiles p where p.user_id = auth.uid()));
create policy "profiles: staff update" on profiles for update using (is_admin());

alter table user_preferences enable row level security;
create policy "prefs: own" on user_preferences for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

alter table user_notifications enable row level security;
create policy "notif: own read" on user_notifications for select using (auth.uid() = user_id);
create policy "notif: own update" on user_notifications for update using (auth.uid() = user_id);

-- Öffentliche Stammdaten
alter table competitions enable row level security;
create policy "competitions: read" on competitions for select using (true);
create policy "competitions: staff write" on competitions for all using (is_staff()) with check (is_staff());

alter table seasons enable row level security;
create policy "seasons: read" on seasons for select using (status <> 'draft' or is_staff());
create policy "seasons: staff write" on seasons for all using (is_staff()) with check (is_staff());

alter table scoring_rule_versions enable row level security;
create policy "scoring: read" on scoring_rule_versions for select using (true);
create policy "scoring: staff write" on scoring_rule_versions for all using (is_staff()) with check (is_staff());

alter table clubs enable row level security;
create policy "clubs: read" on clubs for select using (true);
create policy "clubs: staff write" on clubs for all using (is_staff()) with check (is_staff());

alter table season_teams enable row level security;
create policy "season_teams: read" on season_teams for select using (true);
create policy "season_teams: staff write" on season_teams for all using (is_staff()) with check (is_staff());

alter table players enable row level security;
create policy "players: read" on players for select using (true);
create policy "players: staff write" on players for all using (is_staff()) with check (is_staff());

alter table season_players enable row level security;
create policy "season_players: read" on season_players for select using (true);
create policy "season_players: staff write" on season_players for all using (is_staff()) with check (is_staff());

alter table player_market_values enable row level security;
create policy "pmv: read" on player_market_values for select using (true);
create policy "pmv: staff write" on player_market_values for all using (is_staff()) with check (is_staff());

alter table fantasy_rounds enable row level security;
create policy "rounds: read" on fantasy_rounds for select using (true);
create policy "rounds: staff write" on fantasy_rounds for all using (is_staff()) with check (is_staff());

alter table matchdays enable row level security;
create policy "matchdays: read" on matchdays for select using (true);
create policy "matchdays: staff write" on matchdays for all using (is_staff()) with check (is_staff());

alter table matches enable row level security;
create policy "matches: read" on matches for select using (true);
create policy "matches: staff write" on matches for all using (is_staff()) with check (is_staff());

alter table stat_definitions enable row level security;
create policy "statdef: read" on stat_definitions for select using (true);
create policy "statdef: staff write" on stat_definitions for all using (is_staff()) with check (is_staff());

-- Statistik-Pipeline: nur Staff; veröffentlichte Round-Statistiken öffentlich
alter table statistic_imports enable row level security;
create policy "imports: staff" on statistic_imports for all using (is_staff()) with check (is_staff());
alter table statistic_snapshots enable row level security;
create policy "snapshots: staff" on statistic_snapshots for all using (is_staff()) with check (is_staff());
alter table statistic_snapshot_values enable row level security;
create policy "snapshot_values: staff" on statistic_snapshot_values for all using (is_staff()) with check (is_staff());
alter table player_round_statistics enable row level security;
create policy "prs: public read published" on player_round_statistics for select using (status in ('published','corrected') or is_staff());
create policy "prs: staff write" on player_round_statistics for all using (is_staff()) with check (is_staff());
alter table statistic_corrections enable row level security;
create policy "corrections: staff" on statistic_corrections for all using (is_staff()) with check (is_staff());
alter table import_audit_logs enable row level security;
create policy "import_audit: staff" on import_audit_logs for all using (is_staff()) with check (is_staff());

-- Fantasy: eigene Daten, Schreiben nur über Funktionen
alter table fantasy_teams enable row level security;
create policy "teams: public read" on fantasy_teams for select using (true);
create policy "teams: staff update" on fantasy_teams for update using (is_staff());

alter table fantasy_rosters enable row level security;
create policy "rosters: own read" on fantasy_rosters for select using (
  exists (select 1 from fantasy_teams t where t.id = fantasy_team_id and t.user_id = auth.uid()) or is_staff()
);

alter table fantasy_lineups enable row level security;
create policy "lineups: read" on fantasy_lineups for select using (
  exists (select 1 from fantasy_rounds r where r.id = round_id and r.status <> 'upcoming')
  or exists (select 1 from fantasy_teams t where t.id = fantasy_team_id and t.user_id = auth.uid())
  or is_staff()
);
alter table fantasy_lineup_players enable row level security;
create policy "lineup_players: read" on fantasy_lineup_players for select using (
  exists (select 1 from fantasy_lineups l where l.id = lineup_id)
);

alter table fantasy_transfers enable row level security;
create policy "transfers: own read" on fantasy_transfers for select using (
  exists (select 1 from fantasy_teams t where t.id = fantasy_team_id and t.user_id = auth.uid()) or is_staff()
);

alter table fantasy_player_scores enable row level security;
create policy "player_scores: read" on fantasy_player_scores for select using (true);
alter table fantasy_team_scores enable row level security;
create policy "team_scores: read" on fantasy_team_scores for select using (true);

alter table leaderboard_overall enable row level security;
create policy "lb_overall: read" on leaderboard_overall for select using (true);
alter table leaderboard_round enable row level security;
create policy "lb_round: read" on leaderboard_round for select using (true);
alter table leaderboard_history enable row level security;
create policy "lb_history: read" on leaderboard_history for select using (true);
alter table round_winners enable row level security;
create policy "round_winners: read" on round_winners for select using (true);
alter table season_champions enable row level security;
create policy "champions: read" on season_champions for select using (true);

alter table fantasy_leagues enable row level security;
create policy "leagues: member read" on fantasy_leagues for select using (
  owner_id = auth.uid() or is_staff()
  or exists (select 1 from fantasy_league_members m join fantasy_teams t on t.id = m.fantasy_team_id where m.league_id = id and t.user_id = auth.uid())
);
create policy "leagues: owner insert" on fantasy_leagues for insert with check (owner_id = auth.uid());
create policy "leagues: owner update" on fantasy_leagues for update using (owner_id = auth.uid());
create policy "leagues: owner delete" on fantasy_leagues for delete using (owner_id = auth.uid() or is_staff());

alter table fantasy_league_members enable row level security;
create policy "league_members: read" on fantasy_league_members for select using (
  exists (select 1 from fantasy_leagues l where l.id = league_id and (l.owner_id = auth.uid()
    or exists (select 1 from fantasy_league_members m2 join fantasy_teams t on t.id = m2.fantasy_team_id where m2.league_id = l.id and t.user_id = auth.uid())))
  or is_staff()
);
create policy "league_members: leave" on fantasy_league_members for delete using (
  exists (select 1 from fantasy_teams t where t.id = fantasy_team_id and t.user_id = auth.uid())
);

alter table prizes enable row level security;
create policy "prizes: read" on prizes for select using (true);
create policy "prizes: staff write" on prizes for all using (is_staff()) with check (is_staff());
alter table prize_winners enable row level security;
create policy "prize_winners: read" on prize_winners for select using (true);
create policy "prize_winners: staff write" on prize_winners for all using (is_staff()) with check (is_staff());

alter table audit_logs enable row level security;
create policy "audit: admin read" on audit_logs for select using (is_admin());
create policy "audit: staff insert" on audit_logs for insert with check (is_staff());

-- Storage-Buckets (öffentlich lesbar, Schreiben nur Staff)
insert into storage.buckets (id, name, public) values
  ('player-images', 'player-images', true),
  ('club-logos', 'club-logos', true),
  ('prize-images', 'prize-images', true),
  ('season-assets', 'season-assets', true),
  ('imports', 'imports', false)
on conflict (id) do nothing;

create policy "storage: public read" on storage.objects for select using (bucket_id in ('player-images','club-logos','prize-images','season-assets'));
create policy "storage: staff write" on storage.objects for insert with check (is_staff());
create policy "storage: staff update" on storage.objects for update using (is_staff());
create policy "storage: staff delete" on storage.objects for delete using (is_staff());
create policy "storage: staff read imports" on storage.objects for select using (bucket_id = 'imports' and is_staff());

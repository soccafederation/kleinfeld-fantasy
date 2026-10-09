-- Engine-Test gegen lokalen Stub. Läuft als Superuser; auth.uid() wird per GUC gesetzt.
\set ON_ERROR_STOP on
\set QUIET on

-- Hilfsfunktion: Test-Assertion
create or replace function t_assert(cond boolean, msg text) returns void language plpgsql as $$
begin if not cond then raise exception 'ASSERT FAILED: %', msg; end if; raise notice 'ok – %', msg; end $$;

-- Zwei Nutzer registrieren (Trigger legt Profile an)
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-000000000001', 'a@test.de', '{"username":"GoalMachine","terms_accepted":true}'),
  ('00000000-0000-0000-0000-000000000002', 'b@test.de', '{"username":"BerlinBoss","terms_accepted":true}'),
  ('00000000-0000-0000-0000-000000000009', 'admin@test.de', '{"username":"admin","terms_accepted":true}');
update profiles set role = 'admin' where username = 'admin';
select t_assert((select count(*) from profiles) = 3, 'Profile werden automatisch angelegt');
select t_assert(username_available('NeuerName') and not username_available('goalmachine'), 'username_available prüft case-insensitiv');

-- Season & Spieler aus Demo-Seed
select id as season into temp t_season from seasons limit 1;
-- Round 1 Deadline in die Zukunft legen, damit der Kader gebaut werden kann
update fantasy_rounds set deadline_at = now() + interval '1 hour' where number = 1;

-- Spielerlisten vorbereiten
create temp table t_gk as select sp.id, sp.market_value_m, st.club_id from season_players sp join season_teams st on st.id = sp.season_team_id where sp.position = 'GK' order by sp.market_value_m desc;
create temp table t_field as select sp.id, sp.market_value_m, st.club_id, row_number() over (order by sp.market_value_m desc, sp.id) rn from season_players sp join season_teams st on st.id = sp.season_team_id where sp.position = 'FIELD';

-- ── Nutzer A: Budgetüberschreitung (alle Topspieler) ───────────────────────
set local request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';
do $$
declare v_res jsonb; v_players jsonb; v_cap uuid;
begin
  select jsonb_agg(jsonb_build_object('season_player_id', id, 'slot', slot, 'slot_order', rn)) into v_players from (
    (select id, 'GK' slot, 0 rn from t_gk limit 1)
    union all (select id, 'FIELD', rn from t_field where rn <= 4)
    union all (select id, 'BENCH', rn from t_field where rn between 5 and 6)
  ) x;
  select id into v_cap from t_field where rn = 1;
  v_res := save_roster((select season from t_season), 'Kennedyplatz Kings', v_players, v_cap, true);
  perform t_assert((v_res->>'ok')::boolean = false and v_res->'errors' @> '["Budget überschritten: 103.0 von 100 Mio."]'::jsonb, 'Budgetüberschreitung wird verhindert: ' || (v_res->'errors')::text);
end $$;

-- ── Nutzer A: zu viele Spieler eines Clubs ─────────────────────────────────
do $$
declare v_res jsonb; v_players jsonb; v_club uuid; v_cap uuid;
begin
  select club_id into v_club from t_gk limit 1;
  select jsonb_agg(jsonb_build_object('season_player_id', id, 'slot', slot, 'slot_order', rn)) into v_players from (
    (select id, 'GK' slot, 0 rn from t_gk where club_id = v_club)
    union all (select id, 'FIELD', rn from t_field where club_id = v_club order by rn limit 4)
    union all (select id, 'BENCH', rn from t_field where club_id <> v_club and market_value_m <= 5 limit 2)
  ) x;
  v_res := save_roster((select season from t_season), 'Kennedyplatz Kings', v_players, null, true);
  perform t_assert((v_res->>'ok')::boolean = false and (v_res->'errors')::text like '%Maximal 3 Spieler pro Team%', 'Mannschaftslimit greift');
end $$;

-- ── Nutzer A: gültiges Team (Budget ≤ 100, max 3/Club) ─────────────────────
create temp table t_pick_a as
  select id, 'GK'::text slot, 0 rn from t_gk order by market_value_m desc limit 1;
insert into t_pick_a
  select id, 'FIELD', rn from (
    select f.*, row_number() over (partition by club_id order by rn) cn from t_field f
  ) q where cn <= 2 and market_value_m in (12.0, 9.5) order by rn limit 4;
insert into t_pick_a
  select id, 'BENCH', rn from t_field where market_value_m = 5.0 and id not in (select id from t_pick_a) limit 2;

do $$
declare v_res jsonb; v_players jsonb; v_cap uuid;
begin
  select jsonb_agg(jsonb_build_object('season_player_id', id, 'slot', slot, 'slot_order', rn)) into v_players from t_pick_a;
  select id into v_cap from t_pick_a where slot = 'FIELD' order by rn limit 1;
  v_res := save_roster((select season from t_season), 'Kennedyplatz Kings', v_players, v_cap, false);
  perform t_assert((v_res->>'ok')::boolean, 'Gültiges Team gespeichert: ' || v_res::text);
  perform t_assert((v_res->>'complete')::boolean and (v_res->>'total_m')::numeric <= 100, 'Team ist vollständig und im Budget (' || (v_res->>'total_m') || 'M)');
end $$;

-- ── Nutzer B: anderes Team ─────────────────────────────────────────────────
set local request.jwt.claim.sub = '00000000-0000-0000-0000-000000000002';
create temp table t_pick_b as
  select id, 'GK'::text slot, 0 rn from t_gk order by market_value_m asc limit 1;
insert into t_pick_b
  select id, 'FIELD', rn from t_field where market_value_m = 9.5 order by rn limit 4;
insert into t_pick_b
  select id, 'BENCH', rn from t_field where market_value_m = 6.0 and id not in (select id from t_pick_b) limit 2;
do $$
declare v_res jsonb; v_players jsonb; v_cap uuid;
begin
  select jsonb_agg(jsonb_build_object('season_player_id', id, 'slot', slot, 'slot_order', rn)) into v_players from t_pick_b;
  select id into v_cap from t_pick_b where slot = 'FIELD' order by rn limit 1;
  v_res := save_roster((select season from t_season), 'Hauptstadt XI', v_players, v_cap, false);
  perform t_assert((v_res->>'ok')::boolean, 'Team B gespeichert');
end $$;

-- ── Deadline-Lock ─────────────────────────────────────────────────────────
set local request.jwt.claim.sub = '00000000-0000-0000-0000-000000000009';
update fantasy_rounds set deadline_at = now() - interval '1 minute' where number = 1;
select t_assert(lock_due_rounds() = 1, 'Fällige Round wird gelockt');
select t_assert((select count(*) from fantasy_lineups) = 2 and (select count(*) from fantasy_lineup_players) = 14, 'Lineups eingefroren (2 Teams × 7 Spieler)');

-- Nach Deadline: Speichern muss scheitern
set local request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';
do $$
declare v_res jsonb; v_players jsonb;
begin
  -- Round 2 ist offen → Speichern wäre erlaubt (Transfers). Also Round 2 temporär schließen.
  update fantasy_rounds set deadline_at = now() - interval '1 minute' where number = 2;
  update fantasy_rounds set deadline_at = now() - interval '1 minute' where number = 3;
  select jsonb_agg(jsonb_build_object('season_player_id', id, 'slot', slot, 'slot_order', rn)) into v_players from t_pick_a;
  v_res := save_roster((select season from t_season), 'Kennedyplatz Kings', v_players, (select id from t_pick_a where slot='FIELD' limit 1), false);
  perform t_assert((v_res->>'ok')::boolean = false and (v_res->'errors')::text like '%Deadline%', 'Änderung nach Deadline unmöglich');
  update fantasy_rounds set deadline_at = now() + interval '3 days' where number = 2;
  update fantasy_rounds set deadline_at = now() + interval '10 days' where number = 3;
end $$;

-- ── Statistiken: kumulierter Snapshot für Spieltag 1 ──────────────────────
set local request.jwt.claim.sub = '00000000-0000-0000-0000-000000000009';
do $$
declare v_imp uuid; v_snap uuid; v_r1 uuid; v_res jsonb; v_capA uuid; v_gkA uuid;
begin
  select id into v_r1 from fantasy_rounds where number = 1;
  insert into statistic_imports (season_id, round_id, source, mode, status) values ((select season from t_season), v_r1, 'csv', 'cumulative', 'review') returning id into v_imp;
  insert into statistic_snapshots (season_id, import_id, as_of_round_id) values ((select season from t_season), v_imp, v_r1) returning id into v_snap;

  select captain_season_player_id into v_capA from fantasy_teams where name = 'Kennedyplatz Kings';
  select id into v_gkA from t_pick_a where slot = 'GK';

  -- Kapitän A: 2 Tore, 1 Assist, 4 Schüsse, 3 erf. Dribblings, 1 gelbe, 23 erfolgreiche Pässe → 12+4+2+3-2+2 = 21
  insert into statistic_snapshot_values (snapshot_id, season_player_id, stat_key, value) values
    (v_snap, v_capA, 'goals', 2), (v_snap, v_capA, 'assists', 1), (v_snap, v_capA, 'shots', 4),
    (v_snap, v_capA, 'dribbles_success', 3), (v_snap, v_capA, 'yellow', 1), (v_snap, v_capA, 'passes_success', 23), (v_snap, v_capA, 'passes', 27);
  -- Torwart A: 6 Paraden, 1 Tor (TW) → 4.5 + 8 = 12.5
  insert into statistic_snapshot_values (snapshot_id, season_player_id, stat_key, value) values
    (v_snap, v_gkA, 'saves', 6), (v_snap, v_gkA, 'goals', 1);
  -- Alle anderen Spieler: 1 Balleroberung → 1.5
  insert into statistic_snapshot_values (snapshot_id, season_player_id, stat_key, value)
    select v_snap, id, 'tackles_won', 1 from season_players where id not in (v_capA, v_gkA);

  v_res := derive_round_stats_from_snapshot(v_snap);
  perform t_assert((v_res->>'ok')::boolean, 'Deltas aus erstem Snapshot abgeleitet: ' || v_res::text);
  perform publish_round_stats(v_r1);

  v_res := compute_round(v_r1, true);
  perform t_assert((v_res->>'ok')::boolean, 'Round berechnet: ' || v_res::text);

  perform t_assert((select points from fantasy_player_scores where season_player_id = v_capA and round_id = v_r1) = 21, 'Kapitän A: 21 Punkte (Tore, Assist, Schüsse, Dribblings, Gelb, 10er-Pässe)');
  perform t_assert((select points from fantasy_player_scores where season_player_id = v_gkA and round_id = v_r1) = 12.5, 'Torwart A: 12,5 Punkte (Paraden 0,75 + TW-Tor 8)');
end $$;

-- Teampunkte A: Startelf = GK 12.5 + Kapitän 21 + 3 Feldspieler × 1.5 = 38; Kapitänsbonus +21 → 59; Bank zählt nicht
select t_assert((select total_points from fantasy_team_scores ts join fantasy_teams t on t.id = ts.fantasy_team_id where t.name = 'Kennedyplatz Kings') = 59, 'Team A: 59 Punkte inkl. Kapitän ×2, Bank zählt nicht');
-- Teampunkte B: GK 12.5 + 4 × 1.5 + Kapitänsbonus 1.5 = 20
select t_assert((select total_points from fantasy_team_scores ts join fantasy_teams t on t.id = ts.fantasy_team_id where t.name = 'Hauptstadt XI') = 20, 'Team B: 20 Punkte (gleicher Torwart 12,5 + 4 × 1,5 + Kapitänsbonus 1,5)');

select t_assert((select rank from leaderboard_overall lo join fantasy_teams t on t.id = lo.fantasy_team_id where t.name = 'Kennedyplatz Kings') = 1, 'Leaderboard: A auf Rang 1');
select t_assert((select fantasy_team_id from round_winners) = (select id from fantasy_teams where name = 'Kennedyplatz Kings'), 'Manager of the Matchday = A');
select t_assert((select status from fantasy_rounds where number = 1) = 'completed', 'Round 1 abgeschlossen');

-- my_rank für B
set local request.jwt.claim.sub = '00000000-0000-0000-0000-000000000002';
select t_assert((my_rank((select season from t_season))->>'rank')::int = 2 and (my_rank((select season from t_season))->>'total_managers')::int = 2 and (my_rank((select season from t_season))->>'points_to_next')::numeric = 39, 'my_rank: B ist #2 von 2, 39 Punkte bis zum nächsten Rang');
select t_assert((select count(*) from leaderboard_window((select season from t_season), 1, 2)) = 2 and (select is_me from leaderboard_window((select season from t_season), 2, 2)) = true, 'leaderboard_window liefert Fenster mit is_me');

-- ── Transfers für Round 2: A tauscht 3 Spieler (2 frei + 1 mit Abzug) ────────
set local request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';
do $$
declare v_res jsonb; v_players jsonb; v_cap uuid;
begin
  -- Ersetze die 2 Bankspieler und 1 Feldspieler durch andere günstige Spieler
  create temp table t_pick_a2 as select * from t_pick_a where slot <> 'BENCH';
  delete from t_pick_a2 where slot = 'FIELD' and rn = (select max(rn) from t_pick_a2 where slot = 'FIELD');
  insert into t_pick_a2 select id, 'FIELD', 99 from t_field where market_value_m = 7.0 and id not in (select id from t_pick_a) limit 1;
  insert into t_pick_a2 select id, 'BENCH', 100 from t_field where market_value_m = 5.0 and id not in (select id from t_pick_a) limit 2;
  select jsonb_agg(jsonb_build_object('season_player_id', id, 'slot', slot, 'slot_order', rn)) into v_players from t_pick_a2;
  select id into v_cap from t_pick_a2 where slot = 'FIELD' order by rn limit 1;
  v_res := save_roster((select season from t_season), 'Kennedyplatz Kings', v_players, v_cap, false);
  perform t_assert((v_res->>'ok')::boolean and (v_res->>'transfers')::int = 3 and (v_res->>'penalty')::numeric = 4, '3 Transfers: 2 frei, 1 × −4 Punkte: ' || v_res::text);
  perform t_assert((select count(*) from fantasy_transfers where is_free = false) = 1, 'Transfer mit Abzug protokolliert');
end $$;

-- ── Korrektur + Neuberechnung ─────────────────────────────────────────────
set local request.jwt.claim.sub = '00000000-0000-0000-0000-000000000009';
do $$
declare v_stat uuid; v_r1 uuid; v_res jsonb; v_capA uuid;
begin
  select id into v_r1 from fantasy_rounds where number = 1;
  select captain_season_player_id into v_capA from fantasy_teams where name = 'Kennedyplatz Kings';
  select id into v_stat from player_round_statistics where round_id = v_r1 and season_player_id = v_capA and stat_key = 'goals';
  perform correct_round_stat(v_stat, 3, 'Nachträgliche Korrektur durch Liga');
  v_res := compute_round(v_r1, true);
  perform t_assert((select points from fantasy_player_scores where season_player_id = v_capA and round_id = v_r1) = 27, 'Nach Korrektur: Kapitän 27 Punkte');
  perform t_assert((select total_points from fantasy_team_scores ts join fantasy_teams t on t.id = ts.fantasy_team_id where t.name = 'Kennedyplatz Kings') = 71, 'Team A nach Neuberechnung 71 Punkte (konsistent)');
  perform t_assert((select total_points from leaderboard_overall lo join fantasy_teams t on t.id = lo.fantasy_team_id where t.name = 'Kennedyplatz Kings') = 71, 'Leaderboard konsistent neu berechnet');
  perform t_assert((select count(*) from statistic_corrections) = 1 and (select count(*) from audit_logs where action like 'compute%') = 2, 'Korrektur und Läufe protokolliert');
end $$;

-- ── Snapshot-Lücke blockiert ──────────────────────────────────────────────
do $$
declare v_snap uuid; v_r3 uuid; v_res jsonb;
begin
  select id into v_r3 from fantasy_rounds where number = 3;
  insert into statistic_snapshots (season_id, as_of_round_id) values ((select season from t_season), v_r3) returning id into v_snap;
  v_res := derive_round_stats_from_snapshot(v_snap);
  perform t_assert((v_res->>'ok')::boolean = false and v_res->>'blocked_reason' like '%mehrere Spieltage%', 'Snapshot-Lücke (R1 → R3) wird blockiert');
end $$;

-- ── Automatisches Nachrücken ──────────────────────────────────────────────
set local request.jwt.claim.sub = '00000000-0000-0000-0000-000000000009';
do $$
declare v_r1 uuid; v_out uuid; v_team uuid; v_before numeric; v_after numeric;
begin
  select id into v_r1 from fantasy_rounds where number = 1;
  select id into v_team from fantasy_teams where name = 'Hauptstadt XI';
  select total_points into v_before from fantasy_team_scores where fantasy_team_id = v_team and round_id = v_r1;
  -- ein Feld-Starter von B (nicht Kapitän) hat nicht gespielt
  select lp.season_player_id into v_out from fantasy_lineup_players lp join fantasy_lineups l on l.id = lp.lineup_id
  where l.fantasy_team_id = v_team and l.round_id = v_r1 and lp.slot = 'FIELD'
    and lp.season_player_id <> (select captain_season_player_id from fantasy_teams where id = v_team)
    limit 1;
  delete from player_round_statistics where round_id = v_r1 and season_player_id = v_out;
  perform compute_round(v_r1, true);
  select total_points into v_after from fantasy_team_scores where fantasy_team_id = v_team and round_id = v_r1;
  perform t_assert(v_after = v_before and jsonb_array_length((select auto_subs from fantasy_team_scores where fantasy_team_id = v_team and round_id = v_r1)) = 1,
    format('Auto-Sub: Bankspieler rückt für Nichtspieler nach (%s → %s Punkte, 1 Wechsel)', v_before, v_after));
  update seasons set rules = rules || '{"auto_sub": false}'::jsonb;
  perform compute_round(v_r1, true);
  perform t_assert((select total_points from fantasy_team_scores where fantasy_team_id = v_team and round_id = v_r1) = v_before - 1.5,
    'Ohne Auto-Sub: Nichtspieler bringt 0 Punkte');
  update seasons set rules = rules - 'auto_sub';
end $$;

-- ── Datenexport ───────────────────────────────────────────────────────────
set local request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';
select t_assert((export_my_data()->'teams')::text like '%Kennedyplatz Kings%', 'Datenexport enthält eigenes Team');

select 'ALLE ENGINE-TESTS BESTANDEN' as result;

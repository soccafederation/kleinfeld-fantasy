-- ============================================================================
-- KLEINFELD FANTASY · Engine
-- Alle Spielregeln werden hier durchgesetzt. Clients rufen nur diese Funktionen.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Standardregeln (Entscheidungsliste E1–E13)
-- ---------------------------------------------------------------------------
create or replace function season_rules_default() returns jsonb language sql immutable as $$
  select '{
    "budget_m": 100,
    "squad": {"GK": 1, "FIELD": 4, "BENCH": 2},
    "bench_counts": false,
    "auto_sub": false,
    "max_per_club": 3,
    "captain_multiplier": 2,
    "transfers": {"free_per_round": 2, "carry_over": false, "penalty_points": 4, "max_extra": 3},
    "late_entry": "allowed",
    "tiebreak": ["total_points", "last_round_points", "fewer_transfers", "earlier_created"]
  }'::jsonb
$$;

create or replace function scoring_rules_default() returns jsonb language sql immutable as $$
  select '{
    "rules": [
      {"stat": "goals",            "applies_to": "FIELD", "points": 6},
      {"stat": "goals",            "applies_to": "GK",    "points": 8},
      {"stat": "assists",          "points": 4},
      {"stat": "shots",            "points": 0.5},
      {"stat": "dribbles_success", "points": 1},
      {"stat": "fouls_suffered",   "points": 0.5},
      {"stat": "passes_success",   "points": 1, "per": 10, "mode": "floor"},
      {"stat": "pass_accuracy",    "points": 2,  "condition": {"gte": 85, "min_stat": "passes", "min": 15}, "enabled": false},
      {"stat": "pass_accuracy",    "points": -2, "condition": {"lt": 60,  "min_stat": "passes", "min": 15}, "enabled": false},
      {"stat": "tackles_won",      "points": 1.5},
      {"stat": "clearances",       "points": 0.5},
      {"stat": "fouls",            "points": -0.5},
      {"stat": "yellow",           "points": -2},
      {"stat": "red",              "points": -5},
      {"stat": "saves",            "applies_to": "GK", "points": 0.75}
    ],
    "exclude_stats": ["scorer_points"]
  }'::jsonb
$$;

-- Effektive Regeln einer Season (Defaults + Überschreibungen)
create or replace function season_rules(p_season_id uuid) returns jsonb language sql stable as $$
  select season_rules_default() || coalesce((select rules from seasons where id = p_season_id), '{}'::jsonb)
$$;

-- ---------------------------------------------------------------------------
-- Nächste offene Round einer Season
-- ---------------------------------------------------------------------------
create or replace function next_open_round(p_season_id uuid) returns fantasy_rounds language sql stable as $$
  select * from fantasy_rounds
  where season_id = p_season_id and status = 'upcoming' and deadline_at > now()
  order by deadline_at asc limit 1
$$;

-- Letzte gelockte Aufstellung eines Teams
create or replace function last_locked_lineup(p_team_id uuid) returns fantasy_lineups language sql stable as $$
  select l.* from fantasy_lineups l join fantasy_rounds r on r.id = l.round_id
  where l.fantasy_team_id = p_team_id order by r.number desc limit 1
$$;

-- ---------------------------------------------------------------------------
-- Kader speichern (Onboarding, Transfers, Kapitän) – zentrale Regelprüfung
-- p_players: [{"season_player_id": "...", "slot": "GK|FIELD|BENCH", "slot_order": 0}]
-- Rückgabe: {ok, errors[], team_id, transfers, penalty}
-- ---------------------------------------------------------------------------
create or replace function save_roster(
  p_season_id uuid,
  p_team_name text,
  p_players jsonb,
  p_captain uuid,
  p_dry_run boolean default false
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_rules jsonb := season_rules(p_season_id);
  v_round fantasy_rounds;
  v_team fantasy_teams;
  v_errors text[] := '{}';
  v_budget numeric := (v_rules->>'budget_m')::numeric;
  v_total numeric := 0;
  v_cnt_gk int; v_cnt_field int; v_cnt_bench int; v_cnt_total int;
  v_need_gk int := (v_rules->'squad'->>'GK')::int;
  v_need_field int := (v_rules->'squad'->>'FIELD')::int;
  v_need_bench int := (v_rules->'squad'->>'BENCH')::int;
  v_max_club int := (v_rules->>'max_per_club')::int;
  v_bad_club text;
  v_complete boolean;
  v_last_lineup fantasy_lineups;
  v_transfers int := 0;
  v_free int := (v_rules->'transfers'->>'free_per_round')::int;
  v_penalty_each numeric := (v_rules->'transfers'->>'penalty_points')::numeric;
  v_max_extra int := (v_rules->'transfers'->>'max_extra')::int;
  v_penalty numeric := 0;
  v_season seasons;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'errors', jsonb_build_array('Nicht eingeloggt.'));
  end if;

  select * into v_season from seasons where id = p_season_id;
  if v_season.status not in ('open','live') then
    v_errors := array_append(v_errors, 'Dieser Wettbewerb ist aktuell nicht offen.');
  end if;

  v_round := next_open_round(p_season_id);
  if v_round.id is null then
    v_errors := array_append(v_errors, 'Keine offene Spieltagsrunde – die Deadline ist abgelaufen oder es gibt noch keinen Spieltag.');
  end if;

  if p_team_name is null or length(trim(p_team_name)) < 3 or length(trim(p_team_name)) > 30 then
    v_errors := array_append(v_errors, 'Teamname muss 3–30 Zeichen lang sein.');
  end if;

  -- Spieler validieren (Season-Zugehörigkeit, Status, Doppelungen)
  drop table if exists tmp_roster;
  create temp table tmp_roster (season_player_id uuid, slot roster_slot, slot_order int, value_m numeric, position player_position, team_id uuid, status player_status) on commit drop;
  insert into tmp_roster
  select (e->>'season_player_id')::uuid, (e->>'slot')::roster_slot, coalesce((e->>'slot_order')::int, 0),
         sp.market_value_m, sp.position, sp.season_team_id, sp.status
  from jsonb_array_elements(p_players) e
  left join season_players sp on sp.id = (e->>'season_player_id')::uuid and sp.season_id = p_season_id;

  if exists (select 1 from tmp_roster where position is null) then
    v_errors := array_append(v_errors, 'Mindestens ein Spieler gehört nicht zu diesem Wettbewerb.');
  end if;
  if exists (select 1 from tmp_roster where status = 'left') then
    v_errors := array_append(v_errors, 'Mindestens ein Spieler ist nicht mehr im Wettbewerb.');
  end if;
  if (select count(*) from tmp_roster) <> (select count(distinct season_player_id) from tmp_roster) then
    v_errors := array_append(v_errors, 'Ein Spieler ist doppelt im Kader.');
  end if;
  if exists (select 1 from tmp_roster where slot = 'GK' and position <> 'GK') then
    v_errors := array_append(v_errors, 'Im Tor darf nur ein Torwart stehen.');
  end if;
  if exists (select 1 from tmp_roster where slot = 'FIELD' and position <> 'FIELD') then
    v_errors := array_append(v_errors, 'Auf den Feldpositionen dürfen nur Feldspieler stehen.');
  end if;

  select count(*) filter (where slot = 'GK'), count(*) filter (where slot = 'FIELD'), count(*) filter (where slot = 'BENCH'), count(*), coalesce(sum(value_m), 0)
    into v_cnt_gk, v_cnt_field, v_cnt_bench, v_cnt_total, v_total from tmp_roster;

  if v_cnt_gk > v_need_gk then v_errors := array_append(v_errors, format('Maximal %s Torwart erlaubt.', v_need_gk)); end if;
  if v_cnt_field > v_need_field then v_errors := array_append(v_errors, format('Maximal %s Feldspieler erlaubt.', v_need_field)); end if;
  if v_cnt_bench > v_need_bench then v_errors := array_append(v_errors, format('Maximal %s Ersatzspieler erlaubt.', v_need_bench)); end if;
  if v_total > v_budget then v_errors := array_append(v_errors, format('Budget überschritten: %s von %s Mio.', v_total, v_budget)); end if;

  select c.short_name into v_bad_club
  from tmp_roster t join season_teams st on st.id = t.team_id join clubs c on c.id = st.club_id
  group by c.short_name having count(*) > v_max_club limit 1;
  if v_bad_club is not null then
    v_errors := array_append(v_errors, format('Maximal %s Spieler pro Team (%s).', v_max_club, v_bad_club));
  end if;

  v_complete := (v_cnt_gk = v_need_gk and v_cnt_field = v_need_field and v_cnt_bench = v_need_bench and v_total <= v_budget);

  if p_captain is not null and not exists (select 1 from tmp_roster where season_player_id = p_captain and slot in ('GK','FIELD')) then
    v_errors := array_append(v_errors, 'Der Kapitän muss in der Startaufstellung stehen.');
  end if;
  if v_complete and p_captain is null then
    v_errors := array_append(v_errors, 'Bitte einen Kapitän bestimmen.');
  end if;

  -- Bestehendes Team + Transfers
  select * into v_team from fantasy_teams where user_id = v_uid and season_id = p_season_id;
  if v_team.id is not null then
    v_last_lineup := last_locked_lineup(v_team.id);
    if v_last_lineup.id is not null then
      select count(*) into v_transfers
      from fantasy_lineup_players lp
      where lp.lineup_id = v_last_lineup.id
        and lp.season_player_id not in (select season_player_id from tmp_roster);
      if v_transfers > v_free + v_max_extra then
        v_errors := array_append(v_errors, format('Maximal %s Transfers pro Spieltag (%s frei + %s mit Abzug).', v_free + v_max_extra, v_free, v_max_extra));
      end if;
      v_penalty := greatest(0, v_transfers - v_free) * v_penalty_each;
    end if;
  end if;

  if array_length(v_errors, 1) > 0 or p_dry_run then
    return jsonb_build_object('ok', array_length(v_errors, 1) is null, 'errors', to_jsonb(v_errors), 'complete', v_complete,
      'total_m', v_total, 'budget_m', v_budget, 'transfers', v_transfers, 'free_transfers', v_free, 'penalty', v_penalty);
  end if;

  -- Speichern
  if v_team.id is null then
    insert into fantasy_teams (user_id, season_id, name, captain_season_player_id, joined_round_id, is_complete)
    values (v_uid, p_season_id, trim(p_team_name), p_captain, v_round.id, v_complete)
    returning * into v_team;
  else
    update fantasy_teams set name = trim(p_team_name), captain_season_player_id = p_captain, is_complete = v_complete
    where id = v_team.id returning * into v_team;
  end if;

  delete from fantasy_rosters where fantasy_team_id = v_team.id;
  insert into fantasy_rosters (fantasy_team_id, season_player_id, slot, slot_order, price_paid_m, acquired_round_id)
  select v_team.id, season_player_id, slot, slot_order, value_m, v_round.id from tmp_roster;

  -- Transfers für die kommende Round neu ableiten (Undo innerhalb des Fensters möglich)
  delete from fantasy_transfers where fantasy_team_id = v_team.id and round_id = v_round.id;
  if v_last_lineup.id is not null then
    insert into fantasy_transfers (fantasy_team_id, round_id, out_season_player_id, in_season_player_id, is_free, penalty_points)
    select v_team.id, v_round.id, o.season_player_id, i.season_player_id,
           row_number() over () <= v_free,
           case when row_number() over () <= v_free then 0 else v_penalty_each end
    from (select season_player_id, row_number() over () rn from fantasy_lineup_players where lineup_id = v_last_lineup.id
            and season_player_id not in (select season_player_id from tmp_roster)) o
    full join (select season_player_id, row_number() over () rn from tmp_roster
            where season_player_id not in (select season_player_id from fantasy_lineup_players where lineup_id = v_last_lineup.id)) i
      on o.rn = i.rn;
  end if;

  return jsonb_build_object('ok', true, 'errors', '[]'::jsonb, 'team_id', v_team.id, 'complete', v_complete,
    'total_m', v_total, 'budget_m', v_budget, 'transfers', v_transfers, 'free_transfers', v_free, 'penalty', v_penalty);
end $$;

-- ---------------------------------------------------------------------------
-- Private Liga beitreten (per Code)
-- ---------------------------------------------------------------------------
create or replace function join_league(p_code text) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_league fantasy_leagues;
  v_team fantasy_teams;
begin
  select * into v_league from fantasy_leagues where invite_code = upper(trim(p_code));
  if v_league.id is null then return jsonb_build_object('ok', false, 'error', 'Ungültiger Einladungscode.'); end if;
  select * into v_team from fantasy_teams where user_id = auth.uid() and season_id = v_league.season_id;
  if v_team.id is null then return jsonb_build_object('ok', false, 'error', 'Du hast in diesem Wettbewerb noch kein Team.'); end if;
  insert into fantasy_league_members (league_id, fantasy_team_id) values (v_league.id, v_team.id) on conflict do nothing;
  return jsonb_build_object('ok', true, 'league_id', v_league.id);
end $$;

create or replace function create_league(p_season_id uuid, p_name text) returns jsonb language plpgsql security definer set search_path = public as $$
declare v_league fantasy_leagues; v_team fantasy_teams;
begin
  select * into v_team from fantasy_teams where user_id = auth.uid() and season_id = p_season_id;
  if v_team.id is null then return jsonb_build_object('ok', false, 'error', 'Erstelle zuerst dein Team.'); end if;
  insert into fantasy_leagues (season_id, owner_id, name) values (p_season_id, auth.uid(), trim(p_name)) returning * into v_league;
  insert into fantasy_league_members (league_id, fantasy_team_id) values (v_league.id, v_team.id);
  return jsonb_build_object('ok', true, 'league_id', v_league.id, 'invite_code', v_league.invite_code);
end $$;

-- ---------------------------------------------------------------------------
-- Deadline-Lock: Aufstellungen einfrieren
-- ---------------------------------------------------------------------------
create or replace function lock_round(p_round_id uuid) returns jsonb language plpgsql security definer set search_path = public as $$
declare v_round fantasy_rounds; v_count int := 0;
begin
  if auth.uid() is not null and not is_staff() then raise exception 'Keine Berechtigung.'; end if;
  select * into v_round from fantasy_rounds where id = p_round_id for update;
  if v_round.status <> 'upcoming' then
    return jsonb_build_object('ok', false, 'error', 'Round ist nicht mehr offen.');
  end if;

  insert into fantasy_lineups (fantasy_team_id, round_id, captain_season_player_id, locked_at)
  select t.id, p_round_id, t.captain_season_player_id, now()
  from fantasy_teams t where t.season_id = v_round.season_id and t.is_complete
  on conflict (fantasy_team_id, round_id) do nothing;

  insert into fantasy_lineup_players (lineup_id, season_player_id, slot, slot_order)
  select l.id, r.season_player_id, r.slot, r.slot_order
  from fantasy_lineups l join fantasy_rosters r on r.fantasy_team_id = l.fantasy_team_id
  where l.round_id = p_round_id
  on conflict do nothing;

  get diagnostics v_count = row_count;
  update fantasy_rounds set status = 'locked', locked_at = now() where id = p_round_id;
  insert into audit_logs (actor_id, entity, entity_id, action, after) values (auth.uid(), 'fantasy_rounds', p_round_id::text, 'lock', jsonb_build_object('lineup_players', v_count));
  return jsonb_build_object('ok', true, 'lineup_players', v_count);
end $$;

-- Cron: alle fälligen Rounds locken
create or replace function lock_due_rounds() returns int language plpgsql security definer set search_path = public as $$
declare r record; n int := 0;
begin
  if auth.uid() is not null and not is_staff() then raise exception 'Keine Berechtigung.'; end if;
  for r in select id from fantasy_rounds where status = 'upcoming' and deadline_at <= now() loop
    perform lock_round(r.id); n := n + 1;
  end loop;
  return n;
end $$;

-- ---------------------------------------------------------------------------
-- Punkteberechnung für einen Spieler aus Statistik-Map + Regelsatz
-- p_stats: {"goals": 2, "assists": 1, ...}; Rückgabe: {points, details[]}
-- ---------------------------------------------------------------------------
create or replace function score_player_stats(p_stats jsonb, p_position player_position, p_rules jsonb)
returns jsonb language plpgsql immutable as $$
declare
  rule jsonb; v_stat text; v_val numeric; v_pts numeric; v_total numeric := 0; v_details jsonb := '[]'::jsonb;
  v_per numeric; v_cond jsonb; v_min_stat numeric; v_passes numeric; v_passes_ok numeric;
begin
  for rule in select * from jsonb_array_elements(p_rules->'rules') loop
    if coalesce((rule->>'enabled')::boolean, true) = false then continue; end if;
    if rule ? 'applies_to' and (rule->>'applies_to') <> p_position::text then continue; end if;
    v_stat := rule->>'stat';

    if v_stat = 'pass_accuracy' then
      v_passes := (p_stats->>'passes')::numeric; v_passes_ok := (p_stats->>'passes_success')::numeric;
      if v_passes is null or v_passes_ok is null or v_passes = 0 then continue; end if;
      v_val := round(v_passes_ok / v_passes * 100, 1);
    else
      v_val := (p_stats->>v_stat)::numeric;
    end if;
    if v_val is null then continue; end if;

    v_cond := rule->'condition';
    if v_cond is not null then
      if v_cond ? 'min_stat' then
        v_min_stat := (p_stats->>(v_cond->>'min_stat'))::numeric;
        if v_min_stat is null or v_min_stat < (v_cond->>'min')::numeric then continue; end if;
      end if;
      if (v_cond ? 'gte' and v_val >= (v_cond->>'gte')::numeric) or (v_cond ? 'lt' and v_val < (v_cond->>'lt')::numeric) then
        v_pts := (rule->>'points')::numeric;
      else
        continue;
      end if;
    elsif rule ? 'per' then
      v_per := (rule->>'per')::numeric;
      v_pts := floor(v_val / v_per) * (rule->>'points')::numeric;
    else
      v_pts := v_val * (rule->>'points')::numeric;
    end if;

    if v_pts <> 0 then
      v_total := v_total + v_pts;
      v_details := v_details || jsonb_build_object('stat', v_stat, 'value', v_val, 'rule_points', (rule->>'points')::numeric, 'points', v_pts);
    end if;
  end loop;
  return jsonb_build_object('points', round(v_total, 2), 'details', v_details);
end $$;

-- ---------------------------------------------------------------------------
-- Round berechnen: Spielerpunkte → Teampunkte → Ranglisten → Sieger
-- ---------------------------------------------------------------------------
create or replace function compute_round(p_round_id uuid, p_finalize boolean default true) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_round fantasy_rounds; v_rules jsonb; v_scoring scoring_rule_versions; v_mult numeric;
  v_players int := 0; v_teams int := 0; v_bench boolean;
begin
  if auth.uid() is not null and not is_staff() then raise exception 'Keine Berechtigung.'; end if;
  select * into v_round from fantasy_rounds where id = p_round_id for update;
  if v_round.id is null then return jsonb_build_object('ok', false, 'error', 'Round nicht gefunden.'); end if;
  if v_round.status = 'upcoming' then return jsonb_build_object('ok', false, 'error', 'Round ist noch nicht gelockt.'); end if;

  v_rules := season_rules(v_round.season_id);
  v_mult := (v_rules->>'captain_multiplier')::numeric;
  v_bench := coalesce((v_rules->>'bench_counts')::boolean, false);
  select * into v_scoring from scoring_rule_versions where season_id = v_round.season_id and is_active;
  if v_scoring.id is null then return jsonb_build_object('ok', false, 'error', 'Kein aktives Punktesystem für diese Season.'); end if;

  -- 1) Spielerpunkte
  delete from fantasy_player_scores where round_id = p_round_id;
  insert into fantasy_player_scores (round_id, season_player_id, scoring_version_id, points, details, status)
  select p_round_id, s.season_player_id, v_scoring.id,
         (sc->>'points')::numeric, sc->'details', case when p_finalize then 'official' else 'provisional' end::score_status
  from (
    select season_player_id, jsonb_object_agg(stat_key, value) stats
    from player_round_statistics where round_id = p_round_id and status in ('confirmed','published','corrected')
    group by season_player_id
  ) s
  join season_players sp on sp.id = s.season_player_id
  cross join lateral score_player_stats(s.stats, sp.position, v_scoring.rules) sc;
  get diagnostics v_players = row_count;

  -- 2) Teampunkte aus gelockten Lineups
  delete from fantasy_team_scores where round_id = p_round_id;
  insert into fantasy_team_scores (fantasy_team_id, round_id, lineup_id, scoring_version_id, base_points, captain_bonus, transfer_penalty, total_points, status)
  select l.fantasy_team_id, p_round_id, l.id, v_scoring.id,
         b.base, b.cap, coalesce(tp.pen, 0), b.base + b.cap - coalesce(tp.pen, 0),
         case when p_finalize then 'official' else 'provisional' end::score_status
  from fantasy_lineups l
  cross join lateral (
    select coalesce(sum(case when lp.slot in ('GK','FIELD') or v_bench then coalesce(ps.points, 0) else 0 end), 0) base,
           coalesce(sum(case when lp.season_player_id = l.captain_season_player_id then coalesce(ps.points, 0) * (v_mult - 1) else 0 end), 0) cap
    from fantasy_lineup_players lp left join fantasy_player_scores ps on ps.round_id = p_round_id and ps.season_player_id = lp.season_player_id
    where lp.lineup_id = l.id
  ) b
  left join lateral (select sum(penalty_points) pen from fantasy_transfers t where t.fantasy_team_id = l.fantasy_team_id and t.round_id = p_round_id) tp on true
  where l.round_id = p_round_id;
  get diagnostics v_teams = row_count;

  -- 3) Round-Leaderboard
  delete from leaderboard_round where round_id = p_round_id;
  insert into leaderboard_round (round_id, fantasy_team_id, points, rank)
  select p_round_id, ts.fantasy_team_id, ts.total_points,
         rank() over (order by ts.total_points desc, ft.created_at asc)
  from fantasy_team_scores ts join fantasy_teams ft on ft.id = ts.fantasy_team_id where ts.round_id = p_round_id;

  if p_finalize then
    update fantasy_rounds set status = 'completed', completed_at = now() where id = p_round_id;
    delete from round_winners where round_id = p_round_id;
    insert into round_winners (round_id, fantasy_team_id, points)
    select p_round_id, fantasy_team_id, points from leaderboard_round where round_id = p_round_id and rank = 1 order by fantasy_team_id limit 1;
  else
    update fantasy_rounds set status = 'under_review' where id = p_round_id and status in ('locked','live');
  end if;

  -- 4) Gesamt-Leaderboard neu aufbauen
  perform rebuild_overall_leaderboard(v_round.season_id);

  insert into audit_logs (actor_id, entity, entity_id, action, after)
  values (auth.uid(), 'fantasy_rounds', p_round_id::text, case when p_finalize then 'compute_final' else 'compute_provisional' end,
          jsonb_build_object('players', v_players, 'teams', v_teams, 'scoring_version', v_scoring.version));
  return jsonb_build_object('ok', true, 'players', v_players, 'teams', v_teams);
end $$;

-- ---------------------------------------------------------------------------
-- Gesamt-Leaderboard: Summe aller abgeschlossenen Rounds, Tie-Break E9
-- ---------------------------------------------------------------------------
create or replace function rebuild_overall_leaderboard(p_season_id uuid) returns void language plpgsql security definer set search_path = public as $$
declare v_last_round uuid;
begin
  if auth.uid() is not null and not is_staff() then raise exception 'Keine Berechtigung.'; end if;
  select id into v_last_round from fantasy_rounds where season_id = p_season_id and status = 'completed' order by number desc limit 1;

  create temp table tmp_prev on commit drop as
    select fantasy_team_id, rank as prev_rank from leaderboard_overall where season_id = p_season_id;

  delete from leaderboard_overall where season_id = p_season_id;

  insert into leaderboard_overall (season_id, fantasy_team_id, total_points, last_round_points, rank, prev_rank, rank_delta, rounds_won, best_round_points)
  select p_season_id, agg.fantasy_team_id, agg.total, agg.last_pts,
         rank() over (order by agg.total desc, agg.last_pts desc, agg.transfers asc, agg.created_at asc) as rnk,
         pv.prev_rank,
         case when pv.prev_rank is null then null else pv.prev_rank - rank() over (order by agg.total desc, agg.last_pts desc, agg.transfers asc, agg.created_at asc) end,
         agg.won, agg.best
  from (
    select ft.id fantasy_team_id, ft.created_at,
           coalesce(sum(ts.total_points) filter (where r.status = 'completed'), 0) total,
           coalesce(max(ts.total_points) filter (where r.id = v_last_round), 0) last_pts,
           coalesce(max(ts.total_points) filter (where r.status = 'completed'), 0) best,
           (select count(*) from fantasy_transfers tr where tr.fantasy_team_id = ft.id) transfers,
           (select count(*) from round_winners w where w.fantasy_team_id = ft.id) won
    from fantasy_teams ft
    left join fantasy_team_scores ts on ts.fantasy_team_id = ft.id
    left join fantasy_rounds r on r.id = ts.round_id
    where ft.season_id = p_season_id and ft.is_complete
    group by ft.id, ft.created_at
  ) agg
  left join tmp_prev pv on pv.fantasy_team_id = agg.fantasy_team_id;

  -- Verlauf für die zuletzt abgeschlossene Round festschreiben
  if v_last_round is not null then
    delete from leaderboard_history where season_id = p_season_id and round_id = v_last_round;
    insert into leaderboard_history (season_id, fantasy_team_id, round_id, round_number, rank, total_points, round_points)
    select p_season_id, lo.fantasy_team_id, v_last_round, r.number, lo.rank, lo.total_points, lo.last_round_points
    from leaderboard_overall lo join fantasy_rounds r on r.id = v_last_round where lo.season_id = p_season_id;
  end if;

  drop table if exists tmp_prev;
end $$;

-- ---------------------------------------------------------------------------
-- Statistik-Snapshot → Round-Deltas
-- Rückgabe: {ok, rows, blocked_reason}
-- ---------------------------------------------------------------------------
create or replace function derive_round_stats_from_snapshot(p_snapshot_id uuid) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_snap statistic_snapshots; v_round fantasy_rounds; v_prev statistic_snapshots; v_prev_round fantasy_rounds; v_rows int := 0;
begin
  if auth.uid() is not null and not is_staff() then raise exception 'Keine Berechtigung.'; end if;
  select * into v_snap from statistic_snapshots where id = p_snapshot_id;
  select * into v_round from fantasy_rounds where id = v_snap.as_of_round_id;

  -- vorheriger gültiger Snapshot (höchste Round-Nummer < aktuelle)
  select s.* into v_prev from statistic_snapshots s join fantasy_rounds r on r.id = s.as_of_round_id
  where s.season_id = v_snap.season_id and s.is_valid and r.number < v_round.number and s.id <> p_snapshot_id
  order by r.number desc, s.captured_at desc limit 1;

  if v_prev.id is not null then
    select * into v_prev_round from fantasy_rounds where id = v_prev.as_of_round_id;
    if v_prev_round.number <> v_round.number - 1 then
      return jsonb_build_object('ok', false, 'blocked_reason',
        format('Zwischen Snapshot (Spieltag %s) und diesem Import (Spieltag %s) liegen mehrere Spieltage. Bitte manuell aufteilen oder Rounds zusammenlegen.', v_prev_round.number, v_round.number));
    end if;
  elsif v_round.number > 1 and exists (select 1 from fantasy_rounds where season_id = v_snap.season_id and number < v_round.number and status = 'completed') then
    return jsonb_build_object('ok', false, 'blocked_reason', 'Kein vorheriger Snapshot vorhanden, aber frühere Spieltage sind bereits abgeschlossen. Delta nicht eindeutig.');
  end if;

  delete from player_round_statistics where round_id = v_round.id and status in ('computed');

  insert into player_round_statistics (round_id, season_player_id, stat_key, value, derived_from_snapshot_id, previous_snapshot_id, status)
  select v_round.id, cur.season_player_id, cur.stat_key,
         case when sd.is_cumulative then cur.value - coalesce(prev.value, 0) else cur.value end,
         p_snapshot_id, v_prev.id, 'computed'
  from statistic_snapshot_values cur
  join stat_definitions sd on sd.key = cur.stat_key
  left join statistic_snapshot_values prev on prev.snapshot_id = v_prev.id and prev.season_player_id = cur.season_player_id and prev.stat_key = cur.stat_key
  where cur.snapshot_id = p_snapshot_id
    and cur.value is not null
    and sd.is_derived = false
    -- Kumulierter Wert ohne Vorgänger ist nur beim ersten Snapshot (kein prev) zulässig
    and (v_prev.id is null or prev.value is not null or sd.is_cumulative = false)
  on conflict (round_id, season_player_id, stat_key) do update
    set value = excluded.value, derived_from_snapshot_id = excluded.derived_from_snapshot_id, previous_snapshot_id = excluded.previous_snapshot_id
    where player_round_statistics.status = 'computed';
  get diagnostics v_rows = row_count;

  return jsonb_build_object('ok', true, 'rows', v_rows, 'previous_snapshot_id', v_prev.id);
end $$;

-- Round-Statistiken freigeben (confirmed → published) und Import abschließen
create or replace function publish_round_stats(p_round_id uuid) returns jsonb language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if auth.uid() is not null and not is_staff() then raise exception 'Keine Berechtigung.'; end if;
  update player_round_statistics set status = 'published' where round_id = p_round_id and status in ('computed','confirmed');
  get diagnostics n = row_count;
  update statistic_imports set status = 'published' where round_id = p_round_id and status in ('review','confirmed');
  return jsonb_build_object('ok', true, 'rows', n);
end $$;

-- Einzelwert korrigieren (mit Protokoll)
create or replace function correct_round_stat(p_round_stat_id uuid, p_new_value numeric, p_reason text) returns jsonb language plpgsql security definer set search_path = public as $$
declare v_old numeric;
begin
  if auth.uid() is not null and not is_staff() then raise exception 'Keine Berechtigung.'; end if;
  select value into v_old from player_round_statistics where id = p_round_stat_id;
  insert into statistic_corrections (round_stat_id, old_value, new_value, reason, corrected_by) values (p_round_stat_id, v_old, p_new_value, p_reason, auth.uid());
  update player_round_statistics set value = p_new_value, status = case when status = 'published' then 'corrected' else status end where id = p_round_stat_id;
  return jsonb_build_object('ok', true, 'old', v_old, 'new', p_new_value);
end $$;

-- ---------------------------------------------------------------------------
-- Leaderboard-Abfragen
-- ---------------------------------------------------------------------------
create or replace function my_rank(p_season_id uuid) returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce((
    select jsonb_build_object('rank', lo.rank, 'total_points', lo.total_points, 'last_round_points', lo.last_round_points,
                              'rank_delta', lo.rank_delta, 'prev_rank', lo.prev_rank, 'total_managers', (select count(*) from leaderboard_overall where season_id = p_season_id),
                              'fantasy_team_id', lo.fantasy_team_id,
                              'points_to_next', (select min(l2.total_points) - lo.total_points from leaderboard_overall l2 where l2.season_id = p_season_id and l2.rank < lo.rank),
                              'points_to_top100', (select l3.total_points - lo.total_points from leaderboard_overall l3 where l3.season_id = p_season_id and l3.rank = 100))
    from leaderboard_overall lo join fantasy_teams t on t.id = lo.fantasy_team_id
    where lo.season_id = p_season_id and t.user_id = auth.uid()
  ), '{}'::jsonb)
$$;

-- Rangfenster (für Jump to My Rank & Pagination): Zeilen rank_from..rank_to
create or replace function leaderboard_window(p_season_id uuid, p_from int, p_to int)
returns table (rank int, rank_delta int, total_points numeric, last_round_points numeric, fantasy_team_id uuid, team_name text, username citext, is_me boolean)
language sql stable security definer set search_path = public as $$
  select lo.rank, lo.rank_delta, lo.total_points, lo.last_round_points, lo.fantasy_team_id, t.name, p.username, t.user_id = auth.uid()
  from leaderboard_overall lo join fantasy_teams t on t.id = lo.fantasy_team_id join profiles p on p.user_id = t.user_id
  where lo.season_id = p_season_id and lo.rank between p_from and p_to
  order by lo.rank, t.created_at
$$;

create or replace function round_leaderboard_window(p_round_id uuid, p_from int, p_to int)
returns table (rank int, points numeric, fantasy_team_id uuid, team_name text, username citext, is_me boolean)
language sql stable security definer set search_path = public as $$
  select lr.rank, lr.points, lr.fantasy_team_id, t.name, p.username, t.user_id = auth.uid()
  from leaderboard_round lr join fantasy_teams t on t.id = lr.fantasy_team_id join profiles p on p.user_id = t.user_id
  where lr.round_id = p_round_id and lr.rank between p_from and p_to
  order by lr.rank, t.created_at
$$;

-- Private-Liga-Tabelle
create or replace function league_table(p_league_id uuid)
returns table (rank bigint, total_points numeric, last_round_points numeric, fantasy_team_id uuid, team_name text, username citext, is_me boolean)
language sql stable security definer set search_path = public as $$
  select rank() over (order by coalesce(lo.total_points,0) desc, coalesce(lo.last_round_points,0) desc, t.created_at),
         coalesce(lo.total_points,0), coalesce(lo.last_round_points,0), t.id, t.name, p.username, t.user_id = auth.uid()
  from fantasy_league_members m join fantasy_teams t on t.id = m.fantasy_team_id join profiles p on p.user_id = t.user_id
  left join leaderboard_overall lo on lo.fantasy_team_id = t.id
  where m.league_id = p_league_id
$$;

-- ---------------------------------------------------------------------------
-- Spielerstatistik-Aggregat für Markt/Profil (Season-weit)
-- ---------------------------------------------------------------------------
create or replace view player_season_stats as
select sp.id as season_player_id, sp.season_id,
       coalesce(sum(ps.points), 0)::numeric(8,2) total_points,
       count(ps.id) rounds_played,
       case when count(ps.id) > 0 then round(sum(ps.points) / count(ps.id), 2) else 0 end avg_points,
       (select points from fantasy_player_scores x join fantasy_rounds r on r.id = x.round_id where x.season_player_id = sp.id order by r.number desc limit 1) last_points,
       coalesce(max(ps.points), 0)::numeric(8,2) best_points,
       (select coalesce(sum(x.points),0) from (select points from fantasy_player_scores x join fantasy_rounds r on r.id = x.round_id where x.season_player_id = sp.id order by r.number desc limit 3) x) form3,
       case when sp.market_value_m > 0 then round(coalesce(sum(ps.points), 0) / sp.market_value_m, 2) else 0 end points_per_m,
       (select coalesce(sum(value),0) from player_round_statistics s where s.season_player_id = sp.id and s.stat_key = 'goals' and s.status in ('published','corrected')) goals,
       (select coalesce(sum(value),0) from player_round_statistics s where s.season_player_id = sp.id and s.stat_key = 'assists' and s.status in ('published','corrected')) assists,
       (select count(distinct fr.fantasy_team_id) from fantasy_rosters fr join fantasy_teams ft on ft.id = fr.fantasy_team_id where fr.season_player_id = sp.id and ft.is_complete) owned_by
from season_players sp
left join fantasy_player_scores ps on ps.season_player_id = sp.id and ps.status = 'official'
group by sp.id, sp.season_id, sp.market_value_m;

-- ---------------------------------------------------------------------------
-- Admin-Hilfen
-- ---------------------------------------------------------------------------
create or replace function set_user_role(p_user_id uuid, p_role user_role) returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'Nur Admins dürfen Rollen ändern.'; end if;
  update profiles set role = p_role where user_id = p_user_id;
  insert into audit_logs (actor_id, entity, entity_id, action, after) values (auth.uid(), 'profiles', p_user_id::text, 'set_role', jsonb_build_object('role', p_role));
end $$;

-- Datenexport (DSGVO)
create or replace function export_my_data() returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'profile', (select to_jsonb(p) - 'role' from profiles p where p.user_id = auth.uid()),
    'preferences', (select to_jsonb(u) from user_preferences u where u.user_id = auth.uid()),
    'teams', (select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb) from fantasy_teams t where t.user_id = auth.uid()),
    'rosters', (select coalesce(jsonb_agg(to_jsonb(r)), '[]'::jsonb) from fantasy_rosters r join fantasy_teams t on t.id = r.fantasy_team_id where t.user_id = auth.uid()),
    'transfers', (select coalesce(jsonb_agg(to_jsonb(x)), '[]'::jsonb) from fantasy_transfers x join fantasy_teams t on t.id = x.fantasy_team_id where t.user_id = auth.uid()),
    'scores', (select coalesce(jsonb_agg(to_jsonb(s)), '[]'::jsonb) from fantasy_team_scores s join fantasy_teams t on t.id = s.fantasy_team_id where t.user_id = auth.uid()),
    'exported_at', now()
  )
$$;

-- Account löschen: anonymisieren, Auth-User entfernen (Cascade räumt Rest)
create or replace function delete_my_account() returns void language plpgsql security definer set search_path = public, auth as $$
begin
  update fantasy_teams set name = 'Gelöschter Manager' where user_id = auth.uid();
  delete from auth.users where id = auth.uid();
end $$;

grant execute on function save_roster(uuid, text, jsonb, uuid, boolean) to authenticated;
grant execute on function join_league(text) to authenticated;
grant execute on function create_league(uuid, text) to authenticated;
grant execute on function my_rank(uuid) to authenticated, anon;
grant execute on function leaderboard_window(uuid, int, int) to authenticated, anon;
grant execute on function round_leaderboard_window(uuid, int, int) to authenticated, anon;
grant execute on function league_table(uuid) to authenticated;
grant execute on function export_my_data() to authenticated;
grant execute on function delete_my_account() to authenticated;
grant execute on function season_rules(uuid) to authenticated, anon;
grant execute on function next_open_round(uuid) to authenticated, anon;
grant execute on function score_player_stats(jsonb, player_position, jsonb) to authenticated, anon;
-- Engine-Funktionen: Guard im Funktionskörper (Staff via User-Client ODER Service Role/Cron). anon nie.
grant execute on function lock_round(uuid) to authenticated;
grant execute on function lock_due_rounds() to authenticated;
grant execute on function compute_round(uuid, boolean) to authenticated;
grant execute on function rebuild_overall_leaderboard(uuid) to authenticated;
grant execute on function derive_round_stats_from_snapshot(uuid) to authenticated;
grant execute on function publish_round_stats(uuid) to authenticated;
grant execute on function correct_round_stat(uuid, numeric, text) to authenticated;
revoke execute on function lock_round(uuid), lock_due_rounds(), compute_round(uuid, boolean), rebuild_overall_leaderboard(uuid),
  derive_round_stats_from_snapshot(uuid), publish_round_stats(uuid), correct_round_stat(uuid, numeric, text) from anon;
grant execute on function set_user_role(uuid, user_role) to authenticated;

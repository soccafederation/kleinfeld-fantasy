-- ============================================================================
-- Automatisches Nachrücken (Auto-Sub)
-- Ein Starter ohne Einsatz an der Round wird durch den ersten passenden Bankspieler
-- (Bank-Reihenfolge) ersetzt, der gespielt hat. Torwart nur für Torwart.
-- "Gespielt" = mind. ein freigegebener Statistikwert in der Round und appearances (falls erfasst) > 0.
-- Kapitänsbonus nur, wenn der Kapitän selbst gespielt hat (kein Vize-Kapitän).
-- Aktiv über season_rules.auto_sub (Default jetzt true).
-- ============================================================================

alter table fantasy_team_scores add column if not exists auto_subs jsonb not null default '[]'::jsonb;

create or replace function season_rules_default() returns jsonb language sql immutable as $$
  select '{
    "budget_m": 100,
    "squad": {"GK": 1, "FIELD": 4, "BENCH": 2},
    "bench_counts": false,
    "auto_sub": true,
    "max_per_club": 3,
    "captain_multiplier": 2,
    "transfers": {"free_per_round": 2, "carry_over": false, "penalty_points": 4, "max_extra": 3},
    "late_entry": "allowed",
    "tiebreak": ["total_points", "last_round_points", "fewer_transfers", "earlier_created"]
  }'::jsonb
$$;

create or replace function player_played_in_round(p_season_player_id uuid, p_round_id uuid) returns boolean language sql stable as $$
  select exists (
      select 1 from player_round_statistics s
      where s.round_id = p_round_id and s.season_player_id = p_season_player_id
        and s.status in ('confirmed','published','corrected'))
    and coalesce((select s.value from player_round_statistics s
                   where s.round_id = p_round_id and s.season_player_id = p_season_player_id and s.stat_key = 'appearances'
                     and s.status in ('confirmed','published','corrected')), 1) > 0
$$;

-- Liefert die punktenden Spieler eines Lineups (inkl. Nachrücker) und wen sie ersetzen
create or replace function lineup_counting_players(p_lineup_id uuid, p_round_id uuid, p_bench_counts boolean, p_auto_sub boolean)
returns table (season_player_id uuid, replaced_player_id uuid)
language plpgsql stable as $$
declare
  s record; b record; v_used uuid[] := '{}'; v_pos player_position;
begin
  if p_bench_counts then
    return query select lp.season_player_id, null::uuid from fantasy_lineup_players lp where lp.lineup_id = p_lineup_id;
    return;
  end if;

  for s in
    select lp.season_player_id, lp.slot from fantasy_lineup_players lp
    where lp.lineup_id = p_lineup_id and lp.slot in ('GK','FIELD') order by lp.slot, lp.slot_order
  loop
    if not p_auto_sub or player_played_in_round(s.season_player_id, p_round_id) then
      season_player_id := s.season_player_id; replaced_player_id := null; return next;
      continue;
    end if;
    v_pos := case when s.slot = 'GK' then 'GK'::player_position else 'FIELD'::player_position end;
    select lp.season_player_id into b
    from fantasy_lineup_players lp join season_players sp on sp.id = lp.season_player_id
    where lp.lineup_id = p_lineup_id and lp.slot = 'BENCH' and sp.position = v_pos
      and not (lp.season_player_id = any(v_used))
      and player_played_in_round(lp.season_player_id, p_round_id)
    order by lp.slot_order limit 1;
    if b.season_player_id is not null then
      v_used := v_used || b.season_player_id;
      season_player_id := b.season_player_id; replaced_player_id := s.season_player_id; return next;
    else
      season_player_id := s.season_player_id; replaced_player_id := null; return next; -- 0 Punkte
    end if;
  end loop;
end $$;

create or replace function compute_round(p_round_id uuid, p_finalize boolean default true) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_round fantasy_rounds; v_rules jsonb; v_scoring scoring_rule_versions; v_mult numeric;
  v_players int := 0; v_teams int := 0; v_bench boolean; v_auto boolean;
begin
  if auth.uid() is not null and not is_staff() then raise exception 'Keine Berechtigung.'; end if;
  select * into v_round from fantasy_rounds where id = p_round_id for update;
  if v_round.id is null then return jsonb_build_object('ok', false, 'error', 'Round nicht gefunden.'); end if;
  if v_round.status = 'upcoming' then return jsonb_build_object('ok', false, 'error', 'Round ist noch nicht gelockt.'); end if;

  v_rules := season_rules(v_round.season_id);
  v_mult := (v_rules->>'captain_multiplier')::numeric;
  v_bench := coalesce((v_rules->>'bench_counts')::boolean, false);
  v_auto := coalesce((v_rules->>'auto_sub')::boolean, false);
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

  -- 2) Teampunkte aus gelockten Lineups (mit automatischem Nachrücken)
  delete from fantasy_team_scores where round_id = p_round_id;
  insert into fantasy_team_scores (fantasy_team_id, round_id, lineup_id, scoring_version_id, base_points, captain_bonus, transfer_penalty, total_points, status, auto_subs)
  select l.fantasy_team_id, p_round_id, l.id, v_scoring.id,
         b.base, b.cap, coalesce(tp.pen, 0), b.base + b.cap - coalesce(tp.pen, 0),
         case when p_finalize then 'official' else 'provisional' end::score_status,
         b.subs
  from fantasy_lineups l
  cross join lateral (
    select coalesce(sum(coalesce(ps.points, 0)), 0) base,
           coalesce(sum(case when e.season_player_id = l.captain_season_player_id then coalesce(ps.points, 0) * (v_mult - 1) else 0 end), 0) cap,
           coalesce(jsonb_agg(jsonb_build_object('in', e.season_player_id, 'out', e.replaced_player_id)) filter (where e.replaced_player_id is not null), '[]'::jsonb) subs
    from lineup_counting_players(l.id, p_round_id, v_bench, v_auto) e
    left join fantasy_player_scores ps on ps.round_id = p_round_id and ps.season_player_id = e.season_player_id
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


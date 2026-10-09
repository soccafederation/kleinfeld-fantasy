-- Lazy Lock: fällige Rounds werden beim nächsten Schreibzugriff automatisch gesperrt.
-- Damit ist der Deadline-Lock nicht vom Vercel-Cron abhängig (Hobby-Plan: nur tägliche Crons).

-- lock_due_rounds darf jeder Eingeloggte auslösen: idempotent, deterministisch, keine Entscheidungsfreiheit.
create or replace function lock_due_rounds() returns int language plpgsql security definer set search_path = public as $$
declare r record; n int := 0;
begin
  for r in select id from fantasy_rounds where status = 'upcoming' and deadline_at <= now() loop
    perform lock_round_internal(r.id); n := n + 1;
  end loop;
  return n;
end $$;

-- interne Variante ohne Staff-Guard (nur aus SQL aufrufbar)
create or replace function lock_round_internal(p_round_id uuid) returns jsonb language plpgsql security definer set search_path = public as $$
declare v_round fantasy_rounds; v_count int := 0;
begin
  select * into v_round from fantasy_rounds where id = p_round_id for update;
  if v_round.status <> 'upcoming' then return jsonb_build_object('ok', false, 'error', 'Round ist nicht mehr offen.'); end if;
  insert into fantasy_lineups (fantasy_team_id, round_id, captain_season_player_id, locked_at)
  select t.id, p_round_id, t.captain_season_player_id, now() from fantasy_teams t where t.season_id = v_round.season_id and t.is_complete
  on conflict (fantasy_team_id, round_id) do nothing;
  insert into fantasy_lineup_players (lineup_id, season_player_id, slot, slot_order)
  select l.id, r.season_player_id, r.slot, r.slot_order from fantasy_lineups l join fantasy_rosters r on r.fantasy_team_id = l.fantasy_team_id
  where l.round_id = p_round_id on conflict do nothing;
  get diagnostics v_count = row_count;
  update fantasy_rounds set status = 'locked', locked_at = now() where id = p_round_id;
  insert into audit_logs (actor_id, entity, entity_id, action, after) values (auth.uid(), 'fantasy_rounds', p_round_id::text, 'lock', jsonb_build_object('lineup_players', v_count, 'lazy', true));
  return jsonb_build_object('ok', true, 'lineup_players', v_count);
end $$;
revoke execute on function lock_round_internal(uuid) from public, anon, authenticated;

-- lock_round (Admin-Button) delegiert
create or replace function lock_round(p_round_id uuid) returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not is_staff() then raise exception 'Keine Berechtigung.'; end if;
  return lock_round_internal(p_round_id);
end $$;

-- save_roster: vor jeder Kaderänderung fällige Rounds sperren (verhindert, dass Transfers für die nächste Round
-- die noch ungesperrte Aufstellung der abgelaufenen Round verändern)
create or replace function save_roster_guarded(p_season_id uuid, p_team_name text, p_players jsonb, p_captain uuid, p_dry_run boolean default false)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  perform lock_due_rounds();
  return save_roster(p_season_id, p_team_name, p_players, p_captain, p_dry_run);
end $$;
grant execute on function save_roster_guarded(uuid, text, jsonb, uuid, boolean) to authenticated;
grant execute on function lock_due_rounds() to authenticated;

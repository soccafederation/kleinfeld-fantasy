-- Hilfsfunktionen für Registrierung und Admin-Prüfung

create or replace function username_available(p_username text) returns boolean language sql stable security definer set search_path = public as $$
  select not exists (select 1 from profiles where username = p_username::citext)
    and p_username ~ '^[A-Za-z0-9_.-]{3,20}$'
$$;
grant execute on function username_available(text) to anon, authenticated;

-- Benutzername ändern (1× pro 90 Tage)
create or replace function change_username(p_username text) returns jsonb language plpgsql security definer set search_path = public as $$
declare v_last timestamptz;
begin
  if not username_available(p_username) then return jsonb_build_object('ok', false, 'error', 'Benutzername ist vergeben oder ungültig.'); end if;
  select username_changed_at into v_last from profiles where user_id = auth.uid();
  if v_last is not null and v_last > now() - interval '90 days' then
    return jsonb_build_object('ok', false, 'error', 'Der Benutzername kann nur alle 90 Tage geändert werden.');
  end if;
  update profiles set username = p_username, username_changed_at = now() where user_id = auth.uid();
  return jsonb_build_object('ok', true);
end $$;
grant execute on function change_username(text) to authenticated;

-- Aktive Season des Nutzers setzen
create or replace function set_active_season(p_season_id uuid) returns void language sql security definer set search_path = public as $$
  update profiles set active_season_id = p_season_id where user_id = auth.uid()
$$;
grant execute on function set_active_season(uuid) to authenticated;

-- Admin: Season anlegen inkl. Standard-Punktesystem v1
create or replace function admin_create_season(p_competition_id uuid, p_slug text, p_name text, p_rules jsonb default '{}'::jsonb)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if not is_staff() then raise exception 'Keine Berechtigung.'; end if;
  insert into seasons (competition_id, slug, name, rules) values (p_competition_id, p_slug, p_name, p_rules) returning id into v_id;
  insert into scoring_rule_versions (season_id, version, name, is_active, rules, created_by)
  values (v_id, 1, 'Vorläufiges Punktesystem (Briefing §18)', true, scoring_rules_default(), auth.uid());
  return v_id;
end $$;
grant execute on function admin_create_season(uuid, text, text, jsonb) to authenticated;

-- Admin: neue Punktesystem-Version aktivieren
create or replace function admin_activate_scoring_version(p_version_id uuid) returns void language plpgsql security definer set search_path = public as $$
declare v_season uuid;
begin
  if not is_staff() then raise exception 'Keine Berechtigung.'; end if;
  select season_id into v_season from scoring_rule_versions where id = p_version_id;
  update scoring_rule_versions set is_active = false where season_id = v_season;
  update scoring_rule_versions set is_active = true where id = p_version_id;
end $$;
grant execute on function admin_activate_scoring_version(uuid) to authenticated;

-- Admin: Season-Champion festschreiben
create or replace function finalize_season(p_season_id uuid) returns jsonb language plpgsql security definer set search_path = public as $$
declare v_top record; v_podium jsonb;
begin
  if not is_staff() then raise exception 'Keine Berechtigung.'; end if;
  select lo.*, t.name team_name, p.username into v_top from leaderboard_overall lo join fantasy_teams t on t.id = lo.fantasy_team_id join profiles p on p.user_id = t.user_id
  where lo.season_id = p_season_id order by lo.rank limit 1;
  if v_top is null then return jsonb_build_object('ok', false, 'error', 'Keine Rangliste vorhanden.'); end if;
  select coalesce(jsonb_agg(jsonb_build_object('rank', lo.rank, 'team', t.name, 'username', p.username, 'points', lo.total_points) order by lo.rank), '[]'::jsonb) into v_podium
  from leaderboard_overall lo join fantasy_teams t on t.id = lo.fantasy_team_id join profiles p on p.user_id = t.user_id
  where lo.season_id = p_season_id and lo.rank <= 3;
  insert into season_champions (season_id, fantasy_team_id, total_points, rounds_won, best_round_points, podium)
  values (p_season_id, v_top.fantasy_team_id, v_top.total_points, v_top.rounds_won, v_top.best_round_points, v_podium)
  on conflict (season_id) do update set fantasy_team_id = excluded.fantasy_team_id, total_points = excluded.total_points,
    rounds_won = excluded.rounds_won, best_round_points = excluded.best_round_points, podium = excluded.podium, published_at = now();
  update seasons set status = 'completed' where id = p_season_id;
  return jsonb_build_object('ok', true, 'champion', v_top.team_name);
end $$;
grant execute on function finalize_season(uuid) to authenticated;

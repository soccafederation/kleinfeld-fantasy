-- ============================================================================
-- DEMO-SEED – ausschließlich BEISPIELDATEN für Entwicklung und Testwettbewerb.
-- Alle Team- und Spielernamen sind fiktiv und als Beispiel gekennzeichnet.
-- Vor dem echten Launch NICHT einspielen bzw. mit `delete` wieder entfernen.
-- ============================================================================
do $$
declare
  v_season uuid; v_club uuid; v_team uuid; v_player uuid; i int; j int;
  v_clubs text[] := array['Beispiel Berlin','Beispiel Köln','Beispiel Essen','Beispiel Hamburg','Beispiel München','Beispiel Frankfurt'];
  v_short text[] := array['BBE','BKO','BES','BHH','BMU','BFR'];
  v_values numeric[] := array[16.0, 14.5, 12.0, 9.5, 8.0, 7.0, 6.0, 5.0];
  v_round1 uuid; v_round2 uuid;
begin
  select s.id into v_season from seasons s join competitions c on c.id = s.competition_id where c.slug = 'icon-league' and s.slug = 'season-5';
  if v_season is null then raise exception 'Season 5 fehlt – zuerst seed.sql einspielen.'; end if;

  for i in 1..6 loop
    insert into clubs (name, short_name) values (v_clubs[i] || ' [Beispiel]', v_short[i]) returning id into v_club;
    insert into season_teams (season_id, club_id) values (v_season, v_club) returning id into v_team;
    -- 1 Torwart + 7 Feldspieler je Team
    for j in 1..8 loop
      insert into players (first_name, last_name, display_name)
      values ('Spieler', format('%s-%s', v_short[i], lpad(j::text, 2, '0')), format('%s Spieler %s [Beispiel]', v_short[i], lpad(j::text, 2, '0')))
      returning id into v_player;
      insert into season_players (season_id, player_id, season_team_id, position, shirt_number, market_value_m)
      values (v_season, v_player, v_team, (case when j = 1 then 'GK' else 'FIELD' end)::player_position, j, v_values[j]);
    end loop;
  end loop;

  -- Spieltage: 1 in der Vergangenheit abgeschlossen (für Demo-Rankings), 2 kommende
  insert into fantasy_rounds (season_id, number, name, deadline_at, status) values
    (v_season, 1, 'Spieltag 1', now() - interval '7 days', 'upcoming') returning id into v_round1;
  insert into fantasy_rounds (season_id, number, name, deadline_at, status) values
    (v_season, 2, 'Spieltag 2', now() + interval '3 days', 'upcoming') returning id into v_round2;
  insert into fantasy_rounds (season_id, number, name, deadline_at, status) values
    (v_season, 3, 'Spieltag 3', now() + interval '10 days', 'upcoming');
  insert into matchdays (season_id, round_id, number, name, date) values
    (v_season, v_round1, 1, 'Spieltag 1', (now() - interval '6 days')::date),
    (v_season, v_round2, 2, 'Spieltag 2', (now() + interval '4 days')::date);
end $$;

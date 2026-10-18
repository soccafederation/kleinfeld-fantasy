-- ICON LEAGUE SEASON 5 – Nachtrag: Michael Kobert (FC Berlin City, Feldspieler, #22, Rating 79 → 9,0 Mio.)
-- Wählbar ab Spieltag 2. Mehrfach ausführbar.
do $$
declare v_season uuid; v_team uuid; v_player uuid;
begin
  select s.id into v_season from seasons s join competitions c on c.id = s.competition_id
  where c.slug = 'icon-league' and s.slug = 'season-5';
  select st.id into v_team from season_teams st join clubs c on c.id = st.club_id
  where st.season_id = v_season and c.short_name = 'FCBC';
  if v_team is null then raise exception 'FC Berlin City nicht gefunden'; end if;
  if exists (select 1 from season_players sp join players p on p.id = sp.player_id
             where sp.season_id = v_season and p.display_name = 'Michael Kobert') then return; end if;
  insert into players (first_name, last_name, display_name, external_refs)
  values ('Michael', 'Kobert', 'Michael Kobert', '{"icon_slug": "michael-kobert", "rating": 79}'::jsonb)
  returning id into v_player;
  insert into season_players (season_id, player_id, season_team_id, position, shirt_number, market_value_m)
  values (v_season, v_player, v_team, 'FIELD', 22, 9.0);
end $$;

select p.display_name, sp.position, sp.shirt_number, sp.market_value_m
from season_players sp join players p on p.id = sp.player_id where p.display_name = 'Michael Kobert';

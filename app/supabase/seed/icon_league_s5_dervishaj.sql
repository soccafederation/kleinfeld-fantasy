-- ICON LEAGUE SEASON 5 - Nachtrag: Mergim Dervishaj (Berlin Underdogs, Feldspieler, #6, Rating 84 -> 15,5 Mio.)
-- Bisher ohne Einsatz in S5, daher keine Stats nachzutragen. Wählbar ab sofort (Spieltag 4). Mehrfach ausführbar.
do $$
declare v_season uuid; v_team uuid; v_player uuid;
begin
  select s.id into v_season from seasons s join competitions c on c.id = s.competition_id
  where c.slug = 'icon-league' and s.slug = 'season-5';
  select st.id into v_team from season_teams st join clubs c on c.id = st.club_id
  where st.season_id = v_season and c.short_name = 'BUD';
  if v_team is null then raise exception 'Berlin Underdogs nicht gefunden'; end if;
  if exists (select 1 from season_players sp join players p on p.id = sp.player_id
             where sp.season_id = v_season and p.external_refs->>'icon_slug' = 'mergim-dervishaj') then return; end if;
  insert into players (first_name, last_name, display_name, image_url, external_refs)
  values ('Mergim', 'Dervishaj', 'Mergim Dervishaj',
          'https://images.ctfassets.net/m4vfhoz81zvx/74xniBpoPACcaTghPJL3hz/df15589e53ed11342c6576da267bd438/PLAYERS-UNITED_11_Mergim-Dervishoj-1.png',
          '{"icon_slug": "mergim-dervishaj", "rating": 84}'::jsonb)
  returning id into v_player;
  insert into season_players (season_id, player_id, season_team_id, position, shirt_number, market_value_m)
  values (v_season, v_player, v_team, 'FIELD', 6, 15.5);
end $$;

select p.display_name, c.short_name as club, sp.position, sp.shirt_number, sp.market_value_m
from season_players sp join players p on p.id = sp.player_id
join season_teams st on st.id = sp.season_team_id join clubs c on c.id = st.club_id
where p.external_refs->>'icon_slug' = 'mergim-dervishaj';

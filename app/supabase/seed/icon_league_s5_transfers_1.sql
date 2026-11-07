-- ICON LEAGUE SEASON 5 - Transfers laut Kaderlisten der Icon League (Stand 07.11.2026). Mehrfach ausführbar.
-- Neu:     Dominik Ammon (Berlin Underdogs, Feld, #14, Rating 74 -> 5,0 Mio.)
--          Jonas Rohana (Eintracht Spandau, Feld, #0, Rating 82 -> 12,5 Mio.)
-- Abgänge: Ilias Anan, Patrick Siefkes (BUD), Amir Ahmadi, Dylan Kuetedy (Buzz), Edison Mazreku (Pack)
--          -> Status "Abgang": nicht mehr kaufbar. Wer sie im Kader hat, muss sie beim nächsten Speichern verkaufen.
do $$
declare v_season uuid; v_team uuid; v_player uuid; r record;
begin
  select s.id into v_season from seasons s join competitions c on c.id = s.competition_id
  where c.slug = 'icon-league' and s.slug = 'season-5';

  for r in select * from (values
    ('BUD', 'Dominik', 'Ammon', 14, 74, 5.0, 'dominik-ammon', 'https://images.ctfassets.net/m4vfhoz81zvx/18eBIhhUHs7eqZqBGvyL1X/c8f3135e24424afcca9af31f498d1104/DNA_03_Dominik-Ammon-1.png'),
    ('ESP', 'Jonas', 'Rohana', 0, 82, 12.5, 'jonas-rohana', 'https://images.ctfassets.net/m4vfhoz81zvx/4bqromsIg3b8zHPBPG8orG/7781fc7bfca3db2ce0da62d74ffb7807/EINTRACHT-SPANDAU_JONAS_ROHANA_5.png')
  ) as x(team, first_name, last_name, shirt, ovr, value_m, icon_slug, image_url) loop
    if exists (select 1 from season_players sp join players p on p.id = sp.player_id
               where sp.season_id = v_season and p.external_refs->>'icon_slug' = r.icon_slug) then continue; end if;
    select st.id into v_team from season_teams st join clubs c on c.id = st.club_id
    where st.season_id = v_season and c.short_name = r.team;
    if v_team is null then raise exception 'Club % nicht gefunden', r.team; end if;
    insert into players (first_name, last_name, display_name, image_url, external_refs)
    values (r.first_name, r.last_name, r.first_name || ' ' || r.last_name, r.image_url,
            jsonb_build_object('icon_slug', r.icon_slug, 'rating', r.ovr))
    returning id into v_player;
    insert into season_players (season_id, player_id, season_team_id, position, shirt_number, market_value_m)
    values (v_season, v_player, v_team, 'FIELD', r.shirt, r.value_m);
  end loop;

  update season_players sp set status = 'left'
  from players p
  where p.id = sp.player_id and sp.season_id = v_season
    and p.external_refs->>'icon_slug' in ('ilias-anan', 'patrick-siefkes', 'liridon-krasniq', 'dylan-kuetedy', 'edison-mazreku');
end $$;

-- Kontrolle 1: Neuzugänge und Abgänge
select p.display_name as spieler, c.short_name as club, sp.status::text as status, sp.market_value_m as marktwert
from season_players sp join players p on p.id = sp.player_id
join season_teams st on st.id = sp.season_team_id join clubs c on c.id = st.club_id
where p.external_refs->>'icon_slug' in ('dominik-ammon', 'jonas-rohana', 'ilias-anan', 'patrick-siefkes', 'liridon-krasniq', 'dylan-kuetedy', 'edison-mazreku')
order by sp.status, p.display_name;

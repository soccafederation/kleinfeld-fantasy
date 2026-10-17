-- ICON LEAGUE SEASON 5 – Kader Protatos (Quelle: Line-up-Grafik der Icon League, 17.10.2026)
-- 13 Spieler, Marktwert nach Rating-Kurve. Ergänzt nur – bestehende Fantasy-Teams bleiben unverändert.
-- Mehrfach ausführbar (vorhandene Spieler werden übersprungen).
do $$
declare v_season uuid; v_team uuid; r record; v_player uuid;
begin
  select s.id into v_season from seasons s join competitions c on c.id = s.competition_id
  where c.slug = 'icon-league' and s.slug = 'season-5';
  select st.id into v_team from season_teams st join clubs c on c.id = st.club_id
  where st.season_id = v_season and c.short_name = 'PRO';
  if v_team is null then raise exception 'Protatos nicht gefunden'; end if;

  for r in select * from (values
    ('Bleron', 'Berisha', 'GK', 80, 10.5),
    ('Mergim', 'Bajrami', 'FIELD', 80, 10.5),
    ('Christian', 'Clemens', 'FIELD', 78, 8.0),
    ('Marco', 'Terrazzino', 'FIELD', 80, 10.5),
    ('Tim', 'Sulmer', 'FIELD', 80, 10.5),
    ('Pascal', 'Itter', 'FIELD', 80, 10.5),
    ('Daniel', 'Brosinski', 'FIELD', 83, 14.0),
    ('Marco', 'Cirillo', 'FIELD', 83, 14.0),
    ('Gianluca', 'Cirillo', 'FIELD', 78, 8.0),
    ('Kingsley', 'Sarpei', 'FIELD', 77, 7.5),
    ('Daud', 'Gergery', 'FIELD', 78, 8.0),
    ('Josan', 'Santiago-Kim', 'FIELD', 77, 7.5),
    ('Konstantin', 'Möllering', 'FIELD', 77, 7.5)
  ) as x(first_name, last_name, pos, ovr, value_m) loop
    if exists (select 1 from season_players sp join players p on p.id = sp.player_id
               where sp.season_team_id = v_team and p.display_name = r.first_name || ' ' || r.last_name) then
      continue;
    end if;
    insert into players (first_name, last_name, display_name, external_refs)
    values (r.first_name, r.last_name, r.first_name || ' ' || r.last_name,
            jsonb_build_object('rating', r.ovr, 'source', 'lineup-grafik'))
    returning id into v_player;
    insert into season_players (season_id, player_id, season_team_id, position, market_value_m)
    values (v_season, v_player, v_team, r.pos::player_position, r.value_m);
  end loop;
end $$;

-- Kontrolle: 13 Spieler
select p.display_name, sp.position, sp.market_value_m
from season_players sp join players p on p.id = sp.player_id
join season_teams st on st.id = sp.season_team_id join clubs c on c.id = st.club_id
where c.short_name = 'PRO' order by sp.position desc, sp.market_value_m desc;

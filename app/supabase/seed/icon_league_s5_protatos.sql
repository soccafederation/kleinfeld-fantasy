-- ICON LEAGUE SEASON 5 – Kader Protatos (Quelle: theiconleague.com/teams/protatos, 18.10.2026)
-- 13 Spieler inkl. Rückennummern. Legt fehlende Spieler an und ergänzt bei vorhandenen
-- Rückennummer + Icon-League-ID. Bestehende Fantasy-Teams bleiben unverändert. Mehrfach ausführbar.
do $$
declare v_season uuid; v_team uuid; r record; v_player uuid;
begin
  select s.id into v_season from seasons s join competitions c on c.id = s.competition_id
  where c.slug = 'icon-league' and s.slug = 'season-5';
  select st.id into v_team from season_teams st join clubs c on c.id = st.club_id
  where st.season_id = v_season and c.short_name = 'PRO';
  if v_team is null then raise exception 'Protatos nicht gefunden'; end if;

  for r in select * from (values
    ('Mergim', 'Bajrami', 'FIELD', 80, 10.5, 5, 'mergim-bajrami'),
    ('Bleron', 'Berisha', 'GK', 80, 10.5, 1, 'bleron-berisha'),
    ('Daniel', 'Brosinski', 'FIELD', 83, 14.0, 18, 'daniel-brosinski'),
    ('Marco', 'Cirillo', 'FIELD', 83, 14.0, 10, 'marco-cirillo'),
    ('Gianluca', 'Cirillo', 'FIELD', 78, 8.0, 8, 'gianluca-cirillo'),
    ('Christian', 'Clemens', 'FIELD', 78, 8.0, 17, 'christian-clemens'),
    ('Daud', 'Gergery', 'FIELD', 78, 8.0, 36, 'daud-gergery'),
    ('Pascal', 'Itter', 'FIELD', 80, 10.5, 37, 'pascal-itter'),
    ('Konstantin', 'Möllering', 'FIELD', 77, 7.5, 23, 'konstantin-mollering'),
    ('Josan', 'Santiago-Kim', 'FIELD', 77, 7.5, 84, 'josan-santiago-kim'),
    ('Kingsley', 'Sarpei', 'FIELD', 77, 7.5, 28, 'kingsley-sarpei'),
    ('Tim', 'Sulmer', 'FIELD', 80, 10.5, 42, 'tim-sulmer'),
    ('Marco', 'Terrazzino', 'FIELD', 80, 10.5, 7, 'marco-terrazzino')
  ) as x(first_name, last_name, pos, ovr, value_m, shirt, icon_slug) loop
    select p.id into v_player from season_players sp join players p on p.id = sp.player_id
    where sp.season_team_id = v_team and p.display_name = r.first_name || ' ' || r.last_name;
    if v_player is null then
      insert into players (first_name, last_name, display_name, external_refs)
      values (r.first_name, r.last_name, r.first_name || ' ' || r.last_name,
              jsonb_build_object('icon_slug', r.icon_slug, 'rating', r.ovr))
      returning id into v_player;
      insert into season_players (season_id, player_id, season_team_id, position, shirt_number, market_value_m)
      values (v_season, v_player, v_team, r.pos::player_position, r.shirt, r.value_m);
    else
      update players set external_refs = external_refs || jsonb_build_object('icon_slug', r.icon_slug, 'rating', r.ovr)
      where id = v_player;
      update season_players set shirt_number = r.shirt where player_id = v_player and season_id = v_season;
    end if;
  end loop;
end $$;

-- Kontrolle: 13 Spieler mit Rückennummer
select p.display_name, sp.position, sp.shirt_number, sp.market_value_m
from season_players sp join players p on p.id = sp.player_id
join season_teams st on st.id = sp.season_team_id join clubs c on c.id = st.club_id
where c.short_name = 'PRO' order by sp.position desc, sp.market_value_m desc;

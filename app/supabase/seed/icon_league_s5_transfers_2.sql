-- ICON LEAGUE SEASON 5 - Transfers laut Kaderlisten der Icon League (Stand 18.11.2026). Mehrfach ausführbar.
do $$
declare v_season uuid; v_team uuid; v_player uuid; r record;
begin
  select s.id into v_season from seasons s join competitions c on c.id = s.competition_id
  where c.slug = 'icon-league' and s.slug = 'season-5';

  -- 1) Clubwechsel (Marktwert bleibt)
  for r in select * from (values
    ('edison-mazreku', 'BUZZ', 98), ('nick-salihamidzic', 'BUZZ', 99),
    ('marco-cirillo', 'ESP', 98), ('daniel-brosinski', 'FOK', 18)
  ) as x(icon_slug, team, shirt) loop
    select st.id into v_team from season_teams st join clubs c on c.id = st.club_id
    where st.season_id = v_season and c.short_name = r.team;
    update season_players sp set season_team_id = v_team, shirt_number = r.shirt, status = 'active'
    from players p where p.id = sp.player_id and sp.season_id = v_season and p.external_refs->>'icon_slug' = r.icon_slug;
  end loop;

  -- 2) Neuzugänge (Rating 70 = 3,0 Mio.; ohne Rating ebenfalls 3,0 Mio.)
  for r in select * from (values
    ('BUD',  'Luis', 'Cavanda', 'FIELD', 39, null::int, 3.0, 'luis-cavanda', null),
    ('BUZZ', 'Mohammed', 'Bekaj', 'FIELD', 78, 70, 3.0, 'mohammed-bekaj', null),
    ('ESP',  'Karim', 'Ay', 'FIELD', 99, 70, 3.0, 'karim-ay', 'https://images.ctfassets.net/m4vfhoz81zvx/73ZHAf9ey8Z3ymHA7T9GV7/53a05b24360c9c662884f229de155405/AyS4.png'),
    ('ESP',  'Pascal', 'El-Nemr', 'FIELD', 10, 70, 3.0, 'pascal-el-nemr', null),
    ('ESP',  'Tom', 'Müller', 'GK', 17, null::int, 3.0, 'tom-muller', null),
    ('FCBC', 'Björn', 'Kluft', 'FIELD', 7, 70, 3.0, 'bjorn-kluft', 'https://images.ctfassets.net/m4vfhoz81zvx/5SdBzafSkVwiFOcES37gL1/cb1f5157c6cdccc99bbdaaa96c3b11b7/TWO-STRIPES-UNITED_04_Bjoern-Kluft-1.png'),
    ('FCBC', 'Gilles', 'Vidal', 'FIELD', 30, 70, 3.0, 'gilles-vidal', null),
    ('PLY',  'Babacar', 'M‘Bengue', 'FIELD', 6, 70, 3.0, 'babacar-m-bengue', null),
    ('PRO',  'Sangar', 'Aziz', 'FIELD', 80, 70, 3.0, 'sangar-aziz', null),
    ('PRO',  'Gianluca', 'Marzullo', 'FIELD', 33, 70, 3.0, 'gianluca-marzullo', null),
    ('PRO',  'Phil', 'Sieben', 'FIELD', 77, 70, 3.0, 'phil-sieben', null),
    ('PACK', 'Tevfik', 'Ceylan', 'FIELD', 77, 70, 3.0, 'tevfik-ceylan', 'https://images.ctfassets.net/m4vfhoz81zvx/4KDZZeqTDepTF1FRI4Rqv8/97b8a2d4fde84bfee0b1afb71cddac7c/THE-PACK_10_Tevfik-Ceylan-1.png'),
    ('WON',  'Emmanuel', 'Schlas', 'FIELD', 9, 70, 3.0, 'emmanuel-schlas', null)
  ) as x(team, first_name, last_name, pos, shirt, ovr, value_m, icon_slug, image_url) loop
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
    values (v_season, v_player, v_team, r.pos::player_position, r.shirt, r.value_m);
  end loop;

  -- 3) Abgänge (in keiner Kaderliste mehr)
  update season_players sp set status = 'left'
  from players p
  where p.id = sp.player_id and sp.season_id = v_season
    and p.external_refs->>'icon_slug' in ('eleazer-mensah', 'vedat-duzguner', 'norbert-jaszczak', 'john-lenkeit', 'pascal-wiewrodt', 'gianluca-cirillo');
end $$;

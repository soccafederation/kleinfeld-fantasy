-- ============================================================================
-- PROBEDURCHLAUF für die Icon League (Demo-Zugang Alex)
-- 1) Wappen für Berlin Underdogs + FC Onefootball
-- 2) 26 echte Spieler beider Teams (Kartenwerte, Marktwert nach Rating-Kurve)
-- 3) Demo-Regel: max. 4 Spieler pro Team (nur 2 Teams haben Spieler) – vor dem Launch auf 3 zurück
-- 4) Login für Alex: Benutzername "Alex", Passwort "Icon"
-- Idempotent. Voraussetzung: seed.sql und icon_league_s5.sql sind ausgeführt.
-- ============================================================================

-- 1) Wappen
update clubs set logo_url = '/clubs/berlin-underdogs.png' where name = 'Berlin Underdogs';
update clubs set logo_url = '/clubs/fc-onefootball.png' where name = 'FC Onefootball';

-- 2) Spieler
do $$
declare
  v_season uuid; r record; v_player uuid; v_team uuid;
begin
  select s.id into v_season from seasons s join competitions c on c.id = s.competition_id
  where c.slug = 'icon-league' and s.slug = 'season-5';

  for r in select * from (values
    ('BUD', 'Ergi', 'Alihoxha', 'Ergi Alihoxha', 'FIELD', 80, 10.5, '/players/ergi-alihoxha.jpg', '{"dri": 79, "sho": 77, "pas": 80, "def": 86}'),
    ('BUD', 'Ilias', 'Anan', 'Ilias Anan', 'FIELD', 79, 9.0, '/players/ilias-anan.jpg', '{"dri": 79, "sho": 81, "pas": 77, "def": 76}'),
    ('BUD', 'Mussa Mohand', 'Arifi', 'Mussa Mohand Arifi', 'FIELD', 72, 4.0, '/players/mussa-mohand-arifi.jpg', '{"dri": 75, "sho": 75, "pas": 75, "def": 75}'),
    ('BUD', 'Aisa Mohand', 'Arifi', 'Aisa Mohand Arifi', 'FIELD', 81, 11.5, '/players/aisa-mohand-arifi.jpg', '{"dri": 85, "sho": 82, "pas": 76, "def": 80}'),
    ('BUD', 'Antonio', 'Asanovic', 'Antonio Asanovic', 'FIELD', 82, 12.5, '/players/antonio-asanovic.jpg', '{"dri": 70, "sho": 82, "pas": 83, "def": 80}'),
    ('BUD', 'Haydar', 'Bayram', 'Haydar Bayram', 'GK', 84, 15.5, '/players/haydar-bayram.jpg', '{"dri": 71, "sho": 76, "pas": 94, "gk": 85}'),
    ('BUD', 'Panzu', 'Ernesto', 'Panzu Ernesto', 'FIELD', 77, 7.5, '/players/panzu-ernesto.jpg', '{"dri": 71, "sho": 72, "pas": 76, "def": 82}'),
    ('BUD', 'Stefan', 'Federer', 'Stefan Federer', 'FIELD', 77, 7.5, '/players/stefan-federer.jpg', '{"dri": 76, "sho": 73, "pas": 82, "def": 78}'),
    ('BUD', 'Julius', 'Heimpel', 'Julius Heimpel', 'FIELD', 74, 5.0, '/players/julius-heimpel.jpg', '{"dri": 70, "sho": 74, "pas": 74, "def": 79}'),
    ('BUD', 'Jonas', 'Hoffmann', 'Jonas Hoffmann', 'FIELD', 73, 4.5, '/players/jonas-hoffmann.jpg', '{"dri": 70, "sho": 70, "pas": 77, "def": 75}'),
    ('BUD', 'Fabian', 'Schulz', 'Fabian Schulz', 'FIELD', 79, 9.0, '/players/fabian-schulz.jpg', '{"dri": 70, "sho": 70, "pas": 79, "def": 88}'),
    ('BUD', 'Daniel', 'Sudar', 'Daniel Sudar', 'FIELD', 85, 16.5, '/players/daniel-sudar.jpg', '{"dri": 85, "sho": 86, "pas": 87, "def": 80}'),
    ('BUD', 'Pavlos', 'Wiegels', 'Pavlos Wiegels', 'GK', 78, 8.0, null, '{"dri": 70, "sho": 71, "pas": 90, "gk": 79}'),
    ('BUD', 'Stefan', 'Winkel', 'Stefan Winkel', 'FIELD', 86, 18.0, null, '{"dri": 73, "sho": 89, "pas": 82, "def": 77}'),
    ('OFC', 'Cléber André', 'Batista de Souza', 'Cléber André Batista de Souza', 'FIELD', 70, 3.0, null, '{"dri": 70, "sho": 70, "pas": 70, "def": 70}'),
    ('OFC', 'Lukas', 'Betz', 'Lukas Betz', 'GK', 85, 16.5, '/players/lukas-betz.jpg', '{"dri": 72, "sho": 76, "pas": 90, "gk": 89}'),
    ('OFC', 'Pascal', 'Brossmann', 'Pascal Brossmann', 'FIELD', 82, 12.5, '/players/pascal-brossmann.jpg', '{"dri": 83, "sho": 87, "pas": 74, "def": 74}'),
    ('OFC', 'Benedict', 'Chandra', 'Benedict Chandra', 'FIELD', 79, 9.0, '/players/benedict-chandra.jpg', '{"dri": 82, "sho": 76, "pas": 80, "def": 85}'),
    ('OFC', 'Sebastian', 'Divis', 'Sebastian Divis', 'FIELD', 78, 8.0, '/players/sebastian-divis.jpg', '{"dri": 79, "sho": 77, "pas": 76, "def": 86}'),
    ('OFC', 'Amer', 'Dzindic', 'Amer Dzindic', 'FIELD', 87, 20.0, '/players/amer-dzindic.jpg', '{"dri": 91, "sho": 82, "pas": 91, "def": 94}'),
    ('OFC', 'Pascal', 'El-Nemr', 'Pascal El-Nemr', 'FIELD', 80, 10.5, null, '{"dri": 78, "sho": 77, "pas": 83, "def": 82}'),
    ('OFC', 'Konstantin', 'Fries', 'Konstantin Fries', 'FIELD', 83, 14.0, '/players/konstantin-fries.jpg', '{"dri": 82, "sho": 86, "pas": 76, "def": 74}'),
    ('OFC', 'Nicolas', 'Jann', 'Nicolas Jann', 'FIELD', 85, 16.5, '/players/nicolas-jann.jpg', '{"dri": 72, "sho": 86, "pas": 79, "def": 79}'),
    ('OFC', 'Nedzad', 'Plavci', 'Nedzad Plavci', 'FIELD', 84, 15.5, '/players/nedzad-plavci.jpg', '{"dri": 94, "sho": 84, "pas": 81, "def": 82}'),
    ('OFC', 'Sinan', 'Polat', 'Sinan Polat', 'GK', 73, 4.5, null, '{"dri": 70, "sho": 73, "pas": 74, "gk": 73}'),
    ('OFC', 'Miguelín', 'Sayago Marti', 'Miguelín Sayago Marti', 'FIELD', 85, 16.5, '/players/miguelin-sayago-marti.jpg', '{"dri": 82, "sho": 88, "pas": 85, "def": 81}')
  ) as x(team, first_name, last_name, display_name, pos, ovr, value_m, image_url, card) loop
    select st.id into v_team from season_teams st join clubs c on c.id = st.club_id
    where st.season_id = v_season and c.short_name = r.team;
    if v_team is null then raise exception 'Team % fehlt – icon_league_s5.sql zuerst ausführen', r.team; end if;

    select p.id into v_player from players p where p.display_name = r.display_name;
    if v_player is null then
      insert into players (first_name, last_name, display_name, image_url, external_refs)
      values (r.first_name, r.last_name, r.display_name, r.image_url,
              jsonb_build_object('card', r.card::jsonb, 'rating', r.ovr))
      returning id into v_player;
    else
      update players set image_url = r.image_url,
             external_refs = external_refs || jsonb_build_object('card', r.card::jsonb, 'rating', r.ovr)
      where id = v_player;
    end if;

    insert into season_players (season_id, player_id, season_team_id, position, market_value_m)
    values (v_season, v_player, v_team, r.pos::player_position, r.value_m)
    on conflict (season_id, player_id) do update
      set season_team_id = excluded.season_team_id, position = excluded.position, market_value_m = excluded.market_value_m;
  end loop;

  -- 3) Demo-Regel
  update seasons set rules = rules || '{"max_per_club": 4}'::jsonb where id = v_season;
end $$;

-- 4) Demo-Login Alex (Benutzername Alex, Passwort Icon)
do $$
declare v_id uuid;
begin
  select id into v_id from auth.users where email = 'alex@kleinfeld-fantasy.de';
  if v_id is null then
    v_id := gen_random_uuid();
    insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
                            raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
                            confirmation_token, recovery_token, email_change_token_new, email_change)
    values ('00000000-0000-0000-0000-000000000000', v_id, 'authenticated', 'authenticated', 'alex@kleinfeld-fantasy.de',
            crypt('Icon', gen_salt('bf')), now(),
            '{"provider":"email","providers":["email"]}', '{"username":"Alex","terms_accepted":true}', now(), now(),
            '', '', '', '');
    insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    values (gen_random_uuid(), v_id, v_id::text,
            jsonb_build_object('sub', v_id::text, 'email', 'alex@kleinfeld-fantasy.de', 'email_verified', true),
            'email', now(), now(), now());
  else
    update auth.users set encrypted_password = crypt('Icon', gen_salt('bf')), email_confirmed_at = coalesce(email_confirmed_at, now())
    where id = v_id;
  end if;
end $$;

-- Kontrolle
select c.name as team, count(sp.id) as spieler, round(sum(sp.market_value_m), 1) as marktwert_summe
from season_players sp join season_teams st on st.id = sp.season_team_id join clubs c on c.id = st.club_id
group by c.name order by c.name;
select username, role from profiles where username = 'Alex';

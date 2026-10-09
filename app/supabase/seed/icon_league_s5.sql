-- ============================================================================
-- Icon League Season 5 · 12 Teams, Spieltage 1–5, 30 Begegnungen
-- Quelle: 2026_TILxSchedule_MD01-MD05.pdf (nur Paarungen, keine Termine)
-- DEADLINES SIND PLATZHALTER (Sa 12:00 Uhr, wöchentlich ab 17.10.2026) →
-- im Admin unter Season 5 → Spieltage anpassen.
-- Idempotent: kann mehrfach ausgeführt werden.
-- ============================================================================
do $$
declare
  v_season uuid;
  v_round uuid;
  v_md uuid;
  t record;
  m record;
begin
  select s.id into v_season from seasons s join competitions c on c.id = s.competition_id
  where c.slug = 'icon-league' and s.slug = 'season-5';
  if v_season is null then raise exception 'Season 5 fehlt – zuerst seed.sql ausführen.'; end if;

  -- 12 Teams (Kürzel frei gewählt, im Admin änderbar)
  for t in select * from (values
    ('Two Stripes United', 'TSU'), ('PLYRS United', 'PLY'), ('DNA Athletics', 'DNA'),
    ('Wontorriors FC', 'WON'), ('Berlin Underdogs', 'BUD'), ('The Pack FC', 'PACK'),
    ('Eintracht Spandau', 'ESP'), ('FC Berlin City', 'FCBC'), ('Fokus Eagles', 'FOK'),
    ('Protatos', 'PRO'), ('FC Onefootball', 'OFC'), ('Buzz Club', 'BUZZ')
  ) as x(name, short) loop
    insert into clubs (name, short_name)
    select t.name, t.short where not exists (select 1 from clubs where name = t.name);
    insert into season_teams (season_id, club_id)
    select v_season, id from clubs where name = t.name
    on conflict (season_id, club_id) do nothing;
  end loop;

  -- 5 Spieltage = 5 Fantasy-Runden
  for i in 1..5 loop
    insert into fantasy_rounds (season_id, number, name, deadline_at, status)
    values (v_season, i, format('Spieltag %s', i),
            ('2026-10-17 12:00:00 Europe/Berlin'::timestamptz + (i - 1) * interval '7 days'), 'upcoming')
    on conflict (season_id, number) do nothing;
    select id into v_round from fantasy_rounds where season_id = v_season and number = i;
    insert into matchdays (season_id, round_id, number, name, date)
    values (v_season, v_round, i, format('Matchday %s', lpad(i::text, 2, '0')),
            ('2026-10-17'::date + (i - 1) * 7))
    on conflict (season_id, number) do nothing;
  end loop;

  -- 30 Begegnungen (Heim = links im Spielplan)
  for m in select * from (values
    (1,'Two Stripes United','PLYRS United'), (1,'DNA Athletics','Wontorriors FC'), (1,'Berlin Underdogs','The Pack FC'),
    (1,'Eintracht Spandau','FC Berlin City'), (1,'Fokus Eagles','Protatos'), (1,'FC Onefootball','Buzz Club'),
    (2,'Protatos','Buzz Club'), (2,'Fokus Eagles','Wontorriors FC'), (2,'The Pack FC','FC Berlin City'),
    (2,'Two Stripes United','Eintracht Spandau'), (2,'DNA Athletics','FC Onefootball'), (2,'Berlin Underdogs','PLYRS United'),
    (3,'Buzz Club','Wontorriors FC'), (3,'FC Onefootball','Protatos'), (3,'PLYRS United','Eintracht Spandau'),
    (3,'Berlin Underdogs','FC Berlin City'), (3,'Fokus Eagles','DNA Athletics'), (3,'The Pack FC','Two Stripes United'),
    (4,'Two Stripes United','Berlin Underdogs'), (4,'FC Onefootball','Fokus Eagles'), (4,'FC Berlin City','PLYRS United'),
    (4,'Eintracht Spandau','The Pack FC'), (4,'Buzz Club','DNA Athletics'), (4,'Wontorriors FC','Protatos'),
    (5,'PLYRS United','The Pack FC'), (5,'Protatos','DNA Athletics'), (5,'FC Berlin City','Two Stripes United'),
    (5,'Eintracht Spandau','Berlin Underdogs'), (5,'Buzz Club','Fokus Eagles'), (5,'Wontorriors FC','FC Onefootball')
  ) as x(md, home, away) loop
    select id into v_md from matchdays where season_id = v_season and number = m.md;
    insert into matches (matchday_id, home_team_id, away_team_id, status)
    select v_md, h.id, a.id, 'scheduled'
    from season_teams h join clubs hc on hc.id = h.club_id and hc.name = m.home,
         season_teams a join clubs ac on ac.id = a.club_id and ac.name = m.away
    where h.season_id = v_season and a.season_id = v_season
      and not exists (select 1 from matches x where x.matchday_id = v_md and x.home_team_id = h.id and x.away_team_id = a.id);
  end loop;
end $$;

-- Kontrolle: 12 Teams, 5 Spieltage, 30 Spiele
select
  (select count(*) from season_teams st join seasons s on s.id = st.season_id where s.slug = 'season-5') as teams,
  (select count(*) from fantasy_rounds r join seasons s on s.id = r.season_id where s.slug = 'season-5') as spieltage,
  (select count(*) from matches mt join matchdays md on md.id = mt.matchday_id join seasons s on s.id = md.season_id where s.slug = 'season-5') as spiele;

-- ============================================================================
-- Icon League Season 5 · 12 Teams, Spieltage 1–8, Begegnungen MD 1–5
-- Quelle Paarungen: 2026_TILxSchedule_MD01-MD05.pdf · Termine: Christoph, 09.10.2026
-- Deadline je Spieltag: 17:00 Uhr (Europe/Berlin) am Spieltag
-- Anstoß: Spiel 1 18:00, dann alle 45 Min. bis Spiel 6 21:45
-- Idempotent: kann mehrfach ausgeführt werden; aktualisiert Termine bestehender Einträge.
-- ============================================================================
do $$
declare
  v_season uuid;
  v_round uuid;
  v_md uuid;
  t record;
  m record;
  d record;
  v_day date;
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

  -- 8 Spieltage = 8 Fantasy-Runden (Deadline 17:00 am Spieltag)
  for d in select * from (values
    (1, date '2026-10-18'), (2, date '2026-10-19'), (3, date '2026-10-26'), (4, date '2026-11-01'),
    (5, date '2026-11-02'), (6, date '2026-11-09'), (7, date '2026-11-16'), (8, date '2026-11-23')
  ) as x(n, day) loop
    insert into fantasy_rounds (season_id, number, name, deadline_at, status)
    values (v_season, d.n, format('Spieltag %s', d.n), (d.day + time '17:00') at time zone 'Europe/Berlin', 'upcoming')
    on conflict (season_id, number) do update
      set deadline_at = excluded.deadline_at
      where fantasy_rounds.status = 'upcoming';
    select id into v_round from fantasy_rounds where season_id = v_season and number = d.n;
    insert into matchdays (season_id, round_id, number, name, date)
    values (v_season, v_round, d.n, format('Matchday %s', lpad(d.n::text, 2, '0')), d.day)
    on conflict (season_id, number) do update set date = excluded.date, round_id = excluded.round_id;
  end loop;

  -- 30 Begegnungen MD 1–5 (Heim = links im Spielplan), Reihenfolge = Spiel 1–6
  for m in select *, row_number() over (partition by md order by ord) as slot from (select *, row_number() over () as ord from (values
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
  ) as x(md, home, away)) y loop
    select id, date into v_md, v_day from matchdays where season_id = v_season and number = m.md;
    update matches x set kickoff_at = ((v_day + time '18:00') + (m.slot - 1) * interval '45 minutes') at time zone 'Europe/Berlin'
    from season_teams h join clubs hc on hc.id = h.club_id, season_teams a join clubs ac on ac.id = a.club_id
    where x.matchday_id = v_md and x.home_team_id = h.id and x.away_team_id = a.id and hc.name = m.home and ac.name = m.away;
    insert into matches (matchday_id, home_team_id, away_team_id, status, kickoff_at)
    select v_md, h.id, a.id, 'scheduled', ((v_day + time '18:00') + (m.slot - 1) * interval '45 minutes') at time zone 'Europe/Berlin'
    from season_teams h join clubs hc on hc.id = h.club_id and hc.name = m.home,
         season_teams a join clubs ac on ac.id = a.club_id and ac.name = m.away
    where h.season_id = v_season and a.season_id = v_season
      and not exists (select 1 from matches x where x.matchday_id = v_md and x.home_team_id = h.id and x.away_team_id = a.id);
  end loop;
end $$;

-- Kontrolle: 12 Teams, 8 Spieltage, 30 Spiele
select
  (select count(*) from season_teams st join seasons s on s.id = st.season_id where s.slug = 'season-5') as teams,
  (select count(*) from fantasy_rounds r join seasons s on s.id = r.season_id where s.slug = 'season-5') as spieltage,
  (select count(*) from matches mt join matchdays md on md.id = mt.matchday_id join seasons s on s.id = md.season_id where s.slug = 'season-5') as spiele;

-- Übersicht Termine
select r.number as md, to_char(r.deadline_at at time zone 'Europe/Berlin', 'Dy DD.MM. HH24:MI') as deadline,
       count(m.id) as spiele,
       to_char(min(m.kickoff_at) at time zone 'Europe/Berlin', 'HH24:MI') || '–' || to_char(max(m.kickoff_at) at time zone 'Europe/Berlin', 'HH24:MI') as anstoss
from fantasy_rounds r join seasons s on s.id = r.season_id and s.slug = 'season-5'
left join matchdays md on md.round_id = r.id left join matches m on m.matchday_id = md.id
group by r.number, r.deadline_at order by r.number;

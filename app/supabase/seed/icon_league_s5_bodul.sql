-- ICON LEAGUE SEASON 5 - Nachtrag: Darko Bodul (DNA Athletics, Feldspieler, #89, Rating 81 -> 11,5 Mio.)
-- Legt ihn an (wählbar ab Spieltag 4), trägt seine Werte für Spieltag 2 (2 Tore) und 3 (1 Tor, 1 Vorlage) nach
-- und rechnet die Spieltage neu. Für die Manager ändert sich nichts, er war bisher nicht wählbar.
-- Erst nach spieltag3_stats_und_punkte.sql ausführen. Mehrfach ausführbar.
do $$
declare v_season uuid; v_team uuid; v_player uuid; v_sp uuid;
begin
  select s.id into v_season from seasons s join competitions c on c.id = s.competition_id
  where c.slug = 'icon-league' and s.slug = 'season-5';
  select st.id into v_team from season_teams st join clubs c on c.id = st.club_id
  where st.season_id = v_season and c.short_name = 'DNA';
  if v_team is null then raise exception 'DNA Athletics nicht gefunden'; end if;

  select sp.id into v_sp from season_players sp join players p on p.id = sp.player_id
  where sp.season_id = v_season and p.external_refs->>'icon_slug' = 'darko-bodul';
  if v_sp is null then
    insert into players (first_name, last_name, display_name, image_url, external_refs)
    values ('Darko', 'Bodul', 'Darko Bodul',
            'https://images.ctfassets.net/m4vfhoz81zvx/2c24pPWq5mFWNs2OOcmzOK/f230e4e6c7b97fe887c61bae83203b0e/DNA-ATHLETICS_89_DARKO_BODUL_2.png',
            '{"icon_slug": "darko-bodul", "rating": 81}'::jsonb)
    returning id into v_player;
    insert into season_players (season_id, player_id, season_team_id, position, shirt_number, market_value_m)
    values (v_season, v_player, v_team, 'FIELD', 89, 11.5)
    returning id into v_sp;
  end if;

  insert into player_round_statistics (round_id, season_player_id, stat_key, value, status)
  select r.id, v_sp, x.stat_key, x.value, 'published'
  from (values
  (2, 'appearances', 1),
  (2, 'goals', 2),
  (2, 'assists', 0),
  (2, 'shots', 2),
  (2, 'dribbles_success', 0),
  (2, 'dribbles', 0),
  (2, 'fouls_suffered', 1),
  (2, 'passes_success', 21),
  (2, 'passes', 23),
  (2, 'passes_failed', 2),
  (2, 'tackles_won', 3),
  (2, 'clearances', 0),
  (2, 'fouls', 1),
  (2, 'yellow', 0),
  (2, 'red', 0),
  (2, 'saves', 0),
  (2, 'ball_actions', 28),
  (3, 'appearances', 1),
  (3, 'goals', 1),
  (3, 'assists', 1),
  (3, 'shots', 2),
  (3, 'dribbles_success', 0),
  (3, 'dribbles', 0),
  (3, 'fouls_suffered', 0),
  (3, 'passes_success', 26),
  (3, 'passes', 27),
  (3, 'passes_failed', 1),
  (3, 'tackles_won', 1),
  (3, 'clearances', 1),
  (3, 'fouls', 0),
  (3, 'yellow', 0),
  (3, 'red', 0),
  (3, 'saves', 0),
  (3, 'ball_actions', 31)
  ) as x(md, stat_key, value)
  join fantasy_rounds r on r.season_id = v_season and r.number = x.md
  on conflict (round_id, season_player_id, stat_key) do update set value = excluded.value, status = 'published';

  perform compute_round(r.id, true) from fantasy_rounds r
  where r.season_id = v_season and r.number in (2, 3) and r.status <> 'upcoming';
end $$;

-- Kontrolle: Spieltag 2 = 2 Tore, Spieltag 3 = 1 Tor
select r.number as spieltag, p.display_name, sp.market_value_m,
       max(case when prs.stat_key = 'goals' then prs.value end) as tore,
       max(case when prs.stat_key = 'assists' then prs.value end) as vorlagen,
       fps.points as punkte
from season_players sp join players p on p.id = sp.player_id
join player_round_statistics prs on prs.season_player_id = sp.id
join fantasy_rounds r on r.id = prs.round_id
left join fantasy_player_scores fps on fps.season_player_id = sp.id and fps.round_id = r.id
where p.external_refs->>'icon_slug' = 'darko-bodul'
group by r.number, p.display_name, sp.market_value_m, fps.points order by r.number;

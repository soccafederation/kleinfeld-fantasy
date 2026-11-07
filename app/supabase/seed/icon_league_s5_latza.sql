-- ICON LEAGUE SEASON 5 - Nachtrag: Danny Latza (The Pack FC, Feldspieler, #6, ohne Icon-League-Rating -> 12,5 Mio. wie Rating 82)
-- Bisher als Special Guest ignoriert. Sein einziger Einsatz (Spieltag 2) wird nachgetragen, damit spätere Auswertungen
-- sauber rechnen. Für die Manager ändert sich nichts, er war bisher nicht wählbar. Mehrfach ausführbar.
do $$
declare v_season uuid; v_team uuid; v_player uuid; v_sp uuid; v_r2 uuid;
begin
  select s.id into v_season from seasons s join competitions c on c.id = s.competition_id
  where c.slug = 'icon-league' and s.slug = 'season-5';
  select st.id into v_team from season_teams st join clubs c on c.id = st.club_id
  where st.season_id = v_season and c.short_name = 'PACK';
  if v_team is null then raise exception 'The Pack FC nicht gefunden'; end if;

  select sp.id into v_sp from season_players sp join players p on p.id = sp.player_id
  where sp.season_id = v_season and p.external_refs->>'icon_slug' = 'danny-latza';
  if v_sp is null then
    insert into players (first_name, last_name, display_name, image_url, external_refs)
    values ('Danny', 'Latza', 'Danny Latza',
            'https://images.ctfassets.net/m4vfhoz81zvx/46C4yJ0Ur1WIxQYUN7FM4k/fb9711074abdc8a8e38e48e0d19e2d40/THE-PACK-FC_5_DANNY_LATZA_3.png',
            '{"icon_slug": "danny-latza", "rating": null, "rating_missing": true}'::jsonb)
    returning id into v_player;
    insert into season_players (season_id, player_id, season_team_id, position, shirt_number, market_value_m)
    values (v_season, v_player, v_team, 'FIELD', 6, 12.5)
    returning id into v_sp;
  end if;

  select r.id into v_r2 from fantasy_rounds r where r.season_id = v_season and r.number = 2;
  insert into player_round_statistics (round_id, season_player_id, stat_key, value, status)
  select v_r2, v_sp, x.k, x.v, 'published' from (values
    ('appearances', 1), ('goals', 0), ('assists', 2), ('shots', 0), ('dribbles_success', 0), ('dribbles', 0),
    ('fouls_suffered', 3), ('passes_success', 17), ('passes', 18), ('passes_failed', 1), ('tackles_won', 0),
    ('clearances', 0), ('fouls', 0), ('yellow', 0), ('red', 0), ('saves', 0), ('ball_actions', 18)
  ) as x(k, v)
  on conflict (round_id, season_player_id, stat_key) do update set value = excluded.value, status = 'published';
  perform compute_round(v_r2, true);
end $$;

select p.display_name, c.short_name as club, sp.shirt_number, sp.market_value_m, sp.status::text
from season_players sp join players p on p.id = sp.player_id
join season_teams st on st.id = sp.season_team_id join clubs c on c.id = st.club_id
where p.external_refs->>'icon_slug' = 'danny-latza';

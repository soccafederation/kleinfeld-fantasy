-- 0007: Maximal 2 Spieler pro echtem Team (Entscheidung 17.10.2026)
-- Standard für neue Seasons
create or replace function season_rules_default() returns jsonb language sql immutable as $$
  select '{
    "budget_m": 100,
    "squad": {"GK": 1, "FIELD": 4, "BENCH": 2},
    "bench_counts": false,
    "auto_sub": true,
    "max_per_club": 2,
    "captain_multiplier": 2,
    "transfers": {"free_per_round": 2, "carry_over": false, "penalty_points": 4, "max_extra": 3},
    "late_entry": "allowed",
    "tiebreak": ["total_points", "last_round_points", "fewer_transfers", "earlier_created"]
  }'::jsonb
$$;

-- Icon League Season 5
update seasons s set rules = s.rules || '{"max_per_club": 2}'::jsonb
from competitions c
where c.id = s.competition_id and c.slug = 'icon-league' and s.slug = 'season-5';

-- Kontrolle
select c.name, s.name, s.rules->>'max_per_club' as max_pro_team
from seasons s join competitions c on c.id = s.competition_id order by c.sort_order;

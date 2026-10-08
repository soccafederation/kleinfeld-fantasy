-- ============================================================================
-- Basis-Seed (produktiv nutzbar): Wettbewerbe + Icon League Season 5 (Struktur)
-- Teams, Spieler und Spieltage werden über das Admin-Dashboard / CSV gepflegt.
-- ============================================================================
insert into competitions (slug, name, short_name, organizer, sort_order, is_active) values
  ('icon-league', 'Icon League', 'ICON', 'The Icon League', 1, true),
  ('socca-champions-league', 'Socca Champions League', 'SCL', 'International Socca Federation', 2, true),
  ('socca-euro-2027', 'Socca Euro 2027', 'EURO27', 'International Socca Federation', 3, true)
on conflict (slug) do nothing;

insert into seasons (competition_id, slug, name, status, branding)
select id, 'season-5', 'Season 5', 'open',
  '{"accent":"#FFD400","accent_fg":"#0A0A0B","hero_image_url":"/brand/pitch-night.jpg"}'::jsonb
from competitions where slug = 'icon-league'
on conflict (competition_id, slug) do nothing;

insert into scoring_rule_versions (season_id, version, name, is_active, rules)
select s.id, 1, 'Vorläufiges Punktesystem (Briefing §18)', true, scoring_rules_default()
from seasons s join competitions c on c.id = s.competition_id where c.slug = 'icon-league' and s.slug = 'season-5'
on conflict (season_id, version) do nothing;

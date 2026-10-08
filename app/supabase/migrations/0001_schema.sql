-- ============================================================================
-- KLEINFELD FANTASY · Schema v1
-- Reihenfolge: Extensions → Enums → Tabellen → Indizes → Trigger (updated_at, Profile)
-- ============================================================================

create extension if not exists "pgcrypto";
create extension if not exists "citext";
create extension if not exists "pg_trgm";

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type user_role as enum ('user', 'editor', 'admin');
create type season_status as enum ('draft', 'open', 'live', 'completed', 'archived');
create type player_position as enum ('GK', 'FIELD');
create type player_status as enum ('active', 'injured', 'unavailable', 'left');
create type round_status as enum ('upcoming', 'locked', 'live', 'under_review', 'completed');
create type match_status as enum ('scheduled', 'live', 'finished', 'postponed', 'cancelled');
create type roster_slot as enum ('GK', 'FIELD', 'BENCH');
create type import_source as enum ('csv', 'xlsx', 'json', 'api', 'screenshot', 'manual');
create type import_status as enum ('uploaded', 'extracted', 'review', 'confirmed', 'published', 'rejected');
create type stat_status as enum ('computed', 'confirmed', 'published', 'corrected');
create type score_status as enum ('provisional', 'official');
create type name_status as enum ('pending', 'approved', 'rejected');

-- ---------------------------------------------------------------------------
-- updated_at Trigger-Funktion
-- ---------------------------------------------------------------------------
create or replace function set_updated_at() returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ---------------------------------------------------------------------------
-- Nutzer
-- ---------------------------------------------------------------------------
create table profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  username citext not null unique check (length(username) between 3 and 20 and username ~ '^[A-Za-z0-9_.-]+$'),
  display_name text,
  avatar_url text,
  locale text not null default 'de',
  role user_role not null default 'user',
  active_season_id uuid,
  username_changed_at timestamptz,
  terms_accepted_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_profiles_updated before update on profiles for each row execute function set_updated_at();

create table user_preferences (
  user_id uuid primary key references profiles(user_id) on delete cascade,
  email_round_reminder boolean not null default true,
  email_round_result boolean not null default true,
  email_marketing boolean not null default false,
  updated_at timestamptz not null default now()
);

create table user_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(user_id) on delete cascade,
  type text not null,
  payload jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);
create index on user_notifications(user_id, created_at desc);

-- Profil automatisch bei Registrierung anlegen (username aus raw_user_meta_data)
create or replace function handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_username text := coalesce(new.raw_user_meta_data->>'username', 'manager_' || substr(new.id::text, 1, 8));
begin
  insert into profiles (user_id, username, display_name, terms_accepted_at)
  values (new.id, v_username, v_username, case when (new.raw_user_meta_data->>'terms_accepted')::boolean then now() else null end)
  on conflict (user_id) do nothing;
  insert into user_preferences (user_id) values (new.id) on conflict do nothing;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function handle_new_user();

-- ---------------------------------------------------------------------------
-- Wettbewerbe
-- ---------------------------------------------------------------------------
create table competitions (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  short_name text,
  organizer text,
  logo_url text,
  description text,
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_competitions_updated before update on competitions for each row execute function set_updated_at();

create table seasons (
  id uuid primary key default gen_random_uuid(),
  competition_id uuid not null references competitions(id) on delete cascade,
  slug text not null,
  name text not null,
  status season_status not null default 'draft',
  starts_at date,
  ends_at date,
  branding jsonb not null default '{}'::jsonb, -- {accent, accent_fg, hero_image_url, logo_url}
  rules jsonb not null default '{}'::jsonb,     -- siehe season_rules_default()
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (competition_id, slug)
);
create trigger trg_seasons_updated before update on seasons for each row execute function set_updated_at();
alter table profiles add constraint profiles_active_season_fk foreign key (active_season_id) references seasons(id) on delete set null;

create table scoring_rule_versions (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references seasons(id) on delete cascade,
  version int not null,
  name text,
  is_active boolean not null default false,
  rules jsonb not null,
  created_by uuid references profiles(user_id),
  created_at timestamptz not null default now(),
  unique (season_id, version)
);
create unique index scoring_rule_versions_one_active on scoring_rule_versions(season_id) where is_active;

-- ---------------------------------------------------------------------------
-- Mannschaften & Spieler
-- ---------------------------------------------------------------------------
create table clubs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  short_name text not null check (length(short_name) between 2 and 4),
  logo_url text,
  primary_color text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_clubs_updated before update on clubs for each row execute function set_updated_at();

create table season_teams (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references seasons(id) on delete cascade,
  club_id uuid not null references clubs(id) on delete restrict,
  display_name text,
  created_at timestamptz not null default now(),
  unique (season_id, club_id)
);

create table players (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text not null,
  display_name text not null,
  nationality text,
  image_url text,
  external_refs jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_players_updated before update on players for each row execute function set_updated_at();
create index players_display_name_trgm on players using gin (display_name gin_trgm_ops);

create table season_players (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references seasons(id) on delete cascade,
  player_id uuid not null references players(id) on delete cascade,
  season_team_id uuid not null references season_teams(id) on delete cascade,
  position player_position not null,
  shirt_number int,
  status player_status not null default 'active',
  market_value_m numeric(6,1) not null default 5.0, -- aktueller Wert (S5 konstant); Historie in player_market_values
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (season_id, player_id)
);
create trigger trg_season_players_updated before update on season_players for each row execute function set_updated_at();
create index on season_players(season_id, season_team_id);

create table player_market_values (
  id uuid primary key default gen_random_uuid(),
  season_player_id uuid not null references season_players(id) on delete cascade,
  value_m numeric(6,1) not null,
  valid_from timestamptz not null default now(),
  valid_to timestamptz,
  reason text
);
create index on player_market_values(season_player_id, valid_from desc);

-- ---------------------------------------------------------------------------
-- Spielbetrieb
-- ---------------------------------------------------------------------------
create table fantasy_rounds (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references seasons(id) on delete cascade,
  number int not null,
  name text not null,
  deadline_at timestamptz not null,
  status round_status not null default 'upcoming',
  locked_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (season_id, number)
);
create trigger trg_rounds_updated before update on fantasy_rounds for each row execute function set_updated_at();

create table matchdays (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references seasons(id) on delete cascade,
  round_id uuid references fantasy_rounds(id) on delete set null,
  number int not null,
  name text,
  date date,
  created_at timestamptz not null default now(),
  unique (season_id, number)
);

create table matches (
  id uuid primary key default gen_random_uuid(),
  matchday_id uuid not null references matchdays(id) on delete cascade,
  home_team_id uuid not null references season_teams(id) on delete cascade,
  away_team_id uuid not null references season_teams(id) on delete cascade,
  kickoff_at timestamptz,
  status match_status not null default 'scheduled',
  home_score int,
  away_score int,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Statistiken
-- ---------------------------------------------------------------------------
create table stat_definitions (
  key text primary key,
  label_de text not null,
  short_de text,
  category text not null default 'general', -- general|offense|build_up|defense|goalkeeper|derived
  data_type text not null default 'int' check (data_type in ('int','numeric','percent')),
  is_cumulative boolean not null default true,
  is_derived boolean not null default false,
  derive_from jsonb,          -- {"numerator":"passes_success","denominator":"passes"}
  sort_order int not null default 100
);

create table statistic_imports (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references seasons(id) on delete cascade,
  round_id uuid references fantasy_rounds(id) on delete set null,
  source import_source not null,
  mode text not null default 'cumulative' check (mode in ('cumulative','round')),
  file_path text,
  file_name text,
  file_hash text,
  imported_by uuid references profiles(user_id),
  status import_status not null default 'uploaded',
  column_mapping jsonb,
  extraction_log jsonb not null default '[]'::jsonb,
  error_log jsonb not null default '[]'::jsonb,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_imports_updated before update on statistic_imports for each row execute function set_updated_at();
create unique index statistic_imports_hash on statistic_imports(season_id, file_hash) where file_hash is not null;

create table statistic_snapshots (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references seasons(id) on delete cascade,
  import_id uuid references statistic_imports(id) on delete set null,
  as_of_round_id uuid not null references fantasy_rounds(id) on delete cascade,
  captured_at timestamptz not null default now(),
  is_valid boolean not null default true,
  superseded_by uuid references statistic_snapshots(id),
  notes text,
  created_at timestamptz not null default now()
);
create index on statistic_snapshots(season_id, as_of_round_id, is_valid);

create table statistic_snapshot_values (
  snapshot_id uuid not null references statistic_snapshots(id) on delete cascade,
  season_player_id uuid not null references season_players(id) on delete cascade,
  stat_key text not null references stat_definitions(key),
  value numeric,                      -- NULL = nicht vorhanden, niemals 0 annehmen
  confidence numeric(3,2),
  needs_review boolean not null default false,
  primary key (snapshot_id, season_player_id, stat_key)
);

create table player_round_statistics (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references fantasy_rounds(id) on delete cascade,
  season_player_id uuid not null references season_players(id) on delete cascade,
  stat_key text not null references stat_definitions(key),
  value numeric not null,
  derived_from_snapshot_id uuid references statistic_snapshots(id) on delete set null,
  previous_snapshot_id uuid references statistic_snapshots(id) on delete set null,
  status stat_status not null default 'computed',
  updated_at timestamptz not null default now(),
  unique (round_id, season_player_id, stat_key)
);
create trigger trg_prs_updated before update on player_round_statistics for each row execute function set_updated_at();
create index on player_round_statistics(season_player_id, round_id);

create table statistic_corrections (
  id uuid primary key default gen_random_uuid(),
  round_stat_id uuid not null references player_round_statistics(id) on delete cascade,
  old_value numeric,
  new_value numeric not null,
  reason text,
  corrected_by uuid references profiles(user_id),
  corrected_at timestamptz not null default now()
);

create table import_audit_logs (
  id uuid primary key default gen_random_uuid(),
  import_id uuid references statistic_imports(id) on delete cascade,
  actor_id uuid,
  action text not null,
  details jsonb not null default '{}'::jsonb,
  at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Fantasy
-- ---------------------------------------------------------------------------
create table fantasy_teams (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(user_id) on delete cascade,
  season_id uuid not null references seasons(id) on delete cascade,
  name text not null check (length(name) between 3 and 30),
  name_status name_status not null default 'approved',
  captain_season_player_id uuid references season_players(id) on delete set null,
  joined_round_id uuid references fantasy_rounds(id) on delete set null,
  is_complete boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, season_id)
);
create trigger trg_fantasy_teams_updated before update on fantasy_teams for each row execute function set_updated_at();
create index on fantasy_teams(season_id);

-- aktueller, editierbarer Kader (Zwischenstände erlaubt: is_complete steuert Gültigkeit)
create table fantasy_rosters (
  id uuid primary key default gen_random_uuid(),
  fantasy_team_id uuid not null references fantasy_teams(id) on delete cascade,
  season_player_id uuid not null references season_players(id) on delete cascade,
  slot roster_slot not null,
  slot_order int not null default 0,
  price_paid_m numeric(6,1) not null,
  acquired_round_id uuid references fantasy_rounds(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (fantasy_team_id, season_player_id)
);

-- eingefrorene Aufstellung je Round (an der Deadline erzeugt)
create table fantasy_lineups (
  id uuid primary key default gen_random_uuid(),
  fantasy_team_id uuid not null references fantasy_teams(id) on delete cascade,
  round_id uuid not null references fantasy_rounds(id) on delete cascade,
  captain_season_player_id uuid references season_players(id) on delete set null,
  locked_at timestamptz not null default now(),
  unique (fantasy_team_id, round_id)
);

create table fantasy_lineup_players (
  lineup_id uuid not null references fantasy_lineups(id) on delete cascade,
  season_player_id uuid not null references season_players(id) on delete cascade,
  slot roster_slot not null,
  slot_order int not null default 0,
  primary key (lineup_id, season_player_id)
);

create table fantasy_transfers (
  id uuid primary key default gen_random_uuid(),
  fantasy_team_id uuid not null references fantasy_teams(id) on delete cascade,
  round_id uuid not null references fantasy_rounds(id) on delete cascade, -- Round, für die der Transfer wirkt
  out_season_player_id uuid references season_players(id) on delete set null,
  in_season_player_id uuid references season_players(id) on delete set null,
  is_free boolean not null default true,
  penalty_points numeric(6,2) not null default 0,
  made_at timestamptz not null default now()
);
create index on fantasy_transfers(fantasy_team_id, round_id);

create table fantasy_player_scores (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references fantasy_rounds(id) on delete cascade,
  season_player_id uuid not null references season_players(id) on delete cascade,
  scoring_version_id uuid not null references scoring_rule_versions(id),
  points numeric(8,2) not null default 0,
  details jsonb not null default '[]'::jsonb, -- [{stat, value, rule_points, points}]
  status score_status not null default 'official',
  computed_at timestamptz not null default now(),
  unique (round_id, season_player_id)
);
create index on fantasy_player_scores(season_player_id);

create table fantasy_team_scores (
  id uuid primary key default gen_random_uuid(),
  fantasy_team_id uuid not null references fantasy_teams(id) on delete cascade,
  round_id uuid not null references fantasy_rounds(id) on delete cascade,
  lineup_id uuid references fantasy_lineups(id) on delete set null,
  scoring_version_id uuid references scoring_rule_versions(id),
  base_points numeric(8,2) not null default 0,
  captain_bonus numeric(8,2) not null default 0,
  transfer_penalty numeric(8,2) not null default 0,
  total_points numeric(8,2) not null default 0,
  status score_status not null default 'official',
  computed_at timestamptz not null default now(),
  unique (fantasy_team_id, round_id)
);
create index on fantasy_team_scores(round_id, total_points desc);

-- ---------------------------------------------------------------------------
-- Ranglisten
-- ---------------------------------------------------------------------------
create table leaderboard_overall (
  season_id uuid not null references seasons(id) on delete cascade,
  fantasy_team_id uuid not null references fantasy_teams(id) on delete cascade,
  total_points numeric(9,2) not null default 0,
  last_round_points numeric(8,2) not null default 0,
  rank int not null,
  prev_rank int,
  rank_delta int,
  rounds_won int not null default 0,
  best_round_points numeric(8,2) not null default 0,
  computed_at timestamptz not null default now(),
  primary key (season_id, fantasy_team_id)
);
create index on leaderboard_overall(season_id, rank);

create table leaderboard_round (
  round_id uuid not null references fantasy_rounds(id) on delete cascade,
  fantasy_team_id uuid not null references fantasy_teams(id) on delete cascade,
  points numeric(8,2) not null default 0,
  rank int not null,
  primary key (round_id, fantasy_team_id)
);
create index on leaderboard_round(round_id, rank);

create table leaderboard_history (
  season_id uuid not null references seasons(id) on delete cascade,
  fantasy_team_id uuid not null references fantasy_teams(id) on delete cascade,
  round_id uuid not null references fantasy_rounds(id) on delete cascade,
  round_number int not null,
  rank int not null,
  total_points numeric(9,2) not null,
  round_points numeric(8,2) not null,
  primary key (season_id, fantasy_team_id, round_id)
);

create table round_winners (
  round_id uuid primary key references fantasy_rounds(id) on delete cascade,
  fantasy_team_id uuid not null references fantasy_teams(id) on delete cascade,
  points numeric(8,2) not null,
  published_at timestamptz not null default now()
);

create table season_champions (
  season_id uuid primary key references seasons(id) on delete cascade,
  fantasy_team_id uuid not null references fantasy_teams(id) on delete cascade,
  total_points numeric(9,2) not null,
  rounds_won int not null default 0,
  best_round_points numeric(8,2) not null default 0,
  podium jsonb not null default '[]'::jsonb,
  published_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Private Ligen, Preise, Audit
-- ---------------------------------------------------------------------------
create table fantasy_leagues (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references seasons(id) on delete cascade,
  owner_id uuid not null references profiles(user_id) on delete cascade,
  name text not null check (length(name) between 3 and 40),
  invite_code text not null unique default upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)),
  created_at timestamptz not null default now()
);

create table fantasy_league_members (
  league_id uuid not null references fantasy_leagues(id) on delete cascade,
  fantasy_team_id uuid not null references fantasy_teams(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (league_id, fantasy_team_id)
);

create table prizes (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references seasons(id) on delete cascade,
  round_id uuid references fantasy_rounds(id) on delete cascade, -- NULL = Saisonpreis
  title text not null,
  description text,
  image_url text,
  rank_from int not null default 1,
  rank_to int not null default 1,
  sponsor_name text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table prize_winners (
  id uuid primary key default gen_random_uuid(),
  prize_id uuid not null references prizes(id) on delete cascade,
  fantasy_team_id uuid not null references fantasy_teams(id) on delete cascade,
  notified_at timestamptz,
  claimed_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  unique (prize_id, fantasy_team_id)
);

create table audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid,
  entity text not null,
  entity_id text,
  action text not null,
  before jsonb,
  after jsonb,
  at timestamptz not null default now()
);
create index on audit_logs(entity, entity_id, at desc);

-- ---------------------------------------------------------------------------
-- Statistik-Definitionen (Briefing §17) – Basisdaten, keine Beispieldaten
-- ---------------------------------------------------------------------------
insert into stat_definitions (key, label_de, short_de, category, data_type, is_cumulative, sort_order) values
  ('appearances',      'Spiele',                 'SP',  'general',    'int', true, 10),
  ('goals',            'Tore',                   'T',   'general',    'int', true, 20),
  ('assists',          'Assists',                'A',   'general',    'int', true, 30),
  ('ball_actions',     'Ballaktionen',           'BA',  'general',    'int', true, 40),
  ('shots',            'Schüsse',                'SCH', 'offense',    'int', true, 50),
  ('shots_on_target',  'Schüsse aufs Tor',       'SaT', 'offense',    'int', true, 51),
  ('dribbles',         'Dribblings',             'DR',  'offense',    'int', true, 60),
  ('dribbles_success', 'Erfolgreiche Dribblings','DR+', 'offense',    'int', true, 61),
  ('fouls_suffered',   'Gefoult worden',         'GF',  'offense',    'int', true, 70),
  ('passes',           'Pässe',                  'P',   'build_up',   'int', true, 80),
  ('passes_success',   'Erfolgreiche Pässe',     'P+',  'build_up',   'int', true, 81),
  ('passes_failed',    'Fehlpässe',              'P-',  'build_up',   'int', true, 82),
  ('tackles_won',      'Balleroberungen',        'BE',  'defense',    'int', true, 90),
  ('clearances',       'Klärungen',              'KL',  'defense',    'int', true, 91),
  ('blocked_shots',    'Geblockte Schüsse',      'BL',  'defense',    'int', true, 92),
  ('fouls',            'Fouls',                  'F',   'defense',    'int', true, 100),
  ('yellow',           'Gelbe Karten',           'GK',  'defense',    'int', true, 110),
  ('red',              'Rote Karten',            'RK',  'defense',    'int', true, 111),
  ('saves',            'Paraden',                'PAR', 'goalkeeper', 'int', true, 120),
  ('goals_conceded',   'Gegentore',              'GT',  'goalkeeper', 'int', true, 121),
  ('clean_sheets',     'Zu-null-Spiele',         'ZN',  'goalkeeper', 'int', true, 122),
  ('penalties_saved',  'Gehaltene Strafstöße',   'PS',  'goalkeeper', 'int', true, 123),
  ('minutes',          'Spielminuten',           'MIN', 'general',    'int', true, 130);

insert into stat_definitions (key, label_de, short_de, category, data_type, is_cumulative, is_derived, derive_from, sort_order) values
  ('pass_accuracy', 'Passquote', 'P%', 'build_up', 'percent', false, true, '{"numerator":"passes_success","denominator":"passes"}', 83);

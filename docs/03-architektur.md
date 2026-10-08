# KLEINFELD FANTASY – Technische Architektur (Schritt 6)

Stand: 08.10.2026 · Stack: Next.js (App Router) · TypeScript · Tailwind · shadcn/ui · Supabase (Postgres, Auth, Storage) · Resend · GitHub · Vercel

---

## 1. Systemübersicht

```
┌───────────────────────────── Vercel ─────────────────────────────┐
│  Next.js App Router                                              │
│  ├─ (public)   Landing, Auth, Legal                              │
│  ├─ (app)      Dashboard, Team, Markt, Leaderboard, Profil       │
│  ├─ (admin)    Admin Console (Rolle: admin | editor)             │
│  ├─ Server Actions / Route Handlers (serverseitige Validierung)  │
│  └─ Cron Routes (Deadline-Lock, Reminder-Mails)                  │
└───────────────┬──────────────────────────────┬───────────────────┘
                │ supabase-js (anon, RLS)       │ service role (nur Server)
┌───────────────▼──────────────────────────────▼───────────────────┐
│  Supabase                                                        │
│  ├─ Postgres: Schema + RLS + SQL-Funktionen (Engine, Rankings)   │
│  ├─ Auth: E-Mail/Passwort, später OAuth                          │
│  ├─ Storage: player-images, team-logos, prize-images, imports    │
│  └─ Edge Functions: Screenshot-Extraktion (Vision-API), Export    │
└──────────────────────────────────────────────────────────────────┘
                │                                   │
         Resend (Transaktions-Mails)         Vision-Modell (nur Admin-Import)
```

**Grundsätze**
- Alle Spielregeln werden **in Postgres** durchgesetzt (Constraints + SQL-Funktionen), nicht nur im UI. Das UI validiert zusätzlich für UX.
- Fantasy-Berechnung, Rankings und Deadline-Locks laufen als **SQL-Funktionen / Server Actions mit Service Role** – nie im Browser.
- Jede Kennzahl ist **nachvollziehbar**: Punkte → `fantasy_score_details` → Statistik-Delta → Snapshot → Import-Datei.

---

## 2. Datenmodell

Notation: `PK` Primärschlüssel, `FK` Fremdschlüssel, `UQ` eindeutig. Alle Tabellen mit `created_at`, `updated_at`. IDs sind `uuid`.

### 2.1 Nutzer

```
profiles                    user_id PK=auth.users.id, username UQ (citext, 3–20), display_name,
                            avatar_url, locale 'de', role enum(user,editor,admin), 
                            username_changed_at, deleted_at
user_preferences            user_id PK, email_round_reminder bool, email_round_result bool, email_marketing bool
user_notifications          id PK, user_id FK, type, payload jsonb, read_at, sent_at
```

### 2.2 Wettbewerbe

```
competitions                id PK, slug UQ, name, short_name, organizer, logo_url, is_active
seasons                     id PK, competition_id FK, slug, name ("Season 5"), status enum(draft,open,live,completed,archived),
                            starts_at, ends_at, branding jsonb {accent, accent_fg, hero_image_url, logo_url}
season_rules                id PK, season_id FK, version int, valid_from, is_active,
                            rules jsonb  -- siehe 2.8
scoring_rule_versions       id PK, season_id FK, version int, is_active, rules jsonb  -- siehe 2.8
```
`season_rules` und `scoring_rule_versions` sind getrennt, weil das Punktesystem häufiger versioniert wird (Neuberechnung) als Kader-/Transferregeln.

### 2.3 Mannschaften & Spieler

```
clubs                       id PK, name, short_name (≤4), logo_url, primary_color
season_teams                id PK, season_id FK, club_id FK, display_name, UQ(season_id, club_id)
players                     id PK, first_name, last_name, display_name, birth_year?, nationality?, image_url,
                            external_refs jsonb  -- Zuordnung zu Datenquellen-IDs
season_players              id PK, season_id FK, player_id FK, season_team_id FK, position enum(GK,FIELD),
                            shirt_number, status enum(active,injured,unavailable,left), UQ(season_id, player_id)
player_market_values        id PK, season_player_id FK, value_m numeric(6,1), valid_from, valid_to NULL
                            -- S5: ein Eintrag pro Spieler; dynamische Werte später per neuem Eintrag
```

### 2.4 Spielbetrieb

```
matchdays                   id PK, season_id FK, number int, name, date, UQ(season_id, number)
matches                     id PK, matchday_id FK, home_team_id FK, away_team_id FK, kickoff_at,
                            status enum(scheduled,live,finished,postponed), home_score, away_score
fantasy_rounds              id PK, season_id FK, number int, name ("Spieltag 4"),
                            deadline_at timestamptz, status enum(upcoming,locked,live,under_review,completed),
                            transfer_window_open bool, UQ(season_id, number)
fantasy_round_matchdays     round_id FK, matchday_id FK, PK(round_id, matchday_id)  -- 1 Round : n Matchdays
```

### 2.5 Statistiken (Snapshot-Modell)

```
stat_definitions            key PK (text: goals, assists, shots, dribbles_success, passes, passes_success, 
                            fouls_suffered, fouls, yellow, red, tackles_won, clearances, saves, gk_goals, 
                            appearances, minutes, …), label_de, data_type enum(int,numeric,percent), 
                            is_cumulative bool, is_derived bool, derive_from jsonb
statistic_imports           id PK, season_id FK, round_id FK?, source enum(csv,xlsx,json,api,screenshot,manual),
                            file_path (Storage), file_hash UQ (Doppelimport-Schutz), imported_by FK,
                            status enum(uploaded,extracted,review,confirmed,published,rejected), 
                            extraction_log jsonb, error_log jsonb
statistic_snapshots         id PK, season_id FK, import_id FK, as_of_round_id FK, 
                            captured_at, is_valid bool, superseded_by FK?, notes
statistic_snapshot_values   snapshot_id FK, season_player_id FK, stat_key FK, value numeric NULL,
                            confidence numeric(3,2), needs_review bool, PK(snapshot_id, season_player_id, stat_key)
                            -- NULL = nicht vorhanden (niemals 0 annehmen)
player_round_statistics     id PK, round_id FK, season_player_id FK, stat_key FK, value numeric,
                            derived_from_snapshot_id FK, previous_snapshot_id FK?, 
                            status enum(computed,confirmed,published,corrected), UQ(round_id, season_player_id, stat_key)
statistic_corrections       id PK, round_stat_id FK, old_value, new_value, reason, corrected_by FK, corrected_at
import_audit_logs           id PK, import_id FK, actor_id, action, details jsonb, at
```

**Delta-Regel:** `player_round_statistics.value = snapshot_n.value − snapshot_{n−1}.value`, nur wenn beide Werte non-NULL und beide Snapshots `is_valid` und `as_of_round` genau aufeinanderfolgen. Prozentwerte (`percent`) werden **nie** subtrahiert, sondern aus den Zählern des Rounds neu berechnet (`is_derived`). Liegen zwischen zwei Snapshots mehrere Rounds, wird der Import in `status=review` gehalten; der Admin muss splitten (manuelle Verteilung) oder die Rounds zu einer Round zusammenlegen.

### 2.6 Fantasy

```
fantasy_teams               id PK, user_id FK, season_id FK, name (moderiert), name_status enum(pending,approved,rejected),
                            joined_round_id FK, budget_m numeric, UQ(user_id, season_id)
fantasy_rosters             id PK, fantasy_team_id FK, season_player_id FK, acquired_round_id FK, 
                            released_round_id FK NULL, price_paid_m   -- aktueller Kader = released_round_id IS NULL
fantasy_lineups             id PK, fantasy_team_id FK, round_id FK, captain_season_player_id FK,
                            locked_at timestamptz NULL, is_locked bool, UQ(fantasy_team_id, round_id)
fantasy_lineup_players      lineup_id FK, season_player_id FK, slot enum(GK,FIELD,BENCH), slot_order int,
                            PK(lineup_id, season_player_id)
fantasy_transfers           id PK, fantasy_team_id FK, round_id FK, out_season_player_id FK, in_season_player_id FK,
                            is_free bool, penalty_points numeric, made_at
fantasy_player_scores       id PK, round_id FK, season_player_id FK, scoring_version_id FK, 
                            points numeric(7,2), computed_at, status enum(provisional,official), UQ(round_id, season_player_id, scoring_version_id)
fantasy_score_details       player_score_id FK, stat_key FK, stat_value numeric, rule_points numeric, points numeric,
                            PK(player_score_id, stat_key)
fantasy_team_scores         id PK, fantasy_team_id FK, round_id FK, lineup_id FK, scoring_version_id FK,
                            base_points, captain_bonus, transfer_penalty, total_points, status, computed_at,
                            UQ(fantasy_team_id, round_id, scoring_version_id)
```

**Lineup-Freeze:** Beim Erreichen von `fantasy_rounds.deadline_at` setzt ein Cron-Job (Vercel Cron → Server Action mit Service Role) die Round auf `locked` und erzeugt für jedes Team aus dem aktuellen Kader + Kapitän eine `fantasy_lineups`-Zeile mit `is_locked=true`. Danach gilt RLS: keine Schreibrechte auf Lineup/Kapitän für diese Round. Transfers wirken immer erst auf die nächste `upcoming`-Round.

### 2.7 Ranglisten, Private Ligen, Preise, Admin

```
leaderboard_overall         season_id FK, fantasy_team_id FK, total_points, last_round_points, rank int,
                            prev_rank int?, rank_delta int, tiebreak jsonb, computed_at, PK(season_id, fantasy_team_id)
leaderboard_round           round_id FK, fantasy_team_id FK, points, rank, PK(round_id, fantasy_team_id)
leaderboard_history         season_id, fantasy_team_id, round_id, rank, total_points, PK(season_id, fantasy_team_id, round_id)
round_winners               round_id PK, fantasy_team_id FK, points, published_at
season_champions            season_id PK, fantasy_team_id FK, total_points, rounds_won int, best_round_points, podium jsonb

fantasy_leagues             id PK, season_id FK, owner_id FK, name, invite_code UQ (8 Zeichen), is_public bool
fantasy_league_members      league_id FK, fantasy_team_id FK, joined_at, PK(league_id, fantasy_team_id)

prizes                      id PK, season_id FK, round_id FK NULL (NULL = Saisonpreis), title, description, image_url, 
                            rank_from, rank_to, sponsor_name
prize_winners               id PK, prize_id FK, fantasy_team_id FK, notified_at, claimed_at, notes

audit_logs                  id PK, actor_id, entity, entity_id, action, before jsonb, after jsonb, at
```

Rollen liegen in `profiles.role`; feingranulare Rechte sind für S5 nicht nötig (2 Admin-Rollen). `admin_permissions` wird erst eingeführt, wenn es mehr als eine Organisation gibt.

### 2.8 Regel-JSON (konfigurierbar)

```jsonc
// season_rules.rules
{
  "budget_m": 100,
  "squad": { "GK": 1, "FIELD": 4, "BENCH": 2 },
  "bench_counts": false,
  "auto_sub": false,
  "max_per_club": 3,
  "captain_multiplier": 2,
  "transfers": { "free_per_round": 2, "carry_over": false, "penalty_points": 4, "max_extra": 3 },
  "late_entry": "allowed",
  "tiebreak": ["total_points", "last_round_points", "fewer_transfers", "earlier_created"]
}

// scoring_rule_versions.rules  (vorläufig, §18 Briefing)
{
  "rules": [
    { "stat": "goals",            "applies_to": "FIELD", "points": 6 },
    { "stat": "goals",            "applies_to": "GK",    "points": 8 },
    { "stat": "assists",          "points": 4 },
    { "stat": "shots",            "points": 0.5 },
    { "stat": "dribbles_success", "points": 1 },
    { "stat": "fouls_suffered",   "points": 0.5 },
    { "stat": "passes_success",   "points": 1, "per": 10, "mode": "floor" },
    { "stat": "pass_accuracy",    "points": 2,  "condition": { "gte": 85, "min_stat": "passes", "min": 15 }, "enabled": false },
    { "stat": "pass_accuracy",    "points": -2, "condition": { "lt": 60,  "min_stat": "passes", "min": 15 }, "enabled": false },
    { "stat": "tackles_won",      "points": 1.5 },
    { "stat": "clearances",       "points": 0.5 },
    { "stat": "fouls",            "points": -0.5 },
    { "stat": "yellow",           "points": -2 },
    { "stat": "red",              "points": -5 },
    { "stat": "saves",            "applies_to": "GK", "points": 0.75 }
  ],
  "exclude_stats": ["scorer_points"]   // nie zusätzlich zu Toren/Assists werten
}
```

---

## 3. Fantasy-Engine

```
publish_round_stats(round_id)
  │ Voraussetzung: alle player_round_statistics der Round in status=confirmed
  ▼
compute_player_scores(round_id, scoring_version_id)
  │ für jeden season_player mit Statistiken in der Round:
  │   points = Σ rule(stat_value) gemäß Regelversion  → fantasy_player_scores + fantasy_score_details
  ▼
compute_team_scores(round_id)
  │ für jedes gelockte Lineup:
  │   base = Σ points(GK) + Σ points(FIELD)        (BENCH nur bei bench_counts/auto_sub)
  │   captain_bonus = points(captain) × (multiplier − 1)
  │   transfer_penalty = Σ penalty_points der Transfers dieser Round
  │   total = base + captain_bonus − transfer_penalty  → fantasy_team_scores
  ▼
rebuild_leaderboards(season_id, round_id)
  │ leaderboard_round: RANK() OVER (ORDER BY points DESC, tiebreak…)
  │ leaderboard_overall: Σ total_points über alle completed Rounds, RANK(), rank_delta = prev_rank − rank
  │ leaderboard_history: Zeile je Team je Round
  │ round_winners: Rang 1 der Round
  ▼
set round.status = completed; notify (Resend: Spieltagsergebnis)
```

- Alle vier Schritte sind **idempotente Postgres-Funktionen** (`SECURITY DEFINER`, nur für Admin-Rolle aufrufbar) in einer Transaktion.
- **Neuberechnung:** Statistikkorrektur → `statistic_corrections` → `player_round_statistics.status=corrected` → derselbe Lauf mit neuer oder gleicher Regelversion. Alte `fantasy_player_scores` bleiben per `scoring_version_id` historisch erhalten; Leaderboards werden neu gebaut; `audit_logs` protokolliert vorher/nachher.
- **Vorläufige Punkte** (später): identischer Lauf mit `status=provisional` auf unbestätigten Deltas; UI kennzeichnet „vorläufig". Architektur braucht dafür keine Änderung.

---

## 4. Statistikimport-Pipeline

```
Upload (Admin)  ──▶ statistic_imports (file_hash prüft Doppelimport)
   │ csv/xlsx/json: Parser (Spalten-Mapping-UI, gespeichert pro Quelle)
   │ screenshot:    Edge Function → Vision-Modell → strukturierte Werte + confidence je Zelle
   ▼
Namensabgleich  ──▶ fuzzy match (pg_trgm) auf season_players.display_name + external_refs
   │ Treffer < 0.85 oder mehrdeutig → needs_review
   ▼
Snapshot        ──▶ statistic_snapshots + statistic_snapshot_values (NULL für nicht erkannte Werte)
   ▼
Delta           ──▶ player_round_statistics (nur bei lückenloser Snapshot-Folge, sonst review)
   ▼
Review-UI       ──▶ Tabelle: Spieler × Statistik, Vorher/Nachher/Delta, Flags, Inline-Korrektur
   ▼
Confirm → Publish → Engine (Abschnitt 3)
```

Regeln: KI erfindet nichts (nur gelesene Werte + confidence); Originaldatei bleibt in Storage; jeder Schritt im `import_audit_logs`; ein publizierter Snapshot kann nur durch `superseded_by` ersetzt, nie gelöscht werden.

---

## 5. Leaderboard-Engine

- **Vorberechnet**, nie live aggregiert: `leaderboard_overall` und `leaderboard_round` werden pro Engine-Lauf komplett neu geschrieben (bei 20.000 Teams < 1 s in Postgres).
- **Indizes:** `(season_id, rank)`, `(season_id, fantasy_team_id)`, `(round_id, rank)`.
- **Pagination:** Keyset auf `rank` (`WHERE rank > $cursor LIMIT 50`), nicht OFFSET.
- **Jump to My Rank:** `SELECT rank FROM leaderboard_overall WHERE season_id=$1 AND fantasy_team_id=$2` → Client lädt die Seite `floor((rank−1)/50)` bzw. Fenster `rank−25…rank+25`. Unabhängig vom geladenen Zustand.
- **Rivalen:** `WHERE rank BETWEEN my_rank−2 AND my_rank+2 ORDER BY rank`.
- **Ranking-Verlauf:** `leaderboard_history` je Team, ein Query, Liniendiagramm.
- **Tie-Break** deterministisch über `tiebreak jsonb` gemäß `season_rules` (E9 der Entscheidungsliste).
- **Caching:** Next.js `unstable_cache`/Route-Cache mit Tag `leaderboard:{season}` → Invalidierung nach jedem Engine-Lauf. Reicht für 5.000 Nutzer deutlich; Redis erst bei Live-Scoring nötig.

---

## 6. Sicherheit & Datenschutz

| Thema | Umsetzung |
|---|---|
| RLS | `profiles`: eigener Datensatz; `fantasy_*`: eigenes Team lesen/schreiben, Schreiben nur wenn Round `upcoming`; Leaderboards/Spieler/Statistiken: public read (nur `published`); Admin-Tabellen: `role in (admin, editor)` |
| Service Role | Nur in Server Actions, Cron Routes, Edge Functions; nie im Client-Bundle (ESLint-Regel + `server-only`) |
| Deadline | Datenbank-Trigger verweigert Updates auf Lineup/Kader/Kapitän wenn `now() >= deadline_at` der betroffenen Round – unabhängig vom UI |
| Rate Limiting | Vercel WAF / Upstash Ratelimit auf Auth-, Transfer- und Liga-Beitritts-Endpunkten |
| Uploads | Storage-Policies nach Bucket; MIME- und Größenprüfung serverseitig; Imports nur für Admin |
| Audit | `audit_logs` via Trigger auf allen Admin-mutierten Tabellen |
| DSGVO | Account löschen (Soft-Delete + Anonymisierung des Benutzernamens im Leaderboard nach 30 Tagen), Datenexport als JSON per Edge Function, Double-Opt-in für optionale Mails, keine E-Mails in öffentlichen Views |
| Backups | Supabase PITR (Pro-Plan), zusätzlich wöchentlicher Dump nach Storage |

---

## 7. Multi-Competition & Internationalisierung

- **Alles hängt an `season_id`.** Eine neue Season = Admin-Formular (Regeln, Branding, Teams, Spieler-Import, Rounds). Kein Deploy.
- **Branding-Tokens** pro Season (`branding jsonb`) werden als CSS-Variablen in den Wettbewerbsbereich injiziert (`--season-accent`), globale Tokens bleiben unberührt.
- **Nutzerkontext:** `active_season_id` in `user_preferences`; Switcher im Header; Dashboard zeigt zusätzlich eine „Meine Wettbewerbe"-Karte.
- **i18n:** `next-intl` mit `de` als Default; alle Strings in `messages/de.json` ab Tag 1; Zahlen/Datum per `Intl`. Statistik-Labels aus `stat_definitions.label_de` (später `label_en`).

---

## 8. Projektstruktur (Next.js)

```
apps/web
  app/(public)/…            landing, login, register, legal
  app/(app)/[season]/…      dashboard, team, market, players/[id], leaderboard, leagues, profile
  app/(admin)/admin/…       competitions, seasons, teams, players, rounds, imports, scoring, users, prizes
  app/api/cron/…            lock-rounds, send-reminders
  components/ui             shadcn
  components/fantasy        PlayerCard, Pitch, RankCard, LeaderboardTable, StatBar …
  lib/supabase              client.ts, server.ts, admin.ts (service role, server-only)
  lib/engine                scoring.ts (reine Funktionen, unit-getestet, Spiegel der SQL-Logik)
  lib/rules                 zod-Schemas für season_rules / scoring_rules
  messages/de.json
supabase/
  migrations/               SQL (Schema, RLS, Funktionen, Trigger)
  functions/                extract-stats (Vision), export-user-data
  seed/                     Beispieldaten (klar gekennzeichnet)
design/
  tokens.json, tailwind.preset.ts
```

Tests: Vitest (Engine-Logik, Regel-Validierung), Playwright (Registrierung, Team bauen, Budget-Grenze, Deadline-Lock, Jump to My Rank), pgTAP oder SQL-Tests für Engine-Funktionen und RLS.

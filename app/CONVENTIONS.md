# KLEINFELD FANTASY – Code-Konventionen

Stack: Next.js 16.4 (App Router, **Turbopack**, `cacheComponents: false`), React 19, TypeScript strict, Tailwind v4 (Tokens in `src/app/globals.css`), Supabase (`@supabase/ssr`), Zod 4, lucide-react, Vitest.

## Next.js 16 – Pflichtwissen
- `params`, `searchParams`, `cookies()`, `headers()` sind **async** → immer `await`.
- Middleware heißt `src/proxy.ts` (existiert, nicht anfassen).
- Server Actions: `"use server"` am Dateianfang; Formulare mit `useActionState` (React 19). Nach Mutationen `revalidatePath(...)`.
- Keine `LayoutProps`/`PageProps`-Globals verwenden – explizite Props-Typen schreiben.
- Client Components nur wo nötig (`"use client"`); Datenzugriff in Server Components.

## Supabase
- Server: `const supabase = await createClient()` aus `@/lib/supabase/server` (RLS gilt, Nutzer-Session).
- Admin/Engine (Service Role, umgeht RLS): `createAdminClient()` aus `@/lib/supabase/admin` – **nur** in Server Actions/Route Handlers **nach** `requireStaff()`/`requireAdmin()` aus `@/lib/auth`.
- Typen: `Database`, `Tables<"x">`, `Enums<"x">` aus `@/lib/database.types` (generiert; nicht von Hand ändern).
- RPCs (siehe `supabase/migrations/0003_engine.sql`, `0004_helpers.sql`):
  - `save_roster(p_season_id, p_team_name, p_players jsonb, p_captain, p_dry_run)` → `{ok, errors[], complete, total_m, budget_m, transfers, free_transfers, penalty, team_id}`
  - `lock_round(p_round_id)`, `lock_due_rounds()`, `compute_round(p_round_id, p_finalize)`, `rebuild_overall_leaderboard(p_season_id)` – Staff, Service Role
  - `derive_round_stats_from_snapshot(p_snapshot_id)` → `{ok, rows, blocked_reason}`; `publish_round_stats(p_round_id)`; `correct_round_stat(p_round_stat_id, p_new_value, p_reason)`
  - `my_rank(p_season_id)`, `leaderboard_window(p_season_id, p_from, p_to)`, `round_leaderboard_window(p_round_id, p_from, p_to)`, `league_table(p_league_id)`
  - `admin_create_season(...)`, `admin_activate_scoring_version(id)`, `finalize_season(id)`, `set_user_role(uid, role)`
- View `player_season_stats` (Punkte, Ø, Form, Punkte/Mio, Tore, Assists, owned_by je season_player).
- Regeln: `season_rules(p_season_id)` liefert effektive Regeln (Defaults ∪ `seasons.rules`). TS-Spiegel: `parseSeasonRules()` in `@/lib/rules`.

## Datenzugriff (Server)
- `getAppContext()` / `requireCompleteTeam()` aus `@/lib/data/context` → `{ user, profile, season, ctx: { rules, rounds, nextRound, lastCompletedRound, branding }, myTeam }`.
- `getSeasonPlayers(seasonId)` → `PlayerRow[]` (Spieler + Club + Stats), `getMyTeam`, `getMyRank`, `listSeasons` in `@/lib/data/season`.

## UI
- Komponenten: `@/components/ui/{button,card,input,badge,tricolore}`; Fantasy: `@/components/fantasy/{player-avatar,pitch,rank-card,countdown}`.
- Klassen: `display` (kursive Versalien-Headline), `display-upright`, `num` (tabellarische Zahlen), `eyebrow`, `tricolore`, `tricolore-skew`, `skew`.
- Farben nur über Tokens: `bg-ground bg-surface bg-card border-border text-text text-text-2 text-muted text-gold text-red text-positive bg-accent text-accent-fg`.
- Mobile first: Touchflächen ≥ 44 px, Tabellen auf Mobile als Karten oder horizontal scrollbar, Bottom Nav ist fest (Padding unten im Shell vorhanden).
- Zahlenformat: `formatPoints`, `formatMillions`, `formatDateTime`, `formatCountdown` aus `@/lib/utils`. Sprache: Deutsch, Du-Form, kurz.
- Keine Emojis. Icons: lucide-react.
- Beispiel-/Platzhalterdaten immer als solche kennzeichnen.

## Qualität
- `npm run typecheck` muss grün sein, `npm run lint` ohne Fehler, `npm test` grün.
- Keine `any`; Supabase-Join-Ergebnisse ggf. per `as unknown as T` auf definierte Typen casten.

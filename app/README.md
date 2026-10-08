# KLEINFELD FANTASY

Fantasy-Sport-Plattform für Kleinfeldfußball · Powered by DKFV.
Next.js 16 · TypeScript · Tailwind 4 · Supabase · Resend · Vercel.

## Schnellstart (lokal)

```bash
npm install
cp .env.example .env.local     # Werte aus Supabase/Resend eintragen (siehe docs/05-setup-anleitung.md)
npm run dev                    # http://localhost:3000
```

## Datenbank einrichten (Supabase SQL Editor)

Nacheinander ausführen:

1. `supabase/migrations/0001_schema.sql` – Tabellen, Enums, Statistik-Definitionen
2. `supabase/migrations/0002_rls.sql` – Row Level Security, Storage-Buckets
3. `supabase/migrations/0003_engine.sql` – Kaderregeln, Deadline-Lock, Punkte-Engine, Leaderboards
4. `supabase/migrations/0004_helpers.sql` – Registrierung, Admin-Hilfen
5. `supabase/seed/seed.sql` – Wettbewerbe + Icon League Season 5 (Struktur)
6. optional `supabase/seed/seed_demo.sql` – **Beispieldaten** (6 Teams, 48 Spieler, 3 Spieltage). Vor dem Launch wieder entfernen.

Dann in der App registrieren und im SQL Editor: `update profiles set role = 'admin' where username = '<dein Benutzername>';`

## Qualität

```bash
npm run typecheck    # TypeScript
npm run lint         # ESLint
npm test             # Vitest (Scoring-Spiegel der SQL-Engine)
npm run db:test      # Engine-Tests gegen lokalen Postgres (benötigt psql, PGHOST/PGPORT/PGUSER)
npm run build        # Produktions-Build
```

`src/lib/database.types.ts` wird aus dem Schema generiert: `python3 supabase/tests/gen_types.py "postgresql://…" > src/lib/database.types.ts`.

## Struktur

```
src/app/(public)      Landingpage, Login, Registrierung, Passwort, Rechtstexte
src/app/app           Dashboard, Mein Team, Spielermarkt, Spielerprofil, Leaderboard, Private Ligen, Profil
src/app/admin         Admin Console: Wettbewerbe, Seasons, Teams, Spieler, Spieltage, Statistikimport, Punktesystem, Preise, Nutzer
src/app/api/cron      Deadline-Lock (alle 5 Min), Erinnerungsmails (täglich 9 Uhr) – geschützt durch CRON_SECRET
src/lib               Supabase-Clients, Auth, Regeln, Engine-Spiegel, E-Mail, Insights
supabase/migrations   Schema, RLS, Engine (die Spielregeln leben in Postgres)
docs/ (im Repo-Root) Konzept, Architektur, Setup-Anleitung
```

## Betrieb – Spieltag-Ablauf im Admin

1. **Spieltag anlegen** (Rounds) mit Deadline.
2. Deadline erreicht → Cron sperrt automatisch (oder Button „Spieltag sperren“).
3. **Statistik importieren** (CSV, kumuliert oder je Spieltag) → Review → Korrekturen → **Freigeben**.
4. **Punkte berechnen & abschließen** → Leaderboards, Manager of the Matchday, Ergebnismails.
5. Korrektur nötig? Wert ändern → erneut berechnen; alles wird protokolliert.

Konventionen für Weiterentwicklung: `CONVENTIONS.md`.

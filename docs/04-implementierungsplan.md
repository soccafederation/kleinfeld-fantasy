# KLEINFELD FANTASY – Implementierungsplan (Schritt 7)

Stand: 08.10.2026 · Reihenfolge nach Abhängigkeiten, nicht nach Sichtbarkeit. Jeder Sprint endet mit einem lauffähigen, deploybaren Stand.

---

## Grundprinzip der Reihenfolge

1. **Daten vor Oberfläche:** Schema, Regeln und Engine zuerst, weil jedes UI daran hängt und Fehler hier später am teuersten sind.
2. **Engine vor Import:** Die Punktelogik lässt sich mit Seed-Daten testen, bevor die Import-Pipeline steht.
3. **Admin früh:** Ohne Admin kann kein echter Wettbewerb angelegt werden – und die Saison-4-Simulation braucht Admin-Importe.
4. **Launch-Gate = Must-have-Liste §45.** Alles andere wartet.

---

## Sprint 0 – Freigabe & Fundament (diese Woche)

| Aufgabe | Ergebnis |
|---|---|
| Designrichtung freigeben | Entscheidung A/B/C/Hybrid |
| Entscheidungsliste E1–E14 bestätigen | `season_rules` v1 |
| Offene Fragen F1–F10 beantworten (v. a. S4-Daten, Datenrechte) | Blocker aufgelöst |
| Accounts: GitHub-Org, Vercel, Supabase (EU-Region Frankfurt), Resend, Domain | Zugänge liegen beim Betreiber |

## Sprint 1 – Designsystem & restliche Screens (Woche 1)

- Tokens (`tokens.json`, Tailwind-Preset), Komponentenbibliothek auf shadcn-Basis: Button, Card, PlayerCard, RankCard, Pitch, StatBar, Table, BottomNav, Sheet.
- Screens 3–6 (Mein Team, Spielermarkt, Spielerprofil, Leaderboard) mobil + Desktop in der freigegebenen Richtung.
- Onboarding-Flow (6 Schritte) als Wireframe-Prototyp.
- **Freigabe-Meilenstein 2:** alle sechs Screens.

## Sprint 2 – Repository, Schema, Auth (Woche 2)

- Monorepo-Setup, CI (Lint, Typecheck, Tests), Preview-Deployments auf Vercel.
- Supabase-Migrationen: komplettes Schema aus Architektur §2, RLS-Policies, Audit-Trigger.
- Auth: Registrierung (Benutzername, E-Mail, Passwort, AGB-Checkbox), Verifizierung, Login, Reset, Profil, Account löschen, Datenexport. Resend-Templates (DE).
- Rechtstexte-Seiten (Platzhalter für Impressum/Datenschutz/Teilnahmebedingungen).
- **Test:** Nutzer kann Account erstellen (Playwright).

## Sprint 3 – Wettbewerbe, Spieler, Admin-Basis (Woche 3)

- Admin Console: Competitions, Seasons (Regeln-Formular aus `season_rules`-Schema), Teams, Spieler (CRUD + CSV-Import + Bildupload), Rounds/Matchdays.
- Marktwert-Verwaltung (Einzelwert + Massenimport).
- Seed: Icon League Season 5 mit Platzhalter-Teams/-Spielern (klar gekennzeichnet) bis echte Kader vorliegen.
- **Test:** Neue Season ohne Code anlegbar.

## Sprint 4 – Team Builder, Kapitän, Transfers (Woche 4)

- Onboarding + Mein Team + Spielermarkt (Filter, Sortierung, Suche, Punkte/Mio.).
- Serverseitige Validierung: Budget, Positionen, max. pro Club, Transferregeln, Deadline-Trigger.
- Zwischenstand speichern (Draft-Kader), Kapitänswahl, Transfer-Flow mit Alternativen-Vorschlag.
- Teamname-Moderation (Wortfilter + Admin-Queue).
- **Tests:** gültiges Team; Budgetüberschreitung verhindert; Änderung nach Deadline unmöglich.

## Sprint 5 – Statistik-Pipeline (Woche 5–6)

- Statistik-Definitionen, CSV/Excel-Import mit Spalten-Mapping, Snapshot-Speicherung, Delta-Berechnung, Review-UI, Freigabe-Workflow, Korrekturen.
- Screenshot-Import als Edge Function (Vision-Modell) mit Confidence-Flags – nach CSV, weil CSV der verlässlichere Pfad ist.
- **Saison-4-Simulation:** S4-Daten importieren, Punktesystem v1 laufen lassen, Analyse-Report (Top-Spieler, TW vs. Feld, Verteilung, Dominanz Tore). Daraus Punktesystem v2 + Marktwerte ableiten.
- **Tests:** Import; kumulierte Werte korrekt verarbeitet; Lücken-Snapshots blockieren.

## Sprint 6 – Fantasy-Engine & Leaderboards (Woche 7)

- SQL-Funktionen: Player Scores, Team Scores, Leaderboards (Overall, Round, History), Round Winners, Neuberechnung.
- Dashboard (Rank-Karte, Gesamtpunkte, Delta, Deadline, Teamvorschau, letzter Spieltag), Leaderboard (Overall/Matchday/My Leagues, Jump to My Rank, Rivalen, Verlauf), Spielerprofil mit Punkteaufschlüsselung.
- Cron: Round-Lock an der Deadline, Erinnerungsmail 24 h vorher, Ergebnismail nach Publish.
- **Tests:** Punkte korrekt; Kapitän ×2; Sortierung; Jump to My Rank für Platz 133/800; Korrektur → konsistente Neuberechnung.

## Sprint 7 – Should-haves & Launch-Vorbereitung (Woche 8–9)

- Spielervergleich, Fantasy Insights (regelbasiert), Private Ligen (Einladungscode/-link), Preisverwaltung + Gewinnermails, Hall of Fame / Champion-Seite.
- PWA (Manifest, Icons, Installierbarkeit), Performance-Pass (Lighthouse mobil ≥ 90), Sicherheits-Review (RLS-Tests, Rate Limits), Backups.
- Testwettbewerb mit 20–50 internen Nutzern über zwei simulierte Rounds.
- Rechtstexte final, Teilnahmebedingungen, Tie-Break veröffentlicht.

## Launch – Icon League Season 5

- Go-Live auf Produktionsdomain, Monitoring (Vercel Analytics, Supabase Logs, Sentry).
- Erster echter Import nach Spieltag 1 mit Vier-Augen-Freigabe.

## Nach Launch (Backlog, priorisiert)

Live-/vorläufige Punkte · dynamische Marktwerte · Auto-Sub · OAuth (Google/Apple) · Englisch · Head-to-Head-Ligen · Draft-Modus · native Apps.

---

## Zeitbedarf (Richtwert)

Ca. **9 Wochen** bis Launch-fähig bei kontinuierlicher Arbeit, abhängig von Freigabezyklen und davon, wann S4-Daten und Season-5-Kader vorliegen. Die Statistik-Pipeline (Sprint 5) ist der größte Unsicherheitsfaktor.

---

## Was ich als Nächstes von dir brauche

1. Freigabe oder Änderungswünsche zu den drei Designrichtungen.
2. Entscheidungen E1–E14 (oder „Empfehlungen übernehmen").
3. Antworten auf F1–F4 (S4-Daten, Datenrechte, Socca/Soccer, DKFV-Nutzung).
4. Die Season-4-Statistiken als Datei, sobald verfügbar.

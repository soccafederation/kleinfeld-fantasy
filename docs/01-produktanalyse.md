# KLEINFELD FANTASY – Produktanalyse (Schritt 1–2)

Stand: 08.10.2026 · Basis: Master-Briefing V4.0 + bereitgestellte Assets

---

## 1. Asset-Übersicht

### Vorhanden

| Asset | Datei | Format / Auflösung | Bewertung |
|---|---|---|---|
| DKFV-Logo, Weiß, mit Verbandsname | `Logo_dkfv_white_transparent.png` | PNG RGBA, 1163×251 | Primäres Logo für dunkle Hintergründe. Web-tauglich. |
| DKFV-Logo, Weiß, kurz (ohne Verbandsname) | `Logo_dkfv_small_white_transparent 1.png` | PNG RGBA, 717×251 | Für Header/Mobile ("Powered by DKFV"). |
| DKFV-Logo "Germany", Weiß | `Logo Germany weiß.png` | PNG RGBA, 2050×437 | Reinweiße Variante ohne Farbstreifen. Flache Version, gut für Footer/Print. |
| DKFV-Logo Vektor | `Logo_DKFV_germany.eps` | EPS (2012) | Vektorquelle – für SVG-Export nutzbar. |
| DKFV-Logo PSD | `Logo_dkfv_white_transparent.psd` | PSD | Quelle, nicht web-relevant. |
| Bundesadler | `Bundesadler linke Brust 7 cm Höhe.pdf` | PDF, 679×846 px @300 dpi | **Nur Trikot-Anwendung.** Für die Plattform nicht nutzen (siehe Risiken). |
| Foto 1: Kennedyplatz Essen, Nacht | `drone_final1.png` | 1672×941 | **Bestes Hero-Motiv.** Stimmung, Flutlicht, Tribüne. |
| Foto 2: Drohne Essen 2023 | `Drone Shot Essen 2023 HD.jpg` | 1920×1440 | Weitwinkel, Dämmerung. Gut für Sektions-Hintergründe. |
| Foto 3: Seitenansicht Stadion | `Essen stadium high from side view-01.jpg` | 2016×1512 | Spielszene, Zuschauer, Sponsorbanden (Sportland NRW, westenergie). Gut für CTA-Bereich; Sponsorlogos prüfen. |

### Markenanalyse DKFV

- **Logo-Elemente:** Fußball-Icon mit Strahlenkranz, fette kursive Wortmarke „DKFV", diagonaler Schwarz-Rot-Gold-Streifen, Verbandsname in schmaler Grotesk (Eurostile-ähnlich).
- **Farben (aus Logo gemessen):** Weiß, Schwarz, Rot `#FF0000`-nah, Gelb `#FFFF00`-nah (reine RGB-Werte, keine abgestimmten Markenfarben). Für Screen-Nutzung empfohlen: Rot `#E30613`, Gold `#FFD400`.
- **Charakter:** sportlich, dynamisch (Kursive, Diagonale), national (Tricolore), funktional.
- **Konsequenz:** Die vorläufige Lime-Grün-Palette aus dem Briefing hat keine Verbindung zur DKFV-Identität. Gold ist der naheliegende Primärakzent (Verbandsidentität + „Gewinner"-Semantik für Rankings), Rot als Sekundärakzent/Negativ.

### Fehlend (Platzhalter notwendig)

| Fehlt | Auswirkung | Empfehlung |
|---|---|---|
| DKFV-Logo positiv (dunkel auf hell) | Light-Mode, E-Mails, Print | Aus EPS ableiten |
| DKFV-Styleguide (Schrift, Farbwerte, Schutzraum) | Farbwerte sind geschätzt | Beim Verband anfragen |
| Icon-League-Logo, Season-5-Key-Visual | Wettbewerbsbereich ohne Marke | Platzhalter; Rechte klären |
| Mannschaftslogos Icon League | Spielerkarten, Markt | Platzhalter-Kürzel |
| Spielerfotos | Spielerkarten, Profil | Silhouetten-Avatare; Rechte klären |
| Season-4-Statistiken (CSV/Excel) | Marktwert-Herleitung, Punktesimulation | **Blocker für Schritt „Punktesystem final"** |
| Logos Socca Champions League / Socca Euro 2027 | Wettbewerbskarten | Platzhalter |
| Sponsorenlogos / Preisbilder | Preis-Sektion | Platzhalter |

**Annahme zur Klärung:** Das Briefing schreibt „Soccer Champions League" / „Soccer Euro 2027". Ich gehe davon aus, dass **Socca** (International Socca Federation) gemeint ist und habe das in den Designs so verwendet. Bitte bestätigen.

---

## 2. Produktarchitektur – Zusammenfassung

### Kernmodell

```
Plattform (KLEINFELD FANTASY, ein Account)
 └─ Competition (Icon League, Socca CL, Socca Euro …)
     └─ Season (Season 5 …) – eigene Regeln, Budget, Kader, Punktesystem, Branding
         ├─ Teams → Players (Season-Zuordnung, Marktwert, Position)
         ├─ Matchdays → Matches (reale Begegnungen)
         ├─ Fantasy Rounds (Wertungsrunde mit Deadline; 1 Round = 1..n Matchdays)
         ├─ Fantasy Teams (1 pro User pro Season) → Lineups (Snapshot je Round)
         ├─ Statistik-Snapshots (kumuliert) → Round-Deltas → Fantasy Scores
         └─ Leaderboards (Overall, Round) + Private Leagues + Prizes
```

### Die fünf Kernmodule

| Modul | Aufgabe | Kritische Eigenschaft |
|---|---|---|
| **Team Builder** | Kader zusammenstellen innerhalb Budget/Positionen/Limits, Kapitän, Transfers | Alle Regeln aus `season_rules` (konfigurierbar), serverseitig validiert |
| **Stats Pipeline** | Import (CSV/Excel/Screenshot/manuell) → Snapshot → Delta → Freigabe | Fehlende Werte ≠ 0; Delta nur zwischen aufeinanderfolgenden gültigen Snapshots |
| **Fantasy Engine** | Punkte je Spieler je Round aus Deltas × Regelversion; Kapitän ×2; Team-Summe aus eingefrorenem Lineup | Idempotent, versioniert, Neuberechnung mit Audit |
| **Leaderboard Engine** | Vorberechnete Rankings (Overall, Round), eigener Rang per Query, Rivalen ±2 | Tie-Break-Regel fix, Pagination serverseitig, Rang in O(log n) |
| **Admin Console** | Wettbewerbe anlegen, Daten pflegen, Importe prüfen, Rechnen, Freigeben | Ohne Code bedienbar; jede Aktion im Audit Log |

### Navigationsstruktur (Mobile Bottom Nav)

Dashboard · Mein Team · Spielermarkt · Leaderboard · Profil – wie im Briefing. Wettbewerbswechsel über Switcher im Header (nicht in der Bottom Nav), damit die fünf Tabs stabil bleiben.

---

## 3. Offene Fragen (vor Implementierung zu klären)

| # | Frage | Warum wichtig | Mein Vorschlag |
|---|---|---|---|
| F1 | Liegen Season-4-Statistiken als Datei vor (CSV/Excel) oder nur als Web/Screenshots? | Marktwerte + Punktesimulation hängen daran | Erst Datei anfragen, parallel Screenshot-Pipeline bauen |
| F2 | Gibt es eine Vereinbarung mit Icon League / Datenanbieter zur Statistiknutzung? | Rechtliches Risiko, Datenbankrecht (§87a UrhG) | Vor Launch schriftliche Freigabe einholen |
| F3 | „Soccer" oder „Socca" Champions League / Euro 2027? | Branding, Domains | Socca angenommen |
| F4 | Dürfen DKFV-Logo und Name „Powered by DKFV" verwendet werden? Gibt es Vorgaben? | Markenauftritt | Ja angenommen; Styleguide anfragen |
| F5 | Wie viele Spieltage hat Icon League Season 5, wie viele Spiele pro Team pro Spieltag? | Fantasy-Round-Logik, Deadline-Taktung | Annahme: 1 Spieltag = 1 Round |
| F6 | Spieltagsformat: Spielen alle Teams am selben Tag/Ort? | Deadline-Modell (eine Deadline pro Round vs. rollierend) | Eine Deadline pro Round |
| F7 | Wer administriert nach Launch (wie viele Personen, technisches Niveau)? | Admin-UX-Tiefe, Rollenmodell | 2 Rollen: Admin, Editor |
| F8 | Soll Registrierung erst ab Season-Start oder früher öffnen (Pre-Registration)? | Landingpage-CTA, E-Mail-Flows | Pre-Registration mit Team-Builder ab Kaderveröffentlichung |
| F9 | Wird Live-Scoring für Season 5 erwartet oder reicht Post-Matchday? | Architektur unverändert, Aufwand groß | Post-Matchday für S5 |
| F10 | Domain / Hosting-Konto (Vercel, Supabase, Resend, GitHub-Org) – wer besitzt die Accounts? | Betrieb, Kosten, Zugriff | Accounts im Namen des Betreibers (DKFV/Amilla) anlegen |

---

## 4. Risiken

| Risiko | Schwere | Einschätzung | Gegenmaßnahme |
|---|---|---|---|
| **Datenverfügbarkeit** – Statistiken nur kumuliert, unregelmäßig oder unvollständig | Hoch | Realistisch. Screenshot-OCR ist fehleranfällig | Snapshot-Modell mit Pflicht-Review; Freigabe-Workflow; manuelle Korrektur; Minimal-Statistikset als Fallback (Tore, Assists, Karten) |
| **Datenrechte** – systematische Übernahme ohne Lizenz | Hoch | Öffentliche Sichtbarkeit ≠ Nutzungsrecht; Datenbankherstellerrecht greift | Vereinbarung mit Icon League vor Launch; Quelle im Import protokollieren |
| **Bundesadler** | Mittel | Staatswappen-nahe Nutzung ist rechtlich eingeschränkt; auf Trikots über DKFV legitimiert, als App-Branding nicht | Nicht verwenden. Nur DKFV-Logo. |
| **Mehrere Spieltage zwischen Snapshots** | Mittel | Deltas nicht einem Round zuordenbar | System blockiert Auto-Zuordnung; Admin muss splitten oder Round zusammenlegen |
| **Nachträgliche Statistikkorrekturen** | Mittel | Verändern bereits veröffentlichte Rankings | Regelversion + Neuberechnung mit Changelog; Nutzer-Hinweis „Korrigiert am …" |
| **Fairness Punktesystem** | Mittel | Tore (+6) könnten dominieren; TW-Paraden 0,75 evtl. zu niedrig | Simulation mit S4-Daten vor Festlegung (Blocker F1) |
| **Passquoten-Bewertung** | Mittel | Nur sinnvoll bei zuverlässigen Passdaten; Schwellen (15 Pässe) in Kleinfeld schnell erreicht | Regel per Default **deaktiviert**, aktivierbar nach Datenprüfung |
| **Skalierung Leaderboard** | Niedrig | 5.000 Nutzer sind für Postgres trivial, wenn vorberechnet | Materialisierte Rankings je Round, Index auf (season, points desc, tiebreak) |
| **Screenshot-KI-Kosten** | Niedrig | Pro Spieltag wenige Bilder | Vision-Modell nur im Admin-Flow, nicht pro Pageview |
| **Scope Creep Phase 1** | Mittel | Briefing ist umfangreich | Harte Must-have-Liste (Abschnitt 45) als Launch-Gate |

---

## 5. Verbesserungsvorschläge zum Briefing

1. **Fantasy Round als alleiniger Deadline-Träger.** Matchday und Match bleiben reine Spielbetriebs-Entitäten. Lineups, Scores, Leaderboards hängen nur an Rounds. Verhindert Vermischung (Briefing §35) und erlaubt Doppelspieltage.
2. **Ersatzbank mit Auto-Sub (optional, konfigurierbar).** Ersatzspieler ohne Einsatz sind ohne Nachrück-Regel wertlos. Vorschlag: Bank zählt nicht, aber rückt automatisch nach, wenn ein Starter 0 Spiele im Round hat. Default für S5: **aus** (einfacher zu kommunizieren), technisch vorbereitet.
3. **Punkte pro Million als Kernmetrik** im Markt („Value") – im Briefing erwähnt, sollte in jeder Spielerliste als Spalte stehen; ist das wichtigste Entscheidungs-Signal im No-Draft-Modell.
4. **Statistik-Minimalset definieren.** Wenn der Datenanbieter ausfällt, muss das Spiel mit Tore/Assists/Gelb/Rot/Einsatz weiterlaufen. Punktesystem so versionieren, dass ein „Fallback-Regelsatz" existiert.
5. **Transferfenster explizit modellieren** (open/closed je Round) statt nur über Deadline – vereinfacht Kommunikation und Tests.
6. **Teamname-Moderation vor Veröffentlichung** – einfacher Wortfilter + Admin-Queue, da Teamnamen öffentlich im Leaderboard stehen.
7. **Pseudonymisierung:** Leaderboard zeigt Benutzername, nie E-Mail. Benutzername eindeutig, 3–20 Zeichen, änderbar 1× pro Season.
8. **Datenexport & Löschung** als Supabase Edge Function von Tag 1 (DSGVO), nicht nachrüsten.

---

## 6. Entscheidungsliste (konfigurierbare Produktparameter)

Alle Werte landen in `season_rules` (JSONB, versioniert). Nichts davon ist hart kodiert.

| # | Parameter | Vorläufig (Briefing) | Empfehlung S5 | Begründung | Später änderbar? |
|---|---|---|---|---|---|
| E1 | Fantasy-Budget | 100 Mio. | **100 Mio.** | Runde Zahl, gut kommunizierbar; Marktwerte darauf kalibrieren | Ja, pro Season |
| E2 | Kadergröße | 1 TW + 4 FS + 2 Bank = 7 | **7** (1+4+2) | Entspricht Kleinfeld 5er-Format; Bank erlaubt Reaktion auf Ausfälle | Ja, pro Season |
| E3 | Ersatzbank-Wertung | offen | **Bank zählt nicht; Auto-Sub aus**, technisch vorbereitet | Einfachste Regel für Season 1; Auto-Sub ab S6 nach Datenlage | Ja (Flag) |
| E4 | Kapitänsmultiplikator | 2x | **2x** | Standard in Fantasy; stark genug für Spannung | Ja |
| E5 | Kostenlose Transfers | 2 pro Spieltag | **2 pro Round, nicht ansparbar** | Ansparen erhöht Komplexität und Tabellen-Chaos | Ja |
| E6 | Transferstrafe | Punkte | **−4 Punkte je Zusatztransfer**, max. 3 Zusatztransfers | Spürbar, aber nicht blockierend | Ja |
| E7 | Max. Spieler pro realem Team | offen | **3 von 7** | Verhindert „Ein-Team-Kader", erzwingt Streuung | Ja |
| E8 | Punktesystem | Tabelle §18 | **Vorläufig übernehmen, Passquote-Regeln deaktiviert**, Finalisierung nach S4-Simulation | Passdaten-Zuverlässigkeit unklar; Simulation ist Blocker | Ja (Regelversion) |
| E9 | Punktgleichheit | offen | **1. Gesamtpunkte, 2. Punkte letzter Round, 3. weniger Transfers gesamt, 4. frühere Team-Erstellung** | Deterministisch, nachvollziehbar, belohnt Kontinuität | Nur vor Season-Start |
| E10 | Späteinstieg | offen | **Jederzeit möglich; Punkte zählen ab Beitritts-Round**; separate „Rookie"-Ansicht optional | Wachstum während Season nicht blockieren | Ja |
| E11 | Marktwertänderungen | konstant in S1 | **Konstant in S5**; Datenmodell mit `valid_from`/`valid_to` vorbereitet | Fairness und Einfachheit; Dynamik ab S6 | Ja |
| E12 | Automatisches Nachrücken (Spieler verlässt Team / verletzt) | offen | **Kein Auto-Nachrücken; Spieler bleibt im Kader mit 0 Punkten, Admin kann Status „unavailable" setzen → kostenloser Ersatz-Transfer** | Vermeidet Automatik-Fehler; Admin-Kontrolle | Ja |
| E13 | Deadline-Modell | offen | **Eine Deadline pro Round, z. B. 1 h vor erstem Anpfiff**, serverseitig geprüft | Einfach; Rolling Deadlines erst bei Bedarf | Ja |
| E14 | Benutzername im Leaderboard | – | **Pflicht, eindeutig, moderiert** | Datenschutz, Öffentlichkeit | – |

**Nicht umkehrbar bzw. teuer:** E9 (Tie-Break) und die Trennung Round/Matchday (Architektur). Beides sollte vor Season-Start fix sein.

---

## 7. Betriebskosten – erste Einordnung (grob, vor Launch zu detaillieren)

| Posten | 1.000 Nutzer | 5.000 Nutzer | 20.000 Nutzer |
|---|---|---|---|
| Vercel (Pro) | ~20 €/Monat | ~20–40 € | ~40–100 € |
| Supabase (Pro) | ~25 € | ~25–50 € | ~75–150 € (Compute-Upgrade) |
| Resend | 0–20 € | ~20 € | ~90 € |
| Vision-KI für Screenshot-Import | < 5 € | < 5 € | < 10 € (unabhängig von Nutzerzahl) |
| Storage (Bilder) | inkl. | inkl. | ~10 € |
| **Summe ca.** | **~50–70 €** | **~70–130 €** | **~230–360 €** |

Richtwerte auf Basis der aktuellen Listenpreise; die eigentliche Kostenschätzung folgt wie im Briefing vorgesehen vor Launch mit realen Nutzungsannahmen.

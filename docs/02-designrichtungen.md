# KLEINFELD FANTASY – Designrichtungen und Empfehlung (Schritt 3–5)

Stand: 08.10.2026 · Visuelle Vorschauen: Design-Canvas „Kleinfeld Fantasy – Designrichtungen" (6 Artboards: je Landingpage + mobiles Dashboard)

Alle Screens nutzen die bereitgestellten DKFV-Logos und Kennedyplatz-Fotos. Spieler-, Team- und Managernamen sowie Punkte sind fiktive Beispieldaten. Spielerfotos liegen nicht vor → Silhouetten-Avatare.

---

## A · Premium Sports

**Charakter:** dunkel, ruhig, typografisch. Ein einziger Akzent (Champagner-Gold), hauchdünne Linien, desaturierte Fotos. Wirkt wie ein Sportmagazin, nicht wie ein Spiel.

| Token | Wert |
|---|---|
| Ground / Surface / Card | `#0B0D0F` / `#15181C` / `#1C2025` |
| Border | `#262B30` |
| Text / Muted | `#F2F3F4` / `#9AA3A8` |
| Accent | `#E6C566` (Champagner-Gold) |
| Positive / Negative | `#4FD1A1` / `#F26D7D` |
| Display | Barlow Condensed 800, Versalien |
| UI | Manrope |
| Radius | 4–10 px |

**Stärken:** hochwertig, zeitlos, lässt Wettbewerbs-Branding (Icon League etc.) viel Raum. Sehr gute Lesbarkeit.
**Schwächen:** wenig Emotion, geringe Gamification-Wirkung, Gold ist vom DKFV-Gold entkoppelt (gedämpft).

## B · Sports Gaming

**Charakter:** laut, kontrastreich, Lime-Akzent mit Glow, angeschnittene Karten (Clip-Path), Streak-/Level-Badges, Fortschrittsbalken, Ticker. Spielerkarten mit Rarity-Gefühl.

| Token | Wert |
|---|---|
| Ground / Surface / Card | `#0B0F0E` / `#151B19` / `#1D2522` |
| Border | `#303A35` |
| Text / Muted | `#F5F7F5` / `#9CA9A2` |
| Accent / Secondary | `#C7FF3D` / `#2DD881` |
| Positive / Negative | `#36D399` / `#FF647C` |
| Display | Chakra Petch 700, Versalien |
| UI | Space Grotesk |
| Radius | 0 (Cut-Corners) / 14 px |

**Stärken:** höchste Energie, stärkste Motivation zur Rückkehr, Gamification eingebaut.
**Schwächen:** Lime/Grün ist die generische Fantasy-Farbe (Kickbase, Sorare, viele Wett-Apps) → geringe Eigenständigkeit. Keine Verbindung zur DKFV-Identität. Glow-Effekte altern schnell.

## C · Modern Football (DKFV)

**Charakter:** die DKFV-Identität konsequent übersetzt: Schwarz, Weiß, Gold, Rot. Diagonale Tricolore als Signatur-Element (Header-Linie, Streifen, Eyebrow-Marker, Rang-Hervorhebung). Kursive, schwere Condensed-Type nach Vorbild der DKFV-Wortmarke. Klar strukturiert, Verbands-Seriosität ohne Vereinswebsite-Look.

| Token | Wert |
|---|---|
| Ground / Surface / Card | `#0A0A0B` / `#141416` / `#1B1B1F` |
| Border | `#2C2C32` |
| Text / Muted | `#FFFFFF` / `#A3A3AA` |
| Accent (Primary) | `#FFD400` (Gold) |
| Secondary / Negative | `#E30613` (Rot) |
| Positive | `#35C76A` |
| Display | Saira Condensed 900 Italic, Versalien |
| UI | Saira |
| Radius | 4–6 px |
| Signatur | Tricolore-Streifen, skewX(−10…−18°) |

**Stärken:** eigenständig und sofort als „offiziell" lesbar; Gold = Sieger-Semantik passt perfekt zu Rankings; Rot liefert ohne Zusatzfarbe das Negativ-Signal; hohe Wiedererkennung über alle Wettbewerbe hinweg.
**Schwächen:** Schwarz-Rot-Gold kann „national" wirken – muss über Typografie und Dosierung sportlich statt staatlich bleiben; Icon-League-Branding (eigene Farben) braucht klaren Platz im Wettbewerbsbereich.

---

## Empfehlung

**Richtung C als Basis – mit der typografischen Ruhe von A und den Spielerkarten/Rank-Momenten von B.**

Konkret:

1. **Farbsystem von C.** Gold `#FFD400` als Primärakzent, Rot `#E30613` als Sekundär/Negativ, Schwarz-Weiß-Grundgerüst. Das ist die einzige Richtung, die das Briefing-Kriterium „DKFV-Identität hat Vorrang" erfüllt und gleichzeitig eigenständig ist. Lime (B) wäre austauschbar.
2. **Dosierung von A.** Die Tricolore nur als Signatur (Top-Linie, Eyebrow-Marker, Rang-1-Markierung), nicht flächig. Viel Schwarz, viel Weißraum, Fotos leicht entsättigt. So bleibt es Premium und nicht „Fanmeile".
3. **Spielerkarten und Rank-Momente von B.** Große Punktzahl, Kapitäns-Badge, Form-Pfeile, „Manager of the Matchday"-Inszenierung, Fortschrittsbalken zum nächsten Ziel. Ohne Glow, ohne Clip-Path-Ecken – stattdessen Gold-Top-Border und Skew-Elemente aus C.
4. **Typografie:** Saira Condensed (Display, kursiv für Headlines/Wettbewerbsnamen, aufrecht für Zahlen) + Saira (UI). Eine Familie, zwei Schnitte – konsistent und performant. Alternative, falls Saira zu technisch wirkt: Barlow Condensed + Barlow.
5. **Wettbewerbsakzente:** Jede Season bekommt `accent`, `accent_fg`, `hero_image`, `logo` als Tokens. Die Icon-League-Farbwelt ersetzt im Wettbewerbsbereich den Gold-Akzent **nur** in Hero und Wettbewerbs-Header; Rankings, CTAs, Navigation bleiben global (Gold). Damit ist §3 des Briefings („Icon-League-Farbwelt darf nie das globale Erscheinungsbild bestimmen") strukturell gesichert.

**Warum nicht A + B (dein vorläufiger Favorit)?** Die Mischung ist ohne DKFV-Bezug und farblich austauschbar. Die Hybrid-Empfehlung oben liefert genau die Premium-Ruhe von A und die Energie von B – aber in den Verbandsfarben, die dir sonst niemand nachbauen kann.

---

## Nächster Schritt nach Freigabe

- Designsystem-Tokens (Farben, Type-Scale, Spacing 4-px-Raster, Radius, Schatten, Motion-Dauern, Breakpoints 360/768/1024/1440, Wettbewerbsakzente) als `tokens.json` + Tailwind-Config.
- Die restlichen vier Screens (Mein Team, Spielermarkt, Spielerprofil, Leaderboard) in der freigegebenen Richtung, mobil und Desktop.
- Danach erst Code.

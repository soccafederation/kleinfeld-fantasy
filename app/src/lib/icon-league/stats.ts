/**
 * Icon League: Saisonwerte (kumuliert) über die öffentliche Website-Schnittstelle holen
 * und daraus die Werte eines einzelnen Spieltags berechnen (aktueller Stand minus Summe der Vorspieltage).
 */

export const ICON_LEAGUE_API = "https://api.web.theiconleague.com/website-backend";

/** Icon-League-Metrik → unser Statistik-Key */
export const METRIC_MAP: Record<string, string> = {
  spiele: "appearances",
  tor: "goals",
  assists: "assists",
  "schuesse-gesamt": "shots",
  "dribbling-erfolgreich": "dribbles_success",
  "dribblings-gesamt": "dribbles",
  "gefoult-werden": "fouls_suffered",
  "pass-angekommen": "passes_success",
  paesse: "passes",
  fehlpass: "passes_failed",
  balleroberung: "tackles_won",
  klaerung: "clearances",
  foul: "fouls",
  "gelbe-karte": "yellow",
  "rote-karte": "red",
  torwartparade: "saves",
  ballaktionen: "ball_actions",
};
export const STAT_KEYS = Object.values(METRIC_MAP);

/**
 * Werte, die die Icon League in der Saisonsumme führt, die bei uns aber in keinem Spieltag stehen
 * (Spieler wurde erst später aufgenommen). Werden zur Summe der Vorspieltage addiert, damit sie
 * nicht im nächsten Spieltag landen. Schlüssel: unser Season-Slug → Icon-League-Spieler-Slug.
 */
export const UNTRACKED_PRIOR: Record<string, Record<string, Record<string, number>>> = {
  "season-5": {
    // Michael Kobert: Spieltag 1 (vor seiner Aufnahme ab Spieltag 2)
    "michael-kobert": { appearances: 1, goals: 1, shots: 2, dribbles_success: 1, dribbles: 1, fouls_suffered: 1, passes_success: 3, passes: 4, passes_failed: 1, ball_actions: 10 },
  },
};

export type CumulativePlayer = { slug: string; name: string; team: string; stats: Record<string, number> };

/** "season-5" → "season-05" (Schreibweise der Icon League). */
export function iconSeasonSlug(ourSlug: string) {
  const m = ourSlug.match(/(\d+)$/);
  return m ? `season-${m[1].padStart(2, "0")}` : ourSlug;
}

type MetricsResponse = {
  items?: {
    squadMember: { slug: string; firstName?: string; lastName?: string };
    teamView: { slug: string };
    metrics?: { metric: string; value: number }[];
  }[];
};

/** Alle Saisonwerte aller Spieler holen (eine Abfrage je Metrik, 100 Spieler pro Seite). */
export async function fetchCumulative(seasonSlug: string): Promise<Map<string, CumulativePlayer>> {
  const out = new Map<string, CumulativePlayer>();
  await Promise.all(
    Object.entries(METRIC_MAP).map(async ([metric, key]) => {
      for (let page = 1; page < 10; page++) {
        const url = `${ICON_LEAGUE_API}/metrics?type=player&seasonSlug=${encodeURIComponent(seasonSlug)}&limit=100&sortOrder=desc&metricTypes[]=${metric}&sortBy=${metric}&page=${page}`;
        const res = await fetch(url, {
          headers: { Accept: "application/json", Referer: "https://www.theiconleague.com/", Origin: "https://www.theiconleague.com" },
          cache: "no-store",
        });
        if (!res.ok) throw new Error(`Icon League antwortet mit ${res.status} (${metric})`);
        const body = (await res.json()) as MetricsResponse;
        const items = body.items ?? [];
        for (const it of items) {
          const slug = it.squadMember.slug;
          let p = out.get(slug);
          if (!p) {
            p = { slug, name: `${it.squadMember.firstName ?? ""} ${it.squadMember.lastName ?? ""}`.trim(), team: it.teamView.slug, stats: {} };
            out.set(slug, p);
          }
          p.stats[key] = Number(it.metrics?.find((m) => m.metric === metric)?.value ?? 0);
        }
        if (items.length < 100) break;
      }
    }),
  );
  return out;
}

export type RoundDelta = { seasonPlayerId: string; slug: string; name: string; stats: Record<string, number>; clamped: string[] };

/**
 * Spieltagswerte = Saisonstand minus Summe der Vorspieltage.
 * Nur Spieler mit mindestens einem neuen Einsatz. Negative Differenzen (nachträgliche Korrekturen) → 0.
 */
export function computeRoundDeltas(
  cumulative: Map<string, CumulativePlayer>,
  ourPlayers: { seasonPlayerId: string; slug: string }[],
  prior: Map<string, Record<string, number>>,
): { deltas: RoundDelta[]; unmatched: CumulativePlayer[] } {
  const bySlug = new Map(ourPlayers.map((p) => [p.slug, p.seasonPlayerId]));
  const deltas: RoundDelta[] = [];
  const unmatched: CumulativePlayer[] = [];
  for (const c of cumulative.values()) {
    const spId = bySlug.get(c.slug);
    if (!spId) {
      if ((c.stats.appearances ?? 0) > 0) unmatched.push(c);
      continue;
    }
    const before = prior.get(spId) ?? {};
    const stats: Record<string, number> = {};
    const clamped: string[] = [];
    for (const k of STAT_KEYS) {
      let v = (c.stats[k] ?? 0) - (before[k] ?? 0);
      if (v < 0) {
        clamped.push(k);
        v = 0;
      }
      stats[k] = v;
    }
    if (stats.appearances < 1) continue;
    deltas.push({ seasonPlayerId: spId, slug: c.slug, name: c.name, stats, clamped });
  }
  deltas.sort((a, b) => a.name.localeCompare(b.name, "de"));
  unmatched.sort((a, b) => a.name.localeCompare(b.name, "de"));
  return { deltas, unmatched };
}

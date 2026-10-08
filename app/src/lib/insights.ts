import type { MyRank } from "@/lib/data/season";

/**
 * Regelbasierte Fantasy Insights (Briefing §34) – kein KI-Aufruf pro Seitenaufruf.
 * Liefert den wichtigsten Satz zuerst.
 */
export function buildInsights(input: {
  rank: MyRank;
  lastScore: { total: number; captainBonus: number; penalty: number } | null;
  history: { round: number; rank: number; points: number }[];
  captainName: string | null;
  captainPoints: number | null;
  cheapestBestValue: string | null;
}) {
  const out: string[] = [];
  const fmt = (n: number) => n.toLocaleString("de-DE", { maximumFractionDigits: 1 });
  const { rank, lastScore, history } = input;

  const bestRound = history.length ? Math.max(...history.map((h) => h.points)) : null;
  const isBestRound = !!lastScore && bestRound !== null && lastScore.total >= bestRound && history.length > 1;

  if (isBestRound && lastScore) out.push(`Beste Spieltagsleistung bisher: ${fmt(lastScore.total)} Punkte.`);
  if (rank.rank_delta && rank.rank_delta > 0) out.push(`Du hast dich um ${rank.rank_delta} Plätze verbessert.`);
  if (rank.rank_delta && rank.rank_delta < 0) out.push(`Du hast ${Math.abs(rank.rank_delta)} Plätze verloren – der nächste Spieltag zählt.`);
  if (input.captainName && input.captainPoints != null && lastScore && lastScore.total > 0) {
    const share = Math.round(((input.captainPoints * 2) / lastScore.total) * 100);
    out.push(`Dein Kapitän ${input.captainName} holte ${fmt(input.captainPoints)} Punkte – mit Bonus ${share} % deiner Spieltagspunkte.`);
  }
  if (rank.points_to_next != null && rank.points_to_next > 0) out.push(`Nur noch ${fmt(rank.points_to_next)} Punkte bis zum nächsten Rang.`);
  if (rank.rank && rank.rank > 100 && rank.points_to_top100 != null && rank.points_to_top100 > 0) out.push(`${fmt(rank.points_to_top100)} Punkte bis zu den Top 100.`);
  if (lastScore && lastScore.penalty > 0) out.push(`Dein Transferabzug kostete ${fmt(lastScore.penalty)} Punkte.`);
  if (input.cheapestBestValue) out.push(`Dein günstigster Starter ${input.cheapestBestValue} hat das beste Preis-Leistungs-Verhältnis im Team.`);
  if (!out.length) out.push(rank.rank ? "Halte dein Team aktuell – die nächste Deadline entscheidet." : "Nach dem ersten gewerteten Spieltag siehst du hier deine Insights.");

  return { primary: out[0], all: out, isBestRound };
}

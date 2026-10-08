import type { ScoringRules } from "@/lib/rules";

/**
 * TypeScript-Spiegel von score_player_stats() (0003_engine.sql).
 * Dient der Vorschau im Admin (Punktesystem bearbeiten) und den Unit-Tests.
 * Die verbindliche Berechnung läuft in Postgres.
 */
export type StatMap = Record<string, number | null | undefined>;
export type ScoreDetail = { stat: string; value: number; rule_points: number; points: number };

export function scorePlayerStats(stats: StatMap, position: "GK" | "FIELD", rules: ScoringRules): { points: number; details: ScoreDetail[] } {
  let total = 0;
  const details: ScoreDetail[] = [];
  for (const rule of rules.rules) {
    if (rule.enabled === false) continue;
    if (rule.applies_to && rule.applies_to !== position) continue;

    let value: number | null | undefined;
    if (rule.stat === "pass_accuracy") {
      const passes = stats.passes;
      const ok = stats.passes_success;
      if (passes == null || ok == null || passes === 0) continue;
      value = Math.round((ok / passes) * 1000) / 10;
    } else {
      value = stats[rule.stat];
    }
    if (value == null) continue;

    let pts: number;
    if (rule.condition) {
      const c = rule.condition;
      if (c.min_stat) {
        const m = stats[c.min_stat];
        if (m == null || (c.min !== undefined && m < c.min)) continue;
      }
      const hit = (c.gte !== undefined && value >= c.gte) || (c.lt !== undefined && value < c.lt);
      if (!hit) continue;
      pts = rule.points;
    } else if (rule.per) {
      pts = Math.floor(value / rule.per) * rule.points;
    } else {
      pts = value * rule.points;
    }
    if (pts !== 0) {
      total += pts;
      details.push({ stat: rule.stat, value, rule_points: rule.points, points: pts });
    }
  }
  return { points: Math.round(total * 100) / 100, details };
}

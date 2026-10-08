import { describe, expect, it } from "vitest";
import { scorePlayerStats } from "./scoring";
import type { ScoringRules } from "@/lib/rules";

// identisch mit scoring_rules_default() in 0003_engine.sql
const RULES: ScoringRules = {
  rules: [
    { stat: "goals", applies_to: "FIELD", points: 6 },
    { stat: "goals", applies_to: "GK", points: 8 },
    { stat: "assists", points: 4 },
    { stat: "shots", points: 0.5 },
    { stat: "dribbles_success", points: 1 },
    { stat: "fouls_suffered", points: 0.5 },
    { stat: "passes_success", points: 1, per: 10, mode: "floor" },
    { stat: "pass_accuracy", points: 2, condition: { gte: 85, min_stat: "passes", min: 15 }, enabled: false },
    { stat: "pass_accuracy", points: -2, condition: { lt: 60, min_stat: "passes", min: 15 }, enabled: false },
    { stat: "tackles_won", points: 1.5 },
    { stat: "clearances", points: 0.5 },
    { stat: "fouls", points: -0.5 },
    { stat: "yellow", points: -2 },
    { stat: "red", points: -5 },
    { stat: "saves", applies_to: "GK", points: 0.75 },
  ],
};

describe("scorePlayerStats", () => {
  it("rechnet das Briefing-Beispiel wie die SQL-Engine (Kapitän A = 21)", () => {
    const r = scorePlayerStats({ goals: 2, assists: 1, shots: 4, dribbles_success: 3, yellow: 1, passes_success: 23, passes: 27 }, "FIELD", RULES);
    expect(r.points).toBe(21);
  });
  it("Torwarttor zählt 8, Parade 0,75", () => {
    expect(scorePlayerStats({ saves: 6, goals: 1 }, "GK", RULES).points).toBe(12.5);
  });
  it("Feldspieler bekommt keine Paradenpunkte", () => {
    expect(scorePlayerStats({ saves: 6 }, "FIELD", RULES).points).toBe(0);
  });
  it("fehlende Werte sind nicht 0 und erzeugen keine Punkte", () => {
    expect(scorePlayerStats({}, "FIELD", RULES).details).toHaveLength(0);
  });
  it("Passquote nur wenn aktiviert und Mindestpässe erreicht", () => {
    const enabled: ScoringRules = { rules: RULES.rules.map((r) => (r.stat === "pass_accuracy" ? { ...r, enabled: true } : r)) };
    expect(scorePlayerStats({ passes: 20, passes_success: 18 }, "FIELD", enabled).points).toBe(1 + 2); // 10er-Pässe + Quote 90 %
    expect(scorePlayerStats({ passes: 10, passes_success: 9 }, "FIELD", enabled).points).toBe(0); // < 15 Pässe
    expect(scorePlayerStats({ passes: 20, passes_success: 10 }, "FIELD", enabled).points).toBe(1 - 2); // 50 %
  });
  it("Dezimalpunkte funktionieren", () => {
    expect(scorePlayerStats({ shots: 3, fouls: 1 }, "FIELD", RULES).points).toBe(1);
  });
});

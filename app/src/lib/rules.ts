import { z } from "zod";

/** Spiegel von season_rules_default() in 0003_engine.sql – wird für UI-Anzeige und Client-Vorprüfung genutzt. */
export const seasonRulesSchema = z.object({
  budget_m: z.number().positive().default(100),
  squad: z.object({ GK: z.number().int().min(0).default(1), FIELD: z.number().int().min(0).default(4), BENCH: z.number().int().min(0).default(2) }).default({ GK: 1, FIELD: 4, BENCH: 2 }),
  bench_counts: z.boolean().default(false),
  auto_sub: z.boolean().default(false),
  max_per_club: z.number().int().min(1).default(3),
  captain_multiplier: z.number().default(2),
  transfers: z
    .object({
      free_per_round: z.number().int().min(0).default(2),
      carry_over: z.boolean().default(false),
      penalty_points: z.number().default(4),
      max_extra: z.number().int().min(0).default(3),
    })
    .default({ free_per_round: 2, carry_over: false, penalty_points: 4, max_extra: 3 }),
  late_entry: z.enum(["allowed", "closed"]).default("allowed"),
  tiebreak: z.array(z.string()).default(["total_points", "last_round_points", "fewer_transfers", "earlier_created"]),
});
export type SeasonRules = z.infer<typeof seasonRulesSchema>;

export const DEFAULT_RULES: SeasonRules = seasonRulesSchema.parse({});

export function parseSeasonRules(input: unknown): SeasonRules {
  const res = seasonRulesSchema.safeParse(input ?? {});
  return res.success ? res.data : DEFAULT_RULES;
}

export const scoringRuleSchema = z.object({
  stat: z.string(),
  points: z.number(),
  applies_to: z.enum(["GK", "FIELD"]).optional(),
  per: z.number().positive().optional(),
  mode: z.enum(["floor"]).optional(),
  condition: z
    .object({ gte: z.number().optional(), lt: z.number().optional(), min_stat: z.string().optional(), min: z.number().optional() })
    .optional(),
  enabled: z.boolean().optional(),
});
export const scoringRulesSchema = z.object({
  rules: z.array(scoringRuleSchema),
  exclude_stats: z.array(z.string()).optional(),
});
export type ScoringRules = z.infer<typeof scoringRulesSchema>;
export type ScoringRule = z.infer<typeof scoringRuleSchema>;

export function parseScoringRules(input: unknown): ScoringRules {
  const res = scoringRulesSchema.safeParse(input);
  return res.success ? res.data : { rules: [] };
}

export const branding = z.object({
  accent: z.string().optional(),
  accent_fg: z.string().optional(),
  hero_image_url: z.string().optional(),
  logo_url: z.string().optional(),
});
export type Branding = z.infer<typeof branding>;
export function parseBranding(input: unknown): Branding {
  const r = branding.safeParse(input ?? {});
  return r.success ? r.data : {};
}

/** Lesbare Beschreibung einer Punkteregel für Spielerprofil / Regelseite */
export function describeRule(rule: ScoringRule, labels: Record<string, string>) {
  const label = labels[rule.stat] ?? rule.stat;
  const pts = rule.points > 0 ? `+${fmt(rule.points)}` : fmt(rule.points);
  const who = rule.applies_to === "GK" ? " (Torwart)" : rule.applies_to === "FIELD" ? " (Feldspieler)" : "";
  if (rule.condition) {
    const c = rule.condition;
    const cmp = c.gte !== undefined ? `≥ ${c.gte} %` : c.lt !== undefined ? `< ${c.lt} %` : "";
    const min = c.min_stat && c.min !== undefined ? ` bei mind. ${c.min} ${labels[c.min_stat] ?? c.min_stat}` : "";
    return { label: `${label} ${cmp}${min}${who}`, pts };
  }
  if (rule.per) return { label: `je ${rule.per} ${label}${who}`, pts };
  return { label: `${label}${who}`, pts };
}
function fmt(n: number) {
  return n.toLocaleString("de-DE", { maximumFractionDigits: 2 });
}

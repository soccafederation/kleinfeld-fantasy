"use client";

import { useActionState, useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label, Notice, Select } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { scorePlayerStats, type StatMap } from "@/lib/engine/scoring";
import { describeRule, type ScoringRule, type ScoringRules } from "@/lib/rules";
import { formatPoints } from "@/lib/utils";
import type { FormAction } from "@/lib/admin/result";

type Def = { key: string; label_de: string; is_derived: boolean };

type EditRule = {
  stat: string;
  points: string;
  applies_to: "" | "GK" | "FIELD";
  per: string;
  cond_type: "" | "gte" | "lt";
  cond_value: string;
  min_stat: string;
  min: string;
  enabled: boolean;
};

function toEdit(r: ScoringRule): EditRule {
  return {
    stat: r.stat,
    points: String(r.points),
    applies_to: r.applies_to ?? "",
    per: r.per ? String(r.per) : "",
    cond_type: r.condition?.gte !== undefined ? "gte" : r.condition?.lt !== undefined ? "lt" : "",
    cond_value: r.condition?.gte !== undefined ? String(r.condition.gte) : r.condition?.lt !== undefined ? String(r.condition.lt) : "",
    min_stat: r.condition?.min_stat ?? "",
    min: r.condition?.min !== undefined ? String(r.condition.min) : "",
    enabled: r.enabled !== false,
  };
}

function toRule(e: EditRule): ScoringRule | null {
  const points = Number(e.points.replace(",", "."));
  if (!e.stat || !Number.isFinite(points)) return null;
  const rule: ScoringRule = { stat: e.stat, points };
  if (e.applies_to) rule.applies_to = e.applies_to;
  const per = Number(e.per.replace(",", "."));
  if (e.per && Number.isFinite(per) && per > 0) {
    rule.per = per;
    rule.mode = "floor";
  }
  if (e.cond_type) {
    const v = Number(e.cond_value.replace(",", "."));
    if (!Number.isFinite(v)) return null;
    rule.condition = { [e.cond_type]: v };
    if (e.min_stat) {
      rule.condition.min_stat = e.min_stat;
      const m = Number(e.min.replace(",", "."));
      if (Number.isFinite(m)) rule.condition.min = m;
    }
  }
  if (!e.enabled) rule.enabled = false;
  return rule;
}

const SAMPLE_KEYS = ["goals", "assists", "shots", "dribbles_success", "fouls_suffered", "passes", "passes_success", "tackles_won", "clearances", "fouls", "yellow", "red", "saves"];

export function ScoringEditor({ seasonId, base, baseVersion, defs, createAction }: { seasonId: string; base: ScoringRules; baseVersion: number; defs: Def[]; createAction: FormAction }) {
  const [rules, setRules] = useState<EditRule[]>(base.rules.map(toEdit));
  const [name, setName] = useState("");
  const [state, action, pending] = useActionState(createAction, undefined);
  const [position, setPosition] = useState<"GK" | "FIELD">("FIELD");
  const [sample, setSample] = useState<Record<string, string>>({ goals: "1", assists: "1", shots: "3", passes: "20", passes_success: "17", tackles_won: "2", fouls: "1" });

  const labels = useMemo(() => Object.fromEntries(defs.map((d) => [d.key, d.label_de])), [defs]);
  const compiled = useMemo(() => {
    const out: ScoringRule[] = [];
    let invalid = 0;
    for (const e of rules) {
      const r = toRule(e);
      if (r) out.push(r);
      else invalid++;
    }
    return { rules: { rules: out, exclude_stats: base.exclude_stats } as ScoringRules, invalid };
  }, [rules, base.exclude_stats]);

  const preview = useMemo(() => {
    const stats: StatMap = {};
    for (const [k, v] of Object.entries(sample)) {
      const n = Number(v.replace(",", "."));
      if (v.trim() !== "" && Number.isFinite(n)) stats[k] = n;
    }
    return scorePlayerStats(stats, position, compiled.rules);
  }, [sample, position, compiled.rules]);

  const update = (i: number, patch: Partial<EditRule>) => setRules((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const remove = (i: number) => setRules((rs) => rs.filter((_, j) => j !== i));
  const add = () => setRules((rs) => [...rs, { stat: defs[0]?.key ?? "goals", points: "1", applies_to: "", per: "", cond_type: "", cond_value: "", min_stat: "", min: "", enabled: true }]);

  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
      <Card>
        <CardHeader>
          <CardTitle>Neue Version (Basis: v{baseVersion})</CardTitle>
          <Button type="button" variant="secondary" size="sm" onClick={add}>
            <Plus /> Regel
          </Button>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="text-left text-[11px] uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-1 py-2">An</th>
                  <th className="px-1 py-2">Statistik</th>
                  <th className="px-1 py-2">Punkte</th>
                  <th className="px-1 py-2">Gilt für</th>
                  <th className="px-1 py-2">je</th>
                  <th className="px-1 py-2">Bedingung</th>
                  <th className="px-1 py-2">Mindestens</th>
                  <th className="px-1 py-2" />
                </tr>
              </thead>
              <tbody>
                {rules.map((r, i) => (
                  <tr key={i} className={r.enabled ? "border-t border-border" : "border-t border-border opacity-50"}>
                    <td className="px-1 py-1">
                      <input type="checkbox" checked={r.enabled} onChange={(e) => update(i, { enabled: e.target.checked })} aria-label="Regel aktiv" className="h-5 w-5 accent-[var(--kf-gold)]" />
                    </td>
                    <td className="px-1 py-1">
                      <Select value={r.stat} onChange={(e) => update(i, { stat: e.target.value })} className="h-9 min-w-[150px] text-sm" aria-label="Statistik">
                        {defs.map((d) => (
                          <option key={d.key} value={d.key}>
                            {d.label_de}
                          </option>
                        ))}
                      </Select>
                    </td>
                    <td className="px-1 py-1">
                      <Input value={r.points} onChange={(e) => update(i, { points: e.target.value })} inputMode="decimal" className="num h-9 w-20 text-sm" aria-label="Punkte" />
                    </td>
                    <td className="px-1 py-1">
                      <Select value={r.applies_to} onChange={(e) => update(i, { applies_to: e.target.value as EditRule["applies_to"] })} className="h-9 w-24 text-sm" aria-label="Gilt für">
                        <option value="">alle</option>
                        <option value="GK">GK</option>
                        <option value="FIELD">Feld</option>
                      </Select>
                    </td>
                    <td className="px-1 py-1">
                      <Input value={r.per} onChange={(e) => update(i, { per: e.target.value })} inputMode="numeric" placeholder="–" className="num h-9 w-16 text-sm" aria-label="je x Einheiten" />
                    </td>
                    <td className="px-1 py-1">
                      <div className="flex gap-1">
                        <Select value={r.cond_type} onChange={(e) => update(i, { cond_type: e.target.value as EditRule["cond_type"] })} className="h-9 w-16 text-sm" aria-label="Bedingung">
                          <option value="">–</option>
                          <option value="gte">≥</option>
                          <option value="lt">&lt;</option>
                        </Select>
                        {r.cond_type && <Input value={r.cond_value} onChange={(e) => update(i, { cond_value: e.target.value })} inputMode="decimal" className="num h-9 w-16 text-sm" aria-label="Schwellwert" />}
                      </div>
                    </td>
                    <td className="px-1 py-1">
                      {r.cond_type ? (
                        <div className="flex gap-1">
                          <Select value={r.min_stat} onChange={(e) => update(i, { min_stat: e.target.value })} className="h-9 w-28 text-sm" aria-label="Mindest-Statistik">
                            <option value="">–</option>
                            {defs
                              .filter((d) => !d.is_derived)
                              .map((d) => (
                                <option key={d.key} value={d.key}>
                                  {d.label_de}
                                </option>
                              ))}
                          </Select>
                          {r.min_stat && <Input value={r.min} onChange={(e) => update(i, { min: e.target.value })} inputMode="numeric" className="num h-9 w-14 text-sm" aria-label="Mindestwert" />}
                        </div>
                      ) : (
                        <span className="text-muted-2">–</span>
                      )}
                    </td>
                    <td className="px-1 py-1 text-right">
                      <Button type="button" variant="ghost" size="icon" onClick={() => remove(i)} aria-label="Regel entfernen" className="h-9 w-9">
                        <Trash2 />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
            {compiled.rules.rules.map((r, i) => {
              const d = describeRule(r, labels);
              return (
                <li key={i} className={r.enabled === false ? "line-through" : ""}>
                  {d.label}: <span className="num text-text-2">{d.pts}</span>
                </li>
              );
            })}
          </ul>

          <form action={action} className="mt-4 flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-end">
            <input type="hidden" name="season_id" value={seasonId} />
            <input type="hidden" name="rules" value={JSON.stringify(compiled.rules)} />
            <div className="flex-1">
              <Label htmlFor="version_name">Name der Version</Label>
              <Input id="version_name" name="name" value={name} onChange={(e) => setName(e.target.value)} placeholder={`Version ${baseVersion + 1}`} />
            </div>
            <Button type="submit" disabled={pending || compiled.invalid > 0 || compiled.rules.rules.length === 0}>
              {pending ? "Speichert…" : "Als neue Version speichern"}
            </Button>
          </form>
          {compiled.invalid > 0 && <p className="mt-2 text-xs text-red">{compiled.invalid} Regel(n) unvollständig – Punkte und Schwellwerte müssen Zahlen sein.</p>}
          {state && (state.ok ? <div className="mt-3"><Notice kind="success">{state.message}</Notice></div> : <div className="mt-3"><Notice kind="error">{state.error}</Notice></div>)}
        </CardContent>
      </Card>

      <Card accent="gold">
        <CardHeader>
          <CardTitle>Vorschau</CardTitle>
          <Select value={position} onChange={(e) => setPosition(e.target.value as "GK" | "FIELD")} className="h-9 w-28 text-sm" aria-label="Position">
            <option value="FIELD">Feldspieler</option>
            <option value="GK">Torwart</option>
          </Select>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2">
            {SAMPLE_KEYS.filter((k) => labels[k]).map((k) => (
              <div key={k}>
                <Label htmlFor={`s_${k}`} className="truncate text-[10px]">
                  {labels[k]}
                </Label>
                <Input id={`s_${k}`} value={sample[k] ?? ""} onChange={(e) => setSample((s) => ({ ...s, [k]: e.target.value }))} inputMode="decimal" className="num h-9 text-sm" />
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-baseline justify-between border-t border-border pt-3">
            <span className="eyebrow">Punkte (Entwurf)</span>
            <span className="num text-3xl text-gold">{formatPoints(preview.points)}</span>
          </div>
          <ul className="mt-2 space-y-0.5 text-xs text-muted">
            {preview.details.map((d, i) => (
              <li key={i} className="flex justify-between">
                <span>
                  {labels[d.stat] ?? d.stat} ({formatPoints(d.value)})
                </span>
                <span className="num text-text-2">{d.points > 0 ? "+" : ""}{formatPoints(d.points)}</span>
              </li>
            ))}
            {preview.details.length === 0 && <li>Keine Regel greift.</li>}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

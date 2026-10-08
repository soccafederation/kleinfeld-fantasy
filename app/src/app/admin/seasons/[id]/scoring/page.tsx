import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { listRounds, listStatDefinitions } from "@/lib/admin/queries";
import { parseScoringRules, describeRule } from "@/lib/rules";
import { formatDateTime } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Notice } from "@/components/ui/input";
import { ActionForm } from "@/components/admin/action-form";
import { Empty } from "@/components/admin/admin-shell";
import { ScoringEditor } from "@/components/admin/scoring-editor";
import { activateScoringVersionAction, createScoringVersionAction, recomputeCompletedRoundsAction } from "../../../scoring-actions";
import type { Tables } from "@/lib/database.types";

type VersionRow = Tables<"scoring_rule_versions"> & { author: { username: string } | null };

export default async function SeasonScoringPage({ params }: { params: Promise<{ id: string }> }) {
  await requireStaff();
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: versionsRaw }, defs, rounds] = await Promise.all([
    supabase.from("scoring_rule_versions").select("*, author:profiles(username)").eq("season_id", id).order("version", { ascending: false }),
    listStatDefinitions(),
    listRounds(id),
  ]);
  const versions = (versionsRaw ?? []) as unknown as VersionRow[];
  const active = versions.find((v) => v.is_active) ?? versions[0];
  const completed = rounds.filter((r) => r.status === "completed").length;
  const labels = Object.fromEntries(defs.map((d) => [d.key, d.label_de]));

  return (
    <div className="flex flex-col gap-5">
      <Card>
        <CardHeader>
          <CardTitle>Versionen</CardTitle>
          {!versions.some((v) => v.is_active) && <Badge variant="red">keine aktiv</Badge>}
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {versions.length === 0 && <Empty>Noch keine Version. Beim Anlegen einer Season per Formular wird v1 automatisch erzeugt.</Empty>}
          {versions.map((v) => {
            const rules = parseScoringRules(v.rules);
            return (
              <details key={v.id} className="rounded-sm border border-border" open={v.is_active}>
                <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-2 px-3 py-2.5">
                  <span className="flex items-center gap-2">
                    <span className="num text-gold">v{v.version}</span>
                    <span className="font-semibold">{v.name ?? `Version ${v.version}`}</span>
                    {v.is_active ? <Badge variant="positive">aktiv</Badge> : <Badge variant="outline">inaktiv</Badge>}
                  </span>
                  <span className="text-xs text-muted">
                    {formatDateTime(v.created_at)}
                    {v.author?.username ? ` · ${v.author.username}` : ""} · {rules.rules.length} Regeln
                  </span>
                </summary>
                <div className="border-t border-border px-3 py-3">
                  <ul className="grid gap-x-4 gap-y-1 text-sm sm:grid-cols-2">
                    {rules.rules.map((r, i) => {
                      const d = describeRule(r, labels);
                      return (
                        <li key={i} className={r.enabled === false ? "flex justify-between text-muted line-through" : "flex justify-between"}>
                          <span>{d.label}</span>
                          <span className="num">{d.pts}</span>
                        </li>
                      );
                    })}
                  </ul>
                  {!v.is_active && (
                    <div className="mt-3">
                      <ActionForm action={activateScoringVersionAction} submitLabel={`v${v.version} aktivieren`} variant="secondary" size="sm" inline>
                        <input type="hidden" name="season_id" value={id} />
                        <input type="hidden" name="version_id" value={v.id} />
                      </ActionForm>
                    </div>
                  )}
                </div>
              </details>
            );
          })}
        </CardContent>
      </Card>

      {active && <ScoringEditor seasonId={id} base={parseScoringRules(active.rules)} baseVersion={active.version} defs={defs.map((d) => ({ key: d.key, label_de: d.label_de, is_derived: d.is_derived }))} createAction={createScoringVersionAction} />}

      <Card accent="red">
        <CardHeader>
          <CardTitle>Nach Aktivierung</CardTitle>
          <span className="text-xs text-muted">{completed} abgeschlossene Spieltage</span>
        </CardHeader>
        <CardContent>
          <Notice>Nach Aktivierung müssen abgeschlossene Spieltage neu berechnet werden – sonst gelten für alte Spieltage weiter die alten Punkte.</Notice>
          <div className="mt-3">
            <ActionForm
              action={recomputeCompletedRoundsAction}
              submitLabel={`${completed} Spieltage neu berechnen`}
              pendingLabel="Berechne nacheinander…"
              variant="secondary"
              size="sm"
              confirm="Alle abgeschlossenen Spieltage mit dem aktiven Punktesystem neu berechnen und Gesamtrangliste neu aufbauen."
            >
              <input type="hidden" name="season_id" value={id} />
            </ActionForm>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

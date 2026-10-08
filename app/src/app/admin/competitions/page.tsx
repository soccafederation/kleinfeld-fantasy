import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { ActionForm } from "@/components/admin/action-form";
import { Empty, PageHeader } from "@/components/admin/admin-shell";
import { saveCompetitionAction } from "../actions";
import type { Tables } from "@/lib/database.types";

function CompetitionFields({ c }: { c?: Tables<"competitions"> }) {
  return (
    <>
      {c && <input type="hidden" name="id" value={c.id} />}
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor={`name-${c?.id ?? "new"}`}>Name</Label>
          <Input id={`name-${c?.id ?? "new"}`} name="name" defaultValue={c?.name} required minLength={2} />
        </div>
        <div>
          <Label htmlFor={`slug-${c?.id ?? "new"}`}>Slug</Label>
          <Input id={`slug-${c?.id ?? "new"}`} name="slug" defaultValue={c?.slug} placeholder="z. B. icon-league" />
        </div>
        <div>
          <Label htmlFor={`short-${c?.id ?? "new"}`}>Kurzname</Label>
          <Input id={`short-${c?.id ?? "new"}`} name="short_name" defaultValue={c?.short_name ?? ""} />
        </div>
        <div>
          <Label htmlFor={`org-${c?.id ?? "new"}`}>Veranstalter</Label>
          <Input id={`org-${c?.id ?? "new"}`} name="organizer" defaultValue={c?.organizer ?? ""} />
        </div>
        <div>
          <Label htmlFor={`sort-${c?.id ?? "new"}`}>Sortierung</Label>
          <Input id={`sort-${c?.id ?? "new"}`} name="sort_order" type="number" defaultValue={c?.sort_order ?? 0} />
        </div>
        <label className="flex min-h-11 items-end gap-2 pb-2 text-sm">
          <input type="checkbox" name="is_active" defaultChecked={c?.is_active ?? true} className="h-5 w-5 accent-[var(--kf-gold)]" />
          Aktiv
        </label>
      </div>
    </>
  );
}

export default async function CompetitionsPage() {
  await requireStaff();
  const supabase = await createClient();
  const { data: competitions } = await supabase.from("competitions").select("*").order("sort_order").order("name");
  const { data: seasonCounts } = await supabase.from("seasons").select("competition_id");
  const counts = new Map<string, number>();
  for (const s of seasonCounts ?? []) counts.set(s.competition_id, (counts.get(s.competition_id) ?? 0) + 1);

  return (
    <>
      <PageHeader title="Wettbewerbe" eyebrow="Stammdaten">
        Icon League, Socca Champions League usw. Jede Season hängt an einem Wettbewerb.
      </PageHeader>

      <Card accent="gold">
        <CardHeader>
          <CardTitle>Neuer Wettbewerb</CardTitle>
        </CardHeader>
        <CardContent>
          <ActionForm action={saveCompetitionAction} submitLabel="Anlegen" resetOnSuccess>
            <CompetitionFields />
          </ActionForm>
        </CardContent>
      </Card>

      <div className="mt-6 flex flex-col gap-3">
        {(competitions ?? []).length === 0 && <Empty>Noch keine Wettbewerbe.</Empty>}
        {(competitions ?? []).map((c) => (
          <Card key={c.id}>
            <CardHeader>
              <div className="flex items-center gap-2">
                <CardTitle className="text-text">{c.name}</CardTitle>
                <Badge variant={c.is_active ? "positive" : "muted"}>{c.is_active ? "aktiv" : "inaktiv"}</Badge>
              </div>
              <span className="text-xs text-muted">{counts.get(c.id) ?? 0} Seasons</span>
            </CardHeader>
            <CardContent>
              <details>
                <summary className="cursor-pointer text-sm text-gold">Bearbeiten</summary>
                <div className="mt-3">
                  <ActionForm action={saveCompetitionAction} submitLabel="Speichern" variant="secondary" size="sm">
                    <CompetitionFields c={c} />
                  </ActionForm>
                </div>
              </details>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}

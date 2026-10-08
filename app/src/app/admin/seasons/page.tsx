import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { listAdminSeasons } from "@/lib/admin/queries";
import { formatDate } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label, Select, Notice } from "@/components/ui/input";
import { ActionForm } from "@/components/admin/action-form";
import { Empty, PageHeader } from "@/components/admin/admin-shell";
import { SeasonStatusBadge } from "@/components/admin/status-badges";
import { createSeasonAction } from "../actions";

export default async function SeasonsPage() {
  await requireStaff();
  const supabase = await createClient();
  const [seasons, { data: competitions }] = await Promise.all([listAdminSeasons(), supabase.from("competitions").select("id, name").order("sort_order").order("name")]);

  return (
    <>
      <PageHeader title="Seasons" eyebrow="Spielbetrieb">
        Eine Season = ein Wettbewerb in einem Zeitraum, mit eigenen Regeln, Spieltagen und Punktesystem.
      </PageHeader>

      <Card accent="gold">
        <CardHeader>
          <CardTitle>Neue Season</CardTitle>
        </CardHeader>
        <CardContent>
          {(competitions ?? []).length === 0 ? (
            <Notice>
              Zuerst einen{" "}
              <Link href="/admin/competitions" className="text-gold">
                Wettbewerb anlegen
              </Link>
              .
            </Notice>
          ) : (
            <ActionForm action={createSeasonAction} submitLabel="Season anlegen" pendingLabel="Wird angelegt…">
              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <Label htmlFor="competition_id">Wettbewerb</Label>
                  <Select id="competition_id" name="competition_id" required defaultValue="">
                    <option value="" disabled>
                      Wählen…
                    </option>
                    {(competitions ?? []).map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </Select>
                </div>
                <div>
                  <Label htmlFor="season_name">Name</Label>
                  <Input id="season_name" name="name" required minLength={2} placeholder="z. B. Season 5" />
                </div>
                <div>
                  <Label htmlFor="season_slug">Slug</Label>
                  <Input id="season_slug" name="slug" placeholder="z. B. s5" />
                </div>
              </div>
              <p className="text-xs text-muted">Regeln und Punktesystem starten mit den Standardwerten (Briefing) und lassen sich danach anpassen.</p>
            </ActionForm>
          )}
        </CardContent>
      </Card>

      <div className="mt-6 flex flex-col gap-2">
        {seasons.length === 0 && <Empty>Noch keine Season angelegt.</Empty>}
        {seasons.map((s) => (
          <Link key={s.id} href={`/admin/seasons/${s.id}`} className="flex items-center justify-between gap-3 rounded border border-border bg-card px-4 py-3 hover:bg-card-hover">
            <div className="min-w-0">
              <div className="truncate font-semibold">{s.name}</div>
              <div className="truncate text-xs text-muted">
                {s.competition?.name ?? "–"} · {s.slug}
                {s.starts_at ? ` · ${formatDate(s.starts_at)}${s.ends_at ? ` – ${formatDate(s.ends_at)}` : ""}` : ""}
              </div>
            </div>
            <SeasonStatusBadge status={s.status} />
          </Link>
        ))}
      </div>
    </>
  );
}

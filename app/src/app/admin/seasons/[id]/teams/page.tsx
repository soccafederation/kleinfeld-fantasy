import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getAdminSeason, listSeasonTeams } from "@/lib/admin/queries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label, Select } from "@/components/ui/input";
import { ActionForm } from "@/components/admin/action-form";
import { ColorField } from "@/components/admin/color-field";
import { Empty } from "@/components/admin/admin-shell";
import { ClubBadge } from "@/components/admin/club-badge";
import { createSeasonTeamAction, removeSeasonTeamAction, updateClubAction } from "../../../actions";

export default async function SeasonTeamsPage({ params }: { params: Promise<{ id: string }> }) {
  await requireStaff();
  const { id } = await params;
  const supabase = await createClient();
  const [season, teams, { data: clubs }, { data: players }] = await Promise.all([
    getAdminSeason(id),
    listSeasonTeams(id),
    supabase.from("clubs").select("id, name, short_name").order("name"),
    supabase.from("season_players").select("season_team_id").eq("season_id", id),
  ]);
  const counts = new Map<string, number>();
  for (const p of players ?? []) counts.set(p.season_team_id, (counts.get(p.season_team_id) ?? 0) + 1);
  const inSeason = new Set(teams.map((t) => t.club_id));
  const availableClubs = (clubs ?? []).filter((c) => !inSeason.has(c.id));

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_380px]">
      <div className="order-2 lg:order-1">
        <div className="eyebrow mb-2">{teams.length} Teams in {season.name}</div>
        {teams.length === 0 && <Empty>Noch keine Teams. Lege rechts ein neues an oder übernimm einen bestehenden Club.</Empty>}
        <div className="flex flex-col gap-2">
          {teams.map((t) => (
            <Card key={t.id}>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <ClubBadge name={t.club?.name ?? "?"} short={t.club?.short_name ?? "??"} color={t.club?.primary_color} logoUrl={t.club?.logo_url} />
                    <div className="min-w-0">
                      <div className="truncate font-semibold">{t.display_name ?? t.club?.name}</div>
                      <div className="text-xs text-muted">
                        {t.club?.short_name} · {counts.get(t.id) ?? 0} Spieler
                      </div>
                    </div>
                  </div>
                </div>
                <details className="mt-3">
                  <summary className="cursor-pointer text-sm text-gold">Bearbeiten</summary>
                  <div className="mt-3 flex flex-col gap-4">
                    <ActionForm action={updateClubAction} submitLabel="Speichern" variant="secondary" size="sm">
                      <input type="hidden" name="club_id" value={t.club_id} />
                      <input type="hidden" name="season_id" value={id} />
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                          <Label htmlFor={`name-${t.id}`}>Name</Label>
                          <Input id={`name-${t.id}`} name="name" defaultValue={t.club?.name} required />
                        </div>
                        <div>
                          <Label htmlFor={`short-${t.id}`}>Kürzel (2–4)</Label>
                          <Input id={`short-${t.id}`} name="short_name" defaultValue={t.club?.short_name} minLength={2} maxLength={4} required className="uppercase" />
                        </div>
                        <div>
                          <Label htmlFor={`color-${t.id}`}>Farbe</Label>
                          <ColorField id={`color-${t.id}`} name="primary_color" defaultValue={t.club?.primary_color ?? ""} placeholder="#e30613" />
                        </div>
                        <div>
                          <Label htmlFor={`logo-${t.id}`}>Logo</Label>
                          <Input id={`logo-${t.id}`} name="logo" type="file" accept="image/*" className="py-2 text-sm file:mr-3 file:rounded-sm file:border-0 file:bg-surface file:px-2 file:text-text-2" />
                        </div>
                      </div>
                    </ActionForm>
                    <ActionForm action={removeSeasonTeamAction} submitLabel="Aus Season entfernen" variant="danger" size="sm" inline>
                      <input type="hidden" name="season_team_id" value={t.id} />
                      <input type="hidden" name="season_id" value={id} />
                    </ActionForm>
                  </div>
                </details>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <div className="order-1 flex flex-col gap-4 lg:order-2">
        <Card accent="gold">
          <CardHeader>
            <CardTitle>Neues Team anlegen</CardTitle>
          </CardHeader>
          <CardContent>
            <ActionForm action={createSeasonTeamAction} submitLabel="Anlegen & hinzufügen" resetOnSuccess>
              <input type="hidden" name="season_id" value={id} />
              <div>
                <Label htmlFor="new_name">Name</Label>
                <Input id="new_name" name="name" required minLength={2} placeholder="z. B. FC Bavaria Berlin" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="new_short">Kürzel (2–4)</Label>
                  <Input id="new_short" name="short_name" required minLength={2} maxLength={4} className="uppercase" placeholder="FCB" />
                </div>
                <div>
                  <Label htmlFor="new_color">Farbe</Label>
                  <ColorField id="new_color" name="primary_color" placeholder="#e30613" />
                </div>
              </div>
              <div>
                <Label htmlFor="new_logo">Logo (PNG/SVG, max. 5 MB)</Label>
                <Input id="new_logo" name="logo" type="file" accept="image/*" className="py-2 text-sm file:mr-3 file:rounded-sm file:border-0 file:bg-surface file:px-2 file:text-text-2" />
              </div>
            </ActionForm>
          </CardContent>
        </Card>

        {availableClubs.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Bestehenden Club übernehmen</CardTitle>
            </CardHeader>
            <CardContent>
              <ActionForm action={createSeasonTeamAction} submitLabel="Hinzufügen" variant="secondary" resetOnSuccess>
                <input type="hidden" name="season_id" value={id} />
                <div>
                  <Label htmlFor="club_id">Club</Label>
                  <Select id="club_id" name="club_id" required defaultValue="">
                    <option value="" disabled>
                      Wählen…
                    </option>
                    {availableClubs.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.short_name})
                      </option>
                    ))}
                  </Select>
                </div>
                <div>
                  <Label htmlFor="display_name">Anzeigename in dieser Season (optional)</Label>
                  <Input id="display_name" name="display_name" />
                </div>
              </ActionForm>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

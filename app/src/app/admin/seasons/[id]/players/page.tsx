/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { listSeasonPlayers, listSeasonTeams, type SeasonPlayerRow } from "@/lib/admin/queries";
import { normalizeName } from "@/lib/admin/csv";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ActionForm } from "@/components/admin/action-form";
import { Empty } from "@/components/admin/admin-shell";
import { ClubBadge } from "@/components/admin/club-badge";
import { PlayerFields } from "@/components/admin/player-form";
import { PlayerCsvImport } from "@/components/admin/player-csv-import";
import { PlayerStatusBadge } from "@/components/admin/status-badges";
import { bulkMarketValuesAction, confirmPlayerCsvAction, previewPlayerCsvAction, savePlayerAction } from "../../../actions";

type Search = { q?: string; team?: string; pos?: string; edit?: string };

export default async function SeasonPlayersPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Search> }) {
  await requireStaff();
  const { id } = await params;
  const sp = await searchParams;
  const [players, teams] = await Promise.all([listSeasonPlayers(id), listSeasonTeams(id)]);

  const q = normalizeName(sp.q ?? "");
  const filtered = players.filter((p) => {
    if (sp.team && p.season_team_id !== sp.team) return false;
    if (sp.pos && p.position !== sp.pos) return false;
    if (q) {
      const hay = normalizeName(`${p.player?.display_name ?? ""} ${p.player?.first_name ?? ""} ${p.player?.last_name ?? ""} ${p.team?.club?.short_name ?? ""}`);
      if (!hay.includes(q)) return false;
    }
    return true;
  });
  const gk = players.filter((p) => p.position === "GK").length;
  const editing = sp.edit ? players.find((p) => p.id === sp.edit) : undefined;
  const qs = new URLSearchParams();
  if (sp.q) qs.set("q", sp.q);
  if (sp.team) qs.set("team", sp.team);
  if (sp.pos) qs.set("pos", sp.pos);
  const editHref = (pid: string) => `?${new URLSearchParams([...qs.entries(), ["edit", pid]]).toString()}`;
  const listHref = qs.size ? `?${qs.toString()}` : `/admin/seasons/${id}/players`;

  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-4 lg:grid-cols-2">
        <Card accent="gold">
          <CardHeader>
            <CardTitle>Spieler anlegen</CardTitle>
          </CardHeader>
          <CardContent>
            {teams.length === 0 ? (
              <Empty>Zuerst Teams anlegen.</Empty>
            ) : (
              <ActionForm action={savePlayerAction} submitLabel="Anlegen" resetOnSuccess>
                <PlayerFields seasonId={id} teams={teams} />
              </ActionForm>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>CSV-Import</CardTitle>
          </CardHeader>
          <CardContent>
            <PlayerCsvImport seasonId={id} previewAction={previewPlayerCsvAction} confirmAction={confirmPlayerCsvAction} />
          </CardContent>
        </Card>
      </div>

      {editing && (
        <Card accent="gold" id="edit">
          <CardHeader>
            <CardTitle>Bearbeiten: {editing.player?.display_name}</CardTitle>
            <Button asChild variant="link" size="sm">
              <Link href={listHref}>Schließen</Link>
            </Button>
          </CardHeader>
          <CardContent>
            <ActionForm action={savePlayerAction} submitLabel="Speichern" variant="secondary" size="sm">
              <PlayerFields seasonId={id} teams={teams} row={editing} />
            </ActionForm>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex-col items-stretch gap-3 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2">
            <CardTitle>
              {filtered.length} / {players.length} Spieler
            </CardTitle>
            <Badge variant="outline">{gk} GK</Badge>
            <Badge variant="outline">{players.length - gk} Feld</Badge>
          </div>
          <form className="grid grid-cols-2 gap-2 sm:flex sm:items-end" method="get">
            <div className="col-span-2 sm:w-48">
              <Label htmlFor="q" className="sr-only">
                Suche
              </Label>
              <Input id="q" name="q" placeholder="Suche…" defaultValue={sp.q ?? ""} className="h-9 text-sm" />
            </div>
            <Select name="team" defaultValue={sp.team ?? ""} className="h-9 text-sm" aria-label="Team filtern">
              <option value="">Alle Teams</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.club?.short_name}
                </option>
              ))}
            </Select>
            <Select name="pos" defaultValue={sp.pos ?? ""} className="h-9 text-sm" aria-label="Position filtern">
              <option value="">Alle Positionen</option>
              <option value="GK">Torwart</option>
              <option value="FIELD">Feld</option>
            </Select>
            <Button type="submit" variant="secondary" size="sm" className="col-span-2 sm:col-span-1">
              Filtern
            </Button>
          </form>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <Empty>Keine Spieler gefunden.</Empty>
          ) : (
            <ActionForm action={bulkMarketValuesAction} submitLabel="Marktwerte speichern" variant="secondary" size="sm" buttonClassName="self-start">
              <input type="hidden" name="season_id" value={id} />
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-sm">
                  <thead className="text-left text-xs uppercase tracking-wide text-muted">
                    <tr>
                      <th className="px-2 py-2">Spieler</th>
                      <th className="px-2 py-2">Team</th>
                      <th className="px-2 py-2">Pos</th>
                      <th className="px-2 py-2 text-right">Nr.</th>
                      <th className="px-2 py-2">Status</th>
                      <th className="px-2 py-2 text-right">Marktwert (Mio.)</th>
                      <th className="px-2 py-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((p) => (
                      <PlayerRowView key={p.id} p={p} editHref={editHref(p.id)} />
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-muted">Marktwerte inline ändern und einmal speichern. Jede Änderung landet in der Werthistorie.</p>
            </ActionForm>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function PlayerRowView({ p, editHref }: { p: SeasonPlayerRow; editHref: string }) {
  const mv = Number(p.market_value_m);
  return (
      <tr className="border-t border-border align-middle">
        <td className="px-2 py-1.5">
          <div className="flex items-center gap-2">
            {p.player?.image_url ? (
              <img src={p.player.image_url} alt="" className="h-8 w-8 rounded-sm object-cover" />
            ) : (
              <span className="num flex h-8 w-8 items-center justify-center rounded-sm bg-surface text-[10px] text-muted">{p.shirt_number ?? "–"}</span>
            )}
            <div className="min-w-0">
              <div className="truncate font-semibold">{p.player?.display_name}</div>
              <div className="truncate text-xs text-muted">
                {p.player?.first_name} {p.player?.last_name}
              </div>
            </div>
          </div>
        </td>
        <td className="px-2 py-1.5">
          <div className="flex items-center gap-2">
            <ClubBadge size="sm" name={p.team?.club?.name ?? ""} short={p.team?.club?.short_name ?? "?"} color={p.team?.club?.primary_color} logoUrl={p.team?.club?.logo_url} />
            <span className="hidden text-xs text-muted lg:inline">{p.team?.club?.short_name}</span>
          </div>
        </td>
        <td className="px-2 py-1.5">
          <Badge variant={p.position === "GK" ? "gold" : "outline"}>{p.position}</Badge>
        </td>
        <td className="num px-2 py-1.5 text-right">{p.shirt_number ?? "–"}</td>
        <td className="px-2 py-1.5">
          <PlayerStatusBadge status={p.status} />
        </td>
        <td className="px-2 py-1.5 text-right">
          <input type="hidden" name={`old_${p.id}`} value={mv} />
          <Input name={`mv_${p.id}`} type="number" inputMode="decimal" step="0.5" min={0} defaultValue={mv} aria-label={`Marktwert ${p.player?.display_name}`} className="num ml-auto h-9 w-24 text-right text-sm" />
        </td>
        <td className="px-2 py-1.5 text-right">
          <Link href={`${editHref}#edit`} className="inline-flex h-9 items-center text-xs text-gold hover:underline">
            Bearbeiten
          </Link>
        </td>
      </tr>
  );
}

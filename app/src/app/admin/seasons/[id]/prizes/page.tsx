/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { listRounds } from "@/lib/admin/queries";
import { formatDateTime } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { ActionForm } from "@/components/admin/action-form";
import { Empty } from "@/components/admin/admin-shell";
import { deletePrizeAction, determineWinnersAction, notifyWinnerAction, removeWinnerAction, savePrizeAction } from "../../../prize-actions";
import type { Tables } from "@/lib/database.types";

type Round = Tables<"fantasy_rounds">;
type Winner = Tables<"prize_winners"> & { team: (Pick<Tables<"fantasy_teams">, "id" | "name"> & { profile: { username: string } | null }) | null };

function PrizeFields({ seasonId, rounds, prize }: { seasonId: string; rounds: Round[]; prize?: Tables<"prizes"> }) {
  const k = prize?.id ?? "new";
  return (
    <>
      <input type="hidden" name="season_id" value={seasonId} />
      {prize && <input type="hidden" name="id" value={prize.id} />}
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <Label htmlFor={`title-${k}`}>Titel</Label>
          <Input id={`title-${k}`} name="title" defaultValue={prize?.title} required minLength={2} placeholder="z. B. Signiertes Trikot" />
        </div>
        <div className="col-span-2">
          <Label htmlFor={`desc-${k}`}>Beschreibung</Label>
          <Textarea id={`desc-${k}`} name="description" defaultValue={prize?.description ?? ""} className="min-h-16" />
        </div>
        <div className="col-span-2">
          <Label htmlFor={`round-${k}`}>Bezug</Label>
          <Select id={`round-${k}`} name="round_id" defaultValue={prize?.round_id ?? ""}>
            <option value="">Saisonpreis (Gesamtrangliste)</option>
            {rounds.map((r) => (
              <option key={r.id} value={r.id}>
                Spieltag {r.number} · {r.name}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor={`from-${k}`}>Rang von</Label>
          <Input id={`from-${k}`} name="rank_from" type="number" min={1} defaultValue={prize?.rank_from ?? 1} required className="num" />
        </div>
        <div>
          <Label htmlFor={`to-${k}`}>Rang bis</Label>
          <Input id={`to-${k}`} name="rank_to" type="number" min={1} defaultValue={prize?.rank_to ?? 1} required className="num" />
        </div>
        <div>
          <Label htmlFor={`sponsor-${k}`}>Sponsor</Label>
          <Input id={`sponsor-${k}`} name="sponsor_name" defaultValue={prize?.sponsor_name ?? ""} />
        </div>
        <div>
          <Label htmlFor={`sort-${k}`}>Sortierung</Label>
          <Input id={`sort-${k}`} name="sort_order" type="number" defaultValue={prize?.sort_order ?? 0} className="num" />
        </div>
        <div className="col-span-2">
          <Label htmlFor={`img-${k}`}>Bild</Label>
          <Input id={`img-${k}`} name="image" type="file" accept="image/*" className="py-2 text-sm file:mr-3 file:rounded-sm file:border-0 file:bg-surface file:px-2 file:text-text-2" />
        </div>
      </div>
    </>
  );
}

export default async function SeasonPrizesPage({ params }: { params: Promise<{ id: string }> }) {
  await requireStaff();
  const { id } = await params;
  const supabase = await createClient();
  const [rounds, { data: prizes }] = await Promise.all([listRounds(id), supabase.from("prizes").select("*").eq("season_id", id).order("sort_order").order("created_at")]);
  const prizeIds = (prizes ?? []).map((p) => p.id);
  const { data: winnersRaw } = prizeIds.length
    ? await supabase.from("prize_winners").select("*, team:fantasy_teams(id, name, profile:profiles(username))").in("prize_id", prizeIds).order("created_at")
    : { data: [] };
  const winners = (winnersRaw ?? []) as unknown as Winner[];
  const roundLabel = (rid: string | null) => {
    if (!rid) return "Saisonpreis";
    const r = rounds.find((x) => x.id === rid);
    return r ? `Spieltag ${r.number}` : "Spieltag";
  };

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_380px]">
      <div className="order-2 flex flex-col gap-3 lg:order-1">
        {(prizes ?? []).length === 0 && <Empty>Noch keine Preise.</Empty>}
        {(prizes ?? []).map((p) => {
          const ws = winners.filter((w) => w.prize_id === p.id);
          return (
            <Card key={p.id}>
              <CardHeader className="items-start">
                <div className="flex min-w-0 items-start gap-3">
                  {p.image_url && <img src={p.image_url} alt="" className="h-14 w-14 shrink-0 rounded-sm object-cover" />}
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <CardTitle className="text-text">{p.title}</CardTitle>
                      <Badge variant={p.round_id ? "outline" : "gold"}>{roundLabel(p.round_id)}</Badge>
                      <Badge variant="muted">
                        Rang {p.rank_from}
                        {p.rank_to !== p.rank_from ? `–${p.rank_to}` : ""}
                      </Badge>
                    </div>
                    {p.sponsor_name && <div className="text-xs text-muted">präsentiert von {p.sponsor_name}</div>}
                    {p.description && <p className="mt-1 text-sm text-text-2">{p.description}</p>}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <ActionForm action={determineWinnersAction} submitLabel="Gewinner ermitteln" variant="secondary" size="sm" inline>
                    <input type="hidden" name="prize_id" value={p.id} />
                    <input type="hidden" name="season_id" value={id} />
                  </ActionForm>
                </div>

                {ws.length > 0 && (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[480px] text-sm">
                      <thead className="text-left text-[11px] uppercase tracking-wide text-muted">
                        <tr>
                          <th className="px-2 py-1.5">Team</th>
                          <th className="px-2 py-1.5">Manager</th>
                          <th className="px-2 py-1.5">Benachrichtigt</th>
                          <th className="px-2 py-1.5" />
                        </tr>
                      </thead>
                      <tbody>
                        {ws.map((w) => (
                          <tr key={w.id} className="border-t border-border">
                            <td className="px-2 py-1.5 font-semibold">{w.team?.name ?? "–"}</td>
                            <td className="px-2 py-1.5">
                              {w.team?.profile?.username ? (
                                <Link href={`/admin/users?q=${encodeURIComponent(w.team.profile.username)}`} className="text-gold hover:underline">
                                  {w.team.profile.username}
                                </Link>
                              ) : (
                                "–"
                              )}
                            </td>
                            <td className="px-2 py-1.5 text-xs">{w.notified_at ? <span className="text-positive">{formatDateTime(w.notified_at)}</span> : <span className="text-muted">noch nicht</span>}</td>
                            <td className="px-2 py-1.5">
                              <div className="flex justify-end gap-1">
                                <ActionForm action={notifyWinnerAction} submitLabel={w.notified_at ? "Erneut senden" : "Benachrichtigen"} variant={w.notified_at ? "ghost" : "secondary"} size="sm" inline>
                                  <input type="hidden" name="winner_id" value={w.id} />
                                  <input type="hidden" name="season_id" value={id} />
                                </ActionForm>
                                <ActionForm action={removeWinnerAction} submitLabel="Entfernen" variant="ghost" size="sm" inline silent>
                                  <input type="hidden" name="winner_id" value={w.id} />
                                  <input type="hidden" name="season_id" value={id} />
                                </ActionForm>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <details>
                  <summary className="cursor-pointer text-sm text-gold">Bearbeiten</summary>
                  <div className="mt-3 flex flex-col gap-4">
                    <ActionForm action={savePrizeAction} submitLabel="Speichern" variant="secondary" size="sm">
                      <PrizeFields seasonId={id} rounds={rounds} prize={p} />
                    </ActionForm>
                    <ActionForm action={deletePrizeAction} submitLabel="Preis löschen" variant="danger" size="sm" confirm="Preis samt Gewinnerliste endgültig löschen.">
                      <input type="hidden" name="id" value={p.id} />
                      <input type="hidden" name="season_id" value={id} />
                    </ActionForm>
                  </div>
                </details>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="order-1 lg:order-2">
        <Card accent="gold">
          <CardHeader>
            <CardTitle>Neuer Preis</CardTitle>
          </CardHeader>
          <CardContent>
            <ActionForm action={savePrizeAction} submitLabel="Anlegen" resetOnSuccess>
              <PrizeFields seasonId={id} rounds={rounds} />
            </ActionForm>
          </CardContent>
        </Card>
        <p className="mt-3 text-xs text-muted">
          Gewinner werden aus der jeweiligen Rangliste gelesen (Spieltag oder Gesamt). Die Rangliste muss vorher berechnet sein.{" "}
          <Button asChild variant="link" size="sm">
            <Link href={`/admin/seasons/${id}/rounds`}>Spieltage</Link>
          </Button>
        </p>
      </div>
    </div>
  );
}

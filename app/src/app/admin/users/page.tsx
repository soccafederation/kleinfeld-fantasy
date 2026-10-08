import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label, Select } from "@/components/ui/input";
import { ActionForm } from "@/components/admin/action-form";
import { Empty, PageHeader } from "@/components/admin/admin-shell";
import { moderateTeamNameAction, setUserRoleAction } from "../actions";
import type { Tables } from "@/lib/database.types";

type TeamRow = Pick<Tables<"fantasy_teams">, "id" | "user_id" | "name" | "name_status" | "is_complete" | "season_id"> & { season: { name: string } | null };

export default async function UsersPage({ searchParams }: { searchParams: Promise<{ q?: string; pending?: string }> }) {
  const { profile } = await requireStaff();
  const isAdmin = profile.role === "admin";
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const supabase = await createClient();

  let query = supabase.from("profiles").select("*").is("deleted_at", null).order("created_at", { ascending: false }).limit(50);
  if (q) query = query.or(`username.ilike.%${q.replace(/[%,()]/g, "")}%,display_name.ilike.%${q.replace(/[%,()]/g, "")}%`);
  const { data: profiles } = await query;
  const ids = (profiles ?? []).map((p) => p.user_id);

  const [{ data: teamsRaw }, { data: pendingRaw }] = await Promise.all([
    ids.length ? supabase.from("fantasy_teams").select("id, user_id, name, name_status, is_complete, season_id, season:seasons(name)").in("user_id", ids) : Promise.resolve({ data: [] }),
    supabase.from("fantasy_teams").select("id, user_id, name, name_status, is_complete, season_id, season:seasons(name)").eq("name_status", "pending").limit(50),
  ]);
  const teams = (teamsRaw ?? []) as unknown as TeamRow[];
  const pending = (pendingRaw ?? []) as unknown as TeamRow[];
  const pendingUserIds = [...new Set(pending.map((t) => t.user_id))].filter((u) => !ids.includes(u));
  const { data: pendingProfiles } = pendingUserIds.length ? await supabase.from("profiles").select("user_id, username").in("user_id", pendingUserIds) : { data: [] };
  const usernameOf = (uid: string) => profiles?.find((p) => p.user_id === uid)?.username ?? pendingProfiles?.find((p) => p.user_id === uid)?.username ?? "–";

  return (
    <>
      <PageHeader title="Nutzer" eyebrow="Community">
        Rollen, Teams und Teamnamen moderieren. {isAdmin ? "" : "Rollen können nur Admins ändern."}
      </PageHeader>

      {pending.length > 0 && (
        <Card accent="red" className="mb-5">
          <CardHeader>
            <CardTitle>Teamnamen zur Prüfung ({pending.length})</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {pending.map((t) => (
              <TeamModeration key={t.id} team={t} username={usernameOf(t.user_id)} />
            ))}
          </CardContent>
        </Card>
      )}

      <form method="get" className="mb-4 flex gap-2">
        <div className="flex-1">
          <Label htmlFor="q" className="sr-only">
            Suche
          </Label>
          <Input id="q" name="q" defaultValue={q} placeholder="Benutzername oder Anzeigename…" />
        </div>
        <Button type="submit" variant="secondary">
          Suchen
        </Button>
      </form>

      <div className="flex flex-col gap-3">
        {(profiles ?? []).length === 0 && <Empty>Keine Nutzer gefunden.</Empty>}
        {(profiles ?? []).map((p) => {
          const myTeams = teams.filter((t) => t.user_id === p.user_id);
          return (
            <Card key={p.user_id}>
              <CardHeader className="items-start">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">{p.username}</span>
                    <Badge variant={p.role === "admin" ? "gold" : p.role === "editor" ? "positive" : "muted"}>{p.role}</Badge>
                    {p.user_id === profile.user_id && <Badge variant="outline">du</Badge>}
                  </div>
                  <div className="text-xs text-muted">
                    {p.display_name && p.display_name !== p.username ? `${p.display_name} · ` : ""}seit {formatDate(p.created_at)} · {myTeams.length} Team{myTeams.length === 1 ? "" : "s"}
                  </div>
                </div>
                {isAdmin && (
                  <ActionForm action={setUserRoleAction} submitLabel="Rolle setzen" variant="secondary" size="sm" inline>
                    <input type="hidden" name="user_id" value={p.user_id} />
                    <Select name="role" defaultValue={p.role} className="h-9 w-28 text-sm" aria-label="Rolle">
                      <option value="user">user</option>
                      <option value="editor">editor</option>
                      <option value="admin">admin</option>
                    </Select>
                  </ActionForm>
                )}
              </CardHeader>
              {myTeams.length > 0 && (
                <CardContent className="flex flex-col gap-2">
                  {myTeams.map((t) => (
                    <TeamModeration key={t.id} team={t} username={p.username} />
                  ))}
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>
    </>
  );
}

function TeamModeration({ team, username }: { team: TeamRow; username: string }) {
  return (
    <div className="rounded-sm border border-border px-3 py-2">
      <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-muted">
        <span>{team.season?.name ?? "Season"}</span>
        <Badge variant={team.name_status === "approved" ? "positive" : team.name_status === "rejected" ? "red" : "gold"}>{team.name_status}</Badge>
        {!team.is_complete && <Badge variant="outline">unvollständig</Badge>}
      </div>
      <ActionForm action={moderateTeamNameAction} submitLabel="Freigeben" variant="secondary" size="sm" inline>
        <input type="hidden" name="team_id" value={team.id} />
        <input type="hidden" name="username" value={username} />
        <input type="hidden" name="decision" value="approved" />
        <Input name="name" defaultValue={team.name} minLength={3} maxLength={30} required aria-label="Teamname" className="h-9 w-full text-sm sm:w-56" />
      </ActionForm>
      <div className="mt-1">
        <ActionForm action={moderateTeamNameAction} submitLabel={`Ablehnen → „Team ${username}“`} variant="ghost" size="sm" inline silent>
          <input type="hidden" name="team_id" value={team.id} />
          <input type="hidden" name="username" value={username} />
          <input type="hidden" name="decision" value="rejected" />
        </ActionForm>
      </div>
    </div>
  );
}

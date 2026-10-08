import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Shirt, Store } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getAppContext } from "@/lib/data/context";
import { PlayerAvatar } from "@/components/fantasy/player-avatar";
import { StatusBadge, POSITION_SHORT } from "@/components/fantasy/player-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Eyebrow } from "@/components/ui/tricolore";
import { cn, formatMillions, formatPoints } from "@/lib/utils";
import type { Tables } from "@/lib/database.types";
import { FormChart } from "./form-chart";
import { PointsTable, type RoundScore, type ScoreDetail } from "./points-table";

type SeasonPlayerDetail = Pick<Tables<"season_players">, "id" | "season_id" | "position" | "shirt_number" | "status" | "market_value_m"> & {
  player: Pick<Tables<"players">, "id" | "display_name" | "first_name" | "last_name" | "image_url" | "nationality">;
  team: { id: string; club: Pick<Tables<"clubs">, "id" | "name" | "short_name" | "logo_url" | "primary_color"> };
};

type ScoreRow = Pick<Tables<"fantasy_player_scores">, "id" | "points" | "status" | "details"> & { round: Pick<Tables<"fantasy_rounds">, "number" | "name"> | null };
type StatRow = Pick<Tables<"player_round_statistics">, "stat_key" | "value"> & { stat: Pick<Tables<"stat_definitions">, "label_de" | "short_de" | "sort_order" | "category"> | null };

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from("season_players").select("player:players(display_name)").eq("id", id).maybeSingle();
  const name = (data as { player: { display_name: string } | null } | null)?.player?.display_name;
  return { title: name ? `${name} · Kleinfeld Fantasy` : "Spieler · Kleinfeld Fantasy" };
}

function parseDetails(json: unknown): ScoreDetail[] {
  if (!Array.isArray(json)) return [];
  return json.flatMap((d) => {
    if (!d || typeof d !== "object") return [];
    const o = d as Record<string, unknown>;
    if (typeof o.stat !== "string") return [];
    return [{ stat: o.stat, value: Number(o.value ?? 0), rule_points: Number(o.rule_points ?? 0), points: Number(o.points ?? 0) }];
  });
}

export default async function PlayerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: sp }, { myTeam }] = await Promise.all([
    supabase
      .from("season_players")
      .select(
        "id, season_id, position, shirt_number, status, market_value_m, player:players(id, display_name, first_name, last_name, image_url, nationality), team:season_teams(id, club:clubs(id, name, short_name, logo_url, primary_color))",
      )
      .eq("id", id)
      .maybeSingle(),
    getAppContext(),
  ]);
  if (!sp) notFound();
  const player = sp as unknown as SeasonPlayerDetail;

  const [{ data: stats }, { data: scores }, { data: roundStats }] = await Promise.all([
    supabase.from("player_season_stats").select("*").eq("season_player_id", id).maybeSingle(),
    supabase.from("fantasy_player_scores").select("id, points, status, details, round:fantasy_rounds(number, name)").eq("season_player_id", id),
    supabase
      .from("player_round_statistics")
      .select("stat_key, value, stat:stat_definitions(label_de, short_de, sort_order, category)")
      .eq("season_player_id", id)
      .in("status", ["published", "corrected"]),
  ]);

  const rounds: RoundScore[] = ((scores ?? []) as unknown as ScoreRow[])
    .filter((s) => s.round)
    .map((s) => ({
      number: s.round!.number,
      name: s.round!.name,
      points: Number(s.points),
      provisional: s.status === "provisional",
      details: parseDetails(s.details),
    }))
    .sort((a, b) => a.number - b.number);

  // Labels aus den Einzelwertungen und den Saisonstatistiken (stat_definitions.label_de)
  const seasonStats = new Map<string, { label: string; short: string | null; sort: number; value: number }>();
  for (const r of (roundStats ?? []) as unknown as StatRow[]) {
    const cur = seasonStats.get(r.stat_key);
    const label = r.stat?.label_de ?? r.stat_key;
    seasonStats.set(r.stat_key, { label, short: r.stat?.short_de ?? null, sort: r.stat?.sort_order ?? 999, value: (cur?.value ?? 0) + Number(r.value) });
  }
  const detailKeys = [...new Set(rounds.flatMap((r) => r.details.map((d) => d.stat)))].filter((k) => !seasonStats.has(k));
  let labels: Record<string, string> = Object.fromEntries([...seasonStats.entries()].map(([k, v]) => [k, v.label]));
  if (detailKeys.length) {
    const { data: defs } = await supabase.from("stat_definitions").select("key, label_de").in("key", detailKeys);
    labels = { ...labels, ...Object.fromEntries((defs ?? []).map((d) => [d.key, d.label_de])) };
  }

  const inMyTeam = myTeam?.roster.some((r) => r.season_player_id === id) ?? false;
  const total = Number(stats?.total_points ?? 0);
  const avg = Number(stats?.avg_points ?? 0);
  const best = Number(stats?.best_points ?? 0);
  const ppm = Number(stats?.points_per_m ?? 0);
  const form3 = Number(stats?.form3 ?? 0);
  const value = Number(player.market_value_m);
  const statTiles = [...seasonStats.values()].sort((a, b) => a.sort - b.sort || a.label.localeCompare(b.label, "de"));

  return (
    <div className="space-y-4">
      <Link href="/app/market" className="inline-flex h-11 items-center gap-1 text-sm text-muted hover:text-text">
        <ArrowLeft className="h-4 w-4" /> Spielermarkt
      </Link>

      <Card accent="gold" className="relative overflow-hidden p-5">
        <div aria-hidden className="pointer-events-none absolute -right-10 top-0 bottom-0 w-[70px] tricolore-skew border-0 opacity-80" />
        <div className="flex items-start gap-4">
          <PlayerAvatar name={player.player.display_name} imageUrl={player.player.image_url} size={88} />
          <div className="min-w-0 flex-1">
            <Eyebrow stripe={false}>{player.team.club.name}</Eyebrow>
            <h1 className="display mt-1 text-3xl leading-none sm:text-4xl">{player.player.display_name}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-text-2">
              <Badge variant="outline">{POSITION_SHORT[player.position]}</Badge>
              {player.shirt_number != null && <span className="num">#{player.shirt_number}</span>}
              <span className="num text-gold">{formatMillions(value)}</span>
              <StatusBadge status={player.status} />
              {player.status === "active" && <Badge variant="positive">Fit</Badge>}
            </div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
        <Tile label="Gesamtpunkte" value={formatPoints(total)} gold />
        <Tile label="Ø Punkte" value={formatPoints(avg)} />
        <Tile label="Beste Leistung" value={formatPoints(best)} />
        <Tile label="Punkte/Mio" value={formatPoints(ppm)} />
        <Tile label="Form (letzte 3)" value={formatPoints(form3)} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Formkurve</CardTitle>
          <span className="text-xs text-muted">{rounds.length} Spieltage</span>
        </CardHeader>
        <CardContent>
          <FormChart rounds={rounds} className="h-auto w-full" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Punkteaufschlüsselung</CardTitle>
        </CardHeader>
        <CardContent>
          <PointsTable rounds={rounds} labels={labels} />
        </CardContent>
      </Card>

      {statTiles.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Saisonstatistiken</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
              {statTiles.map((s) => (
                <div key={s.label} className="border-l-2 border-border pl-3">
                  <dt className="text-[10px] uppercase tracking-[0.12em] text-muted">{s.label}</dt>
                  <dd className="num text-xl">{formatPoints(s.value)}</dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>
      )}

      <div className="pt-2">
        {inMyTeam ? (
          <Button asChild variant="secondary" className="w-full">
            <Link href="/app/team">
              <Shirt /> In deinem Team
            </Link>
          </Button>
        ) : (
          <Button asChild className="w-full">
            <Link href="/app/market">
              <Store /> In den Spielermarkt
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
}

function Tile({ label, value, gold }: { label: string; value: string; gold?: boolean }) {
  return (
    <div className="rounded border border-border bg-card px-3 py-2.5">
      <div className="text-[9px] uppercase tracking-[0.12em] text-muted">{label}</div>
      <div className={cn("num mt-1 text-2xl", gold && "text-gold")}>{value}</div>
    </div>
  );
}

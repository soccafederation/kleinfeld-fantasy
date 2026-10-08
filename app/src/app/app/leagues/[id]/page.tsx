import Link from "next/link";
import { notFound } from "next/navigation";
import { Eyebrow } from "@/components/ui/tricolore";
import { Card } from "@/components/ui/card";
import { getAppContext } from "@/lib/data/context";
import { createClient } from "@/lib/supabase/server";
import { cn, formatPoints } from "@/lib/utils";
import { ShareCode } from "./share";

export default async function LeaguePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user } = await getAppContext();
  const supabase = await createClient();
  const { data: league } = await supabase.from("fantasy_leagues").select("*").eq("id", id).maybeSingle();
  if (!league) notFound();
  const { data: rows } = await supabase.rpc("league_table", { p_league_id: id });
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "";

  return (
    <div className="flex flex-col gap-5">
      <div>
        <Link href="/app/leagues" className="text-xs font-bold uppercase tracking-wide text-muted hover:text-text">← Alle Ligen</Link>
        <Eyebrow className="mt-3">Private Liga{league.owner_id === user.id ? " · Du bist Admin" : ""}</Eyebrow>
        <h1 className="display mt-1 text-4xl sm:text-5xl">{league.name}</h1>
      </div>
      <ShareCode code={league.invite_code} link={`${site}/app/leagues?code=${league.invite_code}`} />
      <Card className="overflow-hidden">
        {(rows ?? []).map((row) => (
          <div key={row.fantasy_team_id} className={cn("grid grid-cols-[44px_1fr_90px_90px] items-center gap-2 border-t border-border px-3 py-2.5 first:border-t-0", row.is_me && "border-l-[6px] border-l-gold bg-gold/10")}>
            <span className={cn("num text-xl", row.rank === 1 ? "text-gold" : "text-muted")}>{row.rank}</span>
            <div className="min-w-0"><div className="truncate text-sm font-bold">{row.is_me ? "Du" : row.username}</div><div className="truncate text-xs text-muted">{row.team_name}</div></div>
            <span className="num text-right text-base text-text-2">{formatPoints(row.last_round_points)}</span>
            <span className="num text-right text-xl">{formatPoints(row.total_points)}</span>
          </div>
        ))}
      </Card>
    </div>
  );
}

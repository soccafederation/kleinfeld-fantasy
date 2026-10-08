import { Card } from "@/components/ui/card";
import { Delta } from "@/components/ui/badge";
import { Eyebrow } from "@/components/ui/tricolore";
import { formatPoints } from "@/lib/utils";
import type { MyRank } from "@/lib/data/season";

export function RankCard({ rank, roundLabel }: { rank: MyRank; roundLabel?: string | null }) {
  const hasRank = rank.rank != null;
  return (
    <Card accent="gold" className="relative overflow-hidden bg-[#0f0f11] p-5">
      <div aria-hidden className="pointer-events-none absolute -right-10 top-0 bottom-0 w-[70px] tricolore-skew border-0 opacity-90" />
      <div className="flex items-center justify-between">
        <Eyebrow stripe={false}>Your Rank</Eyebrow>
        {roundLabel && <span className="pr-8 text-xs text-muted">{roundLabel}</span>}
      </div>
      {hasRank ? (
        <>
          <div className="mt-2 flex items-end gap-4">
            <div className="num text-[72px] leading-[0.85] tracking-tight">#{rank.rank}</div>
            <div className="pb-1.5">
              <div className="text-[11px] uppercase tracking-[0.1em] text-muted">of {rank.total_managers} Managers</div>
              <div className="mt-1 text-[15px]">
                <Delta value={rank.rank_delta} className="text-[15px]" /> {rank.rank_delta ? "Plätze" : ""}
              </div>
            </div>
          </div>
          <div className="mt-4 mr-6 grid grid-cols-3 border border-border">
            <Stat label="Total" value={formatPoints(rank.total_points)} gold />
            <Stat label="Letzter MD" value={formatPoints(rank.last_round_points)} />
            <Stat
              label={rank.rank && rank.rank <= 100 ? "Zum nächsten" : "Bis Top 100"}
              value={
                rank.rank && rank.rank <= 100
                  ? rank.points_to_next != null ? formatPoints(rank.points_to_next) : "–"
                  : rank.points_to_top100 != null ? formatPoints(rank.points_to_top100) : "–"
              }
              suffix="PTS"
              last
            />
          </div>
        </>
      ) : (
        <div className="mt-3 text-text-2">
          <div className="num text-4xl text-muted">–</div>
          <p className="mt-2 text-sm text-muted">Deine Platzierung erscheint nach dem ersten gewerteten Spieltag.</p>
        </div>
      )}
    </Card>
  );
}

function Stat({ label, value, gold, suffix, last }: { label: string; value: string; gold?: boolean; suffix?: string; last?: boolean }) {
  return (
    <div className={last ? "px-3 py-2.5" : "border-r border-border px-3 py-2.5"}>
      <div className="text-[9px] uppercase tracking-[0.12em] text-muted">{label}</div>
      <div className={gold ? "num text-2xl text-gold" : "num text-2xl"}>
        {value} {suffix && <span className="text-[10px] text-muted">{suffix}</span>}
      </div>
    </div>
  );
}

import { ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn, formatPoints } from "@/lib/utils";

export type ScoreDetail = { stat: string; value: number; rule_points: number; points: number };
export type RoundScore = { number: number; name: string; points: number; provisional: boolean; details: ScoreDetail[] };

/** Punkteaufschlüsselung je Spieltag – ausklappbar per <details>, ohne Client-JS. */
export function PointsTable({ rounds, labels }: { rounds: RoundScore[]; labels: Record<string, string> }) {
  if (rounds.length === 0) return <p className="text-sm text-muted">Noch keine gewerteten Spieltage.</p>;
  return (
    <ul className="divide-y divide-border rounded border border-border">
      {rounds.map((r) => (
        <li key={r.number}>
          <details className="group">
            <summary className="flex min-h-[52px] cursor-pointer list-none items-center gap-3 px-3 py-2 [&::-webkit-details-marker]:hidden">
              <span className="num w-8 text-xs text-muted">{r.number}</span>
              <span className="min-w-0 flex-1 truncate text-sm font-semibold">{r.name}</span>
              {r.provisional && <Badge variant="outline">Vorläufig</Badge>}
              <span className={cn("num text-base", r.points < 0 ? "text-red" : "text-gold")}>{formatPoints(r.points)}</span>
              <ChevronDown className="h-4 w-4 text-muted transition-transform group-open:rotate-180" />
            </summary>
            <div className="border-t border-border bg-surface px-3 py-2">
              {r.details.length === 0 ? (
                <p className="text-xs text-muted">Keine Einzelwertungen hinterlegt.</p>
              ) : (
                <table className="w-full text-sm">
                  <tbody>
                    {r.details.map((d, i) => (
                      <tr key={`${d.stat}-${i}`}>
                        <td className="py-1 text-text-2">{labels[d.stat] ?? d.stat}</td>
                        <td className="num py-1 text-right text-muted">{formatPoints(d.value)}</td>
                        <td className={cn("num w-16 py-1 text-right", d.points < 0 ? "text-red" : d.points > 0 ? "text-gold" : "text-muted")}>
                          {d.points > 0 ? "+" : ""}
                          {formatPoints(d.points)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </details>
        </li>
      ))}
    </ul>
  );
}

import Link from "next/link";
import { cn } from "@/lib/utils";

const TABS = [
  { key: "overall", label: "Overall" },
  { key: "matchday", label: "Matchday" },
  { key: "leagues", label: "My Leagues" },
] as const;

export function LeaderboardTabs({ view }: { view: string }) {
  return (
    <div role="tablist" className="grid grid-cols-3 border border-border bg-surface">
      {TABS.map((t) => (
        <Link
          key={t.key}
          role="tab"
          aria-selected={view === t.key}
          href={`/app/leaderboard?view=${t.key}`}
          className={cn(
            "display-upright flex h-11 items-center justify-center text-sm tracking-wider",
            view === t.key ? "bg-gold text-gold-fg" : "text-text-2 hover:text-text",
          )}
        >
          {t.label}
        </Link>
      ))}
    </div>
  );
}

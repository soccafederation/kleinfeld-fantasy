import { cn, formatMillions } from "@/lib/utils";

export function BudgetBar({ spent, budget, className }: { spent: number; budget: number; className?: string }) {
  const remaining = budget - spent;
  const pct = budget > 0 ? Math.min(100, Math.max(0, (spent / budget) * 100)) : 0;
  const over = remaining < -1e-9;
  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-end justify-between">
        <span className="eyebrow">Budget</span>
        <span className={cn("num text-sm", over ? "text-red" : "text-text-2")}>
          {formatMillions(spent)} <span className="text-muted">/ {formatMillions(budget)}</span>
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-sm bg-surface" role="progressbar" aria-valuemin={0} aria-valuemax={budget} aria-valuenow={Math.min(spent, budget)} aria-label="Budget verbraucht">
        <div className={cn("h-full transition-[width] duration-200", over ? "bg-red" : "bg-gold")} style={{ width: `${pct}%` }} />
      </div>
      <div className={cn("text-xs", over ? "font-semibold text-red" : "text-muted")}>
        {over ? `${formatMillions(Math.abs(remaining))} über Budget` : `${formatMillions(remaining)} übrig`}
      </div>
    </div>
  );
}

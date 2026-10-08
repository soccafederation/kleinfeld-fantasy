import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export const ONBOARDING_STEPS = ["Teamname", "Spieler wählen", "Kapitän", "Bestätigen"] as const;

/** Fortschrittsanzeige fürs Onboarding – alle Schritte liegen auf einer Seite, der Stepper zeigt nur den Stand. */
export function Stepper({ done, className }: { done: boolean[]; className?: string }) {
  const current = done.findIndex((d) => !d);
  return (
    <ol className={cn("grid grid-cols-4 gap-1", className)} aria-label="Fortschritt">
      {ONBOARDING_STEPS.map((label, i) => {
        const isDone = done[i];
        const isCurrent = i === current;
        return (
          <li key={label} className="flex flex-col gap-1.5">
            <div className={cn("h-1 rounded-sm", isDone ? "bg-gold" : isCurrent ? "bg-gold/50" : "bg-border")} />
            <div className={cn("flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider", isDone || isCurrent ? "text-text-2" : "text-muted-2")}>
              {isDone ? <Check className="h-3 w-3 text-gold" /> : <span className="num">{i + 1}</span>}
              <span className="truncate">{label}</span>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

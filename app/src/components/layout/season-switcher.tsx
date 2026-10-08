"use client";

import { useTransition } from "react";
import { ChevronDown } from "lucide-react";
import { Stripe } from "@/components/ui/tricolore";
import { setActiveSeasonAction } from "@/app/app/actions";
import type { Season } from "@/lib/data/season";

export function SeasonSwitcher({ current, seasons }: { current: Season; seasons: Season[] }) {
  const [pending, start] = useTransition();
  if (seasons.length <= 1) {
    return (
      <span className="display inline-flex items-center gap-2 text-lg">
        <Stripe />
        {current.competition.name} <span className="text-gold">{current.name}</span>
      </span>
    );
  }
  return (
    <label className="relative inline-flex items-center gap-2">
      <Stripe />
      <span className="sr-only">Wettbewerb wechseln</span>
      <select
        className="display appearance-none bg-transparent pr-6 text-lg text-text focus:outline-none"
        value={current.id}
        disabled={pending}
        onChange={(e) => start(() => setActiveSeasonAction(e.target.value))}
      >
        {seasons.map((s) => (
          <option key={s.id} value={s.id} className="bg-ground font-sans normal-case">
            {s.competition.name} · {s.name}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-0 h-4 w-4 text-muted" />
    </label>
  );
}

"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { setActiveSeasonAction } from "@/app/app/actions";

export function OpenSeasonButton({ seasonId, label }: { seasonId: string; label: string }) {
  const [pending, start] = useTransition();
  return (
    <Button className="w-full sm:w-auto" disabled={pending} onClick={() => start(() => setActiveSeasonAction(seasonId))}>
      {pending ? "Lädt …" : label}
    </Button>
  );
}

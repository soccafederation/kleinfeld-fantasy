"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

/**
 * Jump to My Rank: lädt die Seite, auf der der eigene Rang liegt (?from=<rank>, serverseitig berechnet),
 * und scrollt danach zur eigenen Zeile – unabhängig davon, welche Seite gerade geladen ist.
 */
export function JumpToMyRank({ rank }: { rank: number }) {
  const router = useRouter();
  const sp = useSearchParams();
  const from = sp.get("from");

  useEffect(() => {
    if (!from) return;
    const el = document.getElementById(`rank-${from}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [from]);

  return (
    <Button size="sm" variant="secondary" onClick={() => router.push(`/app/leaderboard?view=overall&from=${rank}`)}>
      Jump to my rank
    </Button>
  );
}

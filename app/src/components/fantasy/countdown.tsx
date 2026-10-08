"use client";

import { useEffect, useState } from "react";
import { formatCountdown } from "@/lib/utils";

/** Live-Countdown bis zur Deadline. Rendert vor der Hydration einen Platzhalter, danach alle 30 s neu. */
export function Countdown({ deadline, className }: { deadline: string; className?: string }) {
  const [text, setText] = useState<string>("–:–");
  useEffect(() => {
    let frame = 0;
    const tick = () => setText(formatCountdown(deadline));
    frame = requestAnimationFrame(tick);
    const id = setInterval(tick, 30_000);
    return () => {
      cancelAnimationFrame(frame);
      clearInterval(id);
    };
  }, [deadline]);
  return <span className={className}>{text}</span>;
}

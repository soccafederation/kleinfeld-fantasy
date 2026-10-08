/* eslint-disable @next/next/no-img-element */
import { cn } from "@/lib/utils";

/** Kleines Club-Logo bzw. Kürzel in Clubfarbe (Admin-Listen). */
export function ClubBadge({ name, short, color, logoUrl, size = "md" }: { name: string; short: string; color?: string | null; logoUrl?: string | null; size?: "sm" | "md" }) {
  const dim = size === "sm" ? "h-7 w-7 text-[10px]" : "h-10 w-10 text-xs";
  if (logoUrl) {
    return <img src={logoUrl} alt={name} className={cn("shrink-0 rounded-sm bg-surface object-contain p-0.5", dim)} />;
  }
  return (
    <span
      className={cn("num flex shrink-0 items-center justify-center rounded-sm border border-border-strong", dim)}
      style={color ? { backgroundColor: color, color: "#fff", textShadow: "0 1px 2px rgba(0,0,0,.6)" } : undefined}
      title={name}
    >
      {short}
    </span>
  );
}

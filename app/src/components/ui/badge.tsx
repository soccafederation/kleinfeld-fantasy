import * as React from "react";
import { cn } from "@/lib/utils";

type Variant = "gold" | "muted" | "outline" | "red" | "positive";

export function Badge({ className, variant = "muted", ...props }: React.HTMLAttributes<HTMLSpanElement> & { variant?: Variant }) {
  return (
    <span
      className={cn(
        "inline-flex items-center h-5 px-1.5 rounded-sm font-display font-bold text-[10px] uppercase tracking-[0.1em] leading-none",
        variant === "gold" && "bg-gold text-gold-fg",
        variant === "muted" && "bg-surface text-muted border border-border",
        variant === "outline" && "bg-transparent text-text-2 border border-border-strong",
        variant === "red" && "bg-red text-white",
        variant === "positive" && "bg-positive/20 text-positive border border-positive/40",
        className,
      )}
      {...props}
    />
  );
}

export function Delta({ value, className }: { value: number | null | undefined; className?: string }) {
  if (value === null || value === undefined) return <span className={cn("text-muted-2 text-xs", className)}>neu</span>;
  if (value === 0) return <span className={cn("text-muted text-xs font-semibold", className)}>—</span>;
  const up = value > 0;
  return (
    <span className={cn("text-xs font-bold", up ? "text-positive" : "text-red", className)}>
      {up ? "▲" : "▼"} {Math.abs(value)}
    </span>
  );
}

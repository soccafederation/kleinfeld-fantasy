import * as React from "react";
import { cn } from "@/lib/utils";

export function Card({ className, accent, ...props }: React.HTMLAttributes<HTMLDivElement> & { accent?: "gold" | "red" | "none" }) {
  return (
    <div
      className={cn(
        "rounded bg-card border border-border",
        accent === "gold" && "border-l-[6px] border-l-gold",
        accent === "red" && "border-l-[6px] border-l-red",
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex items-center justify-between gap-3 px-4 pt-4", className)} {...props} />;
}

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn("eyebrow", className)} {...props} />;
}

export function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("px-4 pb-4 pt-3", className)} {...props} />;
}

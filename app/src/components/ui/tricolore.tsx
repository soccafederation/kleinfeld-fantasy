import { cn } from "@/lib/utils";

/** Diagonaler Schwarz-Rot-Gold-Marker (DKFV-Signatur) */
export function Stripe({ className }: { className?: string }) {
  return <span aria-hidden className={cn("inline-block w-5 h-2.5 tricolore-skew", className)} />;
}

/** Horizontale Tricolore-Linie */
export function TricoloreBar({ className }: { className?: string }) {
  return <div aria-hidden className={cn("h-1.5 w-full tricolore", className)} />;
}

export function Eyebrow({ children, className, stripe = true }: { children: React.ReactNode; className?: string; stripe?: boolean }) {
  return (
    <div className={cn("eyebrow inline-flex items-center gap-2", className)}>
      {stripe && <Stripe />}
      {children}
    </div>
  );
}

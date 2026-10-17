import Image from "next/image";
import { cn, initials } from "@/lib/utils";

/**
 * Spieleravatar: echtes Bild, sonst Initialen-Platzhalter (Spielerfotos liegen noch nicht vor).
 */
export function PlayerAvatar({
  name,
  imageUrl,
  size = 40,
  className,
  isCaptain,
  ring,
}: {
  name: string;
  imageUrl?: string | null;
  size?: number;
  className?: string;
  isCaptain?: boolean;
  ring?: "gold" | "none";
}) {
  return (
    <span
      className={cn("relative inline-flex shrink-0 items-center justify-center overflow-visible rounded-sm bg-surface border-2", ring === "gold" ? "border-gold" : "border-border-strong", className)}
      style={{ width: size, height: size }}
    >
      {imageUrl ? (
        <Image src={imageUrl} alt="" width={size} height={size} className="h-full w-full rounded-[2px] object-cover object-top" />
      ) : (
        <span className="num text-text-2" style={{ fontSize: Math.max(11, size * 0.36) }}>
          {initials(name)}
        </span>
      )}
      {isCaptain && (
        <span
          aria-label="Kapitän"
          className="num absolute -right-2 -top-2 flex h-[18px] w-[18px] items-center justify-center bg-gold text-gold-fg text-[11px] skew"
        >
          <span>C</span>
        </span>
      )}
    </span>
  );
}

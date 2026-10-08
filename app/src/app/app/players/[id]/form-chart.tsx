import { formatPoints } from "@/lib/utils";

export type RoundPoint = { number: number; name: string; points: number; provisional: boolean };

/**
 * Formkurve: Balken je Spieltag als Inline-SVG (ohne Library).
 * Positive Punkte gold, negative rot, vorläufige Werte schraffiert heller.
 */
export function FormChart({ rounds, className }: { rounds: RoundPoint[]; className?: string }) {
  if (rounds.length === 0) {
    return <p className={className ? `${className} text-sm text-muted` : "text-sm text-muted"}>Noch keine gewerteten Spieltage.</p>;
  }
  const W = 320;
  const H = 120;
  const padX = 8;
  const padTop = 16;
  const padBottom = 20;
  const max = Math.max(1, ...rounds.map((r) => Math.abs(r.points)));
  const hasNeg = rounds.some((r) => r.points < 0);
  const plotH = H - padTop - padBottom;
  const zeroY = hasNeg ? padTop + plotH / 2 : padTop + plotH;
  const scale = (hasNeg ? plotH / 2 : plotH) / max;
  const slot = (W - padX * 2) / rounds.length;
  const barW = Math.min(28, slot * 0.6);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={className} role="img" aria-label={`Punkte je Spieltag: ${rounds.map((r) => `${r.name} ${formatPoints(r.points)}`).join(", ")}`}>
      <line x1={padX} x2={W - padX} y1={zeroY} y2={zeroY} stroke="var(--kf-border-strong)" strokeWidth={1} />
      {rounds.map((r, i) => {
        const x = padX + slot * i + (slot - barW) / 2;
        const h = Math.abs(r.points) * scale;
        const y = r.points >= 0 ? zeroY - h : zeroY;
        const fill = r.points < 0 ? "var(--kf-red)" : "var(--kf-gold)";
        return (
          <g key={r.number}>
            <rect x={x} y={y} width={barW} height={Math.max(h, r.points === 0 ? 1 : 0)} fill={fill} opacity={r.provisional ? 0.45 : 1} rx={1} />
            <text
              x={x + barW / 2}
              y={r.points >= 0 ? y - 4 : y + h + 10}
              textAnchor="middle"
              fontSize={10}
              fontWeight={700}
              fill="var(--kf-text-2)"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {formatPoints(r.points)}
            </text>
            <text x={x + barW / 2} y={H - 6} textAnchor="middle" fontSize={9} fill="var(--kf-muted)">
              {r.number}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

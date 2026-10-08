import { Badge } from "@/components/ui/badge";
import type { Enums } from "@/lib/database.types";

const SEASON: Record<Enums<"season_status">, { label: string; variant: "gold" | "muted" | "outline" | "red" | "positive" }> = {
  draft: { label: "Entwurf", variant: "outline" },
  open: { label: "Offen", variant: "positive" },
  live: { label: "Live", variant: "gold" },
  completed: { label: "Beendet", variant: "muted" },
  archived: { label: "Archiv", variant: "muted" },
};

const ROUND: Record<Enums<"round_status">, { label: string; variant: "gold" | "muted" | "outline" | "red" | "positive" }> = {
  upcoming: { label: "Offen", variant: "positive" },
  locked: { label: "Gesperrt", variant: "outline" },
  live: { label: "Live", variant: "gold" },
  under_review: { label: "Vorläufig", variant: "gold" },
  completed: { label: "Abgeschlossen", variant: "muted" },
};

const IMPORT: Record<Enums<"import_status">, { label: string; variant: "gold" | "muted" | "outline" | "red" | "positive" }> = {
  uploaded: { label: "Hochgeladen", variant: "outline" },
  extracted: { label: "Extrahiert", variant: "outline" },
  review: { label: "Review", variant: "gold" },
  confirmed: { label: "Bestätigt", variant: "positive" },
  published: { label: "Veröffentlicht", variant: "positive" },
  rejected: { label: "Verworfen", variant: "red" },
};

const STAT: Record<Enums<"stat_status">, { label: string; variant: "gold" | "muted" | "outline" | "red" | "positive" }> = {
  computed: { label: "Berechnet", variant: "outline" },
  confirmed: { label: "Bestätigt", variant: "gold" },
  published: { label: "Veröffentlicht", variant: "positive" },
  corrected: { label: "Korrigiert", variant: "red" },
};

const PLAYER: Record<Enums<"player_status">, { label: string; variant: "gold" | "muted" | "outline" | "red" | "positive" }> = {
  active: { label: "Aktiv", variant: "positive" },
  injured: { label: "Verletzt", variant: "red" },
  unavailable: { label: "Fehlt", variant: "outline" },
  left: { label: "Weg", variant: "muted" },
};

export function SeasonStatusBadge({ status }: { status: Enums<"season_status"> }) {
  const s = SEASON[status];
  return <Badge variant={s.variant}>{s.label}</Badge>;
}
export function RoundStatusBadge({ status }: { status: Enums<"round_status"> }) {
  const s = ROUND[status];
  return <Badge variant={s.variant}>{s.label}</Badge>;
}
export function ImportStatusBadge({ status }: { status: Enums<"import_status"> }) {
  const s = IMPORT[status];
  return <Badge variant={s.variant}>{s.label}</Badge>;
}
export function StatStatusBadge({ status }: { status: Enums<"stat_status"> }) {
  const s = STAT[status];
  return <Badge variant={s.variant}>{s.label}</Badge>;
}
export function PlayerStatusBadge({ status }: { status: Enums<"player_status"> }) {
  const s = PLAYER[status];
  return <Badge variant={s.variant}>{s.label}</Badge>;
}

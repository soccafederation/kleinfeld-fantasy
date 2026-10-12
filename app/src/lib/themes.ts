/**
 * Farbwelten pro Wettbewerb. Überschreibt die Design-Tokens aus globals.css (--kf-*),
 * alle Komponenten ziehen automatisch mit. Kein Eintrag = DKFV-Standard (Schwarz/Rot/Gold).
 * "gold" ist dabei der Haupt-Akzent des Wettbewerbs, "red" der Zweitakzent.
 */
type ThemeVars = Partial<Record<
  | "ground" | "surface" | "card" | "card-hover" | "border" | "border-strong"
  | "text-2" | "muted" | "muted-2"
  | "gold" | "gold-hover" | "gold-fg" | "red" | "red-hover" | "info"
  | "pitch" | "stripe-1" | "stripe-2" | "stripe-3",
  string
>>;

export const COMPETITION_THEMES: Record<string, ThemeVars> = {
  // Icon League: Aubergine-Flächen, Magenta als Hauptakzent, Hellblau als Zweitakzent
  "icon-league": {
    ground: "#1a0a20",
    surface: "#240f2b",
    card: "#2e1236",
    "card-hover": "#3a1744",
    border: "#4a2154",
    "border-strong": "#663073",
    "text-2": "#e6d6ec",
    muted: "#b89cc2",
    "muted-2": "#82678c",
    gold: "#e544dc",
    "gold-hover": "#f070e9",
    "gold-fg": "#1a0a20",
    red: "#4fb8f0",
    "red-hover": "#7acbf5",
    info: "#4fb8f0",
    pitch: "#14101c",
    "stripe-1": "#1a0a20",
    "stripe-2": "#4fb8f0",
    "stripe-3": "#e544dc",
  },
  // Socca Champions League: TUI-Hellblau auf Nachtblau (vorbereitet, Season folgt)
  "socca-champions-league": {
    ground: "#06132b",
    surface: "#0b1c3b",
    card: "#10244a",
    "card-hover": "#152c57",
    border: "#1f3a6b",
    "border-strong": "#2d4f8a",
    "text-2": "#d6e4f5",
    muted: "#9db3cf",
    "muted-2": "#6880a3",
    gold: "#70cbf4",
    "gold-hover": "#9adaf7",
    "gold-fg": "#06132b",
    red: "#e30613",
    "red-hover": "#ff2a36",
    pitch: "#0a1a26",
    "stripe-1": "#06132b",
    "stripe-2": "#ffffff",
    "stripe-3": "#70cbf4",
  },
};

/** CSS für :root – leer, wenn der Wettbewerb kein eigenes Theme hat. */
export function competitionThemeCss(slug: string | null | undefined, themeColor = true): string {
  const t = slug ? COMPETITION_THEMES[slug] : undefined;
  if (!t) return "";
  const vars = Object.entries(t)
    .map(([k, v]) => `--kf-${k}:${v};`)
    .join("");
  return `:root{${vars}}${themeColor ? `body{background:${t.ground}}` : ""}`;
}

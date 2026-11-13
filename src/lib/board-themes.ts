import type { CSSProperties } from "react";

export type BoardTheme = "carnival" | "classic" | "elegant" | "neon";

export const BOARD_THEMES: {
  id: BoardTheme;
  label: string;
  description: string;
  defaultAccent: string;
}[] = [
  {
    id: "carnival",
    label: "Carnival",
    description: "Marquee lights, ticket stubs, big and festive",
    defaultAccent: "#fbbf24",
  },
  {
    id: "classic",
    label: "Classic",
    description: "Clean and minimal — fits any event",
    defaultAccent: "#38bdf8",
  },
  {
    id: "elegant",
    label: "Elegant",
    description: "Serif type, thin gold lines — weddings & galas",
    defaultAccent: "#d4af37",
  },
  {
    id: "neon",
    label: "Neon",
    description: "Glowing borders, bold type — parties & nightlife",
    defaultAccent: "#ec4899",
  },
];

export function isBoardTheme(value: string): value is BoardTheme {
  return BOARD_THEMES.some((t) => t.id === value);
}

export function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace("#", "");
  const full =
    clean.length === 3
      ? clean
          .split("")
          .map((c) => c + c)
          .join("")
      : clean;
  const r = parseInt(full.slice(0, 2), 16) || 0;
  const g = parseInt(full.slice(2, 4), 16) || 0;
  const b = parseInt(full.slice(4, 6), 16) || 0;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function accentCssVars(accent: string): CSSProperties {
  return {
    "--accent": accent,
    "--accent-soft": hexToRgba(accent, 0.15),
    "--accent-glow": hexToRgba(accent, 0.45),
    "--accent-border": hexToRgba(accent, 0.5),
  } as CSSProperties;
}

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
    description: "Bold type, glowing color — parties & nightlife",
    defaultAccent: "#ec4899",
  },
];

export function isBoardTheme(value: string): value is BoardTheme {
  return BOARD_THEMES.some((t) => t.id === value);
}

function parseHex(hex: string): [number, number, number] {
  const clean = hex.replace("#", "");
  const full =
    clean.length === 3
      ? clean
          .split("")
          .map((c) => c + c)
          .join("")
      : clean;
  return [
    parseInt(full.slice(0, 2), 16) || 0,
    parseInt(full.slice(2, 4), 16) || 0,
    parseInt(full.slice(4, 6), 16) || 0,
  ];
}

function toHex([r, g, b]: [number, number, number]) {
  return `#${[r, g, b]
    .map((v) => Math.round(v).toString(16).padStart(2, "0"))
    .join("")}`;
}

export function hexToRgba(hex: string, alpha: number): string {
  const [r, g, b] = parseHex(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// WCAG relative luminance and contrast ratio.
function luminance(hex: string) {
  const [r, g, b] = parseHex(hex).map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(a: string, b: string) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

export type BoardMode = "light" | "dark";

export function isBoardMode(value: unknown): value is BoardMode {
  return value === "light" || value === "dark";
}

// Nudges a color toward black or white, one step at a time, until it reaches
// the contrast ratio against the background, and no further, so the host's
// color stays as close to what they picked as legibility allows.
function shiftToContrast(
  accent: string,
  background: string,
  min: number,
  toward: "black" | "white"
) {
  const [r, g, b] = parseHex(accent);
  const target = toward === "black" ? 0 : 255;
  for (let step = 0; step <= 20; step++) {
    const t = step / 20;
    const candidate = toHex([
      r + (target - r) * t,
      g + (target - g) * t,
      b + (target - b) * t,
    ]);
    if (contrastRatio(candidate, background) >= min) return candidate;
  }
  return toward === "black" ? "#000000" : "#ffffff";
}

// The backgrounds are deliberately the *hardest* ones a theme uses (darkest
// cream for light mode, lightest surface for dark mode), so a color that
// passes here passes on every page and card.
const LIGHT_HARDEST = "#f3ecdc";
const DARK_HARDEST = "#262626";

/**
 * The accent as body-readable text. A host can pick any color: gold on white
 * and navy on black are both unreadable, so text never uses the raw accent.
 */
export function accentInk(accent: string, mode: BoardMode = "light") {
  return mode === "light"
    ? shiftToContrast(accent, LIGHT_HARDEST, 4.5, "black")
    : shiftToContrast(accent, DARK_HARDEST, 4.5, "white");
}

/** Black or white, whichever reads better on top of the accent fill. */
export function onAccent(accent: string) {
  // Soft near-black looks nicer, but for mid-tone accents only true black (or
  // white) reaches 4.5:1, so fall back to it.
  const dark = contrastRatio("#111111", accent) >= 4.5 ? "#111111" : "#000000";
  return contrastRatio(dark, accent) >= contrastRatio("#ffffff", accent)
    ? dark
    : "#ffffff";
}

/**
 * The accent for outlines and rules: moved only as far as needed to stay
 * visible, so a pale accent (light mode) or a deep one (dark mode) doesn't make
 * borders disappear. Fills keep the true accent.
 */
export function accentEdge(accent: string, mode: BoardMode = "light") {
  return mode === "light"
    ? shiftToContrast(accent, "#ffffff", 1.8, "black")
    : shiftToContrast(accent, "#171717", 1.8, "white");
}

export function accentCssVars(
  accent: string,
  mode: BoardMode = "light"
): CSSProperties {
  const dark = mode === "dark";
  return {
    "--accent": accent,
    "--accent-edge": accentEdge(accent, mode),
    "--accent-ink": accentInk(accent, mode),
    "--on-accent": onAccent(accent),
    "--accent-soft": hexToRgba(accent, dark ? 0.15 : 0.14),
    "--accent-glow": hexToRgba(accent, dark ? 0.45 : 0.4),
    "--accent-border": hexToRgba(accent, dark ? 0.5 : 0.65),
  } as CSSProperties;
}

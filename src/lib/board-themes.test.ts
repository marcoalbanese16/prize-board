import { describe, expect, it } from "vitest";
import {
  accentCssVars,
  accentEdge,
  accentInk,
  BOARD_THEMES,
  contrastRatio,
  isBoardMode,
  onAccent,
} from "@/lib/board-themes";

// The lightest and darkest page backgrounds the light themes use.
const PAGE_COLORS = ["#ffffff", "#fafafa", "#faf6ee", "#fff8ec"];
const PRESETS = ["#fbbf24", "#38bdf8", "#ec4899", "#22c55e", "#a855f7", "#ef4444"];
const EXTREMES = ["#ffffff", "#000000", "#ffff00", "#fffde7", "#00ffff", "#808080"];

describe("accentInk (accent used as text on a light page)", () => {
  it.each([...PRESETS, ...EXTREMES, ...BOARD_THEMES.map((t) => t.defaultAccent)])(
    "is readable on every page color for %s",
    (accent) => {
      const ink = accentInk(accent);
      for (const page of PAGE_COLORS) {
        expect(contrastRatio(ink, page)).toBeGreaterThanOrEqual(4.5);
      }
    }
  );

  it("keeps a dark accent unchanged", () => {
    expect(accentInk("#7f1d1d")).toBe("#7f1d1d");
  });

  it("darkens gold instead of leaving unreadable yellow text", () => {
    expect(accentInk("#fbbf24")).not.toBe("#fbbf24");
  });

  it("stays readable across the whole color wheel", () => {
    for (let hue = 0; hue < 360; hue += 15) {
      for (const [s, l] of [[100, 50], [100, 75], [60, 85], [100, 95]]) {
        const accent = hslToHex(hue, s, l);
        expect(contrastRatio(accentInk(accent), "#ffffff")).toBeGreaterThanOrEqual(4.5);
      }
    }
  });
});

describe("onAccent (text placed on an accent fill)", () => {
  it("always gives readable text, for any accent", () => {
    for (let hue = 0; hue < 360; hue += 10) {
      for (const [s, l] of [[100, 50], [100, 70], [70, 30], [100, 90]]) {
        const accent = hslToHex(hue, s, l);
        expect(contrastRatio(onAccent(accent), accent)).toBeGreaterThanOrEqual(4.5);
      }
    }
  });

  it("uses dark text on gold and light text on deep blue", () => {
    expect(onAccent("#fbbf24")).toBe("#111111");
    expect(onAccent("#1e3a8a")).toBe("#ffffff");
  });
});

describe("accentEdge (outlines and rules)", () => {
  it.each([...PRESETS, ...EXTREMES])("stays visible on white for %s", (accent) => {
    expect(contrastRatio(accentEdge(accent), "#ffffff")).toBeGreaterThanOrEqual(1.8);
  });

  it("leaves an already-visible accent essentially alone", () => {
    expect(accentEdge("#ec4899")).toBe("#ec4899");
  });

  it("is far lighter-touch than the text ink (outlines, not body copy)", () => {
    expect(contrastRatio(accentEdge("#fbbf24"), "#ffffff")).toBeLessThan(
      contrastRatio(accentInk("#fbbf24"), "#ffffff")
    );
  });
});

// Every dark page and card color the dark themes use.
const DARK_SURFACES = ["#000000", "#0a0a0a", "#0c0c0d", "#171717", "#1c0e10", "#262626"];

describe("dark mode", () => {
  it.each([...PRESETS, ...EXTREMES])("ink is readable on every dark surface for %s", (accent) => {
    const ink = accentInk(accent, "dark");
    for (const surface of DARK_SURFACES) {
      expect(contrastRatio(ink, surface)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it.each([...PRESETS, ...EXTREMES])("edge stays visible on dark surfaces for %s", (accent) => {
    const edge = accentEdge(accent, "dark");
    for (const surface of ["#000000", "#0a0a0a", "#171717"]) {
      expect(contrastRatio(edge, surface)).toBeGreaterThanOrEqual(1.8);
    }
  });

  it("lightens a deep accent instead of leaving it invisible on black", () => {
    expect(accentInk("#1e3a8a", "dark")).not.toBe("#1e3a8a");
    expect(contrastRatio(accentInk("#1e3a8a", "dark"), "#0a0a0a")).toBeGreaterThanOrEqual(4.5);
  });

  it("leaves an already-bright accent alone", () => {
    expect(accentInk("#fbbf24", "dark")).toBe("#fbbf24");
    expect(accentEdge("#fbbf24", "dark")).toBe("#fbbf24");
  });

  it("stays readable across the whole color wheel", () => {
    for (let hue = 0; hue < 360; hue += 15) {
      for (const [s, l] of [[100, 50], [100, 20], [60, 10], [100, 5], [100, 75]]) {
        const accent = hslToHex(hue, s, l);
        expect(contrastRatio(accentInk(accent, "dark"), "#262626")).toBeGreaterThanOrEqual(4.5);
        expect(contrastRatio(accentEdge(accent, "dark"), "#171717")).toBeGreaterThanOrEqual(1.8);
      }
    }
  });

  it("uses different ink for the same accent in light and dark", () => {
    expect(accentInk("#fbbf24", "light")).not.toBe(accentInk("#fbbf24", "dark"));
  });

  it("accentCssVars follows the mode", () => {
    const light = accentCssVars("#1e3a8a", "light") as Record<string, string>;
    const dark = accentCssVars("#1e3a8a", "dark") as Record<string, string>;
    expect(light["--accent-ink"]).toBe("#1e3a8a");
    expect(dark["--accent-ink"]).not.toBe("#1e3a8a");
    expect(dark["--accent"]).toBe("#1e3a8a");
  });

  it("recognises valid modes only", () => {
    expect(isBoardMode("light")).toBe(true);
    expect(isBoardMode("dark")).toBe(true);
    expect(isBoardMode("sepia")).toBe(false);
    expect(isBoardMode(undefined)).toBe(false);
  });
});

describe("accentCssVars", () => {
  it("exposes the raw accent, readable ink and on-accent colors", () => {
    const vars = accentCssVars("#fbbf24") as Record<string, string>;
    expect(vars["--accent"]).toBe("#fbbf24");
    expect(vars["--accent-ink"]).toMatch(/^#[0-9a-f]{6}$/);
    expect(vars["--on-accent"]).toBe("#111111");
  });
});

function hslToHex(h: number, s: number, l: number) {
  const sat = s / 100;
  const light = l / 100;
  const a = sat * Math.min(light, 1 - light);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const c = light - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return Math.round(255 * c)
      .toString(16)
      .padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

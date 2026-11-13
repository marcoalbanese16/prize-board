import { describe, expect, it } from "vitest";
import { decodeBoard, encodeBoard, type BoardData } from "@/lib/board-data";

const board = (overrides: Partial<BoardData> = {}): BoardData => ({
  title: "Sarah & Mike's Stag & Doe",
  date: "2026-12-05",
  theme: "neon",
  mode: "light",
  accent: "#ec4899",
  showList: false,
  winners: [
    { ticket: "0719054", prize: "$50 Gift Card" },
    { ticket: "2370279", prize: "Spa Day, Deluxe 🎁 Café" },
  ],
  ...overrides,
});

// Re-encodes a hand-built payload the way the app does (compressed or plain).
async function encodeRaw(payload: unknown) {
  const raw = new TextEncoder().encode(JSON.stringify(payload));
  const b64 = (bytes: Uint8Array) =>
    btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  return "p" + b64(raw);
}

describe("encode/decode round trip", () => {
  it("preserves every field, including unicode", async () => {
    const original = board();
    expect(await decodeBoard(await encodeBoard(original))).toEqual(original);
  });

  it("round-trips dark mode", async () => {
    const dark = board({ mode: "dark" });
    expect((await decodeBoard(await encodeBoard(dark)))?.mode).toBe("dark");
  });

  it("round-trips light mode", async () => {
    expect((await decodeBoard(await encodeBoard(board({ mode: "light" }))))?.mode).toBe("light");
  });

  it("round-trips a board with no date", async () => {
    expect((await decodeBoard(await encodeBoard(board({ date: null }))))?.date).toBeNull();
  });

  it("handles a large board", async () => {
    const winners = Array.from({ length: 2000 }, (_, i) => ({
      ticket: String(1000000 + i),
      prize: `Prize number ${i}`,
    }));
    const decoded = await decodeBoard(await encodeBoard(board({ winners })));
    expect(decoded?.winners).toHaveLength(2000);
    expect(decoded?.winners[1999]).toEqual(winners[1999]);
  });

  it("keeps light-mode links shorter than dark ones by omitting the flag", async () => {
    const light = await encodeBoard(board({ mode: "light", winners: [] }));
    const dark = await encodeBoard(board({ mode: "dark", winners: [] }));
    expect(light.length).toBeLessThanOrEqual(dark.length);
  });
});

describe("older and hand-edited links", () => {
  const base = { t: "Old board", th: "classic", a: "#38bdf8", l: 1, w: [["1", "A"]] };

  it("treats a link with no mode as light", async () => {
    expect((await decodeBoard(await encodeRaw(base)))?.mode).toBe("light");
  });

  it("falls back to light for an unknown mode", async () => {
    expect((await decodeBoard(await encodeRaw({ ...base, m: "sepia" })))?.mode).toBe("light");
  });

  it("falls back to safe defaults for a bad theme or accent", async () => {
    const decoded = await decodeBoard(await encodeRaw({ ...base, th: "rainbow", a: "red; background:url(x)" }));
    expect(decoded?.theme).toBe("carnival");
    expect(decoded?.accent).toBe("#fbbf24");
  });

  it("drops malformed winner rows instead of failing", async () => {
    const decoded = await decodeBoard(await encodeRaw({ ...base, w: [["1", "A"], ["2"], [3, "x"], "nope", ["4", "D"]] }));
    expect(decoded?.winners).toEqual([
      { ticket: "1", prize: "A" },
      { ticket: "4", prize: "D" },
    ]);
  });
});

describe("broken links", () => {
  it.each([
    ["empty", ""],
    ["unknown format", "xabc"],
    ["not base64", "z!!!!"],
    ["truncated data", "zHcm7DoJAEAXQX5lcLafg"],
    ["valid base64 but not JSON", "pYWJj"],
  ])("returns null for %s", async (_name, link) => {
    expect(await decodeBoard(link)).toBeNull();
  });

  it("rejects a payload missing the title or winners", async () => {
    expect(await decodeBoard(await encodeRaw({ th: "classic" }))).toBeNull();
    expect(await decodeBoard(await encodeRaw({ t: "x", w: "nope" }))).toBeNull();
  });
});

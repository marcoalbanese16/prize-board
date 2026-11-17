import { describe, expect, it } from "vitest";
import { buildBoard, type BuildInput } from "@/lib/build-board";

const SHEET = { kind: "sheet", id: "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms", gid: null } as const;

const input = (overrides: Partial<BuildInput> = {}): BuildInput => ({
  title: "Hall Raffle",
  date: "",
  theme: "carnival",
  mode: "light",
  accent: "#fbbf24",
  showList: true,
  winners: [{ ticket: "1", prize: "A" }],
  liveMode: false,
  sheetRef: null,
  ...overrides,
});

describe("buildBoard: final results", () => {
  it("builds a snapshot with the winners", () => {
    const board = buildBoard(input());
    expect(board?.sheet).toBeNull();
    expect(board?.winners).toHaveLength(1);
  });

  it("needs a title and at least one winner", () => {
    expect(buildBoard(input({ title: "  " }))).toBeNull();
    expect(buildBoard(input({ winners: [] }))).toBeNull();
  });

  it("trims the title and turns an empty date into null", () => {
    const board = buildBoard(input({ title: "  Hall Raffle ", date: "" }));
    expect(board?.title).toBe("Hall Raffle");
    expect(board?.date).toBeNull();
  });

  it("ignores a sheet link entirely when not live", () => {
    expect(buildBoard(input({ sheetRef: SHEET }))?.sheet).toBeNull();
  });
});

describe("buildBoard: live", () => {
  it("builds a board that reads from the sheet and carries no winners", () => {
    const board = buildBoard(input({ liveMode: true, sheetRef: SHEET, winners: [] }));
    expect(board?.sheet).toEqual(SHEET);
    expect(board?.winners).toEqual([]);
  });

  it("works with no winners yet, which is the whole point before the draw", () => {
    expect(buildBoard(input({ liveMode: true, sheetRef: SHEET, winners: [] }))).not.toBeNull();
  });

  it("never carries leftover winners from the box into a live board", () => {
    const board = buildBoard(
      input({ liveMode: true, sheetRef: SHEET, winners: Array.from({ length: 300 }, (_, i) => ({ ticket: String(i), prize: "P" })) })
    );
    expect(board?.winners).toEqual([]);
  });

  it("gives NO board when the sheet link is invalid, instead of silently falling back to a snapshot", () => {
    // Regression: a QR code appeared for a Google Doc link because live mode
    // fell back to building a frozen snapshot from the winners box.
    expect(
      buildBoard(input({ liveMode: true, sheetRef: null, winners: [{ ticket: "1", prize: "A" }] }))
    ).toBeNull();
  });

  it("still needs a title", () => {
    expect(buildBoard(input({ liveMode: true, sheetRef: SHEET, title: "" }))).toBeNull();
  });
});

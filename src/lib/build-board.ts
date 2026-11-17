import type { BoardData, Winner } from "@/lib/board-data";
import type { BoardMode, BoardTheme } from "@/lib/board-themes";
import type { SheetRef } from "@/lib/sheets";

export type BuildInput = {
  title: string;
  date: string;
  theme: BoardTheme;
  mode: BoardMode;
  accent: string;
  showList: boolean;
  winners: Winner[];
  /** The host chose a live board (results come from a Google Sheet). */
  liveMode: boolean;
  /** The sheet link, if what the host pasted is a valid one. */
  sheetRef: SheetRef | null;
};

/**
 * What the builder will turn into a link, or null if it can't yet.
 *
 * A live board NEVER falls back to a snapshot: if the host chose live but the
 * sheet link isn't valid, they get no link at all. Otherwise they could print
 * a QR code that looks live but is really a frozen copy of whatever happened to
 * be in the winners box.
 */
export function buildBoard(input: BuildInput): BoardData | null {
  const title = input.title.trim();
  if (!title) return null;

  const common = {
    title,
    date: input.date || null,
    theme: input.theme,
    mode: input.mode,
    accent: input.accent,
    showList: input.showList,
  };

  if (input.liveMode) {
    if (!input.sheetRef) return null;
    return { ...common, sheet: input.sheetRef, winners: [] };
  }

  if (input.winners.length === 0) return null;
  return { ...common, sheet: null, winners: input.winners };
}

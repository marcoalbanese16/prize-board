import {
  BOARD_THEMES,
  isBoardMode,
  isBoardTheme,
  type BoardMode,
  type BoardTheme,
} from "@/lib/board-themes";
import type { SheetRef } from "@/lib/sheets";

// A board has no server behind it: everything lives in the link's #fragment
// (which browsers never send to any server), compressed and base64url-encoded.

export type Winner = { ticket: string; prize: string };

export type BoardData = {
  title: string;
  date: string | null;
  theme: BoardTheme;
  mode: BoardMode;
  accent: string;
  showList: boolean;
  /**
   * When set, this is a live board: guests' browsers read the winners from this
   * Google Sheet. The link then holds only the sheet reference (never the
   * winners), so it stays identical, and a printed QR code stays valid, no
   * matter how many winners are added later.
   */
  sheet: SheetRef | null;
  winners: Winner[];
};

type Wire = {
  t: string;
  d?: string;
  th: string;
  /** "dark"; omitted for light so older and lighter links stay short. */
  m?: BoardMode;
  a: string;
  l: 0 | 1;
  /** Live sheet: ["s" | "p", id-or-pubId, gid?]. */
  sh?: ["s" | "p", string, string?];
  w: [string, string][];
};

const MAX_WINNERS = 10000;
const HEX = /^#[0-9a-f]{6}$/i;

function toBase64Url(bytes: Uint8Array) {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(text: string) {
  const b64 = text.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64 + "=".repeat((4 - (b64.length % 4)) % 4));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

async function pipe(
  bytes: Uint8Array,
  stream: CompressionStream | DecompressionStream
) {
  const out = new Blob([bytes as BlobPart]).stream().pipeThrough(stream);
  return new Uint8Array(await new Response(out).arrayBuffer());
}

const canCompress =
  typeof CompressionStream !== "undefined" &&
  typeof DecompressionStream !== "undefined";

const SHEET_ID = /^[\w-]{10,200}$/;
const GID = /^\d{1,20}$/;

function sheetToWire(sheet: SheetRef): NonNullable<Wire["sh"]> {
  const kind = sheet.kind === "published" ? "p" : "s";
  const id = sheet.kind === "published" ? sheet.pubId : sheet.id;
  return sheet.gid ? [kind, id, sheet.gid] : [kind, id];
}

/** Returns undefined for "no sheet", null for a malformed one. */
function sheetFromWire(raw: unknown): SheetRef | null | undefined {
  if (raw === undefined) return undefined;
  if (!Array.isArray(raw)) return null;
  const [kind, id, gid] = raw;
  if (kind !== "s" && kind !== "p") return null;
  if (typeof id !== "string" || !SHEET_ID.test(id)) return null;
  if (gid !== undefined && !(typeof gid === "string" && GID.test(gid))) return null;
  const tab = gid ?? null;
  return kind === "p"
    ? { kind: "published", pubId: id, gid: tab }
    : { kind: "sheet", id, gid: tab };
}

// "z" = deflate-compressed, "p" = plain (browsers without CompressionStream).
export async function encodeBoard(board: BoardData): Promise<string> {
  const wire: Wire = {
    t: board.title,
    ...(board.date ? { d: board.date } : {}),
    th: board.theme,
    ...(board.mode === "dark" ? { m: "dark" as const } : {}),
    a: board.accent,
    l: board.showList ? 1 : 0,
    ...(board.sheet ? { sh: sheetToWire(board.sheet) } : {}),
    // A live board's winners come from the sheet, so they never go in the link.
    w: board.sheet ? [] : board.winners.map((w) => [w.ticket, w.prize]),
  };
  const raw = new TextEncoder().encode(JSON.stringify(wire));
  if (!canCompress) return "p" + toBase64Url(raw);
  return "z" + toBase64Url(await pipe(raw, new CompressionStream("deflate-raw")));
}

export async function decodeBoard(encoded: string): Promise<BoardData | null> {
  try {
    const kind = encoded[0];
    let bytes = fromBase64Url(encoded.slice(1));
    if (kind === "z") {
      if (!canCompress) return null;
      bytes = await pipe(bytes, new DecompressionStream("deflate-raw"));
    } else if (kind !== "p") {
      return null;
    }
    const wire = JSON.parse(new TextDecoder().decode(bytes)) as Wire;

    if (typeof wire.t !== "string" || !Array.isArray(wire.w)) return null;
    const winners: Winner[] = [];
    for (const row of wire.w.slice(0, MAX_WINNERS)) {
      if (
        Array.isArray(row) &&
        typeof row[0] === "string" &&
        typeof row[1] === "string"
      ) {
        winners.push({ ticket: row[0], prize: row[1] });
      }
    }

    const sheet = sheetFromWire(wire.sh);
    // A live link whose sheet reference is damaged can never work; call it
    // broken rather than showing a board that is silently empty.
    if (sheet === null) return null;

    return {
      title: wire.t,
      date: typeof wire.d === "string" ? wire.d : null,
      theme: isBoardTheme(wire.th) ? wire.th : "carnival",
      mode: isBoardMode(wire.m) ? wire.m : "light",
      accent: HEX.test(wire.a) ? wire.a : BOARD_THEMES[0].defaultAccent,
      showList: wire.l !== 0,
      sheet: sheet ?? null,
      winners,
    };
  } catch {
    return null;
  }
}

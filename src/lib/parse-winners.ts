import Papa from "papaparse";
import type { Winner } from "@/lib/board-data";

export type Note = { level: "info" | "warn"; text: string };
export type SkippedRow = { row: number; text: string; reason: string };

export type ParseResult = {
  winners: Winner[];
  /** Rows that couldn't be used, with the reason, so the host can fix them. */
  skipped: SkippedRow[];
  notes: Note[];
  /** Header labels that were used, when the data had a header row. */
  columns: { ticket: string; prize: string } | null;
  /**
   * Set when many ticket numbers have the same digit count and a few are
   * shorter, which is what Google Sheets does by dropping leading zeros.
   */
  padWidth: number | null;
};

const INVISIBLES = /[​-‍⁠﻿]/g;
const SHEET_ERROR =
  /^#(N\/A|REF!|VALUE!|NAME\?|DIV\/0!|NUM!|NULL!|ERROR!|SPILL!|CALC!)/i;
const HEADER_SCAN_ROWS = 10;

/** Collapses a cell to one tidy line (handles nbsp, zero-width chars, newlines). */
export function cleanCell(value: string | undefined): string {
  return (value ?? "")
    .replace(/ /g, " ")
    .replace(INVISIBLES, "")
    .replace(/\s+/g, " ")
    .trim();
}

const isDigits = (value: string) => /^\d+$/.test(value);
const count = (text: string, char: string) => text.split(char).length - 1;

// Google Sheets copies as tab-separated; downloaded CSVs use commas (some
// regional exports use semicolons).
function detectDelimiter(text: string): string {
  const lines = text
    .split(/\r?\n/)
    .filter((line) => line.trim())
    .slice(0, 30);
  if (lines.some((line) => line.includes("\t"))) return "\t";
  let commas = 0;
  let semicolons = 0;
  for (const line of lines) {
    commas += count(line, ",");
    semicolons += count(line, ";");
  }
  return semicolons > commas ? ";" : ",";
}

function parseRows(text: string, delimiter: string) {
  const run = (quoteChar: string) =>
    Papa.parse<string[]>(text, { delimiter, quoteChar, skipEmptyLines: false });
  const first = run('"');
  if (!first.errors.some((error) => error.type === "Quotes")) {
    return { rows: first.data, quoteTrouble: false };
  }
  // An unpaired quote would swallow every row after it; read the text as-is.
  return { rows: run("\u0001").data, quoteTrouble: true };
}

function normalizeLabel(cell: string) {
  return cleanCell(cell)
    .toLowerCase()
    .replace(/[_\-.]+/g, " ")
    .trim();
}

// For the "only one column is labelled" fallback, where a mistake would drop a
// real winner, accept only labels that are nothing but a header word. A prize
// named "Gift Card" must never be mistaken for a header.
function bareHeaderKind(cell: string): "ticket" | "prize" | null {
  const label = normalizeLabel(cell);
  if (/^(tickets?|ticket (number|no|#)|number|no|#|winning (number|ticket))$/.test(label)) {
    return "ticket";
  }
  if (/^(prizes?|prize (name|description)|items?|item name|description|reward|award)$/.test(label)) {
    return "prize";
  }
  return null;
}

function headerKind(cell: string): "ticket" | "prize" | null {
  const label = normalizeLabel(cell);
  if (!label) return null;
  if (/\bticket/.test(label)) return "ticket";
  if (/\b(prize|item|gift|reward|award|description|donat)/.test(label)) {
    return "prize";
  }
  if (/^(winning |winner )?(number|no|#)$/.test(label)) return "ticket";
  return null;
}

type Header = {
  index: number;
  ticket: number;
  prize: number;
  /** Only one of the two columns was labelled; the other was inferred. */
  inferred: "ticket" | "prize" | null;
};

function firstOtherColumn(row: string[], exclude: number) {
  return row.findIndex((cell, i) => i !== exclude && cleanCell(cell) !== "");
}

function findHeader(rows: string[][]): Header | null {
  const limit = Math.min(rows.length, HEADER_SCAN_ROWS);

  for (let i = 0; i < limit; i++) {
    const kinds = rows[i].map(headerKind);
    const ticket = kinds.indexOf("ticket");
    const prize = kinds.findIndex((kind, col) => kind === "prize" && col !== ticket);
    // Header labels don't contain digits; "Ticket 12" is a ticket, not a label.
    if (
      ticket !== -1 &&
      prize !== -1 &&
      !/\d/.test(cleanCell(rows[i][ticket])) &&
      !/\d/.test(cleanCell(rows[i][prize]))
    ) {
      return { index: i, ticket, prize, inferred: null };
    }
  }

  // Only one column is labelled ("Ticket" and "Winner", say): accept it when the
  // first row clearly isn't data.
  const first = rows.findIndex((row) => row.some((cell) => cleanCell(cell)));
  if (first !== -1 && first < limit) {
    const row = rows[first];
    if (row.some((cell) => isDigits(cleanCell(cell)))) return null;
    const kinds = row.map(bareHeaderKind);
    const ticket = kinds.indexOf("ticket");
    const prize = kinds.indexOf("prize");
    if (ticket !== -1 && prize === -1) {
      const other = firstOtherColumn(row, ticket);
      if (other !== -1) return { index: first, ticket, prize: other, inferred: "prize" };
    }
    if (prize !== -1 && ticket === -1) {
      const other = firstOtherColumn(row, prize);
      if (other !== -1) return { index: first, ticket: other, prize, inferred: "ticket" };
    }
  }
  return null;
}

/** Width of a row ignoring trailing empty cells. */
function widthOf(cells: string[]) {
  let width = cells.length;
  while (width > 0 && cleanCell(cells[width - 1]) === "") width--;
  return width;
}

function fixTicket(raw: string) {
  let ticket = raw;
  let regrouped = false;
  let decimal = false;

  // Sheets' "text" prefix: '0719054
  if (/^'\d/.test(ticket)) ticket = ticket.slice(1);
  // Number formatting added thousands separators: 1,234,567
  if (/^\d{1,3}(,\d{3})+$/.test(ticket)) {
    ticket = ticket.replace(/,/g, "");
    regrouped = true;
  }
  // Exported as a decimal: 719054.0
  if (/^\d+\.0+$/.test(ticket)) {
    ticket = ticket.replace(/\.0+$/, "");
    decimal = true;
  }
  const scientific = /^\d(\.\d+)?e[+-]?\d+$/i.test(ticket);
  return { ticket, regrouped, decimal, scientific };
}

export function parseWinners(input: string): ParseResult {
  const result: ParseResult = {
    winners: [],
    skipped: [],
    notes: [],
    columns: null,
    padWidth: null,
  };
  const text = input.replace(/^﻿/, "");
  if (!text.trim()) return result;

  const note = (level: Note["level"], message: string) =>
    result.notes.push({ level, text: message });

  const delimiter = detectDelimiter(text);
  const { rows, quoteTrouble } = parseRows(text, delimiter);
  if (quoteTrouble) {
    note(
      "warn",
      "Some quote marks (\") didn't pair up, so that text was read as typed. Check the preview below."
    );
  }

  // --- Which columns hold the ticket and the prize? ---
  const header = findHeader(rows);
  let ticketCol = 0;
  let prizeCol = 1;
  let firstDataRow = 0;
  let joinExtraAsPrize = false;
  let swapped = false;

  if (header) {
    ticketCol = header.ticket;
    prizeCol = header.prize;
    firstDataRow = header.index + 1;
    const labels = rows[header.index];
    result.columns = {
      ticket: cleanCell(labels[ticketCol]),
      prize: cleanCell(labels[prizeCol]),
    };

    const ignoredAbove = rows
      .slice(0, header.index)
      .filter((row) => row.some((cell) => cleanCell(cell))).length;
    if (ignoredAbove > 0) {
      note(
        "info",
        `Ignored ${ignoredAbove} row${ignoredAbove === 1 ? "" : "s"} above the header (titles or notes).`
      );
    }
    if (header.inferred) {
      note(
        "warn",
        header.inferred === "prize"
          ? `No column is labelled "Prize", so I used "${result.columns.prize}" for prizes. Check the preview.`
          : `No column is labelled "Ticket", so I used "${result.columns.ticket}" for tickets. Check the preview.`
      );
    }
    const extras = labels
      .map((label, col) => ({ label: cleanCell(label), col }))
      .filter(({ col, label }) => col !== ticketCol && col !== prizeCol && label);
    if (extras.length > 0) {
      note(
        "info",
        `Ignored other columns: ${extras.map((e) => `"${e.label}"`).join(", ")}.`
      );
    }
  } else {
    const dataRows = rows.filter((row) => row.some((cell) => cleanCell(cell)));
    const widths = new Set(dataRows.map(widthOf));
    const wide = dataRows.some((row) => widthOf(row) > 2);

    if (wide && delimiter === "," && widths.size > 1) {
      // Some rows have extra commas, which is usually a prize like "Spa, Deluxe"
      // that wasn't quoted.
      joinExtraAsPrize = true;
      note("info", "Some rows had extra commas, so everything after the ticket was read as the prize.");
    } else if (wide) {
      note("info", "Only the first two columns were used (ticket, then prize).");
    }

    // A header with labels we don't recognise ("Raffle No.", "Won"): the first
    // row has no digits in the ticket column while every row after it does.
    let body = dataRows;
    const rest = dataRows.slice(1);
    if (rest.length >= 2) {
      const first = dataRows[0];
      const numericShare = (col: number) =>
        rest.filter((row) => isDigits(cleanCell(row[col]))).length / rest.length;
      const unlabelled = [0, 1].some(
        (col) => numericShare(col) >= 0.8 && !/\d/.test(cleanCell(first[col]))
      );
      if (unlabelled) {
        body = rest;
        firstDataRow = rows.indexOf(first) + 1;
        note(
          "info",
          `Skipped the first row (“${first.map(cleanCell).join(" | ").slice(0, 60)}”), which looked like a header.`
        );
      }
    }

    const pairs = body.filter((row) => widthOf(row) >= 2);
    if (
      pairs.length > 0 &&
      pairs.every((row) => {
        const a = cleanCell(row[0]);
        const b = cleanCell(row[1]);
        return /[a-z]/i.test(a) && !isDigits(a) && isDigits(b);
      })
    ) {
      swapped = true;
      ticketCol = 1;
      prizeCol = 0;
      note("info", "The columns looked reversed (prize, then ticket), so I swapped them.");
    }
  }

  // --- Turn rows into winners ---
  const seen = new Map<string, number>();
  let regrouped = 0;
  let decimals = 0;
  let scientific = 0;
  let duplicates = 0;

  for (let i = firstDataRow; i < rows.length; i++) {
    const cells = rows[i];
    const rowNumber = i + 1;
    if (!cells.some((cell) => cleanCell(cell))) continue;

    const rawTicket = cleanCell(cells[ticketCol]);
    const rawPrize =
      joinExtraAsPrize && !swapped
        ? cells
            .slice(prizeCol)
            .map(cleanCell)
            .filter(Boolean)
            .join(", ")
        : cleanCell(cells[prizeCol]);

    const skip = (reason: string) =>
      result.skipped.push({
        row: rowNumber,
        text: cells.map(cleanCell).join(delimiter === "\t" ? " | " : ", ").slice(0, 80),
        reason,
      });

    if (SHEET_ERROR.test(rawTicket) || SHEET_ERROR.test(rawPrize)) {
      skip("the spreadsheet shows an error in this row");
      continue;
    }
    if (!rawTicket) {
      skip("no ticket number");
      continue;
    }
    if (!rawPrize) {
      skip("no prize");
      continue;
    }

    const fixed = fixTicket(rawTicket);
    if (fixed.regrouped) regrouped++;
    if (fixed.decimal) decimals++;
    if (fixed.scientific) scientific++;

    const key = `${fixed.ticket.toLowerCase().replace(/\s+/g, "")}|${rawPrize.toLowerCase()}`;
    seen.set(key, (seen.get(key) ?? 0) + 1);
    result.winners.push({ ticket: fixed.ticket, prize: rawPrize });
  }

  for (const times of seen.values()) if (times > 1) duplicates += times - 1;

  // --- Things worth telling the host ---
  if (result.skipped.length > 0) {
    const n = result.skipped.length;
    note("warn", `${n} row${n === 1 ? " was" : "s were"} skipped. See which ones below.`);
  }
  if (regrouped > 0) {
    note("info", `Removed thousands separators from ${regrouped} ticket number${regrouped === 1 ? "" : "s"} (1,234 became 1234).`);
  }
  if (decimals > 0) {
    note("info", `Removed a trailing ".0" from ${decimals} ticket number${decimals === 1 ? "" : "s"}.`);
  }
  if (scientific > 0) {
    note(
      "warn",
      `${scientific} ticket number${scientific === 1 ? " looks" : "s look"} like scientific notation (1.2E+13). In Google Sheets, select the column and choose Format → Number → Plain text, then copy again.`
    );
  }
  if (duplicates > 0) {
    note(
      "warn",
      `${duplicates} row${duplicates === 1 ? " is" : "s are"} an exact repeat of an earlier row (same ticket and prize). They were kept; delete them if they're accidental.`
    );
  }

  const byTicket = new Map<string, number>();
  for (const w of result.winners) {
    const key = w.ticket.toLowerCase().replace(/\s+/g, "");
    byTicket.set(key, (byTicket.get(key) ?? 0) + 1);
  }
  const multi = [...byTicket.values()].filter((n) => n > 1).length;
  if (multi > 0) {
    note(
      "info",
      `${multi} ticket${multi === 1 ? " wins" : "s win"} more than one prize; the board shows all of them.`
    );
  }

  // Google Sheets drops leading zeros from numbers (0719054 becomes 719054).
  // When most zero-led tickets lose theirs, the survivors at full width can be
  // the minority, so don't require the long ones to dominate. Matching never
  // depends on this (see findMatches); it only offers to restore the zeros.
  const digitTickets = result.winners.map((w) => w.ticket).filter(isDigits);
  if (digitTickets.length > 0) {
    const width = Math.max(...digitTickets.map((t) => t.length));
    const shorter = digitTickets.filter(
      (t) => t.length < width && t.length >= width - 2
    );
    if (width >= 6 && shorter.length > 0) {
      const long = digitTickets.find((t) => t.length === width)!;
      result.padWidth = width;
      note(
        "warn",
        `${shorter.length} ticket number${shorter.length === 1 ? " is" : "s are"} shorter than others (like ${shorter[0]} next to ${long}). If your tickets have leading zeros, Google Sheets removed them. Guests who type the zero will still match, but the winner card would show it without. Use the button below to put them back.`
      );
    }
  }

  return result;
}

/** Puts back leading zeros on tickets that look like Sheets stripped them. */
export function padTicketNumbers(winners: Winner[], width: number): Winner[] {
  return winners.map((w) =>
    isDigits(w.ticket) && w.ticket.length < width && w.ticket.length >= width - 2
      ? { ...w, ticket: w.ticket.padStart(width, "0") }
      : w
  );
}

/** Canonical text for the winners box (with a header, so it re-parses exactly). */
export function winnersToText(winners: Winner[], swap = false): string {
  return Papa.unparse(
    [
      ["ticket_number", "prize_name"],
      ...winners.map((w) => (swap ? [w.prize, w.ticket] : [w.ticket, w.prize])),
    ],
    { newline: "\n" }
  );
}

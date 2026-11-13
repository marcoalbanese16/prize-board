import { describe, expect, it } from "vitest";
import {
  padTicketNumbers,
  parseWinners,
  winnersToText,
} from "@/lib/parse-winners";

const tickets = (text: string) => parseWinners(text).winners.map((w) => w.ticket);
const prizes = (text: string) => parseWinners(text).winners.map((w) => w.prize);
const noteText = (text: string) => parseWinners(text).notes.map((n) => n.text).join("\n");

describe("basic shapes", () => {
  it("reads CSV with the template header", () => {
    const r = parseWinners("ticket_number,prize_name\n0719054,$50 Gift Card\n0383699,Bottle of Wine");
    expect(r.winners).toEqual([
      { ticket: "0719054", prize: "$50 Gift Card" },
      { ticket: "0383699", prize: "Bottle of Wine" },
    ]);
    expect(r.skipped).toEqual([]);
    expect(r.columns).toEqual({ ticket: "ticket_number", prize: "prize_name" });
  });

  it("reads CSV with no header", () => {
    const r = parseWinners("0719054,$50 Gift Card\n0383699,Bottle of Wine");
    expect(r.winners).toHaveLength(2);
    expect(r.columns).toBeNull();
  });

  it("returns nothing for empty or whitespace-only input", () => {
    expect(parseWinners("").winners).toEqual([]);
    expect(parseWinners("  \n\t\n ").winners).toEqual([]);
  });

  it("returns zero winners for a header with no data", () => {
    const r = parseWinners("Ticket,Prize");
    expect(r.winners).toEqual([]);
    expect(r.skipped).toEqual([]);
  });
});

describe("Google Sheets paste (tab-separated)", () => {
  it("reads tab-separated cells copied from Sheets", () => {
    const r = parseWinners("Ticket\tPrize\n0719054\t$50 Gift Card\n0383699\tWine");
    expect(r.winners.map((w) => w.ticket)).toEqual(["0719054", "0383699"]);
  });

  it("keeps commas inside tab-separated prizes", () => {
    const r = parseWinners("0719054\tSpa Day, Deluxe\n0383699\tWine, Cheese, Crackers");
    expect(r.winners.map((w) => w.prize)).toEqual([
      "Spa Day, Deluxe",
      "Wine, Cheese, Crackers",
    ]);
  });

  it("unwraps quoted cells with doubled quotes the way Sheets copies them", () => {
    const r = parseWinners('Ticket\tPrize\n1\t"55"" TV"\n2\t"Line one\nline two"');
    expect(r.winners).toEqual([
      { ticket: "1", prize: '55" TV' },
      { ticket: "2", prize: "Line one line two" },
    ]);
  });
});

describe("quoting and delimiters", () => {
  it("handles quoted commas in CSV", () => {
    expect(prizes('1,"Spa Day, Deluxe"\n2,Wine')).toEqual(["Spa Day, Deluxe", "Wine"]);
  });

  it("reads semicolon-separated exports", () => {
    const r = parseWinners("Ticket;Prize\n0719054;Gift Card\n0383699;Wine");
    expect(r.winners).toHaveLength(2);
    expect(r.winners[0].prize).toBe("Gift Card");
  });

  it("handles Windows line endings", () => {
    expect(tickets("Ticket,Prize\r\n1,A\r\n2,B\r\n")).toEqual(["1", "2"]);
  });

  it("does not let an unpaired quote swallow the rest of the list", () => {
    const r = parseWinners('1,"Unclosed prize\n2,Wine\n3,Cheese');
    expect(r.winners.map((w) => w.ticket)).toEqual(["1", "2", "3"]);
    expect(noteText('1,"Unclosed prize\n2,Wine')).toMatch(/quote/i);
  });

  it("keeps a stray quote in the middle of a prize", () => {
    expect(prizes('1,55" Television\n2,Wine')).toEqual(['55" Television', "Wine"]);
  });
});

describe("header detection", () => {
  it.each([
    ["Ticket #", "Prize Description"],
    ["Winning Number", "Item"],
    ["TICKET", "PRIZE"],
    ["Ticket Number", "Gift"],
    ["Raffle Ticket", "Reward"],
    ["number", "prize"],
  ])("recognises the header %s / %s", (a, b) => {
    const r = parseWinners(`${a},${b}\n0719054,Gift Card`);
    expect(r.winners).toEqual([{ ticket: "0719054", prize: "Gift Card" }]);
    expect(r.columns).not.toBeNull();
  });

  it("works when the prize column comes first", () => {
    const r = parseWinners("Prize,Ticket\nGift Card,0719054\nWine,0383699");
    expect(r.winners).toEqual([
      { ticket: "0719054", prize: "Gift Card" },
      { ticket: "0383699", prize: "Wine" },
    ]);
  });

  it("ignores title rows above the header", () => {
    const r = parseWinners(
      "Stag & Doe Raffle Results\n\nDrawn Nov 5\nTicket,Prize\n0719054,Gift Card"
    );
    expect(r.winners).toEqual([{ ticket: "0719054", prize: "Gift Card" }]);
    expect(noteText("Title row\nTicket,Prize\n1,A")).toMatch(/Ignored 1 row above/);
  });

  it("never puts other columns, like winner names, into the prize", () => {
    const r = parseWinners(
      "Ticket,Winner Name,Prize,Phone\n0719054,Jane Doe,Gift Card,555-1234\n0383699,Bob Roy,Wine,555-9999"
    );
    expect(r.winners).toEqual([
      { ticket: "0719054", prize: "Gift Card" },
      { ticket: "0383699", prize: "Wine" },
    ]);
    expect(JSON.stringify(r.winners)).not.toMatch(/Jane|555/);
    expect(noteText("Ticket,Winner Name,Prize\n1,Jane,A")).toMatch(/Winner Name/);
  });

  it("treats a header with a Prize # column as the prize column", () => {
    const r = parseWinners("PRIZE,TICKET\n1,0719054\n2,0736463");
    expect(r.winners).toEqual([
      { ticket: "0719054", prize: "1" },
      { ticket: "0736463", prize: "2" },
    ]);
  });

  it("warns when only one column is labelled", () => {
    const r = parseWinners("Ticket,Winner\n1,Jane\n2,Bob");
    expect(r.winners).toHaveLength(2);
    expect(noteText("Ticket,Winner\n1,Jane")).toMatch(/No column is labelled "Prize"/);
  });

  it("does not mistake a data row for a header", () => {
    expect(tickets("0719054,Gift Card\n0383699,Wine")).toEqual(["0719054", "0383699"]);
  });

  it("does not treat a first winner as a header just because of its words", () => {
    // Alphanumeric tickets with a prize literally called "Gift Card".
    expect(tickets("A123,Gift Card\nB456,Wine")).toEqual(["A123", "B456"]);
    expect(tickets("Ticket 12,Gift basket\nTicket 40,Wine")).toEqual(["Ticket 12", "Ticket 40"]);
    expect(tickets("A1,Prize Pack\nA2,Item Bundle")).toEqual(["A1", "A2"]);
  });
});

describe("column layout without a header", () => {
  it("swaps columns that are clearly prize-then-ticket", () => {
    const r = parseWinners("Gift Card,0719054\nBottle of Wine,0383699");
    expect(r.winners).toEqual([
      { ticket: "0719054", prize: "Gift Card" },
      { ticket: "0383699", prize: "Bottle of Wine" },
    ]);
    expect(noteText("Gift Card,1\nWine,2")).toMatch(/swapped/);
  });

  it("skips a header whose labels it doesn't recognise", () => {
    const r = parseWinners("Raffle No.,Won\n101,Gift Card\n102,Wine\n103,Cheese");
    expect(r.winners.map((w) => w.ticket)).toEqual(["101", "102", "103"]);
    expect(noteText("Raffle No.,Won\n1,A\n2,B")).toMatch(/Skipped the first row/);
  });

  it("skips an unrecognised header and still swaps reversed columns", () => {
    const r = parseWinners("What they got,Their number\nGift Card,101\nWine,102\nCheese,103");
    expect(r.winners).toEqual([
      { ticket: "101", prize: "Gift Card" },
      { ticket: "102", prize: "Wine" },
      { ticket: "103", prize: "Cheese" },
    ]);
  });

  it("does not skip a first row that is real data", () => {
    expect(tickets("101,Gift Card\n102,Wine\n103,Cheese")).toEqual(["101", "102", "103"]);
    expect(tickets("A1,Gift Card\n102,Wine\n103,Cheese")).toEqual(["A1", "102", "103"]);
  });

  it("does not swap alphanumeric tickets", () => {
    expect(tickets("A123,Gift Card\nB456,Wine")).toEqual(["A123", "B456"]);
  });

  it("joins unquoted commas into the prize when only some rows have them", () => {
    const r = parseWinners("1,Spa Day, Deluxe Package\n2,Wine");
    expect(r.winners).toEqual([
      { ticket: "1", prize: "Spa Day, Deluxe Package" },
      { ticket: "2", prize: "Wine" },
    ]);
  });

  it("uses only the first two columns when every row has extras", () => {
    const r = parseWinners("1,Gift Card,Jane Doe\n2,Wine,Bob Roy");
    expect(r.winners.map((w) => w.prize)).toEqual(["Gift Card", "Wine"]);
    expect(noteText("1,A,Jane\n2,B,Bob")).toMatch(/first two columns/);
  });
});

describe("skipped rows are reported, not silently lost", () => {
  it("skips rows with no prize or no ticket and says which", () => {
    const r = parseWinners("Ticket,Prize\n1,A\n2,\n,C\n4,D");
    expect(r.winners.map((w) => w.ticket)).toEqual(["1", "4"]);
    expect(r.skipped).toEqual([
      expect.objectContaining({ row: 3, reason: "no prize" }),
      expect.objectContaining({ row: 4, reason: "no ticket number" }),
    ]);
  });

  it("ignores fully blank rows without reporting them", () => {
    const r = parseWinners("Ticket,Prize\n1,A\n\n,\n   \n2,B\n\n\n");
    expect(r.winners).toHaveLength(2);
    expect(r.skipped).toEqual([]);
  });

  it("skips spreadsheet error values", () => {
    const r = parseWinners("Ticket,Prize\n#N/A,Gift\n2,#REF!\n3,Wine");
    expect(r.winners.map((w) => w.ticket)).toEqual(["3"]);
    expect(r.skipped).toHaveLength(2);
    expect(r.skipped[0].reason).toMatch(/error/);
  });

  it("reports a list of only ticket numbers as skipped", () => {
    const r = parseWinners("0719054\n0383699\n2370279");
    expect(r.winners).toEqual([]);
    expect(r.skipped).toHaveLength(3);
  });

  it("flags skipped rows in the notes", () => {
    expect(noteText("Ticket,Prize\n1,A\n2,")).toMatch(/1 row was skipped/);
  });
});

describe("messy characters", () => {
  it("strips a byte-order mark so the header is still recognised", () => {
    const r = parseWinners("﻿Ticket,Prize\n1,A");
    expect(r.columns).not.toBeNull();
    expect(r.winners).toEqual([{ ticket: "1", prize: "A" }]);
  });

  it("cleans non-breaking and zero-width spaces", () => {
    const r = parseWinners("Ticket,Prize\n​0719054 , Gift Card​");
    expect(r.winners).toEqual([{ ticket: "0719054", prize: "Gift Card" }]);
  });

  it("collapses multi-line cells and runs of spaces", () => {
    expect(prizes('1,"Gift\n   Card"\n2,Spa    Day')).toEqual(["Gift Card", "Spa Day"]);
  });

  it("keeps accents, emoji and symbols", () => {
    expect(prizes("1,Café Gift Card 🎁\n2,€50 Voucher — Deluxe")).toEqual([
      "Café Gift Card 🎁",
      "€50 Voucher — Deluxe",
    ]);
  });
});

describe("ticket numbers mangled by spreadsheets", () => {
  it("removes thousands separators", () => {
    const r = parseWinners('Ticket\tPrize\n"1,234,567"\tA\n"2,000"\tB');
    expect(r.winners.map((w) => w.ticket)).toEqual(["1234567", "2000"]);
    expect(r.notes.some((n) => /thousands separators/.test(n.text))).toBe(true);
  });

  it("removes a trailing .0 from numbers exported as decimals", () => {
    expect(tickets("Ticket,Prize\n719054.0,A\n383699.00,B")).toEqual(["719054", "383699"]);
  });

  it("strips Sheets' leading apostrophe from text-formatted numbers", () => {
    expect(tickets("Ticket,Prize\n'0719054,A")).toEqual(["0719054"]);
  });

  it("warns about scientific notation", () => {
    const r = parseWinners("Ticket,Prize\n1.23457E+13,A\n2.5e+10,B");
    expect(r.notes.some((n) => n.level === "warn" && /scientific notation/.test(n.text))).toBe(true);
  });

  it("detects dropped leading zeros and offers a pad width", () => {
    const r = parseWinners(
      "Ticket,Prize\n0719054,A\n0383699,B\n2370279,C\n0394547,D\n719054,E\n94547,F"
    );
    expect(r.padWidth).toBe(7);
    expect(r.notes.some((n) => /leading zeros/.test(n.text))).toBe(true);
  });

  it("detects dropped zeros even when the short tickets are the majority", () => {
    // Real shape: most tickets start with 0 and lost it; a few start with 2.
    const r = parseWinners(
      "Ticket,Prize\n719054,A\n383699,B\n394547,C\n516097,D\n736463,E\n2370279,F"
    );
    expect(r.padWidth).toBe(7);
    expect(r.notes.some((n) => /leading zeros/.test(n.text))).toBe(true);
  });

  it("describes a single multi-prize ticket grammatically", () => {
    expect(noteText("1,A\n1,B\n2,C")).toMatch(/1 ticket wins more than one prize/);
    expect(noteText("1,A\n1,B\n2,C\n2,D")).toMatch(/2 tickets win more than one prize/);
  });

  it("does not flag naturally varying numbers like 1 to 101", () => {
    const rows = Array.from({ length: 101 }, (_, i) => `${i + 1},Prize ${i + 1}`).join("\n");
    expect(parseWinners(rows).padWidth).toBeNull();
  });

  it("does not flag when all tickets are the same width", () => {
    expect(parseWinners("0719054,A\n0383699,B").padWidth).toBeNull();
  });

  it("pads only the tickets that look shortened", () => {
    const padded = padTicketNumbers(
      [
        { ticket: "0719054", prize: "A" },
        { ticket: "719054", prize: "B" },
        { ticket: "54", prize: "C" },
        { ticket: "AB12", prize: "D" },
      ],
      7
    );
    expect(padded.map((w) => w.ticket)).toEqual(["0719054", "0719054", "54", "AB12"]);
  });
});

describe("duplicates", () => {
  it("keeps but warns about exact repeated rows", () => {
    const r = parseWinners("1,Gift\n1,Gift\n2,Wine");
    expect(r.winners).toHaveLength(3);
    expect(noteText("1,Gift\n1,Gift")).toMatch(/exact repeat/);
  });

  it("notes, without warning, when a ticket wins several prizes", () => {
    const r = parseWinners("1,Gift\n1,Wine\n2,Cheese");
    expect(r.winners).toHaveLength(3);
    expect(r.notes.find((n) => /more than one prize/.test(n.text))?.level).toBe("info");
  });
});

describe("serialising back to text", () => {
  it("round-trips through winnersToText", () => {
    const winners = [
      { ticket: "0719054", prize: 'Spa, "Deluxe" Day' },
      { ticket: "2", prize: "Wine" },
    ];
    expect(parseWinners(winnersToText(winners)).winners).toEqual(winners);
  });

  it("swaps columns deterministically", () => {
    const text = winnersToText([{ ticket: "Gift", prize: "1" }], true);
    expect(parseWinners(text).winners).toEqual([{ ticket: "1", prize: "Gift" }]);
  });
});

describe("scale", () => {
  it("parses thousands of rows quickly", () => {
    const rows = Array.from({ length: 8000 }, (_, i) => `${1000000 + i},Prize ${i}`).join("\n");
    const start = performance.now();
    const r = parseWinners(rows);
    expect(r.winners).toHaveLength(8000);
    expect(performance.now() - start).toBeLessThan(1500);
  });
});

import { describe, expect, it } from "vitest";
import { findMatches, matchKey } from "@/lib/ticket";

const row = (ticket: string, prize = "P") => ({ ticket_number: ticket, prize_name: prize });
const tickets = (items: { ticket_number: string }[]) => items.map((i) => i.ticket_number);

describe("findMatches", () => {
  const items = [row("0719054"), row("0383699"), row("2370279"), row("0719054", "Second")];

  it("matches the whole number", () => {
    expect(tickets(findMatches(items, "0383699"))).toEqual(["0383699"]);
  });

  it("never matches part of a number", () => {
    expect(findMatches(items, "07")).toEqual([]);
    expect(findMatches(items, "719054")).toEqual([]);
    expect(findMatches(items, "038369")).toEqual([]);
    expect(findMatches(items, "03836999")).toEqual([]);
  });

  it("returns every prize for a ticket that won more than once", () => {
    expect(findMatches(items, "0719054")).toHaveLength(2);
  });

  it("ignores surrounding whitespace and case", () => {
    expect(findMatches([row("AB123")], "  ab123 ")).toHaveLength(1);
    expect(findMatches([row("AB 123")], "ab123")).toHaveLength(1);
  });

  it("returns nothing for an empty query", () => {
    expect(findMatches(items, "")).toEqual([]);
    expect(findMatches(items, "   ")).toEqual([]);
  });

  it("matches a typed leading zero against a number Sheets stripped", () => {
    const stripped = [row("719054"), row("94547")];
    expect(tickets(findMatches(stripped, "0719054"))).toEqual(["719054"]);
    expect(tickets(findMatches(stripped, "0094547"))).toEqual(["94547"]);
  });

  it("does not let a shorter typed number match a longer stored one", () => {
    expect(findMatches([row("0007")], "7")).toEqual([]);
    expect(findMatches([row("0719054")], "719054")).toEqual([]);
  });

  it("prefers an exact match over the leading-zero fallback", () => {
    const both = [row("719054", "Plain"), row("0719054", "Padded")];
    expect(findMatches(both, "719054").map((i) => i.prize_name)).toEqual(["Plain"]);
    expect(findMatches(both, "0719054").map((i) => i.prize_name)).toEqual(["Padded"]);
  });

  it("shows nothing rather than guess when the fallback is ambiguous", () => {
    const ambiguous = [row("123"), row("0123")];
    expect(findMatches(ambiguous, "00123")).toEqual([]);
  });

  it("does not apply the leading-zero rule to non-numeric tickets", () => {
    expect(findMatches([row("A123")], "0A123")).toEqual([]);
  });
});

describe("matchKey", () => {
  it("lowercases and removes whitespace", () => {
    expect(matchKey(" Ab 12\t3 ")).toBe("ab123");
  });
});

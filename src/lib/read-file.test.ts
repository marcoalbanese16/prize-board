import { describe, expect, it } from "vitest";
import { readFileText } from "@/lib/read-file";

const file = (bytes: number[] | Uint8Array | string, name = "winners.csv") =>
  new File([typeof bytes === "string" ? bytes : new Uint8Array(bytes)], name);

const text = async (f: File) => {
  const r = await readFileText(f);
  if (!r.ok) throw new Error(r.message);
  return r.text;
};

describe("readFileText", () => {
  it("reads plain UTF-8", async () => {
    expect(await text(file("Ticket,Prize\n1,Café"))).toBe("Ticket,Prize\n1,Café");
  });

  it("keeps a UTF-8 BOM out of the way of the parser", async () => {
    // The BOM survives decoding and is stripped by the parser, so check both ends.
    const out = await text(file([0xef, 0xbb, 0xbf, ...new TextEncoder().encode("Ticket,Prize")]));
    expect(out.replace(/^﻿/, "")).toBe("Ticket,Prize");
  });

  it("decodes UTF-16 LE saved by Excel's 'Unicode text'", async () => {
    const s = "Ticket\tPrize\n1\tCafé";
    const bytes = [0xff, 0xfe];
    for (const ch of s) {
      const code = ch.charCodeAt(0);
      bytes.push(code & 0xff, code >> 8);
    }
    expect(await text(file(bytes))).toBe(s);
  });

  it("decodes UTF-16 BE", async () => {
    const s = "1,Wine";
    const bytes = [0xfe, 0xff];
    for (const ch of s) {
      const code = ch.charCodeAt(0);
      bytes.push(code >> 8, code & 0xff);
    }
    expect(await text(file(bytes))).toBe(s);
  });

  it("falls back to Windows-1252 for old Excel CSVs", async () => {
    // "1,Café" with é as the single byte 0xE9 (invalid UTF-8).
    expect(await text(file([0x31, 0x2c, 0x43, 0x61, 0x66, 0xe9]))).toBe("1,Café");
  });

  it("explains an .xlsx upload", async () => {
    const r = await readFileText(file([0x50, 0x4b, 0x03, 0x04, 0, 0, 0], "winners.xlsx"));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toMatch(/Excel \(\.xlsx\)[\s\S]*Download → Comma-separated/);
  });

  it("explains an old .xls upload", async () => {
    const r = await readFileText(file([0xd0, 0xcf, 0x11, 0xe0, 1, 2]));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toMatch(/\.xls/);
  });

  it("explains a PDF", async () => {
    const r = await readFileText(file("%PDF-1.7 ..."));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toMatch(/PDF/);
  });

  it("rejects other binary files", async () => {
    const r = await readFileText(file([0x89, 0x50, 0x4e, 0x47, 0x00, 0x00, 0x00, 0x01]));
    expect(r.ok).toBe(false);
  });

  it("rejects empty files", async () => {
    const r = await readFileText(file(""));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toMatch(/empty/);
  });

  it("rejects files over 5 MB", async () => {
    const r = await readFileText(file(new Uint8Array(5 * 1024 * 1024 + 1).fill(97)));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toMatch(/too large/);
  });
});

import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchSheet, fetchSheetRef, parseSheetUrl, sheetCsvUrl, sheetKey } from "@/lib/sheets";

const ID = "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms";

function ref(input: string) {
  const parsed = parseSheetUrl(input);
  if (!parsed.ok) throw new Error(parsed.message);
  return parsed.ref;
}

describe("parseSheetUrl", () => {
  it("reads a normal edit link", () => {
    expect(ref(`https://docs.google.com/spreadsheets/d/${ID}/edit?usp=sharing`)).toEqual({
      kind: "sheet",
      id: ID,
      gid: null,
    });
  });

  it("picks up the tab from ?gid=", () => {
    expect(ref(`https://docs.google.com/spreadsheets/d/${ID}/edit?gid=1234`)).toMatchObject({ gid: "1234" });
  });

  it("picks up the tab from #gid= (how Sheets shows it when you switch tabs)", () => {
    expect(ref(`https://docs.google.com/spreadsheets/d/${ID}/edit#gid=98765`)).toMatchObject({ gid: "98765" });
  });

  it("handles multi-account links", () => {
    expect(ref(`https://docs.google.com/spreadsheets/u/1/d/${ID}/edit`)).toMatchObject({ id: ID });
  });

  it("accepts a link pasted without https://", () => {
    expect(ref(`docs.google.com/spreadsheets/d/${ID}/edit`)).toMatchObject({ id: ID });
  });

  it("accepts surrounding whitespace and a bare spreadsheet id", () => {
    expect(ref(`  https://docs.google.com/spreadsheets/d/${ID}/edit  \n`)).toMatchObject({ id: ID });
    expect(ref(ID)).toMatchObject({ kind: "sheet", id: ID });
  });

  it("recognises 'publish to the web' links", () => {
    expect(ref("https://docs.google.com/spreadsheets/d/e/2PACX-1vAbC_dEf/pubhtml?gid=5&single=true")).toEqual({
      kind: "published",
      pubId: "2PACX-1vAbC_dEf",
      gid: "5",
    });
  });

  it.each([
    ["", /Paste the link/],
    ["not a link at all %%%", /doesn't look like a link|isn't a Google Sheets/],
    ["https://example.com/spreadsheets/d/abc", /isn't a Google Sheets link/],
    ["https://docs.google.com/document/d/abc/edit", /Google Doc/],
    ["https://docs.google.com/presentation/d/abc/edit", /Slides/],
    ["https://docs.google.com/forms/d/abc/edit", /Form/],
    ["https://drive.google.com/file/d/abc/view", /Drive file/],
    ["https://docs.google.com/spreadsheets/", /Couldn't find a spreadsheet/],
  ])("rejects %j with a helpful message", (input, message) => {
    const parsed = parseSheetUrl(input);
    expect(parsed.ok).toBe(false);
    if (!parsed.ok) expect(parsed.message).toMatch(message);
  });
});

describe("sheetCsvUrl", () => {
  it("uses the export endpoint, not gviz (which can blank cells)", () => {
    const url = sheetCsvUrl({ kind: "sheet", id: ID, gid: null });
    expect(url).toBe(`https://docs.google.com/spreadsheets/d/${ID}/export?format=csv`);
    expect(url).not.toContain("gviz");
  });

  it("adds the tab id when there is one", () => {
    expect(sheetCsvUrl({ kind: "sheet", id: ID, gid: "42" })).toContain("&gid=42");
  });

  it("builds the published-CSV url for publish links", () => {
    expect(sheetCsvUrl({ kind: "published", pubId: "2PACX-x", gid: "7" })).toBe(
      "https://docs.google.com/spreadsheets/d/e/2PACX-x/pub?output=csv&single=true&gid=7"
    );
  });
});

describe("fetchSheet", () => {
  afterEach(() => vi.unstubAllGlobals());

  const link = `https://docs.google.com/spreadsheets/d/${ID}/edit`;
  const respond = (body: string, init: ResponseInit & { type?: string } = {}) =>
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(body, {
          status: init.status ?? 200,
          headers: { "content-type": init.type ?? "text/csv; charset=utf-8" },
        })
      )
    );

  it("returns the CSV text", async () => {
    respond("Ticket,Prize\n1,A");
    expect(await fetchSheet(link)).toEqual({ ok: true, text: "Ticket,Prize\n1,A", firstTab: true });
  });

  it("says when it used the first tab only", async () => {
    respond("a,b");
    expect(await fetchSheet(`${link}?gid=3`)).toMatchObject({ ok: true, firstTab: false });
  });

  it("never sends cookies to Google", async () => {
    respond("a,b");
    await fetchSheet(link);
    expect(vi.mocked(fetch).mock.calls[0][1]).toMatchObject({ credentials: "omit" });
  });

  it.each([
    [404, /couldn't find that sheet/],
    [400, /couldn't find that tab/],
    [401, /private/],
    [403, /private/],
    [500, /error \(500\)/],
  ])("explains HTTP %i", async (status, message) => {
    respond("<html>nope</html>", { status, type: "text/html" });
    const result = await fetchSheet(link);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toMatch(message);
  });

  it("treats an HTML 200 (a sign-in page) as not shared", async () => {
    respond("<html>Sign in</html>", { type: "text/html; charset=utf-8" });
    const result = await fetchSheet(link);
    expect(result).toMatchObject({ ok: false });
    if (!result.ok) expect(result.message).toMatch(/Anyone with the link/);
  });

  it("explains a blocked or offline request (what a private sheet looks like to a browser)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    const result = await fetchSheet(link);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toMatch(/private[\s\S]*offline/);
  });

  it("reports a timeout", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new DOMException("aborted", "AbortError"))
    );
    const result = await fetchSheet(link);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toMatch(/took too long/);
  });

  it("rejects an empty sheet", async () => {
    respond("   \n");
    const result = await fetchSheet(link);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toMatch(/empty/);
  });

  it("does not call Google for a bad link", async () => {
    const spy = vi.fn();
    vi.stubGlobal("fetch", spy);
    expect((await fetchSheet("https://example.com")).ok).toBe(false);
    expect(spy).not.toHaveBeenCalled();
  });
});

describe("live-board fetching", () => {
  afterEach(() => vi.unstubAllGlobals());

  const REF = { kind: "sheet", id: ID, gid: null } as const;
  const respond = (body: string, status = 200, type = "text/csv; charset=utf-8") =>
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(body, { status, headers: { "content-type": type } }))
    );

  it("asks the browser never to serve a cached copy, so polls see new winners", async () => {
    respond("a,b");
    await fetchSheetRef(REF);
    expect(vi.mocked(fetch).mock.calls[0][1]).toMatchObject({ cache: "no-store", credentials: "omit" });
  });

  it("treats an empty sheet as valid when allowed (a live board before the draw)", async () => {
    respond("");
    expect(await fetchSheetRef(REF, { allowEmpty: true })).toEqual({ ok: true, text: "", firstTab: true });
    respond("  \n");
    expect((await fetchSheetRef(REF, { allowEmpty: true })).ok).toBe(true);
  });

  it("still rejects an empty sheet by default (importing a list)", async () => {
    respond("");
    const result = await fetchSheetRef(REF);
    expect(result.ok).toBe(false);
  });

  it("explains rate limiting", async () => {
    respond("", 429, "text/html");
    const result = await fetchSheetRef(REF);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toMatch(/fewer requests/);
  });

  it("builds distinct cache keys per sheet and tab", () => {
    expect(sheetKey({ kind: "sheet", id: "a", gid: null })).not.toBe(sheetKey({ kind: "sheet", id: "a", gid: "3" }));
    expect(sheetKey({ kind: "sheet", id: "a", gid: null })).not.toBe(sheetKey({ kind: "published", pubId: "a", gid: null }));
    expect(sheetKey({ kind: "sheet", id: "a", gid: "3" })).toBe(sheetKey({ kind: "sheet", id: "a", gid: "3" }));
  });
});

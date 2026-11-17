// Imports a Google Sheet straight from its link. This only works for sheets
// shared as "Anyone with the link" (or published to the web): the page asks
// Google for the sheet's CSV export from the visitor's own browser.

export type SheetRef =
  | { kind: "sheet"; id: string; gid: string | null }
  | { kind: "published"; pubId: string; gid: string | null };

export type ParsedSheetUrl =
  | { ok: true; ref: SheetRef }
  | { ok: false; message: string };

const MAX_BYTES = 5 * 1024 * 1024;
const TIMEOUT_MS = 15000;

const SHARING_HELP =
  'In Google Sheets, click Share → General access → "Anyone with the link" → Viewer, then try again. (Or use File → Download → CSV and upload it.)';

export function parseSheetUrl(input: string): ParsedSheetUrl {
  const trimmed = input.trim();
  if (!trimmed) return { ok: false, message: "Paste the link to your Google Sheet first." };

  // A bare spreadsheet id is fine too.
  if (/^[\w-]{25,}$/.test(trimmed)) {
    return { ok: true, ref: { kind: "sheet", id: trimmed, gid: null } };
  }

  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
  } catch {
    return { ok: false, message: "That doesn't look like a link. Copy it from your browser's address bar while the sheet is open." };
  }

  if (url.hostname === "drive.google.com") {
    return {
      ok: false,
      message:
        "That's a Google Drive file link, not a Google Sheet. Open the file as a Google Sheet (File → Save as Google Sheets) and copy that link, or download it as CSV and upload it.",
    };
  }
  if (url.hostname !== "docs.google.com") {
    return { ok: false, message: "That isn't a Google Sheets link. It should start with docs.google.com/spreadsheets." };
  }

  const other = url.pathname.match(/^\/(document|presentation|forms)\//);
  if (other) {
    const kind = { document: "Google Doc", presentation: "Google Slides file", forms: "Google Form" }[other[1]];
    return { ok: false, message: `That's a ${kind}, not a Google Sheet.` };
  }

  const gid =
    url.searchParams.get("gid") ??
    new URLSearchParams(url.hash.replace(/^#/, "")).get("gid");

  const published = url.pathname.match(/^\/spreadsheets\/d\/e\/([\w-]+)/);
  if (published) return { ok: true, ref: { kind: "published", pubId: published[1], gid } };

  const sheet = url.pathname.match(/^\/spreadsheets\/(?:u\/\d+\/)?d\/([\w-]+)/);
  if (sheet) return { ok: true, ref: { kind: "sheet", id: sheet[1], gid } };

  return { ok: false, message: "Couldn't find a spreadsheet in that link. It should look like docs.google.com/spreadsheets/d/…" };
}

export function sheetCsvUrl(ref: SheetRef): string {
  const gid = ref.gid ? `&gid=${encodeURIComponent(ref.gid)}` : "";
  return ref.kind === "published"
    ? `https://docs.google.com/spreadsheets/d/e/${ref.pubId}/pub?output=csv&single=true${gid}`
    : `https://docs.google.com/spreadsheets/d/${ref.id}/export?format=csv${gid}`;
}

export type SheetResult =
  | { ok: true; text: string; firstTab: boolean }
  | { ok: false; message: string };

/** A stable key for a sheet + tab, e.g. for caching its last results. */
export function sheetKey(ref: SheetRef): string {
  return ref.kind === "published"
    ? `p:${ref.pubId}:${ref.gid ?? ""}`
    : `s:${ref.id}:${ref.gid ?? ""}`;
}

export type FetchOptions = {
  /**
   * An empty sheet is fine (a live board starts with no winners). Importing a
   * list into the builder still treats empty as a mistake.
   */
  allowEmpty?: boolean;
};

export async function fetchSheetRef(
  ref: SheetRef,
  { allowEmpty = false }: FetchOptions = {}
): Promise<SheetResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    let response: Response;
    try {
      response = await fetch(sheetCsvUrl(ref), {
        signal: controller.signal,
        credentials: "omit",
        // Live boards poll this; never let the browser serve an old copy.
        cache: "no-store",
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return { ok: false, message: "Google took too long to respond. Check your connection and try again." };
      }
      // A private sheet redirects to a sign-in page, which the browser blocks, so
      // that looks the same as being offline.
      return {
        ok: false,
        message: `Couldn't open that sheet. It may be private, or you may be offline. ${SHARING_HELP}`,
      };
    }

    if (response.status === 404) {
      return { ok: false, message: "Google couldn't find that sheet. Check that the link is complete and the sheet hasn't been deleted." };
    }
    if (response.status === 400) {
      return { ok: false, message: "Google couldn't find that tab of the sheet. Open the tab you want and copy its link again." };
    }
    if (response.status === 401 || response.status === 403) {
      return { ok: false, message: `That sheet is private. ${SHARING_HELP}` };
    }
    if (response.status === 429) {
      return { ok: false, message: "Google is asking for fewer requests right now. Wait a minute and try again." };
    }
    if (!response.ok) {
      return { ok: false, message: `Google returned an error (${response.status}). Try again in a minute.` };
    }

    // A sign-in or error page comes back as HTML with a 200.
    const type = response.headers.get("content-type") ?? "";
    if (type.includes("text/html")) {
      return { ok: false, message: `That sheet isn't shared publicly. ${SHARING_HELP}` };
    }

    const text = await response.text();
    if (text.length > MAX_BYTES) {
      return { ok: false, message: "That sheet is too large to import." };
    }
    if (!allowEmpty && !text.trim()) {
      return { ok: false, message: "That sheet (or tab) looks empty." };
    }
    return { ok: true, text, firstTab: ref.gid === null };
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchSheet(
  input: string,
  options?: FetchOptions
): Promise<SheetResult> {
  const parsed = parseSheetUrl(input);
  if (!parsed.ok) return parsed;
  return fetchSheetRef(parsed.ref, options);
}

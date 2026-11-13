// Reads an uploaded winners file as text, coping with what Excel and Google
// Sheets actually produce.

const MAX_BYTES = 5 * 1024 * 1024;

export type FileResult =
  | { ok: true; text: string }
  | { ok: false; message: string };

const EXCEL_HELP =
  "In Google Sheets use File → Download → Comma-separated values (.csv), then upload that file.";

export async function readFileText(file: File): Promise<FileResult> {
  if (file.size > MAX_BYTES) {
    return { ok: false, message: "That file is too large (over 5 MB)." };
  }
  if (file.size === 0) {
    return { ok: false, message: "That file is empty." };
  }

  const bytes = new Uint8Array(await file.arrayBuffer());

  // Spreadsheet and document formats that aren't plain text.
  if (bytes[0] === 0x50 && bytes[1] === 0x4b) {
    return { ok: false, message: `That looks like an Excel (.xlsx) file, which can't be read directly. ${EXCEL_HELP}` };
  }
  if (bytes[0] === 0xd0 && bytes[1] === 0xcf) {
    return { ok: false, message: `That looks like an old Excel (.xls) file, which can't be read directly. ${EXCEL_HELP}` };
  }
  if (bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) {
    return { ok: false, message: "That's a PDF. Upload a CSV, or copy the cells and paste them instead." };
  }

  // "Unicode text" saved from Excel is UTF-16.
  if (bytes[0] === 0xff && bytes[1] === 0xfe) {
    return { ok: true, text: new TextDecoder("utf-16le").decode(bytes.subarray(2)) };
  }
  if (bytes[0] === 0xfe && bytes[1] === 0xff) {
    return { ok: true, text: new TextDecoder("utf-16be").decode(bytes.subarray(2)) };
  }

  const sample = bytes.subarray(0, 4096);
  if (sample.includes(0)) {
    return { ok: false, message: `That doesn't look like a text or CSV file. ${EXCEL_HELP}` };
  }

  try {
    return { ok: true, text: new TextDecoder("utf-8", { fatal: true }).decode(bytes) };
  } catch {
    // Older Excel CSVs use Windows-1252, where é is a single byte.
    return { ok: true, text: new TextDecoder("windows-1252").decode(bytes) };
  }
}

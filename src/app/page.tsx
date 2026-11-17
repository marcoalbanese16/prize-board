"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { QRCodeSVG } from "qrcode.react";
import { encodeBoard, type BoardData } from "@/lib/board-data";
import { BASE_PATH, boardUrl } from "@/lib/base-path";
import { isBoardMode, isBoardTheme } from "@/lib/board-themes";
import {
  padTicketNumbers,
  parseWinners,
  winnersToText,
} from "@/lib/parse-winners";
import { readFileText } from "@/lib/read-file";
import { buildBoard } from "@/lib/build-board";
import { fetchSheet, fetchSheetRef, parseSheetUrl, sheetKey } from "@/lib/sheets";
import ThemePicker, { type Style } from "./theme-picker";
import WinnersReview from "./winners-review";

// Largest URL a QR code can hold (version 40, lowest error correction).
const QR_MAX_CHARS = 2900;
const QR_DENSE_CHARS = 1000;

const inputClass =
  "rounded-lg border border-neutral-300 bg-white px-3 py-2.5 text-sm text-neutral-900 outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900";

// The form is saved in this browser as you type, so a refresh (or an
// accidentally closed tab) doesn't lose a pasted winners list.
const DRAFT_KEY = "prize-board-draft";
const DEFAULT_STYLE: Style = {
  theme: "carnival",
  mode: "light",
  accent: "#fbbf24",
  showList: true,
};

type Draft = {
  title: string;
  date: string;
  winnersText: string;
  sheetUrl: string;
  /** Live board: guests read the winners from the sheet, so the QR never changes. */
  liveMode: boolean;
  /** Settings that change the QR code are frozen, so a stray click can't alter it. */
  locked: boolean;
  style: Style;
};

const EMPTY_DRAFT: Draft = {
  title: "",
  date: "",
  winnersText: "",
  sheetUrl: "",
  liveMode: false,
  locked: false,
  style: DEFAULT_STYLE,
};

function loadDraft(): Draft {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return EMPTY_DRAFT;
    const d = JSON.parse(raw);
    return {
      title: typeof d.title === "string" ? d.title : "",
      date: typeof d.date === "string" ? d.date : "",
      winnersText: typeof d.winnersText === "string" ? d.winnersText : "",
      sheetUrl: typeof d.sheetUrl === "string" ? d.sheetUrl : "",
      liveMode: d.liveMode === true,
      locked: d.locked === true,
      style: {
        theme: isBoardTheme(d.style?.theme) ? d.style.theme : DEFAULT_STYLE.theme,
        mode: isBoardMode(d.style?.mode) ? d.style.mode : DEFAULT_STYLE.mode,
        accent: /^#[0-9a-f]{6}$/i.test(d.style?.accent)
          ? d.style.accent
          : DEFAULT_STYLE.accent,
        showList:
          typeof d.style?.showList === "boolean"
            ? d.style.showList
            : DEFAULT_STYLE.showList,
      },
    };
  } catch {
    return EMPTY_DRAFT;
  }
}

function BuilderForm() {
  // Lazy init runs once, client-side only (this component never renders on the
  // server), so there's no hydration mismatch and no setState-in-effect.
  const [initial] = useState(loadDraft);
  const [title, setTitle] = useState(initial.title);
  const [date, setDate] = useState(initial.date);
  const [winnersText, setWinnersText] = useState(initial.winnersText);
  const [style, setStyle] = useState<Style>(initial.style);
  const [sheetUrl, setSheetUrl] = useState(initial.sheetUrl);
  const [liveMode, setLiveMode] = useState(initial.liveMode);
  const [locked, setLocked] = useState(initial.locked);
  const [checkAttempt, setCheckAttempt] = useState(0);
  const [importing, setImporting] = useState(false);
  const [importMessage, setImportMessage] = useState<{
    kind: "ok" | "error";
    text: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      localStorage.setItem(
        DRAFT_KEY,
        JSON.stringify({ title, date, winnersText, sheetUrl, liveMode, style, locked })
      );
    } catch {
      // Storage can be unavailable (private mode, quota); the form still works.
    }
  }, [title, date, winnersText, sheetUrl, liveMode, style, locked]);

  const parsed = useMemo(() => parseWinners(winnersText), [winnersText]);
  const winners = parsed.winners;

  // The sheet a live board would read, when the link in the box is a valid one.
  const sheetRef = useMemo(() => {
    const result = parseSheetUrl(sheetUrl);
    return result.ok ? result.ref : null;
  }, [sheetUrl]);
  const sheetLinkProblem = useMemo(() => {
    if (!sheetUrl.trim()) return null;
    const result = parseSheetUrl(sheetUrl);
    return result.ok ? null : result.message;
  }, [sheetUrl]);
  const liveKey = liveMode && sheetRef ? `${sheetKey(sheetRef)}#${checkAttempt}` : null;

  // Before a QR code is printed and posted around a hall, prove the sheet can
  // actually be read by an anonymous visitor. Results are tagged with the sheet
  // they belong to so an old answer is never shown for a new link.
  type SheetCheck =
    | { ok: true; winners: number }
    | { ok: false; message: string };
  const [check, setCheck] = useState<{ key: string; result: SheetCheck } | null>(null);
  useEffect(() => {
    if (!liveKey || !sheetRef) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      const result = await fetchSheetRef(sheetRef, { allowEmpty: true });
      if (cancelled) return;
      setCheck({
        key: liveKey,
        result: result.ok
          ? { ok: true, winners: parseWinners(result.text).winners.length }
          : { ok: false, message: result.message },
      });
    }, 500);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [liveKey, sheetRef]);
  const sheetCheck = liveKey && check?.key === liveKey ? check.result : null;

  const board = useMemo<BoardData | null>(
    () =>
      buildBoard({
        title,
        date,
        theme: style.theme,
        mode: style.mode,
        accent: style.accent,
        showList: style.showList,
        winners,
        liveMode,
        sheetRef,
      }),
    [title, date, style, winners, liveMode, sheetRef]
  );

  // Encoding is async (compression), so tag the result with the board it was
  // made for and only show it while it still matches.
  const [encoded, setEncoded] = useState<{
    for: BoardData;
    value: string;
  } | null>(null);
  useEffect(() => {
    if (!board) return;
    let cancelled = false;
    encodeBoard(board).then((value) => {
      if (!cancelled) setEncoded({ for: board, value });
    });
    return () => {
      cancelled = true;
    };
  }, [board]);

  const url =
    board && encoded?.for === board ? boardUrl(encoded.value) : null;
  // A live QR code is only offered once the sheet is confirmed readable.
  const showShare = url && (!liveMode || sheetCheck?.ok === true);

  // Replacing a list someone has already worked on needs a confirmation.
  function replaceWinners(text: string) {
    if (
      winnersText.trim() &&
      winnersText.trim() !== text.trim() &&
      !window.confirm("Replace the winners below with the imported list?")
    ) {
      return false;
    }
    setWinnersText(text);
    return true;
  }

  async function handleFile(file: File) {
    setImportMessage(null);
    const result = await readFileText(file);
    if (!result.ok) {
      setImportMessage({ kind: "error", text: result.message });
      return;
    }
    if (replaceWinners(result.text)) {
      setImportMessage({ kind: "ok", text: `Loaded ${file.name}.` });
    }
  }

  async function handleSheetImport() {
    setImportMessage(null);
    setImporting(true);
    try {
      const result = await fetchSheet(sheetUrl);
      if (!result.ok) {
        setImportMessage({ kind: "error", text: result.message });
        return;
      }
      if (replaceWinners(result.text)) {
        setImportMessage({
          kind: "ok",
          text: result.firstTab
            ? "Imported the first tab of your sheet. To use a different tab, open it in Sheets and copy the link from your address bar."
            : "Imported that tab of your sheet.",
        });
      }
    } finally {
      setImporting(false);
    }
  }

  function startOver() {
    if (
      (title || winnersText) &&
      !window.confirm("Clear everything and start a new board?")
    ) {
      return;
    }
    setTitle("");
    setDate("");
    setWinnersText("");
    setSheetUrl("");
    setLiveMode(false);
    setImportMessage(null);
    setStyle(DEFAULT_STYLE);
  }

  return (
    <>
      <fieldset
        disabled={locked}
        className={`m-0 flex min-w-0 flex-col gap-6 border-0 p-0 ${locked ? "opacity-60" : ""}`}
      >
      <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-neutral-900">
            1. Your event
          </h2>
          <button
            type="button"
            onClick={startOver}
            className="text-xs font-medium text-neutral-500 underline underline-offset-2 hover:text-neutral-900"
          >
            Start over
          </button>
        </div>
        <div className="flex flex-wrap gap-3">
          <div className="flex min-w-56 flex-1 flex-col gap-1.5">
            <label className="text-xs font-medium text-neutral-600">
              Event name
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Sarah & Mike's Stag & Doe"
              className={inputClass}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-neutral-600">
              Event date (optional)
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
        <h2 className="mb-1 text-lg font-semibold text-neutral-900">
          2. Winners
        </h2>
        <p className="mb-4 text-sm text-neutral-500">
          Each winner needs a ticket number and a prize. Bring them in from
          Google Sheets, a CSV file, or type them in.
        </p>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!importing) handleSheetImport();
          }}
          className="mb-5 rounded-xl border border-neutral-200 bg-neutral-50 p-4"
        >
          <label className="mb-1.5 block text-xs font-medium text-neutral-700">
            Import from Google Sheets
          </label>
          <div className="flex flex-wrap gap-2">
            <input
              value={sheetUrl}
              onChange={(e) => setSheetUrl(e.target.value)}
              placeholder="Paste your Google Sheets link"
              className={`${inputClass} min-w-56 flex-1`}
              spellCheck={false}
              autoComplete="off"
            />
            <button
              type="submit"
              disabled={importing || !sheetUrl.trim()}
              className="rounded-lg bg-black px-4 py-2.5 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:opacity-50"
            >
              {importing ? "Importing…" : "Import"}
            </button>
          </div>
          <p className="mt-2 text-xs text-neutral-500">
            In Sheets, click <b>Share → General access → “Anyone with the link”
            → Viewer</b>, then copy the link. Put a header row on top (like{" "}
            <i>Ticket</i> and <i>Prize</i>); extra columns are ignored.
          </p>
        </form>

        {importMessage ? (
          <p
            role={importMessage.kind === "error" ? "alert" : "status"}
            className={`mb-4 rounded-lg px-3 py-2 text-sm ${
              importMessage.kind === "error"
                ? "bg-red-50 text-red-800"
                : "bg-green-50 text-green-800"
            }`}
          >
            {importMessage.text}
          </p>
        ) : null}

        <label className="mb-1.5 block text-xs font-medium text-neutral-700">
          Or paste your winners
        </label>
        <textarea
          value={winnersText}
          onChange={(e) => setWinnersText(e.target.value)}
          rows={8}
          placeholder={
            "Select the cells in Google Sheets, copy, and paste here.\nOr type one per line:\n0719054, $50 Gift Card\n0383699, Bottle of Wine"
          }
          className={`${inputClass} w-full font-mono`}
        />
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium transition hover:bg-neutral-50"
          >
            Upload CSV
          </button>
          <a
            href={`${BASE_PATH}/winners-template.csv`}
            download
            className="text-sm font-medium text-neutral-600 underline underline-offset-2 hover:text-neutral-900"
          >
            Download template
          </a>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,.tsv,.txt,text/csv,text/plain,text/tab-separated-values"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
              e.target.value = "";
            }}
          />
        </div>

        <WinnersReview
          parsed={parsed}
          hasText={winnersText.trim() !== ""}
          onSwap={() => setWinnersText(winnersToText(winners, true))}
          onPad={(width) =>
            setWinnersText(winnersToText(padTicketNumbers(winners, width)))
          }
        />
      </section>

      <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
        <h2 className="mb-1 text-lg font-semibold text-neutral-900">
          3. Board style
        </h2>
        <p className="mb-4 text-sm text-neutral-500">
          How the board looks to your guests.
        </p>
        <ThemePicker value={style} onChange={setStyle} />
      </section>
      </fieldset>

      <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
        <h2 className="mb-1 text-lg font-semibold text-neutral-900">
          4. Share it
        </h2>
        <p className="mb-4 text-sm text-neutral-500">
          Posting a QR code before the prizes are drawn? Choose live.
        </p>

        <div
            className={`mb-5 flex flex-wrap items-center gap-3 rounded-xl border px-4 py-3 ${
              locked
                ? "border-green-300 bg-green-50"
                : "border-neutral-200 bg-neutral-50"
            }`}
          >
            <p className="min-w-0 flex-1 text-xs leading-relaxed text-neutral-700">
              {locked ? (
                <>
                  <b>🔒 Locked.</b> The event name, date, style and sheet link
                  can&apos;t be changed, so your QR code can&apos;t change by
                  accident.
                </>
              ) : (
                <>
                  <b>Printing the QR code?</b> Lock the settings first so a stray
                  click can&apos;t change it.
                </>
              )}
            </p>
            <button
              type="button"
              onClick={() => setLocked((v) => !v)}
              aria-pressed={locked}
              className="shrink-0 rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs font-medium text-neutral-900 hover:bg-neutral-100"
            >
              {locked ? "Unlock settings" : "Lock settings"}
            </button>
          </div>

        <fieldset
          disabled={locked}
          className={`m-0 min-w-0 border-0 p-0 ${locked ? "opacity-60" : ""}`}
        >
        <div
          role="radiogroup"
          aria-label="How results reach your guests"
          className="mb-5 grid gap-3 sm:grid-cols-2"
        >
          {[
            {
              live: true,
              title: "Live from my Google Sheet",
              badge: "QR code never changes",
              body: "Print the QR code before the draw. Add winners to your sheet as they're drawn and every guest's board updates within about a minute.",
            },
            {
              live: false,
              title: "Final results",
              badge: null,
              body: "The winners are saved inside the link. Best once the draw is over. Adding a winner later means a new link and a new QR code.",
            },
          ].map((option) => {
            const selected = liveMode === option.live;
            return (
              <button
                key={option.title}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => setLiveMode(option.live)}
                className={`flex flex-col gap-1.5 rounded-xl border-2 p-4 text-left transition ${
                  selected
                    ? "border-neutral-900 bg-neutral-50"
                    : "border-neutral-200 hover:border-neutral-300"
                }`}
              >
                <span className="flex flex-wrap items-center gap-2 text-sm font-semibold text-neutral-900">
                  {option.title}
                  {option.badge ? (
                    <span className="rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-semibold text-green-800">
                      {option.badge}
                    </span>
                  ) : null}
                </span>
                <span className="text-xs leading-relaxed text-neutral-500">
                  {option.body}
                </span>
              </button>
            );
          })}
        </div>
        </fieldset>

        {liveMode ? (
          <div className="mb-5 flex flex-col gap-3 rounded-xl border border-neutral-200 bg-neutral-50 p-4">
            <fieldset disabled={locked} className={`m-0 min-w-0 border-0 p-0 ${locked ? "opacity-60" : ""}`}>
              <label className="mb-1.5 block text-xs font-medium text-neutral-700">
                Your live results sheet
              </label>
              <input
                value={sheetUrl}
                onChange={(e) => setSheetUrl(e.target.value)}
                placeholder="Paste your Google Sheets link"
                className={`${inputClass} w-full`}
                spellCheck={false}
                autoComplete="off"
              />
            </fieldset>
            <ol className="list-decimal space-y-1 pl-5 text-xs leading-relaxed text-neutral-600">
              <li>
                In Sheets, put <b>Ticket</b> and <b>Prize</b> in row 1. It can
                stay empty below that until the draw starts.
              </li>
              <li>
                Click <b>Share → General access → “Anyone with the link” →
                Viewer</b>, then paste the link above.
              </li>
              <li>
                Print the QR code. As each prize is drawn, add a row to the
                sheet.
              </li>
            </ol>

            {!sheetUrl.trim() ? null : sheetLinkProblem ? (
              <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
                {sheetLinkProblem}
              </p>
            ) : !sheetCheck ? (
              <p className="text-sm text-neutral-500">Checking your sheet…</p>
            ) : sheetCheck.ok ? (
              <p role="status" className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800">
                ✓ Your sheet can be read by anyone with the link.{" "}
                {sheetCheck.winners === 0
                  ? "No winners in it yet. That's fine before the draw."
                  : `${sheetCheck.winners} winner${sheetCheck.winners === 1 ? "" : "s"} in it so far.`}
              </p>
            ) : (
              <div role="alert" className="flex flex-wrap items-center gap-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
                <span className="min-w-0 flex-1">{sheetCheck.message}</span>
                <button
                  type="button"
                  onClick={() => setCheckAttempt((n) => n + 1)}
                  className="shrink-0 rounded-lg border border-red-300 bg-white px-3 py-1.5 text-xs font-medium text-red-800 hover:bg-red-100"
                >
                  Check again
                </button>
              </div>
            )}
          </div>
        ) : null}

        {!board ? (
          <p className="text-sm text-neutral-500">
            {liveMode
              ? "Add an event name and your Google Sheet link to get your QR code."
              : "Add an event name and at least one winner to get your link."}
          </p>
        ) : !url ? (
          <p className="text-sm text-neutral-500">Building your link…</p>
        ) : !showShare ? (
          <p className="text-sm text-neutral-500">
            Your QR code appears here once your sheet checks out, so you never
            print one that doesn&apos;t work.
          </p>
        ) : (
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            {url.length <= QR_MAX_CHARS ? (
              <div className="shrink-0 self-start rounded-xl border border-neutral-100 bg-white p-2">
                <QRCodeSVG value={url} size={160} level="L" />
              </div>
            ) : null}
            <div className="flex min-w-0 flex-1 flex-col gap-3">
              <div className="flex items-center gap-2">
                <code className="min-w-0 flex-1 truncate rounded-lg bg-neutral-100 px-3 py-2 text-xs text-neutral-700">
                  {url}
                </code>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(url);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1500);
                  }}
                  className="shrink-0 rounded-lg border border-neutral-300 px-3 py-2 text-xs font-medium transition hover:bg-neutral-100"
                >
                  {copied ? "Copied!" : "Copy link"}
                </button>
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 rounded-lg border border-neutral-300 px-3 py-2 text-xs font-medium transition hover:bg-neutral-100"
                >
                  Open ↗
                </a>
              </div>

              {liveMode ? (
                <>
                  <p className="text-xs text-neutral-500">
                    Live board · {url.length.toLocaleString()} characters. Winners
                    are read from your sheet each time someone opens or searches
                    the board, so <b>this QR code stays valid as you add
                    winners</b>.
                  </p>
                  <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-900">
                    <b>Before you print:</b> finish the name, date and style
                    above. Changing any of them makes a new QR code (only the
                    winners are live). Then scan it with a phone, add a test row
                    to your sheet, and watch it appear within about a minute.
                    Delete the test row afterwards.
                  </p>
                </>
              ) : (
                <>
                  <p className="text-xs text-neutral-500">
                    {winners.length} winner{winners.length === 1 ? "" : "s"} ·{" "}
                    {url.length.toLocaleString()} characters. The link contains
                    your whole board, so anyone with it can see it and nothing
                    is stored on a server. To change a board, make a new link.
                  </p>
                  {url.length > QR_MAX_CHARS ? (
                    <p className="text-xs text-amber-700">
                      This board is too big to fit in a QR code. Share the link
                      instead, or split the winners across two boards.
                    </p>
                  ) : url.length > QR_DENSE_CHARS ? (
                    <p className="text-xs text-amber-700">
                      Big boards make a dense QR code. Scan it with a phone
                      before you print it.
                    </p>
                  ) : null}
                </>
              )}
            </div>
          </div>
        )}
      </section>
    </>
  );
}

export default function BuilderPage() {
  // The form reads saved data from localStorage, so it only renders in the
  // browser; the heading below is still part of the static HTML.
  const isClient = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  return (
    <main className="min-h-screen bg-neutral-50">
      <header className="border-b border-neutral-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center gap-2 px-6 py-4 font-bold text-neutral-900">
          <span className="text-lg">🏆</span> Prize Board
        </div>
      </header>

      <div className="mx-auto flex max-w-3xl flex-col gap-6 px-6 py-10">
        <div>
          <h1 className="text-balance text-3xl font-bold tracking-tight text-neutral-900">
            Prize Board
          </h1>
          <p className="mt-3 text-neutral-600">
            Paste your winning numbers, get a link and QR code. Guests type
            their ticket number and instantly see if they won. No sign-up —
            everything lives in the link itself.
          </p>
        </div>

        {isClient ? <BuilderForm /> : null}
      </div>
    </main>
  );
}

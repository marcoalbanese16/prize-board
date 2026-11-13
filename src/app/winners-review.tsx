"use client";

import type { ParseResult } from "@/lib/parse-winners";

const PREVIEW_ROWS = 5;
const SKIPPED_SHOWN = 20;

export default function WinnersReview({
  parsed,
  hasText,
  onSwap,
  onPad,
}: {
  parsed: ParseResult;
  hasText: boolean;
  onSwap: () => void;
  onPad: (width: number) => void;
}) {
  if (!hasText) return null;

  const { winners, skipped, notes, columns, padWidth } = parsed;

  if (winners.length === 0) {
    return (
      <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800" role="alert">
        <p className="font-medium">No winners found yet.</p>
        <p className="mt-1">
          Each line needs a ticket number and a prize, separated by a comma or
          a tab. For example: <code className="font-mono">0719054, $50 Gift Card</code>
        </p>
        {skipped.length > 0 ? <SkippedList skipped={skipped} /> : null}
      </div>
    );
  }

  return (
    <div className="mt-4 flex flex-col gap-3" aria-live="polite">
      <p className="text-sm font-medium text-neutral-800">
        {winners.length} winner{winners.length === 1 ? "" : "s"} found
        {skipped.length > 0 ? (
          <span className="font-normal text-amber-700">
            {" "}
            · {skipped.length} row{skipped.length === 1 ? "" : "s"} skipped
          </span>
        ) : null}
      </p>

      {columns ? (
        <p className="text-xs text-neutral-500">
          Using <b>“{columns.ticket}”</b> as the ticket number and{" "}
          <b>“{columns.prize}”</b> as the prize.
        </p>
      ) : null}

      {notes.length > 0 ? (
        <ul className="flex flex-col gap-1.5">
          {notes.map((note, i) => (
            <li
              key={i}
              className={`rounded-md px-3 py-2 text-xs ${
                note.level === "warn"
                  ? "bg-amber-50 text-amber-800"
                  : "bg-neutral-100 text-neutral-600"
              }`}
            >
              {note.text}
            </li>
          ))}
        </ul>
      ) : null}

      <div className="overflow-hidden rounded-lg border border-neutral-200">
        <table className="w-full text-xs">
          <thead className="bg-neutral-50 text-left text-neutral-500">
            <tr>
              <th className="px-3 py-2 font-medium">Ticket number</th>
              <th className="px-3 py-2 font-medium">Prize</th>
            </tr>
          </thead>
          <tbody>
            {winners.slice(0, PREVIEW_ROWS).map((w, i) => (
              <tr key={i} className="border-t border-neutral-100">
                <td className="px-3 py-1.5 font-mono text-neutral-800">{w.ticket}</td>
                <td className="px-3 py-1.5 text-neutral-700">{w.prize}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {winners.length > PREVIEW_ROWS ? (
          <p className="border-t border-neutral-100 bg-neutral-50 px-3 py-1.5 text-xs text-neutral-500">
            …and {winners.length - PREVIEW_ROWS} more
          </p>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onSwap}
          className="rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-medium transition hover:bg-neutral-50"
        >
          Swap ticket and prize columns
        </button>
        {padWidth ? (
          <button
            type="button"
            onClick={() => onPad(padWidth)}
            className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-900 transition hover:bg-amber-100"
          >
            Add leading zeros (make them {padWidth} digits)
          </button>
        ) : null}
      </div>

      {skipped.length > 0 ? <SkippedList skipped={skipped} /> : null}
    </div>
  );
}

function SkippedList({ skipped }: { skipped: ParseResult["skipped"] }) {
  return (
    <details className="mt-2 text-xs text-neutral-600">
      <summary className="cursor-pointer font-medium text-amber-800">
        Show the {skipped.length} skipped row{skipped.length === 1 ? "" : "s"}
      </summary>
      <ul className="mt-2 flex flex-col gap-1">
        {skipped.slice(0, SKIPPED_SHOWN).map((row) => (
          <li key={row.row} className="rounded bg-white/60 px-2 py-1">
            <span className="font-medium">Row {row.row}</span>: {row.reason}
            {row.text ? (
              <span className="ml-1 font-mono text-neutral-400">({row.text})</span>
            ) : null}
          </li>
        ))}
        {skipped.length > SKIPPED_SHOWN ? (
          <li className="px-2 text-neutral-500">
            …and {skipped.length - SKIPPED_SHOWN} more
          </li>
        ) : null}
      </ul>
    </details>
  );
}

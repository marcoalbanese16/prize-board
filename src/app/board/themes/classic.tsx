import { accentCssVars } from "@/lib/board-themes";
import { TrophyIcon, SearchIcon } from "../icons";
import { formatEventDate, type ThemeProps } from "../theme-types";

export default function ClassicTheme({
  mode,
  title,
  eventDate,
  accent,
  query,
  onQueryChange,
  matches,
  prizes,
  showWinnersList,
}: ThemeProps) {
  return (
    <main
      data-mode={mode}
      className="min-h-screen bg-neutral-50 px-4 pb-16 pt-10 text-neutral-900 sm:px-6 dark:bg-neutral-950 dark:text-white"
      style={accentCssVars(accent, mode)}
    >
      <div className="mx-auto max-w-lg">
        <div className="mb-8 flex flex-col items-center text-center">
          <span className="mb-3 inline-flex items-center rounded-full bg-neutral-200 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400">
            Prize winners
          </span>
          <h1 className="text-balance text-3xl font-bold leading-tight text-neutral-900 dark:text-white">
            {title}
          </h1>
          {eventDate && (
            <p className="mt-1 text-sm text-neutral-500">
              {formatEventDate(eventDate)}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-6">
          <div className="sticky top-0 z-10 -mx-4 bg-neutral-50/95 px-4 pb-4 pt-1 backdrop-blur sm:mx-0 sm:rounded-2xl sm:border sm:border-neutral-200 sm:bg-white sm:p-5 sm:shadow-sm dark:bg-neutral-950/95 dark:sm:border-neutral-800 dark:sm:bg-neutral-950 dark:sm:shadow-none">
            <label
              htmlFor="ticket-search"
              className="mb-2 block text-sm font-medium text-neutral-600 dark:text-neutral-400"
            >
              Enter your ticket number
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-4 flex items-center">
                <SearchIcon className="h-5 w-5 text-neutral-400 dark:text-neutral-500" />
              </div>
              <input
                id="ticket-search"
                autoFocus
                inputMode="numeric"
                value={query}
                onChange={(e) => onQueryChange(e.target.value)}
                placeholder="0719054"
                className="w-full rounded-xl border-2 bg-white py-4 pl-12 pr-4 text-2xl font-semibold tracking-wide text-neutral-900 outline-none placeholder:text-neutral-400 dark:bg-neutral-900 dark:text-white dark:placeholder:text-neutral-600"
                style={{ borderColor: "var(--accent-edge)" }}
              />
            </div>
          </div>

          <div aria-live="polite">
            {query.trim() ? (
              matches.length > 0 ? (
                <div className="flex flex-col gap-3">
                  {matches.map((m) => (
                    <div
                      key={m.id}
                      className="flex items-start gap-4 rounded-2xl border-2 bg-white p-5 shadow-sm dark:bg-neutral-900 dark:shadow-none"
                      style={{ borderColor: "var(--accent-edge)" }}
                    >
                      <span
                        className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
                        style={{ backgroundColor: "var(--accent-soft)" }}
                      >
                        <TrophyIcon className="h-5 w-5 text-[var(--accent-ink)]" />
                      </span>
                      <div>
                        <p
                          className="mb-1 text-xs font-bold uppercase tracking-widest"
                          style={{ color: "var(--accent-ink)" }}
                        >
                          You&rsquo;re a winner
                        </p>
                        <p className="mb-1 text-xl font-bold leading-tight text-neutral-900 dark:text-white">
                          {m.prize_name}
                        </p>
                        <p className="font-mono text-sm text-neutral-500 dark:text-neutral-400">
                          Ticket #{m.ticket_number}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-neutral-200 bg-white p-5 text-center shadow-sm dark:border-neutral-800 dark:bg-neutral-900 dark:shadow-none">
                  <p className="text-lg font-medium text-neutral-800 dark:text-neutral-300">
                    No match for &ldquo;{query}&rdquo;
                  </p>
                  <p className="mt-1 text-sm text-neutral-500">
                    Double-check the number on your ticket.
                  </p>
                </div>
              )
            ) : (
              <div className="rounded-2xl border border-dashed border-neutral-300 p-5 text-center text-sm text-neutral-500 dark:border-neutral-800">
                Type the number from your ticket above to see if you won.
              </div>
            )}
          </div>

          {showWinnersList && (
            <details className="group rounded-2xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900/50 dark:shadow-none">
              <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-4 text-sm font-medium text-neutral-700 dark:text-neutral-300">
                <span>
                  See all winners{" "}
                  <span className="text-neutral-500">({prizes.length})</span>
                </span>
                <span className="text-neutral-400 transition group-open:rotate-180 dark:text-neutral-500">
                  ▾
                </span>
              </summary>
              <div className="max-h-96 overflow-y-auto border-t border-neutral-200 dark:border-neutral-800">
                <table className="w-full text-sm">
                  <tbody>
                    {prizes.map((p) => (
                      <tr
                        key={p.id}
                        className="border-b border-neutral-100 dark:border-neutral-800/60"
                      >
                        <td className="px-5 py-2.5 font-mono text-neutral-800 dark:text-neutral-300">
                          {p.ticket_number}
                        </td>
                        <td className="px-5 py-2.5 text-right text-neutral-600 dark:text-neutral-400">
                          {p.prize_name}
                        </td>
                      </tr>
                    ))}
                    {prizes.length === 0 && (
                      <tr>
                        <td className="px-5 py-4 text-center text-neutral-500">
                          No winners drawn yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </details>
          )}
        </div>
      </div>
    </main>
  );
}

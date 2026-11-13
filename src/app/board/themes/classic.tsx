import { accentCssVars } from "@/lib/board-themes";
import { TrophyIcon, SearchIcon } from "../icons";
import { formatEventDate, type ThemeProps } from "../theme-types";

export default function ClassicTheme({
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
      className="min-h-screen bg-neutral-950 px-4 pb-16 pt-10 text-white sm:px-6"
      style={accentCssVars(accent)}
    >
      <div className="mx-auto max-w-lg">
        <div className="mb-8 flex flex-col items-center text-center">
          <span className="mb-3 inline-flex items-center rounded-full bg-neutral-800 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-neutral-400">Prize winners</span>
          <h1 className="text-balance text-3xl font-bold leading-tight">
            {title}
          </h1>
          {eventDate && (
            <p className="mt-1 text-sm text-neutral-500">
              {formatEventDate(eventDate)}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-6">
          <div className="sticky top-0 z-10 -mx-4 bg-neutral-950/95 px-4 pb-4 pt-1 backdrop-blur sm:mx-0 sm:rounded-2xl sm:border sm:border-neutral-800 sm:p-5">
            <label
              htmlFor="ticket-search"
              className="mb-2 block text-sm font-medium text-neutral-400"
            >
              Enter your ticket number
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-4 flex items-center">
                <SearchIcon className="h-5 w-5 text-neutral-500" />
              </div>
              <input
                id="ticket-search"
                autoFocus
                inputMode="numeric"
                value={query}
                onChange={(e) => onQueryChange(e.target.value)}
                placeholder="0719054"
                className="w-full rounded-xl border-2 bg-neutral-900 py-4 pl-12 pr-4 text-2xl font-semibold tracking-wide text-white outline-none placeholder:text-neutral-600"
                style={{ borderColor: "var(--accent-border)" }}
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
                      className="flex items-start gap-4 rounded-2xl border-2 bg-neutral-900 p-5"
                      style={{ borderColor: "var(--accent)" }}
                    >
                      <span
                        className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
                        style={{ backgroundColor: "var(--accent-soft)" }}
                      >
                        <TrophyIcon className="h-5 w-5 text-[var(--accent)]" />
                      </span>
                      <div>
                        <p
                          className="mb-1 text-xs font-bold uppercase tracking-widest"
                          style={{ color: "var(--accent)" }}
                        >
                          You&rsquo;re a winner
                        </p>
                        <p className="mb-1 text-xl font-bold leading-tight text-white">
                          {m.prize_name}
                        </p>
                        <p className="font-mono text-sm text-neutral-400">
                          Ticket #{m.ticket_number}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5 text-center">
                  <p className="text-lg font-medium text-neutral-300">
                    No match for &ldquo;{query}&rdquo;
                  </p>
                  <p className="mt-1 text-sm text-neutral-500">
                    Double-check the number on your ticket.
                  </p>
                </div>
              )
            ) : (
              <div className="rounded-2xl border border-dashed border-neutral-800 p-5 text-center text-sm text-neutral-500">
                Type the number from your ticket above to see if you won.
              </div>
            )}
          </div>

          {showWinnersList && (
          <details className="group rounded-2xl border border-neutral-800 bg-neutral-900/50">
            <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-4 text-sm font-medium text-neutral-300">
              <span>
                See all winners{" "}
                <span className="text-neutral-500">({prizes.length})</span>
              </span>
              <span className="text-neutral-500 transition group-open:rotate-180">
                ▾
              </span>
            </summary>
            <div className="max-h-96 overflow-y-auto border-t border-neutral-800">
              <table className="w-full text-sm">
                <tbody>
                  {prizes.map((p) => (
                    <tr
                      key={p.id}
                      className="border-b border-neutral-800/60 transition-colors"
                    >
                      <td className="px-5 py-2.5 font-mono text-neutral-300">
                        {p.ticket_number}
                      </td>
                      <td className="px-5 py-2.5 text-right text-neutral-400">
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

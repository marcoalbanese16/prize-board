import { Playfair_Display } from "next/font/google";
import { accentCssVars } from "@/lib/board-themes";
import { formatEventDate, type ThemeProps } from "../theme-types";

// Variable font: no explicit weights, so dev and build both load one file.
const playfair = Playfair_Display({
  subsets: ["latin"],
  style: ["normal", "italic"],
  variable: "--font-playfair",
});

export default function ElegantTheme({
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
      className={`${playfair.variable} min-h-screen bg-[#faf6ee] px-4 pb-16 pt-14 text-[#1f1b16] sm:px-6 dark:bg-[#0c0c0d] dark:text-white`}
      style={accentCssVars(accent, mode)}
    >
      <div className="mx-auto max-w-lg">
        <div className="mb-10 flex flex-col items-center text-center">
          <p
            className="mb-4 text-[10px] font-semibold uppercase tracking-[0.35em]"
            style={{ color: "var(--accent-ink)" }}
          >
            Prize winners
          </p>
          <h1 className="font-elegant text-balance text-4xl italic leading-tight text-[#1f1b16] sm:text-5xl dark:text-white">
            {title}
          </h1>
          <div
            className="my-4 h-px w-24"
            style={{ backgroundColor: "var(--accent-edge)" }}
          />
          {eventDate && (
            <p className="text-sm tracking-wide text-neutral-600 dark:text-neutral-400">
              {formatEventDate(eventDate)}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-7">
          <div className="sticky top-0 z-10 -mx-4 bg-[#faf6ee]/95 px-4 pb-4 pt-1 backdrop-blur sm:mx-0 sm:px-0 dark:bg-[#0c0c0d]/95">
            <label
              htmlFor="ticket-search"
              className="mb-2 block text-center text-xs uppercase tracking-[0.2em] text-neutral-500 dark:text-neutral-400"
            >
              Enter your ticket number
            </label>
            <input
              id="ticket-search"
              autoFocus
              inputMode="numeric"
              value={query}
              onChange={(e) => onQueryChange(e.target.value)}
              placeholder="0719054"
              className="w-full border-0 border-b-2 bg-transparent py-3 text-center text-2xl font-light tracking-[0.3em] text-[#1f1b16] outline-none placeholder:text-neutral-300 dark:text-white dark:placeholder:text-neutral-700"
              style={{ borderColor: "var(--accent-edge)" }}
            />
          </div>

          <div aria-live="polite">
            {query.trim() ? (
              matches.length > 0 ? (
                <div className="flex flex-col gap-4">
                  {matches.map((m) => (
                    <div
                      key={m.id}
                      className="border bg-white/70 p-6 text-center shadow-sm dark:bg-transparent dark:shadow-none"
                      style={{ borderColor: "var(--accent-border)" }}
                    >
                      <p
                        className="mb-3 text-[10px] font-semibold uppercase tracking-[0.3em]"
                        style={{ color: "var(--accent-ink)" }}
                      >
                        ✦ You&rsquo;re a winner ✦
                      </p>
                      <p className="font-elegant mb-2 text-2xl italic leading-tight text-[#1f1b16] dark:text-white">
                        {m.prize_name}
                      </p>
                      <p className="font-mono text-sm tracking-wide text-neutral-500 dark:text-neutral-400">
                        Ticket #{m.ticket_number}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="border border-neutral-300 bg-white/50 p-6 text-center dark:border-neutral-800 dark:bg-transparent">
                  <p className="text-lg font-light text-neutral-700 dark:text-neutral-300">
                    No match for &ldquo;{query}&rdquo;
                  </p>
                  <p className="mt-1 text-sm text-neutral-500">
                    Double-check the number on your ticket.
                  </p>
                </div>
              )
            ) : (
              <div className="border border-dashed border-neutral-300 p-6 text-center text-sm text-neutral-500 dark:border-neutral-800">
                Type the number from your ticket above to see if you won.
              </div>
            )}
          </div>

          {showWinnersList && (
            <details className="group border-t border-neutral-300 pt-4 dark:border-neutral-800">
              <summary className="flex cursor-pointer list-none items-center justify-between text-xs uppercase tracking-[0.2em] text-neutral-500 dark:text-neutral-400">
                <span>
                  See all winners{" "}
                  <span className="text-neutral-400 dark:text-neutral-600">
                    ({prizes.length})
                  </span>
                </span>
                <span className="transition group-open:rotate-180">▾</span>
              </summary>
              <div className="mt-3 max-h-96 overflow-y-auto">
                <table className="w-full text-sm">
                  <tbody>
                    {prizes.map((p) => (
                      <tr
                        key={p.id}
                        className="border-b border-neutral-200 dark:border-neutral-900"
                      >
                        <td className="px-1 py-2.5 font-mono text-neutral-800 dark:text-neutral-300">
                          {p.ticket_number}
                        </td>
                        <td className="font-elegant px-1 py-2.5 text-right italic text-neutral-600 dark:text-neutral-400">
                          {p.prize_name}
                        </td>
                      </tr>
                    ))}
                    {prizes.length === 0 && (
                      <tr>
                        <td className="px-1 py-4 text-center text-neutral-500">
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

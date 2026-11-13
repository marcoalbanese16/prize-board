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
      className={`${playfair.variable} min-h-screen bg-[#0c0c0d] px-4 pb-16 pt-14 text-white sm:px-6`}
      style={accentCssVars(accent)}
    >
      <div className="mx-auto max-w-lg">
        <div className="mb-10 flex flex-col items-center text-center">
          <p
            className="mb-4 text-[10px] font-semibold uppercase tracking-[0.35em]"
            style={{ color: "var(--accent)" }}
          >
            Prize winners
          </p>
          <h1 className="font-elegant text-balance text-4xl italic leading-tight sm:text-5xl">
            {title}
          </h1>
          <div
            className="my-4 h-px w-24"
            style={{ backgroundColor: "var(--accent)" }}
          />
          {eventDate && (
            <p className="text-sm tracking-wide text-neutral-400">
              {formatEventDate(eventDate)}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-7">
          <div className="sticky top-0 z-10 -mx-4 bg-[#0c0c0d]/95 px-4 pb-4 pt-1 backdrop-blur sm:mx-0 sm:px-0">
            <label
              htmlFor="ticket-search"
              className="mb-2 block text-center text-xs uppercase tracking-[0.2em] text-neutral-400"
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
              className="w-full border-0 border-b bg-transparent py-3 text-center text-2xl font-light tracking-[0.3em] text-white outline-none placeholder:text-neutral-700"
              style={{ borderColor: "var(--accent-border)" }}
            />
          </div>

          <div aria-live="polite">
            {query.trim() ? (
              matches.length > 0 ? (
                <div className="flex flex-col gap-4">
                  {matches.map((m) => (
                    <div
                      key={m.id}
                      className="border p-6 text-center"
                      style={{ borderColor: "var(--accent-border)" }}
                    >
                      <p
                        className="mb-3 text-[10px] font-semibold uppercase tracking-[0.3em]"
                        style={{ color: "var(--accent)" }}
                      >
                        ✦ You&rsquo;re a winner ✦
                      </p>
                      <p className="mb-2 text-2xl italic leading-tight text-white">
                        {m.prize_name}
                      </p>
                      <p className="font-mono text-sm tracking-wide text-neutral-400">
                        Ticket #{m.ticket_number}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="border border-neutral-800 p-6 text-center">
                  <p className="text-lg font-light text-neutral-300">
                    No match for &ldquo;{query}&rdquo;
                  </p>
                  <p className="mt-1 text-sm text-neutral-500">
                    Double-check the number on your ticket.
                  </p>
                </div>
              )
            ) : (
              <div className="border border-dashed border-neutral-800 p-6 text-center text-sm text-neutral-500">
                Type the number from your ticket above to see if you won.
              </div>
            )}
          </div>

          {showWinnersList && (
          <details className="group border-t border-neutral-800 pt-4">
            <summary className="flex cursor-pointer list-none items-center justify-between text-xs uppercase tracking-[0.2em] text-neutral-400">
              <span>
                See all winners{" "}
                <span className="text-neutral-600">({prizes.length})</span>
              </span>
              <span className="transition group-open:rotate-180">▾</span>
            </summary>
            <div className="mt-3 max-h-96 overflow-y-auto">
              <table className="w-full text-sm">
                <tbody>
                  {prizes.map((p) => (
                    <tr
                      key={p.id}
                      className="border-b border-neutral-900 transition-colors"
                    >
                      <td className="px-1 py-2.5 font-mono text-neutral-300">
                        {p.ticket_number}
                      </td>
                      <td className="px-1 py-2.5 text-right italic text-neutral-400">
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

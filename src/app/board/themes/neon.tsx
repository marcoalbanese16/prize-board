import { Russo_One } from "next/font/google";
import { accentCssVars } from "@/lib/board-themes";
import { TrophyIcon, SparkleIcon } from "../icons";
import { formatEventDate, type ThemeProps } from "../theme-types";

const russo = Russo_One({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-russo",
});

export default function NeonTheme({
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
      className={`${russo.variable} min-h-screen bg-black px-4 pb-16 pt-10 text-white sm:px-6`}
      style={accentCssVars(accent)}
    >
      <div className="mx-auto max-w-lg">
        <div className="mb-8 flex flex-col items-center text-center">
          <span className="mb-4 inline-flex items-center rounded-full border border-neutral-700 px-3 py-1 text-xs font-bold uppercase tracking-widest text-neutral-400">Prize winners</span>
          <h1
            className="font-neon text-balance text-4xl uppercase leading-tight sm:text-5xl"
            style={{
              color: "var(--accent)",
              textShadow:
                "0 0 10px var(--accent-glow), 0 0 30px var(--accent-glow)",
            }}
          >
            {title}
          </h1>
          {eventDate && (
            <p className="mt-2 text-sm text-neutral-500">
              {formatEventDate(eventDate)}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-6">
          <div className="sticky top-0 z-10 -mx-4 bg-black/95 px-4 pb-4 pt-1 backdrop-blur sm:mx-0 sm:rounded-2xl sm:border sm:p-5" style={{ borderColor: "var(--accent-soft)" }}>
            <label
              htmlFor="ticket-search"
              className="mb-2 block text-sm font-medium text-neutral-400"
            >
              Enter your ticket number
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-4 flex items-center">
                <SparkleIcon className="h-5 w-5 text-[var(--accent)]" />
              </div>
              <input
                id="ticket-search"
                autoFocus
                inputMode="numeric"
                value={query}
                onChange={(e) => onQueryChange(e.target.value)}
                placeholder="0719054"
                className="w-full rounded-xl border-2 bg-neutral-950 py-4 pl-12 pr-4 text-2xl font-semibold tracking-wide text-white outline-none placeholder:text-neutral-700"
                style={{
                  borderColor: "var(--accent)",
                  boxShadow: "0 0 18px -4px var(--accent-glow)",
                }}
              />
            </div>
          </div>

          <div aria-live="polite">
            {query.trim() ? (
              matches.length > 0 ? (
                <div className="flex flex-col gap-4">
                  {matches.map((m) => (
                    <div
                      key={m.id}
                      className="rounded-2xl border-2 bg-neutral-950 p-5"
                      style={{
                        borderColor: "var(--accent)",
                        boxShadow:
                          "0 0 25px -4px var(--accent-glow), inset 0 0 25px -12px var(--accent-glow)",
                      }}
                    >
                      <div className="mb-3 flex items-center gap-2">
                        <TrophyIcon className="h-6 w-6 text-[var(--accent)]" />
                        <p
                          className="font-neon text-sm uppercase tracking-widest"
                          style={{ color: "var(--accent)" }}
                        >
                          Winner!
                        </p>
                      </div>
                      <p className="mb-1 text-2xl font-bold leading-tight text-white">
                        {m.prize_name}
                      </p>
                      <p className="font-mono text-base text-neutral-400">
                        Ticket #{m.ticket_number}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-5 text-center">
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
          <details className="group rounded-2xl border border-neutral-800 bg-neutral-950/50">
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
                      className="border-b border-neutral-900 transition-colors"
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

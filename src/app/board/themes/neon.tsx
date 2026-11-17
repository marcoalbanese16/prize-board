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
  mode,
  live,
  title,
  eventDate,
  accent,
  query,
  onQueryChange,
  matches,
  prizes,
  showWinnersList,
}: ThemeProps) {
  const dark = mode === "dark";

  return (
    <main
      data-mode={mode}
      className={`${russo.variable} min-h-screen bg-white px-4 pb-16 pt-10 text-neutral-900 sm:px-6 dark:bg-black dark:text-white`}
      style={{
        ...accentCssVars(accent, mode),
        backgroundImage:
          "radial-gradient(var(--accent-soft) 1.5px, transparent 1.5px)",
        backgroundSize: "22px 22px",
      }}
    >
      <div className="mx-auto max-w-lg">
        <div className="mb-8 flex flex-col items-center text-center">
          <span
            className="mb-4 inline-flex items-center rounded-full border-2 bg-white px-3 py-1 text-xs font-bold uppercase tracking-widest dark:bg-black"
            style={{
              borderColor: "var(--accent-edge)",
              color: "var(--accent-ink)",
              boxShadow: "0 0 14px -2px var(--accent-glow)",
            }}
          >
            {live ? "Live results" : "Prize winners"}
          </span>
          <h1
            className="font-neon text-balance text-4xl uppercase leading-tight text-neutral-900 sm:text-5xl dark:text-[var(--accent-ink)]"
            style={{
              textShadow: dark
                ? "0 0 10px var(--accent-glow), 0 0 30px var(--accent-glow)"
                : "3px 3px 0 var(--accent-edge), 0 0 26px var(--accent-glow)",
            }}
          >
            {title}
          </h1>
          {eventDate && (
            <p className="mt-3 text-sm font-medium text-neutral-500">
              {formatEventDate(eventDate)}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-6">
          <div
            className="sticky top-0 z-10 -mx-4 bg-white/90 px-4 pb-4 pt-1 backdrop-blur sm:mx-0 sm:rounded-2xl sm:border sm:bg-white sm:p-5 dark:bg-black/95 dark:sm:bg-black"
            style={{ borderColor: "var(--accent-border)" }}
          >
            <label
              htmlFor="ticket-search"
              className="mb-2 block text-sm font-semibold text-neutral-600 dark:text-neutral-400"
            >
              Enter your ticket number
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-4 flex items-center">
                <SparkleIcon className="h-5 w-5 text-[var(--accent-ink)]" />
              </div>
              <input
                id="ticket-search"
                autoFocus
                inputMode="numeric"
                value={query}
                onChange={(e) => onQueryChange(e.target.value)}
                placeholder="0719054"
                className="w-full rounded-xl border-2 bg-white py-4 pl-12 pr-4 text-2xl font-semibold tracking-wide text-neutral-900 outline-none placeholder:text-neutral-400 dark:bg-neutral-950 dark:text-white dark:placeholder:text-neutral-700"
                style={{
                  borderColor: "var(--accent-edge)",
                  boxShadow: "0 0 20px -4px var(--accent-glow)",
                }}
              />
            </div>
          </div>

          <div aria-live="polite">
            {query.trim() ? (
              matches.length > 0 ? (
                <div className="flex flex-col gap-5">
                  {matches.map((m) => (
                    <div
                      key={m.id}
                      className="rounded-2xl border-2 bg-white p-5 dark:bg-neutral-950"
                      style={{
                        borderColor: "var(--accent-edge)",
                        boxShadow: dark
                          ? "0 0 25px -4px var(--accent-glow), inset 0 0 25px -12px var(--accent-glow)"
                          : "5px 5px 0 var(--accent-edge), 0 0 28px -6px var(--accent-glow)",
                      }}
                    >
                      <div className="mb-3 flex items-center gap-2">
                        <TrophyIcon className="h-6 w-6 text-[var(--accent-ink)]" />
                        <p
                          className="font-neon text-sm uppercase tracking-widest"
                          style={{ color: "var(--accent-ink)" }}
                        >
                          Winner!
                        </p>
                      </div>
                      <p className="mb-1 text-2xl font-bold leading-tight text-neutral-900 dark:text-white">
                        {m.prize_name}
                      </p>
                      <p className="font-mono text-base text-neutral-500 dark:text-neutral-400">
                        Ticket #{m.ticket_number}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-neutral-200 bg-white p-5 text-center shadow-sm dark:border-neutral-800 dark:bg-neutral-950 dark:shadow-none">
                  <p className="text-lg font-medium text-neutral-800 dark:text-neutral-300">
                    No match for &ldquo;{query}&rdquo;
                  </p>
                  <p className="mt-1 text-sm text-neutral-500">
                    {live
                      ? "Winners are still being drawn. Check back soon."
                      : "Double-check the number on your ticket."}
                  </p>
                </div>
              )
            ) : (
              <div className="rounded-2xl border-2 border-dashed border-neutral-300 bg-white/80 p-5 text-center text-sm text-neutral-500 dark:border-neutral-800 dark:bg-transparent">
                Type the number from your ticket above to see if you won.
              </div>
            )}
          </div>

          {showWinnersList && (
            <details className="group rounded-2xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-950/50 dark:shadow-none">
              <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-4 text-sm font-semibold text-neutral-700 dark:text-neutral-300">
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
                        className="border-b border-neutral-100 dark:border-neutral-900"
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

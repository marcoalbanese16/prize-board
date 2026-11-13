import { Baloo_2 } from "next/font/google";
import { accentCssVars } from "@/lib/board-themes";
import { TrophyIcon, TicketIcon } from "../icons";
import { formatEventDate, type ThemeProps } from "../theme-types";

const baloo = Baloo_2({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-baloo",
});

export default function CarnivalTheme({
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
  const dark = mode === "dark";
  const page = dark ? "#0a0a0a" : "#fff8ec";
  // The scalloped fringe is the colour the marquee band ends on.
  const fringe = dark ? "#450a0a" : "#991b1b";

  return (
    <main
      data-mode={mode}
      className={`${baloo.variable} min-h-screen bg-[#fff8ec] pb-16 text-neutral-900 dark:bg-neutral-950 dark:text-white`}
      style={accentCssVars(accent, mode)}
    >
      <div className="relative overflow-hidden bg-gradient-to-b from-red-600 to-red-800 px-4 pb-8 pt-8 sm:px-6 dark:from-red-800 dark:to-red-950">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.16] dark:opacity-[0.12]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(135deg, #fff 0px, #fff 2px, transparent 2px, transparent 18px)",
          }}
        />
        <div className="relative mb-5 flex justify-center gap-3">
          {Array.from({ length: 9 }).map((_, i) => (
            <span
              key={i}
              className="h-2.5 w-2.5 rounded-full ring-2 ring-white/70 dark:ring-1 dark:ring-white/50"
              style={{
                backgroundColor: "var(--accent)",
                boxShadow: "0 0 8px 2px var(--accent-glow)",
                animation: "carnival-twinkle 1.6s ease-in-out infinite",
                animationDelay: `${i * 0.12}s`,
              }}
            />
          ))}
        </div>

        <div className="relative mx-auto flex max-w-lg flex-col items-center text-center">
          <span className="mb-3 inline-flex items-center rounded-full border border-white/50 bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-white dark:border-white/20 dark:bg-white/5 dark:text-neutral-300">
            Prize winners
          </span>
          <h1 className="font-carnival text-balance text-4xl font-extrabold leading-tight text-white drop-shadow-[0_3px_0_rgba(127,29,29,0.55)] sm:text-5xl dark:text-[var(--accent-ink)] dark:drop-shadow-[0_2px_0_rgba(0,0,0,0.35)]">
            {title}
          </h1>
          {eventDate && (
            <p className="mt-2 text-sm font-medium text-red-100 dark:text-red-200/80">
              {formatEventDate(eventDate)}
            </p>
          )}
        </div>
      </div>

      <div
        aria-hidden
        className="h-[10px]"
        style={{
          backgroundImage: `radial-gradient(circle at 10px 0, ${fringe} 9.5px, transparent 10px)`,
          backgroundSize: "20px 10px",
          backgroundRepeat: "repeat-x",
        }}
      />

      <div className="mx-auto max-w-lg px-4 pt-6 sm:px-6">
        <div className="flex flex-col gap-6">
          <div
            className="sticky top-0 z-10 -mx-4 px-4 pb-4 pt-1 backdrop-blur sm:mx-0 sm:rounded-2xl sm:border-2 sm:bg-white sm:p-5 sm:shadow-sm dark:sm:bg-neutral-950 dark:sm:shadow-none"
            style={{
              borderColor: "var(--accent-border)",
              backgroundColor: dark
                ? "rgba(10, 10, 10, 0.95)"
                : "rgba(255, 248, 236, 0.95)",
            }}
          >
            <label
              htmlFor="ticket-search"
              className="font-carnival mb-2 block text-base font-semibold"
              style={{ color: "var(--accent-ink)" }}
            >
              Enter your ticket number
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-5 flex items-center">
                <TicketIcon className="h-5 w-5 text-[var(--accent-ink)]" />
              </div>
              <input
                id="ticket-search"
                autoFocus
                inputMode="numeric"
                value={query}
                onChange={(e) => onQueryChange(e.target.value)}
                placeholder="0719054"
                className="w-full rounded-full border-2 bg-white py-4 pl-14 pr-5 text-2xl font-semibold tracking-wide text-neutral-900 outline-none placeholder:text-neutral-400 dark:bg-[#1c0e10] dark:text-white dark:placeholder:text-neutral-600"
                style={{ borderColor: "var(--accent-edge)" }}
              />
            </div>
          </div>

          <div aria-live="polite">
            {query.trim() ? (
              matches.length > 0 ? (
                <div className="flex flex-col gap-4">
                  {matches.map((m) => (
                    <div key={m.id} className="relative">
                      <div
                        className="overflow-hidden rounded-2xl border-2 bg-white dark:bg-gradient-to-br dark:from-red-900 dark:to-neutral-900"
                        style={{
                          borderColor: "var(--accent-edge)",
                          boxShadow: "0 10px 28px -12px var(--accent-glow)",
                        }}
                      >
                        <div
                          className="flex items-center gap-3 px-5 py-3"
                          style={{
                            backgroundColor: "var(--accent)",
                            color: "var(--on-accent)",
                          }}
                        >
                          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-neutral-900">
                            <TrophyIcon className="h-6 w-6" />
                          </span>
                          <p className="font-carnival text-base font-bold uppercase tracking-widest">
                            You&rsquo;re a winner!
                          </p>
                        </div>
                        <div
                          className="border-t-2 border-dashed p-5"
                          style={{ borderColor: "var(--accent-border)" }}
                        >
                          <p className="mb-1 text-2xl font-bold leading-tight text-neutral-900 dark:text-white">
                            {m.prize_name}
                          </p>
                          <p
                            className="font-mono text-base"
                            style={{ color: "var(--accent-ink)" }}
                          >
                            Ticket #{m.ticket_number}
                          </p>
                        </div>
                      </div>
                      <span
                        className="absolute -left-3 top-[52px] h-6 w-6 rounded-full"
                        style={{ backgroundColor: page }}
                      />
                      <span
                        className="absolute -right-3 top-[52px] h-6 w-6 rounded-full"
                        style={{ backgroundColor: page }}
                      />
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
              <div
                className="rounded-2xl border-2 border-dashed p-5 text-center text-sm text-neutral-600 dark:text-neutral-400"
                style={{ borderColor: "var(--accent-border)" }}
              >
                🎪 Type the number from your ticket above to see if you won.
              </div>
            )}
          </div>

          {showWinnersList && (
            <details
              className="group overflow-hidden rounded-2xl border bg-white shadow-sm dark:bg-neutral-900/50 dark:shadow-none"
              style={{ borderColor: "var(--accent-border)" }}
            >
              <summary
                className="font-carnival flex cursor-pointer list-none items-center justify-between px-5 py-4 text-sm font-semibold"
                style={{ color: "var(--accent-ink)" }}
              >
                <span>
                  See all winners{" "}
                  <span className="text-neutral-500">({prizes.length})</span>
                </span>
                <span className="text-neutral-500 transition group-open:rotate-180">
                  ▾
                </span>
              </summary>
              <div
                className="max-h-96 overflow-y-auto border-t"
                style={{ borderColor: "var(--accent-border)" }}
              >
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

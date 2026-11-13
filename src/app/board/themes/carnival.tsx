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
      className={`${baloo.variable} min-h-screen bg-neutral-950 pb-16 text-white`}
      style={accentCssVars(accent)}
    >
      <div className="relative overflow-hidden bg-gradient-to-b from-red-800 to-red-950 px-4 pb-8 pt-8 shadow-[0_4px_30px_rgba(0,0,0,0.4)] sm:px-6">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.15]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(135deg, #fff 0px, #fff 2px, transparent 2px, transparent 18px)",
          }}
        />
        <div className="relative mb-5 flex justify-center gap-3">
          {Array.from({ length: 9 }).map((_, i) => (
            <span
              key={i}
              className="h-2 w-2 rounded-full"
              style={{
                backgroundColor: "var(--accent)",
                boxShadow: "0 0 6px 2px var(--accent-glow)",
                animation: "carnival-twinkle 1.6s ease-in-out infinite",
                animationDelay: `${i * 0.12}s`,
              }}
            />
          ))}
        </div>

        <div className="relative mx-auto flex max-w-lg flex-col items-center text-center">
          <span className="mb-3 inline-flex items-center rounded-full border border-white/20 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-neutral-300">Prize winners</span>
          <h1
            className="font-carnival text-balance text-4xl font-extrabold leading-tight drop-shadow-[0_2px_0_rgba(0,0,0,0.35)] sm:text-5xl"
            style={{ color: "var(--accent)" }}
          >
            {title}
          </h1>
          {eventDate && (
            <p className="mt-2 text-sm text-red-200/80">
              {formatEventDate(eventDate)}
            </p>
          )}
        </div>

        <div
          className="absolute inset-x-0 -bottom-px h-4"
          style={{
            backgroundImage:
              "radial-gradient(circle at 10px 0, transparent 10px, #0a0a0a 10.5px)",
            backgroundSize: "20px 20px",
            backgroundPosition: "0 -10px",
            backgroundRepeat: "repeat-x",
          }}
        />
      </div>

      <div className="mx-auto max-w-lg px-4 pt-6 sm:px-6">
        <div className="flex flex-col gap-6">
          <div
            className="sticky top-0 z-10 -mx-4 bg-neutral-950/95 px-4 pb-4 pt-1 backdrop-blur sm:mx-0 sm:rounded-2xl sm:border-2 sm:p-5"
            style={{ borderColor: "var(--accent-soft)" }}
          >
            <label
              htmlFor="ticket-search"
              className="font-carnival mb-2 block text-base font-semibold"
              style={{ color: "var(--accent)" }}
            >
              Enter your ticket number
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-5 flex items-center">
                <TicketIcon className="h-5 w-5 text-[var(--accent)]" />
              </div>
              <input
                id="ticket-search"
                autoFocus
                inputMode="numeric"
                value={query}
                onChange={(e) => onQueryChange(e.target.value)}
                placeholder="0719054"
                className="w-full rounded-full border-2 bg-[#1c0e10] py-4 pl-14 pr-5 text-2xl font-semibold tracking-wide text-white outline-none placeholder:text-neutral-600"
                style={{ borderColor: "var(--accent-border)" }}
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
                        className="overflow-hidden rounded-2xl border-2 bg-gradient-to-br from-red-900 to-neutral-900"
                        style={{
                          borderColor: "var(--accent)",
                          boxShadow: "0 0 30px -8px var(--accent-glow)",
                        }}
                      >
                        <div
                          className="flex items-center gap-3 px-5 py-3"
                          style={{ backgroundColor: "var(--accent)" }}
                        >
                          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white">
                            <TrophyIcon className="h-6 w-6 text-neutral-950" />
                          </span>
                          <p className="font-carnival text-base font-bold uppercase tracking-widest text-neutral-950">
                            You&rsquo;re a winner!
                          </p>
                        </div>
                        <div
                          className="border-t-2 border-dashed p-5"
                          style={{ borderColor: "var(--accent-border)" }}
                        >
                          <p className="mb-1 text-2xl font-bold leading-tight text-white">
                            {m.prize_name}
                          </p>
                          <p
                            className="font-mono text-base"
                            style={{ color: "var(--accent)" }}
                          >
                            Ticket #{m.ticket_number}
                          </p>
                        </div>
                      </div>
                      <span className="absolute -left-3 top-[52px] h-6 w-6 rounded-full bg-neutral-950" />
                      <span className="absolute -right-3 top-[52px] h-6 w-6 rounded-full bg-neutral-950" />
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
              <div
                className="rounded-2xl border border-dashed p-5 text-center text-sm text-neutral-400"
                style={{ borderColor: "var(--accent-soft)" }}
              >
                🎪 Type the number from your ticket above to see if you won.
              </div>
            )}
          </div>

          {showWinnersList && (
          <details
            className="group overflow-hidden rounded-2xl border bg-neutral-900/50"
            style={{ borderColor: "var(--accent-soft)" }}
          >
            <summary
              className="font-carnival flex cursor-pointer list-none items-center justify-between px-5 py-4 text-sm font-semibold"
              style={{ color: "var(--accent)" }}
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
              style={{ borderColor: "var(--accent-soft)" }}
            >
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

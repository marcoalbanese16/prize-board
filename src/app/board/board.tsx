"use client";

import { useEffect, useMemo, useState } from "react";
import type { BoardData } from "@/lib/board-data";
import { findMatches } from "@/lib/ticket";
import { useLiveWinners } from "@/lib/use-live-winners";
import type { Prize } from "./theme-types";
import CarnivalTheme from "./themes/carnival";
import ClassicTheme from "./themes/classic";
import ElegantTheme from "./themes/elegant";
import NeonTheme from "./themes/neon";

const THEME_COMPONENTS = {
  carnival: CarnivalTheme,
  classic: ClassicTheme,
  elegant: ElegantTheme,
  neon: NeonTheme,
};

function Shell({
  dark,
  children,
}: {
  dark: boolean;
  children: React.ReactNode;
}) {
  return (
    <main
      className={`flex min-h-screen flex-col items-center justify-center gap-3 px-6 text-center ${
        dark ? "bg-neutral-950 text-white" : "bg-neutral-50 text-neutral-900"
      }`}
    >
      {children}
    </main>
  );
}

export default function Board({ board }: { board: BoardData }) {
  const [query, setQuery] = useState("");
  const isLive = board.sheet !== null;
  const dark = board.mode === "dark";
  const live = useLiveWinners(board.sheet);

  // A live board reads its winners from the sheet; a snapshot has them in the link.
  const winners = isLive ? live.winners : board.winners;

  const prizes: Prize[] = useMemo(
    () =>
      (winners ?? []).map((w, i) => ({
        id: String(i),
        ticket_number: w.ticket,
        prize_name: w.prize,
      })),
    [winners]
  );

  const matches = useMemo(() => findMatches(prizes, query), [prizes, query]);

  // A guest who searched and found nothing may just be ahead of the sheet, so
  // check again shortly after they stop typing (the poller throttles this).
  const { refresh } = live;
  useEffect(() => {
    if (!isLive || !query.trim() || matches.length > 0) return;
    const timer = setTimeout(refresh, 800);
    return () => clearTimeout(timer);
  }, [isLive, query, matches.length, refresh]);

  if (isLive && winners === null) {
    if (live.failed) {
      return (
        <Shell dark={dark}>
          <p className="text-5xl">📡</p>
          <h1 className="text-xl font-bold">Couldn&apos;t load the results</h1>
          <p className={`max-w-sm text-sm ${dark ? "text-neutral-400" : "text-neutral-500"}`}>
            Check your connection and try again.
          </p>
          <button
            type="button"
            onClick={live.retry}
            className={`mt-3 rounded-lg border px-4 py-2 text-sm font-medium transition ${
              dark
                ? "border-neutral-700 text-neutral-300 hover:border-neutral-500 hover:text-white"
                : "border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-100"
            }`}
          >
            Try again
          </button>
        </Shell>
      );
    }
    return (
      <Shell dark={dark}>
        <p className={`text-sm ${dark ? "text-neutral-500" : "text-neutral-500"}`}>
          Loading results…
        </p>
      </Shell>
    );
  }

  const ThemeComponent = THEME_COMPONENTS[board.theme] ?? CarnivalTheme;
  const showStaleNotice = isLive && live.failed && live.updatedAt !== null;

  return (
    <>
      <ThemeComponent
        mode={board.mode}
        live={isLive}
        title={board.title}
        eventDate={board.date}
        accent={board.accent}
        query={query}
        onQueryChange={setQuery}
        matches={matches}
        prizes={prizes}
        showWinnersList={board.showList}
      />
      {showStaleNotice && (
        <div
          role="status"
          className={`fixed inset-x-3 bottom-3 z-20 mx-auto max-w-md rounded-xl border px-4 py-2.5 text-center text-xs shadow-lg ${
            dark
              ? "border-neutral-700 bg-neutral-900 text-neutral-300"
              : "border-neutral-200 bg-white text-neutral-600"
          }`}
        >
          Couldn&apos;t refresh just now, so these are the latest results we
          have (from{" "}
          {new Date(live.updatedAt!).toLocaleTimeString([], {
            hour: "numeric",
            minute: "2-digit",
          })}
          ). We&apos;ll keep trying.
        </div>
      )}
    </>
  );
}

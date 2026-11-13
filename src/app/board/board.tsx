"use client";

import { useMemo, useState } from "react";
import type { BoardData } from "@/lib/board-data";
import { findMatches } from "@/lib/ticket";
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

export default function Board({ board }: { board: BoardData }) {
  const [query, setQuery] = useState("");

  const prizes: Prize[] = useMemo(
    () =>
      board.winners.map((w, i) => ({
        id: String(i),
        ticket_number: w.ticket,
        prize_name: w.prize,
      })),
    [board.winners]
  );

  const matches = useMemo(() => findMatches(prizes, query), [prizes, query]);

  const ThemeComponent = THEME_COMPONENTS[board.theme] ?? CarnivalTheme;

  return (
    <ThemeComponent
      mode={board.mode}
      title={board.title}
      eventDate={board.date}
      accent={board.accent}
      query={query}
      onQueryChange={setQuery}
      matches={matches}
      prizes={prizes}
      showWinnersList={board.showList}
    />
  );
}

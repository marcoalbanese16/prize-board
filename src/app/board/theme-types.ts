import type { BoardMode } from "@/lib/board-themes";

export type Prize = {
  id: string;
  ticket_number: string;
  prize_name: string;
};

export type ThemeProps = {
  mode: BoardMode;
  /** A live board: results come from a Google Sheet and update by themselves. */
  live: boolean;
  title: string;
  eventDate: string | null;
  accent: string;
  query: string;
  onQueryChange: (value: string) => void;
  matches: Prize[];
  prizes: Prize[];
  showWinnersList: boolean;
};

export function formatEventDate(eventDate: string | null) {
  if (!eventDate) return null;
  return new Date(`${eventDate}T00:00:00`).toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

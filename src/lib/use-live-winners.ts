"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Winner } from "@/lib/board-data";
import { createLivePoller, type LivePoller } from "@/lib/live-poller";
import { parseWinners } from "@/lib/parse-winners";
import { fetchSheetRef, sheetKey, type SheetRef } from "@/lib/sheets";

type Live = {
  key: string;
  /** null until we have ever managed to read the sheet. */
  winners: Winner[] | null;
  updatedAt: number | null;
  /** The latest attempt failed; any winners shown are the last good copy. */
  failed: boolean;
};

const CACHE_PREFIX = "prize-board-live:";

function readCache(key: string): Live | null {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!Array.isArray(data.winners) || typeof data.at !== "number") return null;
    const winners: Winner[] = data.winners.filter(
      (w: unknown): w is Winner =>
        !!w &&
        typeof (w as Winner).ticket === "string" &&
        typeof (w as Winner).prize === "string"
    );
    return { key, winners, updatedAt: data.at, failed: false };
  } catch {
    return null;
  }
}

function writeCache(key: string, winners: Winner[], at: number) {
  try {
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify({ winners, at }));
  } catch {
    // Storage can be unavailable or full; live updates still work without it.
  }
}

/**
 * Reads a live board's winners from its Google Sheet and keeps them fresh.
 * Failures never clear what's already on screen: the last good list stays
 * until a refresh succeeds.
 */
export function useLiveWinners(sheet: SheetRef | null) {
  const key = sheet ? sheetKey(sheet) : null;
  const [live, setLive] = useState<Live | null>(() =>
    key ? readCache(key) : null
  );
  const pollerRef = useRef<LivePoller | null>(null);

  useEffect(() => {
    if (!sheet || !key) return;

    const poller = createLivePoller({
      load: async () => {
        const result = await fetchSheetRef(sheet, { allowEmpty: true });
        return result.ok
          ? { ok: true, winners: parseWinners(result.text).winners }
          : { ok: false };
      },
      onSuccess: (winners, at) => {
        writeCache(key, winners, at);
        setLive({ key, winners, updatedAt: at, failed: false });
      },
      onFailure: () =>
        setLive((prev) => ({
          key,
          winners: prev?.key === key ? prev.winners : null,
          updatedAt: prev?.key === key ? prev.updatedAt : null,
          failed: true,
        })),
      isHidden: () => document.hidden,
    });
    pollerRef.current = poller;
    poller.start();

    // Catch up right away when the guest returns to the tab or the phone
    // regains signal, instead of waiting for the next poll.
    const wake = () => {
      if (!document.hidden) poller.refresh();
    };
    document.addEventListener("visibilitychange", wake);
    window.addEventListener("online", wake);

    return () => {
      poller.stop();
      pollerRef.current = null;
      document.removeEventListener("visibilitychange", wake);
      window.removeEventListener("online", wake);
    };
  }, [sheet, key]);

  const current = live && live.key === key ? live : null;

  return {
    winners: current?.winners ?? null,
    failed: current?.failed ?? false,
    updatedAt: current?.updatedAt ?? null,
    /** Check for new winners soon (throttled). */
    refresh: useCallback(() => pollerRef.current?.refresh(), []),
    /** An explicit "Try again": always fetches. */
    retry: useCallback(() => pollerRef.current?.refresh({ force: true }), []),
  };
}

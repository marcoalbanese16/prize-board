import type { Winner } from "@/lib/board-data";

// Keeps a live board fresh without hammering Google. At an event, hundreds of
// phones can share one venue Wi-Fi (one IP address), so every request counts:
// poll slowly, add jitter so phones don't fire in step, back off after a
// failure, never overlap requests, and stay quiet while the tab is hidden.

export type LoadResult = { ok: true; winners: Winner[] } | { ok: false };

export type LivePoller = {
  start: () => void;
  stop: () => void;
  /**
   * Fetch soon (e.g. a guest searched and found nothing), but not too often.
   * { force: true } skips that spacing, for an explicit "Try again" tap.
   */
  refresh: (options?: { force?: boolean }) => void;
};

export type PollerOptions = {
  load: () => Promise<LoadResult>;
  onSuccess: (winners: Winner[], at: number) => void;
  onFailure: () => void;
  isHidden?: () => boolean;
  baseMs?: number;
  /** Minimum time between two fetches started by refresh(). */
  minRefreshGapMs?: number;
  random?: () => number;
  now?: () => number;
};

export const DEFAULT_POLL_MS = 45_000;
const MAX_BACKOFF_MS = 5 * 60_000;
const DEFAULT_REFRESH_GAP_MS = 10_000;

/** Delay before the next poll: base ±20% jitter, doubling per failure up to 5 min. */
export function pollDelayMs(
  failures: number,
  baseMs = DEFAULT_POLL_MS,
  random: () => number = Math.random
) {
  const backoff = Math.min(baseMs * 2 ** failures, MAX_BACKOFF_MS);
  return Math.round(backoff * (0.8 + random() * 0.4));
}

export function createLivePoller(options: PollerOptions): LivePoller {
  const {
    load,
    onSuccess,
    onFailure,
    isHidden = () => false,
    baseMs = DEFAULT_POLL_MS,
    minRefreshGapMs = DEFAULT_REFRESH_GAP_MS,
    random = Math.random,
    now = Date.now,
  } = options;

  let timer: ReturnType<typeof setTimeout> | undefined;
  let stopped = true;
  let inFlight = false;
  let failures = 0;
  let lastStart = -Infinity;

  function schedule() {
    clearTimeout(timer);
    if (stopped) return;
    timer = setTimeout(run, pollDelayMs(failures, baseMs, random));
  }

  async function run() {
    if (stopped || inFlight) return;
    // Don't spend requests on a tab nobody is looking at.
    if (isHidden()) {
      schedule();
      return;
    }
    inFlight = true;
    lastStart = now();
    let result: LoadResult;
    try {
      result = await load();
    } catch {
      result = { ok: false };
    }
    inFlight = false;
    if (stopped) return;
    if (result.ok) {
      failures = 0;
      onSuccess(result.winners, now());
    } else {
      failures++;
      onFailure();
    }
    schedule();
  }

  return {
    start() {
      stopped = false;
      failures = 0;
      void run();
    },
    stop() {
      stopped = true;
      clearTimeout(timer);
    },
    refresh({ force = false } = {}) {
      if (stopped || inFlight) return;
      if (!force && now() - lastStart < minRefreshGapMs) return;
      clearTimeout(timer);
      void run();
    },
  };
}

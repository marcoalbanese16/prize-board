import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createLivePoller, DEFAULT_POLL_MS, pollDelayMs } from "@/lib/live-poller";
import type { Winner } from "@/lib/board-data";

const w = (ticket: string): Winner => ({ ticket, prize: `Prize ${ticket}` });

describe("pollDelayMs", () => {
  it("is about the base interval with no failures", () => {
    expect(pollDelayMs(0, 45_000, () => 0.5)).toBe(45_000);
  });

  it("stays within ±20% so phones don't poll in lockstep", () => {
    expect(pollDelayMs(0, 45_000, () => 0)).toBe(36_000);
    expect(pollDelayMs(0, 45_000, () => 1)).toBe(54_000);
  });

  it("doubles after each failure", () => {
    expect(pollDelayMs(1, 45_000, () => 0.5)).toBe(90_000);
    expect(pollDelayMs(2, 45_000, () => 0.5)).toBe(180_000);
  });

  it("never waits more than about five minutes (plus jitter)", () => {
    expect(pollDelayMs(20, 45_000, () => 0.5)).toBe(300_000);
    expect(pollDelayMs(20, 45_000, () => 1)).toBeLessThanOrEqual(360_000);
  });
});

describe("createLivePoller", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  const setup = (overrides: Partial<Parameters<typeof createLivePoller>[0]> = {}) => {
    const load = vi.fn().mockResolvedValue({ ok: true, winners: [w("1")] });
    const onSuccess = vi.fn();
    const onFailure = vi.fn();
    const poller = createLivePoller({
      load,
      onSuccess,
      onFailure,
      random: () => 0.5,
      ...overrides,
    });
    return { load, onSuccess, onFailure, poller };
  };

  it("loads immediately on start", async () => {
    const { load, onSuccess, poller } = setup();
    poller.start();
    await vi.advanceTimersByTimeAsync(0);
    expect(load).toHaveBeenCalledTimes(1);
    expect(onSuccess).toHaveBeenCalledWith([w("1")], expect.any(Number));
    poller.stop();
  });

  it("keeps polling on the interval and passes along new winners", async () => {
    const { load, onSuccess, poller } = setup();
    load
      .mockResolvedValueOnce({ ok: true, winners: [w("1")] })
      .mockResolvedValueOnce({ ok: true, winners: [w("1"), w("2")] });
    poller.start();
    await vi.advanceTimersByTimeAsync(0);
    await vi.advanceTimersByTimeAsync(DEFAULT_POLL_MS);
    expect(load).toHaveBeenCalledTimes(2);
    expect(onSuccess).toHaveBeenLastCalledWith([w("1"), w("2")], expect.any(Number));
    poller.stop();
  });

  it("backs off after a failure and reports it without discarding anything", async () => {
    const { load, onSuccess, onFailure, poller } = setup();
    load.mockResolvedValue({ ok: false });
    poller.start();
    await vi.advanceTimersByTimeAsync(0);
    expect(onFailure).toHaveBeenCalledTimes(1);
    expect(onSuccess).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(DEFAULT_POLL_MS); // normal interval: too soon after a failure
    expect(load).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(DEFAULT_POLL_MS); // doubled interval reached
    expect(load).toHaveBeenCalledTimes(2);
    poller.stop();
  });

  it("recovers to the normal interval after a success", async () => {
    const { load, onSuccess, poller } = setup();
    load
      .mockResolvedValueOnce({ ok: false })
      .mockResolvedValue({ ok: true, winners: [w("9")] });
    poller.start();
    await vi.advanceTimersByTimeAsync(0);
    await vi.advanceTimersByTimeAsync(DEFAULT_POLL_MS * 2); // the backed-off retry
    expect(onSuccess).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(DEFAULT_POLL_MS); // back to normal
    expect(load).toHaveBeenCalledTimes(3);
    poller.stop();
  });

  it("treats a thrown error like a failed load", async () => {
    const { load, onFailure, poller } = setup();
    load.mockRejectedValue(new Error("network down"));
    poller.start();
    await vi.advanceTimersByTimeAsync(0);
    expect(onFailure).toHaveBeenCalledTimes(1);
    poller.stop();
  });

  it("never runs two loads at once", async () => {
    let resolve!: (v: { ok: true; winners: Winner[] }) => void;
    const { load, poller } = setup();
    load.mockImplementation(() => new Promise((r) => (resolve = r)));
    poller.start();
    await vi.advanceTimersByTimeAsync(0);
    poller.refresh();
    poller.refresh();
    await vi.advanceTimersByTimeAsync(DEFAULT_POLL_MS * 3);
    expect(load).toHaveBeenCalledTimes(1);
    resolve({ ok: true, winners: [] });
    await vi.advanceTimersByTimeAsync(0);
    poller.stop();
  });

  it("stops completely: no more loads and no callbacks from an in-flight one", async () => {
    let resolve!: (v: { ok: true; winners: Winner[] }) => void;
    const { load, onSuccess, poller } = setup();
    load.mockImplementation(() => new Promise((r) => (resolve = r)));
    poller.start();
    await vi.advanceTimersByTimeAsync(0);
    poller.stop();
    resolve({ ok: true, winners: [w("1")] });
    await vi.advanceTimersByTimeAsync(DEFAULT_POLL_MS * 5);
    expect(onSuccess).not.toHaveBeenCalled();
    expect(load).toHaveBeenCalledTimes(1);
  });

  it("does not fetch while the tab is hidden, and resumes when visible", async () => {
    let hidden = true;
    const { load, poller } = setup({ isHidden: () => hidden });
    poller.start();
    await vi.advanceTimersByTimeAsync(DEFAULT_POLL_MS * 3);
    expect(load).not.toHaveBeenCalled();
    hidden = false;
    await vi.advanceTimersByTimeAsync(DEFAULT_POLL_MS * 2);
    expect(load).toHaveBeenCalled();
    poller.stop();
  });

  describe("refresh (a guest searched and found nothing)", () => {
    it("fetches right away, but not more than once per gap", async () => {
      const { load, poller } = setup();
      poller.start();
      await vi.advanceTimersByTimeAsync(0);
      expect(load).toHaveBeenCalledTimes(1);

      poller.refresh(); // within the gap: ignored
      await vi.advanceTimersByTimeAsync(0);
      expect(load).toHaveBeenCalledTimes(1);

      await vi.advanceTimersByTimeAsync(11_000);
      poller.refresh(); // gap passed: allowed
      await vi.advanceTimersByTimeAsync(0);
      expect(load).toHaveBeenCalledTimes(2);
      poller.stop();
    });

    it("force skips the spacing for an explicit Try again, but still never overlaps", async () => {
      const { load, poller } = setup();
      poller.start();
      await vi.advanceTimersByTimeAsync(0);
      poller.refresh({ force: true });
      await vi.advanceTimersByTimeAsync(0);
      expect(load).toHaveBeenCalledTimes(2);

      let resolve!: (v: { ok: true; winners: Winner[] }) => void;
      load.mockImplementation(() => new Promise((r) => (resolve = r)));
      poller.refresh({ force: true });
      poller.refresh({ force: true });
      await vi.advanceTimersByTimeAsync(0);
      expect(load).toHaveBeenCalledTimes(3);
      resolve({ ok: true, winners: [] });
      await vi.advanceTimersByTimeAsync(0);
      poller.stop();
    });

    it("does nothing before start or after stop", async () => {
      const { load, poller } = setup();
      poller.refresh();
      poller.start();
      await vi.advanceTimersByTimeAsync(0);
      poller.stop();
      await vi.advanceTimersByTimeAsync(20_000);
      poller.refresh();
      await vi.advanceTimersByTimeAsync(0);
      expect(load).toHaveBeenCalledTimes(1);
    });
  });
});

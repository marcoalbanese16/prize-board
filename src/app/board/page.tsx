"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { decodeBoard, type BoardData } from "@/lib/board-data";
import Board from "./board";

function subscribeToHash(onChange: () => void) {
  window.addEventListener("hashchange", onChange);
  return () => window.removeEventListener("hashchange", onChange);
}

type Result = { hash: string; board: BoardData | null };

export default function BoardPage() {
  const hash = useSyncExternalStore(
    subscribeToHash,
    () => window.location.hash,
    () => ""
  );
  const [result, setResult] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    const encoded = new URLSearchParams(hash.replace(/^#/, "")).get("d");
    (async () => {
      const board = encoded ? await decodeBoard(encoded) : null;
      if (cancelled) return;
      document.title = board ? `${board.title} · Prize Board` : "Prize Board";
      setResult({ hash, board });
    })();
    return () => {
      cancelled = true;
    };
  }, [hash]);

  // Until the first decode finishes (or while the hash is changing) show nothing
  // rather than flashing the "broken link" message.
  if (!result || result.hash !== hash) {
    return <main className="min-h-screen bg-neutral-50" />;
  }

  if (!result.board) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-3 bg-neutral-50 px-6 text-center text-neutral-900">
        <p className="text-5xl">🎟️</p>
        <h1 className="text-xl font-bold">This board link is incomplete</h1>
        <p className="max-w-sm text-sm text-neutral-500">
          The link may have been cut off when it was copied or shared. Ask the
          host for the full link or QR code.
        </p>
        <Link
          href="/"
          className="mt-3 rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-100"
        >
          Make your own board
        </Link>
      </main>
    );
  }

  return <Board board={result.board} />;
}

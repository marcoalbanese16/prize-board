"use client";

import { BOARD_THEMES, type BoardTheme } from "@/lib/board-themes";

const PRESET_COLORS = [
  "#fbbf24", // gold
  "#38bdf8", // sky
  "#ec4899", // pink
  "#22c55e", // green
  "#a855f7", // purple
  "#ef4444", // red
];

function ThemePreview({ theme, accent }: { theme: BoardTheme; accent: string }) {
  if (theme === "carnival") {
    return (
      <div className="flex h-16 w-full flex-col items-center justify-center gap-1 rounded-lg bg-gradient-to-b from-red-800 to-red-950">
        <div className="h-1.5 w-10 rounded-full" style={{ backgroundColor: accent }} />
        <div className="h-2 w-16 rounded-sm bg-white/80" />
      </div>
    );
  }
  if (theme === "classic") {
    return (
      <div className="flex h-16 w-full flex-col items-center justify-center gap-1.5 rounded-lg border border-neutral-700 bg-neutral-950">
        <div className="h-2 w-16 rounded-sm bg-white/70" />
        <div className="h-1 w-10 rounded-sm" style={{ backgroundColor: accent }} />
      </div>
    );
  }
  if (theme === "elegant") {
    return (
      <div className="flex h-16 w-full flex-col items-center justify-center gap-1.5 rounded-lg bg-neutral-950">
        <div className="h-2 w-14 bg-white/80" />
        <div className="h-px w-20" style={{ backgroundColor: accent }} />
      </div>
    );
  }
  return (
    <div
      className="flex h-16 w-full flex-col items-center justify-center gap-1.5 rounded-lg border bg-black"
      style={{ borderColor: accent, boxShadow: `0 0 12px ${accent}80` }}
    >
      <div className="h-2 w-16 rounded-sm" style={{ backgroundColor: accent }} />
    </div>
  );
}

export type Style = { theme: BoardTheme; accent: string; showList: boolean };

export default function ThemePicker({
  value,
  onChange,
}: {
  value: Style;
  onChange: (next: Style) => void;
}) {
  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {BOARD_THEMES.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => onChange({ ...value, theme: t.id })}
            className={`flex flex-col gap-2 rounded-xl border-2 p-2 text-left transition ${
              value.theme === t.id
                ? "border-neutral-900"
                : "border-transparent hover:border-neutral-200"
            }`}
          >
            <ThemePreview theme={t.id} accent={value.accent} />
            <div>
              <p className="text-sm font-semibold text-neutral-900">{t.label}</p>
              <p className="text-xs leading-snug text-neutral-500">
                {t.description}
              </p>
            </div>
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3 border-t border-neutral-100 pt-4">
        <span className="text-xs font-medium text-neutral-600">Accent color</span>
        <div className="flex items-center gap-1.5">
          {PRESET_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => onChange({ ...value, accent: c })}
              className={`h-6 w-6 rounded-full border-2 transition ${
                value.accent.toLowerCase() === c
                  ? "border-neutral-900"
                  : "border-transparent"
              }`}
              style={{ backgroundColor: c }}
              aria-label={`Use ${c} as accent color`}
            />
          ))}
        </div>
        <input
          type="color"
          value={value.accent}
          onChange={(e) => onChange({ ...value, accent: e.target.value })}
          className="h-7 w-9 cursor-pointer rounded border border-neutral-300"
          aria-label="Custom accent color"
        />
        <span className="font-mono text-xs text-neutral-400">{value.accent}</span>
      </div>

      <label className="flex items-center gap-2 border-t border-neutral-100 pt-4 text-sm text-neutral-700">
        <input
          type="checkbox"
          checked={value.showList}
          onChange={(e) => onChange({ ...value, showList: e.target.checked })}
          className="h-4 w-4 rounded border-neutral-300 accent-neutral-900"
        />
        Show the full winners list on the board
        <span className="text-xs text-neutral-400">
          (off = guests can only search their own ticket)
        </span>
      </label>
    </div>
  );
}

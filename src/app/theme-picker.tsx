"use client";

import { BOARD_THEMES, type BoardMode, type BoardTheme } from "@/lib/board-themes";

const PRESET_COLORS = [
  "#fbbf24", // gold
  "#38bdf8", // sky
  "#ec4899", // pink
  "#22c55e", // green
  "#a855f7", // purple
  "#ef4444", // red
];

// Miniatures of each theme in the chosen mode, tinted with the chosen accent.
function ThemePreview({
  theme,
  accent,
  mode,
}: {
  theme: BoardTheme;
  accent: string;
  mode: BoardMode;
}) {
  const dark = mode === "dark";

  if (theme === "carnival") {
    return (
      <div
        className={`h-16 w-full overflow-hidden rounded-lg border ${
          dark ? "border-neutral-800 bg-neutral-950" : "border-neutral-200 bg-[#fff8ec]"
        }`}
      >
        <div
          className={`flex h-9 items-center justify-center gap-1 bg-gradient-to-b ${
            dark ? "from-red-800 to-red-950" : "from-red-600 to-red-800"
          }`}
        >
          {[0, 1, 2, 3, 4].map((i) => (
            <span key={i} className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: accent }} />
          ))}
        </div>
        <div className="mx-auto mt-2 h-2 w-16 rounded-full border" style={{ borderColor: accent }} />
      </div>
    );
  }
  if (theme === "classic") {
    return (
      <div
        className={`flex h-16 w-full flex-col items-center justify-center gap-1.5 rounded-lg border ${
          dark ? "border-neutral-800 bg-neutral-950" : "border-neutral-200 bg-neutral-50"
        }`}
      >
        <div className={`h-2 w-16 rounded-sm ${dark ? "bg-white/80" : "bg-neutral-800"}`} />
        <div
          className={`h-2 w-14 rounded border-2 ${dark ? "bg-neutral-900" : "bg-white"}`}
          style={{ borderColor: accent }}
        />
      </div>
    );
  }
  if (theme === "elegant") {
    return (
      <div
        className={`flex h-16 w-full flex-col items-center justify-center gap-1.5 rounded-lg border ${
          dark ? "border-neutral-800 bg-[#0c0c0d]" : "border-neutral-200 bg-[#faf6ee]"
        }`}
      >
        <div className={`h-2 w-14 ${dark ? "bg-white/80" : "bg-[#1f1b16]"}`} />
        <div className="h-px w-20" style={{ backgroundColor: accent }} />
      </div>
    );
  }
  return (
    <div
      className={`flex h-16 w-full flex-col items-center justify-center gap-1.5 rounded-lg border-2 ${
        dark ? "bg-black" : "bg-white"
      }`}
      style={{
        borderColor: accent,
        boxShadow: dark ? `0 0 12px ${accent}80` : `3px 3px 0 ${accent}`,
      }}
    >
      <div className={`h-2 w-16 rounded-sm ${dark ? "" : "bg-neutral-900"}`} style={dark ? { backgroundColor: accent } : undefined} />
    </div>
  );
}

export type Style = {
  theme: BoardTheme;
  mode: BoardMode;
  accent: string;
  showList: boolean;
};

export default function ThemePicker({
  value,
  onChange,
}: {
  value: Style;
  onChange: (next: Style) => void;
}) {
  const dark = value.mode === "dark";

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
            <ThemePreview theme={t.id} accent={value.accent} mode={value.mode} />
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
        <span className="text-xs font-medium text-neutral-600">Board mode</span>
        <button
          type="button"
          role="switch"
          aria-checked={dark}
          aria-label="Dark mode"
          onClick={() => onChange({ ...value, mode: dark ? "light" : "dark" })}
          className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${
            dark ? "bg-neutral-900" : "bg-neutral-300"
          }`}
        >
          <span
            className={`absolute left-0.5 top-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-white text-xs shadow transition-transform ${
              dark ? "translate-x-5" : "translate-x-0"
            }`}
          >
            {dark ? "🌙" : "☀️"}
          </span>
        </button>
        <span className="text-sm text-neutral-700">
          {dark ? "Dark" : "Light"}
          <span className="ml-2 text-xs text-neutral-400">
            (what your guests see)
          </span>
        </span>
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

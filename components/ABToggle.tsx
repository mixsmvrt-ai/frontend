"use client";

import type { ABMode } from "../lib/audioTypes";

type Props = {
  mode: ABMode;
  onChange: (mode: ABMode) => void;
};

export function ABToggle({ mode, onChange }: Props) {
  return (
    <div className="inline-flex rounded-full border border-slate-700 bg-slate-950/80 p-1 text-[11px] shadow-panel">
      <button
        type="button"
        onClick={() => onChange("original")}
        className={`px-3 py-1 rounded-full transition text-xs ${
          mode === "original"
            ? "bg-slate-100 text-slate-900"
            : "text-slate-300 hover:text-emerald-300"
        }`}
      >
        BEFORE
      </button>
      <button
        type="button"
        onClick={() => onChange("processed")}
        className={`px-3 py-1 rounded-full transition text-xs ${
          mode === "processed"
            ? "bg-emerald-500 text-slate-950 shadow-neon-soft"
            : "text-slate-300 hover:text-emerald-300"
        }`}
      >
        AFTER
      </button>
    </div>
  );
}

"use client";

import { useSessionStore } from "../store/useSessionStore";

export function TransportControls() {
  const { isPlaying, isLooping, isProcessing, setTransport, runGlobalAI } = useSessionStore();

  return (
    <div className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-950/90 px-3 py-2 text-[11px] text-slate-100 shadow-panel">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setTransport({ isPlaying: !isPlaying })}
          className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500 text-[11px] font-semibold text-slate-950 shadow-neon-soft hover:bg-emerald-400"
        >
          {isPlaying ? "⏸" : "▶"}
        </button>
        <button
          type="button"
          onClick={() => setTransport({ isPlaying: false })}
          className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-700 bg-slate-900 text-[11px] text-slate-200"
        >
          ■
        </button>
        <button
          type="button"
          onClick={() => setTransport({ isLooping: !isLooping })}
          className={`inline-flex h-7 items-center justify-center rounded-full border px-3 text-[11px] ${
            isLooping
              ? "border-emerald-500 bg-emerald-500/10 text-emerald-200"
              : "border-slate-700 bg-slate-900 text-slate-300"
          }`}
        >
          Loop
        </button>
        <span className="ml-2 text-[10px] text-slate-400">00:00:00</span>
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => void runGlobalAI()}
          disabled={isProcessing}
          className="inline-flex items-center rounded-full border border-emerald-500/60 bg-emerald-500/10 px-3 py-1 text-[11px] text-emerald-100 hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:border-slate-700 disabled:text-slate-500"
        >
          {isProcessing ? "Processing…" : "Run global mix"}
        </button>
        <span className="text-[10px] text-slate-500">AI processing is mocked for now</span>
      </div>
    </div>
  );
}

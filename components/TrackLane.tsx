"use client";

import { useSessionStore } from "../store/useSessionStore";
import type { TrackState } from "../lib/audioTypes";
import { TrackPresetSelector } from "./PresetSelector";

type Props = {
  track: TrackState;
};

export function TrackLane({ track }: Props) {
  const { setTrackVolume, toggleMute, toggleSolo, setTrackPreset, runTrackAI } = useSessionStore();

  return (
    <div className="flex items-center justify-between gap-2 rounded-2xl border border-slate-800 bg-slate-900/80 px-3 py-2">
      <div className="flex items-center gap-2">
        <span
          className="h-2 w-2 rounded-sm"
          style={{ backgroundColor: track.color }}
        />
        <div className="flex flex-col">
          <span className="text-[11px] font-medium text-slate-100">{track.name}</span>
          <span className="text-[10px] text-slate-500">
            {track.file ? `${(track.duration ?? 0).toFixed(1)}s` : "No audio"}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-2 text-[10px]">
        <button
          type="button"
          onClick={() => toggleMute(track.id)}
          className={`h-6 w-6 rounded bg-slate-800 text-[10px] ${
            track.muted ? "bg-slate-600 text-slate-100" : "text-slate-300 hover:bg-slate-700"
          }`}
        >
          M
        </button>
        <button
          type="button"
          onClick={() => toggleSolo(track.id)}
          className={`h-6 w-6 rounded bg-slate-800 text-[10px] ${
            track.solo ? "bg-emerald-500 text-slate-950" : "text-slate-300 hover:bg-slate-700"
          }`}
        >
          S
        </button>
        <div className="flex items-center gap-1">
          <span className="text-slate-500">Vol</span>
          <input
            type="range"
            min={0}
            max={1.5}
            step={0.05}
            value={track.volume}
            onChange={(event) => setTrackVolume(track.id, Number(event.target.value))}
            className="h-1 w-20 accent-emerald-400"
          />
        </div>
      </div>
      <div className="flex flex-col items-end gap-1 text-[10px]">
        <TrackPresetSelector
          value={track.preset}
          onChange={(preset) => setTrackPreset(track.id, preset)}
        />
        <button
          type="button"
          disabled={!track.file}
          onClick={() => track.preset && runTrackAI(track.id, track.preset)}
          className="mt-1 inline-flex items-center rounded-full border border-slate-700 bg-slate-950 px-2 py-1 text-[10px] text-slate-200 hover:border-emerald-400 hover:text-emerald-200 disabled:cursor-not-allowed disabled:border-slate-800 disabled:text-slate-500"
        >
          Run track AI
        </button>
      </div>
    </div>
  );
}

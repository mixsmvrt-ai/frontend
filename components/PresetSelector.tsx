"use client";

import type { MixPresetId, TrackPresetId } from "../lib/audioTypes";

type TrackPresetSelectorProps = {
  value?: TrackPresetId;
  onChange: (preset: TrackPresetId) => void;
};

const trackPresets: { id: TrackPresetId; label: string }[] = [
  { id: "clean-vocal", label: "Clean Vocal" },
  { id: "radio-vocal", label: "Radio Vocal" },
  { id: "aggressive-rap", label: "Aggressive Rap" },
  { id: "smooth-rnb", label: "Smooth R&B" },
  { id: "podcast-voice", label: "Podcast Voice" },
];

export function TrackPresetSelector({ value, onChange }: TrackPresetSelectorProps) {
  return (
    <div className="flex flex-wrap gap-1.5 text-[10px]">
      {trackPresets.map((preset) => (
        <button
          key={preset.id}
          type="button"
          onClick={() => onChange(preset.id)}
          className={`rounded-full border px-2 py-1 transition ${
            value === preset.id
              ? "border-emerald-500 bg-emerald-500/10 text-emerald-200"
              : "border-slate-700 bg-slate-900/80 text-slate-300 hover:border-emerald-400 hover:text-emerald-200"
          }`}
        >
          {preset.label}
        </button>
      ))}
    </div>
  );
}

type MixPresetSelectorProps = {
  value: MixPresetId;
  onChange: (preset: MixPresetId) => void;
};

const mixPresets: { id: MixPresetId; label: string }[] = [
  { id: "streaming-ready", label: "Streaming Ready" },
  { id: "club-loud", label: "Club Loud" },
  { id: "warm-analog", label: "Warm Analog" },
];

export function MixPresetSelector({ value, onChange }: MixPresetSelectorProps) {
  return (
    <div className="inline-flex rounded-full border border-slate-700 bg-slate-950/80 p-1 text-[11px] shadow-panel">
      {mixPresets.map((preset) => (
        <button
          key={preset.id}
          type="button"
          onClick={() => onChange(preset.id)}
          className={`rounded-full px-3 py-1 transition ${
            value === preset.id
              ? "bg-emerald-500 text-slate-950 shadow-neon-soft"
              : "text-slate-300 hover:text-emerald-300"
          }`}
        >
          {preset.label}
        </button>
      ))}
    </div>
  );
}

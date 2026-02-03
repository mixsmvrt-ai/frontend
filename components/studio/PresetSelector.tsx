"use client";

import React from "react";

export type PresetMode = "audio_cleanup" | "mixing_only" | "mix_and_master" | "mastering_only";
export type PresetTarget = "vocal" | "beat" | "full_mix";

export type ThrowFxMode = "off" | "reverb" | "delay" | "both";

export type StudioPresetMeta = {
  id: string;
  name: string;
  mode: PresetMode;
  target: PresetTarget;
  genre?: string | null;
  description: string;
  dsp_chain_reference: string;
  tags: string[];
  // Extended metadata from the backend preset registry.
  intent?: string | null;
  inspired_style?: string | null;
  target_genres?: string[];
  flow?: "mix" | "mix_master" | "master";
  category?: "vocal" | "full_mix" | "master";
  dsp_ranges?: {
    eq?: Record<string, unknown>;
    compression?: Record<string, unknown>;
    saturation?: Record<string, unknown>;
    deesser?: Record<string, unknown>;
    bus?: Record<string, unknown>;
    limiter?: Record<string, unknown>;
  };
};

interface PresetSelectorProps {
  presets: StudioPresetMeta[];
  modeLabel: string;
  selectedPresetId: string | null;
  onChange: (presetId: string) => void;
  hasBeatTrack: boolean;
  showThrowFxControls?: boolean;
  throwFxMode?: ThrowFxMode;
  onThrowFxModeChange?: (mode: ThrowFxMode) => void;
}

export function PresetSelector({
  presets,
  modeLabel,
  selectedPresetId,
  onChange,
  hasBeatTrack,
  showThrowFxControls,
  throwFxMode = "off",
  onThrowFxModeChange,
}: PresetSelectorProps) {
  if (!presets.length) return null;

  const selected = presets.find((p) => p.id === selectedPresetId) ?? presets[0];

   // Group presets by genre for easier navigation in the dropdown.
  const groupedByGenre = presets.reduce<Record<string, StudioPresetMeta[]>>(
    (acc, preset) => {
      const key = (preset.genre || "general").toString();
      if (!acc[key]) acc[key] = [];
      acc[key].push(preset);
      return acc;
    },
    {},
  );

  const warningText =
    hasBeatTrack && selected.target === "vocal"
      ? "Current preset is tuned for vocals. For stereo beats, try a Beat preset such as 'Minimal Beat Processing'."
      : null;

  return (
    <div className="flex flex-col gap-1 text-[11px] text-white/70">
      <div className="flex items-center justify-between gap-2">
        <span className="uppercase tracking-[0.18em] text-white/50">Preset</span>
        <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-white/50">
          {modeLabel}
        </span>
      </div>
      <div className="relative inline-flex w-full items-center gap-2">
        <select
          className="h-8 w-full rounded-full border border-white/15 bg-black/60 px-3 pr-8 text-[11px] text-white/90 outline-none focus:border-red-500"
          value={selected.id}
          onChange={(event) => onChange(event.target.value)}
        >
          {Object.entries(groupedByGenre).map(([genreKey, group]) => (
            <optgroup
              key={genreKey}
              label={genreKey === "general" ? "All Genres" : genreKey}
            >
              {group.map((preset) => (
                <option
                  key={preset.id}
                  value={preset.id}
                  className="bg-black text-[11px]"
                >
                  {preset.name}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        <div className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-white/60">
          ▾
        </div>
      </div>
      <div className="flex flex-col gap-0.5 text-[10px] text-white/60">
        <span
          className="truncate"
          title={selected.intent || selected.description}
        >
          {selected.intent || selected.description}
        </span>
        {selected.inspired_style && (
          <span className="truncate text-white/50">
            Style: {selected.inspired_style}
          </span>
        )}
      </div>
      <div className="flex flex-wrap gap-1 text-[9px] text-white/60">
        {selected.tags.map((tag) => (
          <span
            key={tag}
            className="rounded-full bg-white/5 px-2 py-[1px] text-[9px] uppercase tracking-[0.16em] text-white/60"
          >
            {tag}
          </span>
        ))}
        <span className="rounded-full bg-white/5 px-2 py-[1px] text-[9px] uppercase tracking-[0.16em] text-white/40">
          {selected.target === "vocal" ? "Vocal" : selected.target === "beat" ? "Beat" : "Full Mix"}
        </span>
      </div>
      {warningText && (
        <p className="mt-1 text-[10px] text-amber-300/80">{warningText}</p>
      )}
      {showThrowFxControls && onThrowFxModeChange && (
        <div className="mt-2 flex flex-col gap-1.5 border-t border-white/10 pt-1.5">
          <div className="flex items-center justify-between text-[10px] text-white/50">
            <span className="uppercase tracking-[0.16em]">Throw FX</span>
            <span className="text-white/40">Fill vocal gaps creatively</span>
          </div>
          <div className="inline-flex rounded-full bg-white/5 p-0.5 text-[10px]">
            {["reverb", "delay", "both"].map((mode) => {
              const isActive = throwFxMode === mode;
              const label =
                mode === "reverb"
                  ? "Reverb Throw"
                  : mode === "delay"
                    ? "Delay Throw"
                    : "Both";
              return (
                <button
                  key={mode}
                  type="button"
                  onClick={() =>
                    onThrowFxModeChange(isActive ? "off" : (mode as ThrowFxMode))
                  }
                  className={`mx-0.5 rounded-full px-2.5 py-1 transition ${
                    isActive
                      ? "bg-red-500 text-black shadow-neon-soft"
                      : "text-white/70 hover:text-white"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import React from "react";

export type PresetMode = "audio_cleanup" | "mixing_only" | "mix_and_master" | "mastering_only";
export type PresetTarget = "vocal" | "beat" | "full_mix";

export type StudioPresetMeta = {
  id: string;
  name: string;
  mode: PresetMode;
  target: PresetTarget;
  genre?: string | null;
  description: string;
  dsp_chain_reference: string;
  tags: string[];
};

interface PresetSelectorProps {
  presets: StudioPresetMeta[];
  modeLabel: string;
  selectedPresetId: string | null;
  onChange: (presetId: string) => void;
  hasBeatTrack: boolean;
}

export function PresetSelector({
  presets,
  modeLabel,
  selectedPresetId,
  onChange,
  hasBeatTrack,
}: PresetSelectorProps) {
  if (!presets.length) return null;

  const selected = presets.find((p) => p.id === selectedPresetId) ?? presets[0];

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
          {presets.map((preset) => (
            <option key={preset.id} value={preset.id} className="bg-black text-[11px]">
              {preset.name}
            </option>
          ))}
        </select>
        <div className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-white/60">
          ▾
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-1 text-[10px] text-white/60">
        <span className="truncate" title={selected.description}>
          {selected.description}
        </span>
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
    </div>
  );
}

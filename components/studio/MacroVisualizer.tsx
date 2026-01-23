"use client";

import React from "react";
import EQDisplay, { EqPoint } from "./EQDisplay";
import MacroKnob, { MacroKind } from "./MacroKnob";

interface MacroState {
  air: number; // 0-100
  punch: number; // 0-100
  warmth: number; // 0-100
}

interface MacroVisualizerProps {
  presetBaseCurve?: EqPoint[];
  macros: MacroState;
  onMacrosChange: (next: MacroState) => void;
}

// Utility: map 0-100 macro to 0..1 eased intensity
function macroAmount(raw: number): number {
  const t = Math.min(1, Math.max(0, raw / 100));
  // Gentle ease-out so last 30% feels more subtle
  return 1 - (1 - t) * (1 - t);
}

function mapAirMacroToCurve(amount: number): EqPoint[] {
  if (amount <= 0) return [];
  const a = macroAmount(amount);
  const maxGain = 5; // dB, will be clamped visually to ±6
  const gain = maxGain * a;
  const slopeFactor = 0.5 + 0.5 * a;
  return [
    { freq: 6000, gain: 0 },
    { freq: 8000, gain: gain * 0.4 },
    { freq: 12000, gain: gain * 0.8 * slopeFactor },
    { freq: 16000, gain: gain },
  ];
}

function mapPunchMacroToCurve(amount: number): EqPoint[] {
  if (amount <= 0) return [];
  const a = macroAmount(amount);
  const maxGain = 4;
  const gain = maxGain * a;
  const center = 110; // Hz
  const spread = 0.6; // in octaves
  return [
    { freq: center / Math.pow(2, spread), gain: 0 },
    { freq: center, gain },
    { freq: center * Math.pow(2, spread), gain: gain * 0.3 },
  ];
}

function mapWarmthMacroToCurve(amount: number): EqPoint[] {
  if (amount <= 0) return [];
  const a = macroAmount(amount);
  const maxGain = 3.5;
  const gain = maxGain * a;
  const lowMidCenter = 260;
  const highRoll = -2.5 * a;
  return [
    { freq: 120, gain: gain * 0.4 },
    { freq: lowMidCenter, gain },
    { freq: 1200, gain: gain * 0.1 },
    { freq: 6000, gain: highRoll * 0.7 },
    { freq: 12000, gain: highRoll },
  ];
}

function mergeCurves(curves: EqPoint[][]): EqPoint[] {
  const freqSet = new Set<number>();
  curves.forEach((curve) => curve.forEach((p) => freqSet.add(p.freq)));
  const freqs = Array.from(freqSet).sort((a, b) => a - b);
  const merged: EqPoint[] = [];

  for (const f of freqs) {
    let total = 0;
    for (const curve of curves) {
      const nearest = curve.reduce<{ d: number; gain: number } | null>((acc, p) => {
        const d = Math.abs(p.freq - f);
        if (!acc || d < acc.d) return { d, gain: p.gain };
        return acc;
      }, null);
      if (nearest) total += nearest.gain;
    }
    merged.push({ freq: f, gain: total });
  }

  return merged;
}

const DEFAULT_PRESET_CURVE: EqPoint[] = [
  { freq: 40, gain: 0 },
  { freq: 120, gain: -0.5 },
  { freq: 800, gain: 0 },
  { freq: 2500, gain: 0.5 },
  { freq: 8000, gain: 0.5 },
  { freq: 14000, gain: 0 },
];

export const MacroVisualizer: React.FC<MacroVisualizerProps> = ({
  presetBaseCurve,
  macros,
  onMacrosChange,
}) => {
  const base = presetBaseCurve ?? DEFAULT_PRESET_CURVE;

  const airCurve = React.useMemo(() => mapAirMacroToCurve(macros.air), [macros.air]);
  const punchCurve = React.useMemo(
    () => mapPunchMacroToCurve(macros.punch),
    [macros.punch]
  );
  const warmthCurve = React.useMemo(
    () => mapWarmthMacroToCurve(macros.warmth),
    [macros.warmth]
  );

  const macroCurve = React.useMemo(
    () => mergeCurves([airCurve, punchCurve, warmthCurve]),
    [airCurve, punchCurve, warmthCurve]
  );

  const updateMacro = (kind: MacroKind, value: number) => {
    const next: MacroState = { ...macros, [kind]: value };
    onMacrosChange(next);
  };

  return (
    <div className="flex flex-col gap-4 bg-zinc-950/80 border border-zinc-800 rounded-xl p-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex gap-4">
          <MacroKnob
            label="Air"
            kind="air"
            value={macros.air}
            onChange={(v) => updateMacro("air", v)}
          />
          <MacroKnob
            label="Punch"
            kind="punch"
            value={macros.punch}
            onChange={(v) => updateMacro("punch", v)}
          />
          <MacroKnob
            label="Warmth"
            kind="warmth"
            value={macros.warmth}
            onChange={(v) => updateMacro("warmth", v)}
          />
        </div>
        <div className="text-right text-[0.7rem] text-zinc-400 leading-snug max-w-[40%] hidden md:block">
          Macro controls drive both DSP and this visual EQ. Curves are
          intentionally clamped to ±6 dB for safe, musical feedback.
        </div>
      </div>

      <EQDisplay baseCurve={base} macroCurve={macroCurve} />
    </div>
  );
};

export default MacroVisualizer;

"use client";

import { useMemo } from "react";
import type { PluginParams, TrackPlugin } from "../pluginTypes";
import { defaultPluginParams } from "../pluginTypes";
import Knob from "./primitives/Knob";
import Slider from "./primitives/Slider";

function getNum(params: PluginParams, key: string, fallback: number) {
  const v = Number(params[key]);
  return Number.isFinite(v) ? v : fallback;
}

function setParam(plugin: TrackPlugin, key: string, value: number) {
  return { ...plugin, params: { ...plugin.params, [key]: value }, locked: false };
}

export default function PitchCorrection({
  plugin,
  onChange,
}: {
  plugin: TrackPlugin;
  onChange: (p: TrackPlugin) => void;
}) {
  const defaults = useMemo(() => defaultPluginParams("Pitch Correction"), []);
  const params = useMemo(() => ({ ...defaults, ...plugin.params }), [defaults, plugin.params]);

  const amount = getNum(params, "amount", 80);
  const speed = getNum(params, "speed", 60);
  const humanize = getNum(params, "humanize", 40);
  const formant = getNum(params, "formant", 0);

  return (
    <div className="grid grid-cols-12 gap-4">
      <div className="col-span-12 lg:col-span-7 rounded-xl border border-white/10 bg-black/30 p-4">
        <p className="text-[10px] uppercase tracking-[0.18em] text-white/40">Pitch Lock Overview</p>
        <p className="mt-1 text-[12px] text-white/60">
          Visual control for how tightly the vocal follows the session key and scale.
          Actual pitch processing is handled in the DSP engine.
        </p>
        <div className="mt-4 grid grid-cols-3 gap-4">
          <Knob
            label="Amount"
            kind="neon"
            value={amount}
            min={0}
            max={100}
            step={1}
            defaultValue={80}
            unit="%"
            decimals={0}
            onChange={(v) => onChange(setParam(plugin, "amount", v))}
          />
          <Knob
            label="Speed"
            kind="air"
            value={speed}
            min={0}
            max={100}
            step={1}
            defaultValue={60}
            unit="%"
            decimals={0}
            onChange={(v) => onChange(setParam(plugin, "speed", v))}
          />
          <Knob
            label="Humanize"
            kind="warmth"
            value={humanize}
            min={0}
            max={100}
            step={1}
            defaultValue={40}
            unit="%"
            decimals={0}
            onChange={(v) => onChange(setParam(plugin, "humanize", v))}
          />
        </div>
      </div>

      <div className="col-span-12 lg:col-span-5 rounded-xl border border-white/10 bg-black/30 p-4">
        <p className="text-[10px] uppercase tracking-[0.18em] text-white/40">Formant & Blend</p>
        <div className="mt-3 space-y-4">
          <Slider
            label="Formant Shift"
            value={formant}
            min={-1}
            max={1}
            step={0.01}
            defaultValue={0}
            decimals={2}
            format={(v) => (v === 0 ? "Neutral" : v > 0 ? `+${v.toFixed(2)}` : v.toFixed(2))}
            onChange={(v) => onChange(setParam(plugin, "formant", v))}
          />
          <Slider
            label="Output Mix"
            value={getNum(params, "mix", 1) * 100}
            min={0}
            max={100}
            step={1}
            defaultValue={100}
            unit="%"
            decimals={0}
            format={(v) => `${Math.round(v)} %`}
            onChange={(v) => onChange(setParam(plugin, "mix", v / 100))}
          />
        </div>
      </div>
    </div>
  );
}

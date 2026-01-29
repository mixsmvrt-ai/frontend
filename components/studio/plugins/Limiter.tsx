"use client";

import { useMemo } from "react";
import type { PluginParams, TrackPlugin } from "../pluginTypes";
import { defaultPluginParams } from "../pluginTypes";
import Knob from "./primitives/Knob";
import Meter from "./primitives/Meter";
import { clamp } from "./primitives/clamp";

function getNum(params: PluginParams, key: string, fallback: number) {
  const v = Number(params[key]);
  return Number.isFinite(v) ? v : fallback;
}

function setParam(plugin: TrackPlugin, key: string, value: number) {
  return { ...plugin, params: { ...plugin.params, [key]: value }, locked: false };
}

export default function Limiter({ plugin, onChange }: { plugin: TrackPlugin; onChange: (p: TrackPlugin) => void }) {
  const defaults = useMemo(() => defaultPluginParams("Limiter"), []);
  const params = useMemo(() => ({ ...defaults, ...plugin.params }), [defaults, plugin.params]);

  const threshold = getNum(params, "threshold", -6);
  const ceiling = getNum(params, "ceiling", -1);
  const release = getNum(params, "release", 120);
  const targetLUFS = getNum(params, "target_lufs", -14);

  // Visual-only estimate
  const gr = useMemo(() => clamp((-threshold - 1) * 0.7, 0, 12), [threshold]);
  const lufs = useMemo(() => clamp(-10 - gr * 0.4, -24, -6), [gr]);

  return (
    <div className="grid grid-cols-12 gap-4">
      <div className="col-span-12 lg:col-span-7 rounded-xl border border-white/10 bg-black/30 p-4">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-white/40">Meters</p>
            <p className="text-[12px] text-white/60">LUFS + Gain Reduction</p>
          </div>
          <div className="rounded-full bg-yellow-400/10 px-3 py-1 text-[11px] text-yellow-200">
            AI target: {targetLUFS.toFixed(0)} LUFS
          </div>
        </div>

        <div className="flex items-end gap-6">
          <Meter label="LUFS" value={lufs} min={-24} max={-6} color="cyan" heightClass="h-48" />
          <Meter label="GR" value={gr} min={0} max={12} color="emerald" heightClass="h-48" />
          <div className="flex-1 rounded-xl border border-white/10 bg-black/40 p-4">
            <div className="flex items-center justify-between text-[11px] text-white/60">
              <span>Ceiling</span>
              <span className="text-white/80">{ceiling.toFixed(1)} dB</span>
            </div>
            <div className="mt-2 h-2 w-full rounded-full bg-white/5">
              <div className="h-2 rounded-full bg-red-500/40" style={{ width: `${clamp((1 + ceiling) / 3, 0, 1) * 100}%` }} />
            </div>
            <div className="mt-4 text-[11px] text-white/50">
              Threshold drives loudness; ceiling protects peaks.
            </div>
          </div>
        </div>
      </div>

      <div className="col-span-12 lg:col-span-5 rounded-xl border border-white/10 bg-black/30 p-4">
        <p className="text-[10px] uppercase tracking-[0.18em] text-white/40">Controls</p>
        <div className="mt-3 grid grid-cols-2 gap-4">
          <Knob
            label="Threshold"
            kind="punch"
            value={threshold}
            min={-18}
            max={0}
            step={0.1}
            defaultValue={-6}
            unit="dB"
            decimals={1}
            format={(v) => `${v.toFixed(1)} dB`}
            onChange={(v) => onChange(setParam(plugin, "threshold", v))}
          />
          <Knob
            label="Ceiling"
            kind="neon"
            value={ceiling}
            min={-6}
            max={0}
            step={0.1}
            defaultValue={-1}
            unit="dB"
            decimals={1}
            format={(v) => `${v.toFixed(1)} dB`}
            onChange={(v) => onChange(setParam(plugin, "ceiling", v))}
          />
          <Knob
            label="Release"
            kind="warmth"
            value={release}
            min={10}
            max={500}
            step={1}
            defaultValue={120}
            unit="ms"
            decimals={0}
            format={(v) => `${Math.round(v)} ms`}
            onChange={(v) => onChange(setParam(plugin, "release", v))}
          />
          <Knob
            label="Target"
            kind="air"
            value={targetLUFS}
            min={-18}
            max={-8}
            step={0.1}
            defaultValue={-14}
            unit="LUFS"
            decimals={1}
            format={(v) => `${v.toFixed(1)} LUFS`}
            onChange={(v) => onChange(setParam(plugin, "target_lufs", v))}
          />
        </div>
      </div>
    </div>
  );
}

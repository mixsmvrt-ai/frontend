"use client";

import { useMemo } from "react";
import type { PluginParams, TrackPlugin } from "../pluginTypes";
import { defaultPluginParams } from "../pluginTypes";
import Knob from "./primitives/Knob";
import Slider from "./primitives/Slider";
import Meter from "./primitives/Meter";
import { clamp } from "./primitives/clamp";
import { freqToX } from "./utils/audioMath";

function getNum(params: PluginParams, key: string, fallback: number) {
  const v = Number(params[key]);
  return Number.isFinite(v) ? v : fallback;
}

function setParam(plugin: TrackPlugin, key: string, value: number) {
  return { ...plugin, params: { ...plugin.params, [key]: value }, locked: false };
}

export default function DeEsser({ plugin, onChange }: { plugin: TrackPlugin; onChange: (p: TrackPlugin) => void }) {
  const defaults = useMemo(() => defaultPluginParams("De-esser"), []);
  const params = useMemo(() => ({ ...defaults, ...plugin.params }), [defaults, plugin.params]);

  const freq = getNum(params, "freq", 6500);
  const width = getNum(params, "width", 0.8);
  const threshold = getNum(params, "threshold", -24);
  const amount = getNum(params, "amount", 40);

  const sib = useMemo(() => {
    // visual-only: more reduction + lower threshold => higher sibilance activity
    const a = clamp(amount / 100, 0, 1);
    const t = clamp((-threshold - 6) / 42, 0, 1);
    return clamp((a * 0.6 + t * 0.4) * 100, 0, 100);
  }, [amount, threshold]);

  const graphW = 520;
  const graphH = 120;
  const centerX = freqToX(freq, graphW);
  const bandW = clamp(width, 0.2, 2) * 80;

  return (
    <div className="grid grid-cols-12 gap-4">
      <div className="col-span-12 lg:col-span-7 rounded-xl border border-white/10 bg-black/30 p-4">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-white/40">Sibilance Focus</p>
            <p className="text-[12px] text-white/60">AI highlights harsh region</p>
          </div>
          <Meter label="S" value={sib} min={0} max={100} color="cyan" heightClass="h-20" />
        </div>

        <div className="overflow-hidden rounded-xl border border-white/10 bg-black/40 p-3">
          <svg viewBox={`0 0 ${graphW} ${graphH}`} className="h-[120px] w-full">
            <rect width={graphW} height={graphH} fill="rgba(0,0,0,0.35)" />
            {Array.from({ length: 8 }).map((_, i) => (
              <line
                key={i}
                x1={(i / 7) * graphW}
                x2={(i / 7) * graphW}
                y1={0}
                y2={graphH}
                stroke="rgba(255,255,255,0.06)"
              />
            ))}
            <rect
              x={centerX - bandW / 2}
              y={0}
              width={bandW}
              height={graphH}
              fill="rgba(244,63,94,0.18)"
              stroke="rgba(244,63,94,0.35)"
            />
            <line
              x1={centerX}
              x2={centerX}
              y1={0}
              y2={graphH}
              stroke="rgba(255,255,255,0.35)"
              strokeDasharray="4 4"
            />
            <text x={10} y={16} fill="rgba(255,255,255,0.45)" fontSize={10}>
              1k
            </text>
            <text x={graphW - 40} y={16} fill="rgba(255,255,255,0.45)" fontSize={10}>
              20k
            </text>
          </svg>
        </div>
      </div>

      <div className="col-span-12 lg:col-span-5 rounded-xl border border-white/10 bg-black/30 p-4">
        <p className="text-[10px] uppercase tracking-[0.18em] text-white/40">Controls</p>
        <div className="mt-3 grid grid-cols-2 gap-4">
          <Knob
            label="Freq"
            kind="air"
            value={freq}
            min={1000}
            max={12000}
            step={1}
            defaultValue={6500}
            unit="Hz"
            decimals={0}
            format={(v) => (v >= 1000 ? `${(v / 1000).toFixed(2)} kHz` : `${Math.round(v)} Hz`)}
            onChange={(v) => onChange(setParam(plugin, "freq", v))}
          />
          <Knob
            label="Width"
            kind="neon"
            value={width}
            min={0.2}
            max={2}
            step={0.01}
            defaultValue={0.8}
            decimals={2}
            onChange={(v) => onChange(setParam(plugin, "width", v))}
          />
        </div>
        <div className="mt-4">
          <Slider
            label="Threshold"
            value={threshold}
            min={-48}
            max={0}
            step={0.1}
            defaultValue={-24}
            unit="dB"
            decimals={1}
            format={(v) => `${v.toFixed(1)} dB`}
            onChange={(v) => onChange(setParam(plugin, "threshold", v))}
          />
        </div>
        <div className="mt-4">
          <Slider
            label="Reduction"
            value={amount}
            min={0}
            max={100}
            step={1}
            defaultValue={40}
            unit="%"
            decimals={0}
            format={(v) => `${Math.round(v)} %`}
            onChange={(v) => onChange(setParam(plugin, "amount", v))}
          />
        </div>
      </div>
    </div>
  );
}

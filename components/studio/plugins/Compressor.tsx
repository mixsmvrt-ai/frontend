"use client";

import { useMemo } from "react";
import type { PluginParams, TrackPlugin } from "../pluginTypes";
import { defaultPluginParams } from "../pluginTypes";
import Knob from "./primitives/Knob";
import Meter from "./primitives/Meter";
import Toggle from "./primitives/Toggle";
import { clamp } from "./primitives/clamp";

function getNum(params: PluginParams, key: string, fallback: number) {
  const v = Number(params[key]);
  return Number.isFinite(v) ? v : fallback;
}

function getBool(params: PluginParams, key: string, fallback: boolean) {
  const v = params[key];
  return typeof v === "boolean" ? v : fallback;
}

function setParam(plugin: TrackPlugin, key: string, value: number | boolean) {
  return {
    ...plugin,
    params: {
      ...plugin.params,
      [key]: value,
    },
    locked: false,
  };
}

function compressionCurve(inputDb: number, threshold: number, ratio: number, knee: number): number {
  // Soft-knee curve (visual). Output is outputDb.
  const r = Math.max(1, ratio);
  const k = Math.max(0, knee);
  if (k <= 0) {
    if (inputDb <= threshold) return inputDb;
    return threshold + (inputDb - threshold) / r;
  }

  const lower = threshold - k / 2;
  const upper = threshold + k / 2;

  if (inputDb < lower) return inputDb;
  if (inputDb > upper) return threshold + (inputDb - threshold) / r;

  // quadratic interpolation through knee region
  const x = (inputDb - lower) / k; // 0..1
  const y = x * x; // ease
  const hard = threshold + (inputDb - threshold) / r;
  return inputDb + (hard - inputDb) * y;
}

export default function Compressor({ plugin, onChange }: { plugin: TrackPlugin; onChange: (p: TrackPlugin) => void }) {
  const defaults = useMemo(() => defaultPluginParams("Compressor"), []);
  const params = useMemo(() => ({ ...defaults, ...plugin.params }), [defaults, plugin.params]);

  const threshold = getNum(params, "threshold", -18);
  const ratio = getNum(params, "ratio", 3);
  const attack = getNum(params, "attack", 10);
  const release = getNum(params, "release", 120);
  const knee = getNum(params, "knee", 6);
  const sidechain = getBool(params, "sidechain", false);
  const auto = getBool(params, "auto", false);

  const width = 320;
  const height = 200;
  const minDb = -60;
  const maxDb = 6;

  const path = useMemo(() => {
    const pts = 60;
    const mapX = (db: number) => ((db - minDb) / (maxDb - minDb)) * width;
    const mapY = (db: number) => (1 - (db - minDb) / (maxDb - minDb)) * height;

    const d = Array.from({ length: pts }, (_, i) => {
      const input = minDb + (i / (pts - 1)) * (maxDb - minDb);
      const out = compressionCurve(input, threshold, ratio, knee);
      const x = mapX(input);
      const y = mapY(out);
      return `${i === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)}`;
    }).join(" ");

    return d;
  }, [knee, ratio, threshold]);

  // Visual-only GR estimate (no audio): show more GR as threshold goes lower and ratio goes higher.
  const gr = useMemo(() => {
    const t = clamp((-threshold - 6) / 42, 0, 1);
    const r = clamp((ratio - 1) / 9, 0, 1);
    return clamp((t * 0.6 + r * 0.4) * 12, 0, 12);
  }, [ratio, threshold]);

  return (
    <div className="grid grid-cols-12 gap-4">
      <div className="col-span-12 lg:col-span-7 rounded-xl border border-white/10 bg-black/30 p-4">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-white/40">Compression Curve</p>
            <p className="text-[12px] text-white/60">Threshold / Ratio / Knee</p>
          </div>
          <div className="flex items-center gap-2">
            <Toggle label="Sidechain" value={sidechain} onChange={(v) => onChange(setParam(plugin, "sidechain", v))} />
            <Toggle label="Auto" value={auto} onChange={(v) => onChange(setParam(plugin, "auto", v))} />
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="overflow-hidden rounded-xl border border-white/10 bg-black/40 p-3">
            <svg viewBox={`0 0 ${width} ${height}`} className="h-[200px] w-[320px]">
              <rect width={width} height={height} fill="rgba(0,0,0,0.35)" />
              {/* diagonal reference */}
              <path d={`M0 ${height} L${width} 0`} stroke="rgba(255,255,255,0.12)" strokeWidth={2} fill="none" />
              <path d={path} stroke="rgba(244,63,94,0.9)" strokeWidth={2.5} fill="none" style={{ filter: "drop-shadow(0 0 8px rgba(244,63,94,0.35))" }} />
            </svg>
          </div>

          <Meter label="GR" value={gr} min={0} max={12} color="emerald" heightClass="h-[200px]" />
        </div>
      </div>

      <div className="col-span-12 lg:col-span-5 rounded-xl border border-white/10 bg-black/30 p-4">
        <p className="text-[10px] uppercase tracking-[0.18em] text-white/40">Controls</p>
        <div className="mt-3 grid grid-cols-2 gap-4">
          <Knob
            label="Threshold"
            kind="punch"
            value={threshold}
            min={-48}
            max={0}
            step={0.1}
            defaultValue={-18}
            unit="dB"
            decimals={1}
            format={(v) => `${v.toFixed(1)} dB`}
            onChange={(v) => onChange(setParam(plugin, "threshold", v))}
          />
          <Knob
            label="Ratio"
            kind="punch"
            value={ratio}
            min={1}
            max={10}
            step={0.01}
            defaultValue={3}
            decimals={2}
            format={(v) => `${v.toFixed(2)}:1`}
            onChange={(v) => onChange(setParam(plugin, "ratio", v))}
          />
          <Knob
            label="Attack"
            kind="air"
            value={attack}
            min={0.1}
            max={50}
            step={0.1}
            defaultValue={10}
            unit="ms"
            decimals={1}
            format={(v) => `${v.toFixed(1)} ms`}
            onChange={(v) => onChange(setParam(plugin, "attack", v))}
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
            label="Knee"
            kind="neon"
            value={knee}
            min={0}
            max={24}
            step={0.1}
            defaultValue={6}
            unit="dB"
            decimals={1}
            format={(v) => `${v.toFixed(1)} dB`}
            onChange={(v) => onChange(setParam(plugin, "knee", v))}
          />
        </div>
      </div>
    </div>
  );
}

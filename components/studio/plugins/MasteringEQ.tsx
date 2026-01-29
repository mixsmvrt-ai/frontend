"use client";

import { useMemo } from "react";
import type { PluginParams, TrackPlugin } from "../pluginTypes";
import { defaultPluginParams } from "../pluginTypes";
import Knob from "./primitives/Knob";
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
  return { ...plugin, params: { ...plugin.params, [key]: value }, locked: false };
}

export default function MasteringEQ({ plugin, onChange }: { plugin: TrackPlugin; onChange: (p: TrackPlugin) => void }) {
  const defaults = useMemo(() => defaultPluginParams("Mastering EQ"), []);
  const params = useMemo(() => ({ ...defaults, ...plugin.params }), [defaults, plugin.params]);

  const tilt = getNum(params, "tilt", 0);
  const low = getNum(params, "low_shelf_gain", 0);
  const high = getNum(params, "high_shelf_gain", 0);
  const linear = getBool(params, "linear_phase", true);

  const w = 560;
  const h = 160;

  const curve = useMemo(() => {
    // Simple mastering curve: shelves + tilt.
    const pts = 80;
    const minDb = -6;
    const maxDb = 6;
    const mapX = (i: number) => (i / (pts - 1)) * w;
    const mapY = (db: number) => {
      const t = clamp((db - minDb) / (maxDb - minDb), 0, 1);
      return (1 - t) * h;
    };

    const d = Array.from({ length: pts }, (_, i) => {
      const xT = i / (pts - 1);
      const shelfLow = (1 - xT) * low;
      const shelfHigh = xT * high;
      const tTilt = (xT - 0.5) * 2 * tilt;
      const db = clamp(shelfLow + shelfHigh + tTilt, minDb, maxDb);
      const x = mapX(i);
      const y = mapY(db);
      return `${i === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)}`;
    }).join(" ");

    return d;
  }, [high, low, tilt]);

  return (
    <div className="grid grid-cols-12 gap-4">
      <div className="col-span-12 lg:col-span-7 rounded-xl border border-white/10 bg-black/30 p-4">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-white/40">Tonal Balance</p>
            <p className="text-[12px] text-white/60">Wide bands • subtle limits</p>
          </div>
          <Toggle label="Linear" value={linear} onChange={(v) => onChange(setParam(plugin, "linear_phase", v))} />
        </div>

        <div className="overflow-hidden rounded-xl border border-white/10 bg-black/40 p-3">
          <svg viewBox={`0 0 ${w} ${h}`} className="h-[160px] w-full">
            <rect width={w} height={h} fill="rgba(0,0,0,0.35)" />
            {Array.from({ length: 5 }).map((_, i) => (
              <line
                key={i}
                x1={0}
                x2={w}
                y1={(i / 4) * h}
                y2={(i / 4) * h}
                stroke="rgba(255,255,255,0.06)"
              />
            ))}
            <path d={curve} stroke="rgba(125,211,252,0.9)" strokeWidth={2.5} fill="none" style={{ filter: "drop-shadow(0 0 8px rgba(125,211,252,0.25))" }} />
            <path d={`M0 ${h / 2} L${w} ${h / 2}`} stroke="rgba(255,255,255,0.14)" strokeDasharray="4 4" />
          </svg>
        </div>

        <div className="mt-3 rounded-lg border border-white/10 bg-black/40 p-3 text-[11px] text-white/60">
          <div className="flex items-center justify-between">
            <span>AI tonal overlay</span>
            <span className="text-white/80">Target curve displayed</span>
          </div>
          <div className="mt-2 h-2 w-full rounded-full bg-white/5">
            <div className="h-2 w-[55%] rounded-full bg-yellow-400/20" />
          </div>
        </div>
      </div>

      <div className="col-span-12 lg:col-span-5 rounded-xl border border-white/10 bg-black/30 p-4">
        <p className="text-[10px] uppercase tracking-[0.18em] text-white/40">Controls</p>
        <div className="mt-3 grid grid-cols-2 gap-4">
          <Knob
            label="Tilt"
            kind="air"
            value={tilt}
            min={-3}
            max={3}
            step={0.1}
            defaultValue={0}
            unit="dB"
            decimals={1}
            format={(v) => `${v >= 0 ? "+" : ""}${v.toFixed(1)} dB`}
            onChange={(v) => onChange(setParam(plugin, "tilt", v))}
          />
          <Knob
            label="Low"
            kind="warmth"
            value={low}
            min={-3}
            max={3}
            step={0.1}
            defaultValue={0}
            unit="dB"
            decimals={1}
            format={(v) => `${v >= 0 ? "+" : ""}${v.toFixed(1)} dB`}
            onChange={(v) => onChange(setParam(plugin, "low_shelf_gain", v))}
          />
          <Knob
            label="High"
            kind="neon"
            value={high}
            min={-3}
            max={3}
            step={0.1}
            defaultValue={0}
            unit="dB"
            decimals={1}
            format={(v) => `${v >= 0 ? "+" : ""}${v.toFixed(1)} dB`}
            onChange={(v) => onChange(setParam(plugin, "high_shelf_gain", v))}
          />
        </div>
      </div>
    </div>
  );
}

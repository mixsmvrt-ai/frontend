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
  return { ...plugin, params: { ...plugin.params, [key]: value }, locked: false };
}

export default function StereoImager({ plugin, onChange }: { plugin: TrackPlugin; onChange: (p: TrackPlugin) => void }) {
  const defaults = useMemo(() => defaultPluginParams("Stereo Imager"), []);
  const params = useMemo(() => ({ ...defaults, ...plugin.params }), [defaults, plugin.params]);

  const low = getNum(params, "low_width", 0.9);
  const mid = getNum(params, "mid_width", 1.0);
  const high = getNum(params, "high_width", 1.15);
  const mono = getBool(params, "mono_check", false);

  const field = useMemo(() => {
    const w = clamp((low + mid + high) / 3, 0.5, 1.6);
    return w;
  }, [high, low, mid]);

  const monoCompat = useMemo(() => {
    // Visual-only: wider => lower mono compatibility.
    const c = clamp(1.15 - (field - 1), 0.2, 1);
    return mono ? clamp(c * 0.85, 0, 1) : c;
  }, [field, mono]);

  return (
    <div className="grid grid-cols-12 gap-4">
      <div className="col-span-12 lg:col-span-7 rounded-xl border border-white/10 bg-black/30 p-4">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-white/40">Stereo Field</p>
            <p className="text-[12px] text-white/60">Low / Mid / High width</p>
          </div>
          <Toggle label="Mono Check" value={mono} onChange={(v) => onChange(setParam(plugin, "mono_check", v))} />
        </div>

        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-8 overflow-hidden rounded-xl border border-white/10 bg-black/40 p-4">
            <svg viewBox="0 0 320 220" className="h-[220px] w-full">
              <rect width={320} height={220} fill="rgba(0,0,0,0.35)" />
              <line x1={160} y1={10} x2={160} y2={210} stroke="rgba(255,255,255,0.10)" />
              <line x1={20} y1={110} x2={300} y2={110} stroke="rgba(255,255,255,0.10)" />
              <ellipse
                cx={160}
                cy={110}
                rx={80 * field}
                ry={60}
                fill="rgba(244,63,94,0.12)"
                stroke="rgba(244,63,94,0.45)"
              />
              <ellipse
                cx={160}
                cy={110}
                rx={50 * field}
                ry={34}
                fill="rgba(125,211,252,0.10)"
                stroke="rgba(125,211,252,0.35)"
              />
              <text x={12} y={18} fill="rgba(255,255,255,0.45)" fontSize={10}>
                L
              </text>
              <text x={300} y={18} fill="rgba(255,255,255,0.45)" fontSize={10}>
                R
              </text>
              {mono && (
                <text x={160} y={205} fill="rgba(255,255,255,0.6)" fontSize={10} textAnchor="middle">
                  MONO CHECK
                </text>
              )}
            </svg>
          </div>

          <div className="col-span-4 flex flex-col items-center justify-between gap-4 rounded-xl border border-white/10 bg-black/40 p-4">
            <Meter label="Mono" value={monoCompat} min={0} max={1} color="emerald" heightClass="h-28" />
            <div className="w-full rounded-lg border border-white/10 bg-black/30 p-3 text-[11px] text-white/60">
              <div className="flex items-center justify-between">
                <span>AI suggestion</span>
                <span className="text-white/80">Keep lows tight</span>
              </div>
              <div className="mt-2 h-2 w-full rounded-full bg-white/5">
                <div className="h-2 w-[45%] rounded-full bg-yellow-400/20" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="col-span-12 lg:col-span-5 rounded-xl border border-white/10 bg-black/30 p-4">
        <p className="text-[10px] uppercase tracking-[0.18em] text-white/40">Controls</p>
        <div className="mt-3 grid grid-cols-2 gap-4">
          <Knob
            label="Low"
            kind="warmth"
            value={low}
            min={0.5}
            max={1.6}
            step={0.01}
            defaultValue={0.9}
            decimals={2}
            onChange={(v) => onChange(setParam(plugin, "low_width", v))}
          />
          <Knob
            label="Mid"
            kind="neon"
            value={mid}
            min={0.5}
            max={1.6}
            step={0.01}
            defaultValue={1.0}
            decimals={2}
            onChange={(v) => onChange(setParam(plugin, "mid_width", v))}
          />
          <Knob
            label="High"
            kind="air"
            value={high}
            min={0.5}
            max={1.6}
            step={0.01}
            defaultValue={1.15}
            decimals={2}
            onChange={(v) => onChange(setParam(plugin, "high_width", v))}
          />
        </div>
      </div>
    </div>
  );
}

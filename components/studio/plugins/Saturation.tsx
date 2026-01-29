"use client";

import { useMemo } from "react";
import type { PluginParams, TrackPlugin } from "../pluginTypes";
import { defaultPluginParams } from "../pluginTypes";
import Knob from "./primitives/Knob";
import Slider from "./primitives/Slider";
import { clamp } from "./primitives/clamp";

function getNum(params: PluginParams, key: string, fallback: number) {
  const v = Number(params[key]);
  return Number.isFinite(v) ? v : fallback;
}

function getStr(params: PluginParams, key: string, fallback: string) {
  const v = params[key];
  return typeof v === "string" ? v : fallback;
}

function setParam(plugin: TrackPlugin, key: string, value: number | string) {
  return { ...plugin, params: { ...plugin.params, [key]: value }, locked: false };
}

export default function Saturation({ plugin, onChange }: { plugin: TrackPlugin; onChange: (p: TrackPlugin) => void }) {
  const defaults = useMemo(() => defaultPluginParams("Saturation"), []);
  const params = useMemo(() => ({ ...defaults, ...plugin.params }), [defaults, plugin.params]);

  const drive = getNum(params, "drive", 25);
  const tone = getNum(params, "tone", 0);
  const mode = getStr(params, "mode", "Tape");

  const harmonics = useMemo(() => {
    const d = clamp(drive / 100, 0, 1);
    const base = [0.2, 0.35, 0.55, 0.35, 0.25, 0.15, 0.1, 0.07];
    return base.map((b, i) => clamp(b * (0.35 + d * (1.8 - i * 0.12)), 0, 1));
  }, [drive]);

  return (
    <div className="grid grid-cols-12 gap-4">
      <div className="col-span-12 lg:col-span-7 rounded-xl border border-white/10 bg-black/30 p-4">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-white/40">Harmonics</p>
            <p className="text-[12px] text-white/60">Drive adds harmonic content</p>
          </div>
          <select
            className="h-9 rounded-lg border border-white/10 bg-black/40 px-3 text-[12px] text-white/70 outline-none hover:border-red-500/40"
            value={mode}
            onChange={(e) => onChange(setParam(plugin, "mode", e.target.value))}
          >
            <option value="Warm">Warm</option>
            <option value="Tube">Tube</option>
            <option value="Tape">Tape</option>
            <option value="Analog">Analog</option>
          </select>
        </div>

        <div className="rounded-xl border border-white/10 bg-black/40 p-4">
          <div className="grid grid-cols-8 gap-2">
            {harmonics.map((h, i) => (
              <div key={i} className="flex flex-col items-center gap-2">
                <div className="relative h-28 w-3 overflow-hidden rounded-full bg-white/5">
                  <div
                    className="absolute bottom-0 left-0 right-0 rounded-full bg-gradient-to-t from-red-500/80 via-red-300/60 to-white/60 transition-all duration-200"
                    style={{ height: `${h * 100}%` }}
                  />
                </div>
                <span className="text-[10px] text-white/40">{i + 2}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="col-span-12 lg:col-span-5 rounded-xl border border-white/10 bg-black/30 p-4">
        <p className="text-[10px] uppercase tracking-[0.18em] text-white/40">Controls</p>
        <div className="mt-3 grid grid-cols-2 gap-4">
          <Knob
            label="Drive"
            kind="warmth"
            value={drive}
            min={0}
            max={100}
            step={1}
            defaultValue={25}
            decimals={0}
            format={(v) => `${Math.round(v)} %`}
            onChange={(v) => onChange(setParam(plugin, "drive", v))}
          />
          <Knob
            label="Tone"
            kind="air"
            value={tone}
            min={-1}
            max={1}
            step={0.01}
            defaultValue={0}
            decimals={2}
            format={(v) => `${v >= 0 ? "+" : ""}${v.toFixed(2)}`}
            onChange={(v) => onChange(setParam(plugin, "tone", v))}
          />
        </div>

        <div className="mt-4">
          <Slider
            label="Tone Tilt"
            value={tone}
            min={-1}
            max={1}
            step={0.01}
            defaultValue={0}
            decimals={2}
            onChange={(v) => onChange(setParam(plugin, "tone", v))}
          />
        </div>

        <div className="mt-4 rounded-lg border border-white/10 bg-black/40 p-3 text-[11px] text-white/60">
          <div className="flex items-center justify-between">
            <span>Intensity range</span>
            <span className="text-white/80">AI marks safe drive zone</span>
          </div>
          <div className="mt-2 h-2 w-full rounded-full bg-white/5">
            <div className="h-2 w-[65%] rounded-full bg-emerald-500/25" />
          </div>
        </div>
      </div>
    </div>
  );
}

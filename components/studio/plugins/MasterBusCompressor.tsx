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

export default function MasterBusCompressor({ plugin, onChange }: { plugin: TrackPlugin; onChange: (p: TrackPlugin) => void }) {
  const defaults = useMemo(() => defaultPluginParams("Master Bus Compressor"), []);
  const params = useMemo(() => ({ ...defaults, ...plugin.params }), [defaults, plugin.params]);

  const threshold = getNum(params, "threshold", -12);
  const ratio = getNum(params, "ratio", 2);
  const attack = getNum(params, "attack", 30);
  const release = getNum(params, "release", 200);
  const autoRelease = getBool(params, "auto_release", true);

  const gr = useMemo(() => {
    const t = clamp((-threshold - 4) / 24, 0, 1);
    const r = clamp((ratio - 1) / 9, 0, 1);
    return clamp((t * 0.7 + r * 0.3) * 8, 0, 8);
  }, [ratio, threshold]);

  return (
    <div className="grid grid-cols-12 gap-4">
      <div className="col-span-12 lg:col-span-7 rounded-xl border border-white/10 bg-black/30 p-4">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-white/40">Glue</p>
            <p className="text-[12px] text-white/60">Bus-style compression</p>
          </div>
          <Toggle label="Auto Release" value={autoRelease} onChange={(v) => onChange(setParam(plugin, "auto_release", v))} />
        </div>

        <div className="flex items-end gap-6">
          <Meter label="GR" value={gr} min={0} max={8} color="emerald" heightClass="h-56" />
          <div className="flex-1 rounded-xl border border-white/10 bg-black/40 p-4">
            <p className="text-[11px] text-white/60">Slow attack presets + gentle ratios keep transients.</p>
            <div className="mt-4 grid grid-cols-3 gap-2">
              {["Slow Attack", "Punch", "Glue"].map((p) => (
                <button
                  key={p}
                  type="button"
                  className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-[11px] text-white/70 hover:border-red-500/40"
                  onClick={() => {
                    if (p === "Slow Attack") {
                      onChange(
                        setParam(setParam(setParam(plugin, "attack", 30), "ratio", 2), "threshold", -10),
                      );
                    } else if (p === "Punch") {
                      onChange(
                        setParam(setParam(setParam(plugin, "attack", 10), "ratio", 3), "threshold", -12),
                      );
                    } else {
                      onChange(
                        setParam(setParam(setParam(plugin, "attack", 20), "ratio", 2), "threshold", -14),
                      );
                    }
                  }}
                >
                  {p}
                </button>
              ))}
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
            min={-24}
            max={0}
            step={0.1}
            defaultValue={-12}
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
            max={6}
            step={0.01}
            defaultValue={2}
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
            defaultValue={30}
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
            defaultValue={200}
            unit="ms"
            decimals={0}
            format={(v) => `${Math.round(v)} ms`}
            onChange={(v) => onChange(setParam(plugin, "release", v))}
          />
        </div>
      </div>
    </div>
  );
}

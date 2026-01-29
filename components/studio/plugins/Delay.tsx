"use client";

import { useMemo } from "react";
import type { PluginParams, TrackPlugin } from "../pluginTypes";
import { defaultPluginParams } from "../pluginTypes";
import Knob from "./primitives/Knob";
import Toggle from "./primitives/Toggle";
import Slider from "./primitives/Slider";

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

export default function Delay({ plugin, onChange }: { plugin: TrackPlugin; onChange: (p: TrackPlugin) => void }) {
  const defaults = useMemo(() => defaultPluginParams("Delay"), []);
  const params = useMemo(() => ({ ...defaults, ...plugin.params }), [defaults, plugin.params]);

  const timeMs = getNum(params, "time_ms", 320);
  const sync = getBool(params, "sync", false);
  const feedback = getNum(params, "feedback", 35);
  const width = getNum(params, "width", 60);
  const hp = getNum(params, "hp", 120);
  const lp = getNum(params, "lp", 8000);
  const pingPong = getBool(params, "ping_pong", false);

  const taps = useMemo(() => {
    const n = 6;
    const base = Math.min(900, Math.max(60, timeMs));
    return Array.from({ length: n }, (_, i) => ({
      x: 10 + (i / (n - 1)) * 320,
      a: Math.max(0, 1 - i / (n - 1)) * (feedback / 100),
      delay: (i * base) / 1000,
    }));
  }, [feedback, timeMs]);

  return (
    <div className="grid grid-cols-12 gap-4">
      <div className="col-span-12 lg:col-span-7 rounded-xl border border-white/10 bg-black/30 p-4">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-white/40">Delay Taps</p>
            <p className="text-[12px] text-white/60">Animated tap view</p>
          </div>
          <div className="flex items-center gap-2">
            <Toggle label="Sync" value={sync} onChange={(v) => onChange(setParam(plugin, "sync", v))} />
            <Toggle label="Ping‑Pong" value={pingPong} onChange={(v) => onChange(setParam(plugin, "ping_pong", v))} />
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-white/10 bg-black/40 p-4">
          <svg viewBox="0 0 340 120" className="h-[120px] w-full">
            <rect width={340} height={120} fill="rgba(0,0,0,0.35)" />
            <line x1={10} y1={60} x2={330} y2={60} stroke="rgba(255,255,255,0.10)" />
            {taps.map((t, i) => (
              <g key={i}>
                <circle
                  cx={t.x}
                  cy={60 + (pingPong ? (i % 2 === 0 ? -16 : 16) : 0)}
                  r={6}
                  fill="rgba(244,63,94,0.85)"
                  opacity={0.25 + t.a * 0.75}
                />
                <circle
                  cx={t.x}
                  cy={60 + (pingPong ? (i % 2 === 0 ? -16 : 16) : 0)}
                  r={12}
                  fill="rgba(244,63,94,0.10)"
                  opacity={0.3}
                />
              </g>
            ))}
          </svg>
          <p className="mt-2 text-[11px] text-white/50">
            Time: {Math.round(timeMs)} ms {sync ? "(sync)" : ""} • Feedback: {Math.round(feedback)}%
          </p>
        </div>
      </div>

      <div className="col-span-12 lg:col-span-5 rounded-xl border border-white/10 bg-black/30 p-4">
        <p className="text-[10px] uppercase tracking-[0.18em] text-white/40">Controls</p>
        <div className="mt-3 grid grid-cols-2 gap-4">
          <Knob
            label={sync ? "Time (sync)" : "Time"}
            kind="air"
            value={timeMs}
            min={20}
            max={900}
            step={1}
            defaultValue={320}
            unit="ms"
            decimals={0}
            format={(v) => `${Math.round(v)} ms`}
            onChange={(v) => onChange(setParam(plugin, "time_ms", v))}
          />
          <Knob
            label="Feedback"
            kind="punch"
            value={feedback}
            min={0}
            max={95}
            step={1}
            defaultValue={35}
            decimals={0}
            format={(v) => `${Math.round(v)} %`}
            onChange={(v) => onChange(setParam(plugin, "feedback", v))}
          />
          <Knob
            label="Width"
            kind="neon"
            value={width}
            min={0}
            max={100}
            step={1}
            defaultValue={60}
            decimals={0}
            format={(v) => `${Math.round(v)} %`}
            onChange={(v) => onChange(setParam(plugin, "width", v))}
          />
        </div>

        <div className="mt-4">
          <Slider
            label="High‑Pass"
            value={hp}
            min={20}
            max={1000}
            step={1}
            defaultValue={120}
            unit="Hz"
            decimals={0}
            format={(v) => `${Math.round(v)} Hz`}
            onChange={(v) => onChange(setParam(plugin, "hp", v))}
          />
        </div>
        <div className="mt-4">
          <Slider
            label="Low‑Pass"
            value={lp}
            min={1000}
            max={20000}
            step={1}
            defaultValue={8000}
            unit="Hz"
            decimals={0}
            format={(v) => (v >= 1000 ? `${(v / 1000).toFixed(1)} kHz` : `${Math.round(v)} Hz`)}
            onChange={(v) => onChange(setParam(plugin, "lp", v))}
          />
        </div>
      </div>
    </div>
  );
}

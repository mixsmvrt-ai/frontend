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

function getStr(params: PluginParams, key: string, fallback: string) {
  const v = params[key];
  return typeof v === "string" ? v : fallback;
}

function setParam(plugin: TrackPlugin, key: string, value: number | boolean | string) {
  return { ...plugin, params: { ...plugin.params, [key]: value }, locked: false };
}

export default function Reverb({ plugin, onChange }: { plugin: TrackPlugin; onChange: (p: TrackPlugin) => void }) {
  const defaults = useMemo(() => defaultPluginParams("Reverb"), []);
  const params = useMemo(() => ({ ...defaults, ...plugin.params }), [defaults, plugin.params]);

  const size = getNum(params, "size", 55);
  const width = getNum(params, "width", 70);
  const decay = getNum(params, "decay", 1.8);
  const preDelay = getNum(params, "pre_delay", 20);
  const damping = getNum(params, "damping", 45);
  const early = getBool(params, "early_reflections", true);
  const room = getStr(params, "room", "Plate");

  const roomW = clamp(width / 100, 0.2, 1);
  const roomS = clamp(size / 100, 0.2, 1);

  return (
    <div className="grid grid-cols-12 gap-4">
      <div className="col-span-12 lg:col-span-7 rounded-xl border border-white/10 bg-black/30 p-4">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-white/40">Room</p>
            <p className="text-[12px] text-white/60">Size / Width visual</p>
          </div>
          <div className="flex items-center gap-2">
            <Toggle label="Early" value={early} onChange={(v) => onChange(setParam(plugin, "early_reflections", v))} />
            <select
              className="h-9 rounded-lg border border-white/10 bg-black/40 px-3 text-[12px] text-white/70 outline-none hover:border-red-500/40"
              value={room}
              onChange={(e) => onChange(setParam(plugin, "room", e.target.value))}
            >
              <option value="Plate">Plate</option>
              <option value="Room">Room</option>
              <option value="Hall">Hall</option>
              <option value="Chamber">Chamber</option>
            </select>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-xl border border-white/10 bg-black/40 p-4">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(125,211,252,0.10),transparent_45%),radial-gradient(circle_at_70%_10%,rgba(244,63,94,0.10),transparent_45%)]" />
          <div className="relative mx-auto flex h-48 w-full max-w-xl items-center justify-center">
            <div
              className="relative rounded-2xl border border-white/15 bg-white/5"
              style={{ width: `${Math.round(100 * roomW)}%`, height: `${Math.round(100 * roomS)}%` }}
            >
              <div className="absolute inset-0 rounded-2xl bg-[linear-gradient(135deg,rgba(255,255,255,0.08),transparent_60%)]" />
              {early && (
                <div className="absolute left-3 top-3 rounded-full bg-emerald-400/20 px-2 py-1 text-[10px] text-emerald-200">
                  Early reflections
                </div>
              )}
              <div className="absolute bottom-3 right-3 rounded-full bg-yellow-400/10 px-2 py-1 text-[10px] text-yellow-200">
                AI room: {room}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="col-span-12 lg:col-span-5 rounded-xl border border-white/10 bg-black/30 p-4">
        <p className="text-[10px] uppercase tracking-[0.18em] text-white/40">Controls</p>
        <div className="mt-3 grid grid-cols-2 gap-4">
          <Knob
            label="Size"
            kind="air"
            value={size}
            min={0}
            max={100}
            step={1}
            defaultValue={55}
            decimals={0}
            format={(v) => `${Math.round(v)} %`}
            onChange={(v) => onChange(setParam(plugin, "size", v))}
          />
          <Knob
            label="Width"
            kind="neon"
            value={width}
            min={0}
            max={100}
            step={1}
            defaultValue={70}
            decimals={0}
            format={(v) => `${Math.round(v)} %`}
            onChange={(v) => onChange(setParam(plugin, "width", v))}
          />
          <Knob
            label="Decay"
            kind="warmth"
            value={decay}
            min={0.2}
            max={8}
            step={0.01}
            defaultValue={1.8}
            unit="s"
            decimals={2}
            format={(v) => `${v.toFixed(2)} s`}
            onChange={(v) => onChange(setParam(plugin, "decay", v))}
          />
          <Knob
            label="Pre‑Delay"
            kind="punch"
            value={preDelay}
            min={0}
            max={200}
            step={1}
            defaultValue={20}
            unit="ms"
            decimals={0}
            format={(v) => `${Math.round(v)} ms`}
            onChange={(v) => onChange(setParam(plugin, "pre_delay", v))}
          />
          <Knob
            label="Damping"
            kind="neon"
            value={damping}
            min={0}
            max={100}
            step={1}
            defaultValue={45}
            decimals={0}
            format={(v) => `${Math.round(v)} %`}
            onChange={(v) => onChange(setParam(plugin, "damping", v))}
          />
        </div>
      </div>
    </div>
  );
}

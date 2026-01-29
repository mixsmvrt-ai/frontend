"use client";

import type React from "react";
import { useMemo } from "react";
import type { PluginParams, TrackPlugin } from "../pluginTypes";
import { defaultAIParams, defaultPluginParams, ensurePluginHasAIParams } from "../pluginTypes";
import Knob from "./primitives/Knob";

type PluginShellProps = {
  plugin: TrackPlugin;
  onChange: (plugin: TrackPlugin) => void;
  onClose: () => void;
  children: React.ReactNode;
};

function getNumber(params: PluginParams, key: string, fallback: number) {
  const v = Number(params[key]);
  return Number.isFinite(v) ? v : fallback;
}

function setParam(plugin: TrackPlugin, key: string, value: number | boolean | string) {
  return {
    ...plugin,
    params: {
      ...plugin.params,
      [key]: value,
    },
    locked: false,
  };
}

export default function PluginShell({ plugin, onChange, onClose, children }: PluginShellProps) {
  const withAI = useMemo(() => ensurePluginHasAIParams(plugin), [plugin]);

  const defaults = useMemo(() => defaultPluginParams(withAI.pluginType), [withAI.pluginType]);
  const aiDefaults = useMemo(() => defaultAIParams(withAI.pluginType), [withAI.pluginType]);

  const mix = getNumber(withAI.params, "mix", Number(defaults.mix ?? 1));
  const outputGain = getNumber(withAI.params, "output_gain", Number(defaults.output_gain ?? 0));

  const hasAI = withAI.aiGenerated;

  const showAIBadge = hasAI;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/75 px-4 backdrop-blur-sm">
      <div className="w-full max-w-3xl overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-zinc-950/95 to-black/95 shadow-[0_0_60px_rgba(0,0,0,0.85)]">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 border-b border-white/10 px-4 py-3">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-red-400">
              Plugin
            </p>
            <div className="mt-1 flex items-center gap-2">
              <h2 className="truncate text-sm font-semibold text-white">{withAI.name}</h2>
              {showAIBadge && (
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] ${
                    withAI.locked
                      ? "bg-yellow-400/15 text-yellow-200"
                      : "bg-red-500/10 text-red-200"
                  }`}
                  title={withAI.locked ? "AI locked (no manual edits yet)" : "Manually tweaked"}
                >
                  {withAI.locked ? "AI" : "AI*"}
                </span>
              )}
            </div>
            <p className="mt-1 text-[11px] text-white/50">{withAI.pluginType}</p>
          </div>

          <div className="flex items-center gap-2">
            {/* Preset */}
            <select
              className="h-8 rounded-lg border border-white/10 bg-black/40 px-2 text-[11px] text-white/70 outline-none hover:border-red-500/40"
              value={withAI.preset ?? "Default"}
              onChange={(e) => onChange({ ...withAI, preset: e.target.value })}
              aria-label="Preset"
            >
              <option value="Default">Default</option>
              <option value="AI Suggested">AI Suggested</option>
              <option value="Vocal Clean">Vocal Clean</option>
              <option value="Warm">Warm</option>
            </select>

            {/* Power */}
            <button
              type="button"
              onClick={() => onChange({ ...withAI, enabled: !withAI.enabled })}
              className={`inline-flex h-8 items-center justify-center rounded-lg border px-3 text-[11px] font-medium ${
                withAI.enabled
                  ? "border-emerald-400/50 bg-emerald-500/15 text-emerald-200"
                  : "border-white/15 bg-white/5 text-white/40"
              }`}
              aria-label={withAI.enabled ? "Bypass plugin" : "Enable plugin"}
            >
              {withAI.enabled ? "ON" : "OFF"}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-black/30 text-white/70 hover:border-white/20 hover:bg-white/5"
              aria-label="Close plugin"
            >
              ×
            </button>
          </div>
        </div>

        {/* Main */}
        <div className="grid grid-cols-12 gap-4 p-4">
          <div className="col-span-12 rounded-xl border border-white/10 bg-[radial-gradient(circle_at_20%_10%,rgba(244,63,94,0.10),transparent_35%),radial-gradient(circle_at_80%_10%,rgba(125,211,252,0.08),transparent_40%)] bg-black/40 p-4">
            {children}
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 px-4 py-3">
          <div className="flex items-center gap-4">
            <Knob
              label="Mix"
              kind="neon"
              value={mix}
              min={0}
              max={1}
              step={0.01}
              defaultValue={Number(aiDefaults.mix ?? defaults.mix ?? 1)}
              unit="%"
              decimals={0}
              format={(v) => `${Math.round(v * 100)} %`}
              onChange={(v) => onChange(setParam(withAI, "mix", v))}
            />
            <Knob
              label="Output"
              kind="warmth"
              value={outputGain}
              min={-12}
              max={12}
              step={0.1}
              defaultValue={Number(aiDefaults.output_gain ?? defaults.output_gain ?? 0)}
              unit="dB"
              decimals={1}
              format={(v) => `${v >= 0 ? "+" : ""}${v.toFixed(1)} dB`}
              onChange={(v) => onChange(setParam(withAI, "output_gain", v))}
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                const next: TrackPlugin = {
                  ...withAI,
                  params: { ...defaultPluginParams(withAI.pluginType) },
                  locked: false,
                  aiGenerated: withAI.aiGenerated,
                };
                // Keep global footer params consistent
                next.params.mix = mix;
                next.params.output_gain = outputGain;
                onChange(next);
              }}
              className="inline-flex h-9 items-center justify-center rounded-full border border-white/10 bg-black/40 px-4 text-[11px] text-white/70 hover:border-white/20 hover:bg-white/5"
            >
              Reset
            </button>

            <button
              type="button"
              onClick={() => {
                const baseline = (withAI.aiParams && typeof withAI.aiParams === "object")
                  ? withAI.aiParams
                  : defaultAIParams(withAI.pluginType);

                onChange({
                  ...withAI,
                  params: { ...baseline, mix, output_gain: outputGain },
                  locked: true,
                  aiGenerated: true,
                });
              }}
              className="inline-flex h-9 items-center justify-center rounded-full bg-white px-4 text-[11px] font-semibold text-black"
              title="Restore AI-suggested settings"
            >
              Revert to AI
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import type React from "react";
import { useEffect, useMemo, useState } from "react";
import type { PluginParams, TrackPlugin } from "../pluginTypes";
import * as PluginTypes from "../pluginTypes";
import Knob from "./primitives/Knob";
import { isSupabaseConfigured, supabase } from "../../../lib/supabaseClient";

type PluginShellProps = {
  plugin: TrackPlugin;
  onChange: (plugin: TrackPlugin) => void;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
  onHeaderPointerDown?: React.PointerEventHandler<HTMLDivElement>;
  onHeaderPointerMove?: React.PointerEventHandler<HTMLDivElement>;
  onHeaderPointerUp?: React.PointerEventHandler<HTMLDivElement>;
  onHeaderPointerCancel?: React.PointerEventHandler<HTMLDivElement>;
};

type UserPluginPreset = {
  id: string;
  name: string;
  plugin_type: string;
  params: PluginParams;
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

export default function PluginShell({
  plugin,
  onChange,
  onClose,
  children,
  className,
  onHeaderPointerDown,
  onHeaderPointerMove,
  onHeaderPointerUp,
  onHeaderPointerCancel,
}: PluginShellProps) {
  const [userPresets, setUserPresets] = useState<UserPluginPreset[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const withAI = useMemo(
    () => (PluginTypes as any).ensurePluginHasAIParams?.(plugin) ?? plugin,
    [plugin],
  );

  const defaults = useMemo(
    () => (PluginTypes as any).defaultPluginParams?.(withAI.pluginType) ?? { mix: 1, output_gain: 0 },
    [withAI.pluginType],
  );
  const aiDefaults = useMemo(
    () => (PluginTypes as any).defaultAIParams?.(withAI.pluginType) ?? defaults,
    [defaults, withAI.pluginType],
  );

  const mix = getNumber(withAI.params, "mix", Number(defaults.mix ?? 1));
  const outputGain = getNumber(withAI.params, "output_gain", Number(defaults.output_gain ?? 0));

  const hasAI = withAI.aiGenerated;

  const showAIBadge = hasAI;
  const presetValue = userPresets.some((p) => p.id === withAI.preset)
    ? (withAI.preset as string)
    : "Current";

  // Load any existing user presets for this plugin type.
  useEffect(() => {
    let isMounted = true;

    async function loadPresets() {
      if (!isSupabaseConfigured || !supabase) return;
      try {
        const { data: userData, error: userError } = await supabase.auth.getUser();
        if (userError || !userData?.user) return;

        const { data, error } = await supabase
          .from("user_plugin_presets")
          .select("id,name,plugin_type,params")
          .eq("plugin_type", withAI.pluginType)
          .order("created_at", { ascending: true });

        if (error || !isMounted || !Array.isArray(data)) return;
        setUserPresets(data as UserPluginPreset[]);
      } catch {
        if (!isMounted) return;
      }
    }

    void loadPresets();

    return () => {
      isMounted = false;
    };
  }, [withAI.pluginType]);

  return (
    <div
      className={`flex w-[min(760px,92vw)] max-h-[min(640px,82vh)] flex-col overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-zinc-950/95 to-black/95 shadow-[0_0_60px_rgba(0,0,0,0.75)] ${
        className ?? ""
      }`}
    >
        {/* Header */}
        <div
          className="flex cursor-move select-none items-center justify-between gap-4 border-b border-white/10 px-4 py-3"
          onPointerDown={onHeaderPointerDown}
          onPointerMove={onHeaderPointerMove}
          onPointerUp={onHeaderPointerUp}
          onPointerCancel={onHeaderPointerCancel}
        >
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
              data-no-drag
              className="h-8 rounded-lg border border-white/10 bg-black/40 px-2 text-[11px] text-white/70 outline-none hover:border-red-500/40"
              value={presetValue}
              onChange={(e) => {
                const value = e.target.value;
                if (value === "Current") {
                  // Stay on the current settings; clear any preset id.
                  onChange({ ...withAI, preset: undefined });
                  return;
                }

                const presetObj = userPresets.find((p) => p.id === value);
                if (!presetObj) return;

                const nextParams = (presetObj.params as PluginParams) ?? {};

                onChange({
                  ...withAI,
                  preset: presetObj.id,
                  params: {
                    ...nextParams,
                  },
                  aiGenerated: false,
                  locked: false,
                });
              }}
              aria-label="Preset"
            >
              <option value="Current">Current settings</option>
              {userPresets.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>

            {/* Power */}
            <button
              type="button"
              onClick={() => onChange({ ...withAI, enabled: !withAI.enabled })}
              data-no-drag
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
              data-no-drag
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-black/30 text-white/70 hover:border-white/20 hover:bg-white/5"
              aria-label="Close plugin"
            >
              ×
            </button>
          </div>
        </div>

        {/* Main */}
        <div className="flex-1 overflow-auto">
          <div className="grid grid-cols-12 gap-4 p-4">
          <div className="col-span-12 rounded-xl border border-white/10 bg-[radial-gradient(circle_at_20%_10%,rgba(244,63,94,0.10),transparent_35%),radial-gradient(circle_at_80%_10%,rgba(125,211,252,0.08),transparent_40%)] bg-black/40 p-4">
            {children}
          </div>
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
                  params: {
                    ...((PluginTypes as any).defaultPluginParams?.(withAI.pluginType) ?? {
                      mix: 1,
                      output_gain: 0,
                    }),
                  },
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
              data-no-drag
              disabled={isSaving}
              onClick={async () => {
                if (!isSupabaseConfigured || !supabase) return;

                try {
                  setIsSaving(true);
                  const { data: userData, error: userError } = await supabase.auth.getUser();
                  if (userError || !userData?.user) {
                    // eslint-disable-next-line no-alert
                    window.alert("You need to be logged in to save presets.");
                    setIsSaving(false);
                    return;
                  }

                  const name = window.prompt("Save preset as", withAI.name || "New preset");
                  if (!name || !name.trim()) {
                    setIsSaving(false);
                    return;
                  }

                  const payload = {
                    user_id: userData.user.id,
                    plugin_type: withAI.pluginType,
                    name: name.trim(),
                    params: withAI.params ?? {},
                  };

                  const { data, error } = await supabase
                    .from("user_plugin_presets")
                    .insert(payload)
                    .select("id,name,plugin_type,params")
                    .single();

                  if (!error && data) {
                    const preset = data as UserPluginPreset;
                    setUserPresets((prev) => [...prev, preset]);
                    onChange({ ...withAI, preset: preset.id });
                  }
                } catch {
                  // Swallow errors; preset saving is non-critical.
                } finally {
                  setIsSaving(false);
                }
              }}
              className="inline-flex h-9 items-center justify-center rounded-full border border-white/10 bg-black/40 px-4 text-[11px] text-white/70 hover:border-white/20 hover:bg-white/5 disabled:opacity-60"
            >
              {isSaving ? "Saving…" : "Save preset"}
            </button>

            <button
              type="button"
              onClick={() => {
                const baseline = (withAI.aiParams && typeof withAI.aiParams === "object")
                  ? withAI.aiParams
                  : ((PluginTypes as any).defaultAIParams?.(withAI.pluginType) ??
                      ((PluginTypes as any).defaultPluginParams?.(withAI.pluginType) ?? { mix: 1, output_gain: 0 }));

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
  );
}

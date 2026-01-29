"use client";

import { useState } from "react";
import MacroKnob from "./MacroKnob";
import type { TrackPlugin } from "./pluginTypes";

type PluginModalProps = {
  plugin: TrackPlugin;
  onChange: (plugin: TrackPlugin) => void;
  onClose: () => void;
};

export default function PluginModal({ plugin, onChange, onClose }: PluginModalProps) {
  const [local, setLocal] = useState<TrackPlugin>(plugin);

  const commit = (next: TrackPlugin) => {
    setLocal(next);
    onChange(next);
  };

  const handleParamChange = (key: string, value: number) => {
    commit({
      ...local,
      params: {
        ...local.params,
        [key]: value,
      },
      locked: false,
    });
  };

  const renderControls = () => {
    if (local.pluginType === "EQ") {
      const bands = [
        { key: "low", label: "Low" },
        { key: "low_mid", label: "Low-Mid" },
        { key: "high_mid", label: "High-Mid" },
        { key: "high", label: "High" },
      ];
      return (
        <div className="grid grid-cols-2 gap-4">
          {bands.map((band) => (
            <div key={band.key} className="flex flex-col items-center gap-2">
              <span className="text-[11px] text-white/60">{band.label}</span>
              <MacroKnob
                label="Gain (dB)"
                kind="air"
                value={(() => {
                  const raw = Number(local.params[`${band.key}_gain`] ?? 0);
                  const min = -12;
                  const max = 12;
                  const norm = ((raw - min) / (max - min)) * 100;
                  return Number.isFinite(norm) ? Math.min(100, Math.max(0, norm)) : 50;
                })()}
                onChange={(next) => {
                  const min = -12;
                  const max = 12;
                  const clamped = Math.min(100, Math.max(0, next));
                  const raw = min + (clamped / 100) * (max - min);
                  handleParamChange(`${band.key}_gain`, raw);
                }}
              />
            </div>
          ))}
        </div>
      );
    }

    if (local.pluginType === "Compressor") {
      return (
        <div className="grid grid-cols-2 gap-4">
          <MacroKnob
            label="Threshold"
            kind="punch"
            value={(() => {
              const raw = Number(local.params.threshold ?? -12);
              const min = -48;
              const max = 0;
              const norm = ((raw - min) / (max - min)) * 100;
              return Number.isFinite(norm) ? Math.min(100, Math.max(0, norm)) : 50;
            })()}
            onChange={(next) => {
              const min = -48;
              const max = 0;
              const clamped = Math.min(100, Math.max(0, next));
              const raw = min + (clamped / 100) * (max - min);
              handleParamChange("threshold", raw);
            }}
          />
          <MacroKnob
            label="Ratio"
            kind="punch"
            value={(() => {
              const raw = Number(local.params.ratio ?? 2);
              const min = 1;
              const max = 10;
              const norm = ((raw - min) / (max - min)) * 100;
              return Number.isFinite(norm) ? Math.min(100, Math.max(0, norm)) : 20;
            })()}
            onChange={(next) => {
              const min = 1;
              const max = 10;
              const clamped = Math.min(100, Math.max(0, next));
              const raw = min + (clamped / 100) * (max - min);
              handleParamChange("ratio", raw);
            }}
          />
          <MacroKnob
            label="Attack (ms)"
            kind="punch"
            value={(() => {
              const raw = Number(local.params.attack ?? 10);
              const min = 0.1;
              const max = 50;
              const norm = ((raw - min) / (max - min)) * 100;
              return Number.isFinite(norm) ? Math.min(100, Math.max(0, norm)) : 20;
            })()}
            onChange={(next) => {
              const min = 0.1;
              const max = 50;
              const clamped = Math.min(100, Math.max(0, next));
              const raw = min + (clamped / 100) * (max - min);
              handleParamChange("attack", raw);
            }}
          />
          <MacroKnob
            label="Release (ms)"
            kind="warmth"
            value={(() => {
              const raw = Number(local.params.release ?? 80);
              const min = 10;
              const max = 500;
              const norm = ((raw - min) / (max - min)) * 100;
              return Number.isFinite(norm) ? Math.min(100, Math.max(0, norm)) : 30;
            })()}
            onChange={(next) => {
              const min = 10;
              const max = 500;
              const clamped = Math.min(100, Math.max(0, next));
              const raw = min + (clamped / 100) * (max - min);
              handleParamChange("release", raw);
            }}
          />
        </div>
      );
    }

    return (
      <p className="text-[12px] text-white/60">
        This plugin type does not yet expose detailed controls. You can still
        bypass it or reorder it in the rack.
      </p>
    );
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border border-white/15 bg-[#050509]/95 p-4 shadow-[0_0_40px_rgba(0,0,0,0.85)]">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-red-400">
              Plugin
            </p>
            <h2 className="mt-1 text-sm font-semibold text-white">{local.name}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-white/15 text-xs text-white/80 hover:bg-white/5"
            aria-label="Close plugin editor"
          >
            ×
          </button>
        </div>

        <div className="mb-4 flex items-center justify-between gap-3 text-[11px] text-white/60">
          <span>{local.pluginType}</span>
          {local.aiGenerated && (
            <span className="rounded-full bg-yellow-400/10 px-2 py-0.5 text-[10px] text-yellow-200">
              AI suggested chain
            </span>
          )}
        </div>

        <div className="mb-4 rounded-xl border border-white/10 bg-black/40 p-3">
          {renderControls()}
        </div>

        <div className="flex items-center justify-between gap-3 text-[11px] text-white/60">
          <div className="flex items-center gap-2">
            <span>Bypass</span>
            <button
              type="button"
              onClick={() => commit({ ...local, enabled: !local.enabled })}
              className={`inline-flex h-6 w-10 items-center justify-center rounded-full border text-[10px] ${
                local.enabled
                  ? "border-emerald-400/60 bg-emerald-500/20 text-emerald-200"
                  : "border-white/20 bg-black/40 text-white/40"
              }`}
            >
              {local.enabled ? "ON" : "OFF"}
            </button>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-7 items-center justify-center rounded-full bg-white px-4 text-[11px] font-medium text-black"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

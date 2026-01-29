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
  const [editing, setEditing] = useState<{ key: string; value: string } | null>(null);

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

  const applyNumericEdit = (key: string, rawValue: number, min: number, max: number) => {
    if (!Number.isFinite(rawValue)) return;
    const clamped = Math.min(max, Math.max(min, rawValue));
    handleParamChange(key, clamped);
  };

  const renderControls = () => {
    if (local.pluginType === "EQ") {
      const bands = [
        { key: "low", label: "Low" },
        { key: "low_mid", label: "Low-Mid" },
        { key: "high_mid", label: "High-Mid" },
        { key: "high", label: "High" },
      ];
      const min = -12;
      const max = 12;

      return (
        <div className="grid grid-cols-2 gap-4">
          {bands.map((band) => {
            const paramKey = `${band.key}_gain`;
            const raw = Number(local.params[paramKey] ?? 0);
            const norm = ((raw - min) / (max - min)) * 100;
            const clampedNorm = Number.isFinite(norm) ? Math.min(100, Math.max(0, norm)) : 50;
            const display = `${raw >= 0 ? "+" : ""}${raw.toFixed(1)} dB`;
            const isEditing = editing?.key === paramKey;

            return (
              <div key={band.key} className="flex flex-col items-center gap-2">
                <span className="text-[11px] text-white/60">{band.label}</span>
                <MacroKnob
                  label="Gain (dB)"
                  kind="air"
                  value={clampedNorm}
                  onChange={(next) => {
                    const clamped = Math.min(100, Math.max(0, next));
                    const nextRaw = min + (clamped / 100) * (max - min);
                    handleParamChange(paramKey, nextRaw);
                  }}
                />
                <div className="mt-1 text-[11px] text-white/70">
                  {isEditing ? (
                    <input
                      autoFocus
                      type="number"
                      className="w-20 rounded bg-white/5 px-1 py-0.5 text-center text-[11px] text-white outline-none ring-1 ring-white/20 focus:ring-red-500/70"
                      value={editing.value}
                      onChange={(e) =>
                        setEditing({ key: paramKey, value: e.target.value })
                      }
                      onBlur={() => {
                        const numeric = parseFloat(editing.value);
                        applyNumericEdit(paramKey, numeric, min, max);
                        setEditing(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          const numeric = parseFloat(editing.value);
                          applyNumericEdit(paramKey, numeric, min, max);
                          setEditing(null);
                        }
                        if (e.key === "Escape") {
                          setEditing(null);
                        }
                      }}
                    />
                  ) : (
                    <button
                      type="button"
                      className="rounded bg-white/5 px-1.5 py-0.5 text-[11px] text-white/80 hover:bg-white/10"
                      onClick={() =>
                        setEditing({ key: paramKey, value: raw.toFixed(1) })
                      }
                    >
                      {display}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      );
    }

    if (local.pluginType === "Compressor") {
      const thresholdMin = -48;
      const thresholdMax = 0;
      const thresholdRaw = Number(local.params.threshold ?? -12);
      const thresholdNorm =
        ((thresholdRaw - thresholdMin) / (thresholdMax - thresholdMin)) * 100;
      const thresholdClamped = Number.isFinite(thresholdNorm)
        ? Math.min(100, Math.max(0, thresholdNorm))
        : 50;

      const ratioMin = 1;
      const ratioMax = 10;
      const ratioRaw = Number(local.params.ratio ?? 2);
      const ratioNorm = ((ratioRaw - ratioMin) / (ratioMax - ratioMin)) * 100;
      const ratioClamped = Number.isFinite(ratioNorm)
        ? Math.min(100, Math.max(0, ratioNorm))
        : 20;

      const attackMin = 0.1;
      const attackMax = 50;
      const attackRaw = Number(local.params.attack ?? 10);
      const attackNorm = ((attackRaw - attackMin) / (attackMax - attackMin)) * 100;
      const attackClamped = Number.isFinite(attackNorm)
        ? Math.min(100, Math.max(0, attackNorm))
        : 20;

      const releaseMin = 10;
      const releaseMax = 500;
      const releaseRaw = Number(local.params.release ?? 80);
      const releaseNorm =
        ((releaseRaw - releaseMin) / (releaseMax - releaseMin)) * 100;
      const releaseClamped = Number.isFinite(releaseNorm)
        ? Math.min(100, Math.max(0, releaseNorm))
        : 30;

      const thresholdDisplay = `${thresholdRaw.toFixed(1)} dB`;
      const ratioDisplay = `${ratioRaw.toFixed(2)}:1`;
      const attackDisplay = `${attackRaw.toFixed(1)} ms`;
      const releaseDisplay = `${releaseRaw.toFixed(0)} ms`;

      const isThresholdEditing = editing?.key === "threshold";
      const isRatioEditing = editing?.key === "ratio";
      const isAttackEditing = editing?.key === "attack";
      const isReleaseEditing = editing?.key === "release";

      return (
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col items-center gap-2">
            <MacroKnob
              label="Threshold"
              kind="punch"
              value={thresholdClamped}
              onChange={(next) => {
                const clamped = Math.min(100, Math.max(0, next));
                const raw =
                  thresholdMin + (clamped / 100) * (thresholdMax - thresholdMin);
                handleParamChange("threshold", raw);
              }}
            />
            <div className="mt-1 text-[11px] text-white/70">
              {isThresholdEditing ? (
                <input
                  autoFocus
                  type="number"
                  className="w-24 rounded bg-white/5 px-1 py-0.5 text-center text-[11px] text-white outline-none ring-1 ring-white/20 focus:ring-red-500/70"
                  value={editing.value}
                  onChange={(e) =>
                    setEditing({ key: "threshold", value: e.target.value })
                  }
                  onBlur={() => {
                    const numeric = parseFloat(editing.value);
                    applyNumericEdit("threshold", numeric, thresholdMin, thresholdMax);
                    setEditing(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      const numeric = parseFloat(editing.value);
                      applyNumericEdit(
                        "threshold",
                        numeric,
                        thresholdMin,
                        thresholdMax,
                      );
                      setEditing(null);
                    }
                    if (e.key === "Escape") {
                      setEditing(null);
                    }
                  }}
                />
              ) : (
                <button
                  type="button"
                  className="rounded bg-white/5 px-1.5 py-0.5 text-[11px] text-white/80 hover:bg-white/10"
                  onClick={() =>
                    setEditing({ key: "threshold", value: thresholdRaw.toFixed(1) })
                  }
                >
                  {thresholdDisplay}
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-col items-center gap-2">
            <MacroKnob
              label="Ratio"
              kind="punch"
              value={ratioClamped}
              onChange={(next) => {
                const clamped = Math.min(100, Math.max(0, next));
                const raw = ratioMin + (clamped / 100) * (ratioMax - ratioMin);
                handleParamChange("ratio", raw);
              }}
            />
            <div className="mt-1 text-[11px] text-white/70">
              {isRatioEditing ? (
                <input
                  autoFocus
                  type="number"
                  className="w-24 rounded bg-white/5 px-1 py-0.5 text-center text-[11px] text-white outline-none ring-1 ring-white/20 focus:ring-red-500/70"
                  value={editing.value}
                  onChange={(e) =>
                    setEditing({ key: "ratio", value: e.target.value })
                  }
                  onBlur={() => {
                    const numeric = parseFloat(editing.value);
                    applyNumericEdit("ratio", numeric, ratioMin, ratioMax);
                    setEditing(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      const numeric = parseFloat(editing.value);
                      applyNumericEdit("ratio", numeric, ratioMin, ratioMax);
                      setEditing(null);
                    }
                    if (e.key === "Escape") {
                      setEditing(null);
                    }
                  }}
                />
              ) : (
                <button
                  type="button"
                  className="rounded bg-white/5 px-1.5 py-0.5 text-[11px] text-white/80 hover:bg-white/10"
                  onClick={() =>
                    setEditing({ key: "ratio", value: ratioRaw.toFixed(2) })
                  }
                >
                  {ratioDisplay}
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-col items-center gap-2">
            <MacroKnob
              label="Attack (ms)"
              kind="punch"
              value={attackClamped}
              onChange={(next) => {
                const clamped = Math.min(100, Math.max(0, next));
                const raw = attackMin + (clamped / 100) * (attackMax - attackMin);
                handleParamChange("attack", raw);
              }}
            />
            <div className="mt-1 text-[11px] text-white/70">
              {isAttackEditing ? (
                <input
                  autoFocus
                  type="number"
                  className="w-24 rounded bg-white/5 px-1 py-0.5 text-center text-[11px] text-white outline-none ring-1 ring-white/20 focus:ring-red-500/70"
                  value={editing.value}
                  onChange={(e) =>
                    setEditing({ key: "attack", value: e.target.value })
                  }
                  onBlur={() => {
                    const numeric = parseFloat(editing.value);
                    applyNumericEdit("attack", numeric, attackMin, attackMax);
                    setEditing(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      const numeric = parseFloat(editing.value);
                      applyNumericEdit("attack", numeric, attackMin, attackMax);
                      setEditing(null);
                    }
                    if (e.key === "Escape") {
                      setEditing(null);
                    }
                  }}
                />
              ) : (
                <button
                  type="button"
                  className="rounded bg-white/5 px-1.5 py-0.5 text-[11px] text-white/80 hover:bg-white/10"
                  onClick={() =>
                    setEditing({ key: "attack", value: attackRaw.toFixed(1) })
                  }
                >
                  {attackDisplay}
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-col items-center gap-2">
            <MacroKnob
              label="Release (ms)"
              kind="warmth"
              value={releaseClamped}
              onChange={(next) => {
                const clamped = Math.min(100, Math.max(0, next));
                const raw =
                  releaseMin + (clamped / 100) * (releaseMax - releaseMin);
                handleParamChange("release", raw);
              }}
            />
            <div className="mt-1 text-[11px] text-white/70">
              {isReleaseEditing ? (
                <input
                  autoFocus
                  type="number"
                  className="w-24 rounded bg-white/5 px-1 py-0.5 text-center text-[11px] text-white outline-none ring-1 ring-white/20 focus:ring-red-500/70"
                  value={editing.value}
                  onChange={(e) =>
                    setEditing({ key: "release", value: e.target.value })
                  }
                  onBlur={() => {
                    const numeric = parseFloat(editing.value);
                    applyNumericEdit("release", numeric, releaseMin, releaseMax);
                    setEditing(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      const numeric = parseFloat(editing.value);
                      applyNumericEdit("release", numeric, releaseMin, releaseMax);
                      setEditing(null);
                    }
                    if (e.key === "Escape") {
                      setEditing(null);
                    }
                  }}
                />
              ) : (
                <button
                  type="button"
                  className="rounded bg-white/5 px-1.5 py-0.5 text-[11px] text-white/80 hover:bg-white/10"
                  onClick={() =>
                    setEditing({ key: "release", value: releaseRaw.toFixed(0) })
                  }
                >
                  {releaseDisplay}
                </button>
              )}
            </div>
          </div>
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

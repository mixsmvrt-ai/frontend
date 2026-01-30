"use client";

import { useState } from "react";
import type { StudioTool } from "./tools/studioTools";

type ToolButton = {
  id: StudioTool;
  label: string;
  shortcut: string;
};

const TOOLS: ToolButton[] = [
  { id: "select", label: "Select", shortcut: "V" },
  { id: "slice", label: "Slice", shortcut: "S" },
  { id: "trim", label: "Trim", shortcut: "T" },
  { id: "fade", label: "Fade", shortcut: "F" },
  { id: "gain", label: "Gain", shortcut: "G" },
  { id: "pan", label: "Pan", shortcut: "P" },
  { id: "automation", label: "Auto", shortcut: "A" },
  { id: "stretch", label: "Stretch", shortcut: "R" },
];

export default function StudioToolsDropdown({
  activeTool,
  onChangeTool,
  selectedRegionSummary,
  onChangeSelectedRegion,
}: {
  activeTool: StudioTool;
  onChangeTool: (tool: StudioTool) => void;
  selectedRegionSummary?: {
    trackName: string;
    regionLabel: string;
    gainDb: number;
    pan: number;
    fadeInSec: number;
    fadeOutSec: number;
    stretchRate: number;
    automationPoints: number;
  } | null;
  onChangeSelectedRegion?: (patch: {
    gainDb?: number;
    pan?: number;
    fadeInSec?: number;
    fadeOutSec?: number;
    stretchRate?: number;
    automation?: { t: number; v: number }[];
  }) => void;
}) {
  const [open, setOpen] = useState(false);

  const activeMeta = TOOLS.find((t) => t.id === activeTool) ?? TOOLS[0];

  return (
    <div className="border-b border-white/10 bg-black/90">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-3 py-2 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-white/60">Tool</span>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11px] text-white/80 hover:border-white/40"
          >
            <span className="font-medium text-white">{activeMeta.label}</span>
            <span className="rounded border border-white/20 px-1.5 py-0.5 text-[10px] text-white/70">
              {activeMeta.shortcut}
            </span>
            <span className="text-[9px] text-white/40" aria-hidden="true">
              ▾
            </span>
          </button>
        </div>

        {selectedRegionSummary && onChangeSelectedRegion && (
          <div className="hidden sm:flex items-center gap-3 text-[11px] text-white/60">
            <div className="truncate">
              <span className="text-white/40">Selection:</span>{" "}
              <span className="text-white/80">{selectedRegionSummary.trackName}</span>
              <span className="text-white/40"> · </span>
              <span className="text-white/70">{selectedRegionSummary.regionLabel}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-white/50">Gain {selectedRegionSummary.gainDb.toFixed(1)} dB</span>
              <span className="text-white/50">Pan {selectedRegionSummary.pan.toFixed(2)}</span>
              <span className="text-white/50">Fade {selectedRegionSummary.fadeInSec.toFixed(2)}s / {selectedRegionSummary.fadeOutSec.toFixed(2)}s</span>
              <span className="text-white/50">Stretch {selectedRegionSummary.stretchRate.toFixed(2)}x</span>
              <span className="text-white/50">Auto {selectedRegionSummary.automationPoints}</span>
            </div>
          </div>
        )}
      </div>

      {open && (
        <div className="border-t border-white/10 bg-zinc-950/95">
          <div className="mx-auto flex max-w-6xl flex-col gap-3 px-3 py-3 text-[11px]">
            <div className="grid gap-2 sm:grid-cols-4">
              {TOOLS.map((t) => {
                const isActive = activeTool === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      onChangeTool(t.id);
                      setOpen(false);
                    }}
                    className={
                      "flex items-center justify-between rounded-md border px-2 py-2 text-left " +
                      (isActive
                        ? "border-white/40 bg-white/10 text-white shadow-[0_0_18px_rgba(255,255,255,0.10)]"
                        : "border-white/10 bg-black/30 text-white/70 hover:border-white/30 hover:bg-white/5 hover:text-white")
                    }
                  >
                    <span>{t.label}</span>
                    <span
                      className={
                        "rounded border px-1.5 py-0.5 text-[10px] " +
                        (isActive
                          ? "border-white/30 text-white/70"
                          : "border-white/10 text-white/40")
                      }
                    >
                      {t.shortcut}
                    </span>
                  </button>
                );
              })}
            </div>

            {selectedRegionSummary && onChangeSelectedRegion && (
              <div className="grid gap-3 rounded-lg border border-white/10 bg-black/40 p-3">
                <div className="text-[11px] font-medium text-white/70">
                  Selection controls
                </div>

                <label className="grid gap-1">
                  <div className="flex items-center justify-between text-[11px] text-white/60">
                    <span>Clip Gain</span>
                    <span className="tabular-nums text-white/50">
                      {selectedRegionSummary.gainDb.toFixed(1)} dB
                    </span>
                  </div>
                  <input
                    type="range"
                    min={-24}
                    max={12}
                    step={0.1}
                    value={selectedRegionSummary.gainDb}
                    onChange={(e) => onChangeSelectedRegion({ gainDb: Number(e.target.value) })}
                  />
                </label>

                <label className="grid gap-1">
                  <div className="flex items-center justify-between text-[11px] text-white/60">
                    <span>Clip Pan</span>
                    <span className="tabular-nums text-white/50">
                      {selectedRegionSummary.pan.toFixed(2)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={-1}
                    max={1}
                    step={0.01}
                    value={selectedRegionSummary.pan}
                    onChange={(e) => onChangeSelectedRegion({ pan: Number(e.target.value) })}
                  />
                </label>

                <div className="grid grid-cols-2 gap-2">
                  <label className="grid gap-1">
                    <div className="flex items-center justify-between text-[11px] text-white/60">
                      <span>Fade In</span>
                      <span className="tabular-nums text-white/50">
                        {selectedRegionSummary.fadeInSec.toFixed(2)}s
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={2}
                      step={0.01}
                      value={selectedRegionSummary.fadeInSec}
                      onChange={(e) =>
                        onChangeSelectedRegion({ fadeInSec: Number(e.target.value) })
                      }
                    />
                  </label>

                  <label className="grid gap-1">
                    <div className="flex items-center justify-between text-[11px] text-white/60">
                      <span>Fade Out</span>
                      <span className="tabular-nums text-white/50">
                        {selectedRegionSummary.fadeOutSec.toFixed(2)}s
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={2}
                      step={0.01}
                      value={selectedRegionSummary.fadeOutSec}
                      onChange={(e) =>
                        onChangeSelectedRegion({ fadeOutSec: Number(e.target.value) })
                      }
                    />
                  </label>
                </div>

                <label className="grid gap-1">
                  <div className="flex items-center justify-between text-[11px] text-white/60">
                    <span>Time Stretch</span>
                    <span className="tabular-nums text-white/50">
                      {selectedRegionSummary.stretchRate.toFixed(2)}x
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0.5}
                    max={2}
                    step={0.01}
                    value={selectedRegionSummary.stretchRate}
                    onChange={(e) =>
                      onChangeSelectedRegion({ stretchRate: Number(e.target.value) })
                    }
                  />
                </label>

                <div className="flex items-center justify-between">
                  <div className="text-[11px] text-white/60">
                    Automation points: {selectedRegionSummary.automationPoints}
                  </div>
                  <button
                    type="button"
                    onClick={() => onChangeSelectedRegion({ automation: [] })}
                    className="rounded-md border border-white/10 bg-black/40 px-2 py-1 text-[11px] text-white/70 hover:border-white/25 hover:text-white"
                  >
                    Clear
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

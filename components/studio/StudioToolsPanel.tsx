"use client";

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

export default function StudioToolsPanel({
  collapsed,
  onToggleCollapsed,
  activeTool,
  onChangeTool,
  selectedRegionSummary,
  onChangeSelectedRegion,
}: {
  collapsed: boolean;
  onToggleCollapsed: () => void;
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
  return (
    <div className="relative flex flex-col border-r border-white/10 bg-zinc-950/90">
      <div className="flex items-center justify-between gap-2 border-b border-white/10 px-2 py-2">
        <div className="text-[11px] font-medium text-white/70">
          {collapsed ? "Tools" : "Studio Tools"}
        </div>
        <button
          type="button"
          onClick={onToggleCollapsed}
          className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-white/10 bg-black/40 text-white/70 hover:border-white/30 hover:text-white"
          aria-label={collapsed ? "Expand tools" : "Collapse tools"}
          title={collapsed ? "Expand" : "Collapse"}
        >
          {collapsed ? ">" : "<"}
        </button>
      </div>

      <div className={collapsed ? "w-14 p-2" : "w-52 p-2"}>
        <div className="grid gap-2">
          {TOOLS.map((t) => {
            const isActive = activeTool === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => onChangeTool(t.id)}
                className={
                  "group flex items-center justify-between rounded-md border px-2 py-2 text-left text-[12px] transition " +
                  (isActive
                    ? "border-white/40 bg-white/10 text-white shadow-[0_0_18px_rgba(255,255,255,0.10)]"
                    : "border-white/10 bg-black/30 text-white/70 hover:border-white/30 hover:bg-white/5 hover:text-white")
                }
                title={`${t.label} (${t.shortcut})`}
              >
                <span className={collapsed ? "sr-only" : ""}>{t.label}</span>
                <span
                  className={
                    "rounded border px-1.5 py-0.5 text-[10px] " +
                    (isActive
                      ? "border-white/30 text-white/70"
                      : "border-white/10 text-white/40 group-hover:border-white/20")
                  }
                >
                  {t.shortcut}
                </span>
              </button>
            );
          })}
        </div>

        {!collapsed && selectedRegionSummary && onChangeSelectedRegion && (
          <div className="mt-4 rounded-lg border border-white/10 bg-black/30 p-3">
            <div className="text-[11px] font-medium text-white/70">Selection</div>
            <div className="mt-1 text-[11px] text-white/50">
              {selectedRegionSummary.trackName}  {selectedRegionSummary.regionLabel}
            </div>

            <div className="mt-3 grid gap-3">
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
                    onChange={(e) => onChangeSelectedRegion({ fadeInSec: Number(e.target.value) })}
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
                    onChange={(e) => onChangeSelectedRegion({ fadeOutSec: Number(e.target.value) })}
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
          </div>
        )}
      </div>

      {/* Mobile quick bar */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-white/10 bg-zinc-950/95 backdrop-blur">
        <div className="flex items-center justify-between gap-1 px-2 py-2">
          {TOOLS.slice(0, 6).map((t) => {
            const isActive = activeTool === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => onChangeTool(t.id)}
                className={
                  "flex-1 rounded-md border px-2 py-2 text-[11px] " +
                  (isActive
                    ? "border-white/40 bg-white/10 text-white"
                    : "border-white/10 bg-black/30 text-white/70")
                }
              >
                {t.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

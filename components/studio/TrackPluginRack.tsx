"use client";

import { useState } from "react";
import type { TrackPlugin, PluginType } from "./pluginTypes";
import { defaultAIParams, defaultPluginName, defaultPluginParams } from "./pluginTypes";

type TrackPluginRackProps = {
  plugins: TrackPlugin[];
  onChange: (plugins: TrackPlugin[]) => void;
  onOpen: (plugin: TrackPlugin) => void;
  hidePlugins?: boolean;
};

const MAX_SLOTS = 10;

const AVAILABLE_PLUGIN_TYPES: PluginType[] = [
  "EQ",
  "Compressor",
  "De-esser",
  "Pitch Correction",
  "Saturation",
  "Reverb",
  "Delay",
  "Limiter",
  "Mastering EQ",
  "Master Bus Compressor",
  "Stereo Imager",
];

export default function TrackPluginRack({ plugins, onChange, onOpen, hidePlugins }: TrackPluginRackProps) {
  const [showPicker, setShowPicker] = useState(false);
  const sorted = [...plugins].sort((a, b) => a.order - b.order).slice(0, MAX_SLOTS);

  const handleRemove = (pluginId: string) => {
    const remaining = sorted.filter((plugin) => plugin.id !== pluginId);
    const reindexed = remaining.map((plugin, index) => ({ ...plugin, order: index }));
    onChange(reindexed);
  };

  const handleAdd = (type: PluginType) => {
    const nextOrder = sorted.length;
    if (nextOrder >= MAX_SLOTS) return;
    const id = crypto.randomUUID();
    const plugin: TrackPlugin = {
      id,
      pluginId: id,
      pluginType: type,
      name: defaultPluginName(type),
      order: nextOrder,
      params: defaultPluginParams(type),
      aiParams: defaultAIParams(type),
      preset: "AI Suggested",
      enabled: true,
      aiGenerated: false,
      locked: false,
    };
    onChange([...sorted, plugin]);
  };

  return (
    <div className="flex w-full items-start gap-2">
      <div className="flex w-full flex-col">
        <div className="grid w-full grid-cols-5 gap-1">
          {Array.from({ length: MAX_SLOTS }).map((_, index) => {
            const plugin = sorted.find((p) => p.order === index);
            if (!plugin) {
              return (
                <button
                  key={index}
                  type="button"
                  className="h-6 rounded border border-dashed border-white/15 text-[10px] text-white/30 hover:border-white/40 hover:text-white/70"
                  onClick={(event) => {
                    event.stopPropagation();
                    if (!AVAILABLE_PLUGIN_TYPES.length || hidePlugins) return;
                    setShowPicker((open) => !open);
                  }}
                >
                  +
                </button>
              );
            }

            return (
              <button
                key={plugin.id}
                type="button"
                onClick={() => onOpen(plugin)}
                className="group flex h-6 items-center justify-between rounded border border-white/15 bg-zinc-950/80 px-1.5 text-[10px] text-white/80 hover:border-red-500/70"
              >
                <span className="truncate text-[10px] font-medium">{plugin.name}</span>
                <div className="flex items-center gap-1">
                  {plugin.aiGenerated && (
                    <span
                      className="text-[9px] text-yellow-300"
                      title={plugin.locked ? "AI locked" : "AI suggested"}
                    >
                      {plugin.locked ? "🔒" : "☆"}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      handleRemove(plugin.id);
                    }}
                    className="h-4 w-4 rounded text-[11px] text-white/40 hover:bg-red-600/80 hover:text-white"
                    aria-label="Remove plugin"
                  >
                    ×
                  </button>
                </div>
              </button>
            );
          })}
        </div>

        {!hidePlugins && showPicker && (
          <div className="mt-1 grid grid-cols-2 gap-1 text-[10px] text-white/70">
            {AVAILABLE_PLUGIN_TYPES.map((type) => (
              <button
                key={type}
                type="button"
                className="rounded border border-white/15 bg-zinc-900/80 px-1.5 py-0.5 text-left hover:border-red-500/70 hover:text-white"
                onClick={() => {
                  handleAdd(type);
                  setShowPicker(false);
                }}
              >
                + {type}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

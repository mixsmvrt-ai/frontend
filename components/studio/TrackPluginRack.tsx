"use client";

import type { TrackPlugin, PluginType } from "./pluginTypes";

type TrackPluginRackProps = {
  plugins: TrackPlugin[];
  onChange: (plugins: TrackPlugin[]) => void;
  onOpen: (plugin: TrackPlugin) => void;
  hidePlugins?: boolean;
};

const MAX_SLOTS = 8;

const AVAILABLE_PLUGIN_TYPES: PluginType[] = [
  "EQ",
  "Compressor",
  "De-esser",
  "Saturation",
  "Reverb",
  "Delay",
  "Limiter",
];

export default function TrackPluginRack({ plugins, onChange, onOpen, hidePlugins }: TrackPluginRackProps) {
  const sorted = [...plugins].sort((a, b) => a.order - b.order).slice(0, MAX_SLOTS);

  const handleToggleBypass = (pluginId: string) => {
    const next = sorted.map((plugin) =>
      plugin.id === pluginId ? { ...plugin, enabled: !plugin.enabled } : plugin,
    );
    onChange(next);
  };

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
      name: type,
      order: nextOrder,
      params: {},
      enabled: true,
      aiGenerated: false,
      locked: false,
    };
    onChange([...sorted, plugin]);
  };

  return (
    <div className="flex items-start gap-2">
      <div className="grid grid-cols-4 gap-1">
        {Array.from({ length: MAX_SLOTS }).map((_, index) => {
          const plugin = sorted.find((p) => p.order === index);
          if (!plugin) {
            return (
              <button
                key={index}
                type="button"
                className="h-6 rounded border border-dashed border-white/15 text-[10px] text-white/30 hover:border-white/40 hover:text-white/70"
                onClick={() => {
                  if (!AVAILABLE_PLUGIN_TYPES.length) return;
                  handleAdd(AVAILABLE_PLUGIN_TYPES[0]);
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
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    handleToggleBypass(plugin.id);
                  }}
                  className="flex h-4 w-4 items-center justify-center rounded-full border border-white/25 bg-black/60"
                  aria-label={plugin.enabled ? "Bypass plugin" : "Enable plugin"}
                >
                  <span
                    className={`h-2 w-2 rounded-full ${
                      plugin.enabled ? "bg-emerald-400" : "bg-white/30"
                    }`}
                  />
                </button>
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

      {!hidePlugins && (
        <div className="flex flex-col gap-1 text-[10px] text-white/70">
          {AVAILABLE_PLUGIN_TYPES.map((type) => (
            <button
              key={type}
              type="button"
              className="rounded border border-white/15 bg-zinc-900/80 px-1.5 py-0.5 text-left hover:border-red-500/70 hover:text-white"
              onClick={() => handleAdd(type)}
            >
              + {type}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

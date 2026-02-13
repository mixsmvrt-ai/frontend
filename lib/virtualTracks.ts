"use client";

import type { PluginParams, TrackPlugin } from "../components/studio/pluginTypes";
import { defaultPluginParams, type PluginType } from "../components/studio/pluginTypes";

/**
 * Shape coming back from the DSP backend in result.virtual_tracks.
 * Mirrors what _build_virtual_tracks() returns in the Python engine.
 */
export type BackendVirtualTrack = {
  id: string;
  name: string;
  type: "bus" | "fx_bus" | "mix_bus";
  role?: string;
  fx_type?: "reverb" | "delay";
  source_tracks?: string[];
  output_to?: string;
  plugins?: {
    plugin: string; // e.g. "engine::algorithmic_reverb"
    params: Record<string, unknown>;
  }[];
  receives_from?: {
    source: string;
    send_type: "post-fader" | "pre-fader" | string;
    send_level?: number;
  }[];
};

/**
 * Local mixer model for DAW-style virtual tracks.
 */
export type VirtualMixerTrack = {
  id: string;
  name: string;
  kind: "bus" | "fx_bus" | "mix_bus";
  role?: string;
  outputTo?: string;
  sourceTracks: string[];
  sends: {
    sourceTrackId: string;
    targetTrackId: string;
    level: number;
    type: "post-fader" | "pre-fader";
  }[];
  plugins: TrackPlugin[];
};

function inferPluginType(vt: BackendVirtualTrack, backendPluginId: string): PluginType {
  const id = backendPluginId.toLowerCase();

  if (vt.fx_type === "reverb" || id.includes("reverb")) return "Reverb";
  if (vt.fx_type === "delay" || id.includes("delay")) return "Delay";

  if (id.includes("multiband") || id.includes("bus_comp")) {
    return "Master Bus Compressor";
  }
  if (id.includes("limiter")) return "Limiter";
  if (id.includes("eq")) return "EQ";
  if (id.includes("saturation")) return "Saturation";
  if (id.includes("stereo") || id.includes("width")) return "Stereo Imager";

  // Fallback – safe, UI will still render a generic plugin.
  return "EQ";
}

/**
 * Map backend virtual_tracks into VirtualMixerTrack[] with stable IDs,
 * ready to be rendered by the Studio UI.
 */
export function mapVirtualTracksFromBackend(
  virtualTracksRaw: BackendVirtualTrack[] | null | undefined,
): VirtualMixerTrack[] {
  if (!virtualTracksRaw || virtualTracksRaw.length === 0) return [];

  const mixerTracks: VirtualMixerTrack[] = [];

  virtualTracksRaw.forEach((vt) => {
    const plugins: TrackPlugin[] =
      vt.plugins?.map((p, index) => {
        const pluginType = inferPluginType(vt, p.plugin);

        // Merge backend params into the default shape, but clamp the
        // value types into PluginParams (number | string | boolean | number[]).
        const backendParams = p.params ?? {};
        const safeBackendParams: PluginParams = Object.fromEntries(
          Object.entries(backendParams).map(([key, value]) => {
            if (
              typeof value === "number" ||
              typeof value === "string" ||
              typeof value === "boolean" ||
              Array.isArray(value)
            ) {
              return [key, value];
            }
            // Drop unsupported types to keep the UI safe.
            return [key, undefined];
          }),
        ) as PluginParams;

        const params: PluginParams = {
          ...defaultPluginParams(pluginType),
          ...safeBackendParams,
        };

        const plugin: TrackPlugin = {
          id: `${vt.id}::${index}`,
          pluginId: p.plugin,
          trackId: vt.id,
          pluginType,
          name: vt.name.includes("Bus") ? vt.name : pluginType,
          order: index,
          params,
          aiParams: undefined,
          preset: undefined,
          enabled: true,
          aiGenerated: false,
          locked: true,
        };

        return plugin;
      }) ?? [];

    const sends =
      vt.receives_from?.map((r) => ({
        sourceTrackId: r.source,
        targetTrackId: vt.id,
        level: typeof r.send_level === "number" ? r.send_level : 1,
        type: r.send_type === "pre-fader" ? ("pre-fader" as const) : ("post-fader" as const),
      })) ?? [];

    mixerTracks.push({
      id: vt.id,
      name: vt.name,
      kind: vt.type,
      role: vt.role,
      outputTo: vt.output_to,
      sourceTracks: vt.source_tracks ?? [],
      sends,
      plugins,
    });
  });

  return mixerTracks;
}

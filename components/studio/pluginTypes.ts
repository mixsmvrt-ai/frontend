"use client";

export type PluginType =
  | "EQ"
  | "Compressor"
  | "De-esser"
  | "Saturation"
  | "Reverb"
  | "Delay"
  | "Limiter"
  | "Mastering EQ"
  | "Master Bus Compressor"
  | "Stereo Imager";

export type PluginCategory = "EQ" | "Dynamics" | "FX" | "Utility";

export type PluginParams = Record<string, number | string | boolean | number[]>;

export interface TrackPlugin {
  id: string;
  pluginId: string;
  trackId?: string;
  pluginType: PluginType;
  name: string;
  order: number;
  params: PluginParams;
  // Optional AI baseline parameters for revert/compare UX.
  aiParams?: PluginParams;
  preset?: string;
  enabled: boolean;
  aiGenerated: boolean;
  locked: boolean;
}

export const PLUGIN_TYPE_TO_CATEGORY: Record<PluginType, PluginCategory> = {
  EQ: "EQ",
  Compressor: "Dynamics",
  "De-esser": "Dynamics",
  Saturation: "FX",
  Reverb: "FX",
  Delay: "FX",
  Limiter: "Dynamics",
  "Mastering EQ": "EQ",
  "Master Bus Compressor": "Dynamics",
  "Stereo Imager": "Utility",
};

export function isPluginType(value: unknown): value is PluginType {
  return (
    value === "EQ" ||
    value === "Compressor" ||
    value === "De-esser" ||
    value === "Saturation" ||
    value === "Reverb" ||
    value === "Delay" ||
    value === "Limiter" ||
    value === "Mastering EQ" ||
    value === "Master Bus Compressor" ||
    value === "Stereo Imager"
  );
}

export function defaultPluginName(type: PluginType): string {
  switch (type) {
    case "EQ":
      return "Channel EQ";
    case "Compressor":
      return "Channel Comp";
    case "De-esser":
      return "De-Esser";
    case "Saturation":
      return "Saturation";
    case "Reverb":
      return "Reverb";
    case "Delay":
      return "Delay";
    case "Limiter":
      return "Limiter";
    case "Mastering EQ":
      return "Mastering EQ";
    case "Master Bus Compressor":
      return "Master Bus Comp";
    case "Stereo Imager":
      return "Stereo Imager";
    default:
      return "Plugin";
  }
}

export function defaultPluginParams(type: PluginType): PluginParams {
  switch (type) {
    case "EQ":
      return {
        low_freq: 120,
        low_gain: 0,
        low_q: 0.8,
        low_type: "Shelf",

        low_mid_freq: 350,
        low_mid_gain: 0,
        low_mid_q: 1.0,
        low_mid_type: "Bell",

        mid_freq: 1000,
        mid_gain: 0,
        mid_q: 1.0,
        mid_type: "Bell",

        high_mid_freq: 3500,
        high_mid_gain: 0,
        high_mid_q: 1.0,
        high_mid_type: "Bell",

        high_freq: 10000,
        high_gain: 0,
        high_q: 0.8,
        high_type: "Shelf",

        mix: 1,
        output_gain: 0,
      };

    case "Compressor":
      return {
        threshold: -18,
        ratio: 3,
        attack: 10,
        release: 120,
        knee: 6,
        sidechain: false,
        auto: false,
        mix: 1,
        output_gain: 0,
      };

    case "De-esser":
      return {
        freq: 6500,
        width: 0.8,
        threshold: -24,
        amount: 40, // percent
        mix: 1,
        output_gain: 0,
      };

    case "Saturation":
      return {
        drive: 25, // percent
        tone: 0, // -1..1
        mode: "Tape",
        mix: 1,
        output_gain: 0,
      };

    case "Reverb":
      return {
        size: 55, // percent
        width: 70, // percent
        decay: 1.8, // sec
        pre_delay: 20, // ms
        damping: 45, // percent
        early_reflections: true,
        room: "Plate",
        mix: 0.22,
        output_gain: 0,
      };

    case "Delay":
      return {
        time_ms: 320,
        sync: false,
        feedback: 35, // percent
        width: 60, // percent
        hp: 120, // Hz
        lp: 8000, // Hz
        ping_pong: false,
        mix: 0.18,
        output_gain: 0,
      };

    case "Limiter":
      return {
        threshold: -6,
        ceiling: -1,
        release: 120,
        target_lufs: -14,
        mix: 1,
        output_gain: 0,
      };

    case "Mastering EQ":
      return {
        tilt: 0, // dB across spectrum
        low_shelf_gain: 0,
        high_shelf_gain: 0,
        linear_phase: true,
        mix: 1,
        output_gain: 0,
      };

    case "Master Bus Compressor":
      return {
        threshold: -12,
        ratio: 2,
        attack: 30,
        release: 200,
        auto_release: true,
        mix: 0.75,
        output_gain: 0,
      };

    case "Stereo Imager":
      return {
        low_width: 0.9,
        mid_width: 1.0,
        high_width: 1.15,
        mono_check: false,
        mix: 1,
        output_gain: 0,
      };

    default:
      return { mix: 1, output_gain: 0 };
  }
}

export function defaultAIParams(type: PluginType): PluginParams {
  // For now, seed AI params as defaults; backend/AI can overwrite later.
  return defaultPluginParams(type);
}

export function ensurePluginHasAIParams(plugin: TrackPlugin): TrackPlugin {
  if (plugin.aiParams && typeof plugin.aiParams === "object") return plugin;
  return {
    ...plugin,
    aiParams: defaultAIParams(plugin.pluginType),
  };
}

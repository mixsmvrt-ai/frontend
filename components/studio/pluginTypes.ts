"use client";

export type PluginType =
  | "EQ"
  | "Compressor"
  | "De-esser"
  | "Saturation"
  | "Reverb"
  | "Delay"
  | "Limiter";

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
};

export function isPluginType(value: unknown): value is PluginType {
  return (
    value === "EQ" ||
    value === "Compressor" ||
    value === "De-esser" ||
    value === "Saturation" ||
    value === "Reverb" ||
    value === "Delay" ||
    value === "Limiter"
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
    default:
      return "Plugin";
  }
}

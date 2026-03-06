import type { TrackPlugin, PluginType, PluginParams } from "../components/studio/pluginTypes";
import {
  defaultPluginName,
  defaultPluginParams,
} from "../components/studio/pluginTypes";

export type AnalyzePluginSpec = {
  plugin: string;
  params: Record<string, unknown>;
};

const PLUGIN_MAP: Record<string, PluginType> = {
  eq: "EQ",
  deesser: "De-esser",
  de_esser: "De-esser",
  compressor: "Compressor",
  saturation: "Saturation",
  reverb: "Reverb",
  delay: "Delay",
  limiter: "Limiter",
  stereo_width: "Stereo Imager",
  stereo: "Stereo Imager",
};

function toPluginType(raw: string): PluginType | null {
  const normalized = raw.trim().toLowerCase();
  return PLUGIN_MAP[normalized] ?? null;
}

function asNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function mapParamsToUiDefaults(type: PluginType, source: Record<string, unknown>): PluginParams {
  const base = { ...defaultPluginParams(type) } as Record<string, unknown>;

  switch (type) {
    case "EQ":
      return {
        ...base,
        low_freq: asNumber(source.highpass, asNumber(base.low_freq, 120)),
        low_gain: asNumber(source.low_cut_db, asNumber(base.low_gain, 0)),
        mid_freq: asNumber(source.presence_freq, asNumber(base.mid_freq, 1000)),
        mid_gain: asNumber(source.presence_boost_db, asNumber(base.mid_gain, 0)),
      };
    case "De-esser":
      return {
        ...base,
        freq: asNumber(source.frequency, asNumber(base.freq, 6500)),
        amount: Math.max(0, Math.min(100, asNumber(source.reduction, 4) * 12.5)),
      };
    case "Compressor":
      return {
        ...base,
        threshold: asNumber(source.threshold, asNumber(base.threshold, -18)),
        ratio: asNumber(source.ratio, asNumber(base.ratio, 3)),
        attack: asNumber(source.attack, asNumber(base.attack, 10)),
        release: asNumber(source.release, asNumber(base.release, 120)),
      };
    case "Saturation":
      return {
        ...base,
        drive: Math.max(0, Math.min(100, asNumber(source.drive, 0.18) * 100)),
      };
    case "Stereo Imager":
      return {
        ...base,
        low_width: asNumber(source.width, asNumber(base.low_width, 1)),
        mid_width: asNumber(source.width, asNumber(base.mid_width, 1)),
        high_width: asNumber(source.width, asNumber(base.high_width, 1.1)),
      };
    case "Reverb":
      return {
        ...base,
        size: Math.max(0, Math.min(100, asNumber(source.size, asNumber(base.size, 55)))),
        decay: asNumber(source.decay, asNumber(base.decay, 1.8)),
        mix: asNumber(source.mix, asNumber(base.mix, 0.22)),
      };
    case "Delay":
      return {
        ...base,
        time_ms: asNumber(source.time_ms, asNumber(base.time_ms, 320)),
        feedback: asNumber(source.feedback, asNumber(base.feedback, 35)),
        mix: asNumber(source.mix, asNumber(base.mix, 0.18)),
      };
    case "Limiter":
      return {
        ...base,
        threshold: asNumber(source.threshold, asNumber(base.threshold, -6)),
      };
    default:
      return defaultPluginParams(type);
  }
}

export function buildTrackPluginsFromAnalysis(
  trackId: string,
  chain: AnalyzePluginSpec[],
): TrackPlugin[] {
  const plugins: TrackPlugin[] = [];

  chain.forEach((item, index) => {
    const pluginType = toPluginType(item.plugin);
    if (!pluginType) return;

    const id = crypto.randomUUID();
    const mappedParams = mapParamsToUiDefaults(pluginType, item.params ?? {});

    plugins.push({
      id,
      pluginId: id,
      trackId,
      pluginType,
      name: `AI ${defaultPluginName(pluginType)}`,
      order: index,
      params: mappedParams,
      aiParams: { ...mappedParams },
      enabled: true,
      aiGenerated: true,
      locked: false,
    });
  });

  return plugins;
}

export function mergeAiPluginsWithUserPlugins(
  existing: TrackPlugin[] | undefined,
  aiPlugins: TrackPlugin[],
  trackId: string,
): TrackPlugin[] {
  const userPlugins = (Array.isArray(existing) ? existing : []).filter((plugin) => !plugin.aiGenerated);

  const normalizedUser = userPlugins.map((plugin, index) => ({
    ...plugin,
    trackId,
    order: index,
  }));

  const normalizedAi = aiPlugins.map((plugin, index) => ({
    ...plugin,
    trackId,
    order: normalizedUser.length + index,
  }));

  return [...normalizedUser, ...normalizedAi];
}

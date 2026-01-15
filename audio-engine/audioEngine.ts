import type {
  ABResult,
  ChainDefinition,
  ChainStage,
  EngineAudioBuffer,
  PresetDefinition,
  TrackAnalysis,
  RecommendedPreset,
  GenrePrediction,
} from "./types";
import {
  cloneBuffer,
  estimateVocalPresence,
  measurePeak,
  measureRms,
} from "./types";
import { processEq } from "./processors/eq";
import { processCompressor } from "./processors/compressor";
import { processDeesser } from "./processors/deesser";
import { processSaturation } from "./processors/saturation";
import { processStereo } from "./processors/stereo";
import { processLimiter } from "./processors/limiter";
import { processLoudness } from "./processors/loudness";
import { vocalPresets } from "./presets/vocalPresets";
import { mixBusPresets } from "./presets/mixBusPresets";
import { masterPresets } from "./presets/masterPresets";

export const allPresets: PresetDefinition[] = [
  ...vocalPresets,
  ...mixBusPresets,
  ...masterPresets,
];

export function runChain(
  buffer: EngineAudioBuffer,
  sampleRate: number,
  chain: ChainDefinition,
): ABResult {
  const original = cloneBuffer(buffer);
  let current = cloneBuffer(buffer);

  const stagesResults = chain.stages.map((stage: ChainStage) => {
    if (stage.bypass) {
      return {
        buffer: current,
        metadata: {
          processorId: stage.id,
          preRms: measureRms(current),
          postRms: measureRms(current),
          prePeak: measurePeak(current),
          postPeak: measurePeak(current),
          bypassed: true,
        },
      } as any; // metadata shape is looser when bypassed
    }

    switch (stage.id) {
      case "eq": {
        const res = processEq(current, sampleRate, stage.params as any);
        current = res.buffer;
        return res;
      }
      case "compressor": {
        const res = processCompressor(current, sampleRate, stage.params as any);
        current = res.buffer;
        return res;
      }
      case "deesser": {
        const res = processDeesser(current, sampleRate, stage.params as any);
        current = res.buffer;
        return res;
      }
      case "saturation": {
        const res = processSaturation(current, sampleRate, stage.params as any);
        current = res.buffer;
        return res;
      }
      case "stereo": {
        const res = processStereo(current, sampleRate, stage.params as any);
        current = res.buffer;
        return res;
      }
      case "limiter": {
        const res = processLimiter(current, sampleRate, stage.params as any);
        current = res.buffer;
        return res;
      }
      case "loudness": {
        const res = processLoudness(current, sampleRate, stage.params as any);
        current = res.buffer;
        return res;
      }
      default:
        return {
          buffer: current,
          metadata: {
            processorId: stage.id,
            preRms: measureRms(current),
            postRms: measureRms(current),
            prePeak: measurePeak(current),
            postPeak: measurePeak(current),
            bypassed: false,
          },
        } as any;
    }
  });

  return {
    original,
    processed: current,
    presetId: "", // set by runPreset helper
    chainId: chain.id,
    stages: stagesResults,
  };
}

export function runPreset(
  buffer: EngineAudioBuffer,
  sampleRate: number,
  preset: PresetDefinition,
): ABResult {
  const result = runChain(buffer, sampleRate, preset.chain);
  return {
    ...result,
    presetId: preset.id,
  };
}

export function analyzeTrack(buffer: EngineAudioBuffer): TrackAnalysis {
  const rmsDb = measureRms(buffer);
  const peakDb = measurePeak(buffer);
  const dynamicRangeDb = peakDb - rmsDb;
  const vocalPresenceScore = estimateVocalPresence(buffer);

  return {
    rmsDb,
    peakDb,
    dynamicRangeDb,
    vocalPresenceScore,
  };
}

export function recommendPresets(
  role: "vocal" | "beat" | "mix-bus" | "master",
  analysis: TrackAnalysis,
): RecommendedPreset[] {
  const candidates = allPresets.filter((p) => p.role === role);

  return candidates
    .map((preset) => {
      let confidence = 0.5;

      if (role === "vocal") {
        if (analysis.vocalPresenceScore < 0.4) confidence += 0.2;
        if (analysis.dynamicRangeDb < 8) confidence += 0.1;
      }

      if (role === "master") {
        if (analysis.rmsDb < -18) confidence += 0.2; // likely too quiet
        if (analysis.dynamicRangeDb > 12) confidence += 0.1; // very dynamic
      }

      if (role === "mix-bus") {
        if (analysis.dynamicRangeDb < 6) confidence -= 0.1; // already squashed
        else confidence += 0.1;
      }

      confidence = Math.min(1, Math.max(0, confidence));

      return {
        presetId: preset.id,
        confidence,
      };
    })
    .sort((a, b) => b.confidence - a.confidence);
}

// --------------------
// Genre detection (placeholder)
// --------------------

// Real genre detection would use an ML model (e.g. Torch or ONNX) on the
// backend. For now we expose a tiny heuristic placeholder that callers can
// replace with a server-provided prediction.

export function detectGenreHeuristic(buffer: EngineAudioBuffer): GenrePrediction {
  const rmsDb = measureRms(buffer);
  const peakDb = measurePeak(buffer);
  const dynamicRangeDb = peakDb - rmsDb;
  const vocalPresenceScore = estimateVocalPresence(buffer);

  // Extremely rough guesses based on level and vocal presence.
  if (vocalPresenceScore > 0.6 && rmsDb > -14) {
    return { genre: "dancehall", confidence: 0.55 };
  }
  if (dynamicRangeDb < 6 && rmsDb > -10) {
    return { genre: "trap", confidence: 0.5 };
  }
  if (vocalPresenceScore > 0.5 && rmsDb < -16) {
    return { genre: "rnb", confidence: 0.5 };
  }

  return { genre: "unknown", confidence: 0.3 };
}

// Given a (possibly backend-provided) GenrePrediction and role, pick the
// top preset for that genre. This keeps the auto-selection logic in one place.
export function autoSelectPresetForGenre(
  role: "vocal" | "beat" | "mix-bus" | "master",
  genre: GenrePrediction,
  analysis: TrackAnalysis,
): RecommendedPreset | null {
  const recommendations = recommendPresets(role, analysis);
  if (!recommendations.length) return null;

  // In a future iteration we could maintain a mapping from (genre, role)
  // to specific preset IDs. For now we simply trust the top recommendation.
  return recommendations[0];
}

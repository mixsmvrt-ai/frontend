// Core audio engine types and utilities for MixSmvrt
// No UI code – this module is designed to be shared between
// browser, Node, or WASM-backed DSP backends.

export type ProcessorId =
  | "eq"
  | "compressor"
  | "deesser"
  | "saturation"
  | "stereo"
  | "limiter"
  | "loudness";

export type ChainRole = "vocal" | "beat" | "adlib" | "mix-bus" | "master";

export interface EngineAudioBuffer {
  sampleRate: number;
  // Interleaved is intentionally not used here – channels are split out
  // so the same structure can be backed by Web Audio, WASM, or native.
  channels: Float32Array[];
}

export interface EqBand {
  // High-pass, shelving, or peaking filters
  type: "highpass" | "lowshelf" | "peak" | "highshelf";
  frequency: number; // Hz
  q?: number; // Quality factor / bandwidth
  gainDb: number; // Gain for shelf/peak bands (dB). For high-pass, this is ignored.
}

export interface EqParams {
  bands: EqBand[];
}

export interface CompressorParams {
  thresholdDb: number; // dBFS
  ratio: number; // e.g. 2 = 2:1
  attackMs: number;
  releaseMs: number;
  makeupGainDb?: number;
}

export interface DeesserParams {
  centerFrequency: number; // Hz, typical 6000–9000
  bandwidth: number; // Hz
  thresholdDb: number;
  ratio: number;
}

export interface SaturationParams {
  driveDb: number; // How hard to drive into the curve
  blend: number; // 0 = dry, 1 = fully saturated
}

export interface StereoParams {
  width: number; // 0 = mono, 1 = unchanged, >1 = wider
  pan: number; // -1 left, 0 center, +1 right
}

export interface LimiterParams {
  ceilingDb: number; // Typically -1 dBFS
  releaseMs: number;
}

export interface LoudnessParams {
  targetLufs: number; // e.g. -14, -9
  ceilingDb: number; // usually matches limiter ceiling
}

export type ProcessorParams =
  | ({ id: "eq" } & EqParams)
  | ({ id: "compressor" } & CompressorParams)
  | ({ id: "deesser" } & DeesserParams)
  | ({ id: "saturation" } & SaturationParams)
  | ({ id: "stereo" } & StereoParams)
  | ({ id: "limiter" } & LimiterParams)
  | ({ id: "loudness" } & LoudnessParams);

export interface ProcessMetadataBase {
  processorId: ProcessorId;
  preRms: number;
  postRms: number;
  prePeak: number;
  postPeak: number;
}

export interface ProcessResult<TMeta extends object = object> {
  buffer: EngineAudioBuffer;
  metadata: ProcessMetadataBase & TMeta;
}

export interface ChainStage {
  id: ProcessorId;
  params: ProcessorParams;
  bypass?: boolean;
}

export interface ChainDefinition {
  id: string;
  name: string;
  role: ChainRole;
  stages: ChainStage[];
  description: string;
}

export interface PresetDefinition {
  id: string;
  name: string;
  role: ChainRole;
  chain: ChainDefinition;
  notes?: string;
}

// A/B support – callers can store both original and processed buffers
export interface ABResult {
  original: EngineAudioBuffer;
  processed: EngineAudioBuffer;
  presetId: string;
  chainId: string;
  stages: ProcessResult[];
}

// Analysis types used by the mock "AI" layer
export interface TrackAnalysis {
  rmsDb: number;
  peakDb: number;
  dynamicRangeDb: number;
  // Heuristic estimate of midrange presence (~vocal band importance)
  vocalPresenceScore: number; // 0–1
}

export interface RecommendedPreset {
  presetId: string;
  confidence: number; // 0–1
}

// Simple genre tags used for auto-preset selection. This is intentionally
// small and can be expanded later or backed by a model.
export type GenreTag =
  | "dancehall"
  | "afrobeats"
  | "trap"
  | "rnb"
  | "reggae"
  | "amapiano"
  | "pop"
  | "unknown";

export interface GenrePrediction {
  genre: GenreTag;
  confidence: number; // 0–1
}

// --------------------
// Utility functions
// --------------------

export function cloneBuffer(buffer: EngineAudioBuffer): EngineAudioBuffer {
  return {
    sampleRate: buffer.sampleRate,
    channels: buffer.channels.map((channel) => new Float32Array(channel)),
  };
}

export function applyGainDb(buffer: EngineAudioBuffer, gainDb: number): EngineAudioBuffer {
  const linear = dbToLinear(gainDb);
  for (const channel of buffer.channels) {
    for (let i = 0; i < channel.length; i += 1) {
      channel[i] *= linear;
    }
  }
  return buffer;
}

export function dbToLinear(db: number): number {
  return 10 ** (db / 20);
}

export function linearToDb(linear: number): number {
  if (linear <= 1e-12) return -120;
  return 20 * Math.log10(linear);
}

export function measureRms(buffer: EngineAudioBuffer): number {
  let sumSquares = 0;
  let count = 0;
  for (const channel of buffer.channels) {
    for (let i = 0; i < channel.length; i += 1) {
      const v = channel[i];
      sumSquares += v * v;
      count += 1;
    }
  }
  const rms = Math.sqrt(sumSquares / Math.max(1, count));
  return linearToDb(rms);
}

export function measurePeak(buffer: EngineAudioBuffer): number {
  let peak = 0;
  for (const channel of buffer.channels) {
    for (let i = 0; i < channel.length; i += 1) {
      const v = Math.abs(channel[i]);
      if (v > peak) peak = v;
    }
  }
  return linearToDb(peak);
}

// Very lightweight heuristic for "vocal presence" based on short-term level
// fluctuations – in real systems you would use band-limited RMS around 1–4 kHz.
export function estimateVocalPresence(buffer: EngineAudioBuffer): number {
  if (!buffer.channels.length) return 0;
  const channel = buffer.channels[0];
  if (channel.length < 2) return 0;

  let accum = 0;
  let count = 0;
  for (let i = 1; i < channel.length; i += 4) {
    const diff = Math.abs(channel[i] - channel[i - 1]);
    accum += diff;
    count += 1;
  }
  const avgDiff = accum / Math.max(1, count);
  // Map typical 0–0.1 region into 0–1
  return Math.min(1, avgDiff * 20);
}

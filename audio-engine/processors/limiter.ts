import type { EngineAudioBuffer, LimiterParams, ProcessResult } from "../types";
import { applyGainDb, cloneBuffer, measurePeak, measureRms } from "../types";

interface LimiterMetadata {
  ceilingDb: number;
  releaseMs: number;
  appliedGainDb: number;
}

// Simple peak-normalizing limiter mock.
export function processLimiter(
  audioBuffer: EngineAudioBuffer,
  sampleRate: number,
  params: LimiterParams,
): ProcessResult<LimiterMetadata> {
  void sampleRate;

  const preRms = measureRms(audioBuffer);
  const prePeak = measurePeak(audioBuffer);

  const neededGainDb = params.ceilingDb - prePeak;
  const appliedGainDb = Math.min(0, neededGainDb); // only attenuate

  const processed = applyGainDb(cloneBuffer(audioBuffer), appliedGainDb);
  const postRms = measureRms(processed);
  const postPeak = measurePeak(processed);

  return {
    buffer: processed,
    metadata: {
      processorId: "limiter",
      preRms,
      postRms,
      prePeak,
      postPeak,
      ceilingDb: params.ceilingDb,
      releaseMs: params.releaseMs,
      appliedGainDb,
    },
  };
}

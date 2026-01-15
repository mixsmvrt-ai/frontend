import type { EngineAudioBuffer, LoudnessParams, ProcessResult } from "../types";
import { applyGainDb, measurePeak, measureRms } from "../types";

interface LoudnessMetadata {
  targetLufs: number;
  ceilingDb: number;
  appliedGainDb: number;
}

// LUFS normalization mock based on wideband RMS.
export function processLoudness(
  audioBuffer: EngineAudioBuffer,
  sampleRate: number,
  params: LoudnessParams,
): ProcessResult<LoudnessMetadata> {
  void sampleRate;

  const preRms = measureRms(audioBuffer);
  const prePeak = measurePeak(audioBuffer);

  // Bring RMS towards target, but respect the ceiling with a simple safety margin.
  const gainToTarget = params.targetLufs - preRms;
  const peakAfterGain = prePeak + gainToTarget;
  const safetyMarginDb = params.ceilingDb - 1; // 1 dB headroom under ceiling
  const limitedGain = peakAfterGain > safetyMarginDb ? safetyMarginDb - prePeak : gainToTarget;

  const processed = applyGainDb(audioBuffer, limitedGain);
  const postRms = measureRms(processed);
  const postPeak = measurePeak(processed);

  return {
    buffer: processed,
    metadata: {
      processorId: "loudness",
      preRms,
      postRms,
      prePeak,
      postPeak,
      targetLufs: params.targetLufs,
      ceilingDb: params.ceilingDb,
      appliedGainDb: limitedGain,
    },
  };
}

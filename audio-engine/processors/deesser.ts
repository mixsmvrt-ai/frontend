import type { DeesserParams, EngineAudioBuffer, ProcessResult } from "../types";
import { applyGainDb, cloneBuffer, measurePeak, measureRms } from "../types";

interface DeesserMetadata {
  centerFrequency: number;
  bandwidth: number;
  thresholdDb: number;
  ratio: number;
  estimatedReductionDb: number;
}

// Very lightweight de-esser mock.
// A real implementation would operate on a band-limited signal; here we
// approximate by applying a small broadband gain reduction when the input
// level is above the threshold.
export function processDeesser(
  audioBuffer: EngineAudioBuffer,
  sampleRate: number,
  params: DeesserParams,
): ProcessResult<DeesserMetadata> {
  void sampleRate;

  const preRms = measureRms(audioBuffer);
  const prePeak = measurePeak(audioBuffer);

  const overDb = prePeak - params.thresholdDb;
  const active = overDb > 0 ? overDb : 0;
  const estimatedReductionDb = (active / params.ratio) * 0.5; // partial broadband reduction

  const processed = applyGainDb(cloneBuffer(audioBuffer), -estimatedReductionDb);
  const postRms = measureRms(processed);
  const postPeak = measurePeak(processed);

  return {
    buffer: processed,
    metadata: {
      processorId: "deesser",
      preRms,
      postRms,
      prePeak,
      postPeak,
      centerFrequency: params.centerFrequency,
      bandwidth: params.bandwidth,
      thresholdDb: params.thresholdDb,
      ratio: params.ratio,
      estimatedReductionDb,
    },
  };
}

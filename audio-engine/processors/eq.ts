import type { EngineAudioBuffer, EqParams, ProcessResult } from "../types";
import { applyGainDb, cloneBuffer, measurePeak, measureRms } from "../types";

interface EqMetadata {
  bands: EqParams["bands"];
  overallGainDb: number;
}

// This is a simplified, time-domain-only EQ mock.
// It does not perform true IIR/IFFT filtering but instead applies an
// approximate overall gain derived from the band configuration and
// returns detailed metadata for inspection.
export function processEq(
  audioBuffer: EngineAudioBuffer,
  sampleRate: number,
  params: EqParams,
): ProcessResult<EqMetadata> {
  void sampleRate; // reserved for a real implementation

  const preRms = measureRms(audioBuffer);
  const prePeak = measurePeak(audioBuffer);

  // Approximate the impact of bands by averaging positive and negative gains.
  let cutSum = 0;
  let boostSum = 0;
  for (const band of params.bands) {
    if (band.type === "highpass") continue;
    if (band.gainDb >= 0) boostSum += band.gainDb;
    else cutSum += band.gainDb;
  }

  const overallGainDb = (boostSum + cutSum * 0.5) / Math.max(1, params.bands.length);

  const processed = applyGainDb(cloneBuffer(audioBuffer), overallGainDb);
  const postRms = measureRms(processed);
  const postPeak = measurePeak(processed);

  return {
    buffer: processed,
    metadata: {
      processorId: "eq",
      preRms,
      postRms,
      prePeak,
      postPeak,
      bands: params.bands,
      overallGainDb,
    },
  };
}

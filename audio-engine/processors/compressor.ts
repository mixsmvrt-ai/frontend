import type { CompressorParams, EngineAudioBuffer, ProcessResult } from "../types";
import { applyGainDb, cloneBuffer, linearToDb, measurePeak, measureRms } from "../types";

interface CompressorMetadata {
  thresholdDb: number;
  ratio: number;
  attackMs: number;
  releaseMs: number;
  gainReductionDb: number;
}

// Simple RMS-based bus compressor mock.
export function processCompressor(
  audioBuffer: EngineAudioBuffer,
  sampleRate: number,
  params: CompressorParams,
): ProcessResult<CompressorMetadata> {
  void sampleRate; // reserved for envelope-based processing later

  const preRms = measureRms(audioBuffer);
  const prePeak = measurePeak(audioBuffer);

  // Compute amount above threshold and apply ratio.
  const overDb = preRms - params.thresholdDb;
  const needsCompression = overDb > 0 ? overDb : 0;
  const gainReductionDb = needsCompression - needsCompression / params.ratio;

  const makeup = params.makeupGainDb ?? 0;
  const totalGainDb = makeup - gainReductionDb;

  const processed = applyGainDb(cloneBuffer(audioBuffer), totalGainDb);
  const postRms = measureRms(processed);
  const postPeak = measurePeak(processed);

  return {
    buffer: processed,
    metadata: {
      processorId: "compressor",
      preRms,
      postRms,
      prePeak,
      postPeak,
      thresholdDb: params.thresholdDb,
      ratio: params.ratio,
      attackMs: params.attackMs,
      releaseMs: params.releaseMs,
      gainReductionDb,
    },
  };
}

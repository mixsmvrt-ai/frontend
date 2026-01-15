import type { EngineAudioBuffer, ProcessResult, SaturationParams } from "../types";
import { cloneBuffer, measurePeak, measureRms } from "../types";

interface SaturationMetadata {
  driveDb: number;
  blend: number;
}

// Simple tanh-based saturation mock with dry/wet blend.
export function processSaturation(
  audioBuffer: EngineAudioBuffer,
  sampleRate: number,
  params: SaturationParams,
): ProcessResult<SaturationMetadata> {
  void sampleRate;

  const preRms = measureRms(audioBuffer);
  const prePeak = measurePeak(audioBuffer);

  const processed = cloneBuffer(audioBuffer);
  const driveLinear = 10 ** (params.driveDb / 20);

  for (const channel of processed.channels) {
    for (let i = 0; i < channel.length; i += 1) {
      const dry = channel[i];
      const driven = Math.tanh(dry * driveLinear);
      channel[i] = dry * (1 - params.blend) + driven * params.blend;
    }
  }

  const postRms = measureRms(processed);
  const postPeak = measurePeak(processed);

  return {
    buffer: processed,
    metadata: {
      processorId: "saturation",
      preRms,
      postRms,
      prePeak,
      postPeak,
      driveDb: params.driveDb,
      blend: params.blend,
    },
  };
}

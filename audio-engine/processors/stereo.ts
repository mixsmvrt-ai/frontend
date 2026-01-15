import type { EngineAudioBuffer, ProcessResult, StereoParams } from "../types";
import { cloneBuffer, measurePeak, measureRms } from "../types";

interface StereoMetadata {
  width: number;
  pan: number;
}

// Mid/Side style stereo width and pan adjustment.
export function processStereo(
  audioBuffer: EngineAudioBuffer,
  sampleRate: number,
  params: StereoParams,
): ProcessResult<StereoMetadata> {
  void sampleRate;

  const preRms = measureRms(audioBuffer);
  const prePeak = measurePeak(audioBuffer);

  const processed = cloneBuffer(audioBuffer);

  if (processed.channels.length === 1) {
    // Promote mono to pseudo-stereo for processing.
    processed.channels = [
      new Float32Array(processed.channels[0]),
      new Float32Array(processed.channels[0]),
    ];
  }

  const left = processed.channels[0];
  const right = processed.channels[1];

  const width = params.width;
  const pan = params.pan;

  for (let i = 0; i < left.length; i += 1) {
    const L = left[i];
    const R = right[i];
    const mid = (L + R) * 0.5;
    let side = (L - R) * 0.5 * width;

    // Apply simple pan to mid/side
    const panLeft = Math.cos(((pan + 1) * Math.PI) / 4);
    const panRight = Math.sin(((pan + 1) * Math.PI) / 4);

    const newL = (mid + side) * panLeft;
    const newR = (mid - side) * panRight;

    left[i] = newL;
    right[i] = newR;
  }

  const postRms = measureRms(processed);
  const postPeak = measurePeak(processed);

  return {
    buffer: processed,
    metadata: {
      processorId: "stereo",
      preRms,
      postRms,
      prePeak,
      postPeak,
      width,
      pan,
    },
  };
}

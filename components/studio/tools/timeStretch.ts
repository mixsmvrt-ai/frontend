function hannWindow(length: number): Float32Array {
  const w = new Float32Array(length);
  if (length <= 1) {
    if (length === 1) w[0] = 1;
    return w;
  }
  for (let i = 0; i < length; i += 1) {
    w[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (length - 1)));
  }
  return w;
}

function correlate(
  a: Float32Array,
  aOffset: number,
  b: Float32Array,
  bOffset: number,
  length: number,
  step: number,
): number {
  let sum = 0;
  for (let i = 0; i < length; i += step) {
    sum += (a[aOffset + i] ?? 0) * (b[bOffset + i] ?? 0);
  }
  return sum;
}

export function timeStretchWSOLA(
  input: Float32Array,
  stretchFactor: number,
  options?: {
    windowSize?: number;
    analysisHop?: number;
    searchRadius?: number;
  },
): Float32Array {
  const factor = Number.isFinite(stretchFactor) ? stretchFactor : 1;
  if (factor <= 0) return input.slice();
  if (Math.abs(factor - 1) < 1e-3) return input.slice();

  const W = Math.max(512, Math.min(8192, options?.windowSize ?? 2048));
  const Ha = Math.max(64, Math.min(W / 2, options?.analysisHop ?? W / 4));
  const Hs = Math.max(1, Math.round(Ha * factor));
  const search = Math.max(0, Math.min(W / 2, options?.searchRadius ?? Math.round(Ha / 2)));

  const outLenTarget = Math.max(1, Math.round(input.length * factor));
  const out = new Float32Array(outLenTarget + W + 1);
  const win = hannWindow(W);

  // Seed first window
  const seedLen = Math.min(W, input.length);
  for (let i = 0; i < seedLen; i += 1) {
    out[i] = input[i];
  }

  let inPos = Ha;
  let outPos = Hs;

  const step = 8; // downsampled correlation for speed

  while (outPos + W < out.length && inPos + W < input.length) {
    // Find best matching offset around inPos
    let bestOffset = 0;
    let bestScore = Number.NEGATIVE_INFINITY;

    const outCompareOffset = Math.max(0, outPos);

    for (let offset = -search; offset <= search; offset += 1) {
      const cand = inPos + offset;
      if (cand < 0 || cand + W >= input.length) continue;
      const score = correlate(out, outCompareOffset, input, cand, W, step);
      if (score > bestScore) {
        bestScore = score;
        bestOffset = offset;
      }
    }

    const src = inPos + bestOffset;
    for (let i = 0; i < W; i += 1) {
      out[outPos + i] += (input[src + i] ?? 0) * win[i];
    }

    inPos += Ha;
    outPos += Hs;
  }

  // Trim to target length
  return out.slice(0, outLenTarget);
}

export async function timeStretchAudioBufferSegment(
  ac: BaseAudioContext,
  buffer: AudioBuffer,
  startSec: number,
  endSec: number,
  stretchFactor: number,
): Promise<AudioBuffer> {
  const sampleRate = buffer.sampleRate;
  const startSample = Math.max(0, Math.min(buffer.length, Math.floor(startSec * sampleRate)));
  const endSample = Math.max(0, Math.min(buffer.length, Math.floor(endSec * sampleRate)));
  if (endSample <= startSample) {
    return ac.createBuffer(buffer.numberOfChannels, 1, sampleRate);
  }

  const segLen = endSample - startSample;
  const outLen = Math.max(1, Math.round(segLen * stretchFactor));
  const outBuf = ac.createBuffer(buffer.numberOfChannels, outLen, sampleRate);

  for (let c = 0; c < buffer.numberOfChannels; c += 1) {
    const ch = buffer.getChannelData(c);
    const segment = ch.slice(startSample, endSample);
    const stretched = timeStretchWSOLA(segment, stretchFactor);
    outBuf.getChannelData(c).set(stretched.subarray(0, outLen));
  }

  return outBuf;
}

export function concatAudioBuffers(
  ac: BaseAudioContext,
  buffers: AudioBuffer[],
): AudioBuffer {
  const nonEmpty = buffers.filter((b) => b && b.length > 0);
  if (!nonEmpty.length) {
    return ac.createBuffer(1, 1, 44100);
  }

  const sampleRate = nonEmpty[0].sampleRate;
  const channels = nonEmpty[0].numberOfChannels;
  const totalLength = nonEmpty.reduce((sum, b) => sum + b.length, 0);

  const out = ac.createBuffer(channels, totalLength, sampleRate);
  for (let c = 0; c < channels; c += 1) {
    const outCh = out.getChannelData(c);
    let offset = 0;
    for (const b of nonEmpty) {
      const inCh = b.getChannelData(Math.min(c, b.numberOfChannels - 1));
      outCh.set(inCh, offset);
      offset += b.length;
    }
  }

  return out;
}

export function sliceAudioBuffer(
  ac: BaseAudioContext,
  buffer: AudioBuffer,
  startSec: number,
  endSec: number,
): AudioBuffer {
  const sampleRate = buffer.sampleRate;
  const startSample = Math.max(0, Math.min(buffer.length, Math.floor(startSec * sampleRate)));
  const endSample = Math.max(0, Math.min(buffer.length, Math.floor(endSec * sampleRate)));
  const len = Math.max(1, endSample - startSample);

  const out = ac.createBuffer(buffer.numberOfChannels, len, sampleRate);
  for (let c = 0; c < buffer.numberOfChannels; c += 1) {
    out.getChannelData(c).set(buffer.getChannelData(c).slice(startSample, endSample));
  }
  return out;
}

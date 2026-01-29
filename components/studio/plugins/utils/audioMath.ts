import { clamp } from "../primitives/clamp";

export function freqToX(freqHz: number, width: number, minHz = 20, maxHz = 20000): number {
  const f = clamp(freqHz, minHz, maxHz);
  const minL = Math.log10(minHz);
  const maxL = Math.log10(maxHz);
  const t = (Math.log10(f) - minL) / (maxL - minL);
  return t * width;
}

export function xToFreq(x: number, width: number, minHz = 20, maxHz = 20000): number {
  const t = clamp(x / width, 0, 1);
  const minL = Math.log10(minHz);
  const maxL = Math.log10(maxHz);
  const logF = minL + t * (maxL - minL);
  return Math.pow(10, logF);
}

export function dbToY(db: number, height: number, minDb: number, maxDb: number): number {
  const t = clamp((db - minDb) / (maxDb - minDb), 0, 1);
  // Higher dB should be higher on graph (smaller y)
  return (1 - t) * height;
}

export function yToDb(y: number, height: number, minDb: number, maxDb: number): number {
  const t = clamp(1 - y / height, 0, 1);
  return minDb + t * (maxDb - minDb);
}

// Visual-only band shapes (not DSP-accurate), but feels like a DAW EQ curve.
export function bellShape(freq: number, center: number, q: number): number {
  const ratio = Math.log2(freq / center);
  const width = 1 / clamp(q, 0.2, 10);
  const x = ratio / width;
  return Math.exp(-0.5 * x * x);
}

export function shelfShape(freq: number, cutoff: number, slope = 1): number {
  const x = Math.log2(freq / cutoff);
  const k = clamp(slope, 0.2, 4);
  // Smooth step-ish
  return 1 / (1 + Math.exp(-k * x));
}

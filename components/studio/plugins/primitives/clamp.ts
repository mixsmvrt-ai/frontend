export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function clamp01(value: number): number {
  return clamp(value, 0, 1);
}

export function formatNumber(value: number, decimals: number): string {
  if (!Number.isFinite(value)) return "0";
  return value.toFixed(decimals);
}

export function toPercent01(value: number, min: number, max: number): number {
  if (!Number.isFinite(value) || max === min) return 0;
  return clamp01((value - min) / (max - min));
}

export function fromPercent01(t: number, min: number, max: number): number {
  return min + clamp01(t) * (max - min);
}

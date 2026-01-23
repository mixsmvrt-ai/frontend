"use client";

import React from "react";

export interface EqPoint {
  freq: number; // Hz, > 0
  gain: number; // dB, will be visually clamped to ±6 dB
}

interface EQDisplayProps {
  width?: number;
  height?: number;
  baseCurve: EqPoint[]; // preset EQ curve
  macroCurve: EqPoint[]; // macro overlay contribution
}

// Log-frequency mapping with sane bounds for a mastering-style EQ display.
const MIN_FREQ = 20;
const MAX_FREQ = 20000;
const MIN_DB = -6;
const MAX_DB = 6;

function logNorm(freq: number): number {
  const clamped = Math.min(MAX_FREQ, Math.max(MIN_FREQ, freq));
  const minL = Math.log10(MIN_FREQ);
  const maxL = Math.log10(MAX_FREQ);
  return (Math.log10(clamped) - minL) / (maxL - minL);
}

function dbNorm(gain: number): number {
  const clamped = Math.min(MAX_DB, Math.max(MIN_DB, gain));
  return (clamped - MIN_DB) / (MAX_DB - MIN_DB);
}

function sampleCurve(curve: EqPoint[], freq: number): number {
  if (curve.length === 0) return 0;
  const sorted = [...curve].sort((a, b) => a.freq - b.freq);
  if (freq <= sorted[0].freq) return sorted[0].gain;
  if (freq >= sorted[sorted.length - 1].freq) return sorted[sorted.length - 1].gain;
  for (let i = 0; i < sorted.length - 1; i++) {
    const a = sorted[i];
    const b = sorted[i + 1];
    if (freq >= a.freq && freq <= b.freq) {
      const t = (freq - a.freq) / (b.freq - a.freq);
      return a.gain + (b.gain - a.gain) * t;
    }
  }
  return 0;
}

export const EQDisplay: React.FC<EQDisplayProps> = ({
  width = 480,
  height = 200,
  baseCurve,
  macroCurve,
}) => {
  const [hoverInfo, setHoverInfo] = React.useState<{ freq: number; gain: number } | null>(
    null
  );

  const margin = { left: 32, right: 16, top: 10, bottom: 22 };
  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;

  const freqs: number[] = [];
  const steps = 96; // smooth enough, not heavy
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const lf = Math.log10(MIN_FREQ) + t * (Math.log10(MAX_FREQ) - Math.log10(MIN_FREQ));
    freqs.push(Math.pow(10, lf));
  }

  const basePath = freqs
    .map((f, i) => {
      const x = margin.left + logNorm(f) * innerW;
      const g = sampleCurve(baseCurve, f);
      const y = margin.top + (1 - dbNorm(g)) * innerH;
      return `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");

  const macroPath = freqs
    .map((f, i) => {
      const x = margin.left + logNorm(f) * innerW;
      const g = sampleCurve(macroCurve, f);
      const y = margin.top + (1 - dbNorm(g)) * innerH;
      return `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");

  const handleMove = (e: React.MouseEvent<SVGRectElement>) => {
    const rect = (e.currentTarget as SVGRectElement).getBoundingClientRect();
    const x = e.clientX - rect.left - margin.left;
    const t = Math.min(1, Math.max(0, x / innerW));
    const lf = Math.log10(MIN_FREQ) + t * (Math.log10(MAX_FREQ) - Math.log10(MIN_FREQ));
    const freq = Math.pow(10, lf);
    const gainBase = sampleCurve(baseCurve, freq);
    const gainMacro = sampleCurve(macroCurve, freq);
    const gain = gainBase + gainMacro;
    setHoverInfo({ freq, gain });
  };

  const handleLeave = () => setHoverInfo(null);

  const freqLines = [20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000];

  return (
    <div className="relative" style={{ width, height }}>
      {hoverInfo && (
        <div className="pointer-events-none absolute -top-5 right-0 px-2 py-0.5 rounded bg-zinc-900/90 border border-zinc-700 text-[0.65rem] text-zinc-200 shadow">
          {hoverInfo.freq.toFixed(0)} Hz · {hoverInfo.gain.toFixed(1)} dB
        </div>
      )}
      <svg width={width} height={height} className="bg-gradient-to-b from-zinc-950 to-zinc-900">
        <defs>
          <linearGradient id="eqBase" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.1" />
          </linearGradient>
          <linearGradient id="eqMacro" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f97316" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#f97316" stopOpacity="0.1" />
          </linearGradient>
        </defs>

        {/* Grid */}
        <g>
          {freqLines.map((f) => {
            const x = margin.left + logNorm(f) * innerW;
            return (
              <g key={f}>
                <line
                  x1={x}
                  x2={x}
                  y1={margin.top}
                  y2={margin.top + innerH}
                  stroke="#27272a"
                  strokeWidth={0.6}
                  strokeDasharray={f === 1000 || f === 10000 ? "" : "2 3"}
                />
                <text
                  x={x}
                  y={height - 6}
                  fill="#a1a1aa"
                  fontSize={9}
                  textAnchor="middle"
                >
                  {f >= 1000 ? `${f / 1000}k` : f}
                </text>
              </g>
            );
          })}

          {[MIN_DB, 0, MAX_DB].map((d) => {
            const y = margin.top + (1 - dbNorm(d)) * innerH;
            return (
              <g key={d}>
                <line
                  x1={margin.left}
                  x2={margin.left + innerW}
                  y1={y}
                  y2={y}
                  stroke="#27272a"
                  strokeWidth={0.6}
                  strokeDasharray={d === 0 ? "" : "2 3"}
                />
                <text
                  x={4}
                  y={y + 3}
                  fill="#71717a"
                  fontSize={9}
                >
                  {d > 0 ? `+${d}` : d} dB
                </text>
              </g>
            );
          })}
        </g>

        {/* Base preset curve */}
        <path
          d={basePath}
          fill="none"
          stroke="url(#eqBase)"
          strokeWidth={1.4}
        />

        {/* Macro overlay curve */}
        <path
          d={macroPath}
          fill="none"
          stroke="url(#eqMacro)"
          strokeWidth={1.6}
          strokeLinecap="round"
        />

        {/* Hover capture rect */}
        <rect
          x={margin.left}
          y={margin.top}
          width={innerW}
          height={innerH}
          fill="transparent"
          onMouseMove={handleMove}
          onMouseLeave={handleLeave}
        />
      </svg>
    </div>
  );
};

export default EQDisplay;

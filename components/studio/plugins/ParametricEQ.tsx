"use client";

import { useMemo, useRef, useState } from "react";
import type { PluginParams, TrackPlugin } from "../pluginTypes";
import { defaultPluginParams } from "../pluginTypes";
import Knob from "./primitives/Knob";
import Toggle from "./primitives/Toggle";
import { bellShape, dbToY, freqToX, shelfShape, xToFreq, yToDb } from "./utils/audioMath";
import { clamp } from "./primitives/clamp";

type BandKey = "low" | "low_mid" | "mid" | "high_mid" | "high";

const BANDS: Array<{ key: BandKey; label: string; color: string }> = [
  { key: "low", label: "Low", color: "#7dd3fc" },
  { key: "low_mid", label: "Low‑Mid", color: "#a78bfa" },
  { key: "mid", label: "Mid", color: "#fb7185" },
  { key: "high_mid", label: "High‑Mid", color: "#fb923c" },
  { key: "high", label: "High", color: "#34d399" },
];

type FilterType = "Bell" | "Shelf" | "HP" | "LP";

function getNum(params: PluginParams, key: string, fallback: number) {
  const v = Number(params[key]);
  return Number.isFinite(v) ? v : fallback;
}

function getStr(params: PluginParams, key: string, fallback: string) {
  const v = params[key];
  return typeof v === "string" ? v : fallback;
}

function setParam(plugin: TrackPlugin, key: string, value: number | string | boolean): TrackPlugin {
  return {
    ...plugin,
    params: { ...plugin.params, [key]: value },
    locked: false,
  };
}

export default function ParametricEQ({ plugin, onChange }: { plugin: TrackPlugin; onChange: (p: TrackPlugin) => void }) {
  const defaults = useMemo(() => defaultPluginParams("EQ"), []);
  const params = useMemo(() => ({ ...defaults, ...plugin.params }), [defaults, plugin.params]);
  const [selected, setSelected] = useState<BandKey>("mid");
  const svgRef = useRef<SVGSVGElement | null>(null);

  const width = 760;
  const height = 220;
  const minDb = -12;
  const maxDb = 12;

  const bandState = useMemo(() => {
    return BANDS.map((b) => {
      const f = getNum(params, `${b.key}_freq`, 1000);
      const g = getNum(params, `${b.key}_gain`, 0);
      const q = getNum(params, `${b.key}_q`, 1);
      const t = getStr(params, `${b.key}_type`, "Bell") as FilterType;
      return { ...b, freq: f, gain: g, q, type: t };
    });
  }, [params]);

  const aiTouchedBand = useMemo(() => {
    if (!plugin.aiGenerated || !plugin.aiParams) return new Set<BandKey>();
    const base = defaultPluginParams("EQ");
    const out = new Set<BandKey>();
    for (const b of BANDS) {
      const keys = [`${b.key}_freq`, `${b.key}_gain`, `${b.key}_q`, `${b.key}_type`];
      if (keys.some((k) => plugin.aiParams && String(plugin.aiParams[k]) !== String(base[k]))) {
        out.add(b.key);
      }
    }
    return out;
  }, [plugin.aiGenerated, plugin.aiParams]);

  const path = useMemo(() => {
    const points = 160;
    const freqs = Array.from({ length: points }, (_, i) => {
      const t = i / (points - 1);
      const minL = Math.log10(20);
      const maxL = Math.log10(20000);
      return Math.pow(10, minL + t * (maxL - minL));
    });

    const dbAt = (f: number) => {
      let db = 0;
      for (const b of bandState) {
        const q = clamp(b.q, 0.25, 8);
        if (b.type === "Bell") {
          db += b.gain * bellShape(f, b.freq, q);
        } else if (b.type === "Shelf") {
          const s = shelfShape(f, b.freq, 2);
          // low shelf: below cutoff boosts, above tapers. high shelf: inverse.
          const isHigh = b.key === "high" || b.key === "high_mid";
          db += b.gain * (isHigh ? s : 1 - s);
        } else if (b.type === "HP") {
          const s = shelfShape(f, b.freq, 4);
          db += (-12) * (1 - s);
        } else if (b.type === "LP") {
          const s = shelfShape(f, b.freq, 4);
          db += (-12) * s;
        }
      }
      return clamp(db, minDb, maxDb);
    };

    const d = freqs
      .map((f, i) => {
        const x = freqToX(f, width);
        const y = dbToY(dbAt(f), height, minDb, maxDb);
        return `${i === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)}`;
      })
      .join(" ");

    return d;
  }, [bandState]);

  const selectedState = bandState.find((b) => b.key === selected) ?? bandState[2];

  const updateBand = (bandKey: BandKey, updates: Partial<{ freq: number; gain: number; q: number; type: FilterType }>) => {
    let next = plugin;
    if (typeof updates.freq === "number") next = setParam(next, `${bandKey}_freq`, updates.freq);
    if (typeof updates.gain === "number") next = setParam(next, `${bandKey}_gain`, updates.gain);
    if (typeof updates.q === "number") next = setParam(next, `${bandKey}_q`, updates.q);
    if (typeof updates.type === "string") next = setParam(next, `${bandKey}_type`, updates.type);
    onChange(next);
  };

  const handleNodeDrag = (bandKey: BandKey, clientX: number, clientY: number) => {
    const el = svgRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = clamp(clientX - rect.left, 0, rect.width);
    const y = clamp(clientY - rect.top, 0, rect.height);

    const freq = xToFreq((x / rect.width) * width, width);
    const gain = yToDb((y / rect.height) * height, height, minDb, maxDb);
    updateBand(bandKey, { freq, gain });
  };

  return (
    <div className="grid grid-cols-12 gap-4">
      {/* Graph */}
      <div className="col-span-12 rounded-xl border border-white/10 bg-black/30 p-3">
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-[0.18em] text-white/40">Frequency</span>
            <span className="text-[10px] text-white/50">Drag nodes • Shift-drag for fine</span>
          </div>
          <Toggle
            label={plugin.locked ? "AI Locked" : "Manual"}
            value={plugin.locked}
            onChange={(v) => onChange({ ...plugin, locked: v })}
          />
        </div>

        <svg ref={svgRef} viewBox={`0 0 ${width} ${height}`} className="h-[220px] w-full">
          {/* Grid */}
          {Array.from({ length: 6 }).map((_, i) => (
            <line
              key={`h-${i}`}
              x1={0}
              x2={width}
              y1={(i / 5) * height}
              y2={(i / 5) * height}
              stroke="rgba(255,255,255,0.06)"
            />
          ))}
          {[
            20,
            50,
            100,
            200,
            500,
            1000,
            2000,
            5000,
            10000,
            20000,
          ].map((f) => (
            <line
              key={`v-${f}`}
              y1={0}
              y2={height}
              x1={freqToX(f, width)}
              x2={freqToX(f, width)}
              stroke="rgba(255,255,255,0.06)"
            />
          ))}

          {/* Curve */}
          <path
            d={path}
            fill="none"
            stroke="rgba(244,63,94,0.85)"
            strokeWidth={2}
            style={{ filter: "drop-shadow(0 0 8px rgba(244,63,94,0.35))" }}
          />

          {/* Nodes */}
          {bandState.map((b) => {
            const x = freqToX(b.freq, width);
            const y = dbToY(b.gain, height, minDb, maxDb);
            const selectedRing = b.key === selected;
            const aiGlow = aiTouchedBand.has(b.key);

            return (
              <g key={b.key}>
                {aiGlow && (
                  <circle
                    cx={x}
                    cy={y}
                    r={14}
                    fill={b.color}
                    opacity={0.14}
                  />
                )}
                <circle
                  cx={x}
                  cy={y}
                  r={selectedRing ? 7 : 6}
                  fill={b.color}
                  stroke={selectedRing ? "white" : "rgba(255,255,255,0.35)"}
                  strokeWidth={selectedRing ? 1.5 : 1}
                  style={{ filter: `drop-shadow(0 0 10px ${b.color}55)` }}
                  onPointerDown={(e) => {
                    (e.target as SVGElement).setPointerCapture(e.pointerId);
                    setSelected(b.key);
                    handleNodeDrag(b.key, e.clientX, e.clientY);
                  }}
                  onPointerMove={(e) => {
                    if ((e.buttons ?? 0) === 0) return;
                    handleNodeDrag(b.key, e.clientX, e.clientY);
                  }}
                />
              </g>
            );
          })}
        </svg>

        <div className="mt-2 flex flex-wrap items-center gap-2">
          {BANDS.map((b) => (
            <button
              key={b.key}
              type="button"
              onClick={() => setSelected(b.key)}
              className={`rounded-full border px-3 py-1 text-[11px] ${
                selected === b.key
                  ? "border-red-500/60 bg-red-500/15 text-white"
                  : "border-white/10 bg-black/30 text-white/60 hover:border-white/20"
              }`}
            >
              {b.label}
            </button>
          ))}
        </div>
      </div>

      {/* Controls */}
      <div className="col-span-12 grid grid-cols-12 gap-4">
        <div className="col-span-12 md:col-span-8 rounded-xl border border-white/10 bg-black/30 p-4">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-[0.18em] text-white/40">Band</p>
              <p className="text-sm font-semibold text-white">{selectedState.label}</p>
            </div>
            <select
              className="h-9 rounded-lg border border-white/10 bg-black/40 px-3 text-[12px] text-white/70 outline-none hover:border-red-500/40"
              value={selectedState.type}
              onChange={(e) => updateBand(selected, { type: e.target.value as FilterType })}
            >
              <option value="Bell">Bell</option>
              <option value="Shelf">Shelf</option>
              <option value="HP">HP</option>
              <option value="LP">LP</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
            <Knob
              label="Freq"
              kind="air"
              value={selectedState.freq}
              min={20}
              max={20000}
              defaultValue={getNum(defaults, `${selected}_freq`, selectedState.freq)}
              step={1}
              unit="Hz"
              decimals={0}
              format={(v) => (v >= 1000 ? `${(v / 1000).toFixed(2)} kHz` : `${Math.round(v)} Hz`)}
              onChange={(v) => updateBand(selected, { freq: v })}
            />
            <Knob
              label="Gain"
              kind="neon"
              value={selectedState.gain}
              min={-12}
              max={12}
              defaultValue={0}
              step={0.1}
              unit="dB"
              decimals={1}
              format={(v) => `${v >= 0 ? "+" : ""}${v.toFixed(1)} dB`}
              onChange={(v) => updateBand(selected, { gain: v })}
            />
            <Knob
              label="Q"
              kind="punch"
              value={selectedState.q}
              min={0.25}
              max={8}
              defaultValue={1}
              step={0.01}
              decimals={2}
              onChange={(v) => updateBand(selected, { q: v })}
            />
          </div>
        </div>

        <div className="col-span-12 md:col-span-4 rounded-xl border border-white/10 bg-black/30 p-4">
          <p className="text-[10px] uppercase tracking-[0.18em] text-white/40">AI</p>
          <p className="mt-1 text-[12px] text-white/60">
            AI bands glow softly on the graph. Any manual tweak unlocks the plugin.
          </p>
          <div className="mt-3 rounded-lg border border-white/10 bg-black/40 p-3 text-[11px] text-white/60">
            <div className="flex items-center justify-between">
              <span>Selected</span>
              <span className="text-white/80">
                {selectedState.freq >= 1000
                  ? `${(selectedState.freq / 1000).toFixed(2)} kHz`
                  : `${Math.round(selectedState.freq)} Hz`}
                {" • "}
                {selectedState.gain >= 0 ? "+" : ""}{selectedState.gain.toFixed(1)} dB
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

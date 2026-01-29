"use client";

import React from "react";
import { clamp, toPercent01 } from "./clamp";
import EditableValue from "./EditableValue";

type SliderProps = {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  defaultValue: number;
  unit?: string;
  decimals?: number;
  format?: (value: number) => string;
  onChange: (value: number) => void;
};

export default function Slider({
  label,
  value,
  min,
  max,
  step,
  defaultValue,
  unit,
  decimals = 2,
  format,
  onChange,
}: SliderProps) {
  const percent = toPercent01(value, min, max);

  const commit = (raw: number) => {
    const stepped = step ? Math.round(raw / step) * step : raw;
    onChange(clamp(stepped, min, max));
  };

  return (
    <div className="flex w-full flex-col gap-2">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[10px] uppercase tracking-[0.18em] text-white/40">{label}</span>
        <button
          type="button"
          className="rounded-md bg-white/5 px-2 py-1 text-[10px] text-white/60 hover:bg-white/10"
          onClick={() => onChange(defaultValue)}
          title="Double-click reset alternative"
        >
          Reset
        </button>
      </div>

      <div className="relative h-2 w-full rounded-full bg-white/5">
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-red-500/70 to-red-300/40"
          style={{ width: `${percent * 100}%` }}
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => commit(Number(e.target.value))}
          className="absolute inset-0 h-2 w-full cursor-pointer opacity-0"
          aria-label={label}
        />
        <div
          className="absolute top-1/2 h-3 w-3 -translate-y-1/2 rounded-full border border-white/15 bg-zinc-950 shadow"
          style={{ left: `calc(${percent * 100}% - 6px)` }}
        />
      </div>

      <div className="flex justify-end">
        <EditableValue
          value={value}
          min={min}
          max={max}
          step={step}
          decimals={decimals}
          unit={unit}
          format={format}
          onChange={onChange}
        />
      </div>
    </div>
  );
}

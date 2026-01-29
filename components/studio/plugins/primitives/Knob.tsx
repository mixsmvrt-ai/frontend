"use client";

import React, { useMemo, useRef, useState } from "react";
import { clamp, fromPercent01, toPercent01 } from "./clamp";
import EditableValue from "./EditableValue";

type KnobProps = {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  defaultValue: number;
  unit?: string;
  decimals?: number;
  kind?: "air" | "punch" | "warmth" | "neon";
  format?: (value: number) => string;
  onChange: (value: number) => void;
};

export default function Knob({
  label,
  value,
  min,
  max,
  step,
  defaultValue,
  unit,
  decimals = 2,
  kind = "neon",
  format,
  onChange,
}: KnobProps) {
  const draggingRef = useRef(false);
  const lastYRef = useRef(0);
  const [hover, setHover] = useState(false);

  const t = useMemo(() => toPercent01(value, min, max), [max, min, value]);
  const angle = -135 + t * 270;

  const accentColor =
    kind === "air"
      ? "#7dd3fc"
      : kind === "punch"
        ? "#fb923c"
        : kind === "warmth"
          ? "#fb7185"
          : "#f43f5e";

  const commitPercent = (nextT: number) => {
    const raw = fromPercent01(nextT, min, max);
    const stepped = step ? Math.round(raw / step) * step : raw;
    const clampedValue = clamp(stepped, min, max);
    onChange(clampedValue);
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    draggingRef.current = true;
    lastYRef.current = e.clientY;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return;
    const deltaY = e.clientY - lastYRef.current;
    if (Math.abs(deltaY) < 1) return;
    lastYRef.current = e.clientY;

    const sensitivity = e.shiftKey ? 0.0025 : 0.007;
    commitPercent(t - deltaY * sensitivity);
  };

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    draggingRef.current = false;
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  };

  const onWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const wheelStep = step ?? (max - min) / 100;
    const direction = e.deltaY < 0 ? 1 : -1;
    const fine = e.shiftKey ? 0.25 : 1;
    const next = clamp(value + direction * wheelStep * fine, min, max);
    onChange(next);
  };

  return (
    <div className="flex flex-col items-center gap-2 select-none">
      <div
        className="relative h-14 w-14 cursor-pointer rounded-full border border-white/10 bg-gradient-to-b from-zinc-900 to-black shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06),0_10px_30px_rgba(0,0,0,0.6)]"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
        onWheel={onWheel}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        onDoubleClick={() => onChange(defaultValue)}
        role="slider"
        aria-label={label}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
      >
        <div className="absolute inset-[10%] rounded-full bg-black/70" />
        <div
          className="absolute left-1/2 top-1/2 h-[48%] w-[2px] rounded-full transition-transform duration-75"
          style={{
            transform: `translate(-50%, -85%) rotate(${angle}deg)` ,
            transformOrigin: "50% 95%",
            backgroundColor: accentColor,
            boxShadow: `0 0 10px ${accentColor}66`,
          }}
        />
        <div className="absolute inset-[2px] rounded-full border border-white/5" />

        {hover && (
          <div className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md border border-white/10 bg-black/90 px-2 py-1 text-[10px] text-white/80 shadow-lg">
            {format ? format(value) : `${value.toFixed(decimals)}${unit ? ` ${unit}` : ""}`}
          </div>
        )}
      </div>

      <div className="flex flex-col items-center gap-1">
        <span className="text-[10px] uppercase tracking-[0.18em] text-white/40">{label}</span>
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

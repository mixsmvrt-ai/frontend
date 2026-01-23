"use client";

import React from "react";

export type MacroKind = "air" | "punch" | "warmth";

interface MacroKnobProps {
  label: string;
  kind: MacroKind;
  value: number; // 0 - 100
  onChange: (value: number) => void;
}

// Simple, accessible rotary-style macro knob with drag + scroll support.
export const MacroKnob: React.FC<MacroKnobProps> = ({ label, kind, value, onChange }) => {
  const knobRef = React.useRef<HTMLDivElement | null>(null);
  const draggingRef = React.useRef(false);
  const lastYRef = React.useRef(0);

  const clamp = (v: number) => Math.min(100, Math.max(0, v));

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    draggingRef.current = true;
    lastYRef.current = e.clientY;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return;
    const deltaY = e.clientY - lastYRef.current;
    if (Math.abs(deltaY) < 1) return;
    lastYRef.current = e.clientY;
    const sensitivity = 0.7;
    const next = clamp(value - deltaY * sensitivity);
    if (next !== value) onChange(next);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    draggingRef.current = false;
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
  };

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const step = e.deltaY < 0 ? 2 : -2;
    onChange(clamp(value + step));
  };

  const angle = -135 + (value / 100) * 270; // -135deg .. +135deg

  const accentColor =
    kind === "air" ? "#7dd3fc" : kind === "punch" ? "#f97316" : "#fb7185";

  return (
    <div className="flex flex-col items-center gap-2 text-xs select-none">
      <div
        ref={knobRef}
        className="relative h-12 w-12 rounded-full bg-zinc-900 border border-zinc-700 shadow-inner flex items-center justify-center cursor-pointer"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onWheel={handleWheel}
        role="slider"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(value)}
        aria-label={label}
      >
        <div className="absolute inset-[18%] rounded-full bg-zinc-950" />
        <div
          className="h-[60%] w-[2px] rounded-full"
          style={{
            transform: `rotate(${angle}deg) translateY(-70%)`,
            transformOrigin: "50% 80%",
            backgroundColor: accentColor,
          }}
        />
        <div
          className="absolute inset-[2px] rounded-full border border-zinc-800"
          style={{ boxShadow: `0 0 0 1px rgba(0,0,0,0.6)` }}
        />
      </div>
      <span className="uppercase tracking-[0.12em] text-[0.6rem] text-zinc-400">{label}</span>
    </div>
  );
};

export default MacroKnob;

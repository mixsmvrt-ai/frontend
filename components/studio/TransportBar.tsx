"use client";

import React, { useEffect, useRef, useState } from "react";

type GridResolution = "1/2" | "1/4" | "1/8";

type TransportBarProps = {
  isPlaying: boolean;
  onPlayToggle: () => void;
  onStop: () => void;
  onPrev: () => void;
  onNext: () => void;
  playheadSeconds: number;
  gridResolution: GridResolution;
  onGridResolutionChange: (value: GridResolution) => void;
  bpm: number;
  onBpmChange: (value: number) => void;
  sessionKey: string;
  onSessionKeyChange: (value: string) => void;
  sessionScale: "Major" | "Minor";
  onSessionScaleChange: (value: "Major" | "Minor") => void;
};

function formatTime(seconds: number): string {
  const total = Math.max(0, seconds);
  const mins = Math.floor(total / 60);
  const secs = Math.floor(total % 60);
  const millis = Math.floor((total % 1) * 10); // tenths
  const mm = String(mins).padStart(2, "0");
  const ss = String(secs).padStart(2, "0");
  return `${mm}:${ss}.${millis}`;
}

export default function TransportBar({
  isPlaying,
  onPlayToggle,
  onStop,
  onPrev,
  onNext,
  playheadSeconds,
  gridResolution,
  onGridResolutionChange,
  bpm,
  onBpmChange,
  sessionKey,
  onSessionKeyChange,
  sessionScale,
  onSessionScaleChange,
}: TransportBarProps) {
  const [isFloating, setIsFloating] = useState(false);
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const isDraggingRef = useRef(false);
  const dragOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Initialize default floating position once when toggled on
  const handleToggleFloating = () => {
    setIsFloating((prev) => {
      const next = !prev;
      if (next && typeof window !== "undefined") {
        const width = 420;
        const x = window.innerWidth / 2 - width / 2;
        const y = window.innerHeight - 120;
        setPosition({ x, y });
      }
      return next;
    });
  };

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      if (!isDraggingRef.current || !isFloating) return;
      if (typeof window === "undefined") return;

      const nextX = event.clientX - dragOffsetRef.current.x;
      const nextY = event.clientY - dragOffsetRef.current.y;

      setPosition({ x: nextX, y: nextY });
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isFloating]);

  const handleDragMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!isFloating) return;
    event.preventDefault();
    isDraggingRef.current = true;
    dragOffsetRef.current = {
      x: event.clientX - position.x,
      y: event.clientY - position.y,
    };
  };

  const containerStyle: React.CSSProperties = isFloating
    ? {
        position: "fixed",
        left: position.x,
        top: position.y,
      }
    : {};

  return (
    <div
      className={`z-30 flex h-14 items-center bg-zinc-950/95 px-4 backdrop-blur ${
        isFloating
          ? "rounded-xl border border-white/15 shadow-[0_0_30px_rgba(0,0,0,0.8)]"
          : "sticky top-0 border-b border-white/10"
      }`}
      style={containerStyle}
    >
      {/* Left: core transport controls */}
      <div className="flex items-center gap-2">
        <button
          onClick={onPrev}
          className="flex h-8 w-8 items-center justify-center rounded-full border border-white/20 bg-zinc-900 text-xs text-white/70 hover:border-red-400 hover:text-red-300"
          aria-label="Previous"
        >
          ⏮
        </button>
        <button
          onClick={onPlayToggle}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-red-600 text-sm font-semibold text-white shadow-[0_0_18px_rgba(248,113,113,0.7)] hover:bg-red-500"
        >
          {isPlaying ? "❚❚" : "▶"}
        </button>
        <button
          onClick={onStop}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-zinc-900 text-xs text-white/80 hover:border-red-400 hover:text-red-300"
          aria-label="Stop"
        >
          ■
        </button>

        <button
          onClick={onNext}
          className="flex h-8 w-8 items-center justify-center rounded-full border border-white/20 bg-zinc-900 text-xs text-white/70 hover:border-red-400 hover:text-red-300"
          aria-label="Next"
        >
          ⏭
        </button>

        {/* Pin toggle */}
        <button
          type="button"
          onClick={handleToggleFloating}
          className={`ml-1 flex h-7 w-7 items-center justify-center rounded-full border text-[11px] ${
            isFloating
              ? "border-red-400 bg-zinc-900 text-red-300"
              : "border-white/20 bg-zinc-900 text-white/60 hover:border-red-400 hover:text-red-300"
          }`}
          aria-label={isFloating ? "Dock transport" : "Float transport"}
        >
          📌
        </button>
      </div>

      {/* Right: tempo / key / time / grid resolution */}
      <div
        className="ml-auto flex items-center gap-4"
        onMouseDown={handleDragMouseDown}
      >
        <div className="flex items-center gap-2 rounded-full border border-white/10 bg-zinc-900/90 px-3 py-1 text-[11px]">
          <span className="text-white/50">BPM</span>
          <input
            type="number"
            min={40}
            max={240}
            value={Number.isFinite(bpm) ? bpm : 120}
            onChange={(event) => {
              const next = Number(event.target.value) || 0;
              const clamped = Math.min(240, Math.max(40, next));
              onBpmChange(clamped);
            }}
            className="w-14 rounded bg-black/60 px-1 py-0.5 text-right font-mono text-[11px] text-white outline-none"
          />
        </div>

        <div className="hidden items-center gap-2 rounded-full border border-white/10 bg-zinc-900/90 px-3 py-1 text-[11px] sm:flex">
          <span className="text-white/50">Key</span>
          <select
            value={sessionKey}
            onChange={(event) => onSessionKeyChange(event.target.value)}
            className="bg-transparent text-white outline-none"
          >
            <option value="C" className="bg-zinc-900 text-white">
              C
            </option>
            <option value="C#" className="bg-zinc-900 text-white">
              C# / Db
            </option>
            <option value="D" className="bg-zinc-900 text-white">
              D
            </option>
            <option value="D#" className="bg-zinc-900 text-white">
              D# / Eb
            </option>
            <option value="E" className="bg-zinc-900 text-white">
              E
            </option>
            <option value="F" className="bg-zinc-900 text-white">
              F
            </option>
            <option value="F#" className="bg-zinc-900 text-white">
              F# / Gb
            </option>
            <option value="G" className="bg-zinc-900 text-white">
              G
            </option>
            <option value="G#" className="bg-zinc-900 text-white">
              G# / Ab
            </option>
            <option value="A" className="bg-zinc-900 text-white">
              A
            </option>
            <option value="A#" className="bg-zinc-900 text-white">
              A# / Bb
            </option>
            <option value="B" className="bg-zinc-900 text-white">
              B
            </option>
          </select>
          <select
            value={sessionScale}
            onChange={(event) =>
              onSessionScaleChange(event.target.value as "Major" | "Minor")
            }
            className="bg-transparent text-white outline-none"
          >
            <option value="Major" className="bg-zinc-900 text-white">
              Maj
            </option>
            <option value="Minor" className="bg-zinc-900 text-white">
              Min
            </option>
          </select>
        </div>

        <div className="flex items-baseline gap-2 rounded-lg border border-white/10 bg-zinc-900/90 px-3 py-1.5">
          <span className="text-[10px] uppercase tracking-[0.16em] text-white/40">
            Time
          </span>
          <span className="font-mono text-sm text-white">{formatTime(playheadSeconds)}</span>
        </div>

        <div className="flex items-center gap-2 rounded-full border border-white/10 bg-zinc-900/90 px-2 py-1 text-[11px]">
          <span className="text-white/50">Grid</span>
          <select
            value={gridResolution}
            onChange={(e) => onGridResolutionChange(e.target.value as GridResolution)}
            className="bg-transparent text-white outline-none"
          >
            <option value="1/2" className="bg-zinc-900 text-white">
              1/2
            </option>
            <option value="1/4" className="bg-zinc-900 text-white">
              1/4
            </option>
            <option value="1/8" className="bg-zinc-900 text-white">
              1/8
            </option>
          </select>
        </div>
      </div>
    </div>
  );
}

"use client";

import { toPercent01 } from "./clamp";

type MeterProps = {
  label?: string;
  value: number;
  min: number;
  max: number;
  color?: "red" | "emerald" | "cyan";
  heightClass?: string;
};

export default function Meter({
  label,
  value,
  min,
  max,
  color = "red",
  heightClass = "h-24",
}: MeterProps) {
  const t = toPercent01(value, min, max);
  const fill = `${t * 100}%`;

  const gradient =
    color === "emerald"
      ? "from-emerald-500/90 via-emerald-300/70 to-white/70"
      : color === "cyan"
        ? "from-cyan-500/90 via-cyan-300/70 to-white/70"
        : "from-red-500/90 via-red-300/70 to-white/70";

  return (
    <div className="flex flex-col items-center gap-2">
      {label && <span className="text-[10px] uppercase tracking-[0.18em] text-white/40">{label}</span>}
      <div className={`relative w-3 ${heightClass} overflow-hidden rounded-full border border-white/10 bg-white/5`}>
        <div
          className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t ${gradient} transition-all duration-150`}
          style={{ height: fill }}
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(255,255,255,0.10),transparent_55%)]" />
      </div>
    </div>
  );
}

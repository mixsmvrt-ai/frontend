type GridResolution = "1/2" | "1/4" | "1/8";

export default function Timeline({
  zoom,
  gridResolution,
  bpm,
  onZoomChange,
}: {
  zoom: number;
  gridResolution: GridResolution;
  bpm: number;
  onZoomChange: (value: number) => void;
}) {
  const baseBarWidth = 80;
  const resolutionFactor: Record<GridResolution, number> = {
    "1/2": 0.5,
    "1/4": 0.25,
    "1/8": 0.125,
  };
  const stepWidth = baseBarWidth * zoom * resolutionFactor[gridResolution];

  return (
    <div className="flex h-10 items-stretch border-b border-white/10 bg-zinc-950/90 text-xs text-white/40">
      {/* Spacer aligned with track header width */}
      <div className="w-60 border-r border-white/10 bg-zinc-950/90" />

      {/* Bar grid + labels above audio area */}
      <div className="relative flex-1 overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              "linear-gradient(to right, rgba(148, 163, 184, 0.35) 1px, transparent 1px)",
            backgroundSize: `${stepWidth}px 100%`,
          }}
        />

        <div className="relative flex items-center justify-between px-4 text-[11px]">
          <div className="flex gap-8">
            {Array.from({ length: 32 }).map((_, i) => (
              <span key={i}>{i + 1}</span>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <span className="rounded-full border border-white/10 bg-black/60 px-2 py-0.5 text-[10px] text-white/60">
              {Math.round(bpm)} BPM
            </span>
            <div className="flex items-center gap-1 rounded-full border border-white/10 bg-black/60 px-1 py-0.5 text-[10px] text-white/60">
              <button
                type="button"
                onClick={() => onZoomChange(Math.max(0.5, zoom - 0.25))}
                className="flex h-5 w-5 items-center justify-center rounded-full hover:bg-white/10"
                aria-label="Zoom out"
              >
                −
              </button>
              <span className="mx-1 min-w-[36px] text-center text-[10px] text-white/50">
                {`${Math.round(zoom * 100)}%`}
              </span>
              <button
                type="button"
                onClick={() => onZoomChange(Math.min(6, zoom + 0.25))}
                className="flex h-5 w-5 items-center justify-center rounded-full hover:bg-white/10"
                aria-label="Zoom in"
              >
                +
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

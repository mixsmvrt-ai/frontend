"use client";

import Link from "next/link";

export function Logo() {
  return (
    <Link
      href="/"
      className="group inline-flex items-center gap-2 font-display text-base font-semibold tracking-[0.32em] text-brand-text/90 uppercase"
      aria-label="MIXSMVRT home"
    >
      <span className="relative inline-flex items-center gap-1">
        <span className="text-brand-text/70 group-hover:text-brand-text transition-colors">MIX</span>
        <span className="relative text-brand-primary group-hover:text-brand-accent transition-colors">
          SMVRT
          <span className="pointer-events-none absolute -bottom-1 left-0 flex h-[6px] w-full items-end justify-between opacity-70 group-hover:opacity-100 group-hover:shadow-[0_0_18px_rgba(225,6,0,0.85)] transition-all">
            {Array.from({ length: 6 }).map((_, index) => {
              const heights = [4, 7, 10, 7, 5, 8];
              return (
                <span
                  // eslint-disable-next-line react/no-array-index-key
                  key={index}
                  className="w-[3px] rounded-t-full bg-gradient-to-t from-brand-primary/70 via-brand-accent/80 to-white/80"
                  style={{ height: heights[index] }}
                />
              );
            })}
          </span>
        </span>
      </span>
    </Link>
  );
}

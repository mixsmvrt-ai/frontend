"use client";

import { useEffect, useMemo, useState } from "react";
import { clamp } from "./clamp";

type EditableValueProps = {
  value: number;
  min: number;
  max: number;
  step?: number;
  decimals?: number;
  unit?: string;
  suffix?: string;
  prefix?: string;
  format?: (value: number) => string;
  onChange: (value: number) => void;
};

export default function EditableValue({
  value,
  min,
  max,
  step,
  decimals = 2,
  unit,
  suffix,
  prefix,
  format,
  onChange,
}: EditableValueProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  const display = useMemo(() => {
    if (format) return format(value);
    const v = Number.isFinite(value) ? value : 0;
    const base = v.toFixed(decimals);
    const withPrefix = prefix ? `${prefix}${base}` : base;
    const withUnit = unit ? `${withPrefix} ${unit}` : withPrefix;
    const withSuffix = suffix ? `${withUnit}${suffix}` : withUnit;
    return withSuffix;
  }, [decimals, format, prefix, suffix, unit, value]);

  useEffect(() => {
    if (!editing) setDraft(String(Number.isFinite(value) ? value : 0));
  }, [editing, value]);

  const commit = () => {
    const parsed = Number.parseFloat(draft);
    if (!Number.isFinite(parsed)) {
      setEditing(false);
      return;
    }
    const next = clamp(parsed, min, max);
    onChange(next);
    setEditing(false);
  };

  if (editing) {
    return (
      <input
        autoFocus
        type="number"
        step={step}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") setEditing(false);
        }}
        className="w-24 rounded-md bg-white/5 px-2 py-1 text-center text-[11px] text-white outline-none ring-1 ring-white/15 focus:ring-red-500/70"
      />
    );
  }

  return (
    <button
      type="button"
      className="rounded-md bg-white/5 px-2 py-1 text-[11px] text-white/80 hover:bg-white/10"
      onClick={() => setEditing(true)}
      title="Click to type value"
    >
      {display}
    </button>
  );
}

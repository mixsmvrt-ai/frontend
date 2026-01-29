"use client";

type ToggleProps = {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
};

export default function Toggle({ label, value, onChange }: ToggleProps) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/40 px-3 py-1 text-[11px] text-white/70 hover:border-red-500/50"
      aria-pressed={value}
    >
      <span className={`h-2.5 w-2.5 rounded-full ${value ? "bg-emerald-400" : "bg-white/20"}`} />
      <span>{label}</span>
    </button>
  );
}

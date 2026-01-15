type KpiCardProps = {
  label: string;
  value: string | number;
  sublabel?: string;
  tone?: "default" | "success" | "warning" | "danger";
};

const toneClasses: Record<NonNullable<KpiCardProps["tone"]>, string> = {
  default: "border-white/10 bg-zinc-900/70",
  success: "border-emerald-500/40 bg-emerald-950/40",
  warning: "border-amber-500/40 bg-amber-950/40",
  danger: "border-red-500/40 bg-red-950/40",
};

export function KpiCard({ label, value, sublabel, tone = "default" }: KpiCardProps) {
  return (
    <div
      className={`flex flex-col justify-between rounded-2xl border p-4 text-xs text-zinc-300 shadow-[0_0_18px_rgba(0,0,0,0.75)] ${toneClasses[tone]}`}
    >
      <span className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">{label}</span>
      <div className="mt-2 text-2xl font-semibold text-white">{value}</div>
      {sublabel && <div className="mt-1 text-[11px] text-zinc-400">{sublabel}</div>}
    </div>
  );
}

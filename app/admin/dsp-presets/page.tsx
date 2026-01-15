"use client";

import { useEffect, useState } from "react";
import { DataTable, type Column } from "../../../components/admin/DataTable";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

type AdminPreset = {
  id: string;
  name: string;
  role: string;
  enabled: boolean;
  version: string;
};

export default function AdminPresetsPage() {
  const [presets, setPresets] = useState<AdminPreset[]>([]);
  const [selected, setSelected] = useState<AdminPreset | null>(null);
  const [hpfCutoff, setHpfCutoff] = useState<number>(100);
  const [compRatio, setCompRatio] = useState<number>(3);
  const [saturation, setSaturation] = useState<number>(0.1);
  const [limiterCeiling, setLimiterCeiling] = useState<number>(-1);

  useEffect(() => {
    async function fetchPresets() {
      try {
        const res = await fetch(`${API_URL}/admin/presets`, { credentials: "include" });
        if (!res.ok) return;
        const data = await res.json();
        setPresets(data.presets || []);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error("Failed to load presets", error);
      }
    }

    void fetchPresets();
  }, []);

  const columns: Column<AdminPreset>[] = [
    { key: "name", header: "Preset" },
    { key: "role", header: "Role" },
    { key: "version", header: "Version" },
    {
      key: "enabled",
      header: "Status",
      render: (preset) => (
        <span
          className={`inline-flex rounded-full px-2 py-0.5 text-[11px] ${
            preset.enabled ? "bg-emerald-500/15 text-emerald-300" : "bg-zinc-700/60 text-zinc-300"
          }`}
        >
          {preset.enabled ? "Enabled" : "Disabled"}
        </span>
      ),
    },
    {
      key: "id",
      header: "",
      render: (preset) => (
        <button
          type="button"
          onClick={() => {
            setSelected(preset);
            // Load existing params for this preset from API
            void (async () => {
              try {
                const res = await fetch(`${API_URL}/admin/presets/${preset.id}`, {
                  credentials: "include",
                });
                if (!res.ok) return;
                const data = await res.json();
                const p = data.preset_params || {};
                if (typeof p.hpf_cutoff === "number") setHpfCutoff(p.hpf_cutoff);
                if (typeof p.comp_ratio === "number") setCompRatio(p.comp_ratio);
                if (typeof p.saturation === "number") setSaturation(p.saturation);
                if (typeof p.limiter_ceiling === "number") setLimiterCeiling(p.limiter_ceiling);
              } catch {
                // ignore
              }
            })();
          }}
          className="text-[11px] text-red-300 underline-offset-4 hover:text-red-200 hover:underline"
        >
          Edit
        </button>
      ),
      className: "text-right",
    },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-white">DSP Presets</h1>
        <p className="mt-1 text-xs text-zinc-400">
          Control vocal and master presets, their versions, and availability.
        </p>
      </div>
      <DataTable columns={columns} data={presets} emptyMessage="No presets yet" />

      {selected && (
        <div className="mt-4 space-y-3 rounded-2xl border border-white/10 bg-black/70 p-4 text-xs text-zinc-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[13px] font-medium">Edit preset: {selected.name}</p>
              <p className="mt-1 text-[11px] text-zinc-400">Tune core DSP parameters for this preset.</p>
            </div>
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="text-[11px] text-zinc-400 underline-offset-4 hover:text-zinc-200 hover:underline"
            >
              Close
            </button>
          </div>

          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="block text-[11px] text-zinc-400">HPF cutoff (Hz)</label>
              <input
                type="number"
                min={20}
                max={300}
                value={hpfCutoff}
                onChange={(e) => setHpfCutoff(Number(e.target.value))}
                className="mt-1 w-full rounded border border-white/10 bg-black/80 px-2 py-1 text-[11px] text-zinc-100 outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] text-zinc-400">Compression ratio</label>
              <input
                type="number"
                step={0.5}
                min={1}
                max={10}
                value={compRatio}
                onChange={(e) => setCompRatio(Number(e.target.value))}
                className="mt-1 w-full rounded border border-white/10 bg-black/80 px-2 py-1 text-[11px] text-zinc-100 outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] text-zinc-400">Saturation amount</label>
              <input
                type="number"
                step={0.05}
                min={0}
                max={1}
                value={saturation}
                onChange={(e) => setSaturation(Number(e.target.value))}
                className="mt-1 w-full rounded border border-white/10 bg-black/80 px-2 py-1 text-[11px] text-zinc-100 outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] text-zinc-400">Limiter ceiling (dB)</label>
              <input
                type="number"
                step={0.1}
                min={-6}
                max={0}
                value={limiterCeiling}
                onChange={(e) => setLimiterCeiling(Number(e.target.value))}
                className="mt-1 w-full rounded border border-white/10 bg-black/80 px-2 py-1 text-[11px] text-zinc-100 outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={async () => {
                try {
                  await fetch(`${API_URL}/admin/presets/${selected.id}`, {
                    method: "POST",
                    credentials: "include",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      hpf_cutoff: hpfCutoff,
                      comp_ratio: compRatio,
                      saturation,
                      limiter_ceiling: limiterCeiling,
                    }),
                  });
                } catch {
                  // ignore
                }
              }}
              className="rounded-full bg-red-600 px-4 py-1.5 text-[11px] font-medium text-white hover:bg-red-500"
            >
              Save preset
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

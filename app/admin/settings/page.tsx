"use client";

import { useEffect, useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

type AdminSettings = {
  maintenance_mode: boolean;
  dsp_version: string;
  max_concurrent_jobs: number;
  max_file_mb: number;
};

const dspVersions = ["stable", "beta", "canary"];

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<AdminSettings | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function fetchSettings() {
      try {
        const res = await fetch(`${API_URL}/admin/settings`, { credentials: "include" });
        if (!res.ok) return;
        const data = await res.json();
        setSettings(data.settings || null);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error("Failed to load settings", error);
      }
    }

    void fetchSettings();
  }, []);

  const update = (patch: Partial<AdminSettings>) => {
    setSettings((prev) => (prev ? { ...prev, ...patch } : prev));
  };

  const save = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      await fetch(`${API_URL}/admin/settings`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Failed to save settings", error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-white">Settings</h1>
        <p className="mt-1 text-xs text-zinc-400">Global platform and DSP controls.</p>
      </div>

      {!settings ? (
        <p className="text-[11px] text-zinc-500">Loading settings…</p>
      ) : (
        <div className="space-y-5 text-xs text-zinc-200">
          <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/60 p-3">
            <div>
              <p className="text-[13px] font-medium">Maintenance mode</p>
              <p className="mt-1 text-[11px] text-zinc-400">
                When enabled, new jobs are paused and users see a maintenance banner.
              </p>
            </div>
            <button
              type="button"
              onClick={() => update({ maintenance_mode: !settings.maintenance_mode })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full border transition-colors ${
                settings.maintenance_mode
                  ? "border-red-500 bg-red-500/30"
                  : "border-zinc-500 bg-zinc-800"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                  settings.maintenance_mode ? "translate-x-5" : "translate-x-1"
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-black/60 p-3">
            <div>
              <p className="text-[13px] font-medium">Global DSP version</p>
              <p className="mt-1 text-[11px] text-zinc-400">
                Choose which DSP preset pack or engine build new jobs should use.
              </p>
            </div>
            <select
              value={settings.dsp_version}
              onChange={(e) => update({ dsp_version: e.target.value })}
              className="rounded border border-white/10 bg-black/70 px-2 py-1 text-[11px] text-zinc-100 outline-none"
            >
              {dspVersions.map((v) => (
                <option key={v} value={v} className="bg-black">
                  {v}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-black/60 p-3">
              <p className="text-[13px] font-medium">Max concurrent jobs</p>
              <p className="mt-1 text-[11px] text-zinc-400">
                Hard limit for how many jobs can run cluster-wide.
              </p>
              <input
                type="number"
                min={1}
                value={settings.max_concurrent_jobs}
                onChange={(e) => update({ max_concurrent_jobs: Number(e.target.value) })}
                className="mt-2 w-24 rounded border border-white/10 bg-black/80 px-2 py-1 text-[11px] text-zinc-100 outline-none"
              />
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/60 p-3">
              <p className="text-[13px] font-medium">Max file size</p>
              <p className="mt-1 text-[11px] text-zinc-400">Largest allowed upload size in MB.</p>
              <input
                type="number"
                min={10}
                value={settings.max_file_mb}
                onChange={(e) => update({ max_file_mb: Number(e.target.value) })}
                className="mt-2 w-24 rounded border border-white/10 bg-black/80 px-2 py-1 text-[11px] text-zinc-100 outline-none"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="rounded-full bg-red-600 px-4 py-1.5 text-[11px] font-medium text-white shadow-[0_0_25px_rgba(248,113,113,0.6)] hover:bg-red-500 disabled:cursor-not-allowed disabled:bg-red-700/60"
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      )}
    </div>
  );
}

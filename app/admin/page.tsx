"use client";

import { useEffect, useState } from "react";
import { KpiCard } from "../../components/admin/KpiCard";
import { DataTable, type Column } from "../../components/admin/DataTable";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

type DashboardStats = {
  total_users: number;
  active_jobs: number;
  jobs_today: number;
  failed_jobs: number;
  revenue_today: number;
  revenue_month: number;
  avg_processing_time: number;
};

type TopPreset = {
  id: string;
  name: string;
  uses: number;
};

type JobsTimeseriesPoint = {
  date: string;
  jobs: number;
};

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [topPresets, setTopPresets] = useState<TopPreset[]>([]);
   const [jobsSeries, setJobsSeries] = useState<JobsTimeseriesPoint[]>([]);

  useEffect(() => {
    async function fetchDashboard() {
      try {
        const res = await fetch(`${API_URL}/admin/dashboard`, { credentials: "include" });
        if (!res.ok) return;
        const data = await res.json();
        setStats(data.stats);
        setTopPresets(data.top_presets || []);
        setJobsSeries(data.jobs_timeseries || []);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error("Failed to load admin dashboard", error);
      }
    }

    void fetchDashboard();
  }, []);

  const columns: Column<TopPreset>[] = [
    { key: "name", header: "Preset" },
    { key: "uses", header: "Uses" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-white">Admin Dashboard</h1>
        <p className="mt-1 text-xs text-zinc-400">
          Live overview of MIXSMVRT usage, revenue, and processing health.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-4">
        <KpiCard label="Total Users" value={stats?.total_users ?? "–"} />
        <KpiCard label="Active Jobs" value={stats?.active_jobs ?? "–"} tone="warning" />
        <KpiCard label="Jobs Today" value={stats?.jobs_today ?? "–"} />
        <KpiCard label="Failed Jobs" value={stats?.failed_jobs ?? "–"} tone="danger" />
        <KpiCard
          label="Revenue Today"
          value={stats ? `$${stats.revenue_today.toFixed(2)}` : "–"}
          tone="success"
        />
        <KpiCard
          label="Revenue This Month"
          value={stats ? `$${stats.revenue_month.toFixed(2)}` : "–"}
          tone="success"
        />
        <KpiCard
          label="Avg Processing Time"
          value={stats ? `${stats.avg_processing_time.toFixed(1)}s` : "–"}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white">Most-used presets</h2>
            <span className="text-[11px] text-zinc-500">Last 7 days</span>
          </div>
          <DataTable columns={columns} data={topPresets} emptyMessage="No usage data yet" />
        </section>

        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white">Server status</h2>
          </div>
          <div className="grid gap-3 text-xs text-zinc-300 md:grid-cols-2">
            <div className="rounded-2xl border border-emerald-500/40 bg-emerald-950/40 p-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] uppercase tracking-[0.16em] text-emerald-300">
                  DSP Engine
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] text-emerald-300">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.9)]" />
                  Healthy
                </span>
              </div>
              <p className="mt-2 text-[11px] text-emerald-100/80">
                FastAPI / Mix engine responding within SLA for most jobs.
              </p>
            </div>
            <div className="rounded-2xl border border-amber-500/40 bg-amber-950/40 p-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] uppercase tracking-[0.16em] text-amber-300">
                  Queue & Workers
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] text-amber-300">
                  <span className="h-2 w-2 rounded-full bg-amber-300 shadow-[0_0_6px_rgba(252,211,77,0.9)]" />
                  Warm
                </span>
              </div>
              <p className="mt-2 text-[11px] text-amber-100/80">
                Keep an eye on spikes around release days.
              </p>
            </div>
          </div>

          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-medium text-zinc-200">Jobs over time</h3>
              <span className="text-[11px] text-zinc-500">Last 14 days</span>
            </div>
            <div className="flex h-36 items-center justify-center rounded-2xl border border-white/10 bg-black/60 text-[11px] text-zinc-500">
              Timeseries chart temporarily disabled (Recharts not installed).
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

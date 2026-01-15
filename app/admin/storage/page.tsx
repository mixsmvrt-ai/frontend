"use client";

import { useEffect, useState } from "react";
import { KpiCard } from "../../../components/admin/KpiCard";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

type StorageStats = {
  total_gb: number;
  avg_per_user_gb: number;
  auto_delete_after_days: number | null;
};

export default function AdminStoragePage() {
  const [stats, setStats] = useState<StorageStats | null>(null);

  useEffect(() => {
    async function fetchStorage() {
      try {
        const res = await fetch(`${API_URL}/admin/storage`, { credentials: "include" });
        if (!res.ok) return;
        const data = await res.json();
        setStats(data.stats || null);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error("Failed to load storage stats", error);
      }
    }

    void fetchStorage();
  }, []);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-white">Storage</h1>
        <p className="mt-1 text-xs text-zinc-400">Monitor S3 usage and retention policies.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <KpiCard
          label="Total Storage"
          value={stats ? `${stats.total_gb.toFixed(1)} GB` : "–"}
          tone="warning"
        />
        <KpiCard
          label="Avg per User"
          value={stats ? `${stats.avg_per_user_gb.toFixed(2)} GB` : "–"}
        />
        <KpiCard
          label="Auto-Delete"
          value={stats?.auto_delete_after_days ? `${stats.auto_delete_after_days} days` : "Off"}
        />
      </div>
    </div>
  );
}

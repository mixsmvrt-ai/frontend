"use client";

import { useEffect, useState } from "react";
import { DataTable, type Column } from "../../../components/admin/DataTable";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

type AdminLog = {
  id: string;
  level: "INFO" | "WARN" | "ERROR";
  source: string;
  message: string;
  created_at: string;
};

export default function AdminLogsPage() {
  const [logs, setLogs] = useState<AdminLog[]>([]);

  useEffect(() => {
    async function fetchLogs() {
      try {
        const res = await fetch(`${API_URL}/admin/logs`, { credentials: "include" });
        if (!res.ok) return;
        const data = await res.json();
        setLogs(data.logs || []);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error("Failed to load logs", error);
      }
    }

    void fetchLogs();
  }, []);

  const columns: Column<AdminLog>[] = [
    { key: "created_at", header: "Time" },
    { key: "source", header: "Source" },
    {
      key: "level",
      header: "Level",
      render: (log) => (
        <span
          className={`inline-flex rounded-full px-2 py-0.5 text-[11px] ${
            log.level === "ERROR"
              ? "bg-red-500/10 text-red-300"
              : log.level === "WARN"
              ? "bg-amber-500/10 text-amber-200"
              : "bg-zinc-700/60 text-zinc-200"
          }`}
        >
          {log.level}
        </span>
      ),
    },
    { key: "message", header: "Message" },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-white">Logs & Errors</h1>
        <p className="mt-1 text-xs text-zinc-400">Inspect API and DSP logs, failures, and stack traces.</p>
      </div>
      <DataTable columns={columns} data={logs} emptyMessage="No logs yet" />
    </div>
  );
}

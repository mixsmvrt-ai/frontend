"use client";

import { useEffect, useState } from "react";
import { DataTable, type Column } from "../../../components/admin/DataTable";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

type AdminJob = {
  id: string;
  user_email: string;
  status: "active" | "completed" | "failed";
  input_type: "single" | "stems";
  preset: string | null;
  duration_sec: number;
};

export default function AdminJobsPage() {
  const [jobs, setJobs] = useState<AdminJob[]>([]);

  useEffect(() => {
    async function fetchJobs() {
      try {
        const res = await fetch(`${API_URL}/admin/jobs`, { credentials: "include" });
        if (!res.ok) return;
        const data = await res.json();
        setJobs(data.jobs || []);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error("Failed to load jobs", error);
      }
    }

    void fetchJobs();
  }, []);

  const columns: Column<AdminJob>[] = [
    { key: "user_email", header: "User" },
    { key: "preset", header: "Preset" },
    {
      key: "input_type",
      header: "Input Type",
      render: (job) => (job.input_type === "stems" ? "Stems" : "Single"),
    },
    {
      key: "duration_sec",
      header: "Duration",
      render: (job) => `${job.duration_sec.toFixed(1)}s`,
    },
    {
      key: "status",
      header: "Status",
      render: (job) => (
        <span
          className={`inline-flex rounded-full px-2 py-0.5 text-[11px] ${
            job.status === "completed"
              ? "bg-emerald-500/15 text-emerald-300"
              : job.status === "active"
              ? "bg-amber-500/10 text-amber-300"
              : "bg-red-500/10 text-red-300"
          }`}
        >
          {job.status}
        </span>
      ),
    },
    {
      key: "id",
      header: "",
      render: (job) => (
        <a
          href={`/admin/jobs/${job.id}`}
          className="text-[11px] text-red-300 underline-offset-4 hover:text-red-200 hover:underline"
        >
          View
        </a>
      ),
      className: "text-right",
    },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-white">Jobs</h1>
        <p className="mt-1 text-xs text-zinc-400">Monitor and control active, completed, and failed jobs.</p>
      </div>
      <DataTable columns={columns} data={jobs} emptyMessage="No jobs yet" />
    </div>
  );
}

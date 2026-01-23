"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

type AdminUserDetail = {
  id: string;
  email: string;
  plan: string | null;
  country: string | null;
  status: "active" | "suspended" | "banned";
  credits: number;
  jobs_count: number;
};

export default function AdminUserDetailPage() {
  const params = useParams<{ id: string }>();
  const userId = params?.id ?? "";
  const [user, setUser] = useState<AdminUserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [creditDelta, setCreditDelta] = useState(10);

  useEffect(() => {
    async function fetchUser() {
      try {
        const res = await fetch(`${API_URL}/admin/users/${userId}`, { credentials: "include" });
        if (!res.ok) return;
        const data = await res.json();
        setUser(data.user || null);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error("Failed to load user", error);
      } finally {
        setLoading(false);
      }
    }

    if (userId) void fetchUser();
  }, [userId]);

  const updateStatus = async (status: "active" | "suspended" | "banned") => {
    if (!user) return;
    try {
      await fetch(`${API_URL}/admin/users/${user.id}/status`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      setUser({ ...user, status });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Failed to update status", error);
    }
  };

  const grantCredits = async () => {
    if (!user) return;
    try {
      await fetch(`${API_URL}/admin/users/${user.id}/credits`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ delta: creditDelta }),
      });
      setUser({ ...user, credits: user.credits + creditDelta });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Failed to grant credits", error);
    }
  };

  if (loading || !user) {
    return <p className="text-[11px] text-zinc-500">Loading user…</p>;
  }

  return (
    <div className="space-y-5 text-xs text-zinc-200">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">{user.email}</h1>
          <p className="mt-1 text-[11px] text-zinc-400">Plan: {user.plan || "Free"}</p>
        </div>
        <span
          className={`inline-flex rounded-full px-3 py-1 text-[11px] ${
            user.status === "active"
              ? "bg-emerald-500/15 text-emerald-300"
              : user.status === "suspended"
              ? "bg-amber-500/10 text-amber-300"
              : "bg-red-500/10 text-red-300"
          }`}
        >
          {user.status}
        </span>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-black/60 p-3">
          <p className="text-[11px] text-zinc-500">Country</p>
          <p className="mt-1 text-[13px]">{user.country || "Unknown"}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-black/60 p-3">
          <p className="text-[11px] text-zinc-500">Credits</p>
          <p className="mt-1 text-[13px]">{user.credits}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-black/60 p-3">
          <p className="text-[11px] text-zinc-500">Jobs</p>
          <p className="mt-1 text-[13px]">{user.jobs_count}</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2 rounded-2xl border border-white/10 bg-black/60 p-3">
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-zinc-500">Status</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => updateStatus("active")}
              className="rounded-full bg-emerald-600 px-3 py-1 text-[11px] text-white hover:bg-emerald-500"
            >
              Activate
            </button>
            <button
              type="button"
              onClick={() => updateStatus("suspended")}
              className="rounded-full bg-amber-600 px-3 py-1 text-[11px] text-white hover:bg-amber-500"
            >
              Suspend
            </button>
            <button
              type="button"
              onClick={() => updateStatus("banned")}
              className="rounded-full bg-red-600 px-3 py-1 text-[11px] text-white hover:bg-red-500"
            >
              Ban
            </button>
          </div>
        </div>

        <div className="space-y-2 rounded-2xl border border-white/10 bg-black/60 p-3">
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-zinc-500">Bonus credits</p>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={1}
              value={creditDelta}
              onChange={(e) => setCreditDelta(Number(e.target.value))}
              className="w-20 rounded border border-white/10 bg-black/80 px-2 py-1 text-[11px] text-zinc-100 outline-none"
            />
            <button
              type="button"
              onClick={grantCredits}
              className="rounded-full bg-red-600 px-3 py-1 text-[11px] text-white hover:bg-red-500"
            >
              Grant
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { DataTable, type Column } from "../../../components/admin/DataTable";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

type AdminPayment = {
  id: string;
  user_email: string;
  amount: number;
  provider: string;
  status: string;
  created_at: string;
};

type RevenuePoint = {
  date: string;
  amount: number;
};

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<AdminPayment[]>([]);
  const [revenueSeries, setRevenueSeries] = useState<RevenuePoint[]>([]);

  useEffect(() => {
    async function fetchPayments() {
      try {
        const res = await fetch(`${API_URL}/admin/payments`, { credentials: "include" });
        if (!res.ok) return;
        const data = await res.json();
        setPayments(data.payments || []);
        setRevenueSeries(data.revenue_timeseries || []);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error("Failed to load payments", error);
      }
    }

    void fetchPayments();
  }, []);

  const columns: Column<AdminPayment>[] = [
    { key: "created_at", header: "Date" },
    { key: "user_email", header: "User" },
    {
      key: "amount",
      header: "Amount",
      render: (p) => `$${p.amount.toFixed(2)}`,
    },
    { key: "provider", header: "Provider" },
    { key: "status", header: "Status" },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-white">Payments</h1>
        <p className="mt-1 text-xs text-zinc-400">Review revenue, transactions, and refunds.</p>
      </div>

      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white">Revenue</h2>
          <span className="text-[11px] text-zinc-500">Last 30 days</span>
        </div>
        <div className="h-40 rounded-2xl border border-white/10 bg-black/60 px-3 py-2">
          {revenueSeries.length === 0 ? (
            <div className="flex h-full items-center justify-center text-[11px] text-zinc-500">
              No revenue data yet.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueSeries} margin={{ top: 4, right: 8, bottom: 4, left: -12 }}>
                <defs>
                  <linearGradient id="revenueArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#22c55e" stopOpacity={0.9} />
                    <stop offset="100%" stopColor="#22c55e" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 10, fill: "#9ca3af" }}
                  minTickGap={16}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 10, fill: "#9ca3af" }}
                  width={32}
                />
                <Tooltip
                  cursor={{ stroke: "#22c55e", strokeWidth: 1, strokeOpacity: 0.4 }}
                  formatter={(value: number) => [`$${value.toFixed(2)}`, "Revenue"]}
                  contentStyle={{
                    backgroundColor: "#020617",
                    borderRadius: 8,
                    border: "1px solid rgba(148,163,184,0.4)",
                    fontSize: 11,
                  }}
                  labelStyle={{ color: "#e5e7eb" }}
                />
                <Area
                  type="monotone"
                  dataKey="amount"
                  stroke="#22c55e"
                  strokeWidth={1.8}
                  fill="url(#revenueArea)"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </section>

      <DataTable columns={columns} data={payments} emptyMessage="No payments yet" />
    </div>
  );
}

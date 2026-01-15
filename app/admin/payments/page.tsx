"use client";

import { useEffect, useState } from "react";
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
        <div className="flex h-40 items-center justify-center rounded-2xl border border-white/10 bg-black/60 text-[11px] text-zinc-500">
          Revenue chart temporarily disabled (Recharts not installed).
        </div>
      </section>

      <DataTable columns={columns} data={payments} emptyMessage="No payments yet" />
    </div>
  );
}

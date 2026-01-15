"use client";

import { useEffect, useState } from "react";
import { DataTable, type Column } from "../../../components/admin/DataTable";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

type AdminPlan = {
  id: string;
  name: string;
  price_month: number;
  credits: number;
  stem_limit: number | null;
};

export default function AdminPricingPage() {
  const [plans, setPlans] = useState<AdminPlan[]>([]);

  useEffect(() => {
    async function fetchPlans() {
      try {
        const res = await fetch(`${API_URL}/admin/plans`, { credentials: "include" });
        if (!res.ok) return;
        const data = await res.json();
        setPlans(data.plans || []);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error("Failed to load plans", error);
      }
    }

    void fetchPlans();
  }, []);

  const columns: Column<AdminPlan>[] = [
    { key: "name", header: "Plan" },
    {
      key: "price_month",
      header: "Price / mo",
      render: (plan) => `$${plan.price_month.toFixed(2)}`,
    },
    { key: "credits", header: "Credits" },
    {
      key: "stem_limit",
      header: "Stem Limit",
      render: (plan) => (plan.stem_limit ? `${plan.stem_limit}` : "Unlimited"),
    },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-white">Pricing & Plans</h1>
        <p className="mt-1 text-xs text-zinc-400">Define plans, limits, and promo structures.</p>
      </div>
      <DataTable columns={columns} data={plans} emptyMessage="No plans yet" />
    </div>
  );
}

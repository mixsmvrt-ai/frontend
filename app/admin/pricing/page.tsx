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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Partial<AdminPlan> | null>(null);

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

  const startEditing = (plan: AdminPlan) => {
    setEditingId(plan.id);
    setDraft({ ...plan });
  };

  const cancelEditing = () => {
    setEditingId(null);
    setDraft(null);
  };

  const saveEditing = async () => {
    if (!editingId || !draft) return;

    const body: Record<string, unknown> = {};
    if (typeof draft.name === "string") body.name = draft.name;
    if (typeof draft.price_month === "number") body.price_month = draft.price_month;
    if (typeof draft.credits === "number") body.credits = draft.credits;
    if (typeof draft.stem_limit === "number" || draft.stem_limit === null)
      body.stem_limit = draft.stem_limit;

    try {
      const res = await fetch(`${API_URL}/admin/plans/${editingId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) return;
      const data = await res.json();
      const updated: AdminPlan | undefined = data.plan;
      if (updated) {
        setPlans((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      }
    } catch {
      // ignore, keep existing plans
    }

    setEditingId(null);
    setDraft(null);
  };

  const columns: Column<AdminPlan>[] = [
    { key: "name", header: "Plan" },
    {
      key: "price_month",
      header: "Price / mo",
      render: (plan) => {
        if (editingId === plan.id && draft) {
          return (
            <input
              type="number"
              step="0.01"
              value={draft.price_month ?? 0}
              onChange={(event) =>
                setDraft({ ...draft, price_month: parseFloat(event.target.value || "0") })
              }
              className="w-20 rounded border border-white/15 bg-black/40 px-2 py-1 text-xs text-white outline-none focus:border-brand-accent"
            />
          );
        }
        return `$${plan.price_month.toFixed(2)}`;
      },
    },
    {
      key: "credits",
      header: "Credits",
      render: (plan) => {
        if (editingId === plan.id && draft) {
          return (
            <input
              type="number"
              value={draft.credits ?? 0}
              onChange={(event) =>
                setDraft({ ...draft, credits: parseInt(event.target.value || "0", 10) })
              }
              className="w-20 rounded border border-white/15 bg-black/40 px-2 py-1 text-xs text-white outline-none focus:border-brand-accent"
            />
          );
        }
        return plan.credits;
      },
    },
    {
      key: "stem_limit",
      header: "Stem Limit",
      render: (plan) => {
        if (editingId === plan.id && draft) {
          return (
            <input
              type="number"
              placeholder="Unlimited"
              value={draft.stem_limit ?? ""}
              onChange={(event) => {
                const value = event.target.value;
                setDraft({
                  ...draft,
                  stem_limit: value === "" ? null : parseInt(value, 10),
                });
              }}
              className="w-24 rounded border border-white/15 bg-black/40 px-2 py-1 text-xs text-white outline-none focus:border-brand-accent"
            />
          );
        }
        return plan.stem_limit ? `${plan.stem_limit}` : "Unlimited";
      },
    },
    {
      key: "actions",
      header: "Actions",
      render: (plan) => {
        const isEditing = editingId === plan.id;
        return (
          <div className="flex gap-2 text-[11px]">
            {isEditing ? (
              <>
                <button
                  type="button"
                  onClick={saveEditing}
                  className="rounded-full bg-brand-primary px-3 py-1 font-medium text-black hover:bg-brand-accent"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={cancelEditing}
                  className="rounded-full border border-white/20 px-3 py-1 text-zinc-300 hover:border-zinc-400"
                >
                  Cancel
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => startEditing(plan)}
                className="rounded-full border border-white/20 px-3 py-1 text-zinc-300 hover:border-brand-accent hover:text-brand-accent"
              >
                Edit
              </button>
            )}
          </div>
        );
      },
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

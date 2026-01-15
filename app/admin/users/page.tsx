"use client";

import { useEffect, useState } from "react";
import { DataTable, type Column } from "../../../components/admin/DataTable";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

type AdminUser = {
  id: string;
  email: string;
  plan: string | null;
  country: string | null;
  status: "active" | "suspended" | "banned";
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);

  useEffect(() => {
    async function fetchUsers() {
      try {
        const res = await fetch(`${API_URL}/admin/users`, { credentials: "include" });
        if (!res.ok) return;
        const data = await res.json();
        setUsers(data.users || []);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error("Failed to load users", error);
      }
    }

    void fetchUsers();
  }, []);

  const columns: Column<AdminUser>[] = [
    { key: "email", header: "Email" },
    { key: "plan", header: "Plan" },
    { key: "country", header: "Country" },
    {
      key: "status",
      header: "Status",
      render: (user) => (
        <span
          className={`inline-flex rounded-full px-2 py-0.5 text-[11px] ${
            user.status === "active"
              ? "bg-emerald-500/15 text-emerald-300"
              : user.status === "suspended"
              ? "bg-amber-500/10 text-amber-300"
              : "bg-red-500/10 text-red-300"
          }`}
        >
          {user.status}
        </span>
      ),
    },
    {
      key: "id",
      header: "",
      render: (user) => (
        <a
          href={`/admin/users/${user.id}`}
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
        <h1 className="text-xl font-semibold text-white">Users</h1>
        <p className="mt-1 text-xs text-zinc-400">Manage accounts, plans, and account health.</p>
      </div>
      <DataTable columns={columns} data={users} emptyMessage="No users yet" />
    </div>
  );
}

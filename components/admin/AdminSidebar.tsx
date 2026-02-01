"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const BASE_URL = (API_URL as string).replace(/\/$/, "");

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

const navItems = [
  { href: "/admin", label: "Dashboard", icon: "📊" },
  { href: "/admin/users", label: "Users", icon: "👤" },
  { href: "/admin/jobs", label: "Jobs", icon: "🎚" },
  { href: "/admin/dsp-presets", label: "DSP Presets", icon: "🎛" },
  { href: "/admin/pricing", label: "Pricing & Plans", icon: "💳" },
  { href: "/admin/payments", label: "Payments", icon: "💰" },
  { href: "/admin/tickets", label: "Tickets", icon: "🎟" },
  { href: "/admin/storage", label: "Storage", icon: "💾" },
  { href: "/admin/logs", label: "Logs", icon: "📜" },
  { href: "/admin/content", label: "Content", icon: "📺" },
  { href: "/admin/settings", label: "Settings", icon: "⚙️" },
];

export function AdminSidebar() {
  const pathname = usePathname() ?? "/admin";
  const [openTicketCount, setOpenTicketCount] = useState<number | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadTicketStats() {
      try {
        const res = await fetch(`${BASE_URL}/admin/support/tickets/stats`, {
          credentials: "include",
        });
        if (!res.ok) return;
        const data: { total: number; open: number; resolved: number; closed: number } = await res.json();
        if (!isMounted) return;
        setOpenTicketCount(data.open);
      } catch {
        // Sidebar should remain functional even if stats fail to load.
      }
    }

    void loadTicketStats();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <aside className="hidden w-60 flex-shrink-0 flex-col border-r border-white/10 bg-black/95/90 px-3 py-4 text-xs text-white/70 md:flex">
      <div className="mb-4 px-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-red-500/80">
        MIXSMVRT Admin
      </div>
      <nav className="space-y-1">
        {navItems.map((item) => {
          const active =
            item.href === "/admin"
              ? pathname === "/admin"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2 rounded-lg px-2 py-2 text-[12px] transition-colors",
                active
                  ? "bg-red-600/20 text-red-200 shadow-[0_0_0_1px_rgba(248,113,113,0.35)]"
                  : "text-zinc-400 hover:bg-white/5 hover:text-white",
              )}
            >
              <span className="text-base" aria-hidden>
                {item.icon}
              </span>
              <span className="flex flex-1 items-center justify-between">
                <span>{item.label}</span>
                {item.label === "Tickets" && openTicketCount && openTicketCount > 0 && (
                  <span className="ml-2 inline-flex min-w-[1.5rem] items-center justify-center rounded-full bg-red-600/80 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                    {openTicketCount}
                  </span>
                )}
              </span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

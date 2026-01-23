"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

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
  { href: "/admin/storage", label: "Storage", icon: "💾" },
  { href: "/admin/logs", label: "Logs", icon: "📜" },
  { href: "/admin/content", label: "Content", icon: "📺" },
  { href: "/admin/settings", label: "Settings", icon: "⚙️" },
];

export function AdminSidebar() {
  const pathname = usePathname() ?? "/admin";

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
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

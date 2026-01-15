"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { supabase, isSupabaseConfigured } from "../../lib/supabaseClient";
import { AdminSidebar } from "../../components/admin/AdminSidebar";
import { AdminTopbar } from "../../components/admin/AdminTopbar";

export default function AdminLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [authorized, setAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function checkAuth() {
      if (!isSupabaseConfigured || !supabase) {
        if (!isMounted) return;
        setAuthorized(false);
        router.replace("/login");
        return;
      }

      const { data } = await supabase.auth.getUser();
      const user = data.user;
      const role = (user?.user_metadata as any)?.role ?? (user?.app_metadata as any)?.role;

      const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL || "mixsmvrt@gmail.com";
      const isAdminByEmail = Boolean(user && user.email === adminEmail);
      const isAdminByRole = Boolean(user && role === "admin");
      const isAdmin = isAdminByEmail || isAdminByRole;

      if (!isMounted) return;
      if (!isAdmin) {
        setAuthorized(false);
        router.replace("/login?redirect=" + encodeURIComponent(pathname));
      } else {
        setAuthorized(true);
      }
    }

    void checkAuth();

    return () => {
      isMounted = false;
    };
  }, [router, pathname]);

  if (authorized === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black text-xs text-zinc-400">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-red-500 border-t-transparent" />
          <span>Entering control room…</span>
        </div>
      </div>
    );
  }

  if (!authorized) {
    return null;
  }

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-black via-zinc-950 to-black text-white">
      <AdminSidebar />
      <div className="flex min-h-screen flex-1 flex-col overflow-hidden">
        <AdminTopbar />
        <main className="flex-1 overflow-y-auto bg-gradient-to-b from-black/80 via-zinc-950/80 to-black p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}

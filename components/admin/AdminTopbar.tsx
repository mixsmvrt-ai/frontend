"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase, isSupabaseConfigured } from "../../lib/supabaseClient";

export function AdminTopbar() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;

    let isMounted = true;

    supabase.auth
      .getUser()
      .then(({ data }) => {
        if (!isMounted) return;
        setEmail(data.user?.email ?? null);
      })
      .catch(() => {
        if (!isMounted) return;
        setEmail(null);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleSignOut = async () => {
    if (!isSupabaseConfigured || !supabase) return;
    await supabase.auth.signOut();
    router.push("/");
  };

  return (
    <header className="flex h-12 items-center justify-between border-b border-white/10 bg-black/90 px-4 text-xs text-white/70">
      <div className="flex items-center gap-2 text-[11px] text-zinc-400">
        <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)]" />
        <span>Control Room</span>
      </div>
      <div className="flex items-center gap-3">
        {email && <span className="text-[11px] text-zinc-400">{email}</span>}
        <button
          type="button"
          onClick={handleSignOut}
          className="rounded-full border border-red-500/40 px-3 py-1 text-[11px] text-red-300 hover:border-red-500 hover:bg-red-500/10"
        >
          Exit Admin
        </button>
      </div>
    </header>
  );
}

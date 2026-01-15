"use client";

import { useEffect, useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

type Testimonial = {
  id: string;
  name: string;
  role: string;
  quote: string;
};

type Announcement = {
  id: string;
  title: string;
  body: string;
  active: boolean;
};

export default function AdminContentPage() {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);

  useEffect(() => {
    async function fetchContent() {
      try {
        const res = await fetch(`${API_URL}/admin/content`, { credentials: "include" });
        if (!res.ok) return;
        const data = await res.json();
        setTestimonials(data.testimonials || []);
        setAnnouncements(data.announcements || []);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error("Failed to load content", error);
      }
    }

    void fetchContent();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-white">Content Manager</h1>
        <p className="mt-1 text-xs text-zinc-400">Control testimonials, feature cards, and announcements.</p>
      </div>

      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white">Testimonials</h2>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {testimonials.map((t) => (
            <div key={t.id} className="rounded-2xl border border-white/10 bg-black/60 p-3 text-xs text-zinc-200">
              <p className="text-[13px]">“{t.quote}”</p>
              <p className="mt-2 text-[11px] text-zinc-400">
                {t.name} · {t.role}
              </p>
            </div>
          ))}
          {testimonials.length === 0 && (
            <p className="text-[11px] text-zinc-500">No testimonials configured yet.</p>
          )}
        </div>
      </section>

      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white">Announcements</h2>
        </div>
        <div className="space-y-3">
          {announcements.map((a) => (
            <div key={a.id} className="flex items-start justify-between gap-3 rounded-2xl border border-white/10 bg-black/60 p-3 text-xs text-zinc-200">
              <div>
                <p className="text-[13px] font-medium">{a.title}</p>
                <p className="mt-1 text-[11px] text-zinc-400">{a.body}</p>
              </div>
              <span
                className={`inline-flex rounded-full px-2 py-0.5 text-[10px] ${
                  a.active ? "bg-emerald-500/15 text-emerald-300" : "bg-zinc-700/60 text-zinc-300"
                }`}
              >
                {a.active ? "Active" : "Inactive"}
              </span>
            </div>
          ))}
          {announcements.length === 0 && (
            <p className="text-[11px] text-zinc-500">No announcements configured yet.</p>
          )}
        </div>
      </section>
    </div>
  );
}

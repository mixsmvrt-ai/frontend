"use client";

import { useState, FormEvent } from "react";
import { ProtectedPage } from "../../components/ProtectedPage";
import { supabase, isSupabaseConfigured } from "../../lib/supabaseClient";

export default function SupportPage() {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setErrorMessage(null);
    setStatus("idle");

    if (!subject.trim() || !message.trim()) {
      setErrorMessage("Please add a subject and message before sending.");
      return;
    }

    if (!isSupabaseConfigured || !supabase) {
      setErrorMessage("Support is temporarily unavailable. Please email support@mixsmvrt.com.");
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      const userId = user?.id ?? null;
      const email = user?.email ?? "unknown@mixsmvrt.com";

      const baseUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "";
      const res = await fetch(`${baseUrl}/api/support/tickets`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_id: userId,
          email,
          subject: subject.trim(),
          message: message.trim(),
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to send support request");
      }

      setStatus("success");
      setSubject("");
      setMessage("");
    } catch (error) {
      setStatus("error");
      setErrorMessage("Something went wrong sending your message. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <ProtectedPage
      title="Support"
      subtitle="Get help with your sessions, billing or technical issues."
    >
      <div className="grid gap-6 lg:grid-cols-[1.1fr,0.9fr]">
        <div className="rounded-2xl border border-white/5 bg-black/40 p-6 text-sm text-white/80">
          <p className="font-medium text-white/90">Contact support</p>
          <p className="mt-1 text-xs text-white/55">
            Reach out with links to your projects or reference tracks so we can help you faster.
          </p>

          <form onSubmit={handleSubmit} className="mt-4 space-y-3 text-xs">
            <div>
              <label className="text-[11px] font-medium text-white/70">Subject</label>
              <input
                className="mt-1 w-full rounded-lg border border-white/10 bg-black/60 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-red-500 focus:outline-none"
                placeholder="Mix feedback, billing, technical issue…"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </div>
            <div>
              <label className="text-[11px] font-medium text-white/70">Message</label>
              <textarea
                rows={4}
                className="mt-1 w-full rounded-lg border border-white/10 bg-black/60 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-red-500 focus:outline-none"
                placeholder="Share as much context as you can, including project IDs or links."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
            </div>
            {errorMessage && (
              <p className="text-[11px] text-red-400">{errorMessage}</p>
            )}
            {status === "success" && !errorMessage && (
              <p className="text-[11px] text-emerald-400">
                Thanks – your message was sent. We&apos;ll get back to you via email.
              </p>
            )}
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center rounded-full bg-red-600 px-4 py-2 text-xs font-medium text-white shadow-[0_0_22px_rgba(225,6,0,0.85)] hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "Sending…" : "Send message"}
            </button>
          </form>
        </div>

        <div className="rounded-2xl border border-white/5 bg-black/40 p-6 text-sm text-white/80">
          <p className="font-medium text-white/90">FAQs</p>
          <p className="mt-1 text-xs text-white/55">
            We&apos;ll publish the most common questions here as MIXSMVRT grows.
          </p>

          <div className="mt-4 space-y-3 text-xs text-white/70">
            <div className="rounded-xl border border-dashed border-white/10 bg-black/30 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/40">
                Rendering
              </p>
              <p className="mt-1 text-white/80">How long does a mix or master take?</p>
              <p className="mt-1 text-white/50">
                Times depend on your audio length and queue. We&apos;ll surface live status here soon.
              </p>
            </div>
            <div className="rounded-xl border border-dashed border-white/10 bg-black/30 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/40">
                Accounts
              </p>
              <p className="mt-1 text-white/80">Can I move between Free and Pro?</p>
              <p className="mt-1 text-white/50">
                Yes. You&apos;ll be able to change plans at any time from Billing.
              </p>
            </div>
          </div>
        </div>
      </div>
    </ProtectedPage>
  );
}

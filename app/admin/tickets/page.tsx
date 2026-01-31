"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

type SupportTicket = {
  id: string;
  user_id: string | null;
  email: string;
  subject: string;
  message: string;
  status: string;
  created_at: string;
};

export default function AdminTicketsPage() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadTickets() {
      setIsLoading(true);
      setError(null);
      try {
        const baseUrl = API_URL.replace(/\/$/, "");
        const res = await fetch(`${baseUrl}/admin/support/tickets`, {
          credentials: "include",
        });
        if (!res.ok) {
          throw new Error("Failed to load tickets");
        }
        const data: { tickets: SupportTicket[] } = await res.json();
        setTickets(data.tickets ?? []);
      } catch (err) {
        setError("Could not fetch tickets. Please check the backend.");
      } finally {
        setIsLoading(false);
      }
    }

    void loadTickets();
  }, []);

  function formatDate(iso: string) {
    const d = new Date(iso);
    return d.toLocaleString();
  }

  function buildMailto(ticket: SupportTicket) {
    const subject = `[MIXSMVRT Support] Re: ${ticket.subject}`;
    const bodyLines = [
      `Hi,`,
      "",
      "Thanks for reaching out about:",
      `"${ticket.subject}"`,
      "",
      "Original ticket:",
      ticket.message,
      "",
      "---", 
      "Replying via MIXSMVRT admin panel.",
    ];
    const body = encodeURIComponent(bodyLines.join("\n"));
    const encodedSubject = encodeURIComponent(subject);
    return `mailto:${encodeURIComponent(ticket.email)}?subject=${encodedSubject}&body=${body}`;
  }

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-white">Support tickets</h1>
          <p className="mt-1 text-xs text-zinc-400">
            View messages submitted from the Support page and reply via email.
          </p>
        </div>
      </header>

      <div className="rounded-2xl border border-white/10 bg-black/60 p-4 text-xs text-white/80">
        {isLoading ? (
          <p className="text-zinc-400">Loading tickets…</p>
        ) : error ? (
          <p className="text-red-400">{error}</p>
        ) : tickets.length === 0 ? (
          <p className="text-zinc-400">No tickets yet. Messages sent from the Support page will appear here.</p>
        ) : (
          <div className="space-y-3">
            {tickets.map((ticket) => (
              <div
                key={ticket.id}
                className="rounded-xl border border-white/10 bg-black/70 p-4 transition hover:border-red-500/60 hover:bg-black/80"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-medium text-white">{ticket.subject}</p>
                    <p className="mt-0.5 text-[11px] text-zinc-400">
                      From <span className="font-mono text-zinc-200">{ticket.email}</span>
                      {ticket.user_id && (
                        <span className="ml-1 text-zinc-500">· User ID {ticket.user_id}</span>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-zinc-400">
                    <span
                      className="inline-flex items-center rounded-full bg-zinc-800/80 px-2 py-0.5 text-[10px] uppercase tracking-wide"
                    >
                      {ticket.status}
                    </span>
                    <span>{formatDate(ticket.created_at)}</span>
                  </div>
                </div>

                <p className="mt-3 max-h-32 overflow-y-auto whitespace-pre-wrap text-[11px] text-zinc-200">
                  {ticket.message}
                </p>

                <div className="mt-3 flex items-center justify-between gap-3">
                  <Link
                    href={buildMailto(ticket)}
                    prefetch={false}
                    className="inline-flex items-center gap-1 rounded-full bg-red-600 px-3 py-1.5 text-[11px] font-medium text-white shadow-[0_0_18px_rgba(225,6,0,0.65)] hover:bg-red-500"
                  >
                    <span>Reply with email</span>
                  </Link>
                  <span className="text-[10px] text-zinc-500">
                    Opens your default mail client with the ticket details.
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const BASE_URL = (API_URL as string).replace(/\/$/, "");

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
  const [actionError, setActionError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"open" | "resolved">("open");
  const [searchQuery, setSearchQuery] = useState("");
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  useEffect(() => {
    async function loadTickets() {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch(`${BASE_URL}/admin/support/tickets`, {
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

  const openCount = useMemo(
    () => tickets.filter((t) => t.status === "open").length,
    [tickets],
  );

  const resolvedCount = useMemo(
    () => tickets.filter((t) => t.status === "resolved").length,
    [tickets],
  );

  const filteredTickets = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return tickets.filter((ticket) => {
      if (activeTab === "open" && ticket.status !== "open") return false;
      if (activeTab === "resolved" && ticket.status !== "resolved") return false;

      if (!q) return true;

      const haystack = [
        ticket.subject,
        ticket.email,
        ticket.user_id ?? "",
        ticket.message,
      ]
        .join(" \n")
        .toLowerCase();

      return haystack.includes(q);
    });
  }, [tickets, activeTab, searchQuery]);

  async function handleResolve(ticketId: string) {
    setActionError(null);
    setResolvingId(ticketId);
    try {
      const res = await fetch(`${BASE_URL}/admin/support/tickets/${ticketId}/resolve`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        throw new Error("Failed to mark ticket as resolved");
      }
      const updated: SupportTicket = await res.json();
      setTickets((prev) => prev.map((t) => (t.id === ticketId ? updated : t)));
    } catch (err) {
      setActionError("Could not update ticket status. Please try again.");
    } finally {
      setResolvingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-white">Support tickets</h1>
          <p className="mt-1 text-xs text-zinc-400">
            Manage support conversations from users. Use filters to focus on open or resolved tickets.
          </p>
        </div>
        <div className="hidden items-center gap-3 rounded-full border border-white/10 bg-black/60 px-3 py-1.5 text-[11px] text-zinc-300 md:flex">
          <span className="inline-flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            <span>{openCount} open</span>
          </span>
          <span className="text-zinc-600">/</span>
          <span className="inline-flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-zinc-500" />
            <span>{resolvedCount} resolved</span>
          </span>
        </div>
      </header>

      <div className="rounded-2xl border border-white/10 bg-black/60 p-4 text-xs text-white/80">
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="inline-flex items-center gap-1 rounded-full bg-zinc-900/80 p-1 text-[11px] text-zinc-300">
            <button
              type="button"
              onClick={() => setActiveTab("open")}
              className={`rounded-full px-3 py-1 transition-colors ${
                activeTab === "open"
                  ? "bg-red-600 text-white shadow-[0_0_12px_rgba(239,68,68,0.75)]"
                  : "bg-transparent text-zinc-400 hover:text-white"
              }`}
            >
              Open ({openCount})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("resolved")}
              className={`rounded-full px-3 py-1 transition-colors ${
                activeTab === "resolved"
                  ? "bg-zinc-700 text-white shadow-[0_0_12px_rgba(113,113,122,0.75)]"
                  : "bg-transparent text-zinc-400 hover:text-white"
              }`}
            >
              Resolved ({resolvedCount})
            </button>
          </div>

          <div className="flex flex-1 items-center gap-2 md:max-w-xs">
            <div className="relative w-full">
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by subject, email, user, or message…"
                className="w-full rounded-full border border-white/10 bg-black/60 px-3 py-1.5 pl-8 text-[11px] text-white placeholder:text-zinc-500 focus:border-red-500 focus:outline-none focus:ring-0"
              />
              <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[11px] text-zinc-500">
                🔍
              </span>
            </div>
          </div>
        </div>

        {actionError && (
          <p className="mb-3 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-[11px] text-red-200">
            {actionError}
          </p>
        )}

        {isLoading ? (
          <p className="text-zinc-400">Loading tickets…</p>
        ) : error ? (
          <p className="text-red-400">{error}</p>
        ) : tickets.length === 0 ? (
          <p className="text-zinc-400">No tickets yet. Messages sent from the Support page will appear here.</p>
        ) : filteredTickets.length === 0 ? (
          <p className="text-zinc-400">
            No {activeTab} tickets match your filters.
          </p>
        ) : (
          <div className="space-y-3">
            {filteredTickets.map((ticket) => {
              const isOpen = ticket.status === "open";
              return (
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
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wide ${
                        isOpen
                          ? "bg-amber-500/20 text-amber-300"
                          : "bg-emerald-500/15 text-emerald-300"
                      }`}
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
                  <div className="flex items-center gap-3 text-[10px] text-zinc-500">
                    <span>Opens your default mail client with the ticket details.</span>
                    {isOpen && (
                      <button
                        type="button"
                        onClick={() => handleResolve(ticket.id)}
                        disabled={resolvingId === ticket.id}
                        className="inline-flex items-center gap-1 rounded-full border border-emerald-500/60 bg-emerald-500/10 px-3 py-1 text-[10px] font-medium text-emerald-200 hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {resolvingId === ticket.id ? "Updating…" : "Mark as resolved"}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

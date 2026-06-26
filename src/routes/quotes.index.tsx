import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, Plus, FileText, Link2, Send } from "lucide-react";
import { toast } from "sonner";
import { Card } from "../components/dsm/Card";
import { SectionHeader } from "../components/dsm/SectionHeader";
import { supabase } from "../lib/supabaseClient";

const SUPABASE_URL = "https://bjpqxfrihwjcqprmoqfs.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJqcHF4ZnJpaHdqY3Fwcm1vcWZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0NzQ4MjEsImV4cCI6MjA5NzA1MDgyMX0.HKlgx3dxP3uxX9wMRRUnfb0IPwaBpFcut_iUgT5XFeo";

export const Route = createFileRoute("/quotes/")({
  head: () => ({
    meta: [
      { title: "Quotes — DSM by EveryDriver" },
      { name: "description", content: "Send and track course quotes to prospective pupils." },
    ],
  }),
  component: QuotesPage,
});

const POPPINS = { fontFamily: "Poppins, sans-serif" } as const;

type TabKey = "pending" | "accepted" | "declined" | "expired";

interface QuoteRow {
  id: string;
  token: string | null;
  recipient_name: string;
  recipient_email: string | null;
  recipient_phone: string | null;
  course_type: string | null;
  hours: number | null;
  price: number;
  status: string;
  valid_until: string | null;
  sent_at: string;
}

function formatDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function statusColor(s: TabKey) {
  if (s === "accepted") return "#16A34A";
  if (s === "declined") return "#CC2229";
  if (s === "expired") return "#6B7280";
  return "#F59E0B";
}

function isExpired(q: QuoteRow) {
  if (!q.valid_until) return false;
  return new Date(q.valid_until + "T23:59:59") < new Date();
}

function QuotesPage() {
  const navigate = useNavigate();
  const [quotes, setQuotes] = useState<QuoteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabKey>("pending");

  useEffect(() => {
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) { setLoading(false); return; }
      const { data, error } = await supabase
        .from("quotes")
        .select("id, token, recipient_name, recipient_email, recipient_phone, course_type, hours, price, status, valid_until, sent_at")
        .eq("instructor_id", uid)
        .order("sent_at", { ascending: false });
      if (error) console.error("[quotes] fetch error", error);
      setQuotes((data ?? []) as QuoteRow[]);
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    return quotes.filter((q) => {
      const s = (q.status || "pending").toLowerCase();
      if (tab === "accepted") return s === "accepted";
      if (tab === "declined") return s === "declined";
      if (tab === "expired") return s !== "accepted" && s !== "declined" && isExpired(q);
      // pending
      return s === "pending" && !isExpired(q);
    });
  }, [quotes, tab]);

  const tabs: { key: TabKey; label: string }[] = [
    { key: "pending", label: "Pending" },
    { key: "accepted", label: "Accepted" },
    { key: "declined", label: "Declined" },
    { key: "expired", label: "Expired" },
  ];

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#F2F4F8", ...POPPINS }}>
      <div
        style={{
          position: "sticky", top: 0, zIndex: 10, backgroundColor: "#072b47",
          padding: "14px 16px", display: "flex", alignItems: "center", justifyContent: "space-between",
        }}
      >
        <button onClick={() => navigate({ to: "/home" })}
          style={{ background: "none", border: "none", cursor: "pointer", color: "#fff", display: "flex" }}
          aria-label="Back">
          <ChevronLeft size={24} />
        </button>
        <h1 style={{ color: "#fff", fontSize: 16, fontWeight: 700, margin: 0 }}>Quotes</h1>
        <button onClick={() => navigate({ to: "/quotes/new" })}
          style={{ background: "none", border: "none", cursor: "pointer", color: "#fff", display: "flex" }}
          aria-label="New quote">
          <Plus size={24} />
        </button>
      </div>

      <div style={{ display: "flex", gap: 6, padding: "12px 16px", overflowX: "auto" }}>
        {tabs.map((t) => {
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                flex: 1,
                minWidth: 72,
                background: active ? "#1A52A0" : "#fff",
                color: active ? "#fff" : "#1A52A0",
                border: "1px solid #e3e6ec",
                borderRadius: 10,
                padding: "8px 6px",
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
                fontFamily: "Poppins, sans-serif",
              }}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      <div style={{ padding: "0 16px 24px" }}>
        <SectionHeader>{tab.toUpperCase()} QUOTES</SectionHeader>

        {loading ? (
          <div style={{ color: "#6B7280", padding: 16 }}>Loading…</div>
        ) : filtered.length === 0 ? (
          <div style={{
            textAlign: "center", padding: "48px 16px", color: "#6B7280",
            display: "flex", flexDirection: "column", alignItems: "center", gap: 12,
          }}>
            <FileText size={48} color="#9CA3AF" />
            <div style={{ fontSize: 14, fontWeight: 600 }}>
              No {tab} quotes yet
            </div>
            <button onClick={() => navigate({ to: "/quotes/new" })}
              style={{
                marginTop: 8, background: "#1A52A0", color: "#fff", border: "none",
                borderRadius: 10, padding: "10px 16px", fontWeight: 600, fontSize: 14,
                cursor: "pointer", fontFamily: "Poppins, sans-serif",
              }}>
              + New quote
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {filtered.map((q) => {
              const displayStatus: TabKey = isExpired(q) && q.status === "pending" ? "expired" : (q.status as TabKey);
              return (
                <Card key={q.id} style={{ padding: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: 14, fontWeight: 600, color: "#0F2044",
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      }}>
                        {q.recipient_name}
                      </div>
                      <div style={{ fontSize: 12, color: "#6B7280", marginTop: 2 }}>
                        {q.hours ? `${q.hours}h` : ""}{q.course_type ? ` · ${q.course_type}` : ""}
                      </div>
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: "#0F2044" }}>
                      £{Number(q.price).toFixed(0)}
                    </div>
                  </div>
                  <div style={{
                    marginTop: 8, display: "flex", alignItems: "center",
                    justifyContent: "space-between", gap: 8,
                  }}>
                    <div style={{ fontSize: 12, color: "#6B7280" }}>
                      Sent {formatDate(q.sent_at)}{q.valid_until ? ` · valid to ${formatDate(q.valid_until)}` : ""}
                    </div>
                    <span style={{
                      background: statusColor(displayStatus), color: "#fff", fontSize: 10, fontWeight: 700,
                      padding: "2px 6px", borderRadius: 6, textTransform: "uppercase", letterSpacing: 0.4,
                    }}>
                      {displayStatus}
                    </span>
                  </div>
                  {q.token && (
                    <div style={{ marginTop: 10, display: "flex", justifyContent: "flex-end" }}>
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          const url = `https://everydriver.co.uk/quote/${q.token}`;
                          try {
                            await navigator.clipboard.writeText(url);
                            toast.success("Link copied");
                          } catch {
                            toast.error("Could not copy link");
                          }
                        }}
                        style={{
                          display: "inline-flex", alignItems: "center", gap: 6,
                          background: "#fff", border: "1px solid #1A52A0", color: "#1A52A0",
                          fontSize: 12, fontWeight: 600, padding: "6px 10px", borderRadius: 8,
                          cursor: "pointer", fontFamily: "Poppins, sans-serif",
                        }}
                      >
                        <Link2 size={14} /> Copy link
                      </button>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

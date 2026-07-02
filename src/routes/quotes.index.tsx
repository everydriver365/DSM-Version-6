import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, Plus, FileText, Link2, Send, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Card } from "../components/dsm/Card";
import { SectionHeader } from "../components/dsm/SectionHeader";
import { supabase } from "../lib/supabaseClient";

type DeclineInfo = { reason?: string | null; counterOffer?: number | null };

function parseCounterOffer(body: string | null | undefined): number | null {
  if (!body) return null;
  const m = body.match(/£\s*(\d+(?:\.\d{1,2})?)/);
  return m ? Number(m[1]) : null;
}

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

const POPPINS = { fontFamily: "Inter, sans-serif" } as const;

type TabKey = "pending" | "accepted" | "declined" | "resent" | "expired";

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
  personal_message: string | null;
}


function formatDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function statusColor(s: TabKey | string) {
  if (s === "accepted") return "#16A34A";
  if (s === "declined") return "#CC2229";
  if (s === "expired") return "#6B7280";
  if (s === "resent") return "#0B7DDA";
  return "#F59E0B";
}


function isExpired(q: QuoteRow) {
  if (!q.valid_until) return false;
  return new Date(q.valid_until + "T23:59:59") < new Date();
}

function QuotesPage() {
  const navigate = useNavigate();
  const [quotes, setQuotes] = useState<QuoteRow[]>([]);
  const [declineMap, setDeclineMap] = useState<Record<string, DeclineInfo>>({});
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabKey>("pending");

  useEffect(() => {
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      console.log("[quotes] userId:", uid);
      if (!uid) { setLoading(false); return; }
      let { data, error } = await supabase
        .from("quotes")
        .select("id, token, recipient_name, recipient_email, recipient_phone, course_type, hours, price, deposit_amount, status, valid_until, sent_at, created_at, personal_message")
        .eq("instructor_id", uid)
        .order("sent_at", { ascending: false });
      console.log("[quotes] fetch result:", { data, error });
      if (error) {
        console.error("[quotes] fetch error", error);
        const fb = await supabase
          .from("quotes")
          .select("id, recipient_name, recipient_email, recipient_phone, course_type, hours, price, status, valid_until, sent_at")
          .eq("instructor_id", uid)
          .order("sent_at", { ascending: false });
        console.log("[quotes] fallback result:", fb);
        data = (fb.data ?? []).map((r: any) => ({ ...r, token: null, personal_message: null })) as any;
      }
      const rows = (data ?? []) as QuoteRow[];
      setQuotes(rows);
      console.log("[quotes] all quotes statuses:", rows.map((q: any) => ({ id: q.id, status: q.status })));

      // Fetch decline / counter-offer notifications for this instructor
      try {
        const { data: notifs } = await supabase
          .from("instructor_notifications")
          .select("type, body, data, created_at")
          .eq("instructor_id", uid)
          .in("type", ["quote_declined", "quote_counter"])
          .order("created_at", { ascending: false });
        console.log("[quotes] decline/counter notifs:", notifs);
        const map: Record<string, DeclineInfo> = {};
        for (const n of (notifs ?? []) as any[]) {
          const qid: string | undefined = n?.data?.quote_id ?? n?.data?.quoteId;
          if (!qid) continue;
          const entry = map[qid] ?? {};
          const offer = parseCounterOffer(n.body) ?? (typeof n?.data?.counter_offer === "number" ? n.data.counter_offer : null);
          if (offer != null && entry.counterOffer == null) entry.counterOffer = offer;
          if (n.type === "quote_declined" && !entry.reason) entry.reason = n?.data?.reason ?? n.body ?? null;
          map[qid] = entry;
        }
        setDeclineMap(map);
      } catch (e) {
        console.warn("[quotes] notifications fetch failed (non-fatal):", e);
      }

      setLoading(false);
    })();
  }, []);

  const isRevision = (q: QuoteRow) =>
    !!q.personal_message && q.personal_message.startsWith("Thank you for your feedback");

  const revisionByOriginalRecipient = useMemo(() => {
    // For each "resent" original, find the most recent revision quote (same recipient, isRevision, sent later).
    const map: Record<string, QuoteRow | undefined> = {};
    const revisions = quotes
      .filter(isRevision)
      .sort((a, b) => new Date(b.sent_at).getTime() - new Date(a.sent_at).getTime());
    for (const q of quotes) {
      if ((q.status || "").toLowerCase() !== "resent") continue;
      map[q.id] = revisions.find(
        (r) =>
          r.id !== q.id &&
          (r.recipient_email || "") === (q.recipient_email || "") &&
          (r.recipient_name || "") === (q.recipient_name || "") &&
          new Date(r.sent_at).getTime() >= new Date(q.sent_at).getTime(),
      );
    }
    return map;
  }, [quotes]);

  const filtered = useMemo(() => {
    const PENDING_STATUSES = new Set(["pending", "sent", "viewed", "draft"]);
    return quotes.filter((q) => {
      const s = (q.status || "pending").toLowerCase();
      if (tab === "accepted") return s === "accepted";
      if (tab === "declined") return s === "declined";
      if (tab === "resent") return s === "resent";
      if (tab === "expired") return s === "expired" || (s !== "accepted" && s !== "declined" && s !== "resent" && isExpired(q));
      // pending: any non-terminal status, and not expired
      return PENDING_STATUSES.has(s) && !isExpired(q);
    });
  }, [quotes, tab]);

  const tabs: { key: TabKey; label: string }[] = [
    { key: "pending", label: "Pending" },
    { key: "accepted", label: "Accepted" },
    { key: "declined", label: "Declined" },
    { key: "resent", label: "Resent" },
    { key: "expired", label: "Expired" },
  ];


  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#F7F5EF", ...POPPINS }}>
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

      <div style={{ padding: "12px 16px" }}>
        <select
          value={tab}
          onChange={(e) => setTab(e.target.value as TabKey)}
          style={{
            width: "100%",
            background: "#fff",
            color: "#0B7DDA",
            border: "1px solid #e3e6ec",
            borderRadius: 10,
            padding: "10px 12px",
            fontSize: 14,
            fontWeight: 700,
            fontFamily: "Inter, sans-serif",
            cursor: "pointer",
            appearance: "none",
            backgroundImage:
              "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%231A52A0' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'/></svg>\")",
            backgroundRepeat: "no-repeat",
            backgroundPosition: "right 12px center",
            paddingRight: 36,
          }}
        >
          {tabs.map((t) => (
            <option key={t.key} value={t.key}>{t.label}</option>
          ))}
        </select>
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
                marginTop: 8, background: "#0B7DDA", color: "#fff", border: "none",
                borderRadius: 10, padding: "10px 16px", fontWeight: 600, fontSize: 14,
                cursor: "pointer", fontFamily: "Inter, sans-serif",
              }}>
              + New quote
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {filtered.map((q) => {
              const sLower = (q.status || "").toLowerCase();
              const displayStatus: string = isExpired(q) && q.status === "pending" ? "expired" : sLower;
              const isDeclined = sLower === "declined";
              const isResent = sLower === "resent";
              const isRev = isRevision(q);
              const revision = isResent ? revisionByOriginalRecipient[q.id] : undefined;
              const info = declineMap[q.id];
              const counter = info?.counterOffer ?? null;
              const reason = info?.reason ?? null;
              return (
                <Card key={q.id} style={{ padding: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: 14, fontWeight: 600, color: "#0A2540",
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                        display: "flex", alignItems: "center", gap: 6,
                      }}>
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{q.recipient_name}</span>
                        {isRev && (
                          <span style={{
                            background: "#0B7DDA", color: "#fff", fontSize: 10, fontWeight: 700,
                            padding: "2px 6px", borderRadius: 6, letterSpacing: 0.4,
                          }}>REVISION</span>
                        )}
                        {isResent && (
                          <span style={{
                            background: "#16A34A", color: "#fff", fontSize: 10, fontWeight: 700,
                            padding: "2px 6px", borderRadius: 6, letterSpacing: 0.4,
                          }}>FOLLOWED UP ✓</span>
                        )}
                      </div>
                      {isRev && (
                        <div style={{ fontSize: 11, color: "#6B7280", marginTop: 2, fontStyle: "italic" }}>
                          Revised from declined quote
                        </div>
                      )}

                      <div style={{ fontSize: 12, color: "#6B7280", marginTop: 2 }}>
                        {q.hours ? `${q.hours}h` : ""}{q.course_type ? ` · ${q.course_type}` : ""}
                      </div>
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: "#0A2540" }}>
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
                  {isDeclined && (counter != null || reason) && (
                    <div style={{
                      marginTop: 10, padding: 10, borderRadius: 8,
                      background: "#FEF2F2", border: "1px solid #FECACA",
                      display: "flex", flexDirection: "column", gap: 6,
                    }}>
                      {counter != null && (
                        <div style={{ fontSize: 14, fontWeight: 700, color: "#0A2540" }}>
                          Pupil suggested: <span style={{ color: "#CC2229" }}>£{counter.toFixed(2)}</span>
                        </div>
                      )}
                      {reason && (
                        <div style={{ fontSize: 12, color: "#6B7280", lineHeight: 1.4 }}>
                          “{reason}”
                        </div>
                      )}
                    </div>
                  )}
                  {isDeclined && (
                    <div style={{ marginTop: 10, display: "flex", justifyContent: "flex-end" }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const newPrice = counter != null ? counter : Number(q.price);
                          navigate({
                            to: "/quotes/new",
                            search: {
                              name: q.recipient_name ?? "",
                              email: q.recipient_email ?? "",
                              phone: q.recipient_phone ?? "",
                              course: q.course_type ?? "",
                              hours: q.hours != null ? String(q.hours) : "",
                              price: String(newPrice),
                              message: "Thank you for your feedback. Here is my revised quote:",
                              revised: "true",
                              originalId: q.id,
                            } as any,

                          });
                        }}
                        style={{
                          display: "inline-flex", alignItems: "center", gap: 6,
                          background: "#0B7DDA", border: "1px solid #0B7DDA", color: "#fff",
                          fontSize: 12, fontWeight: 600, padding: "6px 10px", borderRadius: 8,
                          cursor: "pointer", fontFamily: "Inter, sans-serif",
                        }}
                      >
                        <RefreshCw size={14} /> Revise & resend
                      </button>
                    </div>
                  )}
                  {isResent && revision && (
                    <div style={{ marginTop: 10, display: "flex", justifyContent: "flex-end" }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setTab("pending");
                          // Scroll/highlight not implemented; switching tab + toast for now.
                          toast.success(`Revision sent ${formatDate(revision.sent_at)} · £${Number(revision.price).toFixed(0)}`);
                        }}
                        style={{
                          background: "none", border: "none", color: "#0B7DDA",
                          fontSize: 12, fontWeight: 600, cursor: "pointer",
                          fontFamily: "Inter, sans-serif", padding: 0,
                        }}
                      >
                        View revision →
                      </button>
                    </div>
                  )}

                  {q.token && (
                    <div style={{ marginTop: 10, display: "flex", justifyContent: "flex-end", gap: 8 }}>
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
                          background: "#fff", border: "1px solid #0B7DDA", color: "#0B7DDA",
                          fontSize: 12, fontWeight: 600, padding: "6px 10px", borderRadius: 8,
                          cursor: "pointer", fontFamily: "Inter, sans-serif",
                        }}
                      >
                        <Link2 size={14} /> Copy link
                      </button>
                      {(q.recipient_email || q.recipient_phone) && (
                        <button
                          onClick={async (e) => {
                            e.stopPropagation();
                            if (q.recipient_email) {
                              try {
                                const { data: { session } } = await supabase.auth.getSession();
                                const token = session?.access_token;
                                const res = await fetch(`${SUPABASE_URL}/functions/v1/send-quote`, {
                                  method: "POST",
                                  headers: {
                                    "Content-Type": "application/json",
                                    Authorization: `Bearer ${token}`,
                                    apikey: SUPABASE_ANON_KEY,
                                  },
                                  body: JSON.stringify({ quoteId: q.id }),
                                });
                                if (!res.ok) throw new Error(await res.text());
                                toast.success(`Quote sent to ${q.recipient_name}`);
                              } catch (err: any) {
                                toast.error("Failed to send: " + (err?.message ?? "unknown"));
                              }
                            } else if (q.recipient_phone) {
                              const url = `https://everydriver.co.uk/quote/${q.token}`;
                              const body = `Hi ${q.recipient_name}, your quote for £${Number(q.price).toFixed(2)}: ${url}`;
                              window.location.href = `sms:${q.recipient_phone}?body=${encodeURIComponent(body)}`;
                            }
                          }}
                          style={{
                            display: "inline-flex", alignItems: "center", gap: 6,
                            background: "#0A2540", border: "1px solid #0A2540", color: "#fff",
                            fontSize: 12, fontWeight: 600, padding: "6px 10px", borderRadius: 8,
                            cursor: "pointer", fontFamily: "Inter, sans-serif",
                          }}
                        >
                          <Send size={14} /> Send
                        </button>
                      )}
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

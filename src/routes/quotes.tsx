import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Plus } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

export const Route = createFileRoute("/quotes")({
  component: QuotesPage,
});

const POPPINS = { fontFamily: "Poppins, sans-serif" as const };
type Status = "draft" | "sent" | "viewed" | "accepted" | "declined" | "expired";
type Quote = {
  id: string;
  quote_ref: string | null;
  pupil_name: string | null;
  email: string | null;
  phone: string | null;
  postcode: string | null;
  course_type: string | null;
  total_hours: number | null;
  price: number | null;
  deposit: number | null;
  notes: string | null;
  valid_until: string | null;
  status: Status;
  created_at: string;
};

const TABS: Array<{ key: "all" | Status; label: string }> = [
  { key: "all", label: "All" },
  { key: "draft", label: "Draft" },
  { key: "sent", label: "Sent" },
  { key: "accepted", label: "Accepted" },
  { key: "expired", label: "Expired" },
];

function statusColors(s: Status): { bg: string; fg: string; label: string } {
  switch (s) {
    case "draft": return { bg: "#FEF3C7", fg: "#92400E", label: "Draft" };
    case "sent": return { bg: "#DBEAFE", fg: "#1E40AF", label: "Sent" };
    case "viewed": return { bg: "#EDE9FE", fg: "#6D28D9", label: "Viewed" };
    case "accepted": return { bg: "#DCFCE7", fg: "#166534", label: "Accepted" };
    case "declined": return { bg: "#E5E7EB", fg: "#374151", label: "Declined" };
    case "expired": return { bg: "#E5E7EB", fg: "#374151", label: "Expired" };
  }
}

function fmtDate(s?: string | null) {
  if (!s) return "";
  const d = new Date(s);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function QuotesPage() {
  const navigate = useNavigate();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("all");
  const [menu, setMenu] = useState<{ id: string; x: number; y: number } | null>(null);
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function load() {
    setLoading(true);
    const { data: auth } = await supabase.auth.getUser();
    const uid = auth.user?.id;
    if (!uid) { setQuotes([]); setLoading(false); return; }
    const { data, error } = await supabase
      .from("quotes")
      .select("*")
      .eq("instructor_id", uid)
      .order("created_at", { ascending: false });
    if (!error && data) setQuotes(data as Quote[]);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const filtered = quotes.filter((q) => {
    if (tab === "all") return true;
    if (tab === "expired") {
      if (q.status === "expired") return true;
      return q.valid_until && new Date(q.valid_until) < today && q.status !== "accepted";
    }
    return q.status === tab;
  });

  async function updateStatus(id: string, status: Status) {
    await supabase.from("quotes").update({ status }).eq("id", id);
    setQuotes((prev) => prev.map((q) => (q.id === id ? { ...q, status } : q)));
  }

  async function sendQuote(q: Quote) {
    await updateStatus(q.id, "sent");
    const link = `${window.location.origin}/quotes/${q.id}`;
    const body = `Hi ${q.pupil_name ?? ""}, your quote ${q.quote_ref ?? ""} for £${(q.price ?? 0).toFixed(2)}: ${link}`;
    if (q.phone) window.location.href = `sms:${q.phone}?body=${encodeURIComponent(body)}`;
    else if (q.email) window.location.href = `mailto:${q.email}?subject=${encodeURIComponent("Your quote")}&body=${encodeURIComponent(body)}`;
  }

  async function copyLink(q: Quote) {
    try { await navigator.clipboard.writeText(`${window.location.origin}/quotes/${q.id}`); } catch {}
  }

  async function deleteQuote(id: string) {
    if (!confirm("Delete this quote?")) return;
    await supabase.from("quotes").delete().eq("id", id);
    setQuotes((p) => p.filter((q) => q.id !== id));
  }

  function startPress(e: React.TouchEvent | React.MouseEvent, id: string) {
    const isTouch = "touches" in e;
    const x = isTouch ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const y = isTouch ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    pressTimer.current = setTimeout(() => setMenu({ id, x, y }), 500);
  }
  function endPress() { if (pressTimer.current) { clearTimeout(pressTimer.current); pressTimer.current = null; } }

  return (
    <div className="min-h-screen pb-24" style={{ ...POPPINS, backgroundColor: "#fff" }}>
      <div style={{ background: "#0F2044", color: "#fff", padding: "14px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: "calc(14px + env(safe-area-inset-top, 0px))" }}>
        <button onClick={() => navigate({ to: "/home" })} style={{ background: "none", border: "none", color: "#fff", display: "flex", alignItems: "center" }} aria-label="Back">
          <ArrowLeft size={22} />
        </button>
        <div style={{ fontWeight: 700, fontSize: 16 }}>Quotes</div>
        <Link to="/quotes/new" style={{ color: "#fff", display: "flex", alignItems: "center", gap: 4, fontSize: 13, fontWeight: 600, textDecoration: "none" }}>
          <Plus size={18} /> New quote
        </Link>
      </div>

      <div style={{ display: "flex", gap: 6, overflowX: "auto", padding: "12px 12px 8px", whiteSpace: "nowrap" }}>
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            display: "inline-flex", flexShrink: 0, padding: "6px 12px", borderRadius: 999, fontSize: 13, fontWeight: 600,
            border: "1px solid " + (tab === t.key ? "#0F2044" : "#E2E6ED"),
            background: tab === t.key ? "#0F2044" : "#fff",
            color: tab === t.key ? "#fff" : "#0F2044", cursor: "pointer",
          }}>{t.label}</button>
        ))}
      </div>

      <div style={{ padding: "4px 12px 24px" }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: 32, color: "#6B7280", fontSize: 13 }}>Loading…</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: 40, color: "#6B7280", fontSize: 13 }}>
            No quotes yet. Tap "New quote" to create one.
          </div>
        ) : filtered.map((q) => {
          const isExpired = q.valid_until && new Date(q.valid_until) < today && q.status !== "accepted";
          const sb = statusColors(isExpired && q.status !== "accepted" ? "expired" : q.status);
          return (
            <div
              key={q.id}
              onClick={() => navigate({ to: "/quotes" })}
              onTouchStart={(e) => startPress(e, q.id)}
              onTouchEnd={endPress}
              onMouseDown={(e) => startPress(e, q.id)}
              onMouseUp={endPress}
              onMouseLeave={endPress}
              style={{
                background: "#fff", border: "0.5px solid #E2E6ED", borderRadius: 12,
                padding: "14px 16px", marginBottom: 8, cursor: "pointer",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: "#0F2044" }}>{q.quote_ref ?? "—"}</div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: "#0F2044", marginTop: 2 }}>{q.pupil_name ?? "Unnamed"}</div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 15, color: "#0F2044" }}>£{(q.price ?? 0).toFixed(2)}</div>
                  <span style={{ display: "inline-block", marginTop: 4, padding: "2px 8px", borderRadius: 999, fontSize: 11, fontWeight: 600, background: sb.bg, color: sb.fg }}>{sb.label}</span>
                </div>
              </div>
              <div style={{ marginTop: 6, fontSize: 12, color: "#6B7280" }}>
                {[q.course_type, q.total_hours ? `${q.total_hours}h` : null, q.postcode].filter(Boolean).join(" • ")}
              </div>
              <div style={{ marginTop: 4, fontSize: 12, color: "#6B7280", display: "flex", justifyContent: "space-between" }}>
                <span>{isExpired ? "Expired" : q.valid_until ? `Valid until ${fmtDate(q.valid_until)}` : ""}</span>
                <span>{fmtDate(q.created_at)}</span>
              </div>
            </div>
          );
        })}
      </div>

      {menu && (() => {
        const q = quotes.find((x) => x.id === menu.id);
        if (!q) return null;
        return (
          <div onClick={() => setMenu(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 60 }}>
            <div onClick={(e) => e.stopPropagation()} style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "#fff", borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 8, paddingBottom: "calc(8px + env(safe-area-inset-bottom, 0px))" }}>
              {[
                { label: "Send", fn: () => sendQuote(q) },
                { label: "Copy link", fn: () => copyLink(q) },
                { label: "Mark accepted", fn: () => updateStatus(q.id, "accepted") },
                { label: "Delete", fn: () => deleteQuote(q.id), danger: true },
              ].map((a) => (
                <button key={a.label} onClick={() => { a.fn(); setMenu(null); }} style={{
                  display: "block", width: "100%", textAlign: "left", padding: "14px 16px",
                  background: "none", border: "none", fontSize: 15, fontWeight: 600,
                  color: a.danger ? "#DC2626" : "#0F2044", cursor: "pointer",
                  fontFamily: "Poppins, sans-serif",
                }}>{a.label}</button>
              ))}
            </div>
          </div>
        );
      })()}
    </div>
  );
}

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Plus, X, MoreVertical, Search, Banknote, CreditCard, Landmark, RotateCcw, Wallet, QrCode, Receipt } from "lucide-react";

import { Button } from "../components/dsm/Button";
import { Input } from "../components/dsm/Input";
import { supabase } from "../lib/supabaseClient";
import WorkspaceDots from "../components/dsm/WorkspaceDots";
import { toast } from "sonner";
import { PageLayout } from "@/components/PageLayout";
import InstructorTopBar from "@/components/dsm/InstructorTopBar";
import { recordPayment, recordRefund, correctPaymentRecord } from "@/lib/payments";
import { calculateOutstandingOwed, calculatePaidOutstandingBreakdown } from "@/lib/paymentsOwed";
import { UnifiedPaymentSheet } from "@/components/payments/UnifiedPaymentSheet";
import { QuickActionsMenu } from "@/components/dsm/QuickActionsMenu";

export const Route = createFileRoute("/payments")({
  head: () => ({
    meta: [
      { title: "Payments — DSM by EveryDriver" },
      { name: "description", content: "Take payments (cash, QR, link, BNPL), track history, edits and refunds." },
    ],
  }),
  component: PaymentsPage,
});

const POPPINS = { fontFamily: "Inter, sans-serif" } as const;
const NAVY = "#0B1F3A";
const BORDER = "#E2E6ED";
const MUTED = "#6B7280";
const GREEN = "#16A34A";
const RED = "#CC2229";
const AMBER = "#B45309";
const BLUE = "#1877D6";
const TEAL = "#00B5A5";
const PURPLE = "#7C3AED";
const CYAN = "#0891B2";
const CARD_BLUE = "#1A52A0";

const PUPIL_PALETTE = ["#1877D6", "#6B4FD6", "#3B6D11", "#C4501E", "#0C8577", "#CC2229", "#854F0B", "#185F8A"];
function pupilAvatarColor(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return PUPIL_PALETTE[h % PUPIL_PALETTE.length];
}
function pupilInitials(name: string | null | undefined) {
  const n = (name || "?").trim();
  const parts = n.split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[parts.length - 1]?.[0] ?? "")).toUpperCase() || "?";
}

// ---------- helpers ----------
function formatGBP(amount: number) {
  const sign = amount < 0 ? "-" : "";
  return `${sign}£${Math.abs(amount).toFixed(2)}`;
}
function startOfDay(d: Date) { const x = new Date(d); x.setHours(0,0,0,0); return x; }
function startOfWeek(d: Date) { const x = startOfDay(d); const day = (x.getDay()+6)%7; x.setDate(x.getDate()-day); return x; }
function startOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function startOfYear(d: Date) { return new Date(d.getFullYear(), 0, 1); }
function sameDay(a: Date, b: Date) { return a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate(); }
function dateGroupLabel(iso: string) {
  const d = new Date(iso);
  // Format: "Wed 8 Jul 2026" (abbreviated weekday, no leading zero on day, no comma)
  return d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" }).replace(/,/g, "");
}
function displayPupilName(name: string | null | undefined) {
  return (name ?? "").replace(/[.\s]+$/g, "").trim();
}
function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}
function toDateInput(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
}

const METHOD_LABELS: Record<string, string> = {
  cash: "Cash",
  card: "Card",
  qr: "QR",
  bank_transfer: "Bank transfer",
  klarna: "Klarna",
  clearpay: "Clearpay",
  refund: "Refund",
};
function methodLabel(m: string | null | undefined) {
  if (!m) return "—";
  return METHOD_LABELS[m] ?? (m.charAt(0).toUpperCase() + m.slice(1));
}
function MethodIcon({ method, refund }: { method: string | null | undefined; refund?: boolean }) {
  const size = 18;
  const color = "#fff";
  if (refund) return <RotateCcw size={size} color={color} />;
  switch (method) {
    case "cash": return <Banknote size={size} color={color} />;
    case "card": return <CreditCard size={size} color={color} />;
    case "qr": return <QrCode size={size} color={color} />;
    case "bank_transfer": return <Landmark size={size} color={color} />;
    case "klarna":
    case "clearpay": return <Wallet size={size} color={color} />;
    default: return <Banknote size={size} color={color} />;
  }
}
function methodBg(method: string | null | undefined, refund?: boolean) {
  if (refund) return RED;
  switch (method) {
    case "cash": return GREEN;
    case "card": return CARD_BLUE;
    case "qr": return PURPLE;
    case "bank_transfer": return CYAN;
    case "klarna":
    case "clearpay": return AMBER;
    default: return MUTED;
  }
}

// ---------- exported helpers (kept for external callers) ----------
// recordPayment lives in @/lib/payments — imported above.


export async function deletePaymentRecord(historyId: string, token: string, _userId: string): Promise<boolean> {
  const SUPABASE_URL = (supabase as any).supabaseUrl as string;
  const SUPABASE_ANON_KEY = (supabase as any).supabaseKey as string;

  const histRes = await fetch(
    `${SUPABASE_URL}/rest/v1/lesson_history?id=eq.${historyId}&select=*`,
    { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${token}` } },
  );
  const histData = await histRes.json();
  const record = histData?.[0];
  if (!record) { toast.error("Payment record not found"); return false; }

  await fetch(`${SUPABASE_URL}/rest/v1/lesson_history?id=eq.${historyId}`, {
    method: "PATCH",
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ deleted_at: new Date().toISOString() }),
  });

  const matchRes = await fetch(
    `${SUPABASE_URL}/rest/v1/payments?instructor_id=eq.${record.instructor_id}&pupil_id=eq.${record.pupil_id}&amount=eq.${record.lesson_cost}&paid_at=eq.${record.created_at}&deleted_at=is.null&select=id`,
    { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${token}` } },
  );
  const matchData = await matchRes.json();
  const matchedPaymentId = matchData?.[0]?.id;

  if (matchedPaymentId) {
    await fetch(`${SUPABASE_URL}/rest/v1/payments?id=eq.${matchedPaymentId}`, {
      method: "PATCH",
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ deleted_at: new Date().toISOString() }),
    });
  } else {
    console.warn("[deletePaymentRecord] no matching payments row found to soft-delete", record);
  }


  if (record.lesson_id) {
    await fetch(`${SUPABASE_URL}/rest/v1/lessons?id=eq.${record.lesson_id}`, {
      method: "PATCH",
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        payment_status: "unpaid",
        paid_at: null,
        paid_amount: null,
        payment_method: null,
      }),
    });
  }

  if (!record.lesson_id && record.pupil_id) {
    const pupilRes = await fetch(
      `${SUPABASE_URL}/rest/v1/pupils?id=eq.${record.pupil_id}&select=account_balance`,
      { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${token}` } },
    );
    const pupilData = await pupilRes.json();
    const currentBalance = Number(pupilData?.[0]?.account_balance || 0);
    const newBalance = Math.max(0, currentBalance - Number(record.lesson_cost));
    await fetch(`${SUPABASE_URL}/rest/v1/pupils?id=eq.${record.pupil_id}`, {
      method: "PATCH",
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ account_balance: newBalance }),
    });
  }

  toast.success("Payment deleted");
  return true;
}

// ---------- types ----------
interface PupilLite {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  account_balance?: number | null;
}
interface HistoryRow {
  id: string;
  pupil_id: string;
  lesson_id: string | null;
  lesson_cost: number | null;
  created_at: string;
  payment_method: string | null;
  payment_status: string | null;
  notes: string | null;
  pupils: { name: string } | null;
}

type DatePreset = "today" | "week" | "month" | "year" | "all";
type MethodFilter = "all" | "cash" | "card" | "qr" | "bank_transfer" | "klarna" | "clearpay" | "refund";

// ---------- page ----------
function PaymentsPage() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [allPupils, setAllPupils] = useState<PupilLite[]>([]);
  const [history, setHistory] = useState<HistoryRow[] | null>(null);
  const [outstanding, setOutstanding] = useState(0);
  const [unpaidLessons, setUnpaidLessons] = useState<{ amount_due: number | null; paid_amount: number | null }[]>([]);
  const [loading, setLoading] = useState(true);

  const [pupilFilter, setPupilFilter] = useState<string>("");
  const [pupilPickerOpen, setPupilPickerOpen] = useState(false);
  const [datePreset, setDatePreset] = useState<DatePreset>("month");
  const [methodFilter, setMethodFilter] = useState<MethodFilter>("all");

  const [unifiedPayOpen, setUnifiedPayOpen] = useState(false);
  const [unifiedPayPupilId, setUnifiedPayPupilId] = useState<string | undefined>();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [refundRow, setRefundRow] = useState<HistoryRow | null>(null);
  const [instructor, setInstructor] = useState<{ name: string | null } | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      setUserId(data.user?.id ?? null);
    })();
  }, []);

  async function refetch() {
    if (!userId) return;
    const [{ data: pupilRows }, { data: hist }, { data: unpaid }] = await Promise.all([
      supabase.from("pupils")
        .select("id, name, phone, email, account_balance")
        .eq("instructor_id", userId).is("deleted_at", null)
        .order("name", { ascending: true }),
      supabase.from("lesson_history")
        .select("id, pupil_id, lesson_id, lesson_cost, created_at, payment_method, payment_status, notes, pupils(name)")
        .eq("instructor_id", userId).is("deleted_at", null)
        .order("created_at", { ascending: false }),
      supabase.from("lessons")
        .select("amount_due, paid_amount, payment_status")
        .eq("instructor_id", userId)
        .in("payment_status", ["unpaid", "partial"])
        .is("deleted_at", null),
    ]);
    setAllPupils((pupilRows ?? []) as PupilLite[]);
    setHistory((hist as unknown as HistoryRow[]) ?? []);
    const unpaidRows = (unpaid ?? []) as { amount_due: number | null; paid_amount: number | null }[];
    setUnpaidLessons(unpaidRows);
    const owed = calculateOutstandingOwed(unpaidRows);
    setOutstanding(owed);
    setLoading(false);
  }

  useEffect(() => { if (userId) refetch(); /* eslint-disable-next-line */ }, [userId]);

  useEffect(() => {
    if (!userId) return;
    (async () => {
      const { data } = await supabase.from("instructors").select("name").eq("id", userId).maybeSingle();
      setInstructor(data as { name: string | null } | null);
    })();
  }, [userId]);

  // stats
  const stats = useMemo(() => {
    const rows = history ?? [];
    const monthStart = startOfMonth(new Date()).getTime();
    let monthReceived = 0, monthRefunded = 0;
    for (const r of rows) {
      const t = new Date(r.created_at).getTime();
      if (t < monthStart) continue;
      const amt = Number(r.lesson_cost ?? 0);
      if (r.payment_status === "paid") monthReceived += amt;
      else if (r.payment_status === "refund") monthRefunded += Math.abs(amt);
    }
    return { monthReceived, outstanding, monthRefunded };
  }, [history, outstanding]);

  const paidBreakdown = useMemo(() => calculatePaidOutstandingBreakdown(unpaidLessons), [unpaidLessons]);

  // filtered
  const filtered = useMemo(() => {
    const rows = history ?? [];
    const now = new Date();
    let fromMs = -Infinity;
    switch (datePreset) {
      case "today": fromMs = startOfDay(now).getTime(); break;
      case "week": fromMs = startOfWeek(now).getTime(); break;
      case "month": fromMs = startOfMonth(now).getTime(); break;
      case "year": fromMs = startOfYear(now).getTime(); break;
      case "all": default: break;
    }
    return rows.filter((r) => {
      if (pupilFilter && r.pupil_id !== pupilFilter) return false;
      if (new Date(r.created_at).getTime() < fromMs) return false;
      if (methodFilter !== "all") {
        if (methodFilter === "refund") { if (r.payment_status !== "refund") return false; }
        else if (r.payment_method !== methodFilter) return false;
      }
      return true;
    });
  }, [history, pupilFilter, datePreset, methodFilter]);

  const groups = useMemo(() => {
    const map = new Map<string, { label: string; rows: HistoryRow[]; total: number }>();
    for (const r of filtered) {
      const key = toDateInput(r.created_at);
      const existing = map.get(key) ?? { label: dateGroupLabel(r.created_at), rows: [], total: 0 };
      existing.rows.push(r);
      existing.total += Number(r.lesson_cost ?? 0);
      map.set(key, existing);
    }
    return Array.from(map.entries()).sort((a, b) => (a[0] < b[0] ? 1 : -1)).map(([, v]) => v);
  }, [filtered]);

  const pupilName = pupilFilter ? (allPupils.find((p) => p.id === pupilFilter)?.name ?? "") : "";

  return (
    <PageLayout
      className="pb-24 pb-safe relative"
      style={POPPINS}
      onTouchStart={(e) => {
        (window as any).__wsSwipe = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }}
      onTouchEnd={(e) => {
        const s = (window as any).__wsSwipe;
        if (!s) return;
        const dx = e.changedTouches[0].clientX - s.x;
        const dy = e.changedTouches[0].clientY - s.y;
        (window as any).__wsSwipe = null;
        if (Math.abs(dx) < 60 || Math.abs(dy) > Math.abs(dx)) return;
        // payments ≈ money = ws 3: left→market(4), right→pupils(2)
        const target = dx < 0 ? 4 : 2;
        navigate({ to: "/home" as never, search: { ws: target } as any });
      }}
    >
      <InstructorTopBar
        firstName={instructor?.name ?? ""}
        pageTitle="Payments"
        onBack={() => navigate({ to: "/home" as never })}
        onBell={() => navigate({ to: "/notifications" as never })}
        onPhone={() => navigate({ to: "/enquiries" as never })}
        onLiveTrack={() => navigate({ to: "/live" as never })}
        onMenu={() => navigate({ to: "/more" as never })}
        onMicPress={() => toast.info("Voice commands coming soon!")}
      />
      <div style={{ height: "calc(60px + env(safe-area-inset-top, 0px))" }} />

      {/* Action bar */}
      <div
        style={{
          background: "#FFFFFF",
          padding: "8px 16px",
          display: "flex",
          justifyContent: "flex-end",
          alignItems: "center",
          borderBottom: "1px solid #EEF2F7",
          gap: 10,
          ...POPPINS,
        }}
      >
        <button
          type="button"
          onClick={() => { setUnifiedPayPupilId(pupilFilter && pupilFilter !== "all" ? pupilFilter : undefined); setUnifiedPayOpen(true); }}
          className="flex items-center gap-1 px-3 h-9 rounded-lg text-[13px] font-semibold text-white"
          style={{ backgroundColor: TEAL }}
        >
          <Plus size={16} color="#fff" /> Take payment
        </button>
      </div>
      <WorkspaceDots activeIndex={3} />

      {/* Summary stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, padding: "16px 16px 0", marginBottom: 14 }}>
        <StatTile label="THIS MONTH" value={formatGBP(stats.monthReceived)} color="#1E8E3E" />
        <StatTile
          label="OUTSTANDING"
          value={formatGBP(stats.outstanding)}
          color={stats.outstanding > 0 ? "#CC2229" : "#B0BAC9"}
        />
        <StatTile
          label="REFUNDED"
          value={formatGBP(stats.monthRefunded)}
          color={stats.monthRefunded > 0 ? "#B5661E" : "#B0BAC9"}
        />
      </div>

      {/* Paid vs outstanding breakdown */}
      {paidBreakdown.totalDue > 0 && (
        <div style={{ padding: "0 16px", marginBottom: 14 }}>
          <div
            style={{
              background: "#FFFFFF",
              borderRadius: 14,
              padding: "14px 16px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: NAVY, ...POPPINS }}>Paid vs outstanding</div>
              <div style={{ fontSize: 11, color: MUTED, ...POPPINS }}>
                {paidBreakdown.paidPercent >= 1
                  ? "Fully collected"
                  : paidBreakdown.paidPercent > 0
                    ? `${Math.round(paidBreakdown.paidPercent * 100)}% collected`
                    : "None collected"}
              </div>
            </div>
            <div
              style={{
                height: 10,
                borderRadius: 5,
                background: "#F3F4F6",
                overflow: "hidden",
                marginBottom: 12,
                display: "flex",
              }}
            >
              <div
                style={{
                  width: `${Math.min(100, Math.round(paidBreakdown.paidPercent * 100))}%`,
                  background: GREEN,
                  height: "100%",
                }}
              />
              <div style={{ flex: 1, background: RED, height: "100%" }} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
              <div>
                <div style={{ fontSize: 10, color: MUTED, marginBottom: 2, ...POPPINS }}>Total due</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: NAVY, ...POPPINS }}>{formatGBP(paidBreakdown.totalDue)}</div>
              </div>
              <div>
                <div style={{ fontSize: 10, color: MUTED, marginBottom: 2, ...POPPINS }}>Paid</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: GREEN, ...POPPINS }}>{formatGBP(paidBreakdown.totalPaid)}</div>
              </div>
              <div>
                <div style={{ fontSize: 10, color: MUTED, marginBottom: 2, ...POPPINS }}>Outstanding</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: RED, ...POPPINS }}>{formatGBP(paidBreakdown.outstanding)}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Search bar (opens existing pupil picker) */}
      <button
        type="button"
        onClick={() => setPupilPickerOpen(true)}
        style={{
          background: "#FFFFFF",
          borderRadius: 12,
          padding: "9px 12px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
          display: "flex",
          alignItems: "center",
          gap: 8,
          margin: "0 16px 12px",
          cursor: "pointer",
          border: 0,
          width: "calc(100% - 32px)",
          textAlign: "left",
        }}
      >
        <Search size={15} color="#B0BAC9" />
        <div
          style={{
            fontSize: 13,
            color: pupilFilter ? "#0B1F3A" : "#B0BAC9",
            flex: 1,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            ...POPPINS,
          }}
        >
          {pupilFilter ? pupilName : "All pupils"}
        </div>
        {pupilFilter && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setPupilFilter(""); }}
            style={{ background: "none", border: 0, color: "#8A94A6", fontSize: 12, cursor: "pointer" }}
          >
            Clear
          </button>
        )}
      </button>

      {/* Period pills */}
      <div
        className="no-scrollbar"
        style={{ display: "flex", gap: 6, padding: "0 16px", marginBottom: 10, overflowX: "auto", WebkitOverflowScrolling: "touch" }}
      >
        {([["today","Today"],["week","This week"],["month","This month"],["year","This year"]] as [DatePreset,string][]).map(([v,l]) => {
          const active = datePreset === v;
          return (
            <button
              key={v}
              type="button"
              onClick={() => setDatePreset(v)}
              style={{
                padding: "7px 14px",
                fontSize: 12,
                fontWeight: 500,
                borderRadius: 20,
                border: 0,
                background: active ? "#0B1F3A" : "#FFFFFF",
                color: active ? "#FFFFFF" : "#8A94A6",
                boxShadow: active ? "none" : "0 1px 3px rgba(0,0,0,0.06)",
                whiteSpace: "nowrap",
                cursor: "pointer",
                flexShrink: 0,
                ...POPPINS,
              }}
            >
              {l}
            </button>
          );
        })}
      </div>


      {/* History */}
      <div>
        {loading ? (
          <div style={{ fontSize: 13, textAlign: "center", padding: "32px 0", color: "#B0BAC9" }}>Loading…</div>
        ) : groups.length === 0 ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "48px 24px", gap: 6 }}>
            <Receipt size={40} color="#D0D5DD" />
            <div style={{ fontSize: 14, color: "#B0BAC9" }}>No payments found</div>
            <div style={{ fontSize: 12, color: "#D0D5DD" }}>Try adjusting your filters</div>
          </div>
        ) : (
          groups.map((g) => (
            <div key={g.label + g.rows[0].id}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 16px", marginBottom: 8 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: "#0B1F3A", ...POPPINS }}>{g.label}</div>
                <div style={{ fontSize: 12, color: "#B0BAC9", ...POPPINS }}>{formatGBP(g.total)}</div>
              </div>

              <div
                style={{
                  background: "#FFFFFF",
                  borderRadius: 14,
                  overflow: "hidden",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
                  margin: "0 16px 14px",
                }}
              >
                {g.rows.map((row, i) => {
                  const isRefund = row.payment_status === "refund";
                  const amt = Number(row.lesson_cost ?? 0);
                  const isOpen = expandedId === row.id;
                  const avatarBg = pupilAvatarColor(row.pupil_id);
                  return (
                    <div
                      key={row.id}
                      style={{
                        borderBottom: i < g.rows.length - 1 ? "0.5px solid #EEF2F7" : "none",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 16px", minHeight: 66 }}>
                        <div
                          style={{
                            width: 40,
                            height: 40,
                            borderRadius: "50%",
                            background: avatarBg,
                            color: "#FFFFFF",
                            fontSize: 14,
                            fontWeight: 600,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                            ...POPPINS,
                          }}
                        >
                          {pupilInitials(displayPupilName(row.pupils?.name))}
                        </div>
                        <button
                          type="button"
                          onClick={() => setExpandedId(isOpen ? null : row.id)}
                          style={{ background: "none", border: 0, padding: 0, textAlign: "left", flex: 1, minWidth: 0, cursor: "pointer", alignSelf: "stretch", display: "flex", flexDirection: "column", justifyContent: "center" }}
                        >
                          <div
                            style={{
                              fontSize: 14,
                              fontWeight: 500,
                              color: "#0B1F3A",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                              ...POPPINS,
                            }}
                          >
                            {displayPupilName(row.pupils?.name) || "Unknown pupil"}
                          </div>
                          <div style={{ fontSize: 12, color: "#B0BAC9", marginTop: 1, ...POPPINS }}>
                            {methodLabel(isRefund ? "refund" : row.payment_method)} · {formatTime(row.created_at)}
                          </div>
                        </button>
                        <div
                          style={{
                            fontSize: 15,
                            fontWeight: 600,
                            color: isRefund ? "#CC2229" : "#1E8E3E",
                            flexShrink: 0,
                            ...POPPINS,
                          }}
                        >
                        {formatGBP(amt)}
                        </div>
                        <QuickActionsMenu
                          trigger={({ onClick }) => (
                            <button
                              type="button"
                              aria-label="More"
                              onClick={onClick}
                              style={{ width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", background: "none", border: 0, cursor: "pointer" }}
                            >
                              <MoreVertical size={16} color="#B0BAC9" />
                            </button>
                          )}
                          items={[
                            ...(!isRefund ? [{ label: "Edit", onClick: () => { setEditingId(row.id); setExpandedId(row.id); } }] : []),
                            ...(!isRefund ? [{ label: "Refund", onClick: () => setRefundRow(row) }] : []),
                            {
                              label: "Delete",
                              destructive: true,
                              onClick: async () => {
                                if (!window.confirm("Delete this payment? This will restore the lesson balance.")) return;
                                if (!userId) return;
                                const { data: { session } } = await supabase.auth.getSession();
                                const token = session?.access_token;
                                if (!token) return;
                                const ok = await deletePaymentRecord(row.id, token, userId);
                                if (ok) await refetch();
                              },
                            },
                          ]}
                        />
                      </div>

                      {isOpen && (
                        <div style={{ margin: "0 16px 12px", paddingTop: 10, borderTop: `0.5px solid #EEF2F7` }}>
                          {editingId === row.id ? (
                            <EditPaymentForm row={row} onCancel={() => setEditingId(null)} onSaved={async () => { setEditingId(null); await refetch(); }} />
                          ) : (
                            <div style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 13, color: NAVY }}>
                              {row.lesson_id && <div><span style={{ color: MUTED }}>Lesson:</span> {row.lesson_id.slice(0,8)}…</div>}
                              {row.notes ? <div><span style={{ color: MUTED }}>Notes:</span> {row.notes}</div> : <div style={{ color: MUTED }}>No notes</div>}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>


      {pupilPickerOpen && (
        <PupilPicker pupils={allPupils} selectedId={pupilFilter} onClose={() => setPupilPickerOpen(false)} onSelect={(id) => { setPupilFilter(id); setPupilPickerOpen(false); }} allowAll />
      )}

      <UnifiedPaymentSheet
        open={unifiedPayOpen}
        onClose={() => setUnifiedPayOpen(false)}
        initialPupilId={unifiedPayPupilId}
        onSaved={async () => {
          setUnifiedPayOpen(false);
          await refetch();
        }}
      />


      {refundRow && (
        <RefundSheet row={refundRow} userId={userId} onClose={() => setRefundRow(null)} onSaved={async () => { setRefundRow(null); await refetch(); }} />
      )}

      <style>{`.no-scrollbar::-webkit-scrollbar{display:none} .no-scrollbar{scrollbar-width:none}`}</style>
    </PageLayout>
  );
}

// ---------- small components ----------
function StatTile({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div
      style={{
        background: "#FFFFFF",
        borderRadius: 14,
        padding: "12px 14px",
        boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
      }}
    >
      <div
        style={{
          fontSize: 10,
          fontWeight: 500,
          color: "#8A94A6",
          letterSpacing: "0.03em",
          marginBottom: 5,
          whiteSpace: "nowrap",
          lineHeight: 1.2,
          ...POPPINS,
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: 18, fontWeight: 600, color, ...POPPINS }}>{value}</div>
    </div>
  );
}

function Pill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} className="px-3 h-8 rounded-full text-[12px] font-medium whitespace-nowrap shrink-0"
      style={{ backgroundColor: active ? NAVY : "#F3F4F6", color: active ? "#fff" : NAVY, border: `0.5px solid ${active ? NAVY : BORDER}` }}>{children}</button>
  );
}

function PupilPicker({ pupils, selectedId, onClose, onSelect, allowAll }: { pupils: PupilLite[]; selectedId: string; onClose: () => void; onSelect: (id: string) => void; allowAll?: boolean }) {
  const [q, setQ] = useState("");
  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return s ? pupils.filter((p) => p.name.toLowerCase().includes(s)) : pupils;
  }, [pupils, q]);
  return (
    <div className="fixed inset-0 z-[70] flex items-end" style={{ backgroundColor: "rgba(11,31,58,0.4)" }} onClick={onClose}>
      <div className="w-full bg-white p-4" style={{ borderTopLeftRadius: 16, borderTopRightRadius: 16, maxHeight: "70vh" }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <div className="text-[16px] font-semibold" style={{ color: NAVY, ...POPPINS }}>Select pupil</div>
          <button type="button" aria-label="Close" onClick={onClose}><X size={20} color={MUTED} /></button>
        </div>
        <div className="relative mb-3">
          <Search size={14} color={MUTED} style={{ position: "absolute", left: 10, top: 12 }} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search pupils…" className="w-full h-10 rounded-lg text-[14px] pl-8 pr-3" style={{ border: `0.5px solid ${BORDER}` }} />
        </div>
        <div className="overflow-y-auto" style={{ maxHeight: "50vh" }}>
          {allowAll && (
            <button type="button" onClick={() => onSelect("")} className="w-full text-left px-3 py-3 text-[14px]" style={{ color: selectedId === "" ? BLUE : NAVY, borderBottom: `0.5px solid ${BORDER}` }}>All pupils</button>
          )}
          {list.map((p) => (
            <button key={p.id} type="button" onClick={() => onSelect(p.id)} className="w-full text-left px-3 py-3 text-[14px]" style={{ color: selectedId === p.id ? BLUE : NAVY, borderBottom: `0.5px solid ${BORDER}` }}>{p.name}</button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------- edit ----------
function EditPaymentForm({ row, onCancel, onSaved }: { row: HistoryRow; onCancel: () => void; onSaved: () => void }) {
  const [amount, setAmount] = useState(String(row.lesson_cost ?? 0));
  const [method, setMethod] = useState(row.payment_method ?? "cash");
  const [date, setDate] = useState(toDateInput(row.created_at));
  const [notes, setNotes] = useState(row.notes ?? "");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    const newAmount = Number(amount);
    const dateIso = new Date(date + "T" + new Date(row.created_at).toTimeString().slice(0,8)).toISOString();
    const { error } = await correctPaymentRecord({
      lessonHistoryId: row.id,
      lessonId: row.lesson_id,
      newAmount,
      method,
      dateIso,
      notes: notes || null,
    });
    if (error) {
      toast.error("Failed to update payment");
      setSaving(false);
      return;
    }
    toast.success("Payment updated");
    setSaving(false);
    onSaved();
  }

  return (
    <div className="flex flex-col gap-3">
      <Input label="Amount (£)" type="number" inputMode="decimal" step="0.01" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} />
      <SelectField label="Method" value={method} onChange={setMethod} options={[["cash","Cash"],["card","Card"],["qr","QR"],["bank_transfer","Bank transfer"],["klarna","Klarna"],["clearpay","Clearpay"]]} />
      <FieldLabel>Date</FieldLabel>
      <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-11 w-full rounded-lg px-3 text-[14px] bg-white" style={{ border: `0.5px solid ${BORDER}`, color: NAVY, ...POPPINS }} />
      <FieldLabel>Notes</FieldLabel>
      <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="w-full rounded-lg px-3 py-2 text-[14px] bg-white" style={{ border: `0.5px solid ${BORDER}`, color: NAVY, ...POPPINS }} />
      <div className="flex gap-2 mt-1">
        <Button variant="ghost" onClick={onCancel} type="button">Cancel</Button>
        <Button onClick={handleSave} disabled={saving} type="button">{saving ? "Saving…" : "Save changes"}</Button>
      </div>
    </div>
  );
}

// ---------- refund ----------
function RefundSheet({ row, userId, onClose, onSaved }: { row: HistoryRow; userId: string | null; onClose: () => void; onSaved: () => void }) {
  const originalAmount = Number(row.lesson_cost ?? 0);
  const [amount, setAmount] = useState(String(originalAmount));
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleRefund() {
    if (!userId) return;
    const refundAmount = Number(amount);
    if (!refundAmount || refundAmount <= 0) { toast.error("Enter a refund amount"); return; }
    if (refundAmount > originalAmount) { toast.error("Refund cannot exceed original payment"); return; }
    setSaving(true);
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) { setSaving(false); return; }
    const SUPABASE_URL = (supabase as any).supabaseUrl as string;
    const SUPABASE_ANON_KEY = (supabase as any).supabaseKey as string;
    const now = new Date().toISOString();
    await fetch(`${SUPABASE_URL}/rest/v1/lesson_history`, {
      method: "POST",
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${token}`, "Content-Type": "application/json", Prefer: "return=minimal" },
      body: JSON.stringify({
        instructor_id: userId,
        pupil_id: row.pupil_id,
        lesson_id: row.lesson_id,
        lesson_cost: -Math.abs(refundAmount),
        payment_status: "refund",
        payment_method: "refund",
        created_at: now,
        notes: reason || null,
      }),
    });
    if (row.lesson_id) {
      await supabase.from("lessons").update({
        payment_status: "unpaid", paid_at: null, paid_amount: null, payment_method: null,
      }).eq("id", row.lesson_id);
    } else {
      const { data: pRow } = await supabase.from("pupils").select("account_balance").eq("id", row.pupil_id).maybeSingle();
      const current = Number((pRow as { account_balance?: number | null } | null)?.account_balance ?? 0);
      await recordRefund({
        pupilId: row.pupil_id,
        amount: refundAmount,
        method: row.payment_method ?? "cash",
        notes: "Refund issued from payments page",
        currentAccountBalance: current,
      });
    }
    // Recompute this pupil's outstanding balance (unpaid lessons + account credit)
    const [{ data: unpaidRows }, { data: pupilRow }] = await Promise.all([
      supabase
        .from("lessons")
        .select("amount_due")
        .eq("instructor_id", userId)
        .eq("pupil_id", row.pupil_id)
        .eq("payment_status", "unpaid")
        .is("deleted_at", null),
      supabase.from("pupils").select("account_balance").eq("id", row.pupil_id).maybeSingle(),
    ]);
    const owed = ((unpaidRows ?? []) as { amount_due: number | null }[]).reduce(
      (s, l) => s + Number(l.amount_due || 0),
      0,
    );
    const credit = Number(
      (pupilRow as { account_balance?: number | null } | null)?.account_balance ?? 0,
    );
    const newBalance = owed - credit;
    toast.success(
      `Refund recorded. Balance updated to ${newBalance < 0 ? "-" : ""}£${Math.abs(newBalance).toFixed(2)}`,
    );
    setSaving(false);
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-end" style={{ backgroundColor: "rgba(11,31,58,0.4)" }} onClick={onClose}>
      <div className="w-full bg-white p-4" style={{ borderTopLeftRadius: 16, borderTopRightRadius: 16 }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <div className="text-[16px] font-semibold" style={{ color: NAVY, ...POPPINS }}>Refund payment</div>
          <button type="button" aria-label="Close" onClick={onClose}><X size={20} color={MUTED} /></button>
        </div>
        <div className="text-[13px] mb-3" style={{ color: MUTED, ...POPPINS }}>
          Original: <strong style={{ color: NAVY }}>{formatGBP(originalAmount)}</strong> to {row.pupils?.name ?? "pupil"}
        </div>
        <div className="flex flex-col gap-3">
          <Input label="Refund amount (£)" type="number" inputMode="decimal" step="0.01" min="0" max={String(originalAmount)} value={amount} onChange={(e) => setAmount(e.target.value)} />
          <FieldLabel>Refund reason</FieldLabel>
          <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} className="w-full rounded-lg px-3 py-2 text-[14px] bg-white" style={{ border: `0.5px solid ${BORDER}`, color: NAVY, ...POPPINS }} placeholder="Why is this being refunded?" />
          <div className="flex gap-2 mt-1">
            <Button variant="ghost" onClick={onClose} type="button">Cancel</Button>
            <Button onClick={handleRefund} disabled={saving} type="button">{saving ? "Processing…" : "Process refund"}</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
// ---------- tiny form primitives ----------
function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="block text-[12px] font-medium" style={{ color: MUTED, ...POPPINS }}>{children}</label>;
}
function SelectField({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: [string, string][] }) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="h-11 w-full rounded-lg px-3 text-[14px] bg-white mt-1" style={{ border: `0.5px solid ${BORDER}`, color: NAVY, ...POPPINS }}>
        {options.map(([v,l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </div>
  );
}


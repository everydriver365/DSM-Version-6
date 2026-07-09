import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Plus, X, MoreVertical, Search, Banknote, CreditCard, Landmark, RotateCcw, Wallet, QrCode, Link2, ShoppingBag, Copy, MessageSquare, Mail, ExternalLink, RefreshCw, Receipt } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "../components/dsm/Button";
import { Input } from "../components/dsm/Input";
import { supabase } from "../lib/supabaseClient";
import WorkspaceDots from "../components/dsm/WorkspaceDots";
import { toast } from "sonner";

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
const NAVY = "#0F2044";
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

const PUPIL_PALETTE = ["#185FA5", "#6B4FD6", "#3B6D11", "#C4501E", "#0C8577", "#A32D2D", "#854F0B", "#185F8A"];
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
  const today = new Date();
  const yest = new Date(); yest.setDate(today.getDate()-1);
  if (sameDay(d, today)) return "Today";
  if (sameDay(d, yest)) return "Yesterday";
  return d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "short", year: "numeric" });
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
export async function recordPayment(args: {
  instructorId: string;
  pupilId: string;
  amount: number;
  method: string;
  notes?: string | null;
  applyToOldestFirst?: boolean;
  saveAsCredit?: boolean;
  createdAt?: string;
}) {
  const { instructorId, pupilId, amount, method, notes, applyToOldestFirst = true, saveAsCredit = false, createdAt } = args;
  const now = createdAt ?? new Date().toISOString();

  let remaining = Number(amount);

  if (!saveAsCredit && applyToOldestFirst) {
    const { data: unpaidLessons } = await supabase
      .from("lessons")
      .select("id, amount_due")
      .eq("pupil_id", pupilId)
      .eq("payment_status", "unpaid")
      .is("deleted_at", null)
      .order("lesson_date", { ascending: true });

    for (const lesson of unpaidLessons ?? []) {
      if (remaining <= 0) break;
      const lessonCost = Number(lesson.amount_due ?? 0);
      if (lessonCost <= 0) continue;
      if (lessonCost <= remaining) {
        await supabase.from("lessons").update({
          payment_status: "paid",
          payment_method: method,
          paid_at: now,
          paid_amount: lessonCost,
          amount_due: 0,
        }).eq("id", lesson.id);
        remaining -= lessonCost;
      } else {
        await supabase.from("lessons").update({
          payment_status: "partial",
          payment_method: method,
          paid_at: now,
          paid_amount: remaining,
          amount_due: lessonCost - remaining,
        }).eq("id", lesson.id);
        remaining = 0;
      }
    }
  }

  if (remaining > 0) {
    const { data: pRow } = await supabase.from("pupils").select("account_balance").eq("id", pupilId).maybeSingle();
    const current = Number((pRow as { account_balance?: number | null } | null)?.account_balance ?? 0);
    await supabase.from("pupils").update({ account_balance: current + remaining }).eq("id", pupilId);
  }

  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) { console.error("[payments] no auth token for lesson_history insert"); return; }
  const SUPABASE_URL = (supabase as any).supabaseUrl as string;
  const SUPABASE_ANON_KEY = (supabase as any).supabaseKey as string;
  const payload = {
    instructor_id: instructorId,
    pupil_id: pupilId,
    lesson_cost: Number(amount),
    payment_status: "paid",
    payment_method: method,
    created_at: now,
    notes: notes || null,
  };
  const response = await fetch(`${SUPABASE_URL}/rest/v1/lesson_history`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify(payload),
  });
  if (!response.ok) console.error("[payments] lesson_history insert error", response.status, await response.text());
}

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

  if (record.lesson_id) {
    await fetch(`${SUPABASE_URL}/rest/v1/lessons?id=eq.${record.lesson_id}`, {
      method: "PATCH",
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        payment_status: "unpaid",
        amount_due: record.lesson_cost,
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
  const [loading, setLoading] = useState(true);

  const [pupilFilter, setPupilFilter] = useState<string>("");
  const [pupilPickerOpen, setPupilPickerOpen] = useState(false);
  const [datePreset, setDatePreset] = useState<DatePreset>("month");
  const [methodFilter, setMethodFilter] = useState<MethodFilter>("all");

  const [takeOpen, setTakeOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [refundRow, setRefundRow] = useState<HistoryRow | null>(null);

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
        .select("amount_due")
        .eq("instructor_id", userId)
        .eq("payment_status", "unpaid")
        .is("deleted_at", null),
    ]);
    setAllPupils((pupilRows ?? []) as PupilLite[]);
    setHistory((hist as unknown as HistoryRow[]) ?? []);
    const owed = ((unpaid ?? []) as { amount_due: number | null }[]).reduce((s, l) => s + Number(l.amount_due || 0), 0);
    setOutstanding(owed);
    setLoading(false);
  }

  useEffect(() => { if (userId) refetch(); /* eslint-disable-next-line */ }, [userId]);

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
    <div
      className="min-h-screen bg-white pb-24 pb-safe relative"
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
      {/* Top bar */}
      <div className="sticky top-0 z-40" style={{ backgroundColor: NAVY }}>
        <div className="flex items-center justify-between px-3" style={{ height: 52 }}>
          <button type="button" aria-label="Back" onClick={() => navigate({ to: "/home" })} className="flex items-center justify-center" style={{ width: 36, height: 36 }}>
            <ArrowLeft size={22} color="#fff" />
          </button>
          <div className="text-[16px] font-semibold text-white" style={POPPINS}>Payments</div>
          <button
            type="button"
            onClick={() => setTakeOpen(true)}
            className="flex items-center gap-1 px-3 h-9 rounded-lg text-[13px] font-semibold text-white"
            style={{ backgroundColor: TEAL }}
          >
            <Plus size={16} color="#fff" /> Take payment
          </button>
        </div>
        <WorkspaceDots activeIndex={3} />
      </div>

      {/* Summary stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, padding: "16px 16px 0" }}>
        <StatTile label="THIS MONTH" value={formatGBP(stats.monthReceived)} color="#2E9E5B" />
        <StatTile
          label="OUTSTANDING"
          value={formatGBP(stats.outstanding)}
          color={stats.outstanding > 0 ? "#E24B4A" : "#8A94A6"}
        />
        <StatTile
          label="REFUNDED"
          value={formatGBP(stats.monthRefunded)}
          color={stats.monthRefunded > 0 ? "#B5661E" : "#8A94A6"}
        />
      </div>

      {/* Search bar (opens existing pupil picker) */}
      <div
        onClick={() => setPupilPickerOpen(true)}
        style={{
          background: "#FFFFFF",
          borderRadius: 12,
          padding: "9px 12px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
          display: "flex",
          alignItems: "center",
          gap: 8,
          margin: "12px 16px 12px",
          cursor: "pointer",
        }}
      >
        <Search size={15} color="#B0BAC9" />
        <div
          style={{
            fontSize: 13,
            color: pupilFilter ? "#12142B" : "#B0BAC9",
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
      </div>

      {/* Period pills */}
      <div
        className="no-scrollbar"
        style={{ display: "flex", gap: 6, padding: "0 16px", marginBottom: 10, overflowX: "auto" }}
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
                background: active ? "#0F2044" : "#FFFFFF",
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

      {/* Method pills */}
      <div
        className="no-scrollbar"
        style={{ display: "flex", gap: 6, padding: "0 16px", marginBottom: 16, overflowX: "auto" }}
      >
        {([
          ["all","All"],["cash","Cash"],["card","Card"],["qr","QR"],["bank_transfer","Bank"],["klarna","Klarna"],
        ] as [MethodFilter,string][]).map(([v,l]) => {
          const active = methodFilter === v;
          return (
            <button
              key={v}
              type="button"
              onClick={() => setMethodFilter(v)}
              style={{
                padding: "7px 14px",
                fontSize: 12,
                fontWeight: 500,
                borderRadius: 20,
                border: 0,
                background: active ? "#185FA5" : "#FFFFFF",
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
                <div style={{ fontSize: 13, fontWeight: 500, color: "#12142B", ...POPPINS }}>{g.label}</div>
                <div style={{ fontSize: 12, color: "#B0BAC9", ...POPPINS }}>{formatGBP(g.total)}</div>
              </div>

              <div
                style={{
                  background: "#FFFFFF",
                  borderRadius: 14,
                  overflow: "hidden",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
                  margin: "0 16px 16px",
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
                      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 16px" }}>
                        <div
                          style={{
                            width: 40,
                            height: 40,
                            borderRadius: "50%",
                            background: avatarBg,
                            color: "#FFFFFF",
                            fontSize: 13,
                            fontWeight: 600,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                            ...POPPINS,
                          }}
                        >
                          {pupilInitials(row.pupils?.name)}
                        </div>
                        <button
                          type="button"
                          onClick={() => setExpandedId(isOpen ? null : row.id)}
                          style={{ background: "none", border: 0, padding: 0, textAlign: "left", flex: 1, minWidth: 0, cursor: "pointer" }}
                        >
                          <div
                            style={{
                              fontSize: 14,
                              fontWeight: 500,
                              color: "#12142B",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                              ...POPPINS,
                            }}
                          >
                            {row.pupils?.name ?? "Unknown pupil"}
                          </div>
                          <div style={{ fontSize: 12, color: "#B0BAC9", marginTop: 1, ...POPPINS }}>
                            {methodLabel(isRefund ? "refund" : row.payment_method)} · {formatTime(row.created_at)}
                          </div>
                        </button>
                        <div
                          style={{
                            fontSize: 15,
                            fontWeight: 600,
                            color: isRefund ? "#E24B4A" : "#2E9E5B",
                            flexShrink: 0,
                            ...POPPINS,
                          }}
                        >
                          {formatGBP(amt)}
                        </div>
                        <div style={{ position: "relative", flexShrink: 0 }}>
                          <button
                            type="button"
                            aria-label="More"
                            onClick={() => setMenuId(menuId === row.id ? null : row.id)}
                            style={{
                              width: 28,
                              height: 28,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              background: "none",
                              border: 0,
                              cursor: "pointer",
                            }}
                          >
                            <MoreVertical size={16} color="#B0BAC9" />
                          </button>
                          {menuId === row.id && (
                            <>
                              <div style={{ position: "fixed", inset: 0, zIndex: 30 }} onClick={() => setMenuId(null)} />
                              <div
                                style={{
                                  position: "absolute",
                                  right: 0,
                                  top: 32,
                                  zIndex: 40,
                                  background: "#FFFFFF",
                                  borderRadius: 8,
                                  border: `0.5px solid ${BORDER}`,
                                  boxShadow: "0 6px 20px rgba(0,0,0,0.08)",
                                  minWidth: 140,
                                }}
                              >
                                {!isRefund && <MenuItem onClick={() => { setEditingId(row.id); setExpandedId(row.id); setMenuId(null); }}>Edit</MenuItem>}
                                {!isRefund && <MenuItem onClick={() => { setRefundRow(row); setMenuId(null); }}>Refund</MenuItem>}
                                <MenuItem danger onClick={async () => {
                                  setMenuId(null);
                                  if (!window.confirm("Delete this payment? This will restore the lesson balance.")) return;
                                  if (!userId) return;
                                  const { data: { session } } = await supabase.auth.getSession();
                                  const token = session?.access_token;
                                  if (!token) return;
                                  const ok = await deletePaymentRecord(row.id, token, userId);
                                  if (ok) await refetch();
                                }}>Delete</MenuItem>
                              </div>
                            </>
                          )}
                        </div>
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

      {takeOpen && (
        <TakePaymentSheet pupils={allPupils} userId={userId} onClose={() => setTakeOpen(false)} onRecorded={async () => { await refetch(); }} />
      )}

      {refundRow && (
        <RefundSheet row={refundRow} userId={userId} onClose={() => setRefundRow(null)} onSaved={async () => { setRefundRow(null); await refetch(); }} />
      )}

      <style>{`.no-scrollbar::-webkit-scrollbar{display:none} .no-scrollbar{scrollbar-width:none}`}</style>
    </div>
  );
}

// ---------- small components ----------
function StatCard({ label, value, color, bold }: { label: string; value: string; color: string; bold?: boolean }) {
  return (
    <div className="p-3" style={{ border: `0.5px solid ${BORDER}`, borderRadius: 12, backgroundColor: "#fff" }}>
      <div className="text-[10px] font-medium uppercase" style={{ color: MUTED, letterSpacing: "0.05em" }}>{label}</div>
      <div className={bold ? "text-[18px] font-bold mt-1" : "text-[16px] font-semibold mt-1"} style={{ color, ...POPPINS }}>{value}</div>
    </div>
  );
}
function Pill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} className="px-3 h-8 rounded-full text-[12px] font-medium whitespace-nowrap shrink-0"
      style={{ backgroundColor: active ? NAVY : "#F3F4F6", color: active ? "#fff" : NAVY, border: `0.5px solid ${active ? NAVY : BORDER}` }}>{children}</button>
  );
}
function MenuItem({ children, onClick, danger }: { children: React.ReactNode; onClick: () => void; danger?: boolean }) {
  return (
    <button type="button" onClick={onClick} className="w-full text-left px-3 py-2 text-[13px]" style={{ color: danger ? RED : NAVY, ...POPPINS }}>{children}</button>
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
    const originalAmount = Number(row.lesson_cost ?? 0);
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) { setSaving(false); toast.error("Not signed in"); return; }
    const SUPABASE_URL = (supabase as any).supabaseUrl as string;
    const SUPABASE_ANON_KEY = (supabase as any).supabaseKey as string;
    const dateIso = new Date(date + "T" + new Date(row.created_at).toTimeString().slice(0,8)).toISOString();
    const patchRes = await fetch(`${SUPABASE_URL}/rest/v1/lesson_history?id=eq.${row.id}`, {
      method: "PATCH",
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ lesson_cost: newAmount, payment_method: method, created_at: dateIso, notes: notes || null }),
    });
    if (!patchRes.ok) { toast.error("Failed to update payment"); setSaving(false); return; }
    if (row.lesson_id && newAmount !== originalAmount) {
      const { data: lessonData } = await supabase.from("lessons").select("amount_due, paid_amount").eq("id", row.lesson_id).maybeSingle();
      const originalDue = Number(lessonData?.amount_due ?? 0) + Number(lessonData?.paid_amount ?? 0);
      if (newAmount >= originalDue) {
        await supabase.from("lessons").update({ payment_status: "paid", paid_amount: originalDue, amount_due: 0 }).eq("id", row.lesson_id);
      } else {
        await supabase.from("lessons").update({ payment_status: "partial", paid_amount: newAmount, amount_due: Math.max(0, originalDue - newAmount) }).eq("id", row.lesson_id);
      }
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
        payment_status: "unpaid", amount_due: refundAmount, paid_at: null, paid_amount: null, payment_method: null,
      }).eq("id", row.lesson_id);
    } else {
      const { data: pRow } = await supabase.from("pupils").select("account_balance").eq("id", row.pupil_id).maybeSingle();
      const current = Number((pRow as { account_balance?: number | null } | null)?.account_balance ?? 0);
      await supabase.from("pupils").update({ account_balance: Math.max(0, current - refundAmount) }).eq("id", row.pupil_id);
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

// ---------- Take Payment sheet (tabs) ----------
type TakeTab = "cash_bank" | "qr" | "link" | "bnpl";

function TakePaymentSheet({ pupils, userId, onClose, onRecorded }: { pupils: PupilLite[]; userId: string | null; onClose: () => void; onRecorded: () => Promise<void> }) {
  const [tab, setTab] = useState<TakeTab>("cash_bank");
  return (
    <div className="fixed inset-0 z-[65] flex items-end" style={{ backgroundColor: "rgba(11,31,58,0.4)" }} onClick={onClose}>
      <div className="w-full bg-white flex flex-col" style={{ borderTopLeftRadius: 16, borderTopRightRadius: 16, maxHeight: "92vh" }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 pb-2">
          <div className="text-[16px] font-semibold" style={{ color: NAVY, ...POPPINS }}>Take payment</div>
          <button type="button" aria-label="Close" onClick={onClose}><X size={20} color={MUTED} /></button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-4 pb-3 overflow-x-auto no-scrollbar">
          <TabBtn active={tab==="cash_bank"} onClick={() => setTab("cash_bank")} icon={<Banknote size={14} color={tab==="cash_bank"?"#fff":NAVY} />}>Cash / Bank</TabBtn>
          <TabBtn active={tab==="qr"} onClick={() => setTab("qr")} icon={<QrCode size={14} color={tab==="qr"?"#fff":NAVY} />}>QR</TabBtn>
          <TabBtn active={tab==="link"} onClick={() => setTab("link")} icon={<Link2 size={14} color={tab==="link"?"#fff":NAVY} />}>Link</TabBtn>
          <TabBtn active={tab==="bnpl"} onClick={() => setTab("bnpl")} icon={<ShoppingBag size={14} color={tab==="bnpl"?"#fff":NAVY} />}>BNPL</TabBtn>
        </div>

        <div className="p-4 pt-1 overflow-y-auto" style={{ maxHeight: "72vh" }}>
          {tab === "cash_bank" && <CashBankTab pupils={pupils} userId={userId} onDone={async () => { await onRecorded(); onClose(); }} />}
          {tab === "qr" && <QrTab pupils={pupils} />}
          {tab === "link" && <LinkTab pupils={pupils} />}
          {tab === "bnpl" && <BnplTab />}
        </div>
      </div>
    </div>
  );
}

function TabBtn({ active, onClick, icon, children }: { active: boolean; onClick: () => void; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} className="flex items-center gap-1 px-3 h-9 rounded-full text-[12px] font-medium whitespace-nowrap shrink-0"
      style={{ backgroundColor: active ? NAVY : "#F3F4F6", color: active ? "#fff" : NAVY, border: `0.5px solid ${active ? NAVY : BORDER}` }}>
      {icon}{children}
    </button>
  );
}

// pupil selector with oldest unpaid prefill
function usePupilAndUnpaid(pupils: PupilLite[]) {
  const [pupilId, setPupilId] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [oldestUnpaid, setOldestUnpaid] = useState<number>(0);
  useEffect(() => {
    if (!pupilId) { setOldestUnpaid(0); return; }
    (async () => {
      const { data } = await supabase.from("lessons")
        .select("amount_due")
        .eq("pupil_id", pupilId)
        .eq("payment_status", "unpaid")
        .is("deleted_at", null)
        .order("lesson_date", { ascending: true })
        .limit(1);
      setOldestUnpaid(Number(data?.[0]?.amount_due ?? 0));
    })();
  }, [pupilId]);
  const pupil = pupils.find((p) => p.id === pupilId) ?? null;
  return { pupilId, setPupilId, pickerOpen, setPickerOpen, oldestUnpaid, pupil };
}

function PupilSelectField({ pupils, pupilId, setPupilId, pickerOpen, setPickerOpen }: { pupils: PupilLite[]; pupilId: string; setPupilId: (s: string) => void; pickerOpen: boolean; setPickerOpen: (b: boolean) => void }) {
  const name = pupilId ? (pupils.find((p) => p.id === pupilId)?.name ?? "") : "";
  return (
    <>
      <FieldLabel>Pupil</FieldLabel>
      <button type="button" onClick={() => setPickerOpen(true)} className="h-11 w-full rounded-lg px-3 text-left text-[14px] bg-white flex items-center justify-between" style={{ border: `0.5px solid ${BORDER}`, color: pupilId ? NAVY : MUTED, ...POPPINS }}>
        {pupilId ? name : "Select a pupil…"}
        <Search size={14} color={MUTED} />
      </button>
      {pickerOpen && (
        <PupilPicker pupils={pupils} selectedId={pupilId} onClose={() => setPickerOpen(false)} onSelect={(id) => { setPupilId(id); setPickerOpen(false); }} />
      )}
    </>
  );
}

// ---------- CASH / BANK TAB ----------
function CashBankTab({ pupils, userId, onDone }: { pupils: PupilLite[]; userId: string | null; onDone: () => Promise<void> }) {
  const { pupilId, setPupilId, pickerOpen, setPickerOpen, oldestUnpaid } = usePupilAndUnpaid(pupils);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<"cash" | "bank_transfer">("cash");
  const [date, setDate] = useState(toDateInput(new Date().toISOString()));
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { if (oldestUnpaid > 0 && !amount) setAmount(String(oldestUnpaid)); /* eslint-disable-next-line */ }, [oldestUnpaid]);

  async function handleSave() {
    setError("");
    if (!userId) return setError("Not signed in");
    if (!pupilId) return setError("Select a pupil");
    const amt = Number(amount);
    if (!amt || amt <= 0) return setError("Enter a valid amount");
    setSaving(true);
    const createdAt = new Date(date + "T" + new Date().toTimeString().slice(0,8)).toISOString();
    await recordPayment({ instructorId: userId, pupilId, amount: amt, method, notes: notes || null, createdAt });
    toast.success("Payment recorded");
    setSaving(false);
    await onDone();
  }

  return (
    <div className="flex flex-col gap-3">
      <PupilSelectField pupils={pupils} pupilId={pupilId} setPupilId={setPupilId} pickerOpen={pickerOpen} setPickerOpen={setPickerOpen} />
      <Input label="Amount (£)" type="number" inputMode="decimal" step="0.01" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" />
      {oldestUnpaid > 0 && <div className="text-[11px]" style={{ color: MUTED }}>Oldest unpaid lesson: {formatGBP(oldestUnpaid)}</div>}
      <FieldLabel>Method</FieldLabel>
      <div className="flex gap-2">
        <ToggleBtn active={method==="cash"} onClick={() => setMethod("cash")}><Banknote size={14} color={method==="cash"?"#fff":NAVY} /> Cash</ToggleBtn>
        <ToggleBtn active={method==="bank_transfer"} onClick={() => setMethod("bank_transfer")}><Landmark size={14} color={method==="bank_transfer"?"#fff":NAVY} /> Bank transfer</ToggleBtn>
      </div>
      <FieldLabel>Date</FieldLabel>
      <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-11 w-full rounded-lg px-3 text-[14px] bg-white" style={{ border: `0.5px solid ${BORDER}`, color: NAVY, ...POPPINS }} />
      <FieldLabel>Notes (optional)</FieldLabel>
      <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="w-full rounded-lg px-3 py-2 text-[14px] bg-white" style={{ border: `0.5px solid ${BORDER}`, color: NAVY, ...POPPINS }} />
      {error && <div className="text-[12px]" style={{ color: RED, ...POPPINS }}>{error}</div>}
      <Button onClick={handleSave} disabled={saving} type="button">{saving ? "Saving…" : "Record payment"}</Button>
    </div>
  );
}

// ---------- QR TAB ----------
async function generateRyftLink(args: { amount: number; pupilId: string; pupilName: string; description: string }) {
  const amountPence = Math.round(args.amount * 100);
  const { data, error } = await supabase.functions.invoke("create-ryft-payment", {
    body: {
      amount: amountPence,
      pupil_id: args.pupilId || undefined,
      pupil_name: args.pupilName || undefined,
      description: args.description || "Payment",
      commission: 1,
      booking_fee_pence: 100,
      instructor_payout_pence: amountPence - 100,
      fee_absorbed_by_instructor: true,
    },
  });
  if (error) throw error;
  const clientSecret =
    (data as { clientSecret?: string; client_secret?: string })?.clientSecret ??
    (data as { client_secret?: string })?.client_secret ?? null;
  if (!clientSecret) throw new Error("No client secret returned");
  const url = `https://everydriver.co.uk/pay?cs=${clientSecret}&amount=${amountPence}&desc=${encodeURIComponent(args.description || "Payment")}`;
  return { url, clientSecret, amountPence };
}

function QrTab({ pupils }: { pupils: PupilLite[] }) {
  const { pupilId, setPupilId, pickerOpen, setPickerOpen, oldestUnpaid, pupil } = usePupilAndUnpaid(pupils);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (oldestUnpaid > 0 && !amount) setAmount(String(oldestUnpaid)); /* eslint-disable-next-line */ }, [oldestUnpaid]);
  useEffect(() => { if (pupil && !description) setDescription(`Lesson payment — ${pupil.name}`); /* eslint-disable-next-line */ }, [pupil]);

  async function generate() {
    const amt = Number(amount);
    if (!pupilId) return toast.error("Select a pupil");
    if (!amt || amt <= 0) return toast.error("Enter an amount");
    setBusy(true);
    try {
      const { url } = await generateRyftLink({ amount: amt, pupilId, pupilName: pupil?.name ?? "", description });
      setQrUrl(url);
      toast.success("QR code ready");
    } catch (e) {
      console.error(e); toast.error("Couldn't generate QR code");
    } finally { setBusy(false); }
  }

  return (
    <div className="flex flex-col gap-3">
      <PupilSelectField pupils={pupils} pupilId={pupilId} setPupilId={setPupilId} pickerOpen={pickerOpen} setPickerOpen={setPickerOpen} />
      <Input label="Amount (£)" type="number" inputMode="decimal" step="0.01" min="0" value={amount} onChange={(e) => { setAmount(e.target.value); setQrUrl(null); }} placeholder="0.00" />
      {oldestUnpaid > 0 && <div className="text-[11px]" style={{ color: MUTED }}>Oldest unpaid lesson: {formatGBP(oldestUnpaid)}</div>}
      <FieldLabel>Description</FieldLabel>
      <input value={description} onChange={(e) => { setDescription(e.target.value); setQrUrl(null); }} className="h-11 w-full rounded-lg px-3 text-[14px] bg-white" style={{ border: `0.5px solid ${BORDER}`, color: NAVY, ...POPPINS }} />

      {!qrUrl ? (
        <button onClick={generate} disabled={busy} type="button" className="h-11 w-full rounded-lg text-[14px] font-semibold text-white disabled:opacity-60" style={{ backgroundColor: PURPLE }}>{busy ? "Generating…" : "Generate QR code"}</button>
      ) : (
        <div className="flex flex-col items-center gap-3 py-2 rounded-lg" style={{ border: `0.5px solid ${BORDER}`, padding: 16 }}>
          <div style={{ backgroundColor: "#fff", padding: 8, borderRadius: 8 }}>
            <QRCodeSVG value={qrUrl} size={200} />
          </div>
          <a href={qrUrl} target="_blank" rel="noreferrer" className="text-[12px] underline break-all text-center" style={{ color: BLUE, wordBreak: "break-all" }}>{qrUrl}</a>
          <div className="flex gap-2 w-full">
            <button type="button" onClick={() => { navigator.clipboard.writeText(qrUrl); toast.success("Link copied"); }} className="flex-1 h-10 rounded-lg text-[13px] font-medium flex items-center justify-center gap-1" style={{ border: `0.5px solid ${BORDER}`, color: NAVY }}>
              <Copy size={14} color={NAVY} /> Copy
            </button>
            <a href={qrUrl} target="_blank" rel="noreferrer" className="flex-1 h-10 rounded-lg text-[13px] font-semibold text-white flex items-center justify-center gap-1" style={{ backgroundColor: BLUE }}>
              <ExternalLink size={14} color="#fff" /> Open
            </a>
            <button type="button" onClick={generate} disabled={busy} className="h-10 w-10 rounded-lg flex items-center justify-center" style={{ border: `0.5px solid ${BORDER}` }} aria-label="Refresh">
              <RefreshCw size={14} color={NAVY} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------- LINK TAB ----------
function LinkTab({ pupils }: { pupils: PupilLite[] }) {
  const { pupilId, setPupilId, pickerOpen, setPickerOpen, oldestUnpaid, pupil } = usePupilAndUnpaid(pupils);
  const [amount, setAmount] = useState("");
  const [url, setUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (oldestUnpaid > 0 && !amount) setAmount(String(oldestUnpaid)); /* eslint-disable-next-line */ }, [oldestUnpaid]);

  async function generate() {
    const amt = Number(amount);
    if (!pupilId) return toast.error("Select a pupil");
    if (!amt || amt <= 0) return toast.error("Enter an amount");
    setBusy(true);
    try {
      const { url } = await generateRyftLink({ amount: amt, pupilId, pupilName: pupil?.name ?? "", description: `Lesson payment — ${pupil?.name ?? ""}` });
      setUrl(url);
      toast.success("Payment link ready");
    } catch (e) {
      console.error(e); toast.error("Couldn't generate link");
    } finally { setBusy(false); }
  }

  const message = url ? `Hi ${pupil?.name ?? ""}, please pay £${Number(amount).toFixed(2)} for your lesson: ${url}` : "";

  return (
    <div className="flex flex-col gap-3">
      <PupilSelectField pupils={pupils} pupilId={pupilId} setPupilId={setPupilId} pickerOpen={pickerOpen} setPickerOpen={setPickerOpen} />
      <Input label="Amount (£)" type="number" inputMode="decimal" step="0.01" min="0" value={amount} onChange={(e) => { setAmount(e.target.value); setUrl(null); }} placeholder="0.00" />
      {oldestUnpaid > 0 && <div className="text-[11px]" style={{ color: MUTED }}>Oldest unpaid lesson: {formatGBP(oldestUnpaid)}</div>}
      {!url ? (
        <Button onClick={generate} disabled={busy} type="button">{busy ? "Generating…" : "Generate payment link"}</Button>
      ) : (
        <div className="flex flex-col gap-3 rounded-lg" style={{ border: `0.5px solid ${BORDER}`, padding: 16 }}>
          <div className="text-[12px] break-all" style={{ color: NAVY, wordBreak: "break-all" }}>{url}</div>
          <div className="grid grid-cols-3 gap-2">
            <a href={pupil?.phone ? `sms:${pupil.phone}?body=${encodeURIComponent(message)}` : "#"} onClick={(e) => { if (!pupil?.phone) { e.preventDefault(); toast.error("No phone on file"); } }} className="h-10 rounded-lg text-[12px] font-medium flex items-center justify-center gap-1" style={{ border: `0.5px solid ${BORDER}`, color: NAVY, opacity: pupil?.phone ? 1 : 0.5 }}>
              <MessageSquare size={14} color={NAVY} /> SMS
            </a>
            <a href={pupil?.email ? `mailto:${pupil.email}?subject=${encodeURIComponent("Lesson payment")}&body=${encodeURIComponent(message)}` : "#"} onClick={(e) => { if (!pupil?.email) { e.preventDefault(); toast.error("No email on file"); } }} className="h-10 rounded-lg text-[12px] font-medium flex items-center justify-center gap-1" style={{ border: `0.5px solid ${BORDER}`, color: NAVY, opacity: pupil?.email ? 1 : 0.5 }}>
              <Mail size={14} color={NAVY} /> Email
            </a>
            <button type="button" onClick={() => { navigator.clipboard.writeText(url); toast.success("Link copied"); }} className="h-10 rounded-lg text-[12px] font-medium flex items-center justify-center gap-1" style={{ border: `0.5px solid ${BORDER}`, color: NAVY }}>
              <Copy size={14} color={NAVY} /> Copy
            </button>
          </div>
          <button type="button" onClick={generate} disabled={busy} className="h-9 rounded-lg text-[12px] font-medium flex items-center justify-center gap-1" style={{ border: `0.5px solid ${BORDER}`, color: MUTED }}>
            <RefreshCw size={12} color={MUTED} /> Generate a new link
          </button>
        </div>
      )}
    </div>
  );
}

// ---------- BNPL TAB ----------
function BnplTab() {
  return (
    <div className="flex flex-col gap-3 py-4">
      <div className="rounded-lg p-4 flex items-start gap-3" style={{ backgroundColor: "#FEF3C7", border: `0.5px solid #FCD34D` }}>
        <ShoppingBag size={22} color={AMBER} style={{ marginTop: 2 }} />
        <div className="flex-1">
          <div className="text-[14px] font-semibold" style={{ color: AMBER, ...POPPINS }}>Klarna and Clearpay coming soon</div>
          <div className="text-[12px] mt-1" style={{ color: AMBER, ...POPPINS }}>
            Buy-now-pay-later checkout for pupils is on the way. You'll be able to send BNPL payment links from here.
          </div>
        </div>
      </div>
      <button type="button" onClick={() => toast.success("We'll let you know when BNPL is available")} className="h-11 w-full rounded-lg text-[14px] font-semibold" style={{ border: `0.5px solid ${AMBER}`, color: AMBER, backgroundColor: "#fff" }}>
        Notify me when available
      </button>
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
function ToggleBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} className="flex-1 h-10 rounded-lg text-[13px] font-medium flex items-center justify-center gap-1"
      style={{ backgroundColor: active ? NAVY : "#F3F4F6", color: active ? "#fff" : NAVY, border: `0.5px solid ${active ? NAVY : BORDER}` }}>
      {children}
    </button>
  );
}

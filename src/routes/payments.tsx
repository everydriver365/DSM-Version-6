import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { tokens } from "@/lib/tokens";
import { useEffect, useMemo, useState } from "react";
import DSMSkeleton from "@/components/dsm/DSMSkeleton";
import { IconCreditCard, IconCurrencyPound, IconDotsVertical, IconPlus, IconRotateClockwise2, IconSearch, IconX } from "@tabler/icons-react";
import { IconCashBanknote, IconBuildingBank, IconQrcode, IconReceipt, IconWallet } from "@tabler/icons-react";
import { EmptyState } from "@/components/dsm/EmptyState";
import DSMTopSheet from "@/components/dsm/DSMTopSheet";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";

import { Button } from "../components/dsm/Button";
import { Input } from "../components/dsm/Input";
import { supabase } from "../lib/supabaseClient";
import { toast } from "sonner";
import { recordPayment, recordRefund, correctPaymentRecord, getPupilBalance, type PupilBalance } from "@/lib/payments";
import { hapticSuccess, hapticError, tapLight } from "@/lib/haptics";
import { calculateOutstandingOwed, calculatePaidOutstandingBreakdown } from "@/lib/paymentsOwed";
import { UnifiedPaymentSheet } from "@/components/payments/UnifiedPaymentSheet";
import { QuickActionsMenu } from "@/components/dsm/QuickActionsMenu";
import { pupilColour } from "@/components/PupilAvatar";
import { BottomSheet, SheetGroup, SheetRow, SheetRadioRow, SheetSearchRow } from "@/components/dsm/BottomSheetV2";


export const Route = createFileRoute("/payments")({
  head: () => ({
    meta: [
      { title: "Payments — EDP by EveryDriver" },
      { name: "description", content: "Take payments (cash, QR, link, BNPL), track history, edits and refunds." },
    ],
  }),
  component: PaymentsPage,
});

const POPPINS = { fontFamily: "Poppins, sans-serif" } as const;
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

// Shared deterministic pupil colour so the same pupil looks identical everywhere.
const pupilAvatarColor = (id: string) => pupilColour(id);
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
  if (refund) return <IconRotateClockwise2 stroke={1.5} size={size} color={color} />;
  switch (method) {
    case "cash": return <IconCashBanknote size={size} color={color} />;
    case "card": return <IconCreditCard stroke={1.5} size={size} color={color} />;
    case "qr": return <IconQrcode size={size} color={color} />;
    case "bank_transfer": return <IconBuildingBank size={size} color={color} />;
    case "klarna":
    case "clearpay": return <IconWallet size={size} color={color} />;
    default: return <IconCashBanknote size={size} color={color} />;
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

type DatePreset = "today" | "week" | "month" | "lastMonth" | "all";
type MethodFilter = "all" | "cash" | "card" | "qr" | "bank_transfer" | "klarna" | "clearpay" | "refund";
type UIMethodFilter = "all" | "cash" | "card" | "bank_transfer" | "square" | "refund";
const METHOD_FILTER_MAP: Record<UIMethodFilter, MethodFilter> = {
  all: "all",
  cash: "cash",
  card: "card",
  bank_transfer: "bank_transfer",
  square: "qr",
  refund: "refund",
};
const DATE_PRESETS: { id: DatePreset; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "week", label: "This week" },
  { id: "month", label: "This month" },
  { id: "lastMonth", label: "Last month" },
  { id: "all", label: "All time" },
];
const METHOD_PILLS: { id: UIMethodFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "cash", label: "Cash" },
  { id: "card", label: "Card" },
  { id: "bank_transfer", label: "Bank transfer" },
  { id: "square", label: "Square" },
  { id: "refund", label: "Refund" },
];

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
  const [methodFilter, setMethodFilter] = useState<UIMethodFilter>("all");

  const [unifiedPayOpen, setUnifiedPayOpen] = useState(false);
  const [unifiedPayPupilId, setUnifiedPayPupilId] = useState<string | undefined>();
  const [expandedId, setExpandedId] = useState<string | null>(null);
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
        .select("amount_due, paid_amount, payment_status")
        .eq("instructor_id", userId)
        .in("payment_status", ["unpaid", "partial"])
        .not("lesson_type", "eq", "event")
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

  const { pullToRefreshProps } = usePullToRefresh({ onRefresh: async () => { await refetch(); } });

  // Keep totals and history in sync with payments recorded elsewhere.
  useEffect(() => {
    if (!userId) return;
    const onPaymentRecorded = () => { refetch(); };
    window.addEventListener("dsm-payment-recorded", onPaymentRecorded);
    return () => window.removeEventListener("dsm-payment-recorded", onPaymentRecorded);
    /* eslint-disable-next-line */
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
    <DSMTopSheet title="Payments">
      <div
        {...pullToRefreshProps}
        style={{ minHeight: "100%", background: "#F4F6F8", flex: 1 }}
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

      {/* Overview header row */}
      <div
        style={{
          padding: "2px 16px 0",
          marginBottom: 10,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          ...POPPINS,
        }}
      >
        <div style={{ fontSize: 11, fontWeight: 500, color: "#6E6E73", textTransform: "uppercase", letterSpacing: "0.3px", ...POPPINS }}>Overview</div>
        <button
          type="button"
          onClick={() => { setUnifiedPayPupilId(pupilFilter && pupilFilter !== "all" ? pupilFilter : undefined); setUnifiedPayOpen(true); }}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            background: "#3B8B3B",
            color: "#fff",
            fontSize: 13,
            fontWeight: 500,
            padding: "9px 14px",
            borderRadius: 9,
            border: 0,
            cursor: "pointer",
            ...POPPINS,
          }}
        >
          <IconPlus stroke={1.5} size={14} color="#fff" /> Take payment
        </button>
      </div>

      {/* Summary stats — plain content block inside the single sheet (no card) */}
      <div style={{ padding: "0 16px", marginBottom: 14 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8 }}>
          <StatBlock label="This month" value={formatGBP(stats.monthReceived)} color="#3B8B3B" />
          <StatBlock
            label="Outstanding"
            value={formatGBP(stats.outstanding)}
            color={stats.outstanding > 0 ? "#C8434F" : "#C7C7CC"}
          />
          <StatBlock
            label="Refunded"
            value={formatGBP(stats.monthRefunded)}
            color={stats.monthRefunded > 0 ? "#C8434F" : "#C7C7CC"}
          />
        </div>
        <div style={{ fontSize: 11, color: "#6E6E73", marginTop: 6, ...POPPINS }}>
          All pupils · not affected by the filters below
        </div>
      </div>


      {/* Paid vs outstanding breakdown */}
      {paidBreakdown.totalDue > 0 && (
        <div style={{ padding: "0 16px", marginBottom: 14 }}>
          <div
            style={{
              background: "#F8FAFB",
              border: "0.5px solid #E5E5EA",
              borderRadius: 12,
              padding: 14,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: "#000", ...POPPINS }}>Paid vs outstanding</div>
              <div style={{ fontSize: 11, color: "#6E6E73", textAlign: "right", ...POPPINS }}>
                {paidBreakdown.paidPercent >= 1
                  ? "Fully collected"
                  : paidBreakdown.paidPercent > 0
                    ? `${Math.round(paidBreakdown.paidPercent * 100)}% collected`
                    : "None collected"}
              </div>
            </div>
            <div style={{ fontSize: 11, color: "#6E6E73", marginTop: 2, marginBottom: 10, ...POPPINS }}>
              Unpaid &amp; part-paid lessons · all pupils
            </div>
            <div
              style={{
                height: 6,
                borderRadius: 999,
                background: "#FBEAEC",
                overflow: "hidden",
                marginBottom: 12,
              }}
            >
              <div
                style={{
                  width: `${Math.min(100, Math.round(paidBreakdown.paidPercent * 100))}%`,
                  background: "#3B8B3B",
                  height: "100%",
                  borderRadius: 999,
                }}
              />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8 }}>
              <StatBlock label="Total due" value={formatGBP(paidBreakdown.totalDue)} color="#000000" valueSize={13} />
              <StatBlock label="Paid" value={formatGBP(paidBreakdown.totalPaid)} color="#3B8B3B" valueSize={13} />
              <StatBlock label="Outstanding" value={formatGBP(paidBreakdown.outstanding)} color="#C8434F" valueSize={13} />
            </div>
          </div>

        </div>
      )}

      {/* IconSearch bar (opens existing pupil picker) */}
      <button
        type="button"
        onClick={() => setPupilPickerOpen(true)}
        style={{
          background: "#F2F2F4",
          fontFamily: 'Poppins, sans-serif',
          borderRadius: 10,
          padding: "9px 12px",

          display: "flex",
          alignItems: "center",
          gap: 8,
          margin: "0 16px 14px",
          cursor: "pointer",
          border: 0,
          width: "calc(100% - 32px)",
          textAlign: "left",
        }}
      >
        <IconSearch stroke={1.5} size={14} color="#6E6E73" />
        <div
          style={{
            fontSize: 13,
            color: pupilFilter ? "#000000" : "#6E6E73",
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

      {/* Period filter — shared segmented control */}
      <div style={{ padding: "0 16px", marginBottom: 14 }}>
        <SegmentedTabs<DatePreset>
          tabs={[
            { id: "today", label: "Today" },
            { id: "week", label: "Week" },
            { id: "month", label: "Month" },
            { id: "year", label: "Year" },
          ]}
          active={datePreset}
          onChange={(v) => setDatePreset(v)}
        />
      </div>


      {/* History */}
      <div style={{ paddingBottom: "calc(88px + env(safe-area-inset-bottom, 0px))" }}>
        {loading ? (
          <div style={{ padding: "0 16px", display: "flex", flexDirection: "column", gap: 10 }}>
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "12px 14px",
                  background: "#FFFFFF",
                  border: "0.5px solid #E5E5EA",
                  borderRadius: 12,
                  marginBottom: 8,
                }}
              >
                <DSMSkeleton width={40} height={40} borderRadius={20} />
                <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 8 }}>
                  <DSMSkeleton width="55%" height={14} borderRadius={6} />
                  <DSMSkeleton width="35%" height={12} borderRadius={6} />
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
                  <DSMSkeleton width={64} height={16} borderRadius={6} />
                  <DSMSkeleton width={48} height={20} borderRadius={10} />
                </div>
              </div>
            ))}
          </div>
        ) : groups.length === 0 ? (
          <EmptyState
            icon={<IconCurrencyPound size={32} color="#9CA3AF" stroke={1.5} />}
            title="No payments yet"
            subtitle="Payments will appear here once recorded"
          />
        ) : (
          groups.map((g) => (
            <div key={g.label + g.rows[0].id}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 16px", marginBottom: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 500, color: '#6E6E73', textTransform: 'uppercase', letterSpacing: '0.3px', ...POPPINS }}>{g.label}</div>
                <div style={{ fontSize: 13, fontWeight: 500, color: "#000", ...POPPINS }}>{formatGBP(g.total)}</div>
              </div>

              <div
                style={{
                  margin: '0 16px 16px',
                }}
              >
                {g.rows.map((row) => {
                  const isRefund = row.payment_status === "refund";
                  const amt = Number(row.lesson_cost ?? 0);
                  const isOpen = expandedId === row.id;
                  const avatarBg = pupilAvatarColor(row.pupil_id);
                  const isNonRevenue =
                    amt === 0 || String(row.payment_method ?? "").toLowerCase().includes("cancel");
                  return (
                    <div
                      key={row.id}
                      style={{
                        background: "#FFFFFF",
                        border: "0.5px solid #E5E5EA",
                        borderRadius: 12,
                        marginBottom: 8,
                        transition: "transform 0.1s ease, opacity 0.1s ease",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px" }}>
                        <div
                          style={{
                            width: 40,
                            height: 40,
                            borderRadius: "50%",
                            background: avatarBg,
                            color: tokens.white,
                            fontSize: 13,
                            fontWeight: 500,
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
                          onClick={() => { tapLight(); setExpandedId(isOpen ? null : row.id); }}
                          onTouchStart={(e) => {
                            e.currentTarget.style.transform = "scale(0.98)";
                            e.currentTarget.style.opacity = "0.9";
                          }}
                          onTouchEnd={(e) => {
                            e.currentTarget.style.transform = "scale(1)";
                            e.currentTarget.style.opacity = "1";
                          }}
                          style={{ background: "none", border: 0, padding: 0, textAlign: "left", flex: 1, minWidth: 0, cursor: "pointer", alignSelf: "stretch", display: "flex", flexDirection: "column", justifyContent: "center", transition: "transform 0.1s ease, opacity 0.1s ease" }}
                        >
                          <div
                            style={{
                              fontSize: 14,
                              fontWeight: 500,
                              color: "#000",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                              ...POPPINS,
                            }}
                          >
                            {displayPupilName(row.pupils?.name) || "Unknown pupil"}
                          </div>
                          <div style={{ fontSize: 12, color: "#6E6E73", marginTop: 2, ...POPPINS }}>
                            {methodLabel(isRefund ? "refund" : row.payment_method)} · {formatTime(row.created_at)}
                          </div>
                        </button>
                        <div
                          style={{
                            fontSize: 13,
                            fontWeight: 500,
                            color: isNonRevenue ? "#6E6E73" : isRefund ? "#C8434F" : "#3B8B3B",
                            textAlign: "right",
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
                              style={{ width: 28, height: 28, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", background: "none", border: 0, cursor: "pointer", flexShrink: 0 }}
                            >
                              <IconDotsVertical stroke={1.5} size={14} color="#C7C7CC" />
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
                            <EditPaymentForm row={row} onCancel={() => setEditingId(null)} onSaved={async () => { setEditingId(null); await refetch(); setTimeout(() => { window.dispatchEvent(new Event('dsm-payment-recorded')); }, 300); }} />
                          ) : (
                            <div style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: tokens.fontSize.base, color: NAVY }}>
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
        <RefundSheet row={refundRow} userId={userId} onClose={() => setRefundRow(null)} onSaved={async () => { setRefundRow(null); await refetch(); setTimeout(() => { window.dispatchEvent(new Event('dsm-payment-recorded')); }, 300); }} />
      )}

      <style>{`.no-scrollbar::-webkit-scrollbar{display:none} .no-scrollbar{scrollbar-width:none}`}</style>
    </div>
    </DSMTopSheet>
  );
}

// ---------- small components ----------
function StatBlock({ label, value, color, valueSize = 19 }: { label: string; value: string; color: string; valueSize?: number }) {
  return (
    <div style={{ minWidth: 0 }}>
      <div
        style={{
          fontSize: 10,
          fontWeight: 500,
          color: "#6E6E73",
          textTransform: "uppercase",
          letterSpacing: "0.3px",
          whiteSpace: "nowrap",
          lineHeight: 1.2,
          ...POPPINS,
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: valueSize, fontWeight: 500, letterSpacing: "-0.2px", marginTop: 4, color, ...POPPINS }}>{value}</div>
    </div>
  );
}

function PupilPicker({ pupils, selectedId, onClose, onSelect, allowAll }: { pupils: PupilLite[]; selectedId: string; onClose: () => void; onSelect: (id: string) => void; allowAll?: boolean }) {
  const [q, setQ] = useState("");
  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return s ? pupils.filter((p) => p.name.toLowerCase().includes(s)) : pupils;
  }, [pupils, q]);
  return (
    <BottomSheet title="Select pupil" onClose={onClose}>
      <SheetGroup>
        <SheetSearchRow value={q} onChange={setQ} placeholder="Search pupils…" />
        {allowAll && (
          <SheetRadioRow title="All pupils" selected={selectedId === ""} onSelect={() => onSelect("")} />
        )}
        {list.map((p) => (
          <SheetRadioRow key={p.id} title={p.name} selected={selectedId === p.id} onSelect={() => onSelect(p.id)} />
        ))}
      </SheetGroup>
    </BottomSheet>
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
      hapticError();
      setSaving(false);
      return;
    }
    toast.success("Payment updated");
    hapticSuccess();
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
  const [pupilBalance, setPupilBalance] = useState<PupilBalance | null>(null);

  useEffect(() => {
    if (!row.pupil_id) return;
    getPupilBalance(row.pupil_id)
      .then(setPupilBalance)
      .catch((e) => console.error("[RefundSheet] getPupilBalance", e));
  }, [row.pupil_id]);

  const maxRefundableAmount = useMemo(() => {
    if (!pupilBalance) return 0;
    return Math.max(0, pupilBalance.lessonsPaid + pupilBalance.accountCredit);
  }, [pupilBalance]);

  async function handleRefund() {
    if (!userId) return;
    const refundAmount = Number(amount);
    if (!refundAmount || refundAmount <= 0) { toast.error("Enter a refund amount"); return; }
    if (refundAmount > originalAmount) { toast.error("Refund cannot exceed original payment"); return; }
    if (refundAmount > maxRefundableAmount) {
      toast.error(`Refund amount exceeds available paid/credit balance (${formatGBP(maxRefundableAmount)})`);
      return;
    }
    setSaving(true);
    const { data: pRow } = await supabase
      .from("pupils")
      .select("account_balance")
      .eq("id", row.pupil_id)
      .maybeSingle();
    const currentBalance = Number(
      (pRow as { account_balance?: number | null } | null)?.account_balance ?? 0,
    );
    await recordRefund({
      pupilId: row.pupil_id,
      amount: refundAmount,
      method: row.payment_method ?? "cash",
      notes: reason || "Refund issued from payments page",
      currentAccountBalance: currentBalance,
    });
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
    hapticSuccess();
    setSaving(false);
    onSaved();
  }

  return (
    <BottomSheet
      title="Refund payment"
      subtitle={`Original: ${formatGBP(originalAmount)} to ${row.pupils?.name ?? "pupil"}`}
      onClose={onClose}
    >
      <SheetGroup>
        <SheetRow>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: tokens.fontSize.base, fontWeight: tokens.fontWeight.medium, color: tokens.textSecondary }}>Refund amount (£)</div>
          </div>
          <input
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            max={String(originalAmount)}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="text-right bg-transparent focus:outline-none"
            style={{ fontFamily: "Poppins, sans-serif", fontSize: tokens.fontSize.lg, fontWeight: tokens.fontWeight.semibold, color: NAVY, width: 120 }}
          />
        </SheetRow>
        <SheetRow>
          <div style={{ width: "100%" }}>
            <div style={{ fontSize: tokens.fontSize.base, fontWeight: tokens.fontWeight.medium, color: tokens.textSecondary, marginBottom: 6 }}>Refund reason</div>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              className="w-full bg-transparent focus:outline-none"
              style={{ fontFamily: "Poppins, sans-serif", fontSize: tokens.fontSize.md, color: NAVY, resize: "none" }}
              placeholder="Why is this being refunded?"
            />
          </div>
        </SheetRow>
      </SheetGroup>

      <SheetGroup>
        <SheetRow onClick={saving ? undefined : handleRefund}>
          <div style={{ flex: 1, textAlign: "center", fontSize: tokens.fontSize.lg, fontWeight: tokens.fontWeight.bold, color: tokens.red }}>
            {saving ? "Processing…" : "Confirm refund"}
          </div>
        </SheetRow>
      </SheetGroup>
    </BottomSheet>
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


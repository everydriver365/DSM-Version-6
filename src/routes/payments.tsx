import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Plus, X, MoreVertical, Search, Banknote, CreditCard, Landmark, RotateCcw, Wallet } from "lucide-react";
import { Button } from "../components/dsm/Button";
import { Input } from "../components/dsm/Input";
import { supabase } from "../lib/supabaseClient";
import { toast } from "sonner";

export const Route = createFileRoute("/payments")({
  head: () => ({
    meta: [
      { title: "Payments — DSM by EveryDriver" },
      { name: "description", content: "Track outstanding balances, payment history, edits and refunds." },
    ],
  }),
  component: PaymentsPage,
});

const POPPINS = { fontFamily: "Inter, sans-serif" } as const;
const NAVY = "#0F2044";
const BORDER = "#E2E6ED";
const MUTED = "#6B7280";
const GREEN = "#16A34A";
const RED = "#DC2626";

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
  return d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
}
function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}
function toDateInput(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
}

const METHODS = [
  { value: "cash", label: "Cash" },
  { value: "card", label: "Card" },
  { value: "bank_transfer", label: "Bank transfer" },
  { value: "klarna", label: "Klarna" },
  { value: "clearpay", label: "Clearpay" },
] as const;

function methodLabel(m: string | null | undefined) {
  if (!m) return "—";
  const found = METHODS.find((x) => x.value === m);
  if (found) return found.label;
  if (m === "refund") return "Refund";
  return m.charAt(0).toUpperCase() + m.slice(1);
}
function MethodIcon({ method, refund }: { method: string | null | undefined; refund?: boolean }) {
  const size = 18;
  const color = refund ? RED : NAVY;
  if (refund) return <RotateCcw size={size} color={color} />;
  switch (method) {
    case "cash": return <Banknote size={size} color={color} />;
    case "card": return <CreditCard size={size} color={color} />;
    case "bank_transfer": return <Landmark size={size} color={color} />;
    case "klarna":
    case "clearpay": return <Wallet size={size} color={color} />;
    default: return <Banknote size={size} color={color} />;
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
}) {
  const { instructorId, pupilId, amount, method, notes, applyToOldestFirst = true, saveAsCredit = false } = args;
  const now = new Date().toISOString();

  let remaining = Number(amount);

  if (!saveAsCredit && applyToOldestFirst) {
    const { data: unpaidLessons, error } = await supabase
      .from("lessons")
      .select("id, amount_due")
      .eq("pupil_id", pupilId)
      .eq("payment_status", "unpaid")
      .is("deleted_at", null)
      .order("lesson_date", { ascending: true });
    if (error) console.error("[payments] fetch unpaid lessons error", error);

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
    const { data: pRow } = await supabase
      .from("pupils").select("account_balance").eq("id", pupilId).maybeSingle();
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
interface PupilLite { id: string; name: string; account_balance?: number | null }
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

type DatePreset = "today" | "week" | "month" | "year" | "all" | "custom";
type MethodFilter = "all" | "cash" | "card" | "bank_transfer" | "klarna" | "clearpay" | "refund";

// ---------- page ----------
function PaymentsPage() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [allPupils, setAllPupils] = useState<PupilLite[]>([]);
  const [history, setHistory] = useState<HistoryRow[] | null>(null);
  const [outstanding, setOutstanding] = useState(0);
  const [loading, setLoading] = useState(true);

  // filters
  const [pupilFilter, setPupilFilter] = useState<string>(""); // "" = all
  const [pupilPickerOpen, setPupilPickerOpen] = useState(false);
  const [datePreset, setDatePreset] = useState<DatePreset>("month");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [methodFilter, setMethodFilter] = useState<MethodFilter>("all");

  // sheets
  const [recordOpen, setRecordOpen] = useState(false);
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
        .select("id, name, account_balance")
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

  // ---------- stats (independent of filters) ----------
  const stats = useMemo(() => {
    const rows = history ?? [];
    const monthStart = startOfMonth(new Date()).getTime();
    let total = 0, thisMonth = 0;
    for (const r of rows) {
      const amt = Number(r.lesson_cost ?? 0);
      if (r.payment_status === "paid") {
        total += amt;
        if (new Date(r.created_at).getTime() >= monthStart) thisMonth += amt;
      } else if (r.payment_status === "refund") {
        total += amt; // refunds already stored negative
        if (new Date(r.created_at).getTime() >= monthStart) thisMonth += amt;
      }
    }
    return { total, thisMonth, outstanding };
  }, [history, outstanding]);

  // ---------- filtered list ----------
  const filtered = useMemo(() => {
    const rows = history ?? [];
    const now = new Date();
    let fromMs = -Infinity;
    let toMs = Infinity;
    switch (datePreset) {
      case "today": fromMs = startOfDay(now).getTime(); break;
      case "week": fromMs = startOfWeek(now).getTime(); break;
      case "month": fromMs = startOfMonth(now).getTime(); break;
      case "year": fromMs = startOfYear(now).getTime(); break;
      case "custom":
        if (customFrom) fromMs = new Date(customFrom).getTime();
        if (customTo) toMs = new Date(customTo).getTime() + 24*60*60*1000 - 1;
        break;
      case "all": default: break;
    }
    return rows.filter((r) => {
      if (pupilFilter && r.pupil_id !== pupilFilter) return false;
      const t = new Date(r.created_at).getTime();
      if (t < fromMs || t > toMs) return false;
      if (methodFilter !== "all") {
        if (methodFilter === "refund") { if (r.payment_status !== "refund") return false; }
        else if (r.payment_method !== methodFilter) return false;
      }
      return true;
    });
  }, [history, pupilFilter, datePreset, customFrom, customTo, methodFilter]);

  // group by date label
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
    <div className="min-h-screen bg-white pb-24 pb-safe relative" style={POPPINS}>
      {/* Top bar */}
      <div className="sticky top-0 z-40 flex items-center justify-between px-3" style={{ height: 52, backgroundColor: NAVY }}>
        <button type="button" aria-label="Back" onClick={() => navigate({ to: "/home" })} className="flex items-center justify-center" style={{ width: 36, height: 36 }}>
          <ArrowLeft size={22} color="#fff" />
        </button>
        <div className="text-[16px] font-semibold text-white" style={POPPINS}>Payments</div>
        <button
          type="button"
          onClick={() => setRecordOpen(true)}
          className="flex items-center gap-1 px-3 h-9 rounded-lg text-[13px] font-semibold text-white"
          style={{ backgroundColor: "#1877D6" }}
        >
          <Plus size={16} color="#fff" /> Record
        </button>
      </div>

      {/* Summary stats */}
      <div className="p-4 grid grid-cols-3 gap-3">
        <StatCard label="Total received" value={formatGBP(stats.total)} color={GREEN} bold />
        <StatCard label="This month" value={formatGBP(stats.thisMonth)} color={NAVY} />
        <StatCard label="Outstanding" value={formatGBP(stats.outstanding)} color={stats.outstanding > 0 ? RED : NAVY} />
      </div>

      {/* Filters */}
      <div className="bg-white" style={{ padding: "12px 16px", borderBottom: `0.5px solid ${BORDER}` }}>
        {/* Pupil filter */}
        <button
          type="button"
          onClick={() => setPupilPickerOpen(true)}
          className="w-full h-10 rounded-lg px-3 flex items-center justify-between text-[14px]"
          style={{ border: `0.5px solid ${BORDER}`, color: NAVY, ...POPPINS }}
        >
          <span className="flex items-center gap-2 truncate">
            <Search size={14} color={MUTED} />
            {pupilFilter ? pupilName : "All pupils"}
          </span>
          {pupilFilter && (
            <span
              onClick={(e) => { e.stopPropagation(); setPupilFilter(""); }}
              className="text-[12px]"
              style={{ color: MUTED }}
            >Clear</span>
          )}
        </button>

        {/* Date filter pills */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar mt-3" style={{ WebkitOverflowScrolling: "touch" }}>
          {([
            ["today","Today"],
            ["week","This week"],
            ["month","This month"],
            ["year","This year"],
            ["all","All time"],
            ["custom","Custom"],
          ] as [DatePreset, string][]).map(([v,l]) => (
            <Pill key={v} active={datePreset===v} onClick={() => setDatePreset(v)}>{l}</Pill>
          ))}
        </div>
        {datePreset === "custom" && (
          <div className="flex gap-2 mt-2">
            <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} className="h-9 flex-1 rounded-lg px-2 text-[13px]" style={{ border: `0.5px solid ${BORDER}` }} />
            <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} className="h-9 flex-1 rounded-lg px-2 text-[13px]" style={{ border: `0.5px solid ${BORDER}` }} />
          </div>
        )}

        {/* Method filter pills */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar mt-3">
          {([
            ["all","All"],
            ["cash","Cash"],
            ["card","Card"],
            ["bank_transfer","Bank"],
            ["klarna","Klarna"],
            ["clearpay","Clearpay"],
            ["refund","Refund"],
          ] as [MethodFilter, string][]).map(([v,l]) => (
            <Pill key={v} active={methodFilter===v} onClick={() => setMethodFilter(v)}>{l}</Pill>
          ))}
        </div>
      </div>

      {/* History list */}
      <div className="px-4 pt-3">
        {loading ? (
          <div className="text-[13px] text-center py-8" style={{ color: MUTED }}>Loading…</div>
        ) : groups.length === 0 ? (
          <div className="text-[14px] text-center py-10" style={{ color: MUTED }}>No payments match these filters</div>
        ) : (
          groups.map((g) => (
            <div key={g.label + g.rows[0].id} className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <div className="text-[12px] font-medium uppercase" style={{ color: MUTED, letterSpacing: "0.05em" }}>{g.label}</div>
                <div className="text-[12px]" style={{ color: MUTED }}>{formatGBP(g.total)}</div>
              </div>

              <div className="flex flex-col gap-2">
                {g.rows.map((row) => {
                  const isRefund = row.payment_status === "refund";
                  const amt = Number(row.lesson_cost ?? 0);
                  const isOpen = expandedId === row.id;
                  return (
                    <div key={row.id} className="bg-white" style={{ border: `0.5px solid ${BORDER}`, borderRadius: 12, padding: "14px 16px" }}>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center rounded-full shrink-0" style={{ width: 36, height: 36, backgroundColor: isRefund ? "#FEE2E2" : "#EEF2F7" }}>
                          <MethodIcon method={row.payment_method} refund={isRefund} />
                        </div>
                        <button
                          type="button"
                          className="min-w-0 flex-1 text-left"
                          onClick={() => setExpandedId(isOpen ? null : row.id)}
                        >
                          <div className="text-[14px] font-semibold truncate" style={{ color: NAVY, ...POPPINS }}>{row.pupils?.name ?? "Unknown pupil"}</div>
                          <div className="text-[12px]" style={{ color: MUTED, ...POPPINS }}>
                            {methodLabel(isRefund ? "refund" : row.payment_method)} · {formatTime(row.created_at)}
                          </div>
                        </button>
                        <div className="flex items-center gap-1 shrink-0">
                          <div className="text-[14px] font-bold" style={{ color: isRefund ? RED : GREEN, ...POPPINS }}>
                            {formatGBP(amt)}
                          </div>
                          <div className="relative">
                            <button type="button" aria-label="More" onClick={() => setMenuId(menuId === row.id ? null : row.id)} className="w-8 h-8 flex items-center justify-center">
                              <MoreVertical size={16} color={MUTED} />
                            </button>
                            {menuId === row.id && (
                              <>
                                <div className="fixed inset-0 z-30" onClick={() => setMenuId(null)} />
                                <div className="absolute right-0 top-8 z-40 bg-white rounded-lg" style={{ border: `0.5px solid ${BORDER}`, boxShadow: "0 6px 20px rgba(0,0,0,0.08)", minWidth: 140 }}>
                                  {!isRefund && (
                                    <MenuItem onClick={() => { setEditingId(row.id); setExpandedId(row.id); setMenuId(null); }}>Edit</MenuItem>
                                  )}
                                  {!isRefund && (
                                    <MenuItem onClick={() => { setRefundRow(row); setMenuId(null); }}>Refund</MenuItem>
                                  )}
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
                      </div>

                      {isOpen && (
                        <div className="mt-3 pt-3" style={{ borderTop: `0.5px solid ${BORDER}` }}>
                          {editingId === row.id ? (
                            <EditPaymentForm
                              row={row}
                              onCancel={() => setEditingId(null)}
                              onSaved={async () => { setEditingId(null); await refetch(); }}
                            />
                          ) : (
                            <div className="flex flex-col gap-1 text-[13px]" style={{ color: NAVY }}>
                              {row.lesson_id && <div><span style={{ color: MUTED }}>Lesson ID:</span> {row.lesson_id.slice(0,8)}…</div>}
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
        <PupilPicker
          pupils={allPupils}
          selectedId={pupilFilter}
          onClose={() => setPupilPickerOpen(false)}
          onSelect={(id) => { setPupilFilter(id); setPupilPickerOpen(false); }}
        />
      )}

      {recordOpen && (
        <RecordSheet
          pupils={allPupils}
          userId={userId}
          onClose={() => setRecordOpen(false)}
          onSaved={async () => { setRecordOpen(false); await refetch(); }}
        />
      )}

      {refundRow && (
        <RefundSheet
          row={refundRow}
          userId={userId}
          onClose={() => setRefundRow(null)}
          onSaved={async () => { setRefundRow(null); await refetch(); }}
        />
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
    <button
      type="button"
      onClick={onClick}
      className="px-3 h-8 rounded-full text-[12px] font-medium whitespace-nowrap shrink-0"
      style={{
        backgroundColor: active ? NAVY : "#F3F4F6",
        color: active ? "#fff" : NAVY,
        border: `0.5px solid ${active ? NAVY : BORDER}`,
      }}
    >{children}</button>
  );
}
function MenuItem({ children, onClick, danger }: { children: React.ReactNode; onClick: () => void; danger?: boolean }) {
  return (
    <button type="button" onClick={onClick} className="w-full text-left px-3 py-2 text-[13px]" style={{ color: danger ? RED : NAVY, ...POPPINS }}>
      {children}
    </button>
  );
}

// ---------- pupil picker sheet ----------
function PupilPicker({ pupils, selectedId, onClose, onSelect }: { pupils: PupilLite[]; selectedId: string; onClose: () => void; onSelect: (id: string) => void }) {
  const [q, setQ] = useState("");
  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return pupils;
    return pupils.filter((p) => p.name.toLowerCase().includes(s));
  }, [pupils, q]);
  return (
    <div className="fixed inset-0 z-[60] flex items-end" style={{ backgroundColor: "rgba(11,31,58,0.4)" }} onClick={onClose}>
      <div className="w-full bg-white p-4" style={{ borderTopLeftRadius: 16, borderTopRightRadius: 16, maxHeight: "70vh" }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <div className="text-[16px] font-semibold" style={{ color: NAVY, ...POPPINS }}>Select pupil</div>
          <button type="button" aria-label="Close" onClick={onClose}><X size={20} color={MUTED} /></button>
        </div>
        <div className="relative mb-3">
          <Search size={14} color={MUTED} style={{ position: "absolute", left: 10, top: 12 }} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search pupils…" className="w-full h-10 rounded-lg text-[14px] pl-8 pr-3" style={{ border: `0.5px solid ${BORDER}`, ...POPPINS }} />
        </div>
        <div className="overflow-y-auto" style={{ maxHeight: "50vh" }}>
          <button type="button" onClick={() => onSelect("")} className="w-full text-left px-3 py-3 text-[14px]" style={{ color: selectedId === "" ? "#1877D6" : NAVY, borderBottom: `0.5px solid ${BORDER}` }}>All pupils</button>
          {list.map((p) => (
            <button key={p.id} type="button" onClick={() => onSelect(p.id)} className="w-full text-left px-3 py-3 text-[14px]" style={{ color: selectedId === p.id ? "#1877D6" : NAVY, borderBottom: `0.5px solid ${BORDER}` }}>{p.name}</button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------- edit inline form ----------
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
      <div>
        <label className="block mb-1 text-[12px] font-medium" style={{ color: MUTED, ...POPPINS }}>Method</label>
        <select value={method} onChange={(e) => setMethod(e.target.value)} className="h-11 w-full rounded-lg px-3 text-[14px] bg-white" style={{ border: `0.5px solid ${BORDER}`, color: NAVY, ...POPPINS }}>
          {METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
        </select>
      </div>
      <div>
        <label className="block mb-1 text-[12px] font-medium" style={{ color: MUTED, ...POPPINS }}>Date</label>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-11 w-full rounded-lg px-3 text-[14px] bg-white" style={{ border: `0.5px solid ${BORDER}`, color: NAVY, ...POPPINS }} />
      </div>
      <div>
        <label className="block mb-1 text-[12px] font-medium" style={{ color: MUTED, ...POPPINS }}>Notes</label>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="w-full rounded-lg px-3 py-2 text-[14px] bg-white" style={{ border: `0.5px solid ${BORDER}`, color: NAVY, ...POPPINS }} />
      </div>
      <div className="flex gap-2 mt-1">
        <Button variant="ghost" onClick={onCancel} type="button">Cancel</Button>
        <Button onClick={handleSave} disabled={saving} type="button">{saving ? "Saving…" : "Save changes"}</Button>
      </div>
    </div>
  );
}

// ---------- refund sheet ----------
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
        payment_status: "unpaid",
        amount_due: refundAmount,
        paid_at: null,
        paid_amount: null,
        payment_method: null,
      }).eq("id", row.lesson_id);
    } else {
      // credit refund: reduce account_balance
      const { data: pRow } = await supabase.from("pupils").select("account_balance").eq("id", row.pupil_id).maybeSingle();
      const current = Number((pRow as { account_balance?: number | null } | null)?.account_balance ?? 0);
      await supabase.from("pupils").update({ account_balance: Math.max(0, current - refundAmount) }).eq("id", row.pupil_id);
    }

    toast.success(`Refund of £${refundAmount.toFixed(2)} recorded`);
    setSaving(false);
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end" style={{ backgroundColor: "rgba(11,31,58,0.4)" }} onClick={onClose}>
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
          <div>
            <label className="block mb-1 text-[12px] font-medium" style={{ color: MUTED, ...POPPINS }}>Refund reason</label>
            <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} className="w-full rounded-lg px-3 py-2 text-[14px] bg-white" style={{ border: `0.5px solid ${BORDER}`, color: NAVY, ...POPPINS }} placeholder="Why is this being refunded?" />
          </div>
          <div className="flex gap-2 mt-1">
            <Button variant="ghost" onClick={onClose} type="button">Cancel</Button>
            <Button onClick={handleRefund} disabled={saving} type="button">{saving ? "Processing…" : "Process refund"}</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------- record payment sheet ----------
function RecordSheet({ pupils, userId, onClose, onSaved }: { pupils: PupilLite[]; userId: string | null; onClose: () => void; onSaved: () => void }) {
  const [pupilId, setPupilId] = useState("");
  const [pupilQ, setPupilQ] = useState("");
  const [pupilOpen, setPupilOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<string>("cash");
  const [date, setDate] = useState(toDateInput(new Date().toISOString()));
  const [notes, setNotes] = useState("");
  const [applyOldest, setApplyOldest] = useState(true);
  const [saveAsCredit, setSaveAsCredit] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const pupilName = pupilId ? (pupils.find((p) => p.id === pupilId)?.name ?? "") : "";
  const filtered = useMemo(() => {
    const s = pupilQ.trim().toLowerCase();
    return s ? pupils.filter((p) => p.name.toLowerCase().includes(s)) : pupils;
  }, [pupils, pupilQ]);

  async function handleSave() {
    setError("");
    if (!userId) { setError("Not signed in"); return; }
    if (!pupilId) { setError("Select a pupil"); return; }
    const amt = Number(amount);
    if (!amt || amt <= 0) { setError("Enter a valid amount"); return; }
    setSaving(true);

    await recordPayment({
      instructorId: userId,
      pupilId,
      amount: amt,
      method,
      notes: notes || null,
      applyToOldestFirst: applyOldest,
      saveAsCredit,
    });

    // Adjust created_at if user picked a non-today date
    const today = toDateInput(new Date().toISOString());
    if (date !== today) {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (token) {
        const SUPABASE_URL = (supabase as any).supabaseUrl as string;
        const SUPABASE_ANON_KEY = (supabase as any).supabaseKey as string;
        // update most recent row we just inserted
        await fetch(`${SUPABASE_URL}/rest/v1/lesson_history?instructor_id=eq.${userId}&pupil_id=eq.${pupilId}&order=created_at.desc&limit=1`, {
          method: "PATCH",
          headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ created_at: new Date(date + "T12:00:00").toISOString() }),
        });
      }
    }

    toast.success("Payment recorded");
    setSaving(false);
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end" style={{ backgroundColor: "rgba(11,31,58,0.4)" }} onClick={onClose}>
      <div className="w-full bg-white p-4" style={{ borderTopLeftRadius: 16, borderTopRightRadius: 16, maxHeight: "90vh", overflowY: "auto" }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <div className="text-[16px] font-semibold" style={{ color: NAVY, ...POPPINS }}>Record payment</div>
          <button type="button" aria-label="Close" onClick={onClose}><X size={20} color={MUTED} /></button>
        </div>

        <div className="flex flex-col gap-3">
          <div>
            <label className="block mb-1 text-[12px] font-medium" style={{ color: MUTED, ...POPPINS }}>Pupil</label>
            <button type="button" onClick={() => setPupilOpen((v) => !v)} className="w-full h-11 rounded-lg px-3 text-left text-[14px] bg-white flex items-center justify-between" style={{ border: `0.5px solid ${BORDER}`, color: pupilId ? NAVY : MUTED, ...POPPINS }}>
              {pupilId ? pupilName : "Select a pupil…"}
              <Search size={14} color={MUTED} />
            </button>
            {pupilOpen && (
              <div className="mt-2 rounded-lg" style={{ border: `0.5px solid ${BORDER}`, maxHeight: 220, overflowY: "auto" }}>
                <div className="p-2">
                  <input autoFocus value={pupilQ} onChange={(e) => setPupilQ(e.target.value)} placeholder="Search pupils…" className="w-full h-9 rounded-md px-2 text-[13px]" style={{ border: `0.5px solid ${BORDER}` }} />
                </div>
                {filtered.map((p) => (
                  <button key={p.id} type="button" onClick={() => { setPupilId(p.id); setPupilOpen(false); setPupilQ(""); }} className="w-full text-left px-3 py-2 text-[14px]" style={{ color: NAVY, borderTop: `0.5px solid ${BORDER}` }}>{p.name}</button>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="block mb-1 text-[12px] font-medium" style={{ color: MUTED, ...POPPINS }}>Payment method</label>
            <select value={method} onChange={(e) => setMethod(e.target.value)} className="h-11 w-full rounded-lg px-3 text-[14px] bg-white" style={{ border: `0.5px solid ${BORDER}`, color: NAVY, ...POPPINS }}>
              {METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>

          <Input label="Amount (£)" type="number" inputMode="decimal" step="0.01" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" />

          <div>
            <label className="block mb-1 text-[12px] font-medium" style={{ color: MUTED, ...POPPINS }}>Date</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-11 w-full rounded-lg px-3 text-[14px] bg-white" style={{ border: `0.5px solid ${BORDER}`, color: NAVY, ...POPPINS }} />
          </div>

          <div>
            <label className="block mb-1 text-[12px] font-medium" style={{ color: MUTED, ...POPPINS }}>Notes (optional)</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="w-full rounded-lg px-3 py-2 text-[14px] bg-white" style={{ border: `0.5px solid ${BORDER}`, color: NAVY, ...POPPINS }} />
          </div>

          <ToggleRow label="Apply to oldest unpaid lesson first" checked={applyOldest} onChange={setApplyOldest} disabled={saveAsCredit} />
          <ToggleRow label="Save as account credit" checked={saveAsCredit} onChange={(v) => { setSaveAsCredit(v); if (v) setApplyOldest(false); }} />

          {error && <div className="text-[12px]" style={{ color: RED, ...POPPINS }}>{error}</div>}

          <div className="flex gap-2 mt-1">
            <Button variant="ghost" onClick={onClose} type="button">Cancel</Button>
            <Button onClick={handleSave} disabled={saving} type="button">{saving ? "Saving…" : "Save payment"}</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ToggleRow({ label, checked, onChange, disabled }: { label: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button type="button" onClick={() => !disabled && onChange(!checked)} disabled={disabled} className="flex items-center justify-between px-3 py-2 rounded-lg" style={{ border: `0.5px solid ${BORDER}`, opacity: disabled ? 0.5 : 1 }}>
      <span className="text-[13px]" style={{ color: NAVY, ...POPPINS }}>{label}</span>
      <span className="relative inline-block" style={{ width: 36, height: 20, borderRadius: 10, backgroundColor: checked ? "#1877D6" : "#D1D5DB", transition: "background-color 0.15s" }}>
        <span style={{ position: "absolute", top: 2, left: checked ? 18 : 2, width: 16, height: 16, borderRadius: "50%", backgroundColor: "#fff", transition: "left 0.15s" }} />
      </span>
    </button>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { PoundSterling, X } from "lucide-react";
import { Card } from "../components/dsm/Card";
import { SectionHeader } from "../components/dsm/SectionHeader";
import { Button } from "../components/dsm/Button";
import { Input } from "../components/dsm/Input";
import { supabase } from "../lib/supabaseClient";

export const Route = createFileRoute("/payments")({
  head: () => ({
    meta: [
      { title: "Payments — DSM by EveryDriver" },
      { name: "description", content: "Track outstanding balances and recent payments." },
    ],
  }),
  component: PaymentsPage,
});

const POPPINS = { fontFamily: "Inter, sans-serif" } as const;

interface OutstandingPupil {
  id: string;
  name: string;
  balance_owed: number; // net owed (unpaid lesson total − account credit)
}
interface PaymentRow {
  id: string;
  pupil_id: string;
  amount: number;
  paid_at: string;
  pupils: { name: string } | null;
}
interface HistoryRow {
  id: string;
  pupil_id: string;
  lesson_cost: number | null;
  created_at: string;
  payment_method: string | null;
  pupils: { name: string } | null;
}
interface PupilLite {
  id: string;
  name: string;
  balance_owed: number | null; // legacy — kept for RecordSheet display
  account_balance?: number | null;
}

function formatGBP(amount: number) {
  return `£${amount.toFixed(2)}`;
}
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  const a = parts[0]?.[0] ?? "";
  const b = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (a + b).toUpperCase() || "?";
}
function startOfWeek(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  const day = (x.getDay() + 6) % 7;
  x.setDate(x.getDate() - day);
  return x;
}
function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

// Unified payment recorder: writes to lessons (oldest first), any leftover
// to pupils.account_balance as credit, and a single lesson_history audit row.
export async function recordPayment(args: {
  instructorId: string;
  pupilId: string;
  amount: number;
  method: string;
  notes?: string | null;
}) {
  const { instructorId, pupilId, amount, method, notes } = args;
  const now = new Date().toISOString();

  const { data: unpaidLessons, error } = await supabase
    .from("lessons")
    .select("id, amount_due")
    .eq("pupil_id", pupilId)
    .eq("payment_status", "unpaid")
    .is("deleted_at", null)
    .order("lesson_date", { ascending: true });
  if (error) console.error("[payments] fetch unpaid lessons error", error);

  let remaining = Number(amount);
  for (const lesson of unpaidLessons ?? []) {
    if (remaining === 0) break;
    const lessonCost = Number(lesson.amount_due ?? 0);
    if (lessonCost <= 0) continue;
    if (remaining >= lessonCost) {
      const { error: uErr } = await supabase
        .from("lessons")
        .update({
          payment_status: "paid",
          payment_method: method,
          paid_at: now,
          paid_amount: lessonCost,
          amount_due: 0,
        })
        .eq("id", lesson.id);
      if (uErr) console.error("[payments] full lesson update error", uErr);
      remaining -= lessonCost;
    } else if (remaining > 0) {
      const { error: uErr } = await supabase
        .from("lessons")
        .update({
          payment_status: "partial",
          payment_method: method,
          paid_at: now,
          paid_amount: remaining,
          amount_due: lessonCost - remaining,
        })
        .eq("id", lesson.id);
      if (uErr) console.error("[payments] partial lesson update error", uErr);
      remaining = 0;
    }
  }

  // Overpayment / no lessons → add remainder to pupil credit.
  if (remaining > 0) {
    const { data: pRow } = await supabase
      .from("pupils")
      .select("account_balance")
      .eq("id", pupilId)
      .maybeSingle();
    const current = Number((pRow as { account_balance?: number | null } | null)?.account_balance ?? 0);
    const { error: bErr } = await supabase
      .from("pupils")
      .update({ account_balance: current + remaining })
      .eq("id", pupilId);
    if (bErr) console.error("[payments] account_balance update error", bErr);
  }

  // Audit row (one per payment, not per lesson) via REST.
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) {
    console.error("[payments] no auth token for lesson_history insert");
    return;
  }
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
  console.log("[payments] lesson_history POST payload", payload);
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
  const responseText = await response.text();
  console.log("[payments] lesson_history POST response", { status: response.status, ok: response.ok, text: responseText });
  if (!response.ok) {
    console.error("[payments] lesson_history insert error", response.status, responseText);
  }


}

export async function deletePaymentRecord(
  historyId: string,
  token: string,
  _userId: string,
): Promise<boolean> {
  const SUPABASE_URL = (supabase as any).supabaseUrl as string;
  const SUPABASE_ANON_KEY = (supabase as any).supabaseKey as string;

  // 1. Fetch the payment record
  const histRes = await fetch(
    `${SUPABASE_URL}/rest/v1/lesson_history?id=eq.${historyId}&select=*`,
    { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${token}` } },
  );
  const histData = await histRes.json();
  const record = histData?.[0];
  if (!record) {
    toast.error("Payment record not found");
    return false;
  }

  // 2. Soft delete the lesson_history record
  await fetch(`${SUPABASE_URL}/rest/v1/lesson_history?id=eq.${historyId}`, {
    method: "PATCH",
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ deleted_at: new Date().toISOString() }),
  });

  // 3. Restore associated lesson if lesson_id present
  if (record.lesson_id) {
    await fetch(`${SUPABASE_URL}/rest/v1/lessons?id=eq.${record.lesson_id}`, {
      method: "PATCH",
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        payment_status: "unpaid",
        amount_due: record.lesson_cost,
        paid_at: null,
        paid_amount: null,
        payment_method: null,
      }),
    });
  }

  // 4. If payment went to account_balance, reverse it
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
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ account_balance: newBalance }),
    });
  }

  toast.success("Payment deleted");
  return true;
}

function PaymentsPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [outstanding, setOutstanding] = useState<OutstandingPupil[] | null>(null);
  const [payments, setPayments] = useState<HistoryRow[] | null>(null);
  const [allPupils, setAllPupils] = useState<PupilLite[]>([]);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      setUserId(data.user?.id ?? null);
    })();
  }, []);

  useEffect(() => {
    if (!userId) return;

    (async () => {
      const { data: pupilRows, error: pErr } = await supabase
        .from("pupils")
        .select("id, name, balance_owed, account_balance")
        .eq("instructor_id", userId)
        .is("deleted_at", null)
        .order("name", { ascending: true });
      if (pErr) console.error("[payments] pupils error", pErr);
      const pupils = (pupilRows ?? []) as PupilLite[];
      setAllPupils(pupils);

      // Single source of truth: sum unpaid lessons.amount_due per pupil.
      const { data: unpaid, error: uErr } = await supabase
        .from("lessons")
        .select("pupil_id, amount_due")
        .eq("instructor_id", userId)
        .eq("payment_status", "unpaid")
        .is("deleted_at", null);
      if (uErr) console.error("[payments] unpaid lessons error", uErr);
      const owedByPupil: Record<string, number> = {};
      for (const l of (unpaid ?? []) as { pupil_id: string; amount_due: number | null }[]) {
        owedByPupil[l.pupil_id] = (owedByPupil[l.pupil_id] || 0) + Number(l.amount_due || 0);
      }
      const list: OutstandingPupil[] = [];
      for (const p of pupils) {
        const owed = owedByPupil[p.id] || 0;
        const credit = Number(p.account_balance ?? 0);
        const net = owed - credit;
        if (net > 0) list.push({ id: p.id, name: p.name, balance_owed: net });
      }
      setOutstanding(list);
    })();

    supabase
      .from("lesson_history")
      .select("id, pupil_id, lesson_cost, created_at, payment_method, pupils(name)")
      .eq("instructor_id", userId)
      .eq("payment_status", "paid")
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (error) console.error("[payments] lesson_history error", error);
        setPayments((data as unknown as HistoryRow[]) ?? []);
        setLoading(false);
      });
  }, [userId]);

  const { weekTotal, monthTotal, allTotal } = useMemo(() => {
    const now = new Date();
    const ws = startOfWeek(now).getTime();
    const ms = startOfMonth(now).getTime();
    let w = 0;
    let m = 0;
    let a = 0;
    (payments ?? []).forEach((p) => {
      const amt = Number(p.lesson_cost ?? 0);
      const t = new Date(p.created_at).getTime();
      a += amt;
      if (t >= ws) w += amt;
      if (t >= ms) m += amt;
    });
    return { weekTotal: w, monthTotal: m, allTotal: a };
  }, [payments]);

  async function markPaid(pupil: OutstandingPupil) {
    if (!userId) return;
    const amount = pupil.balance_owed;
    await recordPayment({
      instructorId: userId,
      pupilId: pupil.id,
      amount,
      method: "other",
      notes: "Marked paid",
    });

    const paymentRow: HistoryRow = {
      id: crypto.randomUUID(),
      pupil_id: pupil.id,
      lesson_cost: amount,
      created_at: new Date().toISOString(),
      payment_method: "other",
      pupils: { name: pupil.name },
    };
    setPayments((prev) => [paymentRow, ...(prev ?? [])]);

    const { error: notifErr } = await supabase.from("instructor_notifications").insert({
      instructor_id: userId,
      title: "Payment received",
      body: `£${Number(amount).toFixed(2)} received from ${pupil.name}`,
      type: "payment",
      read: false,
    });
    if (notifErr) console.error("[payments] notification error", notifErr);

    setOutstanding((prev) => (prev ?? []).filter((p) => p.id !== pupil.id));
    setAllPupils((prev) =>
      prev.map((p) => (p.id === pupil.id ? { ...p, balance_owed: 0 } : p)),
    );

  }

  async function deletePayment(row: HistoryRow) {
    if (!userId) return;
    if (!window.confirm("Delete this payment record?")) return;

    const amount = Number(row.lesson_cost ?? 0);
    const nowIso = new Date().toISOString();

    // 1) Soft-delete the audit row via REST.
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) {
      console.error("[payments] no token for delete");
      return;
    }
    const SUPABASE_URL = (supabase as any).supabaseUrl as string;
    const SUPABASE_ANON_KEY = (supabase as any).supabaseKey as string;
    const patchRes = await fetch(
      `${SUPABASE_URL}/rest/v1/lesson_history?id=eq.${row.id}`,
      {
        method: "PATCH",
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Prefer: "return=minimal",
        },
        body: JSON.stringify({ deleted_at: nowIso }),
      },
    );
    if (!patchRes.ok) {
      console.error("[payments] soft delete failed", patchRes.status, await patchRes.text());
      return;
    }

    // 2) Reverse the effect on lessons (most-recently paid first).
    let toReverse = amount;
    const { data: paidLessons, error: lErr } = await supabase
      .from("lessons")
      .select("id, paid_amount, amount_due, payment_status")
      .eq("pupil_id", row.pupil_id)
      .in("payment_status", ["paid", "partial"])
      .is("deleted_at", null)
      .order("paid_at", { ascending: false });
    if (lErr) console.error("[payments] fetch paid lessons error", lErr);

    for (const lesson of (paidLessons ?? []) as {
      id: string;
      paid_amount: number | null;
      amount_due: number | null;
      payment_status: string;
    }[]) {
      if (toReverse <= 0) break;
      const paid = Number(lesson.paid_amount ?? 0);
      if (paid <= 0) continue;
      const restore = Math.min(paid, toReverse);
      const remainingPaid = paid - restore;
      const newAmountDue = Number(lesson.amount_due ?? 0) + restore;
      const { error: uErr } = await supabase
        .from("lessons")
        .update({
          payment_status: remainingPaid > 0 ? "partial" : "unpaid",
          paid_amount: remainingPaid,
          amount_due: newAmountDue,
          ...(remainingPaid === 0 ? { paid_at: null, payment_method: null } : {}),
        })
        .eq("id", lesson.id);
      if (uErr) console.error("[payments] reverse lesson update error", uErr);
      toReverse -= restore;
    }

    // 3) Any remainder came from account_balance credit — subtract it.
    if (toReverse > 0) {
      const { data: pRow } = await supabase
        .from("pupils")
        .select("account_balance")
        .eq("id", row.pupil_id)
        .maybeSingle();
      const current = Number((pRow as { account_balance?: number | null } | null)?.account_balance ?? 0);
      const next = Math.max(0, current - toReverse);
      const { error: bErr } = await supabase
        .from("pupils")
        .update({ account_balance: next })
        .eq("id", row.pupil_id);
      if (bErr) console.error("[payments] reverse account_balance error", bErr);
    }

    // 4) Refetch history + outstanding.
    const { data: historyData } = await supabase
      .from("lesson_history")
      .select("id, pupil_id, lesson_cost, created_at, payment_method, pupils(name)")
      .eq("instructor_id", userId)
      .eq("payment_status", "paid")
      .is("deleted_at", null)
      .order("created_at", { ascending: false });
    setPayments((historyData as unknown as HistoryRow[]) ?? []);

    const { data: unpaid } = await supabase
      .from("lessons")
      .select("pupil_id, amount_due")
      .eq("instructor_id", userId)
      .eq("payment_status", "unpaid")
      .is("deleted_at", null);
    const owedByPupil: Record<string, number> = {};
    for (const l of (unpaid ?? []) as { pupil_id: string; amount_due: number | null }[]) {
      owedByPupil[l.pupil_id] = (owedByPupil[l.pupil_id] || 0) + Number(l.amount_due || 0);
    }
    const { data: pupilRows } = await supabase
      .from("pupils")
      .select("id, name, account_balance")
      .eq("instructor_id", userId)
      .is("deleted_at", null);
    const list: OutstandingPupil[] = [];
    for (const p of (pupilRows ?? []) as { id: string; name: string; account_balance: number | null }[]) {
      const owed = owedByPupil[p.id] || 0;
      const credit = Number(p.account_balance ?? 0);
      const net = owed - credit;
      if (net > 0) list.push({ id: p.id, name: p.name, balance_owed: net });
    }
    setOutstanding(list.sort((a, b) => a.name.localeCompare(b.name)));
  }

  return (
    <div className="min-h-screen bg-white pb-24 pb-safe relative" style={POPPINS}>
      {/* Top bar */}
      <div
        className="sticky top-0 z-40 flex items-center justify-between px-4"
        style={{ height: 52, backgroundColor: "#0B1F3A" }}
      >
        <div className="flex items-center gap-2">
          <span className="text-[15px] font-bold text-white" style={POPPINS}>
            DSM
          </span>
          <span className="text-[15px] text-white" style={POPPINS}>
            Payments
          </span>
        </div>
      </div>

      {/* Earnings stats card */}
      {loading ? (
        <div className="mx-4 mt-3 p-4" style={{ backgroundColor: "#0B1F3A", borderRadius: 12 }}>
          <div className="grid grid-cols-2 gap-4">
            <div
              className="skeleton-pulse"
              style={{ height: 50, backgroundColor: "#EEF2F7", borderRadius: 8 }}
            />
            <div
              className="skeleton-pulse"
              style={{ height: 50, backgroundColor: "#EEF2F7", borderRadius: 8 }}
            />
          </div>
          <div
            className="skeleton-pulse mt-3"
            style={{ height: 20, backgroundColor: "#EEF2F7", borderRadius: 4 }}
          />
        </div>
      ) : (
        <div className="mx-4 mt-3 p-4" style={{ backgroundColor: "#0B1F3A", borderRadius: 12 }}>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div
                className="text-[11px] font-medium uppercase"
                style={{ color: "#9CA3AF", letterSpacing: "0.05em" }}
              >
                This week
              </div>
              <div
                className="text-[24px] font-bold mt-1"
                style={{ color: "#1877D6", ...POPPINS }}
              >
                {formatGBP(weekTotal)}
              </div>
            </div>
            <div>
              <div
                className="text-[11px] font-medium uppercase"
                style={{ color: "#9CA3AF", letterSpacing: "0.05em" }}
              >
                This month
              </div>
              <div
                className="text-[24px] font-bold mt-1"
                style={{ color: "#1877D6", ...POPPINS }}
              >
                {formatGBP(monthTotal)}
              </div>
            </div>
          </div>
          <div
            className="mt-3 pt-3 text-[13px] text-white flex items-center justify-between"
            style={{
              borderTopWidth: "0.5px",
              borderTopStyle: "solid",
              borderTopColor: "#1F2F55",
              ...POPPINS,
            }}
          >
            <span style={{ color: "#9CA3AF" }}>TOTAL COLLECTED</span>
            <span className="font-semibold">{formatGBP(allTotal)}</span>
          </div>
        </div>
      )}

      <div className="px-4">
        <SectionHeader>OUTSTANDING</SectionHeader>

        {outstanding === null && loading ? (
          <div className="flex flex-col gap-2">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="bg-white flex items-center gap-3"
                style={{
                  padding: 12,
                  borderRadius: 10,
                  borderWidth: "0.5px",
                  borderStyle: "solid",
                  borderColor: "#EEF2F7",
                }}
              >
                <div
                  className="skeleton-pulse rounded-full shrink-0"
                  style={{ width: 40, height: 40, backgroundColor: "#EEF2F7" }}
                />
                <div className="min-w-0 flex-1 flex flex-col gap-2">
                  <div
                    className="skeleton-pulse"
                    style={{
                      height: 14,
                      width: "60%",
                      backgroundColor: "#EEF2F7",
                      borderRadius: 4,
                    }}
                  />
                </div>
                <div
                  className="skeleton-pulse shrink-0"
                  style={{
                    height: 14,
                    width: 50,
                    backgroundColor: "#EEF2F7",
                    borderRadius: 4,
                  }}
                />
              </div>
            ))}
          </div>
        ) : outstanding === null ? null : outstanding.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <p className="text-[14px] text-[#6B7280]" style={POPPINS}>
              No outstanding balances
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {outstanding.map((p) => (
              <Card key={p.id}>
                <div className="flex items-center gap-3">
                  <div
                    className="flex items-center justify-center rounded-full shrink-0 text-[13px] font-semibold"
                    style={{
                      width: 40,
                      height: 40,
                      backgroundColor: "#1877D6",
                      color: "#FFFFFF",
                      ...POPPINS,
                    }}
                  >
                    {initials(p.name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div
                      className="text-[14px] font-semibold text-[#0B1F3A] truncate"
                      style={POPPINS}
                    >
                      {p.name}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <div
                      className="text-[14px] font-bold"
                      style={{ color: "#1877D6", ...POPPINS }}
                    >
                      {formatGBP(Number(p.balance_owed))}
                    </div>
                    <button
                      type="button"
                      onClick={() => markPaid(p)}
                      className="text-[12px] font-medium"
                      style={{ color: "#1877D6", ...POPPINS }}
                    >
                      Mark paid
                    </button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        <SectionHeader>RECENT PAYMENTS</SectionHeader>

        {payments === null && loading ? (
          <div className="flex flex-col gap-2">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="bg-white flex items-center justify-between gap-3"
                style={{
                  padding: 12,
                  borderRadius: 10,
                  borderWidth: "0.5px",
                  borderStyle: "solid",
                  borderColor: "#EEF2F7",
                }}
              >
                <div className="min-w-0 flex flex-col gap-2 flex-1">
                  <div
                    className="skeleton-pulse"
                    style={{
                      height: 14,
                      width: "70%",
                      backgroundColor: "#EEF2F7",
                      borderRadius: 4,
                    }}
                  />
                  <div
                    className="skeleton-pulse"
                    style={{
                      height: 12,
                      width: 50,
                      backgroundColor: "#EEF2F7",
                      borderRadius: 4,
                    }}
                  />
                </div>
                <div
                  className="skeleton-pulse shrink-0"
                  style={{
                    height: 14,
                    width: 50,
                    backgroundColor: "#EEF2F7",
                    borderRadius: 4,
                  }}
                />
              </div>
            ))}
          </div>
        ) : payments === null ? null : payments.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <p className="text-[14px] text-[#6B7280]" style={POPPINS}>
              No payments recorded
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {payments.map((row) => (
              <Card key={row.id}>
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div
                      className="text-[14px] font-semibold text-[#0B1F3A] truncate"
                      style={POPPINS}
                    >
                      {row.pupils?.name ?? "Unknown pupil"}
                    </div>
                    <div className="text-[13px] text-[#6B7280]" style={POPPINS}>
                      {formatDate(row.created_at)}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <div
                      className="text-[14px] font-bold"
                      style={{ color: "#1877D6", ...POPPINS }}
                    >
                      {formatGBP(Number(row.lesson_cost ?? 0))}
                    </div>
                    <button
                      type="button"
                      aria-label="Delete payment"
                      onClick={() => deletePayment(row)}
                      className="flex items-center justify-center rounded-full"
                      style={{
                        width: 24,
                        height: 24,
                        backgroundColor: "#F3F4F6",
                        color: "#6B7280",
                        border: "none",
                      }}
                    >
                      <X size={14} color="#6B7280" />
                    </button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* FAB */}
      <button
        type="button"
        aria-label="Record payment"
        onClick={() => setSheetOpen(true)}
        className="fixed z-50 flex items-center justify-center rounded-full"
        style={{
          width: 52,
          height: 52,
          backgroundColor: "#1877D6",
          color: "#FFFFFF",
          right: 16,
          bottom: "calc(env(safe-area-inset-bottom, 0px) + 80px)",
          border: "none",
        }}
      >
        <PoundSterling size={24} color="#FFFFFF" />
      </button>

      {sheetOpen && (
        <RecordSheet
          pupils={allPupils}
          onClose={() => setSheetOpen(false)}
          onSaved={(payment, pupilId, newBalance) => {
            setPayments((prev) => [payment, ...(prev ?? [])]);
            setAllPupils((prev) =>
              prev.map((p) => (p.id === pupilId ? { ...p, balance_owed: newBalance } : p)),
            );
            setOutstanding((prev) => {
              const list = (prev ?? []).filter((p) => p.id !== pupilId);
              if (newBalance > 0) {
                const target = allPupils.find((p) => p.id === pupilId);
                if (target) list.push({ id: target.id, name: target.name, balance_owed: newBalance });
              }
              return list.sort((a, b) => a.name.localeCompare(b.name));
            });
          }}
          userId={userId}
        />
      )}
    </div>
  );
}

function RecordSheet({
  pupils,
  onClose,
  onSaved,
  userId,
}: {
  pupils: PupilLite[];
  onClose: () => void;
  onSaved: (payment: HistoryRow, pupilId: string, newBalance: number) => void;
  userId: string | null;
}) {
  const [pupilId, setPupilId] = useState("");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("cash");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSave() {
    setError("");
    if (!userId) {
      setError("Not signed in");
      return;
    }
    if (!pupilId) {
      setError("Select a pupil");
      return;
    }
    const amt = Number(amount);
    if (!amt || amt <= 0) {
      setError("Enter a valid amount");
      return;
    }
    setSaving(true);

    const pupil = pupils.find((p) => p.id === pupilId);

    await recordPayment({
      instructorId: userId,
      pupilId,
      amount: amt,
      method,
      notes: note || null,
    });

    const payment: HistoryRow = {
      id: crypto.randomUUID(),
      pupil_id: pupilId,
      lesson_cost: amt,
      created_at: new Date().toISOString(),
      payment_method: method,
      pupils: { name: pupil?.name ?? "Unknown pupil" },
    };

    const { error: notifErr } = await supabase.from("instructor_notifications").insert({
      instructor_id: userId,
      title: "Payment received",
      body: `£${amt.toFixed(2)} received from ${pupil?.name ?? "pupil"}`,
      type: "payment",
      read: false,
    });
    if (notifErr) console.error("[payments] record notification error", notifErr);

    onSaved(payment, pupilId, 0);
    setSaving(false);
    onClose();

  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end" style={{ backgroundColor: "rgba(11,31,58,0.4)" }}>
      <div
        className="w-full bg-white p-4"
        style={{ borderTopLeftRadius: 16, borderTopRightRadius: 16, ...POPPINS }}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="text-[16px] font-semibold text-[#0B1F3A]" style={POPPINS}>
            Record payment
          </div>
          <button type="button" aria-label="Close" onClick={onClose}>
            <X size={20} color="#6B7280" />
          </button>
        </div>

        <div className="flex flex-col gap-3">
          <div>
            <label
              className="block mb-1 text-[12px] font-medium text-[#6B7280]"
              style={POPPINS}
            >
              Pupil
            </label>
            <select
              value={pupilId}
              onChange={(e) => setPupilId(e.target.value)}
              className="h-11 w-full rounded-lg px-3 text-[14px] text-[#0B1F3A] bg-white focus:border-[#1877D6] focus:outline-none"
              style={{
                ...POPPINS,
                borderWidth: "0.5px",
                borderStyle: "solid",
                borderColor: "#EEF2F7",
              }}
            >
              <option value="">Select a pupil…</option>
              {pupils.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <Input
            label="Amount (£)"
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
          />

          <div>
            <label className="block mb-1 text-[12px] font-medium text-[#6B7280]" style={POPPINS}>
              Method
            </label>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              className="h-11 w-full rounded-lg px-3 text-[14px] text-[#0B1F3A] bg-white focus:border-[#1877D6] focus:outline-none"
              style={{ ...POPPINS, borderWidth: "0.5px", borderStyle: "solid", borderColor: "#EEF2F7" }}
            >
              <option value="cash">Cash</option>
              <option value="card">Card (Ryft)</option>
              <option value="bank_transfer">Bank transfer</option>
              <option value="klarna">Klarna</option>
              <option value="clearpay">Clearpay</option>
              <option value="prepaid">Prepaid hours</option>
              <option value="other">Other</option>
            </select>
          </div>

          <Input
            label="Note (optional)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. Cash, lesson 12"
          />

          {error && (
            <div className="text-[12px]" style={{ color: "#1877D6", ...POPPINS }}>
              {error}
            </div>
          )}

          <div className="flex gap-2 mt-2">
            <Button variant="ghost" onClick={onClose} type="button">
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving} type="button">
              {saving ? "Saving…" : "Save payment"}
            </Button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes skeleton-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        .skeleton-pulse {
          animation: skeleton-pulse 1.5s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}

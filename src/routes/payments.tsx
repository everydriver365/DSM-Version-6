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
  balance_owed: number;
}
interface PaymentRow {
  id: string;
  pupil_id: string;
  amount: number;
  paid_at: string;
  pupils: { name: string } | null;
}
interface PupilLite {
  id: string;
  name: string;
  balance_owed: number | null;
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

async function applyPaymentToLessons(pupilId: string, paymentAmount: number, instructorId?: string | null) {
  console.log("[payments] applyPaymentToLessons called:", { pupilId, paymentAmount });
  console.log("[payments] querying lessons for pupil_id:", pupilId, "instructor_id:", instructorId);
  console.log(
    "[payments] REST query equivalent:",
    `/rest/v1/lessons?select=id,amount_due&pupil_id=eq.${pupilId}&payment_status=eq.unpaid&deleted_at=is.null&order=lesson_date.asc`,
  );

  // Diagnostic: fetch ALL non-deleted lessons for this pupil to inspect their payment_status values
  const { data: allLessons, error: allErr } = await supabase
    .from("lessons")
    .select("id, amount_due, payment_status, lesson_date, pupil_id")
    .eq("pupil_id", pupilId)
    .is("deleted_at", null)
    .order("lesson_date", { ascending: true });
  if (allErr) console.error("[payments] diagnostic all-lessons error", allErr);
  console.log(
    "[payments] ALL non-deleted lessons for this pupil:",
    allLessons?.length,
    allLessons?.map((l) => ({ id: l.id, payment_status: l.payment_status, amount_due: l.amount_due, lesson_date: l.lesson_date })),
  );

  const { data: unpaidLessons, error } = await supabase
    .from("lessons")
    .select("id, amount_due")
    .eq("pupil_id", pupilId)
    .eq("payment_status", "unpaid")
    .is("deleted_at", null)
    .order("lesson_date", { ascending: true });
  if (error) {
    console.error("[payments] fetch unpaid lessons error", error);
    return;
  }
  console.log("[payments] unpaid lessons found:", unpaidLessons?.length, unpaidLessons);
  let remaining = paymentAmount;
  for (const lesson of unpaidLessons ?? []) {
    if (remaining <= 0) break;
    const due = Number(lesson.amount_due ?? 0);
    if (due <= 0) continue;
    if (due <= remaining) {
      const updateResult = await supabase
        .from("lessons")
        .update({ payment_status: "paid", amount_due: 0 })
        .eq("id", lesson.id);
      console.log("[payments] lesson update result (full):", lesson.id, updateResult);
      if (updateResult.error) console.error("[payments] mark lesson paid error", updateResult.error);
      remaining -= due;
    } else {
      const updateResult = await supabase
        .from("lessons")
        .update({ amount_due: due - remaining })
        .eq("id", lesson.id);
      console.log("[payments] lesson update result (partial):", lesson.id, updateResult);
      if (updateResult.error) console.error("[payments] partial lesson payment error", updateResult.error);
      remaining = 0;
    }
  }
  console.log("[payments] applyPaymentToLessons finished, remaining:", remaining);
}

function PaymentsPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [outstanding, setOutstanding] = useState<OutstandingPupil[] | null>(null);
  const [payments, setPayments] = useState<PaymentRow[] | null>(null);
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

    supabase
      .from("pupils")
      .select("id, name, balance_owed")
      .eq("instructor_id", userId)
      .is("deleted_at", null)
      .order("name", { ascending: true })
      .then(({ data, error }) => {
        if (error) console.error("[payments] pupils error", error);
        const rows = (data ?? []) as PupilLite[];
        setAllPupils(rows);
        setOutstanding(
          rows
            .filter((p) => Number(p.balance_owed ?? 0) > 0)
            .map((p) => ({ id: p.id, name: p.name, balance_owed: Number(p.balance_owed) })),
        );
      });

    supabase
      .from("payments")
      .select("id, pupil_id, amount, paid_at, pupils(name)")
      .eq("instructor_id", userId)
      .is("deleted_at", null)
      .order("paid_at", { ascending: false })
      .then(({ data, error }) => {
        if (error) console.error("[payments] payments error", error);
        setPayments((data as unknown as PaymentRow[]) ?? []);
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
      const amt = Number(p.amount ?? 0);
      const t = new Date(p.paid_at).getTime();
      a += amt;
      if (t >= ws) w += amt;
      if (t >= ms) m += amt;
    });
    return { weekTotal: w, monthTotal: m, allTotal: a };
  }, [payments]);

  async function markPaid(pupil: OutstandingPupil) {
    if (!userId) return;
    const amount = pupil.balance_owed;
    console.log("[payments] recording payment:", { amount, pupilId: pupil.id, paymentMethod: "mark-paid" });

    const balanceResult = await supabase
      .from("pupils")
      .update({ balance_owed: 0 })
      .eq("id", pupil.id);
    console.log("[payments] pupils.balance_owed update result:", balanceResult);
    if (balanceResult.error) {
      console.error("[payments] mark paid update error", balanceResult.error);
      return;
    }

    await applyPaymentToLessons(pupil.id, amount, userId);

    const { data: inserted, error: insErr } = await supabase
      .from("payments")
      .insert({
        pupil_id: pupil.id,
        instructor_id: userId,
        amount,
        paid_at: new Date().toISOString(),
      })
      .select("id, pupil_id, amount, paid_at")
      .single();
    if (insErr) {
      console.error("[payments] mark paid insert error", insErr);
      return;
    }

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
    if (inserted) {
      setPayments((prev) => [
        { ...inserted, pupils: { name: pupil.name } } as PaymentRow,
        ...(prev ?? []),
      ]);
    }
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
                      {formatDate(row.paid_at)}
                    </div>
                  </div>
                  <div
                    className="text-[14px] font-bold shrink-0"
                    style={{ color: "#1877D6", ...POPPINS }}
                  >
                    {formatGBP(Number(row.amount))}
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
  onSaved: (payment: PaymentRow, pupilId: string, newBalance: number) => void;
  userId: string | null;
}) {
  const [pupilId, setPupilId] = useState("");
  const [amount, setAmount] = useState("");
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
    const currentBalance = Number(pupil?.balance_owed ?? 0);
    const newBalance = Math.max(0, currentBalance - amt);
    console.log("[payments] recording payment:", { amount: amt, pupilId, paymentMethod: "record-sheet" });

    const { data: inserted, error: insErr } = await supabase
      .from("payments")
      .insert({
        pupil_id: pupilId,
        instructor_id: userId,
        amount: amt,
        paid_at: new Date().toISOString(),
        note: note || null,
      })
      .select("id, pupil_id, amount, paid_at")
      .single();

    if (insErr) {
      console.error("[payments] record insert error", insErr);
      setError(insErr.message);
      setSaving(false);
      return;
    }

    const balanceResult = await supabase
      .from("pupils")
      .update({ balance_owed: newBalance })
      .eq("id", pupilId);
    console.log("[payments] pupils.balance_owed update result:", balanceResult);
    if (balanceResult.error) console.error("[payments] record update balance error", balanceResult.error);

    await applyPaymentToLessons(pupilId, amt, userId);

    const { error: notifErr } = await supabase.from("instructor_notifications").insert({
      instructor_id: userId,
      title: "Payment received",
      body: `£${amt.toFixed(2)} received from ${pupil?.name ?? "pupil"}`,
      type: "payment",
      read: false,
    });
    if (notifErr) console.error("[payments] record notification error", notifErr);

    const payment: PaymentRow = {
      ...inserted!,
      pupils: { name: pupil?.name ?? "Unknown pupil" },
    };
    onSaved(payment, pupilId, newBalance);
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

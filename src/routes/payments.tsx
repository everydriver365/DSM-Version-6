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

const POPPINS = { fontFamily: "Poppins, sans-serif" } as const;

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

function PaymentsPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [outstanding, setOutstanding] = useState<OutstandingPupil[] | null>(null);
  const [payments, setPayments] = useState<PaymentRow[] | null>(null);
  const [allPupils, setAllPupils] = useState<PupilLite[]>([]);
  const [sheetOpen, setSheetOpen] = useState(false);

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
      .order("paid_at", { ascending: false })
      .then(({ data, error }) => {
        if (error) console.error("[payments] payments error", error);
        setPayments((data as unknown as PaymentRow[]) ?? []);
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

    const { error: updErr } = await supabase
      .from("pupils")
      .update({ balance_owed: 0 })
      .eq("id", pupil.id);
    if (updErr) {
      console.error("[payments] mark paid update error", updErr);
      return;
    }

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
        style={{ height: 52, backgroundColor: "#0F2044" }}
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
      <div className="mx-4 mt-3 p-4" style={{ backgroundColor: "#0F2044", borderRadius: 12 }}>
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
              style={{ color: "#F59E0B", ...POPPINS }}
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
              style={{ color: "#F59E0B", ...POPPINS }}
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

      <div className="px-4">
        <SectionHeader>OUTSTANDING</SectionHeader>

        {outstanding === null ? null : outstanding.length === 0 ? (
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
                      backgroundColor: "#1A52A0",
                      color: "#FFFFFF",
                      ...POPPINS,
                    }}
                  >
                    {initials(p.name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div
                      className="text-[14px] font-semibold text-[#0F2044] truncate"
                      style={POPPINS}
                    >
                      {p.name}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <div
                      className="text-[14px] font-bold"
                      style={{ color: "#CC2229", ...POPPINS }}
                    >
                      {formatGBP(Number(p.balance_owed))}
                    </div>
                    <button
                      type="button"
                      onClick={() => markPaid(p)}
                      className="text-[12px] font-medium"
                      style={{ color: "#16A34A", ...POPPINS }}
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

        {payments === null ? null : payments.length === 0 ? (
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
                      className="text-[14px] font-semibold text-[#0F2044] truncate"
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
                    style={{ color: "#16A34A", ...POPPINS }}
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
          backgroundColor: "#1A52A0",
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

      <BottomNav active="payments" />
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

    const { error: updErr } = await supabase
      .from("pupils")
      .update({ balance_owed: newBalance })
      .eq("id", pupilId);
    if (updErr) console.error("[payments] record update balance error", updErr);

    const payment: PaymentRow = {
      ...inserted!,
      pupils: { name: pupil?.name ?? "Unknown pupil" },
    };
    onSaved(payment, pupilId, newBalance);
    setSaving(false);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end" style={{ backgroundColor: "rgba(15,32,68,0.4)" }}>
      <div
        className="w-full bg-white p-4"
        style={{ borderTopLeftRadius: 16, borderTopRightRadius: 16, ...POPPINS }}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="text-[16px] font-semibold text-[#0F2044]" style={POPPINS}>
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
              className="h-11 w-full rounded-lg px-3 text-[14px] text-[#1A1A2E] bg-white focus:border-[#1A52A0] focus:outline-none"
              style={{
                ...POPPINS,
                borderWidth: "0.5px",
                borderStyle: "solid",
                borderColor: "#E2E6ED",
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
            <div className="text-[12px]" style={{ color: "#CC2229", ...POPPINS }}>
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
    </div>
  );
}

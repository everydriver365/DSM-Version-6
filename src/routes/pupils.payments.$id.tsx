import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, PoundSterling, Plus, MessageSquare, Mail, X, Pencil } from "lucide-react";
import { toast } from "sonner";
import { Card } from "../components/dsm/Card";
import { SectionHeader } from "../components/dsm/SectionHeader";
import { supabase } from "../lib/supabaseClient";

export const Route = createFileRoute("/pupils/payments/$id")({
  head: () => ({
    meta: [{ title: "Payment history — DSM by EveryDriver" }],
  }),
  component: PupilPaymentsPage,
});

const POPPINS = { fontFamily: "Inter, sans-serif" } as const;

interface PaymentRow {
  id: string;
  lesson_cost: number | null;
  created_at: string;
  payment_method: string | null;
  notes: string | null;
}

function formatGBP(amount: number | null) {
  if (amount == null) return "£0.00";
  return `£${Number(amount).toFixed(2)}`;
}

function balanceLabel(net: number) {
  if (net > 0) return "Balance owed";
  if (net < 0) return "Account credit";
  return "All paid";
}

function balanceValue(accountBalance: number | null, balanceOwed: number | null) {
  const credit = Number(accountBalance ?? 0);
  const owed = Number(balanceOwed ?? 0);
  const net = owed - credit;
  return { net, credit, owed };
}

function formatDate(d: Date) {
  return d.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatMethod(method: string | null) {
  if (!method) return "Payment";
  return method.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

const AUDIT_MARKER = "--- Edit history ---";

function splitNotes(notes: string | null): { base: string; audit: string[] } {
  if (!notes) return { base: "", audit: [] };
  const idx = notes.indexOf(AUDIT_MARKER);
  if (idx === -1) return { base: notes, audit: [] };
  const base = notes.slice(0, idx).trim();
  const auditRaw = notes.slice(idx + AUDIT_MARKER.length).trim();
  const audit = auditRaw ? auditRaw.split("\n").map((l) => l.trim()).filter(Boolean) : [];
  return { base, audit };
}

function joinNotes(base: string, audit: string[]): string | null {
  const b = base.trim();
  if (audit.length === 0) return b || null;
  return `${b}\n\n${AUDIT_MARKER}\n${audit.join("\n")}`.trim();
}

function PupilPaymentsPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [pupilName, setPupilName] = useState<string>("");
  const [pupilPhone, setPupilPhone] = useState<string | null>(null);
  const [pupilEmail, setPupilEmail] = useState<string | null>(null);
  const [accountBalance, setAccountBalance] = useState<number | null>(null);
  const [balanceOwed, setBalanceOwed] = useState<number | null>(null);
  const [payments, setPayments] = useState<PaymentRow[] | null>(null);
  const [showRecord, setShowRecord] = useState(false);
  const [recAmount, setRecAmount] = useState<string>("");
  const [recMethod, setRecMethod] = useState<"cash" | "bank_transfer" | "card">("cash");
  const [recHours, setRecHours] = useState<string>("");
  const [recNotes, setRecNotes] = useState<string>("");
  const [recSaving, setRecSaving] = useState(false);
  const [reloadTick, setReloadTick] = useState(0);
  const [editing, setEditing] = useState<PaymentRow | null>(null);
  const [editAmount, setEditAmount] = useState<string>("");
  const [editMethod, setEditMethod] = useState<"cash" | "bank_transfer" | "card">("cash");
  const [editBaseNotes, setEditBaseNotes] = useState<string>("");
  const [editReason, setEditReason] = useState<string>("");
  const [editSaving, setEditSaving] = useState(false);

  useEffect(() => {
    supabase
      .from("pupils")
      .select("name, account_balance, phone, email")
      .eq("id", id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) console.error("[pupil-payments] pupil fetch error", error);
        const p = (data as { name?: string | null; account_balance?: number | null; phone?: string | null; email?: string | null } | null) ?? null;
        setPupilName(p?.name ?? "");
        setAccountBalance(p?.account_balance ?? null);
        setPupilPhone(p?.phone ?? null);
        setPupilEmail(p?.email ?? null);
      });

    // Live owed amount from unpaid lessons (matches pupil profile calculation)
    supabase
      .from("lessons")
      .select("duration_minutes, amount_due, payment_status, status")
      .eq("pupil_id", id)
      .is("deleted_at", null)
      .neq("status", "cancelled")
      .then(({ data, error }) => {
        if (error) {
          console.error("[pupil-payments] unpaid lessons error", error);
          return;
        }
        const rows = (data as { duration_minutes: number | null; amount_due: number | null; payment_status: string | null }[] | null) ?? [];
        const owed = rows
          .filter((r) => r.payment_status !== "paid")
          .reduce((sum, r) => sum + Number(r.amount_due || 0), 0);
        setBalanceOwed(Math.round(owed * 100) / 100);
      });

    supabase
      .from("lesson_history")
      .select("id, lesson_cost, created_at, payment_method, notes")
      .eq("pupil_id", id)
      .eq("payment_status", "paid")
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (error) console.error("[pupil-payments] history error", error);
        setPayments((data as PaymentRow[] | null) ?? []);
      });
  }, [id, reloadTick]);

  const { net } = balanceValue(accountBalance, balanceOwed);
  const balanceColor = net > 0 ? "#EF4444" : net < 0 ? "#22C55E" : "#FFFFFF";

  async function submitRecordPayment() {
    const amt = Number(recAmount);
    if (!amt || amt <= 0) {
      toast.error("Enter an amount");
      return;
    }
    const hoursBought = Number(recHours) || 0;
    setRecSaving(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      const instructorId = u?.user?.id ?? null;
      const now = new Date().toISOString();
      const today = now.slice(0, 10);
      let remaining = amt;

      // Apply to oldest unpaid lessons
      const { data: unpaid } = await supabase
        .from("lessons")
        .select("id, amount_due")
        .eq("pupil_id", id)
        .eq("payment_status", "unpaid")
        .is("deleted_at", null)
        .order("lesson_date", { ascending: true });
      for (const l of (unpaid ?? []) as { id: string; amount_due: number | null }[]) {
        if (remaining <= 0) break;
        const due = Number(l.amount_due ?? 0);
        if (due <= 0) continue;
        if (due <= remaining) {
          await supabase
            .from("lessons")
            .update({
              payment_status: "paid",
              payment_method: recMethod,
              paid_at: now,
              paid_amount: due,
              amount_due: 0,
            })
            .eq("id", l.id);
          remaining -= due;
        } else {
          await supabase
            .from("lessons")
            .update({
              payment_status: "partial",
              payment_method: recMethod,
              paid_at: now,
              paid_amount: remaining,
              amount_due: due - remaining,
            })
            .eq("id", l.id);
          remaining = 0;
        }
      }

      // Overpayment → account credit
      if (remaining > 0) {
        const cur = Number(accountBalance ?? 0);
        await supabase.from("pupils").update({ account_balance: cur + remaining }).eq("id", id);
      }

      // Audit row
      if (instructorId) {
        const { error: hErr } = await supabase.from("lesson_history").insert({
          instructor_id: instructorId,
          pupil_id: id,
          lesson_cost: amt,
          payment_status: "paid",
          payment_method: recMethod,
          notes: recNotes.trim() || (hoursBought > 0 ? `${hoursBought}h package` : null),
          created_at: now,
        });
        if (hErr) console.error("[pupil-payments] history insert", hErr);
      }

      // Legacy payments row
      const { error: payErr } = await supabase.from("payments").insert({
        instructor_id: instructorId,
        pupil_id: id,
        amount: amt,
        payment_method: recMethod,
        payment_date: today,
        status: "completed",
      });
      if (payErr) console.error("[pupil-payments] payments insert", payErr);

      // Increment pupil's bought lesson count / prepaid hours
      if (hoursBought > 0) {
        const { data: pRow } = await supabase
          .from("pupils")
          .select("lesson_count, prepaid_hours")
          .eq("id", id)
          .maybeSingle();
        const curLessons = Number((pRow as { lesson_count?: number | null } | null)?.lesson_count ?? 0);
        const curPrepaid = Number((pRow as { prepaid_hours?: number | null } | null)?.prepaid_hours ?? 0);
        const { error: puErr } = await supabase
          .from("pupils")
          .update({
            lesson_count: curLessons + hoursBought,
            prepaid_hours: curPrepaid + hoursBought,
          })
          .eq("id", id);
        if (puErr) console.error("[pupil-payments] pupil hours update", puErr);
      }

      toast.success("Payment recorded");
      setShowRecord(false);
      setRecAmount("");
      setRecHours("");
      setRecNotes("");
      setRecMethod("cash");
      setReloadTick((n) => n + 1);
    } catch (e) {
      console.error("[pupil-payments] record failed", e);
      toast.error("Couldn't record payment");
    } finally {
      setRecSaving(false);
    }
  }

  const reminderMessage =
    net > 0
      ? `Hi${pupilName ? " " + pupilName.split(" ")[0] : ""}, a friendly reminder that £${net.toFixed(2)} is outstanding on your driving lesson account. Thanks!`
      : "";
  const smsHref = pupilPhone
    ? `sms:${pupilPhone}?&body=${encodeURIComponent(reminderMessage)}`
    : `sms:?&body=${encodeURIComponent(reminderMessage)}`;
  const mailHref = pupilEmail
    ? `mailto:${pupilEmail}?subject=${encodeURIComponent("Payment reminder")}&body=${encodeURIComponent(reminderMessage)}`
    : `mailto:?subject=${encodeURIComponent("Payment reminder")}&body=${encodeURIComponent(reminderMessage)}`;

  const totalPaid = (payments ?? []).reduce((sum, p) => sum + Number(p.lesson_cost ?? 0), 0);

  function openEdit(p: PaymentRow) {
    const { base } = splitNotes(p.notes);
    setEditing(p);
    setEditAmount(String(Number(p.lesson_cost ?? 0).toFixed(2)));
    const m = (p.payment_method ?? "cash") as "cash" | "bank_transfer" | "card";
    setEditMethod(m === "cash" || m === "bank_transfer" || m === "card" ? m : "cash");
    setEditBaseNotes(base);
    setEditReason("");
  }

  async function submitEditPayment() {
    if (!editing) return;
    const amt = Number(editAmount);
    if (!amt || amt <= 0) {
      toast.error("Enter an amount");
      return;
    }
    setEditSaving(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      const editorEmail = u?.user?.email ?? u?.user?.id ?? "instructor";
      const stamp = new Date().toISOString().slice(0, 16).replace("T", " ");
      const { base: oldBase, audit } = splitNotes(editing.notes);
      const changes: string[] = [];
      const oldAmt = Number(editing.lesson_cost ?? 0);
      if (Math.abs(oldAmt - amt) > 0.005) changes.push(`amount £${oldAmt.toFixed(2)}→£${amt.toFixed(2)}`);
      const oldMethod = editing.payment_method ?? "cash";
      if (oldMethod !== editMethod) changes.push(`method ${formatMethod(oldMethod)}→${formatMethod(editMethod)}`);
      if (oldBase.trim() !== editBaseNotes.trim()) changes.push("notes updated");
      if (changes.length === 0) {
        toast.info("No changes");
        setEditSaving(false);
        return;
      }
      const reasonSuffix = editReason.trim() ? ` — ${editReason.trim()}` : "";
      const auditLine = `[${stamp} by ${editorEmail}] ${changes.join(", ")}${reasonSuffix}`;
      const newNotes = joinNotes(editBaseNotes, [...audit, auditLine]);
      const { error: upErr } = await supabase
        .from("lesson_history")
        .update({ lesson_cost: amt, payment_method: editMethod, notes: newNotes })
        .eq("id", editing.id);
      if (upErr) throw upErr;
      toast.success("Payment updated");
      setEditing(null);
      setReloadTick((n) => n + 1);
    } catch (e) {
      console.error("[pupil-payments] edit failed", e);
      toast.error("Couldn't update payment");
    } finally {
      setEditSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-white pb-8" style={POPPINS}>
      <div
        className="sticky top-0 z-40 flex items-center px-2"
        style={{ height: 52, backgroundColor: "#0B1F3A" }}
      >
        <button
          type="button"
          aria-label="Back"
          onClick={() => navigate({ to: "/pupils/$id", params: { id } })}
          className="flex items-center justify-center"
          style={{ width: 40, height: 40 }}
        >
          <ArrowLeft size={22} color="#FFFFFF" />
        </button>
        <div
          className="flex-1 text-center text-[15px] font-semibold text-white"
          style={POPPINS}
        >
          Payment history
        </div>
        <div style={{ width: 40 }} />
      </div>

      <div className="px-4 mt-3">
        {pupilName && (
          <div className="text-[16px] font-semibold text-[#0B1F3A] mb-3" style={POPPINS}>
            {pupilName}
          </div>
        )}

        {(() => {
          return (
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="rounded-xl p-4" style={{ backgroundColor: "#0F2044" }}>
                <p
                  className="text-[10px] font-bold uppercase tracking-widest"
                  style={{ color: "rgba(255,255,255,0.5)", ...POPPINS }}
                >
                  {balanceLabel(net)}
                </p>
                <p className="text-[22px] font-bold mt-1" style={{ color: balanceColor, ...POPPINS }}>
                  {formatGBP(Math.abs(net))}
                </p>
              </div>
              <div className="rounded-xl p-4" style={{ backgroundColor: "#F1F5F9" }}>
                <p
                  className="text-[10px] font-bold uppercase tracking-widest"
                  style={{ color: "#64748B", ...POPPINS }}
                >
                  Total paid
                </p>
                <p className="text-[22px] font-bold text-[#0B1F3A] mt-1" style={POPPINS}>
                  {formatGBP(totalPaid)}
                </p>
              </div>
            </div>
          );
        })()}

        {net > 0 && (pupilPhone || pupilEmail) && (
          <div className="mb-3">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-[#64748B] mb-2" style={POPPINS}>
              Send payment reminder
            </p>
            <div className="grid grid-cols-2 gap-2">
              <a
                href={smsHref}
                className="flex items-center justify-center gap-2 rounded-xl border border-[#E2E8F0] bg-white py-3 text-[13px] font-semibold text-[#0B1F3A]"
                style={POPPINS}
              >
                <MessageSquare size={16} color="#1877D6" />
                Text
              </a>
              <a
                href={mailHref}
                className="flex items-center justify-center gap-2 rounded-xl border border-[#E2E8F0] bg-white py-3 text-[13px] font-semibold text-[#0B1F3A]"
                style={POPPINS}
              >
                <Mail size={16} color="#1877D6" />
                Email
              </a>
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={() => {
            setRecAmount(net > 0 ? net.toFixed(2) : "");
            setShowRecord(true);
          }}
          className="w-full flex items-center justify-center gap-2 rounded-xl py-3 mb-4 text-[14px] font-semibold text-white"
          style={{ backgroundColor: "#1877D6", ...POPPINS }}
        >
          <Plus size={18} color="#FFFFFF" />
          Record payment
        </button>

        {payments === null ? null : payments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <PoundSterling size={40} color="#6B7280" />
            <p className="mt-3 text-[14px] text-[#6B7280]" style={POPPINS}>
              No payment history
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <SectionHeader>Payments</SectionHeader>
            {payments.map((p) => (
              <Card key={p.id}>
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div
                      className="text-[14px] font-semibold text-[#0B1F3A]"
                      style={POPPINS}
                    >
                      {formatDate(new Date(p.created_at))}
                    </div>
                    <div className="text-[13px] text-[#6B7280]" style={POPPINS}>
                      {formatMethod(p.payment_method)}
                    </div>
                  </div>
                  <div
                    className="text-[16px] font-bold text-[#0B1F3A] shrink-0"
                    style={POPPINS}
                  >
                    {formatGBP(p.lesson_cost)}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {showRecord && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 overflow-y-auto"
          onClick={() => !recSaving && setShowRecord(false)}
        >
          <div
            className="w-full sm:max-w-[420px] bg-white rounded-t-2xl sm:rounded-2xl p-5 overflow-y-auto"
            style={{ ...POPPINS, maxHeight: "85dvh", paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 96px)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[16px] font-semibold text-[#0B1F3A]" style={POPPINS}>
                Record payment
              </h2>
              <button
                type="button"
                aria-label="Close"
                onClick={() => !recSaving && setShowRecord(false)}
                className="p-1"
              >
                <X size={20} color="#0B1F3A" />
              </button>
            </div>

            <label className="block text-[12px] font-semibold text-[#64748B] mb-1" style={POPPINS}>
              Amount (£)
            </label>
            <input
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              value={recAmount}
              onChange={(e) => setRecAmount(e.target.value)}
              placeholder="0.00"
              className="w-full rounded-xl border border-[#E2E8F0] px-3 py-3 text-[16px] text-[#0B1F3A] mb-4"
              style={POPPINS}
            />

            <label className="block text-[12px] font-semibold text-[#64748B] mb-1" style={POPPINS}>
              Hours bought (optional)
            </label>
            <input
              type="number"
              inputMode="decimal"
              step="0.5"
              min="0"
              value={recHours}
              onChange={(e) => setRecHours(e.target.value)}
              placeholder="e.g. 10"
              className="w-full rounded-xl border border-[#E2E8F0] px-3 py-3 text-[16px] text-[#0B1F3A] mb-4"
              style={POPPINS}
            />

            <label className="block text-[12px] font-semibold text-[#64748B] mb-2" style={POPPINS}>
              Payment method
            </label>
            <div className="grid grid-cols-3 gap-2 mb-5">
              {([
                { k: "cash", label: "Cash" },
                { k: "bank_transfer", label: "Bank" },
                { k: "card", label: "Card" },
              ] as const).map((opt) => {
                const active = recMethod === opt.k;
                return (
                  <button
                    key={opt.k}
                    type="button"
                    onClick={() => setRecMethod(opt.k)}
                    className="rounded-xl py-2 text-[13px] font-semibold border"
                    style={{
                      backgroundColor: active ? "#0F2044" : "#FFFFFF",
                      color: active ? "#FFFFFF" : "#0B1F3A",
                      borderColor: active ? "#0F2044" : "#E2E8F0",
                      ...POPPINS,
                    }}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>

            <label className="block text-[12px] font-semibold text-[#64748B] mb-1" style={POPPINS}>
              Notes (optional)
            </label>
            <input
              type="text"
              value={recNotes}
              onChange={(e) => setRecNotes(e.target.value)}
              placeholder="e.g. 10-hour package"
              className="w-full rounded-xl border border-[#E2E8F0] px-3 py-3 text-[14px] text-[#0B1F3A] mb-5"
              style={POPPINS}
            />

            <button
              type="button"
              disabled={recSaving}
              onClick={submitRecordPayment}
              className="w-full rounded-xl py-3 text-[14px] font-semibold text-white"
              style={{ backgroundColor: "#1877D6", opacity: recSaving ? 0.6 : 1, ...POPPINS }}
            >
              {recSaving ? "Saving..." : "Save payment"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

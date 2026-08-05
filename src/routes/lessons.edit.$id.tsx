import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PoundSterling } from "lucide-react";
import InstructorTopBar from "@/components/dsm/InstructorTopBar";
import { toast } from "sonner";
import { Input } from "../components/dsm/Input";
import { supabase } from "../lib/supabaseClient";
import { PageLayout } from "@/components/PageLayout";
import { AddressLookup } from "@/components/dsm/AddressLookup";
import { recordPayment } from "@/lib/payments";

export const Route = createFileRoute("/lessons/edit/$id")({
  head: () => ({
    meta: [{ title: "Edit lesson — DSM by EveryDriver" }],
  }),
  component: EditLessonPage,
});

const POPPINS = { fontFamily: "Inter, sans-serif" } as const;

interface Pupil {
  id: string;
  name: string;
}

const DURATIONS: { label: string; value: number }[] = [
  { label: "1h", value: 60 },
  { label: "1.5h", value: 90 },
  { label: "2h", value: 120 },
  { label: "3h", value: 180 },
  { label: "4h", value: 240 },
  { label: "5h", value: 300 },
];

const STATUSES = [
  { label: "Confirmed", value: "confirmed" },
  { label: "Pending", value: "pending" },
  { label: "Completed", value: "completed" },
  { label: "Cancelled", value: "cancelled" },
];

const fieldBorder: React.CSSProperties = {
  fontFamily: "Inter, sans-serif",
  borderWidth: "0.5px",
  borderStyle: "solid",
  borderColor: "#EEF2F7",
};

function FieldLabel({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) {
  return (
    <label
      htmlFor={htmlFor}
      className="block mb-1 text-[12px] font-medium text-[#6B7280]"
      style={POPPINS}
    >
      {children}
    </label>
  );
}

type PayStatus = "paid" | "unpaid" | "prepaid" | "partial" | "cancelled" | string;

function PaymentStatusBadge({ status }: { status: PayStatus }) {
  const map: Record<string, { bg: string; fg: string; label: string }> = {
    paid: { bg: "#E7F8EF", fg: "#067647", label: "Paid" },
    unpaid: { bg: "#FDECEE", fg: "#CC2229", label: "Unpaid" },
    prepaid: { bg: "#EAF3FB", fg: "#1877D6", label: "Prepaid" },
    partial: { bg: "#FEF3E6", fg: "#B5661E", label: "Partial" },
    cancelled: { bg: "#F1F3F7", fg: "#6B7280", label: "Cancelled" },
  };
  const s = map[status] ?? { bg: "#F1F3F7", fg: "#6B7280", label: status || "—" };
  return (
    <span
      className="inline-flex items-center px-2 h-6 rounded-full text-[12px] font-semibold"
      style={{ backgroundColor: s.bg, color: s.fg, fontFamily: "Inter, sans-serif" }}
    >
      {s.label}
    </span>
  );
}

function EditLessonPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [pupils, setPupils] = useState<Pupil[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [pupilId, setPupilId] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [duration, setDuration] = useState(60);
  const [status, setStatus] = useState("confirmed");
  const [pickupLocation, setPickupLocation] = useState("");
  const [pickupAddress, setPickupAddress] = useState("");
  const [pickupPostcode, setPickupPostcode] = useState("");
  const [notes, setNotes] = useState("");

  // Payment display + inline form
  const [paymentStatus, setPaymentStatus] = useState<PayStatus>("unpaid");
  const [amountDue, setAmountDue] = useState<number | null>(null);
  const [accountBalance, setAccountBalance] = useState<number>(0);
  const [payOpen, setPayOpen] = useState(false);
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState("cash");
  const [payNotes, setPayNotes] = useState("");
  const [savingPayment, setSavingPayment] = useState(false);

  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [previousStatus, setPreviousStatus] = useState<string>("confirmed");
  const [cancelReason, setCancelReason] = useState<string>("");
  const [cancelNote, setCancelNote] = useState("");
  const [chargeOption, setChargeOption] = useState<"none" | "fee" | "full">("none");
  const [cancelFee, setCancelFee] = useState("");


  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const [pupilsRes, lessonRes] = await Promise.all([
        supabase
          .from("pupils")
          .select("id, name, first_name, last_name")
          .eq("instructor_id", user.id)
          .is("deleted_at", null)
          .order("name", { ascending: true, nullsFirst: false }),
        supabase
          .from("lessons")
          .select("pupil_id, lesson_date, lesson_time, duration_minutes, status, notes, pickup_location, payment_status, amount_due")
          .eq("id", id)
          .is("deleted_at", null)
          .maybeSingle(),
      ]);

      if (pupilsRes.error) console.error("[edit-lesson] pupils error", pupilsRes.error);
      const pupilRows =
        (pupilsRes.data as Array<{
          id: string;
          name: string | null;
          first_name: string | null;
          last_name: string | null;
        }> | null) ?? [];
      setPupils(
        pupilRows.map((p) => ({
          id: p.id,
          name:
            p.name ??
            [p.first_name, p.last_name].filter(Boolean).join(" ").trim() ??
            "Unnamed",
        })),
      );

      if (lessonRes.error) {
        console.error("[edit-lesson] fetch error", lessonRes.error);
        setError(lessonRes.error.message);
      } else if (lessonRes.data) {
        const l = lessonRes.data as {
          pupil_id: string;
          lesson_date: string;
          lesson_time: string;
          duration_minutes: number | null;
          status: string;
          notes: string | null;
          pickup_location: string | null;
          payment_status: string | null;
          amount_due: number | null;
        };
        setPupilId(l.pupil_id);
        setDate(l.lesson_date);
        setTime((l.lesson_time ?? "").slice(0, 5));
        setDuration(l.duration_minutes ?? 60);
        setStatus(l.status ?? "confirmed");
        setPickupLocation(l.pickup_location ?? "");
        setPickupAddress(l.pickup_location ?? "");
        setPickupPostcode("");
        setNotes(l.notes ?? "");
        setPaymentStatus((l.payment_status as PayStatus) ?? "unpaid");
        setAmountDue(l.amount_due != null ? Number(l.amount_due) : null);

        // Fetch pupil account_balance for recordPayment reconciliation.
        if (l.pupil_id) {
          const { data: pRow } = await supabase
            .from("pupils")
            .select("account_balance")
            .eq("id", l.pupil_id)
            .maybeSingle();
          setAccountBalance(
            Number((pRow as { account_balance?: number | null } | null)?.account_balance ?? 0),
          );
        }
      }
      setLoading(false);
    })();
  }, [id]);

  async function refreshPayment(pupil: string) {
    const [{ data: lRow }, { data: pRow }] = await Promise.all([
      supabase
        .from("lessons")
        .select("payment_status, amount_due")
        .eq("id", id)
        .maybeSingle(),
      supabase
        .from("pupils")
        .select("account_balance")
        .eq("id", pupil)
        .maybeSingle(),
    ]);
    if (lRow) {
      const r = lRow as { payment_status: string | null; amount_due: number | null };
      setPaymentStatus((r.payment_status as PayStatus) ?? "unpaid");
      setAmountDue(r.amount_due != null ? Number(r.amount_due) : null);
    }
    if (pRow) {
      setAccountBalance(
        Number((pRow as { account_balance?: number | null } | null)?.account_balance ?? 0),
      );
    }
  }

  async function submitPayment() {
    if (!pupilId) {
      toast.error("No pupil");
      return;
    }
    const amt = Number(payAmount);
    if (!amt || amt <= 0) {
      toast.error("Enter an amount");
      return;
    }
    setSavingPayment(true);
    try {
      await recordPayment({
        pupilId,
        amount: amt,
        method: payMethod,
        notes: payNotes.trim() || null,
        currentAccountBalance: accountBalance,
      });
      toast.success("Payment recorded");
      setPayAmount("");
      setPayNotes("");
      setPayMethod("cash");
      setPayOpen(false);
      await refreshPayment(pupilId);
    } catch (e) {
      console.error("[edit-lesson] payment failed", e);
      toast.error("Couldn't record payment");
    } finally {
      setSavingPayment(false);
    }
  }

  async function handleSave() {
    if (saving || showCancelConfirm) return;
    setSaving(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    setError(null);
    const { error: updErr } = await supabase
      .from("lessons")
      .update({
        pupil_id: pupilId,
        lesson_date: date,
        lesson_time: `${time}:00`,
        duration_minutes: duration,
        status,
        pickup_location: pickupLocation.trim() || null,
        notes: notes.trim() || null,
      })
      .eq("id", id);
    if (updErr) {
      console.error("[edit-lesson] update error", updErr);
      setError(updErr.message);
      setSaving(false);
      return;
    }
    // Sync to Google Calendar after save
    const { data: lessonRow } = await supabase
      .from("lessons")
      .select("google_event_id")
      .eq("id", id)
      .maybeSingle();
    if (lessonRow?.google_event_id) {
      void supabase.functions.invoke("google-calendar-sync", {
        body: {
          lesson_id: id,
          instructor_id: user?.id ?? "",
          action: "update",
        },
      });
    }
    toast.success("Lesson updated");
    navigate({ to: "/home" });
  }

  return (
    <PageLayout className="pb-8" style={POPPINS}>
      <InstructorTopBar
        firstName=""
        pageTitle="Edit lesson"
        onBack={() => navigate({ to: "/lessons/$id", params: { id } } as never)}
        onBell={() => navigate({ to: "/notifications" as never })}
        onPhone={() => navigate({ to: "/enquiries" as never })}
        onLiveTrack={() => navigate({ to: "/live" as never })}
        onMenu={() => navigate({ to: "/more" as never })}
        onMicPress={() => toast.info("Voice commands coming soon!")}
      />
      <div style={{ height: "calc(60px + env(safe-area-inset-top, 0px))" }} />

      {/* Action bar */}
      <div className="flex items-center justify-end px-4 py-2">
        <button
          type="button"
          aria-label="Save"
          onClick={handleSave}
          disabled={saving || loading || showCancelConfirm}
          className="text-[13px] font-semibold"
          style={{ color: "#1877D6", background: "none", border: "none", opacity: saving || loading || showCancelConfirm ? 0.5 : 1 }}
        >
          {saving ? "Saving…" : "Save"}
        </button>

      </div>

      {loading ? (
        <div className="px-4 pt-6 text-[14px] text-[#6B7280]">Loading…</div>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSave();
          }}
          className="flex flex-col gap-4 px-4 pt-4"
        >
          <div>
            <FieldLabel htmlFor="pupil">Pupil</FieldLabel>
            <select
              id="pupil"
              value={pupilId}
              onChange={(e) => setPupilId(e.target.value)}
              className="h-11 w-full rounded-lg px-3 text-[14px] text-[#0B1F3A] bg-white focus:border-[#1877D6] focus:outline-none"
              style={fieldBorder}
            >
              <option value="">Select a pupil</option>
              {pupils.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <Input
            label="Date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />

          <Input
            label="Time"
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            step={60}
          />

          <div>
            <FieldLabel htmlFor="duration">Duration</FieldLabel>
            <select
              id="duration"
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              className="h-11 w-full rounded-lg px-3 text-[14px] text-[#0B1F3A] bg-white focus:border-[#1877D6] focus:outline-none"
              style={fieldBorder}
            >
              {DURATIONS.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <FieldLabel htmlFor="status">Status</FieldLabel>
            <select
              id="status"
              value={status}
              onChange={(e) => {
                const val = e.target.value;
                if (val === "cancelled") {
                  setPreviousStatus(status);
                  setStatus("cancelled");
                  setShowCancelConfirm(true);
                } else {
                  setShowCancelConfirm(false);
                  setStatus(val);
                }
              }}
              className="h-11 w-full rounded-lg px-3 text-[14px] text-[#0B1F3A] bg-white focus:border-[#1877D6] focus:outline-none"
              style={fieldBorder}
            >
              {STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>

            {showCancelConfirm && (() => {
              const pupilName = pupils.find((p) => p.id === pupilId)?.name ?? "Pupil";
              const balance = Number(amountDue ?? 0);
              const CANCEL_REASONS = [
                "Pupil cancelled",
                "Instructor cancelled",
                "Weather",
                "Vehicle issue",
                "Pupil no show",
                "Admin",
                "Other",
              ];
              const labelStyle: React.CSSProperties = {
                fontFamily: "Poppins, sans-serif",
                fontSize: 10,
                fontWeight: 600,
                color: "#9CA3AF",
                textTransform: "uppercase",
                letterSpacing: 0.6,
                margin: "14px 0 8px",
              };
              const chargeRow = (sel: boolean, bg: string, bc: string): React.CSSProperties => ({
                width: "100%",
                textAlign: "left",
                background: sel ? bg : "#fff",
                border: `1px solid ${sel ? bc : "#E4E8EF"}`,
                borderRadius: 8,
                padding: "10px 14px",
                cursor: "pointer",
              });
              const chargeTitle: React.CSSProperties = {
                fontFamily: "Poppins, sans-serif",
                fontSize: 13,
                fontWeight: 600,
                color: "#0B1F3A",
              };
              const chargeSub: React.CSSProperties = {
                fontFamily: "Poppins, sans-serif",
                fontSize: 11,
                color: "#6B7686",
                marginTop: 2,
              };
              const resetCancel = () => {
                setCancelReason("");
                setCancelNote("");
                setChargeOption("none");
                setCancelFee("");
              };
              return (
              <div
                className="mt-2"
                style={{
                  background: "#fff",
                  border: "1px solid #FECACA",
                  borderRadius: 10,
                  padding: 14,
                }}
              >
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: "#CC2229",
                    fontFamily: "Poppins, sans-serif",
                  }}
                >
                  Cancel lesson with {pupilName}
                </div>

                {/* Reason */}
                <div style={labelStyle}>Reason for cancellation</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {CANCEL_REASONS.map((r) => {
                    const sel = cancelReason === r;
                    return (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setCancelReason(r)}
                        style={{
                          background: sel ? "#0B1F3A" : "#F1F5F9",
                          color: sel ? "#fff" : "#6B7686",
                          borderRadius: 20,
                          padding: "6px 14px",
                          fontFamily: "Poppins, sans-serif",
                          fontSize: 12,
                          fontWeight: sel ? 600 : 500,
                          border: "none",
                          cursor: "pointer",
                        }}
                      >
                        {r}
                      </button>
                    );
                  })}
                </div>

                {/* Notes */}
                <div style={labelStyle}>Notes</div>
                <textarea
                  rows={3}
                  value={cancelNote}
                  onChange={(e) => setCancelNote(e.target.value)}
                  placeholder="Add any additional notes..."
                  style={{
                    width: "100%",
                    border: "1px solid #E4E8EF",
                    borderRadius: 8,
                    fontFamily: "Poppins, sans-serif",
                    fontSize: 13,
                    padding: 10,
                    boxSizing: "border-box",
                    resize: "vertical",
                  }}
                />

                {/* Charge */}
                <div style={labelStyle}>Charge</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => setChargeOption("none")}
                    style={chargeRow(chargeOption === "none", "#E6F1FB", "#1877D6")}
                  >
                    <div style={chargeTitle}>No charge</div>
                    <div style={chargeSub}>
                      {paymentStatus === "paid" || paymentStatus === "partial"
                        ? `£${balance.toFixed(2)} refunded as account credit`
                        : paymentStatus === "prepaid"
                          ? "1 lesson returned to prepaid hours"
                          : "No payment to refund"}
                    </div>
                  </button>

                  <div>
                    <button
                      type="button"
                      onClick={() => setChargeOption("fee")}
                      style={chargeRow(chargeOption === "fee", "#FEF3C7", "#D97706")}
                    >
                      <div style={chargeTitle}>Charge cancellation fee</div>
                      <div style={chargeSub}>Remainder refunded to account credit</div>
                    </button>
                    {chargeOption === "fee" && (
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8 }}>
                        <span style={{ fontFamily: "Poppins, sans-serif", fontSize: 13, color: "#6B7686" }}>£</span>
                        <input
                          type="number"
                          inputMode="decimal"
                          value={cancelFee}
                          onChange={(e) => setCancelFee(e.target.value)}
                          placeholder="e.g. 20.00"
                          style={{
                            flex: 1,
                            border: "1px solid #E4E8EF",
                            borderRadius: 8,
                            padding: "10px 12px",
                            fontFamily: "Poppins, sans-serif",
                            fontSize: 13,
                            boxSizing: "border-box",
                          }}
                        />
                      </div>
                    )}
                  </div>

                  {(paymentStatus === "paid" || paymentStatus === "partial") && (
                    <button
                      type="button"
                      onClick={() => setChargeOption("full")}
                      style={chargeRow(chargeOption === "full", "#FCE9E9", "#CC2229")}
                    >
                      <div style={chargeTitle}>Charge full lesson</div>
                      <div style={chargeSub}>No refund — full payment retained</div>
                    </button>
                  )}
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 14 }}>
                  <button
                    type="button"
                    disabled={saving || !cancelReason}
                    onClick={async () => {
                      setSaving(true);
                      const { data: userRes } = await supabase.auth.getUser();
                      const { error: updErr } = await supabase
                        .from("lessons")
                        .update({
                          status: "cancelled",
                          payment_status: "cancelled",
                          notes: [notes, cancelReason, cancelNote].filter(Boolean).join(" · "),
                        })
                        .eq("id", id);
                      if (updErr) {
                        console.error("[edit-lesson] cancel error", updErr);
                        toast.error("Could not cancel lesson");
                        setSaving(false);
                        return;
                      }
                      // Sync to Google Calendar after cancel
                      const { data: lessonRow } = await supabase
                        .from("lessons")
                        .select("google_event_id")
                        .eq("id", id)
                        .maybeSingle();
                      if (lessonRow?.google_event_id) {
                        void supabase.functions.invoke("google-calendar-sync", {
                          body: {
                            lesson_id: id,
                            instructor_id: userRes.user?.id ?? "",
                            action: "delete",
                          },
                        });
                      }

                      const { recordRefund } = await import("@/lib/payments");
                      if (
                        chargeOption === "none" &&
                        (paymentStatus === "paid" || paymentStatus === "partial")
                      ) {
                        await recordRefund({
                          pupilId,
                          amount: Number(amountDue ?? 0),
                          method: "cash",
                          notes: `Cancellation refund — ${cancelReason}`,
                          currentAccountBalance: 0,
                        });
                      } else if (chargeOption === "fee") {
                        const fee = Number(cancelFee) || 0;
                        const refund = Number(amountDue ?? 0) - fee;
                        if (refund > 0) {
                          await recordRefund({
                            pupilId,
                            amount: refund,
                            method: "cash",
                            notes: `Partial refund — cancellation fee £${fee} retained`,
                            currentAccountBalance: 0,
                          });
                        }
                      } else if (chargeOption === "full") {
                        await supabase.from("lesson_history").insert({
                          instructor_id: userRes.user?.id ?? "",
                          pupil_id: pupilId,
                          amount_paid: Number(amountDue ?? 0),
                          payment_method: "cash",
                          payment_status: "paid",
                          notes: `Full charge retained — ${cancelReason}`,
                          created_at: new Date().toISOString(),
                        } as never);
                      }

                      if (chargeOption === "none" && paymentStatus === "prepaid") {
                        const { data: pRow } = await supabase
                          .from("pupils")
                          .select("prepaid_hours")
                          .eq("id", pupilId)
                          .maybeSingle();
                        const currentHours = Number(
                          (pRow as { prepaid_hours?: number | null } | null)?.prepaid_hours ?? 0,
                        );
                        await supabase
                          .from("pupils")
                          .update({ prepaid_hours: currentHours + 1 })
                          .eq("id", pupilId);
                      }
                      toast.success("Lesson cancelled");
                      navigate({ to: "/home" });
                    }}
                    style={{
                      background: "#CC2229",
                      color: "#fff",
                      borderRadius: 8,
                      padding: 12,
                      width: "100%",
                      fontSize: 14,
                      fontWeight: 600,
                      fontFamily: "Poppins, sans-serif",
                      border: "none",
                      opacity: saving || !cancelReason ? 0.5 : 1,
                    }}
                  >
                    {saving ? "Cancelling…" : "Confirm cancellation"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setStatus(previousStatus);
                      setShowCancelConfirm(false);
                      resetCancel();
                    }}
                    style={{
                      background: "#F3F4F6",
                      color: "#374151",
                      borderRadius: 8,
                      padding: 12,
                      width: "100%",
                      fontSize: 14,
                      fontWeight: 500,
                      fontFamily: "Poppins, sans-serif",
                      border: "none",
                    }}
                  >
                    Keep lesson
                  </button>
                </div>
              </div>
              );
            })()}

          </div>

          <div>
            <FieldLabel htmlFor="pickupLocation">Pickup location</FieldLabel>
            <AddressLookup
              initialAddress={pickupAddress}
              initialPostcode={pickupPostcode}
              onAddressFound={({ address, postcode }) => {
                setPickupAddress(address);
                setPickupPostcode(postcode);
                const combined = [address, postcode].filter(Boolean).join(", ");
                setPickupLocation(combined);
              }}
            />
          </div>

          {/* Payment status + Log payment */}
          <div>
            <FieldLabel htmlFor="paymentStatus">Payment status</FieldLabel>
            <div
              className="h-11 w-full rounded-lg px-3 bg-white flex items-center justify-between"
              style={fieldBorder}
            >
              <div className="flex items-center gap-2">
                <PaymentStatusBadge status={paymentStatus} />
                {amountDue != null && (
                  <span className="text-[12px] text-[#6B7280]">
                    £{amountDue.toFixed(2)} due
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setPayOpen((v) => !v)}
                className="text-[13px] font-semibold"
                style={{ color: "#1877D6" }}
              >
                {payOpen ? "Cancel" : "Log payment"}
              </button>
            </div>

            {payOpen && (
              <div
                className="mt-2 rounded-lg bg-white p-3 flex flex-col gap-2"
                style={fieldBorder}
              >
                <div className="flex gap-2">
                  <div
                    className="flex items-center rounded-lg px-3 flex-1"
                    style={{ border: "1px solid #E3E7ED", backgroundColor: "#FFFFFF" }}
                  >
                    <PoundSterling size={16} color="#8A93A3" />
                    <input
                      type="number"
                      inputMode="decimal"
                      value={payAmount}
                      onChange={(e) => setPayAmount(e.target.value)}
                      placeholder="Amount"
                      className="w-full py-2 px-2 text-[14px] focus:outline-none bg-transparent text-[#0B1F3A]"
                    />
                  </div>
                  <select
                    value={payMethod}
                    onChange={(e) => setPayMethod(e.target.value)}
                    className="rounded-lg px-3 py-2 text-[14px] focus:outline-none text-[#0B1F3A]"
                    style={{ border: "1px solid #E3E7ED", backgroundColor: "#FFFFFF" }}
                  >
                    <option value="cash">Cash</option>
                    <option value="bank_transfer">Bank</option>
                    <option value="card">Card</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <textarea
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  placeholder="Notes (optional)"
                  rows={2}
                  className="w-full px-3 py-2 rounded-lg text-[14px] resize-none focus:outline-none text-[#0B1F3A]"
                  style={{ border: "1px solid #E3E7ED", backgroundColor: "#FFFFFF" }}
                />
                <button
                  type="button"
                  disabled={savingPayment || !payAmount || Number(payAmount) <= 0}
                  onClick={submitPayment}
                  className="h-10 rounded-lg text-white text-[14px] font-semibold"
                  style={{
                    backgroundColor: "#1877D6",
                    opacity:
                      savingPayment || !payAmount || Number(payAmount) <= 0 ? 0.5 : 1,
                  }}
                >
                  {savingPayment
                    ? "Recording…"
                    : !payAmount || Number(payAmount) <= 0
                      ? "Enter amount"
                      : `Record £${Number(payAmount).toFixed(2)}`}
                </button>
              </div>
            )}
          </div>

          <div>
            <FieldLabel htmlFor="notes">Notes</FieldLabel>
            <textarea
              id="notes"
              rows={4}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-lg px-3 py-2 text-[14px] text-[#0B1F3A] bg-white focus:border-[#1877D6] focus:outline-none"
              style={fieldBorder}
            />
          </div>

          {error && (
            <p className="text-[12px]" style={{ color: "#1877D6" }}>
              {error}
            </p>
          )}
        </form>
      )}
    </PageLayout>
  );
}

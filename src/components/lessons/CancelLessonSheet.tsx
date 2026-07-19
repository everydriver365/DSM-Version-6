import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabaseClient";

const POPPINS = { fontFamily: "Inter, sans-serif" } as const;

const CANCEL_REASONS = [
  "Pupil cancelled",
  "Pupil no-show",
  "Instructor cancelled",
  "Weather",
  "Vehicle issue",
  "Other",
] as const;

type CancellationTier = { hours: number; charge_percent: number };

export function CancelLessonSheet({
  open,
  onClose,
  pupilName,
  pupilId,
  lessonId,
  lessonDate,
  lessonTime,
  paymentStatus,
  amountDue,
  when,
  onCancelled,
}: {
  open: boolean;
  onClose: () => void;
  pupilName: string;
  pupilId: string;
  lessonId: string;
  lessonDate: string;
  lessonTime: string;
  paymentStatus: string | null;
  amountDue: number;
  when: string;
  onCancelled: () => void;
}) {
  const [reason, setReason] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [tiers, setTiers] = useState<CancellationTier[]>([
    { hours: 24, charge_percent: 100 },
    { hours: 48, charge_percent: 50 },
  ]);
  const [noShowPercent, setNoShowPercent] = useState<number>(100);

  useEffect(() => {
    if (open) {
      setReason("");
      setNotes("");
      setSubmitting(false);
    }
  }, [open]);

  // Fetch instructor policy on open
  useEffect(() => {
    if (!open) return;
    (async () => {
      const { data: userRes } = await supabase.auth.getUser();
      const uid = userRes.user?.id;
      if (!uid) return;
      const { data } = await supabase
        .from("instructor_reminder_preferences")
        .select("cancellation_tiers, no_show_charge_percent")
        .eq("instructor_id", uid)
        .maybeSingle();
      if (!data) return;
      const p = data as Record<string, unknown>;
      if (typeof p.no_show_charge_percent === "number") setNoShowPercent(p.no_show_charge_percent);
      const raw = p.cancellation_tiers;
      if (typeof raw === "string") {
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) setTiers(parsed as CancellationTier[]);
        } catch { /* keep defaults */ }
      } else if (Array.isArray(raw) && raw.length > 0) {
        setTiers(raw as CancellationTier[]);
      }
    })();
  }, [open]);

  const isNoShow =
    reason === "Pupil no-show" || reason.toLowerCase().includes("no-show") || reason.toLowerCase().includes("no_show");

  // Charge calculation
  const lessonStart = new Date(`${lessonDate}T${lessonTime}`);
  const hoursUntilLesson = (lessonStart.getTime() - Date.now()) / 3600000;
  const lessonValue = amountDue || 0;

  const sortedTiers = [...tiers].sort((a, b) => a.hours - b.hours);
  const applicableTier = isNoShow
    ? null
    : sortedTiers.find((t) => hoursUntilLesson < t.hours) ?? null;

  const chargePercent = isNoShow ? noShowPercent : (applicableTier ? applicableTier.charge_percent : 0);
  const noticePeriod = applicableTier ? applicableTier.hours : null;
  const chargeAmount = Math.round(lessonValue * chargePercent / 100 * 100) / 100;

  async function performCancel(feeAmount: number, waived: boolean) {
    if (submitting) return;
    setSubmitting(true);

    const isPrepaid = (paymentStatus ?? "").toLowerCase() === "prepaid";
    const lessonPatch: Record<string, unknown> = {
      status: "cancelled",
      cancellation_reason: reason,
      cancellation_notes: feeAmount > 0
        ? `Cancellation fee applied: ${chargePercent}% of lesson value${notes ? ` — ${notes}` : ""}`
        : (notes || null),
      cancelled_at: new Date().toISOString(),
      payment_status: feeAmount > 0 ? "unpaid" : "cancelled",
      amount_due: feeAmount > 0 ? feeAmount : 0,
    };
    const { error } = await supabase.from("lessons").update(lessonPatch).eq("id", lessonId);
    if (error) {
      console.error("[cancel] update lesson error", error);
      toast.error("Couldn't cancel lesson");
      setSubmitting(false);
      return;
    }

    // Refund prepaid balance back to pupil credit if lesson was prepaid.
    if (isPrepaid && amountDue > 0) {
      const { data: pupilRow, error: readErr } = await supabase
        .from("pupils")
        .select("account_balance")
        .eq("id", pupilId)
        .maybeSingle();
      if (readErr) console.error("[cancel] pupil read error", readErr);
      const current = Number((pupilRow as { account_balance: number | null } | null)?.account_balance ?? 0);
      const { error: refundErr } = await supabase
        .from("pupils")
        .update({ account_balance: current + amountDue })
        .eq("id", pupilId);
      if (refundErr) console.error("[cancel] account_balance refund error", refundErr);
    }

    const { data: userRes } = await supabase.auth.getUser();
    const instructorId = userRes.user?.id ?? null;
    if (instructorId) {
      const body = feeAmount > 0
        ? `Cancellation fee of £${feeAmount.toFixed(2)} added for ${pupilName}`
        : `${pupilName}'s lesson on ${when} was cancelled${waived ? " (charge waived)" : ""}`;
      const { error: notifErr } = await supabase.from("instructor_notifications").insert({
        instructor_id: instructorId,
        title: feeAmount > 0 ? "Cancellation fee added" : "Lesson cancelled",
        body,
        type: "lesson",
        read: false,
      });
      if (notifErr) console.error("[cancel] notification error", notifErr);
    }

    setSubmitting(false);
    onCancelled();
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" style={POPPINS}>
      <div
        className="absolute inset-0"
        style={{ backgroundColor: "rgba(11,31,58,0.5)" }}
        onClick={onClose}
        aria-hidden
      />
      <div
        className="relative w-full bg-white"
        style={{
          borderTopLeftRadius: 16,
          borderTopRightRadius: 16,
          maxHeight: "92vh",
          overflowY: "auto",
          paddingBottom: 24,
        }}
      >
        <div className="flex items-center justify-between px-4 pt-4">
          <span className="text-[11px] font-semibold tracking-wider" style={{ color: "#6B7280" }}>
            CANCEL LESSON
          </span>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="flex items-center justify-center"
            style={{ width: 32, height: 32 }}
          >
            <X size={18} color="#6B7280" />
          </button>
        </div>

        <div className="px-4 mt-2">
          <div className="rounded-[12px] p-3" style={{ backgroundColor: "#F3F4F6" }}>
            <div className="text-[14px] font-semibold" style={{ color: "#0B1F3A" }}>{pupilName}</div>
            <div className="text-[12px]" style={{ color: "#6B7280" }}>{when}</div>
          </div>
        </div>

        {/* Step 1 — reason */}
        <div className="px-4 mt-4">
          <label className="text-[12px] font-semibold" style={{ color: "#0B1F3A" }}>
            Cancellation reason *
          </label>
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full mt-1 px-3 bg-white"
            style={{ height: 44, borderRadius: 8, border: "1px solid #EEF2F7", color: "#0B1F3A", fontSize: 14, ...POPPINS }}
          >
            <option value="" disabled>Select a reason</option>
            {CANCEL_REASONS.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>

        {/* Optional notes */}
        <div className="px-4 mt-4">
          <label className="text-[12px] font-semibold" style={{ color: "#0B1F3A" }}>
            Additional notes
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="w-full mt-1 px-3 py-2 bg-white"
            style={{ borderRadius: 8, border: "1px solid #EEF2F7", color: "#0B1F3A", fontSize: 14, resize: "none", ...POPPINS }}
          />
        </div>

        {/* Step 2 — charge calculation (shown once reason is selected) */}
        {reason && (
          <>
            <div
              className="mx-4"
              style={{
                marginTop: 12,
                background: "#FEF2F2",
                border: "0.5px solid #FECACA",
                borderRadius: 12,
                padding: 16,
              }}
            >
              <div className="text-[14px]" style={{ color: "#0F2044", ...POPPINS }}>
                Notice given: {Math.max(0, Math.round(hoursUntilLesson))} hours
              </div>
              {chargePercent > 0 ? (
                <>
                  <div className="mt-2" style={{ fontWeight: 700, fontSize: 15, color: "#CC2229", ...POPPINS }}>
                    Cancellation charge applies: {chargePercent}% = £{chargeAmount.toFixed(2)}
                  </div>
                  <div className="text-[12px] mt-1" style={{ color: "#9CA3AF", ...POPPINS }}>
                    {isNoShow
                      ? "Based on your no-show policy"
                      : `Based on your policy: less than ${noticePeriod} hours notice`}
                  </div>
                </>
              ) : (
                <>
                  <div className="mt-2 text-[14px]" style={{ fontWeight: 600, color: "#16A34A", ...POPPINS }}>
                    No charge applies
                  </div>
                  <div className="text-[12px] mt-1" style={{ color: "#9CA3AF", ...POPPINS }}>
                    Sufficient notice given
                  </div>
                </>
              )}
            </div>

            <div className="px-4 mt-4 flex flex-col gap-2">
              {chargeAmount > 0 && (
                <button
                  type="button"
                  onClick={() => performCancel(chargeAmount, false)}
                  disabled={submitting}
                  className="inline-flex items-center justify-center text-[14px] font-semibold text-white disabled:opacity-50"
                  style={{ height: 44, borderRadius: 8, backgroundColor: "#CC2229", ...POPPINS }}
                >
                  {submitting ? "Applying…" : `Apply £${chargeAmount.toFixed(2)} charge`}
                </button>
              )}
              <button
                type="button"
                onClick={() => performCancel(0, true)}
                disabled={submitting}
                className="inline-flex items-center justify-center text-[14px] font-semibold disabled:opacity-50"
                style={{ height: 44, borderRadius: 8, backgroundColor: "#F3F4F6", color: "#6B7280", ...POPPINS }}
              >
                Waive charge
              </button>
              <button
                type="button"
                onClick={() => performCancel(0, false)}
                disabled={submitting}
                className="inline-flex items-center justify-center text-[14px] font-medium disabled:opacity-50"
                style={{ height: 44, borderRadius: 8, backgroundColor: "#FFFFFF", border: "0.5px solid #E2E6ED", color: "#9CA3AF", ...POPPINS }}
              >
                Cancel without charge
              </button>
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="inline-flex items-center justify-center text-[13px] font-medium disabled:opacity-50"
                style={{ height: 40, borderRadius: 8, backgroundColor: "transparent", color: "#0B1F3A", ...POPPINS }}
              >
                Keep lesson
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

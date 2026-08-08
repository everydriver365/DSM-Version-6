import { useEffect, useState } from "react";
import { toast } from "sonner";
import { IconAlertTriangle } from "@tabler/icons-react";
import { supabase } from "@/lib/supabaseClient";
import { CancelSummaryPanel } from "@/components/lessons/CancelSummaryPanel";
import { recordRefund } from "@/lib/payments";
import { describeChargeOption } from "@/lib/cancelCharge";
import { cancelLessonWithUndo, UNDO_WINDOW_MS } from "@/lib/cancelLesson";
import {
  BottomSheet,
  GhostButton,
  PrimaryButton,
  SectionLabel,
  SheetDivider,
  SheetGroup,
  SheetRadio,
  SheetRow,
} from "@/components/dsm/BottomSheetV2";

const NAVY = "#0B1F3A";
const SUBTLE = "#6B7686";
const RED = "#CC2229";

const CANCEL_REASONS = [
  "Pupil cancelled",
  "Pupil no-show",
  "Instructor cancelled",
  "Weather",
  "Vehicle issue",
  "Other",
] as const;

type CancellationTier = { hours: number; charge_percent: number };
type FeeChoice = "charge" | "waive" | "none";

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
  const [feeChoice, setFeeChoice] = useState<FeeChoice | null>(null);
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
      setFeeChoice(null);
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
    const isPupilCancel = reason === "Pupil cancelled" || reason === "Pupil no-show";

    const lessonPatch: Record<string, unknown> = {
      status: "cancelled",
      cancellation_reason: reason,
      cancellation_notes: feeAmount > 0
        ? `Cancellation fee applied: ${chargePercent}% of lesson value${notes ? ` — ${notes}` : ""}`
        : (notes || null),
      cancelled_at: new Date().toISOString(),
      payment_status: feeAmount > 0 ? "unpaid" : "cancelled",
      amount_due: feeAmount > 0 ? feeAmount : 0,
      ...(isPupilCancel ? { cancelled_by: "pupil" } : {}),
    };

    const handle = await cancelLessonWithUndo({
      lessonId,
      patch: lessonPatch,
      financials: async () => {
        // Prepaid lesson cancelled — routed through the payments API so the
        // reversal is audited (lesson_history + payments) instead of silently
        // patching account_balance here.
        if (isPrepaid && amountDue > 0) {
          const { data: pupilRow, error: readErr } = await supabase
            .from("pupils")
            .select("account_balance")
            .eq("id", pupilId)
            .maybeSingle();
          if (readErr) console.error("[cancel] pupil read error", readErr);
          const current = Number((pupilRow as { account_balance: number | null } | null)?.account_balance ?? 0);
          try {
            await recordRefund({
              pupilId,
              amount: amountDue,
              method: "cash",
              notes: "Lesson cancelled — refund to account credit",
              currentAccountBalance: current,
              notify: false,
            });
          } catch (e) {
            console.error("[cancel] recordRefund error", e);
          }
        }

        const { data: userRes } = await supabase.auth.getUser();
        const instructorId = userRes.user?.id ?? null;
        if (!instructorId) return;

        // Audit row capturing the cancellation reason, notes and outcome
        const outcome = waived
          ? "Charge waived"
          : describeChargeOption(feeAmount > 0 ? "fee" : "none", {
              paymentStatus,
              amountDue: lessonValue,
              fee: feeAmount,
            }).outcomeText;

        const { error: histErr } = await supabase.from("lesson_history").insert({
          instructor_id: instructorId,
          pupil_id: pupilId,
          amount_paid: waived ? 0 : feeAmount,
          payment_method: "cancellation",
          payment_status: "cancelled",
          notes: `Cancelled — ${reason}${notes ? ` — ${notes}` : ""} · ${outcome}`,
          created_at: new Date().toISOString(),
        } as never);
        if (histErr) console.error("[cancel] history insert error", histErr);

        const { error: notifErr } = await supabase.from("instructor_notifications").insert({
          instructor_id: instructorId,
          title: isPupilCancel ? "Lesson cancelled by pupil" : feeAmount > 0 ? "Cancellation fee added" : "Lesson cancelled",
          body: isPupilCancel
            ? `${pupilName} — ${reason}`
            : feeAmount > 0
              ? `Cancellation fee of £${feeAmount.toFixed(2)} added for ${pupilName}`
              : `${pupilName}'s lesson on ${when} was cancelled${waived ? " (charge waived)" : ""}`,
          type: isPupilCancel ? "lesson_cancelled_by_pupil" : "lesson",
          read: false,
          reference_type: "lesson",
          reference_id: lessonId,
        });
        if (notifErr) console.error("[cancel] notification error", notifErr);
      },
    });


    if (!handle) {
      toast.error("Couldn't cancel lesson");
      setSubmitting(false);
      return;
    }

    toast.success("Lesson cancelled", {
      duration: UNDO_WINDOW_MS,
      action: {
        label: "Undo",
        onClick: () => {
          void handle
            .undo()
            .then(() => toast.success("Cancellation undone"))
            .catch(() => toast.error("Couldn't undo cancellation"));
        },
      },
    });

    setSubmitting(false);
    onCancelled();
  }

  function handleConfirm() {
    if (feeChoice === "charge") {
      void performCancel(chargeAmount, false);
    } else if (feeChoice === "waive") {
      void performCancel(0, true);
    } else if (feeChoice === "none") {
      void performCancel(0, false);
    }
  }

  if (!open) return null;

  const canConfirm = !!reason && !!feeChoice && !submitting;

  return (
    <BottomSheet
      title="Cancel lesson"
      subtitle={`${pupilName} · ${when}`}
      onClose={onClose}
      footer={
        <>
          <PrimaryButton color={RED} onClick={handleConfirm} disabled={!canConfirm}>
            {submitting ? "Cancelling…" : "Confirm cancellation"}
          </PrimaryButton>
          <GhostButton color={NAVY} bg="#E9EDF3" onClick={onClose}>
            Keep lesson
          </GhostButton>
        </>
      }
    >
      {/* Section 1 — warning */}
      <SheetGroup>
        <div
          className="flex items-start gap-3"
          style={{ padding: "15px 16px", background: "#FFF8E8" }}
        >
          <IconAlertTriangle size={20} color="#B7791F" style={{ flexShrink: 0, marginTop: 1 }} />
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#8A5A00" }}>
              This will cancel the lesson
            </div>
            <div style={{ fontSize: 13, fontWeight: 500, color: "#8A6D3B", marginTop: 2 }}>
              Notice given: {Math.max(0, Math.round(hoursUntilLesson))} hours
              {applicableTier || isNoShow
                ? ` — a cancellation fee may apply based on your policy.`
                : ` — sufficient notice, no charge applies.`}
            </div>
          </div>
        </div>
      </SheetGroup>

      {/* Section 2 — reason */}
      <SectionLabel>REASON</SectionLabel>
      <SheetGroup>
        <SheetRow>
          <div className="flex-1 min-w-0">
            <div style={{ fontSize: 13, fontWeight: 500, color: SUBTLE }}>Cancellation reason *</div>
            <select
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                setFeeChoice(null);
              }}
              className="w-full mt-1 bg-transparent focus:outline-none"
              style={{ fontSize: 16, fontWeight: 600, color: NAVY, fontFamily: "Poppins, sans-serif" }}
            >
              <option value="" disabled>Select a reason</option>
              {CANCEL_REASONS.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
        </SheetRow>
        <SheetDivider />
        <SheetRow>
          <div className="flex-1 min-w-0">
            <div style={{ fontSize: 13, fontWeight: 500, color: SUBTLE }}>Additional notes</div>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Optional"
              className="w-full mt-1 bg-transparent focus:outline-none"
              style={{ fontSize: 15, fontWeight: 500, color: NAVY, resize: "none", fontFamily: "Poppins, sans-serif" }}
            />
          </div>
        </SheetRow>
      </SheetGroup>

      {/* Section 3 — fee options */}
      {reason && (
        <>
          <SectionLabel>CANCELLATION FEE</SectionLabel>
          <SheetGroup>
            {chargeAmount > 0 && (
              <>
                <SheetRow selected={feeChoice === "charge"} onClick={() => setFeeChoice("charge")}>
                  <SheetRadio selected={feeChoice === "charge"} />
                  <div className="flex-1 min-w-0 text-left">
                    <div style={{ fontSize: 16, fontWeight: 600, color: NAVY }}>
                      Apply £{chargeAmount.toFixed(2)} charge
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: SUBTLE }}>
                      {chargePercent}% ·{" "}
                      {isNoShow ? "no-show policy" : `less than ${noticePeriod}h notice`}
                    </div>
                  </div>
                </SheetRow>
                <SheetDivider />
                <SheetRow selected={feeChoice === "waive"} onClick={() => setFeeChoice("waive")}>
                  <SheetRadio selected={feeChoice === "waive"} />
                  <div className="flex-1 min-w-0 text-left">
                    <div style={{ fontSize: 16, fontWeight: 600, color: NAVY }}>Waive charge</div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: SUBTLE }}>
                      Cancel with no fee, this once
                    </div>
                  </div>
                </SheetRow>
                <SheetDivider />
              </>
            )}
            <SheetRow selected={feeChoice === "none"} onClick={() => setFeeChoice("none")}>
              <SheetRadio selected={feeChoice === "none"} />
              <div className="flex-1 min-w-0 text-left">
                <div style={{ fontSize: 16, fontWeight: 600, color: NAVY }}>
                  {chargeAmount > 0 ? "Cancel without charge" : "No charge applies"}
                </div>
                <div style={{ fontSize: 13, fontWeight: 500, color: SUBTLE }}>
                  {chargeAmount > 0 ? "Skip any cancellation fee" : "Sufficient notice given"}
                </div>
              </div>
            </SheetRow>
          </SheetGroup>

          <CancelSummaryPanel
            reason={reason}
            notes={notes}
            chargeOption={chargeAmount > 0 ? "fee" : "none"}
            cancelFee={chargeAmount > 0 ? chargeAmount : undefined}
            amountDue={amountDue}
            paymentStatus={paymentStatus}
          />
        </>
      )}
    </BottomSheet>
  );
}

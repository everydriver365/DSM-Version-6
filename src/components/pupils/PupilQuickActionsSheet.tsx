import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  BottomSheet,
  StatRow,
  SectionLabel,
  PrimaryButton,
  GhostButton,
} from "@/components/dsm/BottomSheetV2";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { supabase } from "@/lib/supabaseClient";
import { recordPayment } from "@/lib/payments";
import {
  MessageSquare,
  CalendarPlus,
  CreditCard,
  FileText,
  User,
  History,
  TrendingUp,
  ClipboardList,
  ChevronRight,
  PoundSterling,
} from "lucide-react";

const navy = "#0B1F3A";
const muted = "#8A93A3";
const font = "Poppins, sans-serif";

export interface PupilQuickActionsPupil {
  id: string;
  name: string;
  /** Current pupils.account_balance (credit) — required for recordPayment reconciliation. */
  accountBalance: number | null;
  /** Prepaid hours remaining (prepaid_hours - hours used). */
  hoursRemaining: number;
  /** Net balance owed (unpaid amount_due − account_balance credit); positive = owed. */
  balanceOwed: number;
  /** Confirmed/completed lesson count. */
  lessons: number;
  /** Current pupils.prepaid_hours (raw), used to keep sheet totals honest post-payment. */
  prepaidHoursRaw: number;
}

export interface PupilQuickActionsSheetProps {
  open: boolean;
  pupil: PupilQuickActionsPupil | null;
  onClose: () => void;
  /** Called when the sheet closes AFTER any successful write, so the list refetches. */
  onDirtyClose?: () => void;
}

type Panel = "none" | "message" | "payment" | "note";

function formatGBP(n: number) {
  return `£${n.toFixed(2)}`;
}

function balanceStat(owed: number, credit: number): string {
  if (owed > 0) return `−${formatGBP(owed)}`;
  if (credit > 0) return `+${formatGBP(credit)}`;
  return "£0.00";
}

export function PupilQuickActionsSheet({
  open,
  pupil,
  onClose,
  onDirtyClose,
}: PupilQuickActionsSheetProps) {
  const navigate = useNavigate();

  // Local, optimistic stats — seeded from the list row, patched by writes.
  const [accountBalance, setAccountBalance] = useState(0);
  const [prepaidHoursRaw, setPrepaidHoursRaw] = useState(0);
  const [hoursRemaining, setHoursRemaining] = useState(0);
  const [balanceOwed, setBalanceOwed] = useState(0);
  const [lessons, setLessons] = useState(0);

  // Dirty flag: if true, invalidate the list on close.
  const [dirty, setDirty] = useState(false);

  // Which inline panel is expanded (mutually exclusive; only one at a time).
  const [panel, setPanel] = useState<Panel>("none");

  // Inline form state.
  const [messageBody, setMessageBody] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);

  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState("cash");
  const [payNotes, setPayNotes] = useState("");
  const [showPayNotes, setShowPayNotes] = useState(false);
  const [savingPayment, setSavingPayment] = useState(false);

  const [noteBody, setNoteBody] = useState("");
  const [savingNote, setSavingNote] = useState(false);

  const [confirmInactive, setConfirmInactive] = useState(false);

  // Re-seed local state whenever a new pupil opens.
  useEffect(() => {
    if (!open || !pupil) return;
    setAccountBalance(Number(pupil.accountBalance ?? 0));
    setPrepaidHoursRaw(Number(pupil.prepaidHoursRaw ?? 0));
    setHoursRemaining(Number(pupil.hoursRemaining ?? 0));
    setBalanceOwed(Number(pupil.balanceOwed ?? 0));
    setLessons(Number(pupil.lessons ?? 0));
    setDirty(false);
    setPanel("none");
    setMessageBody("");
    setPayAmount("");
    setPayMethod("cash");
    setPayNotes("");
    setShowPayNotes(false);
    setNoteBody("");
    setConfirmInactive(false);
  }, [open, pupil]);

  function handleClose() {
    const wasDirty = dirty;
    onClose();
    if (wasDirty && onDirtyClose) onDirtyClose();
  }

  async function submitMessage() {
    if (!pupil) return;
    const body = messageBody.trim();
    if (!body) {
      toast.error("Enter a message");
      return;
    }
    setSendingMessage(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      const uid = u?.user?.id;
      if (!uid) throw new Error("No user");
      const { error } = await supabase.from("chat_messages").insert({
        instructor_id: uid,
        pupil_id: pupil.id,
        sender_type: "instructor",
        sender_id: uid,
        body,
      });
      if (error) throw error;
      toast.success("Message sent");
      setMessageBody("");
      setPanel("none");
      setDirty(true);
    } catch (e) {
      console.error("[quick-actions] message failed", e);
      toast.error("Couldn't send message");
    } finally {
      setSendingMessage(false);
    }
  }

  async function submitPayment() {
    if (!pupil) return;
    const amt = Number(payAmount);
    if (!amt || amt <= 0) {
      toast.error("Enter an amount");
      return;
    }
    setSavingPayment(true);
    try {
      const result = await recordPayment({
        pupilId: pupil.id,
        amount: amt,
        method: payMethod,
        notes: payNotes.trim() || null,
        currentAccountBalance: accountBalance,
      });
      // Optimistic patch from authoritative return values.
      setAccountBalance(result.newAccountBalance);
      setPrepaidHoursRaw(result.newPrepaidHours);
      setBalanceOwed(Math.max(0, balanceOwed + result.balanceOwedDelta));
      toast.success("Payment recorded");
      setPayAmount("");
      setPayNotes("");
      setShowPayNotes(false);
      setPayMethod("cash");
      setPanel("none");
      setDirty(true);
    } catch (e) {
      console.error("[quick-actions] payment failed", e);
      toast.error("Couldn't record payment");
    } finally {
      setSavingPayment(false);
    }
  }

  async function submitNote() {
    if (!pupil) return;
    const text = noteBody.trim();
    if (!text) {
      toast.error("Enter a note");
      return;
    }
    setSavingNote(true);
    try {
      // Notes live on pupils.notes as a single text field (matches full profile).
      // Append with a timestamp header so history is preserved.
      const { data: cur } = await supabase
        .from("pupils")
        .select("notes")
        .eq("id", pupil.id)
        .maybeSingle();
      const existing = ((cur as { notes?: string | null } | null)?.notes ?? "").trim();
      const stamp = new Date().toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
      const entry = `[${stamp}] ${text}`;
      const next = existing ? `${entry}\n\n${existing}` : entry;
      const { error } = await supabase
        .from("pupils")
        .update({ notes: next })
        .eq("id", pupil.id);
      if (error) throw error;
      toast.success("Note saved");
      setNoteBody("");
      setPanel("none");
      setDirty(true);
    } catch (e) {
      console.error("[quick-actions] note failed", e);
      toast.error("Couldn't save note");
    } finally {
      setSavingNote(false);
    }
  }

  async function doMarkInactive() {
    if (!pupil) return;
    setConfirmInactive(false);
    try {
      const { error } = await supabase
        .from("pupils")
        .update({
          status: "inactive",
          deleted_at: new Date().toISOString(),
        })
        .eq("id", pupil.id);
      if (error) throw error;
      toast.success(`${pupil.name} marked inactive`);
      // Mark inactive → close sheet immediately (rest of sheet no longer applies).
      setDirty(true);
      // Manually fire dirty-close since handleClose reads state; simpler: just call both.
      onClose();
      if (onDirtyClose) onDirtyClose();
    } catch (e) {
      console.error("[quick-actions] mark inactive failed", e);
      toast.error("Couldn't mark inactive");
    }
  }

  const stats = useMemo(
    () => [
      { label: "Hours left", value: `${Math.max(0, hoursRemaining).toFixed(1)}h` },
      { label: "Balance", value: balanceStat(balanceOwed, accountBalance) },
      { label: "Lessons", value: String(lessons) },
    ],
    [hoursRemaining, balanceOwed, accountBalance, lessons],
  );

  if (!open || !pupil) return null;

  return (
    <div
      className="fixed inset-0 z-[100]"
      style={{ fontFamily: font }}
      role="dialog"
      aria-modal="true"
    >
      <BottomSheet
        title={pupil.name}
        subtitle="Quick actions"
        onClose={handleClose}
      >
        <StatRow stats={stats} />

        <SectionLabel>ACTIONS</SectionLabel>
        <div
          className="bg-white rounded-2xl overflow-hidden mb-4"
          style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}
        >
          <ActionRow
            icon={<MessageSquare size={18} color="#1877D6" />}
            label="Send message"
            expanded={panel === "message"}
            onClick={() => setPanel(panel === "message" ? "none" : "message")}
          />
          {panel === "message" && (
            <InlinePanel>
              <textarea
                value={messageBody}
                onChange={(e) => setMessageBody(e.target.value)}
                placeholder={`Message ${pupil.name.split(" ")[0]}...`}
                rows={3}
                className="w-full px-3 py-2 rounded-lg text-[14px] resize-none focus:outline-none"
                style={{
                  fontFamily: font,
                  color: navy,
                  border: "1px solid #E3E7ED",
                  backgroundColor: "#FFFFFF",
                }}
              />
              <PrimaryButton
                disabled={sendingMessage || !messageBody.trim()}
                onClick={submitMessage}
              >
                {sendingMessage ? "Sending..." : "Send message"}
              </PrimaryButton>
            </InlinePanel>
          )}
          <Divider />
          <ActionRow
            icon={<CalendarPlus size={18} color="#1877D6" />}
            label="Book a lesson"
            onClick={() => {
              onClose();
              navigate({
                to: "/lessons/new",
                search: { date: "", pupilId: pupil.id },
              });
            }}
          />
          <Divider />
          <ActionRow
            icon={<CreditCard size={18} color="#1877D6" />}
            label="Log payment"
            expanded={panel === "payment"}
            onClick={() => setPanel(panel === "payment" ? "none" : "payment")}
          />
          {panel === "payment" && (
            <InlinePanel>
              <div className="flex gap-2">
                <div
                  className="flex items-center rounded-lg px-3 flex-1"
                  style={{
                    border: "1px solid #E3E7ED",
                    backgroundColor: "#FFFFFF",
                  }}
                >
                  <PoundSterling size={16} color={muted} />
                  <input
                    type="number"
                    inputMode="decimal"
                    value={payAmount}
                    onChange={(e) => setPayAmount(e.target.value)}
                    placeholder="Amount"
                    className="w-full py-2 px-2 text-[15px] focus:outline-none bg-transparent"
                    style={{ fontFamily: font, color: navy }}
                  />
                </div>
                <select
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value)}
                  className="rounded-lg px-3 py-2 text-[14px] focus:outline-none"
                  style={{
                    fontFamily: font,
                    color: navy,
                    border: "1px solid #E3E7ED",
                    backgroundColor: "#FFFFFF",
                  }}
                >
                  <option value="cash">Cash</option>
                  <option value="bank_transfer">Bank</option>
                  <option value="card">Card</option>
                  <option value="other">Other</option>
                </select>
              </div>
              {showPayNotes ? (
                <textarea
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  placeholder="Notes (optional)"
                  rows={2}
                  className="w-full px-3 py-2 rounded-lg text-[14px] resize-none focus:outline-none"
                  style={{
                    fontFamily: font,
                    color: navy,
                    border: "1px solid #E3E7ED",
                    backgroundColor: "#FFFFFF",
                  }}
                />
              ) : (
                <button
                  type="button"
                  onClick={() => setShowPayNotes(true)}
                  className="text-[12px] font-medium self-start"
                  style={{ color: "#1877D6", fontFamily: font }}
                >
                  + Add notes
                </button>
              )}
              <PrimaryButton
                disabled={savingPayment || !payAmount || Number(payAmount) <= 0}
                onClick={submitPayment}
              >
                {savingPayment
                  ? "Recording..."
                  : !payAmount || Number(payAmount) <= 0
                  ? "Enter amount"
                  : `Record ${formatGBP(Number(payAmount))}`}
              </PrimaryButton>
            </InlinePanel>
          )}
          <Divider />
          <ActionRow
            icon={<FileText size={18} color="#1877D6" />}
            label="Add note"
            expanded={panel === "note"}
            onClick={() => setPanel(panel === "note" ? "none" : "note")}
          />
          {panel === "note" && (
            <InlinePanel>
              <textarea
                value={noteBody}
                onChange={(e) => setNoteBody(e.target.value)}
                placeholder="What should you remember?"
                rows={3}
                className="w-full px-3 py-2 rounded-lg text-[14px] resize-none focus:outline-none"
                style={{
                  fontFamily: font,
                  color: navy,
                  border: "1px solid #E3E7ED",
                  backgroundColor: "#FFFFFF",
                }}
              />
              <PrimaryButton
                disabled={savingNote || !noteBody.trim()}
                onClick={submitNote}
              >
                {savingNote ? "Saving..." : "Save note"}
              </PrimaryButton>
            </InlinePanel>
          )}
        </div>

        <SectionLabel>OPEN</SectionLabel>
        <div
          className="bg-white rounded-2xl overflow-hidden mb-4"
          style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}
        >
          <NavRow
            icon={<User size={18} color={muted} />}
            label="Full profile"
            onClick={() => {
              onClose();
              navigate({ to: "/pupils/$id", params: { id: pupil.id } });
            }}
          />
          <Divider />
          <NavRow
            icon={<History size={18} color={muted} />}
            label="History"
            onClick={() => {
              onClose();
              navigate({ to: "/pupils/history/$id", params: { id: pupil.id } });
            }}
          />
          <Divider />
          <NavRow
            icon={<CreditCard size={18} color={muted} />}
            label="Payments"
            onClick={() => {
              onClose();
              navigate({ to: "/pupils/payments/$id", params: { id: pupil.id } });
            }}
          />
          <Divider />
          <NavRow
            icon={<TrendingUp size={18} color={muted} />}
            label="Progress"
            onClick={() => {
              onClose();
              navigate({ to: "/pupils/progress/$id", params: { id: pupil.id } });
            }}
          />
          <Divider />
          <NavRow
            icon={<ClipboardList size={18} color={muted} />}
            label="Syllabus"
            onClick={() => {
              onClose();
              navigate({ to: "/pupils/syllabus/$id", params: { id: pupil.id } });
            }}
          />
        </div>

        <GhostButton onClick={() => setConfirmInactive(true)}>
          Mark inactive
        </GhostButton>
      </BottomSheet>

      <ConfirmDialog
        open={confirmInactive}
        title="Mark inactive?"
        message={`${pupil.name} will move to Archived. You can restore them later from the archived list.`}
        confirmLabel="Mark inactive"
        cancelLabel="Keep active"
        destructive
        onConfirm={doMarkInactive}
        onCancel={() => setConfirmInactive(false)}
      />
    </>
  );
}

// ---------------------------------------------------------------------------
// Row primitives — local, keep the sheet self-contained.
// ---------------------------------------------------------------------------

function ActionRow({
  icon,
  label,
  onClick,
  expanded,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  expanded?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-3.5 active:bg-black/[0.03]"
      style={{ fontFamily: font }}
    >
      <div className="shrink-0">{icon}</div>
      <div
        className="flex-1 text-left text-[15px] font-medium"
        style={{ color: navy }}
      >
        {label}
      </div>
      <ChevronRight
        size={16}
        color={muted}
        style={{
          transform: expanded ? "rotate(90deg)" : "none",
          transition: "transform 120ms",
        }}
      />
    </button>
  );
}

function NavRow({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-3.5 active:bg-black/[0.03]"
      style={{ fontFamily: font }}
    >
      <div className="shrink-0">{icon}</div>
      <div
        className="flex-1 text-left text-[15px]"
        style={{ color: navy }}
      >
        {label}
      </div>
      <ChevronRight size={16} color={muted} />
    </button>
  );
}

function Divider() {
  return <div style={{ height: 1, backgroundColor: "#EEF0F3" }} />;
}

function InlinePanel({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="px-4 pb-4 pt-1 flex flex-col gap-2"
      style={{ backgroundColor: "#F8FAFC" }}
    >
      {children}
    </div>
  );
}

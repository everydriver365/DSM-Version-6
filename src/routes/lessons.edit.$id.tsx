import { testStartTime, testTimeFromNotes, testTimeFromStart, withTestTimeNote, TEST_TOTAL_MINUTES } from "@/lib/testDay";
import { tokens } from "@/lib/tokens";
import { PageLoader } from "@/components/dsm/LoadingSpinner";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { IconCheck, IconCurrencyPound, IconMapPin } from "@tabler/icons-react";
import DSMTopSheet from "@/components/dsm/DSMTopSheet";
import { toast } from "sonner";
import { Input } from "../components/dsm/Input";
import { supabase } from "../lib/supabaseClient";
import { AddressLookup } from "@/components/dsm/AddressLookup";
import { recordPayment } from "@/lib/payments";
import { cancelLessonWithUndo, UNDO_WINDOW_MS } from "@/lib/cancelLesson";
import { CancelSummaryPanel } from "@/components/lessons/CancelSummaryPanel";
import {
  availableChargeOptions,
  clampFee,
  coerceChargeOption,
  describeChargeOption,
  feeCap,
  normalizePayState,
} from "@/lib/cancelCharge";
import { pushLessonToGoogle } from "@/lib/calendarSyncPrefs";


export const Route = createFileRoute("/lessons/edit/$id")({
  head: () => ({
    meta: [{ title: "Edit lesson — DSM by EveryDriver" }],
  }),
  component: EditLessonPage,
});

const POPPINS = { fontFamily: "Poppins, sans-serif" } as const;

interface Pupil {
  id: string;
  name: string;
}

const DURATION_OPTIONS: { label: string; value: number }[] = [
  { label: "30 min", value: 30 },
  { label: "1 hr", value: 60 },
  { label: "1.5 hrs", value: 90 },
  { label: "2 hrs", value: 120 },
  { label: "2.5 hrs", value: 150 },
  { label: "Test 🚗", value: -1 },
];


const STATUSES = [
  { label: "Confirmed", value: "confirmed" },
  { label: "Pending", value: "pending" },
  { label: "Completed", value: "completed" },
  { label: "Cancelled", value: "cancelled" },
];

const fieldBorder: React.CSSProperties = {
  fontFamily: "Poppins, sans-serif",
  borderWidth: "0.5px",
  borderStyle: "solid",
  borderColor: tokens.canvas,
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
      style={{ backgroundColor: s.bg, color: s.fg, fontFamily: "Poppins, sans-serif" }}
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
  const [duration, setDuration] = useState<number>(60);
  const [isTestDay, setIsTestDay] = useState(false);
  const [testCentre, setTestCentre] = useState('');
  const testCentreInputRef = useRef<HTMLInputElement>(null);
  const [testCentreError, setTestCentreError] = useState<string | null>(null);
  const [testCentreSearch, setTestCentreSearch] = useState("");
  const [testCentreResults, setTestCentreResults] = useState<any[]>([]);
  const [searchingCentres, setSearchingCentres] = useState(false);
  const [testTime, setTestTime] = useState("");
  const [status, setStatus] = useState("confirmed");
  const [isEvent, setIsEvent] = useState(false);
  const [eventTitle, setEventTitle] = useState("");
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
          .select("pupil_id, event_title, lesson_type, lesson_date, lesson_time, duration_minutes, status, notes, pickup_location, payment_status, amount_due")
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
          pupil_id: string | null;
          event_title: string | null;
          lesson_type: string | null;
          lesson_date: string;
          lesson_time: string;
          duration_minutes: number | null;
          status: string;
          notes: string | null;
          pickup_location: string | null;
          payment_status: string | null;
          amount_due: number | null;
        };
        const isEventLesson = l.lesson_type === 'event';
        setIsEvent(isEventLesson);
        setEventTitle(l.event_title ?? "");
        setPupilId(l.pupil_id ?? "");
        setDate(l.lesson_date);
        setTime((l.lesson_time ?? "").slice(0, 5));
        const isTest = l.lesson_type === 'test';
        setIsTestDay(isTest);
        if (isTest) {
          setDuration(-1);
          setTestCentre(l.pickup_location ?? '');
          setTestCentreSearch(l.pickup_location ?? '');
          setTestTime(
            testTimeFromNotes(l.notes) ??
              (l.lesson_time ? testTimeFromStart(l.lesson_time.slice(0, 5)) ?? '' : ''),
          );
        } else {
          setDuration(l.duration_minutes ?? 60);
          setTestCentre('');
          setTestCentreSearch('');
          setTestTime('');
        }
        setStatus(l.status ?? "confirmed");
        setPickupLocation(l.pickup_location ?? "");
        setPickupAddress(isTest ? '' : (l.pickup_location ?? ""));
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

  async function searchTestCentres(query: string) {
    if (query.trim().length < 2) {
      setTestCentreResults([]);
      return;
    }
    setSearchingCentres(true);
    const { data } = await supabase
      .from("test_centres")
      .select("*")
      .ilike("name", `%${query}%`)
      .limit(8);
    setTestCentreResults(data ?? []);
    setSearchingCentres(false);
  }

  async function handleSave() {
    if (saving || showCancelConfirm) return;
    setSaving(true);
    setTestCentreError(null);

    if (isTestDay && !testCentre.trim()) {
      setTestCentreError("Enter a test centre or location for a test day");
      testCentreInputRef.current?.focus();
      setSaving(false);
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    setError(null);
    const { error: updErr } = await supabase
      .from("lessons")
      .update({
        ...(isEvent
          ? {
              pupil_id: null,
              event_title: eventTitle.trim() || null,
              lesson_type: 'event' as const,
              amount_due: 0,
              payment_status: 'paid' as const,
              duration_minutes: duration,
            }
          : {
              pupil_id: pupilId,
              event_title: null,
              lesson_type: isTestDay ? ('test' as const) : ('lesson' as const),
              duration_minutes: isTestDay ? TEST_TOTAL_MINUTES : duration,
            }),
        lesson_date: date,
        lesson_time: `${
          isTestDay && testTime ? testStartTime(testTime) ?? testTime : time
        }:00`,
        status,
        pickup_location: isTestDay ? testCentre.trim() || null : pickupLocation.trim() || null,
        notes:
          isTestDay && testTime
            ? withTestTimeNote(notes.trim() || null, testTime)
            : notes.trim() || null,
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
      pushLessonToGoogle({
          lesson_id: id,
          instructor_id: user?.id ?? "",
          action: "update",
        }
      );
    }
    toast.success("Lesson updated");
    navigate({ to: "/home" });
  }

  return (
    <DSMTopSheet title="Edit Lesson" onBack={() => navigate({ to: "/lessons/$id", params: { id } } as never)}>
      {/* Action bar */}
      <div className="flex items-start justify-between px-4 py-2">
        {isTestDay ? (
          <div className="flex flex-col gap-1">
            <span
              className="inline-flex items-center gap-1.5 px-3 h-7 rounded-full text-[12px] font-semibold"
              style={{
                background: "linear-gradient(135deg, #CC2229 0%, #A51C22 100%)",
                color: "#fff",
                fontFamily: "Poppins, sans-serif",
              }}
            >
              <span aria-hidden="true">🚗</span>
              TEST DAY
            </span>
            <span
              className="text-[12px] font-medium pl-1"
              style={{
                color: testCentre.trim() ? "#0B1F3A" : "#9CA3AF",
                fontFamily: "Poppins, sans-serif",
              }}
            >
              {testCentre.trim() || "Test centre not set"}
            </span>
          </div>
        ) : (
          <span />
        )}
        <button
          type="button"
          aria-label="Save"
          onClick={handleSave}
          disabled={saving || loading || showCancelConfirm}
          className="text-[13px] font-semibold"
          style={{ color: tokens.blue, background: "none", border: "none", opacity: saving || loading || showCancelConfirm ? 0.5 : 1 }}
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </div>

      {loading ? (
        <PageLoader />
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSave();
          }}
          className="flex flex-col gap-4 px-4 pt-4"
        >
          {/* Lesson / Event toggle */}
          <div
            style={{
              display: "flex",
              gap: 0,
              background: "#E5E5EA",
              borderRadius: 8,
              padding: 4,
              margin: "0 16px 16px",
            }}
          >
            <button
              type="button"
              onClick={() => {
                setIsEvent(false);
                if (duration === -1) setIsTestDay(true);
              }}
              style={{
                flex: 1,
                padding: "8px 0",
                borderRadius: 8,
                border: "none",
                cursor: "pointer",
                fontFamily: "Poppins, sans-serif",
                fontSize: tokens.fontSize.base,
                fontWeight: tokens.fontWeight.semibold,
                background: !isEvent ? "#fff" : "transparent",
                color: !isEvent ? "#0B1F3A" : "#6B6B6F",
                boxShadow: !isEvent ? "0 2px 6px rgba(0,0,0,0.08)" : "none",
              }}
            >
              Lesson
            </button>
            <button
              type="button"
              onClick={() => {
                setIsEvent(true);
                setIsTestDay(false);
                if (duration === -1) setDuration(60);
              }}
              style={{
                flex: 1,
                padding: "8px 0",
                borderRadius: 8,
                border: "none",
                cursor: "pointer",
                fontFamily: "Poppins, sans-serif",
                fontSize: tokens.fontSize.base,
                fontWeight: tokens.fontWeight.semibold,
                background: isEvent ? "#fff" : "transparent",
                color: isEvent ? "#0B1F3A" : "#6B6B6F",
                boxShadow: isEvent ? "0 2px 6px rgba(0,0,0,0.08)" : "none",
              }}
            >
              Event
            </button>
          </div>

          {!isEvent ? (
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
          ) : (
            <div>
              <div
                style={{
                  fontSize: tokens.fontSize.sm,
                  fontWeight: tokens.fontWeight.semibold,
                  color: tokens.textMuted,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  marginBottom: 6,
                  fontFamily: "Poppins, sans-serif",
                }}
              >
                EVENT TITLE
              </div>
              <input
                value={eventTitle}
                onChange={(e) => setEventTitle(e.target.value)}
                placeholder="e.g. Team meeting, CPD training, Admin day"
                style={{
                  width: "100%",
                  background: "#fff",
                  border: "1px solid #E4E8EF",
                  borderRadius: 8,
                  padding: "10px 12px",
                  fontSize: tokens.fontSize.md,
                  fontFamily: "Poppins, sans-serif",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>
          )}


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
            <div style={{
              display: 'flex',
              gap: 8,
              flexWrap: 'wrap',
              marginBottom: 12,
            }}>
              {DURATION_OPTIONS.map((opt) => {
                if (isEvent && opt.value === -1) return null;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      setDuration(opt.value);
                      setIsTestDay(opt.value === -1);
                      setIsEvent(false);
                      if (opt.value !== -1) {
                        setTestCentre('');
                      }
                    }}
                    style={{
                      height: 34,
                      borderRadius: 8,
                      padding: '0 16px',
                      fontSize: tokens.fontSize.base,
                      fontWeight: tokens.fontWeight.semibold,
                      cursor: 'pointer',
                      border: duration === opt.value
                        ? 'none'
                        : '1px solid #E4E8EF',
                      background: duration === opt.value
                        ? opt.value === -1
                          ? '#CC2229'
                          : '#0B1F3A'
                        : '#fff',
                      color: duration === opt.value
                        ? '#fff' : '#6B7686',
                      fontFamily: 'Poppins, sans-serif',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {opt.label}
                  </button>
                );
              })}

            </div>
            {isTestDay && (
              <div style={{ marginBottom: 16 }}>
                <div style={{
                  fontSize: tokens.fontSize.sm,
                  fontWeight: tokens.fontWeight.semibold,
                  color: '#9CA3AF',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  marginBottom: 6,
                  fontFamily: 'Poppins, sans-serif',
                }}>
                  TEST CENTRE
                </div>
                <div style={{ position: 'relative' }}>
                  <IconMapPin size={16} color="#9CA3AF" stroke={2} style={{ position: 'absolute', left: 12, top: 12 }} />
                  <input
                    ref={testCentreInputRef}
                    value={testCentreSearch}
                    onChange={e => {
                      setTestCentreSearch(e.target.value);
                      setTestCentre(e.target.value);
                      setTestCentreError(null);
                      void searchTestCentres(e.target.value);
                    }}
                    placeholder="Search test centres..."
                    style={{
                      width: '100%',
                      background: '#fff',
                      border: '1px solid #E4E8EF',
                      borderRadius: 8,
                      padding: '10px 12px 10px 34px',
                      fontSize: tokens.fontSize.md,
                      fontFamily: 'Poppins, sans-serif',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
                {testCentreResults.length > 0 && (
                  <div style={{
                    background: '#fff',
                    borderRadius: 8,
                    border: '1px solid #E4E8EF',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                    maxHeight: 200,
                    overflowY: 'auto',
                    marginTop: 4,
                  }}>
                    {testCentreResults.map((r: any) => (
                      <div
                        key={r.id ?? r.name}
                        role="button"
                        tabIndex={0}
                        onClick={() => {
                          const addr = [r.address, r.town, r.postcode].filter(Boolean).join(', ');
                          setTestCentre(addr ? `${r.name}, ${addr}` : r.name);
                          setTestCentreSearch(r.name);
                          setTestCentreResults([]);
                          setTestCentreError(null);
                        }}
                        style={{
                          padding: '11px 14px',
                          borderBottom: '1px solid #E4E8EF',
                          cursor: 'pointer',
                          fontFamily: 'Poppins, sans-serif',
                        }}
                      >
                        <div style={{ fontSize: tokens.fontSize.base, fontWeight: tokens.fontWeight.semibold, color: '#0B1F3A' }}>{r.name}</div>
                        <div style={{ fontSize: tokens.fontSize.sm, color: '#6B7686', marginTop: 2 }}>
                          {[r.address, r.town, r.postcode].filter(Boolean).join(', ')}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {testCentreSearch.trim().length >= 2 && testCentreResults.length === 0 && !searchingCentres && (
                  <p style={{ fontSize: tokens.fontSize.sm, color: '#9CA3AF', marginTop: 6, fontFamily: 'Poppins, sans-serif' }}>
                    No centres found — type the address manually
                  </p>
                )}
                {testCentre.trim() && (
                  <div style={{
                    background: '#DCFCE7',
                    color: '#15803D',
                    fontSize: tokens.fontSize.sm,
                    fontWeight: tokens.fontWeight.bold,
                    borderRadius: 8,
                    padding: '4px 12px',
                    display: 'flex',
                    gap: 6,
                    alignItems: 'center',
                    marginTop: 6,
                    width: 'fit-content',
                    maxWidth: '100%',
                    fontFamily: 'Poppins, sans-serif',
                  }}>
                    <IconCheck size={12} color="#15803D" stroke={2} />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{testCentre}</span>
                    <button
                      type="button"
                      aria-label="Clear test centre"
                      onClick={() => { setTestCentre(''); setTestCentreSearch(''); setTestCentreResults([]); }}
                      style={{ background: 'none', border: 'none', color: '#15803D', cursor: 'pointer', fontSize: tokens.fontSize.base, lineHeight: 1, padding: 0 }}
                    >
                      ×
                    </button>
                  </div>
                )}
                <div style={{
                  fontSize: tokens.fontSize.sm,
                  fontWeight: tokens.fontWeight.semibold,
                  color: '#9CA3AF',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  marginTop: 12,
                  marginBottom: 6,
                  fontFamily: 'Poppins, sans-serif',
                }}>
                  TEST APPOINTMENT TIME
                </div>
                <input
                  type="time"
                  value={testTime}
                  onChange={e => setTestTime(e.target.value)}
                  style={{
                    width: '100%',
                    background: '#fff',
                    border: '1px solid #E4E8EF',
                    borderRadius: 8,
                    padding: '10px 12px',
                    fontSize: tokens.fontSize.md,
                    fontFamily: 'Poppins, sans-serif',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
                <p style={{ fontSize: tokens.fontSize.xs, color: '#9CA3AF', marginTop: 4, fontFamily: 'Poppins, sans-serif' }}>
                  Standard test: 38-40 mins. Extended test: 70 mins.
                </p>
                {testCentreError && (
                  <p style={{
                    fontSize: 12,
                    color: '#CC2229',
                    marginTop: 6,
                    fontFamily: 'Poppins, sans-serif',
                  }}>
                    {testCentreError}
                  </p>
                )}
              </div>
            )}
          </div>


          <div>
            <FieldLabel htmlFor="status">Status</FieldLabel>
            <select
              id="status"
              value={status}
              onChange={(e) => {
                const val = e.target.value;
                if (val === "cancelled" && !isEvent) {
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
                fontSize: tokens.fontSize.xs,
                fontWeight: tokens.fontWeight.semibold,
                color: tokens.textMuted,
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
                fontSize: tokens.fontSize.base,
                fontWeight: tokens.fontWeight.semibold,
                color: tokens.navy,
              };
              const chargeSub: React.CSSProperties = {
                fontFamily: "Poppins, sans-serif",
                fontSize: tokens.fontSize.sm,
                color: tokens.textSecondary,
                marginTop: 2,
              };
              const resetCancel = () => {
                setCancelReason("");
                setCancelNote("");
                setChargeOption("none");
                setCancelFee("");
              };
              const payState = normalizePayState(paymentStatus);
              const chargeOptions = availableChargeOptions(paymentStatus);
              const cancelFeeCap = feeCap(amountDue);
              const chargeCtx = { paymentStatus, amountDue, fee: cancelFee };
              const noneDesc = describeChargeOption("none", chargeCtx);
              const feeDesc = describeChargeOption("fee", chargeCtx);
              const activeOption = coerceChargeOption(chargeOption, paymentStatus);
              const activeDesc = describeChargeOption(activeOption, chargeCtx);

              return (
              <div
                className="mt-2"
                style={{
                  background: "#fff",
                  border: "1px solid #FECACA",
                  borderRadius: 8,
                  padding: 14,
                }}
              >
                <div
                  style={{
                    fontSize: tokens.fontSize.base,
                    fontWeight: tokens.fontWeight.semibold,
                    color: tokens.red,
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
                          borderRadius: 999,
                          padding: "4px 10px",
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
                    fontSize: tokens.fontSize.base,
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
                    style={chargeRow(activeOption === "none", "#E6F1FB", "#1877D6")}
                  >
                    <div style={chargeTitle}>No charge</div>
                    <div style={chargeSub}>{noneDesc.subtitle}</div>
                  </button>

                  {chargeOptions.includes("fee") && (
                    <div>
                      <button
                        type="button"
                        onClick={() => setChargeOption("fee")}
                        style={chargeRow(activeOption === "fee", "#FEF3C7", "#B45309")}
                      >
                        <div style={chargeTitle}>Charge cancellation fee</div>
                        <div style={chargeSub}>{feeDesc.subtitle}</div>
                      </button>
                      {activeOption === "fee" && (
                        <>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8 }}>
                            <span style={{ fontFamily: "Poppins, sans-serif", fontSize: tokens.fontSize.base, color: tokens.textSecondary }}>£</span>
                            <input
                              type="number"
                              inputMode="decimal"
                              min={0}
                              max={cancelFeeCap ?? undefined}
                              value={cancelFee}
                              onChange={(e) => {
                                const raw = e.target.value;
                                if (raw === "") return setCancelFee("");
                                const clamped = clampFee(raw, amountDue);
                                setCancelFee(
                                  cancelFeeCap != null && Number(raw) > cancelFeeCap ? String(clamped) : raw,
                                );
                              }}
                              placeholder="e.g. 20.00"
                              style={{
                                flex: 1,
                                border: "1px solid #E4E8EF",
                                borderRadius: 8,
                                padding: "10px 12px",
                                fontFamily: "Poppins, sans-serif",
                                fontSize: tokens.fontSize.base,
                                boxSizing: "border-box",
                              }}
                            />
                          </div>
                          {(feeDesc.error || cancelFeeCap != null) && (
                            <div
                              style={{
                                fontFamily: "Poppins, sans-serif",
                                fontSize: tokens.fontSize.sm,
                                marginTop: 6,
                                color: feeDesc.error ? "#CC2229" : "#6B7686",
                              }}
                            >
                              {feeDesc.error ?? `Maximum £${cancelFeeCap!.toFixed(2)} (lesson value)`}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}

                  {chargeOptions.includes("full") && (
                    <button
                      type="button"
                      onClick={() => setChargeOption("full")}
                      style={chargeRow(activeOption === "full", "#FCE9E9", "#CC2229")}
                    >
                      <div style={chargeTitle}>Charge full lesson</div>
                      <div style={chargeSub}>No refund — full payment retained</div>
                    </button>
                  )}
                </div>

                {/* Summary */}
                {cancelReason && (
                  <CancelSummaryPanel
                    reason={cancelReason}
                    notes={cancelNote}
                    chargeOption={activeOption}
                    cancelFee={cancelFee}
                    amountDue={amountDue}
                    paymentStatus={paymentStatus}
                  />
                )}


                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 14 }}>
                  <button
                    type="button"
                    disabled={saving || !cancelReason || !activeDesc.valid}
                    onClick={async () => {
                      setSaving(true);
                      const { data: userRes } = await supabase.auth.getUser();
                      const feeAmt = clampFee(cancelFee, amountDue);
                      const outcome = activeDesc.outcomeText;

                      const patch: Record<string, unknown> = {
                        status: "cancelled",
                        payment_status: "cancelled",
                        cancellation_reason: cancelReason,
                        cancellation_notes: cancelNote || null,
                        cancelled_at: new Date().toISOString(),
                      };
                      if (payState === "unpaid") {
                        patch.amount_due = activeOption === "fee" ? feeAmt : 0;
                      }

                      const handle = await cancelLessonWithUndo({
                        lessonId: id,
                        patch,
                        financials: async () => {
                          const { recordRefund } = await import("@/lib/payments");
                          if (
                            activeOption === "none" &&
                            (payState === "paid" || payState === "partial")
                          ) {
                            await recordRefund({
                              pupilId,
                              amount: Number(amountDue ?? 0),
                              method: "cash",
                              notes: `Cancellation refund — ${cancelReason}`,
                              currentAccountBalance: 0,
                            });
                          } else if (
                            activeOption === "fee" &&
                            (payState === "paid" || payState === "partial")
                          ) {
                            const refund = Number(amountDue ?? 0) - feeAmt;
                            if (refund > 0) {
                              await recordRefund({
                                pupilId,
                                amount: refund,
                                method: "cash",
                                notes: `Partial refund — cancellation fee £${feeAmt.toFixed(2)} retained`,
                                currentAccountBalance: 0,
                              });
                            }
                          } else if (activeOption === "full") {
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

                          // Audit row capturing the cancellation reason, notes and outcome
                          await supabase.from("lesson_history").insert({
                            instructor_id: userRes.user?.id ?? "",
                            pupil_id: pupilId,
                            amount_paid:
                              activeOption === "full"
                                ? Number(amountDue ?? 0)
                                : activeOption === "fee" ? feeAmt : 0,
                            payment_method: "cancellation",
                            payment_status: "cancelled",
                            notes: `Cancelled — ${cancelReason}${cancelNote ? ` — ${cancelNote}` : ""} · ${outcome}`,
                            created_at: new Date().toISOString(),
                          } as never);

                          if (activeOption === "none" && payState === "prepaid") {
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
                        },
                      });


                      if (!handle) {
                        toast.error("Could not cancel lesson");
                        setSaving(false);
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
                      navigate({ to: "/home" });
                    }}

                    style={{
                      background: tokens.red,
                      color: "#fff",
                      borderRadius: 8,
                      padding: 12,
                      width: "100%",
                      fontSize: tokens.fontSize.md,
                      fontWeight: tokens.fontWeight.semibold,
                      fontFamily: "Poppins, sans-serif",
                      border: "none",
                      opacity: saving || !cancelReason || !activeDesc.valid ? 0.5 : 1,
                    }}
                  >
                    {saving ? "Cancelling…" : activeDesc.confirmLabel}

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
                      fontSize: tokens.fontSize.md,
                      fontWeight: tokens.fontWeight.medium,
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
            <FieldLabel htmlFor="pickupLocation">{isEvent ? "Location (optional)" : "Pickup location"}</FieldLabel>
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
          {!isEvent && (
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
                  style={{ color: tokens.blue }}
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
                      style={{ border: "1px solid #E3E7ED", backgroundColor: tokens.white }}
                    >
                      <IconCurrencyPound stroke={1.5} size={16} color="#8A93A3" />
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
                      style={{ border: "1px solid #E3E7ED", backgroundColor: tokens.white }}
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
                    style={{ border: "1px solid #E3E7ED", backgroundColor: tokens.white }}
                  />
                  <button
                    type="button"
                    disabled={savingPayment || !payAmount || Number(payAmount) <= 0}
                    onClick={submitPayment}
                    className="h-10 rounded-lg text-white text-[14px] font-semibold"
                    style={{
                      backgroundColor: tokens.blue,
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
          )}


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
            <p className="text-[12px]" style={{ color: tokens.blue }}>
              {error}
            </p>
          )}
        </form>
      )}
    </DSMTopSheet>
  );
}

import { testStartTime, testTimeFromNotes, testTimeFromStart, withTestTimeNote, TEST_TOTAL_MINUTES } from "@/lib/testDay";
import { useEffect, useRef, useState } from "react";
import { IconSearch } from "@tabler/icons-react";
import {
  IconCheck,
  IconCalendar,
  IconChevronRight,
  IconClock,
  IconCreditCard,
  IconCurrencyPound,
  IconHourglass,
  IconMapPin,
  IconNotes,
  IconRepeat,
  IconUser,
} from "@tabler/icons-react";
import { toast } from "sonner";
import { BottomSheet as BottomSheetV2, SheetGroup, SheetRow } from "../dsm/BottomSheetV2";
import { supabase } from "../../lib/supabaseClient";
import { applyPricingRules, type PricingRule } from "../../lib/pricingRules";
import { computeLessonAmount, fetchPostcodeRates } from "../../lib/pricing/resolveRate";
import { pushLessonToGoogle } from "@/lib/calendarSyncPrefs";

const BLUE = "#1877D6";

const labelStyle: React.CSSProperties = {
  fontFamily: "Poppins, sans-serif",
  fontSize: 13,
  fontWeight: 500,
  color: "#6B7686",
  whiteSpace: "nowrap",
};

const valueStyle: React.CSSProperties = {
  fontFamily: "Poppins, sans-serif",
  fontSize: 16,
  fontWeight: 600,
  color: "#0B1F3A",
};


const SUPABASE_URL = "https://bjpqxfrihwjcqprmoqfs.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJqcHF4ZnJpaHdqY3Fwcm1vcWZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0NzQ4MjEsImV4cCI6MjA5NzA1MDgyMX0.HKlgx3dxP3uxX9wMRRUnfb0IPwaBpFcut_iUgT5XFeo";

const UK_POSTCODE_RE = /([A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2})/i;
function extractPostcode(addr: string | null | undefined): string | undefined {
  if (!addr) return undefined;
  const m = addr.match(UK_POSTCODE_RE);
  return m ? m[1].toUpperCase() : undefined;
}

function todayISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

interface Pupil {
  id: string;
  name: string;
  address: string | null;
  custom_rate: number | null;
  custom_rate_90: number | null;
  custom_rate_120: number | null;
  prepaid_hours: number | null;
  pricing_type: string | null;
}

function ErrorText({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-3 -mt-1 text-[12px]" style={{ color: "#CC2229", fontFamily: "Poppins, sans-serif" }}>
      {children}
    </p>
  );
}



export interface AddLessonSheetProps {
  open: boolean;
  onClose: () => void;
  onSaved: (lessonId: string) => void;
  initialPupilId?: string;
  initialDate?: string;
  editingLesson?: {
    id: string;
    pupil_id?: string;
    event_title?: string | null;
    lesson_date?: string;
    lesson_time?: string;
    duration_minutes?: number | null;
    lesson_type?: string | null;
    is_test_day?: boolean;
    pickup_location?: string | null;
    notes?: string | null;
    status?: string;
  };
}

const DURATION_OPTIONS: { value: number | "test"; label: string }[] = [
  { value: 0.5, label: "30 min" },
  { value: 1, label: "1 hr" },
  { value: 1.5, label: "1.5 hrs" },
  { value: 2, label: "2 hrs" },
  { value: 2.5, label: "2.5 hrs" },
  { value: "test", label: "Test 🚗" },
];

export function AddLessonSheet({
  open,
  onClose,
  onSaved,
  initialPupilId,
  initialDate,
  editingLesson,
}: AddLessonSheetProps) {
  const [pupils, setPupils] = useState<Pupil[]>([]);
  const [pupilId, setPupilId] = useState(initialPupilId ?? "");
  const [pupilQuery, setPupilQuery] = useState("");
  const [pupilListOpen, setPupilListOpen] = useState(false);
  const [date, setDate] = useState(initialDate || todayISO());
  const [time, setTime] = useState("");
  const [duration, setDuration] = useState<number | "test">(1);
  const [isTestDay, setIsTestDay] = useState(false);
  const [isEvent, setIsEvent] = useState(false);
  const [eventTitle, setEventTitle] = useState("");
  const [pickup, setPickup] = useState("");
  const [testCentre, setTestCentre] = useState("");
  const testCentreInputRef = useRef<HTMLInputElement>(null);
  const [testCentreSearch, setTestCentreSearch] = useState("");
  const [testCentreResults, setTestCentreResults] = useState<any[]>([]);
  const [searchingCentres, setSearchingCentres] = useState(false);
  const [testTime, setTestTime] = useState("");
  const [pickupTouched, setPickupTouched] = useState(false);
  const [notes, setNotes] = useState("");

  const [errors, setErrors] = useState<{
    pupil?: string;
    date?: string;
    time?: string;
    testCentre?: string;
    form?: string;
  }>({});
  const [saving, setSaving] = useState(false);
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringFreq, setRecurringFreq] = useState<"weekly" | "fortnightly">("weekly");
  const [recurringUntil, setRecurringUntil] = useState<string>(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 3);
    return d.toISOString().split("T")[0];
  });

  useEffect(() => {
    if (!open) return;
    setPupilId(initialPupilId ?? "");
    setDate(initialDate || todayISO());
    setIsEvent(false);
    setEventTitle("");
  }, [open, initialPupilId, initialDate]);

  // Populate sheet state when editing an existing lesson.
  useEffect(() => {
    if (!open || !editingLesson) return;
    if (editingLesson.pupil_id) setPupilId(editingLesson.pupil_id);
    if (editingLesson.lesson_date) setDate(editingLesson.lesson_date);
    if (editingLesson.lesson_time) setTime((editingLesson.lesson_time).slice(0, 5));
    if (editingLesson.duration_minutes != null) {
      setDuration((editingLesson.duration_minutes / 60) || 1);
    }
    setNotes(editingLesson.notes ?? "");
    setPickup(editingLesson.pickup_location ?? "");

    // Set event / test day state from existing lesson data
    if (editingLesson.lesson_type === 'event') {
      setIsEvent(true);
      setEventTitle(editingLesson.event_title ?? "");
      setIsTestDay(false);
      setTestCentre('');
      setTestCentreSearch('');
      setTestCentreResults([]);
      setTestTime('');
    } else if (editingLesson.lesson_type === 'test' || editingLesson.is_test_day === true) {
      setIsEvent(false);
      setEventTitle('');
      setIsTestDay(true);
      setDuration('test');
      setTestCentre(editingLesson.pickup_location ?? '');
      setTestCentreSearch(editingLesson.pickup_location ?? '');
      setTestCentreResults([]);
      setTestTime(
        testTimeFromNotes(editingLesson.notes) ??
          (editingLesson.lesson_time
            ? testTimeFromStart(editingLesson.lesson_time.slice(0, 5)) ?? ''
            : ''),
      );
    } else {
      setIsEvent(false);
      setEventTitle('');
      setIsTestDay(false);
      setTestCentre('');
      setTestCentreSearch('');
      setTestCentreResults([]);
      setTestTime('');
    }
  }, [open, editingLesson]);

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

  useEffect(() => {
    if (!open) return;
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("pupils")
        .select("id, name, address, custom_rate, custom_rate_90, custom_rate_120, prepaid_hours, pricing_type")
        .eq("instructor_id", user.id)
        .is("deleted_at", null)
        .not("status", "in", "(inactive,archived,cancelled)")
        .order("name", { ascending: true });
      setPupils((data as Pupil[]) ?? []);
    })();
  }, [open]);

  // Prefill pickup with the selected pupil's home address when the
  // instructor hasn't manually edited the pickup field yet.
  useEffect(() => {
    if (pickupTouched) return;
    const p = pupils.find((x) => x.id === pupilId);
    setPickup(p?.address ?? "");
  }, [pupilId, pupils, pickupTouched]);

  const selectedPupil = pupils.find((p) => p.id === pupilId) ?? null;
  // Display only — the authoritative payment status is resolved in handleSave().
  const willBePrepaid = (() => {
    const t = (selectedPupil?.pricing_type ?? "").toLowerCase();
    if (t === "block" || t === "national_intensives") return true;
    return Number(selectedPupil?.prepaid_hours ?? 0) > 0;
  })();

  const filteredPupils = pupilQuery.trim()
    ? pupils.filter((p) => p.name.toLowerCase().includes(pupilQuery.trim().toLowerCase()))
    : pupils;

  const effectiveDuration = duration === "test" ? 0 : duration * 60;

  async function handleSave() {
    const next: typeof errors = {};
    if (!isEvent && !pupilId) next.pupil = "Pupil is required";
    if (!date) next.date = "Date is required";
    if (!time) next.time = "Time is required";
    if (!isEvent && isTestDay && !testCentre.trim()) {
      next.testCentre = "Enter a test centre or location for a test day";
    }
    if (Object.keys(next).length) {
      setErrors(next);
      if (next.testCentre) testCentreInputRef.current?.focus();
      return;
    }
    setErrors({});
    setSaving(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setErrors({ form: "You must be signed in to add a lesson" });
      toast.error("You must be signed in to add a lesson");
      setSaving(false);
      return;
    }
    const durationMinutes = isTestDay ? 0 : effectiveDuration > 0 ? effectiveDuration : 60;
    // Test days block out 1 hour before the test time and 90 minutes after it.
    const effTime =
      isTestDay && testTime ? testStartTime(testTime) ?? testTime : time;
    const savedDuration = isTestDay ? TEST_TOTAL_MINUTES : durationMinutes;

    const selected = pupils.find((p) => p.id === pupilId);
    const pickupValue = pickup.trim() || selected?.address?.trim() || null;
    const baseNotes = notes.trim() || null;
    const withPickup = pickupValue
      ? baseNotes
        ? `${baseNotes}\n\nPickup: ${pickupValue}`
        : `Pickup: ${pickupValue}`
      : baseNotes;
    const fullNotes =
      isTestDay && testTime ? withTestTimeNote(withPickup, testTime) : withPickup;

    // Resolve the correct base price using pupil custom rates, postcode rates,
    // then the instructor's default hourly rate.
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token ?? "";

    const [{ data: instructor }, postcodeRates] = await Promise.all([
      supabase
        .from("instructors")
        .select("hourly_rate, default_lesson_duration_minutes")
        .eq("id", user.id)
        .single(),
      fetchPostcodeRates(user.id, token),
    ]);

    const baseCost = computeLessonAmount({
      durationMinutes,
      pupilCustomRate: selected?.custom_rate,
      pupilCustomRate90: selected?.custom_rate_90,
      pupilCustomRate120: selected?.custom_rate_120,
      pupilPostcode: extractPostcode(pickupValue) ?? extractPostcode(selected?.address),
      instructorDefaultRate: (instructor as any)?.hourly_rate ?? 0,
      postcodeRates,
    });

    // Apply pricing rules on top of the resolved base cost
    let amountDue = baseCost;
    try {
      const { data: rules } = await supabase
        .from("pricing_rules")
        .select("*")
        .eq("instructor_id", user.id)
        .eq("is_active", true);
      if (rules && rules.length && baseCost > 0) {
        const postcode = extractPostcode(pickupValue) ?? extractPostcode(selected?.address);
        const result = applyPricingRules(baseCost, rules as PricingRule[], {
          lessonDate: date,
          lessonTime: time,
          postcode,
          bookedAt: new Date().toISOString(),
        });
        amountDue = result.total;
      }
    } catch (e) {
      console.warn("[AddLessonSheet] pricing rules failed", e);
    }

    // If pupil has enough remaining prepaid hours, mark as prepaid so
    // balance/pill logic across the app treats it as covered.
    const lessonHours = durationMinutes / 60;
    let paymentStatus: "unpaid" | "prepaid" = "unpaid";
    let prepaidHoursUsed = 0;
    const prepaidTotal = Number(selected?.prepaid_hours ?? 0);
    if (prepaidTotal > 0) {
      try {
        const { data: existing } = await supabase
          .from("lessons")
          .select("duration_minutes")
          .eq("pupil_id", pupilId)
          .eq("instructor_id", user.id)
          .is("deleted_at", null);
        const usedHours = (existing ?? []).reduce(
          (s: number, r: { duration_minutes: number | null }) =>
            s + (Number(r.duration_minutes) || 0) / 60,
          0,
        );
        const remaining = prepaidTotal - usedHours;
        if (remaining >= lessonHours) {
          paymentStatus = "prepaid";
          prepaidHoursUsed = lessonHours;
        }
      } catch (e) {
        console.warn("[AddLessonSheet] prepaid check failed", e);
      }
    }

    // Block / national intensives pupils pay up front, so their lessons are
    // always created as prepaid. Read pricing_type fresh so a stale cached
    // pupil row can't produce an "unpaid" lesson for a prepaid pupil.
    const { data: pupilData } = await supabase
      .from("pupils")
      .select("pricing_type")
      .eq("id", pupilId)
      .maybeSingle();
    const pricingType = (
      (pupilData as { pricing_type?: string | null } | null)?.pricing_type ??
      selected?.pricing_type ??
      ""
    ).toLowerCase();
    const isPrepaidPricing =
      pricingType === "block" || pricingType === "national_intensives";
    if (isPrepaidPricing) paymentStatus = "prepaid";

    // Update existing lesson when editing.
    if (editingLesson) {
      const { error: updErr } = await supabase
        .from("lessons")
        .update({
          pupil_id: isEvent ? null : pupilId,
          lesson_date: date,
          lesson_time: `${effTime}:00`,
          duration_minutes: savedDuration,
          lesson_type: isEvent ? "event" : isTestDay ? "test" : "lesson",
          event_title: isEvent ? eventTitle.trim() || null : null,
          status: editingLesson.status ?? "confirmed",
          notes: fullNotes,
          amount_due: isEvent ? 0 : amountDue,
          payment_status: isEvent ? "paid" : paymentStatus,
          pickup_location: isTestDay ? testCentre.trim() || null : pickup.trim() || null,
        })
        .eq("id", editingLesson.id);
      if (updErr) {
        setErrors({ form: updErr.message });
        toast.error(updErr.message);
        setSaving(false);
        return;
      }
      const { data: lessonRow } = await supabase
        .from("lessons")
        .select("google_event_id")
        .eq("id", editingLesson.id)
        .maybeSingle();
      if (lessonRow?.google_event_id) {
        pushLessonToGoogle({ lesson_id: editingLesson.id, instructor_id: user.id, action: "update" });
      }
      toast.success("Lesson updated");
      setSaving(false);
      onSaved(editingLesson.id);
      onClose();
      return;
    }

    // If recurring, create a lesson_series first so the initial lesson can link to it
    let seriesId: string | null = null;
    if (isRecurring) {
      const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      const dayOfWeek = days[new Date(`${date}T00:00:00`).getDay()];
      const { data: seriesRow, error: seriesErr } = await supabase
        .from("lesson_series")
        .insert({
          instructor_id: user.id,
          pupil_id: pupilId,
          day_of_week: dayOfWeek,
          lesson_time: `${effTime}:00`,
          duration_minutes: savedDuration,
          frequency: recurringFreq,
          start_date: date,
          end_date: recurringUntil || null,
          price_per_lesson: amountDue,
          notes: baseNotes,
          is_active: true,
        })
        .select("id")
        .single();
      if (seriesErr) {
        setErrors({ form: seriesErr.message });
        toast.error(seriesErr.message);
        setSaving(false);
        return;
      }
      seriesId = (seriesRow as any).id;
    }

    const { data: insertedLesson, error } = await supabase
      .from("lessons")
      .insert({
        instructor_id: user.id,
        pupil_id: isEvent ? null : pupilId,
        lesson_date: date,
        lesson_time: `${effTime}:00`,
        duration_minutes: savedDuration,
        lesson_type: isEvent ? "event" : isTestDay ? "test" : "lesson",
        event_title: isEvent ? eventTitle.trim() || null : null,
        status: "confirmed",
        notes: fullNotes,
        amount_due: isEvent ? 0 : amountDue,
        payment_status: isEvent ? "paid" : paymentStatus,
        prepaid_hours_used: isEvent ? 0 : prepaidHoursUsed,
        series_id: seriesId,
        pickup_location: isTestDay ? testCentre.trim() || null : pickup.trim() || null,
      })
      .select("id")
      .single();
    if (error) {
      setErrors({ form: error.message });
      toast.error(error.message);
      setSaving(false);
      return;
    }

    const newLessonId = (insertedLesson as any)?.id as string | undefined;
    if (newLessonId) {
      pushLessonToGoogle({ action: "push", lesson_id: newLessonId, instructor_id: user.id });
    }

    if (isRecurring && seriesId) {
      // Generate remaining occurrences after the initial one
      const step = recurringFreq === "fortnightly" ? 14 : 7;
      const startD = new Date(`${date}T00:00:00`);
      const endD = recurringUntil ? new Date(`${recurringUntil}T00:00:00`) : null;
      const dates: string[] = [];
      let cur = new Date(startD);
      cur.setDate(cur.getDate() + step);
      while (dates.length < 200) {
        if (endD && cur > endD) break;
        const y = cur.getFullYear();
        const m = String(cur.getMonth() + 1).padStart(2, "0");
        const dd = String(cur.getDate()).padStart(2, "0");
        dates.push(`${y}-${m}-${dd}`);
        cur = new Date(cur);
        cur.setDate(cur.getDate() + step);
      }
      const lessonsPayload = dates.map((d) => ({
        instructor_id: user.id,
        pupil_id: pupilId,
        lesson_date: d,
        lesson_time: `${effTime}:00`,
        duration_minutes: savedDuration,
        lesson_type: isTestDay ? "test" : "lesson",
        status: "confirmed",
        payment_status: isPrepaidPricing ? "prepaid" : "unpaid",
        amount_due: amountDue,
        series_id: seriesId,
        pickup_location: isTestDay ? testCentre.trim() || null : null,
      }));
      try {
        for (let i = 0; i < lessonsPayload.length; i += 50) {
          const batch = lessonsPayload.slice(i, i + 50);
          const res = await fetch(`${SUPABASE_URL}/rest/v1/lessons`, {
            method: "POST",
            headers: {
              apikey: SUPABASE_ANON_KEY,
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
              Prefer: "return=representation",
            },
            body: JSON.stringify(batch),
          });
          const rows = (await res.json().catch(() => [])) as Array<{ id?: string }>;
          for (const r of rows) {
            if (r?.id) {
              pushLessonToGoogle({ action: "push", lesson_id: r.id, instructor_id: user.id });
            }
          }
        }
      } catch (e) {
        console.warn("[AddLessonSheet] recurring batch insert failed", e);
      }
    }

    toast.success("Lesson added");
    setSaving(false);
    onSaved((insertedLesson as any)?.id as string);
    onClose();
  }

  if (!open) return null;

  return (
    <BottomSheetV2
      title={editingLesson ? "Edit Lesson" : "Add Lesson"}
      subtitle={selectedPupil ? selectedPupil.name : "Choose a pupil to get started"}
      onClose={onClose}
      footer={
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !date || (!isEvent && !pupilId)}
          className="w-full text-white active:opacity-90 disabled:opacity-40"
          style={{
            backgroundColor: "#1877D6",
            borderRadius: 8,
            height: 52,
            fontSize: 16,
            fontWeight: 700,
            fontFamily: "Poppins, sans-serif",
          }}
        >
          {saving ? "Saving..." : editingLesson ? "Save changes" : "Add lesson"}
        </button>
      }
    >
      <div style={{ fontFamily: "Poppins, sans-serif" }}>
        {/* Lesson / Event toggle */}
        <div
          style={{
            display: "flex",
            gap: 0,
            background: "#E5E5EA",
            borderRadius: 8,
            padding: 4,
            margin: "0 0 16px",
          }}
        >
          <button
            type="button"
            onClick={() => {
              setIsEvent(false);
            }}
            style={{
              flex: 1,
              padding: "8px 0",
              borderRadius: 8,
              border: "none",
              cursor: "pointer",
              fontFamily: "Poppins, sans-serif",
              fontSize: 13,
              fontWeight: 600,
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
              if (duration === "test") setDuration(1);
            }}
            style={{
              flex: 1,
              padding: "8px 0",
              borderRadius: 8,
              border: "none",
              cursor: "pointer",
              fontFamily: "Poppins, sans-serif",
              fontSize: 13,
              fontWeight: 600,
              background: isEvent ? "#fff" : "transparent",
              color: isEvent ? "#0B1F3A" : "#6B6B6F",
              boxShadow: isEvent ? "0 2px 6px rgba(0,0,0,0.08)" : "none",
            }}
          >
            Event
          </button>
        </div>

        {/* SECTION 1 — Pupil */}
        {!isEvent ? (
          <SheetGroup>
          <SheetRow
            onClick={() => {
              setPupilQuery("");
              setPupilListOpen((v) => !v);
            }}
          >
            {selectedPupil ? (
              <span
                className="flex items-center justify-center shrink-0"
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 999,
                  background: "#E6F1FB",
                  color: "#1877D6",
                  fontSize: 13,
                  fontWeight: 700,
                }}
              >
                {selectedPupil.name.trim().charAt(0).toUpperCase()}
              </span>
            ) : (
              <IconUser size={20} stroke={1.8} color={BLUE} />
            )}
            <span style={selectedPupil ? valueStyle : { ...valueStyle, color: "#9CA3AF" }}>
              {selectedPupil ? selectedPupil.name : "Select pupil"}
            </span>
            {!selectedPupil && (
              <span style={{ marginLeft: "auto", display: "flex" }}>
                <IconChevronRight size={18} stroke={1.8} color="#C7D0DC" />
              </span>
            )}
          </SheetRow>

          {pupilListOpen && (
            <SheetRow>
              <IconSearch stroke={1.5} size={16} color="#9CA3AF" />
              <input
                id="al-pupil"
                type="text"
                autoFocus
                value={pupilQuery}
                onChange={(e) => {
                  setPupilQuery(e.target.value);
                  setPupilListOpen(true);
                }}
                placeholder="Search pupils…"
                className="flex-1 bg-transparent focus:outline-none"
                style={{ ...valueStyle, fontWeight: 500 }}
              />
            </SheetRow>
          )}

          {pupilListOpen && (
            <div style={{ maxHeight: 220, overflowY: "auto" }}>
              {filteredPupils.length === 0 && (
                <div style={{ ...labelStyle, padding: "15px 16px" }}>No pupils found</div>
              )}
              {filteredPupils.map((p, i) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    setPupilId(p.id);
                    setPupilQuery("");
                    setPupilListOpen(false);
                  }}
                  className="w-full flex items-center gap-3 text-left active:bg-black/[0.03]"
                  style={{
                    padding: "15px 16px",
                    borderTop: i === 0 ? "none" : "1px solid #E4E8EF",
                    background: p.id === pupilId ? "#F0F7FF" : "transparent",
                  }}
                >
                  <span
                    className="flex items-center justify-center shrink-0"
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 999,
                      background: "#EEF2F7",
                      color: "#6B7686",
                      fontSize: 13,
                      fontWeight: 700,
                    }}
                  >
                    {p.name.trim().charAt(0).toUpperCase()}
                  </span>
                  <span style={valueStyle}>{p.name}</span>
                </button>
              ))}
            </div>
          )}
        </SheetGroup>
        {errors.pupil && <ErrorText>{errors.pupil}</ErrorText>}

        {/* SECTION 2 — Date & Time */}
        <SheetGroup>
          <SheetRow>
            <IconCalendar size={20} stroke={1.8} color={BLUE} />
            <span style={labelStyle}>Date</span>
            <input
              id="al-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="bg-transparent focus:outline-none text-right"
              style={{ ...valueStyle, marginLeft: "auto" }}
            />
          </SheetRow>
          <SheetRow>
            <IconClock size={20} stroke={1.8} color={BLUE} />
            <span style={labelStyle}>Start time</span>
            <input
              id="al-time"
              type="time"
              step={60}
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="bg-transparent focus:outline-none text-right"
              style={{ ...valueStyle, marginLeft: "auto" }}
            />
          </SheetRow>
          <SheetRow>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 8,
                width: "100%",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <IconHourglass size={20} stroke={1.8} color={BLUE} />
                <span style={labelStyle}>Duration</span>
              </div>
              <div
                id="al-duration"
                role="radiogroup"
                style={{
                  display: "flex",
                  gap: 8,
                  overflowX: "auto",
                  paddingBottom: 4,
                  scrollbarWidth: "none",
                }}
              >
                {DURATION_OPTIONS.map((opt) => {
                  const active = duration === opt.value;
                  const isTest = opt.value === "test";
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() => {
                        setDuration(opt.value);
                        setIsTestDay(opt.value === "test");
                      }}
                      style={{
                        height: 34,
                        borderRadius: 8,
                        padding: "0 16px",
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: "pointer",
                        border: active ? "none" : "1px solid #E4E8EF",
                        whiteSpace: "nowrap",
                        fontFamily: "Poppins, sans-serif",
                        background: active ? (isTest ? "#CC2229" : "#0B1F3A") : "#fff",
                        color: active ? "#fff" : "#6B7686",
                        flexShrink: 0,
                      }}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
              {isTestDay && (
                <p
                  style={{
                    fontSize: 11,
                    color: "#9CA3AF",
                    marginTop: 6,
                    fontFamily: "Poppins, sans-serif",
                  }}
                >
                  Test day — no lesson duration recorded
                </p>
              )}
              {isTestDay && (
                <div style={{ marginTop: 12 }}>
                  <div
                    style={{
                      marginBottom: 6,
                      fontFamily: "Poppins, sans-serif",
                      fontSize: 11,
                      fontWeight: 600,
                      color: "#9CA3AF",
                      textTransform: "uppercase",
                    }}
                  >
                    TEST CENTRE
                  </div>
                  <input
                    ref={testCentreInputRef}
                    value={testCentreSearch}
                    onChange={(e) => {
                      setTestCentreSearch(e.target.value);
                      setTestCentre(e.target.value);
                      setErrors((prev) => ({ ...prev, testCentre: undefined }));
                      void searchTestCentres(e.target.value);
                    }}
                    placeholder="Search test centres..."
                    style={{
                      width: "100%",
                      background: "#fff",
                      border: "1px solid #E4E8EF",
                      borderRadius: 8,
                      padding: "10px 12px",
                      fontSize: 14,
                      fontFamily: "Poppins, sans-serif",
                      outline: "none",
                    }}
                  />
                  {testCentreResults.length > 0 && (
                    <div
                      style={{
                        background: "#fff",
                        borderRadius: 8,
                        border: "1px solid #E4E8EF",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                        maxHeight: 200,
                        overflowY: "auto",
                        marginTop: 4,
                      }}
                    >
                      {testCentreResults.map((r: any) => (
                        <div
                          key={r.id ?? r.name}
                          role="button"
                          tabIndex={0}
                          onClick={() => {
                            const addr = [r.address, r.town, r.postcode].filter(Boolean).join(", ");
                            setTestCentre(addr ? `${r.name}, ${addr}` : r.name);
                            setTestCentreSearch(r.name);
                            setTestCentreResults([]);
                            setErrors((prev) => ({ ...prev, testCentre: undefined }));
                          }}
                          style={{
                            padding: "11px 14px",
                            borderBottom: "1px solid #E4E8EF",
                            cursor: "pointer",
                            fontSize: 13,
                            color: "#0B1F3A",
                            fontFamily: "Poppins, sans-serif",
                          }}
                        >
                          <div style={{ fontSize: 13, fontWeight: 600 }}>{r.name}</div>
                          <div style={{ fontSize: 11, color: "#6B7686", marginTop: 2 }}>
                            {[r.address, r.town, r.postcode].filter(Boolean).join(", ")}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {testCentreSearch.trim().length >= 2 &&
                    testCentreResults.length === 0 &&
                    !searchingCentres && (
                      <p
                        style={{
                          fontSize: 11,
                          color: "#9CA3AF",
                          marginTop: 6,
                          fontFamily: "Poppins, sans-serif",
                        }}
                      >
                        No centres found — type the address manually
                      </p>
                    )}
                  {testCentre.trim() && (
                    <div
                      style={{
                        background: "#DCFCE7",
                        color: "#15803D",
                        fontSize: 11,
                        fontWeight: 700,
                        borderRadius: 8,
                        padding: "4px 12px",
                        display: "flex",
                        gap: 6,
                        alignItems: "center",
                        marginTop: 6,
                        width: "fit-content",
                        maxWidth: "100%",
                        fontFamily: "Poppins, sans-serif",
                      }}
                    >
                      <IconCheck size={12} color="#15803D" stroke={2} />
                      <span
                        style={{
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {testCentre}
                      </span>
                      <button
                        type="button"
                        aria-label="Clear test centre"
                        onClick={() => {
                          setTestCentre("");
                          setTestCentreSearch("");
                          setTestCentreResults([]);
                        }}
                        style={{
                          background: "none",
                          border: "none",
                          color: "#15803D",
                          cursor: "pointer",
                          fontSize: 13,
                          lineHeight: 1,
                          padding: 0,
                        }}
                      >
                        ×
                      </button>
                    </div>
                  )}
                  <div
                    style={{
                      marginTop: 12,
                      marginBottom: 6,
                      fontFamily: "Poppins, sans-serif",
                      fontSize: 11,
                      fontWeight: 600,
                      color: "#9CA3AF",
                      textTransform: "uppercase",
                    }}
                  >
                    TEST APPOINTMENT TIME
                  </div>
                  <input
                    type="time"
                    value={testTime}
                    onChange={(e) => setTestTime(e.target.value)}
                    style={{
                      width: "100%",
                      background: "#fff",
                      border: "1px solid #E4E8EF",
                      borderRadius: 8,
                      padding: "10px 12px",
                      fontSize: 14,
                      fontFamily: "Poppins, sans-serif",
                      outline: "none",
                    }}
                  />
                  <p
                    style={{
                      fontSize: 10,
                      color: "#9CA3AF",
                      marginTop: 4,
                      fontFamily: "Poppins, sans-serif",
                    }}
                  >
                    Standard test: 38-40 mins. Extended test: 70 mins.
                  </p>
                  {errors.testCentre && (
                    <p
                      style={{
                        fontSize: 12,
                        color: "#CC2229",
                        marginTop: 6,
                        fontFamily: "Poppins, sans-serif",
                      }}
                    >
                      {errors.testCentre}
                    </p>
                  )}
                </div>
              )}
            </div>
          </SheetRow>

        </SheetGroup>
        {(errors.date || errors.time) && <ErrorText>{errors.date ?? errors.time}</ErrorText>}

        {/* SECTION 3 — Location */}
        <SheetGroup>
          <SheetRow>
            <IconMapPin size={20} stroke={1.8} color={BLUE} />
            <span style={labelStyle}>Pickup</span>
            <input
              id="al-pickup"
              type="text"
              value={pickup}
              onChange={(e) => {
                setPickupTouched(true);
                setPickup(e.target.value);
              }}
              placeholder={pupilId ? "Pupil's home address" : "Select a pupil first"}
              className="flex-1 bg-transparent focus:outline-none text-right"
              style={{ ...valueStyle, marginLeft: "auto", minWidth: 0 }}
            />
          </SheetRow>
        </SheetGroup>

        {/* SECTION 4 — Payment (auto-priced, read only) */}
        <SheetGroup>
          <SheetRow>
            <IconCurrencyPound size={20} stroke={1.8} color={BLUE} />
            <span style={labelStyle}>Amount</span>
            <span style={{ ...valueStyle, marginLeft: "auto", color: "#6B7686", fontWeight: 500, fontSize: 13 }}>
              Auto from your rates
            </span>
          </SheetRow>
          <SheetRow>
            <IconCreditCard size={20} stroke={1.8} color={BLUE} />
            <span style={labelStyle}>Payment status</span>
            <span
              style={{
                marginLeft: "auto",
                fontFamily: "Poppins, sans-serif",
                fontSize: 12,
                fontWeight: 600,
                borderRadius: 999,
                padding: "4px 12px",
                color: willBePrepaid ? "#1F6B2E" : "#8A5A00",
                background: willBePrepaid ? "#E8F5E9" : "#FEF3D7",
              }}
            >
              {willBePrepaid ? "Prepaid" : "Unpaid"}
            </span>
          </SheetRow>
        </SheetGroup>

        {/* SECTION 5 — Notes */}
        <SheetGroup>
          <SheetRow>
            <IconNotes size={20} stroke={1.8} color={BLUE} />
            <input
              id="al-notes"
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add a note..."
              className="flex-1 bg-transparent focus:outline-none"
              style={{ fontFamily: "Poppins, sans-serif", fontSize: 13, color: "#0B1F3A" }}
            />
          </SheetRow>
        </SheetGroup>

        {/* SECTION 6 — Recurring */}
        <SheetGroup>
          <SheetRow>
            <IconRepeat size={20} stroke={1.8} color={BLUE} />
            <span style={valueStyle}>Recurring lesson</span>
            <button
              type="button"
              role="switch"
              aria-checked={isRecurring}
              onClick={() => setIsRecurring((v) => !v)}
              style={{
                marginLeft: "auto",
                width: 46,
                height: 28,
                borderRadius: 999,
                background: isRecurring ? BLUE : "#D1D5DB",
                position: "relative",
                transition: "background 0.15s",
                flexShrink: 0,
              }}
            >
              <span
                style={{
                  position: "absolute",
                  top: 2,
                  left: isRecurring ? 20 : 2,
                  width: 24,
                  height: 24,
                  borderRadius: 999,
                  background: "#FFFFFF",
                  boxShadow: "0 1px 3px rgba(11,31,58,0.2)",
                  transition: "left 0.15s",
                }}
              />
            </button>
          </SheetRow>

          {isRecurring ? (
            <SheetRow>
              <span style={labelStyle}>Repeat</span>
              <div className="flex items-center gap-1.5" style={{ marginLeft: "auto" }}>
                {(["weekly", "fortnightly"] as const).map((f) => {
                  const active = recurringFreq === f;
                  return (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setRecurringFreq(f)}
                      style={{
                        padding: "6px 12px",
                        borderRadius: 999,
                        fontSize: 13,
                        fontWeight: 600,
                        fontFamily: "Poppins, sans-serif",
                        textTransform: "capitalize",
                        background: active ? BLUE : "#F3F6FA",
                        color: active ? "#FFFFFF" : "#0B1F3A",
                      }}
                    >
                      {f}
                    </button>
                  );
                })}
              </div>
            </SheetRow>
          ) : null}

          {isRecurring ? (
            <SheetRow>
              <IconCalendar size={20} stroke={1.8} color={BLUE} />
              <span style={labelStyle}>Repeat until</span>
              <input
                type="date"
                value={recurringUntil}
                onChange={(e) => setRecurringUntil(e.target.value)}
                className="bg-transparent focus:outline-none text-right"
                style={{ ...valueStyle, marginLeft: "auto" }}
              />
            </SheetRow>
          ) : null}
        </SheetGroup>

        {errors.form && <ErrorText>{errors.form}</ErrorText>}
      </div>
    </BottomSheetV2>
  );
}

export default AddLessonSheet;

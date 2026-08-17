import { useEffect, useState } from "react";
import { IconSearch } from "@tabler/icons-react";
import {
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
}: AddLessonSheetProps) {
  const [pupils, setPupils] = useState<Pupil[]>([]);
  const [pupilId, setPupilId] = useState(initialPupilId ?? "");
  const [pupilQuery, setPupilQuery] = useState("");
  const [pupilListOpen, setPupilListOpen] = useState(false);
  const [date, setDate] = useState(initialDate || todayISO());
  const [time, setTime] = useState("");
  const [duration, setDuration] = useState(60);
  const [customDuration, setCustomDuration] = useState("");
  const [durationMode, setDurationMode] = useState<"preset" | "custom">("preset");
  const [pickup, setPickup] = useState("");
  const [pickupTouched, setPickupTouched] = useState(false);
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<{
    pupil?: string;
    date?: string;
    time?: string;
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
  }, [open, initialPupilId, initialDate]);

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

  const effectiveDuration =
    durationMode === "custom" ? Math.max(0, parseInt(customDuration, 10) || 0) : duration;

  async function handleSave() {
    const next: typeof errors = {};
    if (!pupilId) next.pupil = "Pupil is required";
    if (!date) next.date = "Date is required";
    if (!time) next.time = "Time is required";
    if (Object.keys(next).length) {
      setErrors(next);
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
    const durationMinutes = effectiveDuration > 0 ? effectiveDuration : 60;
    const selected = pupils.find((p) => p.id === pupilId);
    const pickupValue = pickup.trim() || selected?.address?.trim() || null;
    const baseNotes = notes.trim() || null;
    const fullNotes = pickupValue
      ? baseNotes
        ? `${baseNotes}\n\nPickup: ${pickupValue}`
        : `Pickup: ${pickupValue}`
      : baseNotes;

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
          lesson_time: `${time}:00`,
          duration_minutes: durationMinutes,
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
        pupil_id: pupilId,
        lesson_date: date,
        lesson_time: `${time}:00`,
        duration_minutes: durationMinutes,
        status: "confirmed",
        notes: fullNotes,
        amount_due: amountDue,
        payment_status: paymentStatus,
        prepaid_hours_used: prepaidHoursUsed,
        series_id: seriesId,
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
      void supabase.functions.invoke("google-calendar-sync", {
        body: { action: "push", lesson_id: newLessonId, instructor_id: user.id },
      });
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
        lesson_time: `${time}:00`,
        duration_minutes: durationMinutes,
        status: "confirmed",
        payment_status: isPrepaidPricing ? "prepaid" : "unpaid",
        amount_due: amountDue,
        series_id: seriesId,
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
              void supabase.functions.invoke("google-calendar-sync", {
                body: { action: "push", lesson_id: r.id, instructor_id: user.id },
              });
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
      title="Add Lesson"
      subtitle={selectedPupil ? selectedPupil.name : "Choose a pupil to get started"}
      onClose={onClose}
      footer={
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !pupilId || !date}
          className="w-full text-white active:opacity-90 disabled:opacity-40"
          style={{
            backgroundColor: "#1877D6",
            borderRadius: 16,
            height: 52,
            fontSize: 16,
            fontWeight: 700,
            fontFamily: "Poppins, sans-serif",
          }}
        >
          {saving ? "Saving..." : "Add lesson"}
        </button>
      }
    >
      <div style={{ fontFamily: "Poppins, sans-serif" }}>
        {/* SECTION 1 — Pupil */}
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
            <IconHourglass size={20} stroke={1.8} color={BLUE} />
            <span style={labelStyle}>Duration</span>
            <div
              id="al-duration"
              role="radiogroup"
              className="flex items-center gap-1.5"
              style={{ marginLeft: "auto" }}
            >
              {PRESET_DURATIONS.map((m) => {
                const active = durationMode === "preset" && duration === m;
                return (
                  <button
                    key={m}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => {
                      setDurationMode("preset");
                      setDuration(m);
                    }}
                    style={{
                      padding: "6px 10px",
                      borderRadius: 999,
                      fontSize: 13,
                      fontWeight: 600,
                      fontFamily: "Poppins, sans-serif",
                      background: active ? BLUE : "#F3F6FA",
                      color: active ? "#FFFFFF" : "#0B1F3A",
                    }}
                  >
                    {m === 60 ? "1hr" : m === 90 ? "1.5hr" : m === 120 ? "2hr" : `${m}m`}
                  </button>
                );
              })}
              <button
                type="button"
                role="radio"
                aria-checked={durationMode === "custom"}
                onClick={() => setDurationMode("custom")}
                style={{
                  padding: "6px 10px",
                  borderRadius: 999,
                  fontSize: 13,
                  fontWeight: 600,
                  fontFamily: "Poppins, sans-serif",
                  background: durationMode === "custom" ? BLUE : "#F3F6FA",
                  color: durationMode === "custom" ? "#FFFFFF" : "#0B1F3A",
                }}
              >
                Other
              </button>
            </div>
          </SheetRow>
          {durationMode === "custom" && (
            <SheetRow>
              <span style={labelStyle}>Minutes</span>
              <input
                type="number"
                inputMode="numeric"
                min={15}
                step={15}
                value={customDuration}
                onChange={(e) => setCustomDuration(e.target.value)}
                placeholder="90"
                className="bg-transparent focus:outline-none text-right"
                style={{ ...valueStyle, marginLeft: "auto", width: 90 }}
              />
            </SheetRow>
          )}
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

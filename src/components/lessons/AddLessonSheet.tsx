import { useEffect, useState } from "react";
import { RefreshCw, Search } from "lucide-react";
import { toast } from "sonner";
import { BottomSheet as BottomSheetV2 } from "../dsm/BottomSheetV2";
import { supabase } from "../../lib/supabaseClient";
import { applyPricingRules, type PricingRule } from "../../lib/pricingRules";
import { computeLessonAmount, fetchPostcodeRates } from "../../lib/pricing/resolveRate";

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
      style={{ fontFamily: "Inter, sans-serif" }}
    >
      {children}
    </label>
  );
}

function ErrorText({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-1 text-[12px]" style={{ color: "#1877D6" }}>
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

const PRESET_DURATIONS = [60, 90, 120];

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
    // always created as prepaid.
    const pricingType = (selected?.pricing_type ?? "").toLowerCase();
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
      title="Add lesson"
      subtitle={selectedPupil ? selectedPupil.name : undefined}
      onClose={onClose}
      footer={
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="w-full py-4 rounded-full text-white font-semibold text-base active:opacity-90 disabled:opacity-40"
          style={{ backgroundColor: "#1877D6", fontFamily: "Inter, sans-serif" }}
        >
          {saving ? "Saving..." : "Add lesson"}
        </button>
      }
    >
      <div
        className="flex flex-col gap-4 px-1 pb-2"
        style={{ fontFamily: "Inter, sans-serif" }}
      >
        {/* Pupil */}
        <div>
          <FieldLabel htmlFor="al-pupil">Pupil</FieldLabel>
          <div
            className="rounded-lg bg-white flex items-center gap-2 px-3"
            style={{ ...fieldBorder, height: 44 }}
          >
            <Search size={15} color="#9CA3AF" />
            <input
              id="al-pupil"
              type="text"
              value={pupilListOpen ? pupilQuery : selectedPupil?.name ?? ""}
              onChange={(e) => {
                setPupilQuery(e.target.value);
                setPupilListOpen(true);
              }}
              onFocus={() => {
                setPupilQuery("");
                setPupilListOpen(true);
              }}
              placeholder="Search pupils…"
              className="flex-1 text-[14px] text-[#0B1F3A] bg-transparent focus:outline-none"
            />
          </div>
          {pupilListOpen && (
            <div
              className="mt-1 rounded-lg bg-white overflow-y-auto"
              style={{ ...fieldBorder, maxHeight: 180 }}
            >
              {filteredPupils.length === 0 && (
                <div className="px-3 py-2 text-[13px]" style={{ color: "#9CA3AF" }}>
                  No pupils found
                </div>
              )}
              {filteredPupils.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    setPupilId(p.id);
                    setPupilQuery("");
                    setPupilListOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 text-[14px]"
                  style={{
                    color: "#0B1F3A",
                    background: p.id === pupilId ? "#F0F7FF" : "transparent",
                  }}
                >
                  {p.name}
                </button>
              ))}
            </div>
          )}
          {errors.pupil && <ErrorText>{errors.pupil}</ErrorText>}
        </div>

        {/* Date */}
        <div>
          <FieldLabel htmlFor="al-date">Date</FieldLabel>
          <input
            id="al-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="h-11 w-full rounded-lg px-3 text-[14px] text-[#0B1F3A] bg-white focus:outline-none"
            style={fieldBorder}
          />
          {errors.date && <ErrorText>{errors.date}</ErrorText>}
        </div>

        {/* Time */}
        <div>
          <FieldLabel htmlFor="al-time">Time</FieldLabel>
          <input
            id="al-time"
            type="time"
            step={60}
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="h-11 w-full rounded-lg px-3 text-[14px] text-[#0B1F3A] bg-white focus:outline-none"
            style={fieldBorder}
          />
          {errors.time && <ErrorText>{errors.time}</ErrorText>}
        </div>

        {/* Duration */}
        <div>
          <FieldLabel htmlFor="al-duration">Duration</FieldLabel>
          <div id="al-duration" role="radiogroup" className="grid grid-cols-4 gap-2">
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
                  className="rounded-[12px] text-[13px] font-medium"
                  style={{
                    padding: "12px 2px",
                    background: active ? "#1877D6" : "#F3F8FF",
                    color: active ? "#FFFFFF" : "#0B1F3A",
                    border: active ? "none" : "1px solid #EEF2F7",
                  }}
                >
                  {m} min
                </button>
              );
            })}
            <button
              type="button"
              role="radio"
              aria-checked={durationMode === "custom"}
              onClick={() => setDurationMode("custom")}
              className="rounded-[12px] text-[13px] font-medium"
              style={{
                padding: "12px 2px",
                background: durationMode === "custom" ? "#1877D6" : "#F3F8FF",
                color: durationMode === "custom" ? "#FFFFFF" : "#0B1F3A",
                border: durationMode === "custom" ? "none" : "1px solid #EEF2F7",
              }}
            >
              Custom
            </button>
          </div>
          {durationMode === "custom" && (
            <input
              type="number"
              inputMode="numeric"
              min={15}
              step={15}
              value={customDuration}
              onChange={(e) => setCustomDuration(e.target.value)}
              placeholder="Minutes"
              className="mt-2 h-11 w-full rounded-lg px-3 text-[14px] text-[#0B1F3A] bg-white focus:outline-none"
              style={fieldBorder}
            />
          )}
        </div>

        {/* Pickup */}
        <div>
          <FieldLabel htmlFor="al-pickup">Pickup address</FieldLabel>
          <input
            id="al-pickup"
            type="text"
            value={pickup}
            onChange={(e) => {
              setPickupTouched(true);
              setPickup(e.target.value);
            }}
            placeholder={pupilId ? "Pupil's home address" : "Select a pupil first"}
            className="h-11 w-full rounded-lg px-3 text-[14px] text-[#0B1F3A] bg-white focus:outline-none"
            style={fieldBorder}
          />
          <p className="mt-1 text-[12px] text-[#9CA3AF]">
            Defaults to the pupil&rsquo;s home address if left blank.
          </p>
        </div>

        {/* Notes */}
        <div>
          <FieldLabel htmlFor="al-notes">Notes</FieldLabel>
          <textarea
            id="al-notes"
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full rounded-lg px-3 py-2 text-[14px] text-[#0B1F3A] bg-white focus:outline-none"
            style={fieldBorder}
          />
        </div>

        {/* Recurring */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "14px 16px",
            background: "#F7FAFC",
            border: "0.5px solid #E2E6ED",
            borderRadius: 10,
          }}
        >
          <div className="flex items-center" style={{ flex: 1, gap: 8 }}>
            <RefreshCw size={14} color="#9CA3AF" />
            <span style={{ fontSize: 14, color: "#0B1F3A" }}>Make this a recurring lesson</span>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={isRecurring}
            onClick={() => setIsRecurring((v) => !v)}
            style={{
              width: 42,
              height: 24,
              borderRadius: 999,
              background: isRecurring ? "#0B1F3A" : "#D1D5DB",
              position: "relative",
              transition: "background 0.15s",
            }}
          >
            <span
              style={{
                position: "absolute",
                top: 2,
                left: isRecurring ? 20 : 2,
                width: 20,
                height: 20,
                borderRadius: 999,
                background: "#FFFFFF",
                transition: "left 0.15s",
              }}
            />
          </button>
        </div>

        {isRecurring && (
          <div
            style={{
              padding: "12px 16px",
              background: "#FFFFFF",
              border: "0.5px solid #E2E6ED",
              borderRadius: 10,
            }}
          >
            <label style={{ display: "block", fontSize: 12, color: "#9CA3AF", marginBottom: 6 }}>
              Repeat
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(["weekly", "fortnightly"] as const).map((f) => {
                const active = recurringFreq === f;
                return (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setRecurringFreq(f)}
                    style={{
                      padding: "10px 0",
                      borderRadius: 10,
                      fontSize: 13,
                      fontWeight: 600,
                      background: active ? "#0B1F3A" : "#F7FAFC",
                      color: active ? "#FFFFFF" : "#0B1F3A",
                      border: active ? "none" : "0.5px solid #E2E6ED",
                      textTransform: "capitalize",
                    }}
                  >
                    {f}
                  </button>
                );
              })}
            </div>
            <label
              style={{
                display: "block",
                fontSize: 12,
                color: "#9CA3AF",
                marginBottom: 6,
                marginTop: 12,
              }}
            >
              Repeat until
            </label>
            <input
              type="date"
              value={recurringUntil}
              onChange={(e) => setRecurringUntil(e.target.value)}
              style={{
                width: "100%",
                height: 44,
                borderRadius: 10,
                border: "0.5px solid #E2E6ED",
                padding: "0 12px",
                fontSize: 14,
                color: "#0B1F3A",
              }}
            />
          </div>
        )}

        {errors.form && <ErrorText>{errors.form}</ErrorText>}
      </div>
    </BottomSheetV2>
  );
}

export default AddLessonSheet;

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { Input } from "../components/dsm/Input";
import { Button } from "../components/dsm/Button";
import { supabase } from "../lib/supabaseClient";
import { applyPricingRules, type PricingRule } from "../lib/pricingRules";
import { computeLessonAmount, fetchPostcodeRates } from "../lib/pricing/resolveRate";
import { PageLayout } from "@/components/PageLayout";

const UK_POSTCODE_RE = /([A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2})/i;
function extractPostcode(addr: string | null | undefined): string | undefined {
  if (!addr) return undefined;
  const m = addr.match(UK_POSTCODE_RE);
  return m ? m[1].toUpperCase() : undefined;
}



export const Route = createFileRoute("/lessons/new")({
  head: () => ({
    meta: [{ title: "Add lesson — DSM by EveryDriver" }],
  }),
  component: NewLessonPage,
});

interface Pupil {
  id: string;
  name: string;
  address: string | null;
  custom_rate: number | null;
  custom_rate_90: number | null;
  custom_rate_120: number | null;
  prepaid_hours: number | null;
}


// NOTE: Previous durations [30, 45, 60, 90, 120] were replaced with whole-hour
// options only (1h–6h = 60/120/180/240/300/360 min). If any existing bookings
// or availability logic relies on 30/45/90 minute lessons, review before removing.
const DURATION_HOURS = [1, 2, 3, 4, 5, 6];

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

function NewLessonPage() {
  const navigate = useNavigate();
  const [pupils, setPupils] = useState<Pupil[]>([]);
  const [pupilId, setPupilId] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [duration, setDuration] = useState(60);
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
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("pupils")
        .select("id, name, address, custom_rate, custom_rate_90, custom_rate_120, prepaid_hours")
        .eq("instructor_id", user.id)
        .is("deleted_at", null)
        .not("status", "in", "(inactive,archived,cancelled)")
        .order("name", { ascending: true });
      setPupils((data as Pupil[]) ?? []);

    })();
  }, []);

  // Prefill pickup with the selected pupil's home address when the
  // instructor hasn't manually edited the pickup field yet.
  useEffect(() => {
    if (pickupTouched) return;
    const p = pupils.find((x) => x.id === pupilId);
    setPickup(p?.address ?? "");
  }, [pupilId, pupils, pickupTouched]);

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
      setSaving(false);
      return;
    }
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
      durationMinutes: duration,
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
      console.warn("[lessons.new] pricing rules failed", e);
    }


    // If pupil has enough remaining prepaid hours, mark as prepaid so
    // balance/pill logic across the app treats it as covered.
    const lessonHours = duration / 60;
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
        const usedHours =
          (existing ?? []).reduce(
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
        console.warn("[lessons.new] prepaid check failed", e);
      }
    }

    const { error } = await supabase.from("lessons").insert({
      instructor_id: user.id,
      pupil_id: pupilId,
      lesson_date: date,
      lesson_time: `${time}:00`,
      duration_minutes: duration,
      status: "confirmed",
      notes: fullNotes,
      amount_due: amountDue,
      payment_status: paymentStatus,
      prepaid_hours_used: prepaidHoursUsed,
    });
    if (error) {
      setErrors({ form: error.message });
      setSaving(false);
      return;
    }
    navigate({ to: "/schedule" });
  }

  return (
    <PageLayout style={{ fontFamily: "Inter, sans-serif" }}>
      <div className="px-4 pt-6">
        <div className="flex items-center gap-3 mb-4">
          <button
            type="button"
            aria-label="Back to schedule"
            onClick={() => navigate({ to: "/schedule" })}
            className="flex items-center justify-center w-8 h-8 -ml-1"
          >
            <ArrowLeft size={20} color="#0B1F3A" />
          </button>
          <p
            className="text-[20px] font-semibold"
            style={{ color: "#0B1F3A", fontFamily: "Inter, sans-serif" }}
          >
            Add lesson
          </p>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSave();
          }}
          className="flex flex-col gap-4 mt-2"
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
            {errors.pupil && (
              <p className="mt-1 text-[12px]" style={{ color: "#1877D6" }}>
                {errors.pupil}
              </p>
            )}
          </div>

          <div>
            <Input
              label="Date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
            {errors.date && (
              <p className="mt-1 text-[12px]" style={{ color: "#1877D6" }}>
                {errors.date}
              </p>
            )}
          </div>

          <div>
            <Input
              label="Time"
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              step={60}
            />
            {errors.time && (
              <p className="mt-1 text-[12px]" style={{ color: "#1877D6" }}>
                {errors.time}
              </p>
            )}
          </div>

          <div>
            <FieldLabel htmlFor="duration">Duration</FieldLabel>
            <div
              id="duration"
              role="radiogroup"
              aria-label="Lesson duration"
              className="grid grid-cols-6 gap-2"
            >
              {DURATION_HOURS.map((h) => {
                const minutes = h * 60;
                const selected = duration === minutes;
                return (
                  <button
                    key={h}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => setDuration(minutes)}
                    className="cf-tap rounded-[12px] text-[14px] font-medium transition-colors"
                    style={{
                      padding: "14px 2px",
                      fontFamily: "Inter, sans-serif",
                      background: selected ? "#185FA5" : "#F3F8FF",
                      color: selected ? "#FFFFFF" : "#0B1F3A",
                      border: selected ? "none" : "1px solid #EEF2F7",
                    }}
                  >
                    {h}h
                  </button>
                );
              })}
            </div>
          </div>


          <div>
            <FieldLabel htmlFor="pickup">Pickup location</FieldLabel>
            <input
              id="pickup"
              type="text"
              value={pickup}
              onChange={(e) => {
                setPickupTouched(true);
                setPickup(e.target.value);
              }}
              placeholder={pupilId ? "Pupil's home address" : "Select a pupil first"}
              className="h-11 w-full rounded-lg px-3 text-[14px] text-[#0B1F3A] bg-white focus:border-[#1877D6] focus:outline-none"
              style={fieldBorder}
            />
            <p className="mt-1 text-[12px] text-[#9CA3AF]" style={{ fontFamily: "Inter, sans-serif" }}>
              Defaults to the pupil&rsquo;s home address if left blank.
            </p>
          </div>

          <div>
            <FieldLabel htmlFor="notes">Notes</FieldLabel>
            <textarea
              id="notes"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-lg px-3 py-2 text-[14px] text-[#0B1F3A] bg-white focus:border-[#1877D6] focus:outline-none"
              style={fieldBorder}
            />
          </div>

          {errors.form && (
            <p className="text-[12px]" style={{ color: "#1877D6" }}>
              {errors.form}
            </p>
          )}

          <div className="mt-2">
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save lesson"}
            </Button>
          </div>
        </form>
      </div>
    </PageLayout>
  );
}

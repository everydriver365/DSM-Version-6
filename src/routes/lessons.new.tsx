import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Input } from "../components/dsm/Input";
import { Button } from "../components/dsm/Button";
import { supabase } from "../lib/supabaseClient";
import { applyPricingRules, type PricingRule } from "../lib/pricingRules";

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
}

const DURATIONS = [30, 45, 60, 90, 120];

const fieldBorder: React.CSSProperties = {
  fontFamily: "Poppins, sans-serif",
  borderWidth: "0.5px",
  borderStyle: "solid",
  borderColor: "#E2E6ED",
};

function FieldLabel({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) {
  return (
    <label
      htmlFor={htmlFor}
      className="block mb-1 text-[12px] font-medium text-[#6B7280]"
      style={{ fontFamily: "Poppins, sans-serif" }}
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

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("pupils")
        .select("id, name, address")
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
    // Fetch instructor hourly rate
    const { data: instructor } = await supabase
      .from("instructors")
      .select("hourly_rate, default_lesson_duration_minutes")
      .eq("id", user.id)
      .single();

    const hourlyRate = (instructor as any)?.hourly_rate ?? 0;
    const baseCost = hourlyRate
      ? Math.round(((hourlyRate / 60) * duration) * 100) / 100
      : 0;

    // Apply pricing rules
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

    const { error } = await supabase.from("lessons").insert({
      instructor_id: user.id,
      pupil_id: pupilId,
      lesson_date: date,
      lesson_time: `${time}:00`,
      duration_minutes: duration,
      status: "confirmed",
      notes: fullNotes,
      amount_due: amountDue,
    });
    if (error) {
      setErrors({ form: error.message });
      setSaving(false);
      return;
    }
    navigate({ to: "/schedule" });
  }

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: "Poppins, sans-serif" }}>
      <div className="px-4 pt-6">
        <div className="flex items-center gap-3 mb-4">
          <button
            type="button"
            aria-label="Back to schedule"
            onClick={() => navigate({ to: "/schedule" })}
            className="flex items-center justify-center w-8 h-8 -ml-1"
          >
            <ArrowLeft size={20} color="#0F2044" />
          </button>
          <p
            className="text-[20px] font-semibold"
            style={{ color: "#0F2044", fontFamily: "Poppins, sans-serif" }}
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
              className="h-11 w-full rounded-lg px-3 text-[14px] text-[#1A1A2E] bg-white focus:border-[#1A52A0] focus:outline-none"
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
              <p className="mt-1 text-[12px]" style={{ color: "#CC2229" }}>
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
              <p className="mt-1 text-[12px]" style={{ color: "#CC2229" }}>
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
              <p className="mt-1 text-[12px]" style={{ color: "#CC2229" }}>
                {errors.time}
              </p>
            )}
          </div>

          <div>
            <FieldLabel htmlFor="duration">Duration</FieldLabel>
            <select
              id="duration"
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              className="h-11 w-full rounded-lg px-3 text-[14px] text-[#1A1A2E] bg-white focus:border-[#1A52A0] focus:outline-none"
              style={fieldBorder}
            >
              {DURATIONS.map((m) => (
                <option key={m} value={m}>
                  {m} min
                </option>
              ))}
            </select>
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
              className="h-11 w-full rounded-lg px-3 text-[14px] text-[#1A1A2E] bg-white focus:border-[#1A52A0] focus:outline-none"
              style={fieldBorder}
            />
            <p className="mt-1 text-[12px] text-[#9CA3AF]" style={{ fontFamily: "Poppins, sans-serif" }}>
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
              className="w-full rounded-lg px-3 py-2 text-[14px] text-[#1A1A2E] bg-white focus:border-[#1A52A0] focus:outline-none"
              style={fieldBorder}
            />
          </div>

          {errors.form && (
            <p className="text-[12px]" style={{ color: "#CC2229" }}>
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
    </div>
  );
}

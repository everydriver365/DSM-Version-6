import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { ChevronLeft, Loader2, MapPin } from "lucide-react";
import { Input } from "../components/dsm/Input";
import { supabase } from "../lib/supabaseClient";


export const Route = createFileRoute("/courses/new")({
  head: () => ({
    meta: [
      { title: "New course — DSM by EveryDriver" },
      { name: "description", content: "Build a new driving course package." },
    ],
  }),
  component: NewCoursePage,
});

const POPPINS = { fontFamily: "Poppins, sans-serif" } as const;

type CourseType = "intensive" | "semi-intensive" | "weekly" | "custom";
type RepeatType = "one-off" | "weekly" | "monthly";
type TimePref = "morning" | "afternoon" | "evening" | "flexible";

const HOUR_OPTIONS = [8, 10, 15, 20, 25, 28, 30, 35, 40];
const RADIUS_OPTIONS = [1, 3, 5, 10, 15, 20, 30];

// SQL to run manually:
// alter table instructor_courses add column if not exists radius_miles integer default 10;
// alter table instructor_courses add column if not exists pickup_lat double precision;
// alter table instructor_courses add column if not exists pickup_lng double precision;

const UK_POSTCODE_RE = /^[A-Z]{1,2}[0-9][A-Z0-9]? ?[0-9][A-Z]{2}$/i;
const UK_OUTCODE_RE = /^[A-Z]{1,2}[0-9][A-Z0-9]?$/i;
function isValidUKPostcode(value: string): boolean {
  const v = value.trim();
  return UK_POSTCODE_RE.test(v) || UK_OUTCODE_RE.test(v);
}
const PICKUP_ERROR_MSG = "Please enter a valid UK postcode or outcode (e.g. SO22 or SO22 5DB)";



const TYPE_META: Record<
  CourseType,
  { label: string; color: string; bg: string; desc: string }
> = {
  intensive: { label: "Intensive", color: "#CC2229", bg: "#fbe8e8", desc: "All hours in one week" },
  "semi-intensive": { label: "Semi-intensive", color: "#F59E0B", bg: "#fff4e0", desc: "Spread over 2–4 weeks" },
  weekly: { label: "Weekly lessons", color: "#16A34A", bg: "#e7f6ec", desc: "Regular weekly slots" },
  custom: { label: "Custom", color: "#1A52A0", bg: "#e8eefb", desc: "You define the schedule" },
};

function ymd(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function autoName(t: CourseType, hours: number, includesTest: boolean) {
  const base = `${hours} Hour ${TYPE_META[t].label}`;
  return includesTest ? `${base} + Test` : base;
}

function NewCoursePage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [userId, setUserId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1
  const [courseType, setCourseType] = useState<CourseType>("intensive");
  const [hours, setHours] = useState<number>(10);
  const [includesTest, setIncludesTest] = useState(false);
  const [name, setName] = useState<string>(autoName("intensive", 10, false));
  const [nameTouched, setNameTouched] = useState(false);
  const [description, setDescription] = useState("");
  const [maxSpaces, setMaxSpaces] = useState<number>(1);
  const [maxSpacesTouched, setMaxSpacesTouched] = useState(false);

  // Step 2
  const [startDate, setStartDate] = useState<string>("");
  const [dailyHours, setDailyHours] = useState<number>(4);
  const [repeatType, setRepeatType] = useState<RepeatType>("one-off");
  const [pickupArea, setPickupArea] = useState("");
  const [pickupLat, setPickupLat] = useState<number | null>(null);
  const [pickupLng, setPickupLng] = useState<number | null>(null);
  const [pickupError, setPickupError] = useState<string | null>(null);
  const [radiusMiles, setRadiusMiles] = useState<number>(10);
  const [timePref, setTimePref] = useState<TimePref>("flexible");


  // Step 3
  const [price, setPrice] = useState<string>("");
  const [deposit, setDeposit] = useState<string>("");
  const [depositOnly, setDepositOnly] = useState(false);
  const [earlyBird, setEarlyBird] = useState(false);
  const [earlyBirdAmount, setEarlyBirdAmount] = useState<string>("");
  const [earlyBirdExpiry, setEarlyBirdExpiry] = useState<string>("");
  const [payFull, setPayFull] = useState(true);
  const [payDeposit, setPayDeposit] = useState(true);
  const [publishMarketplace, setPublishMarketplace] = useState(true);
  const [publishWebsite, setPublishWebsite] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      setUserId(data.user?.id ?? null);
    })();
  }, []);

  // Auto-update name when type/hours/test changes (unless edited)
  useEffect(() => {
    if (!nameTouched) setName(autoName(courseType, hours, includesTest));
  }, [courseType, hours, includesTest, nameTouched]);

  // Default max spaces based on type
  useEffect(() => {
    if (maxSpacesTouched) return;
    setMaxSpaces(courseType === "intensive" || courseType === "semi-intensive" ? 1 : 6);
  }, [courseType, maxSpacesTouched]);

  // End date = startDate + ceil(hours / dailyHours) days
  const endDate = useMemo(() => {
    if (!startDate || !dailyHours || dailyHours <= 0) return "";
    const days = Math.max(1, Math.ceil(hours / dailyHours));
    const d = new Date(startDate + "T00:00:00");
    d.setDate(d.getDate() + days - 1);
    return ymd(d);
  }, [startDate, dailyHours, hours]);

  const repeatAllowed = courseType === "weekly" || courseType === "semi-intensive";

  async function submit(status: "active" | "draft") {
    setSaving(true);
    setError(null);

    // Re-confirm the auth user at submit time (state may not be hydrated yet)
    let uid = userId;
    if (!uid) {
      const { data: authData, error: authErr } = await supabase.auth.getUser();
      if (authErr) console.error("[courses.new] auth.getUser error", authErr);
      uid = authData.user?.id ?? null;
      if (uid) setUserId(uid);
    }
    if (!uid) {
      setSaving(false);
      setError("You must be signed in to publish a course");
      toast.error("You must be signed in to publish a course");
      return;
    }

    // Required-field validation
    const missing: string[] = [];
    if (!courseType) missing.push("course_type");
    if (!name.trim()) missing.push("name");
    if (!hours || parseFloat(String(hours)) <= 0) missing.push("total_hours");
    if (status === "active") {
      if (!price || parseFloat(price) <= 0) missing.push("price");
      if (!startDate) missing.push("start_date");
    }
    // Pickup area is required and must be a valid UK postcode/outcode (always)
    if (!isValidUKPostcode(pickupArea)) {
      setSaving(false);
      setPickupError(PICKUP_ERROR_MSG);
      setError(PICKUP_ERROR_MSG);
      toast.error(PICKUP_ERROR_MSG);
      setStep(2);
      return;
    }

    if (missing.length > 0) {
      setSaving(false);
      const msg = `Missing required fields: ${missing.join(", ")}`;
      setError(msg);
      toast.error(msg);
      if (missing.includes("name") || missing.includes("total_hours") || missing.includes("course_type")) setStep(1);
      else if (missing.includes("start_date")) setStep(2);
      else if (missing.includes("price")) setStep(3);
      return;
    }


    const payload = {
      instructor_id: uid,
      course_type: courseType,
      name: name.trim(),
      total_hours: parseFloat(String(hours)),
      includes_test: includesTest,
      description: description.trim() || null,
      max_spaces: Number(maxSpaces),
      start_date: startDate || null,
      end_date: endDate || null,
      daily_hours: dailyHours || null,
      repeat_type: repeatAllowed ? repeatType : "one-off",
      pickup_area: pickupArea.trim() || null,
      radius_miles: Number(radiusMiles) || 10,
      lesson_time_preference: timePref,
      price: parseFloat(price || "0"),
      deposit_amount: parseFloat(deposit || "0"),
      deposit_only_to_book: depositOnly,
      early_bird_discount: earlyBird ? parseFloat(earlyBirdAmount || "0") : 0,
      early_bird_expiry: earlyBird && earlyBirdExpiry ? earlyBirdExpiry : null,
      publish_marketplace: publishMarketplace,
      publish_mini_website: publishWebsite,
      status,
    };

    const { error: insertError } = await supabase
      .from("instructor_courses")
      .insert(payload)
      .select()
      .single();

    setSaving(false);

    if (insertError) {
      setError(insertError.message || "Failed to publish course");
      toast.error(insertError.message || "Failed to publish course");
      return;
    }

    toast.success(status === "active" ? "Course published!" : "Saved as draft");
    navigate({ to: "/courses" });
  }

  function goNext() {
    if (step === 2 && !isValidUKPostcode(pickupArea)) {
      setPickupError(PICKUP_ERROR_MSG);
      toast.error(PICKUP_ERROR_MSG);
      return;
    }
    if (step < 3) setStep((step + 1) as 1 | 2 | 3);
  }




  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#F2F4F8", ...POPPINS, paddingBottom: 24 }}>
      {/* Top bar */}
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          backgroundColor: "#0F2044",
          padding: "14px 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <button
          onClick={() => navigate({ to: "/courses" })}
          style={{ background: "none", border: "none", cursor: "pointer", color: "#fff", display: "flex" }}
          aria-label="Back"
        >
          <ChevronLeft size={24} />
        </button>
        <h1 style={{ color: "#fff", fontSize: 16, fontWeight: 700, margin: 0 }}>New course</h1>
        <button
          onClick={() => {
            if (step < 3) {
              goNext();
              return;
            }
            submit("active");
          }}
          disabled={saving}
          style={{
            background: "none",
            border: "none",
            cursor: saving ? "not-allowed" : "pointer",
            color: "#fff",
            fontWeight: 700,
            fontSize: 14,
            opacity: saving ? 0.5 : step < 3 ? 0.7 : 1,
          }}
        >
          {step < 3 ? "Next" : "Publish"}
        </button>

      </div>

      {/* Step indicator */}
      <div style={{ display: "flex", gap: 8, padding: "12px 16px" }}>
        {[
          { n: 1, label: "Details" },
          { n: 2, label: "Schedule" },
          { n: 3, label: "Pricing" },
        ].map((s) => {
          const active = step === (s.n as 1 | 2 | 3);
          const done = step > s.n;
          return (
            <button
              key={s.n}
              onClick={() => setStep(s.n as 1 | 2 | 3)}
              style={{
                flex: 1,
                background: active ? "#1A52A0" : done ? "#e8eefb" : "#fff",
                color: active ? "#fff" : "#1A52A0",
                border: "1px solid #e3e6ec",
                borderRadius: 10,
                padding: "8px 6px",
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
                fontFamily: "Poppins, sans-serif",
              }}
            >
              {s.n}. {s.label}
            </button>
          );
        })}
      </div>

      <div style={{ padding: "0 16px" }}>
        {step === 1 && (
          <Step1
            courseType={courseType}
            setCourseType={setCourseType}
            hours={hours}
            setHours={setHours}
            includesTest={includesTest}
            setIncludesTest={setIncludesTest}
            name={name}
            setName={(v) => { setName(v); setNameTouched(true); }}
            description={description}
            setDescription={setDescription}
            maxSpaces={maxSpaces}
            setMaxSpaces={(n) => { setMaxSpaces(n); setMaxSpacesTouched(true); }}
          />
        )}
        {step === 2 && (
          <Step2
            startDate={startDate}
            setStartDate={setStartDate}
            dailyHours={dailyHours}
            setDailyHours={setDailyHours}
            endDate={endDate}
            repeatAllowed={repeatAllowed}
            repeatType={repeatType}
            setRepeatType={setRepeatType}
            pickupArea={pickupArea}
            setPickupArea={(v) => { setPickupArea(v); if (pickupError) setPickupError(null); }}
            pickupError={pickupError}
            radiusMiles={radiusMiles}
            setRadiusMiles={setRadiusMiles}
            timePref={timePref}
            setTimePref={setTimePref}
          />
        )}
        {step === 3 && (
          <Step3
            price={price}
            setPrice={setPrice}
            deposit={deposit}
            setDeposit={setDeposit}
            depositOnly={depositOnly}
            setDepositOnly={setDepositOnly}
            earlyBird={earlyBird}
            setEarlyBird={setEarlyBird}
            earlyBirdAmount={earlyBirdAmount}
            setEarlyBirdAmount={setEarlyBirdAmount}
            earlyBirdExpiry={earlyBirdExpiry}
            setEarlyBirdExpiry={setEarlyBirdExpiry}
            payFull={payFull}
            setPayFull={setPayFull}
            payDeposit={payDeposit}
            setPayDeposit={setPayDeposit}
            publishMarketplace={publishMarketplace}
            setPublishMarketplace={setPublishMarketplace}
            publishWebsite={publishWebsite}
            setPublishWebsite={setPublishWebsite}
          />
        )}

        {/* Step nav */}
        <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
          {step > 1 && (
            <button
              onClick={() => setStep((step - 1) as 1 | 2 | 3)}
              style={{
                flex: 1,
                height: 44,
                background: "#fff",
                color: "#1A52A0",
                border: "1px solid #1A52A0",
                borderRadius: 10,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "Poppins, sans-serif",
              }}
            >Back</button>
          )}
          {step < 3 ? (
            <button
              onClick={goNext}
              style={{
                flex: 1,
                height: 44,
                background: "#1A52A0",
                color: "#fff",
                border: "none",
                borderRadius: 10,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "Poppins, sans-serif",
              }}
            >Next</button>
          ) : (
            <>
              <button
                onClick={() => submit("draft")}
                disabled={saving}
                style={{
                  flex: 1,
                  height: 44,
                  background: "#fff",
                  color: "#1A52A0",
                  border: "1px solid #1A52A0",
                  borderRadius: 10,
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: "Poppins, sans-serif",
                }}
              >Save draft</button>
              <button
                onClick={() => submit("active")}
                disabled={saving}
                style={{
                  flex: 1.4,
                  height: 44,
                  background: "#16A34A",
                  color: "#fff",
                  border: "none",
                  borderRadius: 10,
                  fontWeight: 700,
                  cursor: saving ? "not-allowed" : "pointer",
                  fontFamily: "Poppins, sans-serif",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  opacity: saving ? 0.7 : 1,
                }}
              >
                {saving && <Loader2 size={16} className="animate-spin" />}
                {saving ? "Publishing…" : "Publish course"}
              </button>
            </>
          )}
        </div>

        {error && (
          <div style={{ marginTop: 12, color: "#CC2229", fontSize: 13, fontWeight: 500, textAlign: "center" }}>
            {error}
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------- Step 1 ---------- */
function Step1(props: {
  courseType: CourseType;
  setCourseType: (t: CourseType) => void;
  hours: number;
  setHours: (n: number) => void;
  includesTest: boolean;
  setIncludesTest: (v: boolean) => void;
  name: string;
  setName: (v: string) => void;
  description: string;
  setDescription: (v: string) => void;
  maxSpaces: number;
  setMaxSpaces: (n: number) => void;
}) {
  const {
    courseType, setCourseType, hours, setHours, includesTest, setIncludesTest,
    name, setName, description, setDescription, maxSpaces, setMaxSpaces,
  } = props;
  const maxSpacesCap = courseType === "intensive" ? 4 : 20;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <FieldLabel>Course type</FieldLabel>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        {(Object.keys(TYPE_META) as CourseType[]).map((t) => {
          const meta = TYPE_META[t];
          const active = courseType === t;
          return (
            <button
              key={t}
              onClick={() => setCourseType(t)}
              style={{
                textAlign: "left",
                padding: 12,
                borderRadius: 12,
                border: `2px solid ${active ? meta.color : "#e3e6ec"}`,
                background: active ? meta.bg : "#fff",
                cursor: "pointer",
                fontFamily: "Poppins, sans-serif",
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 800, color: meta.color }}>{meta.label}</div>
              <div style={{ fontSize: 11, color: "#6B7280", marginTop: 4 }}>{meta.desc}</div>
            </button>
          );
        })}
      </div>

      <Input
        label="Course name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="e.g. 10 Hour Intensive"
      />

      <div>
        <FieldLabel>Total hours</FieldLabel>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {HOUR_OPTIONS.map((h) => {
            const active = hours === h;
            return (
              <button
                key={h}
                onClick={() => setHours(h)}
                style={{
                  padding: "8px 12px",
                  borderRadius: 8,
                  border: `1px solid ${active ? "#1A52A0" : "#e3e6ec"}`,
                  background: active ? "#1A52A0" : "#fff",
                  color: active ? "#fff" : "#1A1A2E",
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: "pointer",
                  fontFamily: "Poppins, sans-serif",
                }}
              >
                {h}h{h === 28 ? " (test week)" : ""}
              </button>
            );
          })}
        </div>
      </div>

      <ToggleRow
        label="Includes driving test"
        sublabel="Adds test booking to the package"
        value={includesTest}
        onChange={setIncludesTest}
      />

      <div>
        <FieldLabel>Description</FieldLabel>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Shown on public listing"
          rows={4}
          style={{
            width: "100%",
            borderRadius: 10,
            border: "0.5px solid #E2E6ED",
            padding: 10,
            fontSize: 14,
            fontFamily: "Poppins, sans-serif",
            background: "#fff",
            resize: "vertical",
          }}
        />
      </div>

      <Input
        label={`Max spaces (1–${maxSpacesCap})`}
        type="number"
        min={1}
        max={maxSpacesCap}
        value={String(maxSpaces)}
        onChange={(e) => {
          const n = Number(e.target.value);
          if (!Number.isNaN(n)) setMaxSpaces(Math.min(maxSpacesCap, Math.max(1, n)));
        }}
      />
    </div>
  );
}

/* ---------- Step 2 ---------- */
function Step2(props: {
  startDate: string;
  setStartDate: (v: string) => void;
  dailyHours: number;
  setDailyHours: (n: number) => void;
  endDate: string;
  repeatAllowed: boolean;
  repeatType: RepeatType;
  setRepeatType: (v: RepeatType) => void;
  pickupArea: string;
  setPickupArea: (v: string) => void;
  pickupError: string | null;
  radiusMiles: number;
  setRadiusMiles: (n: number) => void;
  timePref: TimePref;
  setTimePref: (v: TimePref) => void;
}) {
  const {
    startDate, setStartDate, dailyHours, setDailyHours, endDate,
    repeatAllowed, repeatType, setRepeatType, pickupArea, setPickupArea,
    pickupError, radiusMiles, setRadiusMiles,
    timePref, setTimePref,
  } = props;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <Input
        label="Start date"
        type="date"
        value={startDate}
        onChange={(e) => setStartDate(e.target.value)}
      />
      <Input
        label="Hours per day"
        type="number"
        min={1}
        max={10}
        step={0.5}
        value={String(dailyHours)}
        onChange={(e) => setDailyHours(Number(e.target.value) || 1)}
      />
      <div>
        <FieldLabel>End date (auto)</FieldLabel>
        <div
          style={{
            height: 44,
            display: "flex",
            alignItems: "center",
            padding: "0 12px",
            background: "#F2F4F8",
            border: "0.5px solid #E2E6ED",
            borderRadius: 10,
            color: "#1A1A2E",
            fontSize: 14,
            fontFamily: "Poppins, sans-serif",
          }}
        >
          {endDate
            ? new Date(endDate + "T00:00:00").toLocaleDateString("en-GB", {
                day: "numeric", month: "short", year: "numeric",
              })
            : "—"}
        </div>
      </div>

      {repeatAllowed && (
        <div>
          <FieldLabel>Repeat</FieldLabel>
          <div style={{ display: "flex", gap: 6 }}>
            {([
              ["one-off", "One-off"],
              ["weekly", "Weekly"],
              ["monthly", "Monthly"],
            ] as Array<[RepeatType, string]>).map(([k, label]) => {
              const active = repeatType === k;
              return (
                <button
                  key={k}
                  onClick={() => setRepeatType(k)}
                  style={{
                    flex: 1,
                    height: 40,
                    borderRadius: 10,
                    border: `1px solid ${active ? "#1A52A0" : "#e3e6ec"}`,
                    background: active ? "#1A52A0" : "#fff",
                    color: active ? "#fff" : "#1A1A2E",
                    fontWeight: 600,
                    fontSize: 13,
                    cursor: "pointer",
                    fontFamily: "Poppins, sans-serif",
                  }}
                >{label}</button>
              );
            })}
          </div>
        </div>
      )}

      <div>
        <FieldLabel>
          Pickup area <span style={{ color: "#CC2229" }}>*</span>
        </FieldLabel>
        <Input
          value={pickupArea}
          onChange={(e) => setPickupArea(e.target.value)}
          placeholder="e.g. SO23 or SO23 9AA"
        />
        {pickupError && (
          <div style={{ color: "#CC2229", fontSize: 12, marginTop: 4, fontFamily: "Poppins, sans-serif" }}>
            {pickupError}
          </div>
        )}
      </div>

      <div>
        <FieldLabel>Coverage radius</FieldLabel>
        <select
          value={radiusMiles}
          onChange={(e) => setRadiusMiles(Number(e.target.value))}
          style={{
            width: "100%",
            height: 44,
            borderRadius: 10,
            border: "0.5px solid #E2E6ED",
            padding: "0 10px",
            fontSize: 14,
            fontFamily: "Poppins, sans-serif",
            background: "#fff",
            color: "#1A1A2E",
          }}
        >
          {RADIUS_OPTIONS.map((m) => (
            <option key={m} value={m}>{m} mile{m === 1 ? "" : "s"}</option>
          ))}
        </select>
      </div>



      <div>
        <FieldLabel>Lesson times</FieldLabel>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
          {([
            ["morning", "Morning (08:00–12:00)"],
            ["afternoon", "Afternoon (12:00–17:00)"],
            ["evening", "Evening (17:00–20:00)"],
            ["flexible", "Flexible"],
          ] as Array<[TimePref, string]>).map(([k, label]) => {
            const active = timePref === k;
            return (
              <button
                key={k}
                onClick={() => setTimePref(k)}
                style={{
                  height: 44,
                  borderRadius: 10,
                  border: `1px solid ${active ? "#1A52A0" : "#e3e6ec"}`,
                  background: active ? "#1A52A0" : "#fff",
                  color: active ? "#fff" : "#1A1A2E",
                  fontWeight: 600,
                  fontSize: 12,
                  cursor: "pointer",
                  fontFamily: "Poppins, sans-serif",
                }}
              >{label}</button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ---------- Step 3 ---------- */
function Step3(props: {
  price: string; setPrice: (v: string) => void;
  deposit: string; setDeposit: (v: string) => void;
  depositOnly: boolean; setDepositOnly: (v: boolean) => void;
  earlyBird: boolean; setEarlyBird: (v: boolean) => void;
  earlyBirdAmount: string; setEarlyBirdAmount: (v: string) => void;
  earlyBirdExpiry: string; setEarlyBirdExpiry: (v: string) => void;
  payFull: boolean; setPayFull: (v: boolean) => void;
  payDeposit: boolean; setPayDeposit: (v: boolean) => void;
  publishMarketplace: boolean; setPublishMarketplace: (v: boolean) => void;
  publishWebsite: boolean; setPublishWebsite: (v: boolean) => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <Input
        label="Price (£)"
        type="number"
        min={0}
        value={props.price}
        onChange={(e) => props.setPrice(e.target.value)}
        placeholder="e.g. 350"
      />
      <Input
        label="Deposit amount (£, optional)"
        type="number"
        min={0}
        value={props.deposit}
        onChange={(e) => props.setDeposit(e.target.value)}
        placeholder="e.g. 50"
      />
      <ToggleRow
        label="Deposit only to book"
        sublabel="Balance due before lessons start"
        value={props.depositOnly}
        onChange={props.setDepositOnly}
      />

      <ToggleRow
        label="Early bird discount"
        sublabel="Offer a discount for early bookings"
        value={props.earlyBird}
        onChange={props.setEarlyBird}
      />
      {props.earlyBird && (
        <div style={{ display: "flex", gap: 8 }}>
          <div style={{ flex: 1 }}>
            <Input
              label="Amount off (£)"
              type="number"
              min={0}
              value={props.earlyBirdAmount}
              onChange={(e) => props.setEarlyBirdAmount(e.target.value)}
            />
          </div>
          <div style={{ flex: 1 }}>
            <Input
              label="Expires"
              type="date"
              value={props.earlyBirdExpiry}
              onChange={(e) => props.setEarlyBirdExpiry(e.target.value)}
            />
          </div>
        </div>
      )}

      <div>
        <FieldLabel>Payment options</FieldLabel>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <CheckRow label="Full upfront" checked={props.payFull} onChange={props.setPayFull} />
          <CheckRow label="Deposit + balance" checked={props.payDeposit} onChange={props.setPayDeposit} />
          <CheckRow label="Klarna / Clearpay (coming soon)" checked={false} onChange={() => {}} disabled />
        </div>
      </div>

      <ToggleRow
        label="Publish to EveryDriver marketplace"
        value={props.publishMarketplace}
        onChange={props.setPublishMarketplace}
      />
      <ToggleRow
        label="Publish to my mini website"
        value={props.publishWebsite}
        onChange={props.setPublishWebsite}
      />
    </div>
  );
}

/* ---------- shared bits ---------- */
function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 12,
        fontWeight: 600,
        color: "#6B7280",
        marginBottom: 6,
        fontFamily: "Poppins, sans-serif",
      }}
    >
      {children}
    </div>
  );
}

function ToggleRow({
  label, sublabel, value, onChange,
}: {
  label: string;
  sublabel?: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      onClick={() => onChange(!value)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: 12,
        background: "#fff",
        border: "0.5px solid #E2E6ED",
        borderRadius: 10,
        cursor: "pointer",
        textAlign: "left",
        fontFamily: "Poppins, sans-serif",
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: "#1A1A2E" }}>{label}</div>
        {sublabel && (
          <div style={{ fontSize: 12, color: "#6B7280", marginTop: 2 }}>{sublabel}</div>
        )}
      </div>
      <div
        style={{
          width: 40,
          height: 24,
          borderRadius: 12,
          background: value ? "#16A34A" : "#E2E6ED",
          position: "relative",
          transition: "background 150ms",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 2,
            left: value ? 18 : 2,
            width: 20,
            height: 20,
            borderRadius: "50%",
            background: "#fff",
            transition: "left 150ms",
            boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
          }}
        />
      </div>
    </button>
  );
}

function CheckRow({
  label, checked, onChange, disabled,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "10px 12px",
        background: "#fff",
        border: "0.5px solid #E2E6ED",
        borderRadius: 10,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        textAlign: "left",
        fontFamily: "Poppins, sans-serif",
        fontSize: 14,
        color: "#1A1A2E",
      }}
    >
      <div
        style={{
          width: 20,
          height: 20,
          borderRadius: 4,
          border: `1.5px solid ${checked ? "#1A52A0" : "#9CA3AF"}`,
          background: checked ? "#1A52A0" : "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {checked && (
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M2 6L5 9L10 3" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </div>
      <span>{label}</span>
    </button>
  );
}

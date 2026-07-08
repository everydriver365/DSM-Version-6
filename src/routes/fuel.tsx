import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Settings as SettingsIcon, Fuel as FuelIcon } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "../lib/supabaseClient";

export const Route = createFileRoute("/fuel")({
  head: () => ({ meta: [{ title: "Fuel costs — DSM by EveryDriver" }] }),
  component: FuelPage,
});

const POPPINS = { fontFamily: "Inter, sans-serif" } as const;
const NAVY = "#0B1F3A";
const BORDER = "0.5px solid #EEF2F7";
const LITRES_PER_GALLON = 4.546;
const LESSON_AVG_SPEED_MPH = 20;
const HMRC_RATE = 0.45;

type FuelType = "petrol" | "diesel" | "electric" | "hybrid";

type Settings = {
  fuel_type: FuelType;
  fuel_price: number;
  vehicle_mpg: number;
  vehicle_miles_per_kwh: number;
};

const DEFAULTS: Settings = {
  fuel_type: "petrol",
  fuel_price: 1.5,
  vehicle_mpg: 40,
  vehicle_miles_per_kwh: 3.5,
};

type Journey = {
  id: string;
  trip_date: string | null;
  distance_miles: number | null;
  fuel_cost: number | null;
  purpose: string | null;
};

type Lesson = {
  id: string;
  lesson_date: string | null;
  duration_minutes: number | null;
  pupil_id: string | null;
};

type Pupil = { id: string; first_name: string | null; last_name: string | null };

function monthRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return { start: fmt(start), end: fmt(end) };
}

function FuelPage() {
  const navigate = useNavigate();
  const [instructorId, setInstructorId] = useState<string | null>(null);
  const [settings, setSettings] = useState<Settings>(DEFAULTS);
  const [saving, setSaving] = useState(false);
  const [journeys, setJourneys] = useState<Journey[]>([]);
  const [allJourneysMonth, setAllJourneysMonth] = useState<Journey[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [pupils, setPupils] = useState<Record<string, Pupil>>({});

  useEffect(() => {
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth?.user?.id;
      if (!uid) return;
      setInstructorId(uid);

      const { data: instr } = await supabase
        .from("instructors")
        .select("fuel_type, fuel_price, vehicle_mpg, vehicle_miles_per_kwh")
        .eq("id", uid)
        .maybeSingle();
      if (instr) {
        setSettings({
          fuel_type: (instr.fuel_type as FuelType) || DEFAULTS.fuel_type,
          fuel_price: Number(instr.fuel_price ?? DEFAULTS.fuel_price),
          vehicle_mpg: Number(instr.vehicle_mpg ?? DEFAULTS.vehicle_mpg),
          vehicle_miles_per_kwh: Number(instr.vehicle_miles_per_kwh ?? DEFAULTS.vehicle_miles_per_kwh),
        });
      }

      const { start, end } = monthRange();

      const { data: monthLogs } = await supabase
        .from("mileage_logs")
        .select("id, trip_date, distance_miles, fuel_cost, purpose")
        .eq("instructor_id", uid)
        .gte("trip_date", start)
        .lt("trip_date", end);
      setAllJourneysMonth(monthLogs || []);

      const { data: recentLogs } = await supabase
        .from("mileage_logs")
        .select("id, trip_date, distance_miles, fuel_cost, purpose")
        .eq("instructor_id", uid)
        .order("trip_date", { ascending: false })
        .limit(5);
      setJourneys(recentLogs || []);

      const { data: monthLessons } = await supabase
        .from("lessons")
        .select("id, lesson_date, duration_minutes, pupil_id")
        .eq("instructor_id", uid)
        .gte("lesson_date", start)
        .lt("lesson_date", end)
        .is("deleted_at", null);
      setLessons(monthLessons || []);

      const pupilIds = Array.from(new Set((monthLessons || []).map((l) => l.pupil_id).filter(Boolean) as string[]));
      if (pupilIds.length) {
        const { data: ps } = await supabase
          .from("pupils")
          .select("id, first_name, last_name")
          .in("id", pupilIds);
        const map: Record<string, Pupil> = {};
        (ps || []).forEach((p) => { map[p.id] = p as Pupil; });
        setPupils(map);
      }
    })();
  }, []);

  const isElectric = settings.fuel_type === "electric";

  async function saveSettings() {
    if (!instructorId) return;
    setSaving(true);
    const { error } = await supabase
      .from("instructors")
      .update({
        fuel_type: settings.fuel_type,
        fuel_price: settings.fuel_price,
        vehicle_mpg: settings.vehicle_mpg,
        vehicle_miles_per_kwh: settings.vehicle_miles_per_kwh,
      })
      .eq("id", instructorId);
    setSaving(false);
    if (error) toast.error("Failed to save settings");
    else toast.success("Settings saved");
  }

  function costForMiles(miles: number) {
    if (isElectric) {
      const mpkwh = settings.vehicle_miles_per_kwh || 1;
      return (miles / mpkwh) * settings.fuel_price;
    }
    const mpg = settings.vehicle_mpg || 1;
    return (miles / mpg) * settings.fuel_price * LITRES_PER_GALLON;
  }

  const totalMiles = useMemo(
    () => allJourneysMonth.reduce((s, j) => s + Number(j.distance_miles || 0), 0),
    [allJourneysMonth]
  );
  const totalFuelCost = useMemo(() => costForMiles(totalMiles), [totalMiles, settings]);
  const lessonCount = lessons.length;
  const costPerLesson = lessonCount > 0 ? totalFuelCost / lessonCount : 0;
  const hmrcAllowance = Math.min(totalMiles, 10000) * HMRC_RATE;
  const profitVsHmrc = hmrcAllowance - totalFuelCost;

  const perLesson = useMemo(() => {
    return lessons
      .slice()
      .sort((a, b) => (b.lesson_date || "").localeCompare(a.lesson_date || ""))
      .map((l) => {
        const miles = ((l.duration_minutes || 0) / 60) * LESSON_AVG_SPEED_MPH;
        const cost = costForMiles(miles);
        const p = l.pupil_id ? pupils[l.pupil_id] : null;
        const name = p ? `${p.first_name || ""} ${p.last_name || ""}`.trim() : "Pupil";
        return { id: l.id, date: l.lesson_date, name, miles, cost };
      });
  }, [lessons, pupils, settings]);

  return (
    <div style={{ minHeight: "100vh", background: "#FFFFFF", ...POPPINS, paddingBottom: 32 }}>
      {/* Top bar */}
      <div
        style={{
          background: NAVY,
          color: "#FFFFFF",
          padding: "14px 16px",
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <button
          onClick={() => navigate({ to: "/home" })}
          aria-label="Back"
          style={{ background: "transparent", border: "none", color: "#FFFFFF", padding: 4, cursor: "pointer" }}
        >
          <ArrowLeft size={22} />
        </button>
        <h1 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>Fuel costs</h1>
      </div>

      {/* SECTION 1 — Settings */}
      <section style={cardStyle({ mt: 16 })}>
        <SectionHeading icon={<SettingsIcon size={16} color={NAVY} />} title="Fuel settings" />
        <Field label="Fuel type">
          <select
            value={settings.fuel_type}
            onChange={(e) => setSettings({ ...settings, fuel_type: e.target.value as FuelType })}
            style={inputStyle}
          >
            <option value="petrol">Petrol</option>
            <option value="diesel">Diesel</option>
            <option value="electric">Electric</option>
            <option value="hybrid">Hybrid</option>
          </select>
        </Field>

        {!isElectric && (
          <>
            <Field label="Price per litre (£)">
              <input
                type="number"
                step="0.01"
                value={settings.fuel_price}
                onChange={(e) => setSettings({ ...settings, fuel_price: Number(e.target.value) })}
                style={inputStyle}
              />
            </Field>
            <Field label="MPG (miles per gallon)">
              <input
                type="number"
                step="0.1"
                value={settings.vehicle_mpg}
                onChange={(e) => setSettings({ ...settings, vehicle_mpg: Number(e.target.value) })}
                style={inputStyle}
              />
            </Field>
          </>
        )}

        {isElectric && (
          <>
            <Field label="Price per kWh (£)">
              <input
                type="number"
                step="0.01"
                value={settings.fuel_price}
                onChange={(e) => setSettings({ ...settings, fuel_price: Number(e.target.value) })}
                style={inputStyle}
              />
            </Field>
            <Field label="Miles per kWh">
              <input
                type="number"
                step="0.1"
                value={settings.vehicle_miles_per_kwh}
                onChange={(e) => setSettings({ ...settings, vehicle_miles_per_kwh: Number(e.target.value) })}
                style={inputStyle}
              />
            </Field>
          </>
        )}

        <button
          onClick={saveSettings}
          disabled={saving}
          style={{
            marginTop: 12,
            width: "100%",
            padding: "12px 14px",
            background: NAVY,
            color: "#FFFFFF",
            border: "none",
            borderRadius: 10,
            fontWeight: 600,
            fontSize: 14,
            cursor: "pointer",
            opacity: saving ? 0.7 : 1,
            ...POPPINS,
          }}
        >
          {saving ? "Saving…" : "Save settings"}
        </button>
      </section>

      {/* SECTION 2 — Cost summary */}
      <section style={cardStyle({ mt: 12 })}>
        <SectionHeading icon={<FuelIcon size={16} color={NAVY} />} title="This month" />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 8 }}>
          <Stat label="Total miles" value={`${totalMiles.toFixed(1)}`} />
          <Stat label="Fuel cost" value={`£${totalFuelCost.toFixed(2)}`} />
          <Stat label="HMRC allowance" value={`£${hmrcAllowance.toFixed(2)}`} />
          <Stat
            label="Profit vs HMRC"
            value={`${profitVsHmrc >= 0 ? "+" : "−"}£${Math.abs(profitVsHmrc).toFixed(2)}`}
            color={profitVsHmrc >= 0 ? "#1877D6" : "#DC2626"}
          />
        </div>
        <div style={{ marginTop: 10, fontSize: 12, color: "#475569" }}>
          Cost per lesson: <strong>£{costPerLesson.toFixed(2)}</strong> ({lessonCount} lessons)
        </div>
      </section>

      {/* SECTION 3 — Per lesson */}
      <section style={cardStyle({ mt: 12 })}>
        <SectionHeading title="Per lesson cost" />
        {perLesson.length === 0 ? (
          <div style={{ fontSize: 13, color: "#6B7280", marginTop: 8 }}>No lessons this month.</div>
        ) : (
          <div style={{ marginTop: 6 }}>
            {perLesson.map((l) => (
              <div
                key={l.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "8px 0",
                  borderBottom: BORDER,
                  fontSize: 13,
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, color: NAVY }}>{l.name}</div>
                  <div style={{ fontSize: 11, color: "#6B7280" }}>
                    {l.date} · ~{l.miles.toFixed(1)} mi
                  </div>
                </div>
                <div style={{ fontWeight: 600, color: NAVY }}>£{l.cost.toFixed(2)}</div>
              </div>
            ))}
          </div>
        )}
        <div style={{ marginTop: 8, fontSize: 11, color: "#94A3B8", fontStyle: "italic" }}>
          Based on estimated lesson mileage ({LESSON_AVG_SPEED_MPH} mph avg).
        </div>
      </section>

      {/* SECTION 4 — Journey log */}
      <section style={cardStyle({ mt: 12 })}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <SectionHeading title="Journey log" />
          <Link to="/vehicle" style={{ fontSize: 12, color: "#1877D6", textDecoration: "none", fontWeight: 600 }}>
            View all →
          </Link>
        </div>
        {journeys.length === 0 ? (
          <div style={{ fontSize: 13, color: "#6B7280", marginTop: 8 }}>No journeys logged yet.</div>
        ) : (
          <div style={{ marginTop: 6 }}>
            {journeys.map((j) => (
              <div
                key={j.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "8px 0",
                  borderBottom: BORDER,
                  fontSize: 13,
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, color: NAVY }}>{j.trip_date || "—"}</div>
                  <div style={{ fontSize: 11, color: "#6B7280" }}>{j.purpose || "Journey"}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontWeight: 600, color: NAVY }}>{Number(j.distance_miles || 0).toFixed(1)} mi</div>
                  {j.fuel_cost != null && (
                    <div style={{ fontSize: 11, color: "#6B7280" }}>£{Number(j.fuel_cost).toFixed(2)}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function cardStyle({ mt }: { mt: number }): React.CSSProperties {
  return {
    background: "#FFFFFF",
    border: BORDER,
    borderRadius: 12,
    padding: 16,
    marginLeft: 16,
    marginRight: 16,
    marginTop: mt,
  };
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  border: BORDER,
  borderRadius: 8,
  fontSize: 14,
  background: "#FFFFFF",
  color: NAVY,
  ...POPPINS,
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginTop: 10 }}>
      <label style={{ display: "block", fontSize: 12, color: "#475569", marginBottom: 4, fontWeight: 500 }}>
        {label}
      </label>
      {children}
    </div>
  );
}

function SectionHeading({ icon, title }: { icon?: React.ReactNode; title: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      {icon}
      <h2 style={{ fontSize: 14, fontWeight: 600, color: NAVY, margin: 0 }}>{title}</h2>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ background: "#F8FAFC", border: BORDER, borderRadius: 10, padding: 10 }}>
      <div style={{ fontSize: 11, color: "#6B7280", fontWeight: 500 }}>{label}</div>
      <div style={{ fontSize: 16, fontWeight: 700, color: color || NAVY, marginTop: 2 }}>{value}</div>
    </div>
  );
}

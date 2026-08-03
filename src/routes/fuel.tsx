import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  IconArrowLeft,
  IconBell,
  IconMenu2,
  IconMapPin,
  IconAlertCircle,
  IconChevronRight,
  IconSettings,
  IconGasStation,
  IconLoader2,
} from "@tabler/icons-react";
import { toast } from "sonner";
import { supabase } from "../lib/supabaseClient";

export const Route = createFileRoute("/fuel")({
  head: () => ({
    meta: [
      { title: "Fuel — cheap fuel finder & costs | DSM by EveryDriver" },
      {
        name: "description",
        content:
          "Find the cheapest fuel near you and track your driving school fuel costs, mileage and HMRC allowance.",
      },
      { property: "og:title", content: "Fuel — cheap fuel finder & costs | DSM" },
      {
        property: "og:description",
        content:
          "Live UK fuel prices near you plus a fuel cost calculator for driving instructors.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: FuelPage,
});

const POPPINS = { fontFamily: "Poppins, Inter, sans-serif" } as const;
const NAVY = "#0B1F3A";
const BORDER = "0.5px solid #E4E8EF";
const CANVAS = "#EEF2F7";
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

const BRAND_COLORS: { match: string; bg: string; fg: string }[] = [
  { match: "tesco", bg: "#EE1C2E", fg: "#FFFFFF" },
  { match: "sainsbury", bg: "#F06C00", fg: "#FFFFFF" },
  { match: "asda", bg: "#78BE20", fg: "#FFFFFF" },
  { match: "morrison", bg: "#FDB913", fg: NAVY },
  { match: "bp", bg: "#009B3A", fg: "#FFFFFF" },
  { match: "shell", bg: "#FBCE07", fg: NAVY },
  { match: "esso", bg: "#003087", fg: "#FFFFFF" },
];

function brandStyle(brand: string) {
  const b = (brand || "").toLowerCase();
  const hit = BRAND_COLORS.find((c) => b.includes(c.match));
  return hit ?? { bg: NAVY, fg: "#FFFFFF" };
}

function FuelPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<"find" | "costs">("find");
  const [instructorId, setInstructorId] = useState<string | null>(null);
  const [settings, setSettings] = useState<Settings>(DEFAULTS);
  const [saving, setSaving] = useState(false);
  const [journeys, setJourneys] = useState<Journey[]>([]);
  const [allJourneysMonth, setAllJourneysMonth] = useState<Journey[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [pupils, setPupils] = useState<Record<string, Pupil>>({});

  // --- Find cheap fuel state ---
  const [stations, setStations] = useState<any[]>([]);
  const [cheapest, setCheapest] = useState<any>(null);
  const [nearest, setNearest] = useState<any>(null);
  const [fuelType, setFuelType] = useState<"E10" | "E5" | "B7" | "SDV">("E10");
  const [radiusKm, setRadiusKm] = useState(15);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [location, setLocation] = useState<string | null>(null);

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

  async function fetchFuel() {
    setLoading(true);
    setError(null);
    try {
      let userLat: number | undefined;
      let userLng: number | undefined;
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: false,
            timeout: 8000,
          })
        );
        userLat = pos.coords.latitude;
        userLng = pos.coords.longitude;
      } catch {
        /* fall back to home postcode */
      }

      const { data, error: fnError } = await supabase.functions.invoke("find-cheap-fuel", {
        body: { instructorId, fuelType, radiusKm, userLat, userLng },
      });
      if (fnError) throw fnError;
      rawStations.current = data?.stations ?? [];
      const mapped = (data?.stations ?? []).map((s: any) => ({
        ...s,
        price: s.prices?.[fuelType] ?? null,
      }));
      setStations(mapped);
      setCheapest(
        data?.cheapest ? { ...data.cheapest, price: data.cheapest.prices?.[fuelType] ?? null } : null
      );
      setNearest(
        data?.nearest ? { ...data.nearest, price: data.nearest.prices?.[fuelType] ?? null } : null
      );
      setLocation(data?.location ?? null);
    } catch {
      setError("Could not fetch fuel prices. Try again.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (instructorId) fetchFuel();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [instructorId, radiusKm]);

  // Re-map prices when fuel type changes (no refetch needed)
  useEffect(() => {
    if (!rawStations.current.length) return;
    const mapped = rawStations.current
      .filter((s: any) => s.prices?.[fuelType])
      .map((s: any) => ({ ...s, price: s.prices[fuelType] }))
      .sort((a: any, b: any) => a.price - b.price);
    setStations(mapped);
    setCheapest(mapped[0] ?? null);
    setNearest(
      [...mapped].sort((a: any, b: any) => (a.distance_miles ?? 0) - (b.distance_miles ?? 0))[0] ?? null
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fuelType]);


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
    <div style={{ minHeight: "100vh", background: CANVAS, ...POPPINS, paddingBottom: 32 }}>
      {/* Top bar */}
      <div
        style={{
          background: NAVY,
          color: "#FFFFFF",
          padding: "14px 16px",
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <button
          onClick={() => navigate({ to: "/home" })}
          aria-label="Back"
          style={{ background: "transparent", border: "none", color: "#FFFFFF", padding: 2, cursor: "pointer", display: "inline-flex" }}
        >
          <IconArrowLeft size={20} stroke={1.8} color="#FFFFFF" />
        </button>
        <h1 style={{ fontSize: 16, fontWeight: 600, margin: 0, flex: 1 }}>Fuel</h1>
        <button
          onClick={() => navigate({ to: "/notifications" })}
          aria-label="Notifications"
          style={{ background: "transparent", border: "none", padding: 2, cursor: "pointer", display: "inline-flex" }}
        >
          <IconBell size={20} stroke={1.8} color="#FFFFFF" />
        </button>
        <button
          onClick={() => window.dispatchEvent(new CustomEvent("dsm-open-menu"))}
          aria-label="Menu"
          style={{ background: "transparent", border: "none", padding: 2, cursor: "pointer", display: "inline-flex" }}
        >
          <IconMenu2 size={20} stroke={1.8} color="#FFFFFF" />
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", background: "#FFFFFF", borderBottom: BORDER }}>
        {([
          { key: "find", label: "Find cheap fuel" },
          { key: "costs", label: "Fuel costs" },
        ] as const).map((t) => {
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                flex: 1,
                padding: "12px 8px",
                background: "transparent",
                border: "none",
                borderBottom: active ? "2px solid #1877D6" : "2px solid transparent",
                color: active ? "#1877D6" : "#9CA3AF",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                ...POPPINS,
              }}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === "find" ? (
        <FindCheapFuel
          stations={stations}
          cheapest={cheapest}
          nearest={nearest}
          fuelType={fuelType}
          setFuelType={setFuelType}
          radiusKm={radiusKm}
          setRadiusKm={setRadiusKm}
          loading={loading}
          error={error}
          location={location}
          retry={fetchFuel}
        />
      ) : (
        <>
          {/* SECTION 1 — Settings */}
          <section style={cardStyle({ mt: 16 })}>
            <SectionHeading icon={<IconSettings size={16} color={NAVY} />} title="Fuel settings" />
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
            <SectionHeading icon={<IconGasStation size={16} color={NAVY} />} title="This month" />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 8 }}>
              <Stat label="Total miles" value={`${totalMiles.toFixed(1)}`} />
              <Stat label="Fuel cost" value={`£${totalFuelCost.toFixed(2)}`} />
              <Stat label="HMRC allowance" value={`£${hmrcAllowance.toFixed(2)}`} />
              <Stat
                label="Profit vs HMRC"
                value={`${profitVsHmrc >= 0 ? "+" : "−"}£${Math.abs(profitVsHmrc).toFixed(2)}`}
                color={profitVsHmrc >= 0 ? "#1877D6" : "#CC2229"}
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
        </>
      )}
    </div>
  );
}

/* ───────────────── Find cheap fuel tab ───────────────── */

function pill(active: boolean): React.CSSProperties {
  return {
    padding: "6px 14px",
    borderRadius: 20,
    fontSize: 12,
    fontWeight: 500,
    cursor: "pointer",
    background: active ? NAVY : "#FFFFFF",
    color: active ? "#FFFFFF" : NAVY,
    border: active ? "0.5px solid " + NAVY : BORDER,
    ...POPPINS,
  };
}

function openDirections(lat: any, lng: any) {
  if (lat == null || lng == null) return;
  window.open(
    `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`,
    "_blank",
    "noopener,noreferrer"
  );
}

function fmtPrice(p: any) {
  const n = Number(p);
  if (!isFinite(n)) return "—";
  // Accept either pence (145.9) or pounds (1.459)
  const pence = n < 10 ? n * 100 : n;
  return `${pence.toFixed(1)}p`;
}

function fmtMiles(s: any) {
  const km = Number(s?.distanceKm ?? s?.distance_km);
  const mi = Number(s?.distanceMiles ?? s?.distance_miles);
  const val = isFinite(mi) ? mi : isFinite(km) ? km * 0.621371 : NaN;
  return isFinite(val) ? `${val.toFixed(1)} mi` : "";
}

function stationTitle(s: any) {
  return [s?.brand, s?.name].filter(Boolean).join(" ") || s?.address || "Station";
}

function FindCheapFuel({
  stations,
  cheapest,
  nearest,
  fuelType,
  setFuelType,
  radiusKm,
  setRadiusKm,
  loading,
  error,
  location,
  retry,
}: {
  stations: any[];
  cheapest: any;
  nearest: any;
  fuelType: "E10" | "E5" | "B7" | "SDV";
  setFuelType: (v: "E10" | "E5" | "B7" | "SDV") => void;
  radiusKm: number;
  setRadiusKm: (v: number) => void;
  loading: boolean;
  error: string | null;
  location: string | null;
  retry: () => void;
}) {
  const one = "nowrap" as const;
  return (
    <div style={{ padding: "14px 16px 0" }}>
      {/* Fuel type pills */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {(["E10", "E5", "B7", "SDV"] as const).map((f) => (
          <button key={f} onClick={() => setFuelType(f)} style={pill(fuelType === f)}>
            {f}
          </button>
        ))}
      </div>

      {/* Radius pills */}
      <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
        {[5, 10, 15].map((r) => (
          <button key={r} onClick={() => setRadiusKm(r)} style={pill(radiusKm === r)}>
            {r}km
          </button>
        ))}
      </div>

      {location ? (
        <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 10 }}>
          <IconMapPin size={12} color="#6B7686" stroke={1.8} />
          <span style={{ fontSize: 11, color: "#6B7686" }}>Prices near {location}</span>
        </div>
      ) : null}

      {loading ? (
        <div style={{ textAlign: "center", padding: "40px 16px" }}>
          <IconLoader2
            size={22}
            color="#1877D6"
            stroke={1.8}
            style={{ animation: "spin 1s linear infinite" }}
          />
          <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
          <div style={{ fontSize: 12, color: "#6B7686", marginTop: 8 }}>
            Fetching live prices from Tesco, Asda, Shell and more...
          </div>
        </div>
      ) : error ? (
        <div style={{ textAlign: "center", padding: "36px 16px" }}>
          <IconAlertCircle size={24} color="#CC2229" stroke={1.8} />
          <div style={{ fontSize: 13, color: "#CC2229", marginTop: 8 }}>{error}</div>
          <button
            onClick={retry}
            style={{
              marginTop: 12,
              padding: "8px 18px",
              borderRadius: 10,
              border: "none",
              background: "#1877D6",
              color: "#FFFFFF",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              ...POPPINS,
            }}
          >
            Try again
          </button>
        </div>
      ) : (
        <>
          {(cheapest || nearest) && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 12 }}>
              {cheapest ? (
                <TopCard s={cheapest} eyebrow="CHEAPEST NEARBY" accent="#1877D6" bg="#E6F1FB" />
              ) : null}
              {nearest ? (
                <TopCard s={nearest} eyebrow="NEAREST" accent="#15803D" bg="#F0FDF4" />
              ) : null}
            </div>
          )}

          <div
            style={{
              fontSize: 10,
              fontWeight: 600,
              color: "#9CA3AF",
              textTransform: "uppercase",
              margin: "12px 0 6px",
            }}
          >
            All stations · {fuelType} · sorted by price
          </div>

          {stations.length === 0 ? (
            <div
              style={{
                background: "#FFFFFF",
                border: BORDER,
                borderRadius: 10,
                padding: 16,
                fontSize: 12,
                color: "#6B7686",
                textAlign: "center",
              }}
            >
              No stations found within {radiusKm}km.
            </div>
          ) : (
            <div style={{ background: "#FFFFFF", border: BORDER, borderRadius: 10, overflow: "hidden" }}>
              {stations.map((s, i) => {
                const bs = brandStyle(s?.brand || s?.name || "");
                const initial = String(s?.brand || s?.name || "?").trim().charAt(0).toUpperCase();
                return (
                  <div
                    key={s?.id ?? i}
                    onClick={() => openDirections(s?.lat, s?.lng)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "11px 14px",
                      borderBottom: i === stations.length - 1 ? "none" : BORDER,
                      cursor: "pointer",
                    }}
                  >
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: "50%",
                        background: bs.bg,
                        color: bs.fg,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 13,
                        fontWeight: 600,
                        flexShrink: 0,
                      }}
                    >
                      {initial}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 12,
                          fontWeight: 500,
                          color: NAVY,
                          whiteSpace: one,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {stationTitle(s)}
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          color: "#6B7686",
                          whiteSpace: one,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {s?.address || ""}
                      </div>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: NAVY }}>{fmtPrice(s?.price)}</div>
                      <div style={{ fontSize: 10, color: "#6B7686" }}>{fmtMiles(s)}</div>
                    </div>
                    <IconChevronRight size={13} color="#9CA3AF" stroke={1.8} style={{ flexShrink: 0 }} />
                  </div>
                );
              })}
            </div>
          )}

          <div style={{ fontSize: 10, color: "#9CA3AF", textAlign: "center", padding: 16 }}>
            Prices sourced from CMA fuel price scheme · Updated daily
          </div>
        </>
      )}
    </div>
  );
}

function TopCard({
  s,
  eyebrow,
  accent,
  bg,
}: {
  s: any;
  eyebrow: string;
  accent: string;
  bg: string;
}) {
  return (
    <div style={{ background: bg, border: `1px solid ${accent}`, borderRadius: 10, padding: 12, minWidth: 0 }}>
      <div style={{ fontSize: 9, fontWeight: 600, color: accent, textTransform: "uppercase", letterSpacing: "0.06em" }}>
        {eyebrow}
      </div>
      <div
        style={{
          fontSize: 13,
          fontWeight: 600,
          color: NAVY,
          marginTop: 4,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {stationTitle(s)}
      </div>
      <div style={{ marginTop: 4, display: "flex", alignItems: "baseline", gap: 3 }}>
        <span style={{ fontSize: 28, fontWeight: 700, color: accent, lineHeight: 1 }}>{fmtPrice(s?.price)}</span>
        <span style={{ fontSize: 12, color: "#6B7686" }}>/litre</span>
      </div>
      <div style={{ fontSize: 11, color: "#6B7686", marginTop: 4 }}>{fmtMiles(s)}</div>
      <button
        onClick={() => openDirections(s?.lat, s?.lng)}
        style={{
          marginTop: 6,
          background: "transparent",
          border: "none",
          padding: 0,
          color: accent,
          fontSize: 11,
          fontWeight: 500,
          cursor: "pointer",
          ...POPPINS,
        }}
      >
        Directions →
      </button>
    </div>
  );
}

/* ───────────────── shared bits ───────────────── */

function cardStyle({ mt }: { mt: number }): React.CSSProperties {
  return {
    background: "#FFFFFF",
    border: BORDER,
    borderRadius: 10,
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

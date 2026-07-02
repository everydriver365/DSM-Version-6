import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ChevronLeft, ChevronRight, Phone, Navigation, Sun, Cloud, CloudRain, CloudSnow,
  CloudLightning, CloudFog, Wind, Eye, PoundSterling, GraduationCap,
  Inbox, FileText, Wrench, Fuel,
} from "lucide-react";
import { Card } from "../components/dsm/Card";
import { SectionHeader } from "../components/dsm/SectionHeader";
import { supabase } from "../lib/supabaseClient";

export const Route = createFileRoute("/briefing")({
  head: () => ({
    meta: [
      { title: "Day briefing — DSM by EveryDriver" },
      { name: "description", content: "Your morning summary: weather, lessons, and what needs attention today." },
    ],
  }),
  component: BriefingPage,
});

const POPPINS = { fontFamily: "Inter, sans-serif" } as const;

interface LessonRow {
  id: string;
  lesson_time: string;
  duration_minutes: number | null;
  status: string;
  pupil_id: string;
  pupils?: { name: string; phone: string | null } | null;
}

interface Weather {
  temp: number;
  wind: number;
  code: number;
  visibility?: number;
}

function ymd(d: Date) {
  const p = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(d);
  const g = (t: string) => p.find((x) => x.type === t)?.value ?? "";
  return `${g("year")}-${g("month")}-${g("day")}`;
}

function greetingFor(d: Date) {
  const h = d.getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function formatTopDate(d: Date) {
  return d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
}
function formatLongDate(d: Date) {
  return d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}
function formatTime(t: string) {
  const s = (t ?? "00:00:00").slice(0, 5);
  return s;
}
function formatDuration(m: number | null) {
  if (!m) return "";
  const h = Math.floor(m / 60), mm = m % 60;
  if (h && mm) return `${h}h ${mm}m`;
  if (h) return `${h}h`;
  return `${mm}m`;
}
function statusColor(s: string) {
  if (s === "confirmed") return "#1877D6";
  if (s === "pending") return "#1877D6";
  if (s === "cancelled") return "#1877D6";
  return "#6B7280";
}

function weatherMeta(code: number): { label: string; Icon: typeof Sun } {
  if (code === 0) return { label: "Clear sky", Icon: Sun };
  if (code <= 2) return { label: "Mostly clear", Icon: Sun };
  if (code === 3) return { label: "Overcast", Icon: Cloud };
  if (code <= 48) return { label: "Foggy", Icon: CloudFog };
  if (code <= 57) return { label: "Drizzle", Icon: CloudRain };
  if (code <= 67) return { label: "Rain", Icon: CloudRain };
  if (code <= 77) return { label: "Snow", Icon: CloudSnow };
  if (code <= 82) return { label: "Rain showers", Icon: CloudRain };
  if (code <= 86) return { label: "Snow showers", Icon: CloudSnow };
  if (code <= 99) return { label: "Thunderstorm", Icon: CloudLightning };
  return { label: "Weather", Icon: Cloud };
}

async function getCoords(): Promise<{ lat: number; lon: number; source: "geo" | "fallback" }> {
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    return { lat: 51.0632, lon: -1.308, source: "fallback" };
  }
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve({ lat: 51.0632, lon: -1.308, source: "fallback" }), 6000);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        clearTimeout(timer);
        resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude, source: "geo" });
      },
      () => {
        clearTimeout(timer);
        resolve({ lat: 51.0632, lon: -1.308, source: "fallback" });
      },
      { timeout: 5000, maximumAge: 10 * 60 * 1000 },
    );
  });
}

function BriefingPage() {
  const navigate = useNavigate();
  const [now] = useState(() => new Date());
  const [firstName, setFirstName] = useState("there");
  const [lessons, setLessons] = useState<LessonRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [weather, setWeather] = useState<Weather | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(true);
  const [weatherSource, setWeatherSource] = useState<"geo" | "fallback">("fallback");
  const [outstandingCount, setOutstandingCount] = useState(0);
  const [upcomingTests, setUpcomingTests] = useState(0);
  const [newEnquiries, setNewEnquiries] = useState(0);
  const [expiringDocs, setExpiringDocs] = useState(0);
  const [nextService, setNextService] = useState<{ type: string; due: string } | null>(null);

  useEffect(() => {
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) { setLoading(false); return; }

      const { data: inst } = await supabase
        .from("instructors").select("name").eq("id", uid).maybeSingle();
      const fn = ((inst?.name as string | undefined) ?? auth.user?.email?.split("@")[0] ?? "there")
        .trim().split(/\s+/)[0];
      setFirstName(fn.charAt(0).toUpperCase() + fn.slice(1));

      const today = ymd(now);
      const in7 = ymd(new Date(now.getTime() + 7 * 86400000));
      const in30 = ymd(new Date(now.getTime() + 30 * 86400000));

      const [
        { data: lessonRows },
        { data: pupilRows },
        { data: testRows },
        { data: enqRows },
        { data: docRows },
        vehicleRes,
      ] = await Promise.all([
        supabase.from("lessons")
          .select("id, lesson_time, duration_minutes, status, pupil_id, pupils(name,phone)")
          .eq("instructor_id", uid).is("deleted_at", null)
          .neq("status", "cancelled").eq("lesson_date", today)
          .order("lesson_time", { ascending: true }),
        supabase.from("pupils").select("id", { count: "exact", head: false })
          .eq("instructor_id", uid).is("deleted_at", null).gt("balance_owed", 0),
        supabase.from("driving_tests").select("id")
          .eq("instructor_id", uid).gte("test_date", today).lte("test_date", in7),
        supabase.from("enquiries").select("id")
          .eq("instructor_id", uid).eq("status", "new"),
        supabase.from("documents").select("id")
          .eq("instructor_id", uid).is("deleted_at", null)
          .gte("expiry_date", today).lte("expiry_date", in30),
        supabase.from("vehicle_reminders")
          .select("reminder_type, due_date").eq("instructor_id", uid)
          .gte("due_date", today).order("due_date", { ascending: true }).limit(1),
      ]);

      setLessons((lessonRows ?? []) as unknown as LessonRow[]);
      setOutstandingCount((pupilRows ?? []).length);
      setUpcomingTests((testRows ?? []).length);
      setNewEnquiries((enqRows ?? []).length);
      setExpiringDocs((docRows ?? []).length);
      const vr = (vehicleRes?.data ?? [])[0] as { reminder_type: string; due_date: string } | undefined;
      if (vr) setNextService({ type: vr.reminder_type, due: vr.due_date });

      setLoading(false);
    })();
  }, [now]);

  useEffect(() => {
    (async () => {
      const { lat, lon, source } = await getCoords();
      setWeatherSource(source);
      try {
        const r = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,wind_speed_10m,weather_code,visibility&wind_speed_unit=mph`,
        );
        const j = await r.json();
        const c = j?.current;
        if (c) {
          setWeather({
            temp: Math.round(c.temperature_2m),
            wind: Math.round(c.wind_speed_10m),
            code: c.weather_code,
            visibility: c.visibility != null ? Math.round(c.visibility / 1000) : undefined,
          });
        }
      } catch (e) {
        console.error("[briefing] weather fetch failed", e);
      } finally {
        setWeatherLoading(false);
      }
    })();
  }, []);

  const attentionRows = [
    { icon: <PoundSterling size={18} color="#0B1F3A" />, tint: "#EEF2F7", label: "Outstanding payments", count: outstandingCount, route: "/payments" as const },
    { icon: <GraduationCap size={18} color="#1E40AF" />, tint: "#DBEAFE", label: "Tests in next 7 days", count: upcomingTests, route: "/tests" as const },
    { icon: <Inbox size={18} color="#5B21B6" />, tint: "#EDE9FE", label: "New enquiries", count: newEnquiries, route: "/enquiries" as const },
    { icon: <FileText size={18} color="#1877D6" />, tint: "#FEF2F2", label: "Documents expiring (30d)", count: expiringDocs, route: "/documents" as const },
  ];

  const W = weather ? weatherMeta(weather.code) : null;

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#F3F8FF", ...POPPINS, paddingBottom: 32 }}>
      <div style={{
        position: "sticky", top: 0, zIndex: 10, backgroundColor: "#0B1F3A",
        padding: "14px 16px", display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <button onClick={() => navigate({ to: "/home" })}
          style={{ background: "none", border: "none", cursor: "pointer", color: "#fff", display: "flex" }}
          aria-label="Back">
          <ChevronLeft size={24} />
        </button>
        <h1 style={{ color: "#fff", fontSize: 16, fontWeight: 700, margin: 0 }}>Day briefing</h1>
        <div style={{ color: "#fff", fontSize: 13, fontWeight: 500 }}>{formatTopDate(now)}</div>
      </div>

      {/* Greeting */}
      <div style={{
        backgroundColor: "#0B1F3A", margin: "12px 16px 0", borderRadius: 12, padding: 16,
      }}>
        <div style={{ color: "#fff", fontSize: 20, fontWeight: 600 }}>
          {greetingFor(now)}, {firstName}
        </div>
        <div style={{ color: "#9CA3AF", fontSize: 13, marginTop: 4 }}>
          {formatLongDate(now)}
        </div>
        <div style={{ color: "#9CA3AF", fontSize: 13, marginTop: 4 }}>
          {loading ? "Loading lessons…" : `You have ${lessons.length} lesson${lessons.length === 1 ? "" : "s"} today`}
        </div>
      </div>

      {/* Weather */}
      <div style={{ margin: "12px 16px 0" }}>
        <Card style={{ padding: 16 }}>
          {weatherLoading ? (
            <div style={{ color: "#6B7280", fontSize: 13 }}>Loading weather…</div>
          ) : !weather || !W ? (
            <div style={{ color: "#6B7280", fontSize: 13 }}>Weather unavailable</div>
          ) : (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 10, background: "#EEF4FB",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <W.Icon size={26} color="#1877D6" />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 22, fontWeight: 700, color: "#0B1F3A" }}>
                    {weather.temp}°C
                  </div>
                  <div style={{ fontSize: 13, color: "#6B7280" }}>{W.label}</div>
                </div>
              </div>
              <div style={{
                marginTop: 12, display: "flex", gap: 16, flexWrap: "wrap",
                fontSize: 12, color: "#6B7280",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <Wind size={14} /> {weather.wind} mph
                </div>
                {weather.visibility != null && (
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <Eye size={14} /> {weather.visibility} km
                  </div>
                )}
                <div style={{ marginLeft: "auto", fontSize: 11 }}>
                  {weatherSource === "geo" ? "Your location" : "Default location"}
                </div>
              </div>
            </>
          )}
        </Card>
      </div>

      <div style={{ padding: "0 16px" }}>
        <SectionHeader>TODAY'S LESSONS</SectionHeader>
        {loading ? (
          <div style={{ color: "#6B7280", padding: 8 }}>Loading…</div>
        ) : lessons.length === 0 ? (
          <Card style={{ padding: 16, textAlign: "center", color: "#6B7280", fontSize: 13 }}>
            No lessons today — enjoy the day off
          </Card>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {lessons.map((l) => (
              <Card key={l.id} style={{ padding: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{
                    fontSize: 16, fontWeight: 800, color: "#0B1F3A",
                    minWidth: 52,
                  }}>
                    {formatTime(l.lesson_time)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: 14, fontWeight: 600, color: "#0B1F3A",
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>
                      {l.pupils?.name ?? "Pupil"}
                    </div>
                    <div style={{ fontSize: 12, color: "#6B7280", marginTop: 2 }}>
                      {formatDuration(l.duration_minutes)}
                    </div>
                  </div>
                  <span style={{
                    background: statusColor(l.status), color: "#fff", fontSize: 10, fontWeight: 700,
                    padding: "2px 6px", borderRadius: 6, textTransform: "uppercase", letterSpacing: 0.4,
                  }}>
                    {l.status}
                  </span>
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                  <a
                    href={l.pupils?.phone ? `tel:${l.pupils.phone}` : undefined}
                    onClick={(e) => { if (!l.pupils?.phone) e.preventDefault(); }}
                    style={{
                      flex: 1, height: 36, borderRadius: 8,
                      background: l.pupils?.phone ? "#1877D6" : "#cbd5e1",
                      color: "#fff", fontSize: 13, fontWeight: 600,
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                      textDecoration: "none", pointerEvents: l.pupils?.phone ? "auto" : "none",
                    }}
                  >
                    <Phone size={14} /> Call
                  </a>
                  <button
                    onClick={() => navigate({ to: "/satnav" })}
                    style={{
                      flex: 1, height: 36, borderRadius: 8,
                      background: "#fff", color: "#1877D6",
                      border: "1px solid #1877D6", fontSize: 13, fontWeight: 600,
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                      cursor: "pointer", fontFamily: "Inter, sans-serif",
                    }}
                  >
                    <Navigation size={14} /> Navigate
                  </button>
                </div>
              </Card>
            ))}
          </div>
        )}

        <SectionHeader>NEEDS ATTENTION</SectionHeader>
        <Card style={{ padding: 0, overflow: "hidden" }}>
          {attentionRows.map((r, i) => (
            <button
              key={r.label}
              onClick={() => navigate({ to: r.route })}
              style={{
                width: "100%", display: "flex", alignItems: "center", gap: 12,
                padding: "12px 14px", background: "#fff", border: "none",
                borderTop: i === 0 ? "none" : "0.5px solid #EEF2F7",
                cursor: "pointer", fontFamily: "Inter, sans-serif", textAlign: "left",
              }}
            >
              <div style={{
                width: 32, height: 32, borderRadius: 8, background: r.tint,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                {r.icon}
              </div>
              <div style={{ flex: 1, fontSize: 14, color: "#0B1F3A", fontWeight: 500 }}>
                {r.label}
              </div>
              <span style={{
                minWidth: 24, height: 22, padding: "0 8px", borderRadius: 11,
                background: r.count > 0 ? "#1877D6" : "#EEF2F7",
                color: r.count > 0 ? "#fff" : "#6B7280",
                fontSize: 12, fontWeight: 700,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                {r.count}
              </span>
              <ChevronRight size={18} color="#9CA3AF" />
            </button>
          ))}
        </Card>

        <SectionHeader>YOUR VEHICLE</SectionHeader>
        <Card style={{ padding: 0, overflow: "hidden" }}>
          <button
            onClick={() => navigate({ to: "/vehicle" })}
            style={{
              width: "100%", display: "flex", alignItems: "center", gap: 12,
              padding: "12px 14px", background: "#fff", border: "none",
              cursor: "pointer", fontFamily: "Inter, sans-serif", textAlign: "left",
            }}
          >
            <div style={{
              width: 32, height: 32, borderRadius: 8, background: "#EDE9FE",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Wrench size={18} color="#5B21B6" />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#0B1F3A" }}>
                {nextService ? nextService.type : "Next service"}
              </div>
              <div style={{ fontSize: 12, color: "#6B7280", marginTop: 2 }}>
                {nextService
                  ? `Due ${new Date(nextService.due + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`
                  : "No upcoming reminders"}
              </div>
            </div>
            <ChevronRight size={18} color="#9CA3AF" />
          </button>
          <div style={{
            display: "flex", alignItems: "center", gap: 12,
            padding: "12px 14px", borderTop: "0.5px solid #EEF2F7",
          }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8, background: "#EEF2F7",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Fuel size={18} color="#0B1F3A" />
            </div>
            <div style={{ flex: 1, fontSize: 13, color: "#0B1F3A" }}>
              Remember to check fuel before lessons
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

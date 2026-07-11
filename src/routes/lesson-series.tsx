import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, RefreshCw, Calendar, MoreHorizontal, X, Search } from "lucide-react";
import { toast } from "sonner";
import { BottomSheet } from "../components/dsm/BottomSheet";
import { supabase } from "../lib/supabaseClient";
import { PageLayout } from "@/components/PageLayout";

const SUPABASE_URL = "https://bjpqxfrihwjcqprmoqfs.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJqcHF4ZnJpaHdqY3Fwcm1vcWZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0NzQ4MjEsImV4cCI6MjA5NzA1MDgyMX0.HKlgx3dxP3uxX9wMRRUnfb0IPwaBpFcut_iUgT5XFeo";

// -- Requires the following SQL run manually in Supabase --
// alter table public.lessons add column if not exists series_id uuid;
// create table if not exists public.lesson_series (
//   id uuid primary key default gen_random_uuid(),
//   instructor_id uuid not null references auth.users(id) on delete cascade,
//   pupil_id uuid not null references public.pupils(id) on delete cascade,
//   day_of_week text not null,
//   lesson_time time not null,
//   duration_minutes int not null default 60,
//   frequency text not null default 'weekly',
//   start_date date not null,
//   end_date date,
//   price_per_lesson numeric,
//   notes text,
//   is_active boolean not null default true,
//   created_at timestamptz default now()
// );
// grant select, insert, update, delete on public.lesson_series to authenticated;
// alter table public.lesson_series enable row level security;
// create policy "Instructor owns series" on public.lesson_series for all to authenticated
//   using (instructor_id = auth.uid()) with check (instructor_id = auth.uid());

export const Route = createFileRoute("/lesson-series")({
  head: () => ({
    meta: [{ title: "Recurring lessons — DSM by EveryDriver" }],
  }),
  component: LessonSeriesPage,
});

const POPPINS = { fontFamily: "Inter, sans-serif" } as const;
const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

type Pupil = {
  id: string;
  name: string | null;
  first_name: string | null;
  calendar_colour: string | null;
  custom_rate?: number | null;
};

type Series = {
  id: string;
  instructor_id: string;
  pupil_id: string;
  day_of_week: string;
  lesson_time: string;
  duration_minutes: number;
  frequency: "weekly" | "fortnightly";
  start_date: string;
  end_date: string | null;
  price_per_lesson: number | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  pupils?: Pupil | null;
};

function getOccurrences(
  dayOfWeek: string,
  startDate: string,
  endDate: string | null,
  frequency: "weekly" | "fortnightly",
  count: number = 5,
): string[] {
  const targetDay = DAYS.indexOf(dayOfWeek);
  if (!startDate || targetDay < 0) return [];
  const start = new Date(`${startDate}T00:00:00`);
  const end = endDate ? new Date(`${endDate}T00:00:00`) : null;
  const results: string[] = [];
  let current = new Date(start);
  while (current.getDay() !== targetDay) current.setDate(current.getDate() + 1);
  const step = frequency === "fortnightly" ? 14 : 7;
  while (results.length < count) {
    if (end && current > end) break;
    const y = current.getFullYear();
    const m = String(current.getMonth() + 1).padStart(2, "0");
    const d = String(current.getDate()).padStart(2, "0");
    results.push(`${y}-${m}-${d}`);
    current = new Date(current);
    current.setDate(current.getDate() + step);
  }
  return results;
}

function fmtLongDate(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
function fmtShortDate(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
function fmtTime(t: string) {
  return (t || "").slice(0, 5);
}
function initialsOf(p: Pupil | null | undefined) {
  const n = (p?.name || p?.first_name || "P").trim();
  return n.split(/\s+/).map((s) => s.charAt(0)).join("").slice(0, 2).toUpperCase();
}
function todayISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}
function firstDateForDay(dayOfWeek: string, fromISO: string) {
  const targetDay = DAYS.indexOf(dayOfWeek);
  if (targetDay < 0) return fromISO;
  const d = new Date(`${fromISO}T00:00:00`);
  while (d.getDay() !== targetDay) d.setDate(d.getDate() + 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}
function addMonthsISO(iso: string, months: number) {
  const d = new Date(`${iso}T00:00:00`);
  d.setMonth(d.getMonth() + months);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function LessonSeriesPage() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [token, setToken] = useState<string>("");
  const [series, setSeries] = useState<Series[] | null>(null);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [pupils, setPupils] = useState<Pupil[]>([]);
  const [defaultRate, setDefaultRate] = useState<number>(0);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<Series | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [endSeriesId, setEndSeriesId] = useState<string | null>(null);
  const [endDateValue, setEndDateValue] = useState<string>(todayISO());

  // form state
  const [pupilId, setPupilId] = useState<string>("");
  const [pupilSearch, setPupilSearch] = useState("");
  const [dayOfWeek, setDayOfWeek] = useState<string>("Monday");
  const [lessonTime, setLessonTime] = useState<string>("10:00");
  const [duration, setDuration] = useState<number>(60);
  const [frequency, setFrequency] = useState<"weekly" | "fortnightly">("weekly");
  const [startDate, setStartDate] = useState<string>("");
  const [hasEnd, setHasEnd] = useState(false);
  const [endDate, setEndDate] = useState<string>("");
  const [price, setPrice] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const [{ data: userData }, { data: sessionData }] = await Promise.all([
        supabase.auth.getUser(),
        supabase.auth.getSession(),
      ]);
      const uid = userData.user?.id ?? null;
      setUserId(uid);
      setToken(sessionData.session?.access_token ?? "");
    })();
  }, []);

  const preFilterPupilId = useMemo(() => {
    if (typeof window === "undefined") return null;
    return new URLSearchParams(window.location.search).get("pupilId");
  }, []);

  async function loadAll() {
    if (!userId) return;
    const { data: seriesData } = await supabase
      .from("lesson_series")
      .select("*, pupils(id, name, first_name, calendar_colour)")
      .eq("instructor_id", userId)
      .eq("is_active", true)
      .order("created_at", { ascending: false });
    const s = (seriesData as Series[] | null) ?? [];
    setSeries(s);

    if (s.length) {
      const ids = s.map((r) => r.id);
      const { data: lessonsData } = await supabase
        .from("lessons")
        .select("series_id")
        .in("series_id", ids);
      const map: Record<string, number> = {};
      (lessonsData ?? []).forEach((l: any) => {
        if (l.series_id) map[l.series_id] = (map[l.series_id] ?? 0) + 1;
      });
      setCounts(map);
    } else {
      setCounts({});
    }

    const { data: pupilsData } = await supabase
      .from("pupils")
      .select("id, name, first_name, calendar_colour, custom_rate")
      .eq("instructor_id", userId)
      .eq("status", "active")
      .is("deleted_at", null)
      .order("name");
    setPupils((pupilsData as Pupil[] | null) ?? []);

    const { data: inst } = await supabase
      .from("instructors")
      .select("hourly_rate")
      .eq("id", userId)
      .single();
    setDefaultRate(Number((inst as any)?.hourly_rate ?? 0));
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  function resetForm() {
    setEditing(null);
    setPupilId(preFilterPupilId ?? "");
    setPupilSearch("");
    setDayOfWeek("Monday");
    setLessonTime("10:00");
    setDuration(60);
    setFrequency("weekly");
    setStartDate(firstDateForDay("Monday", todayISO()));
    setHasEnd(false);
    setEndDate("");
    setPrice("");
    setNotes("");
  }

  function openAdd() {
    resetForm();
    setSheetOpen(true);
  }
  function openEdit(s: Series) {
    setEditing(s);
    setPupilId(s.pupil_id);
    setPupilSearch("");
    setDayOfWeek(s.day_of_week);
    setLessonTime(fmtTime(s.lesson_time));
    setDuration(s.duration_minutes);
    setFrequency(s.frequency);
    setStartDate(s.start_date);
    setHasEnd(!!s.end_date);
    setEndDate(s.end_date ?? "");
    setPrice(s.price_per_lesson != null ? String(s.price_per_lesson) : "");
    setNotes(s.notes ?? "");
    setMenuOpenId(null);
    setSheetOpen(true);
  }

  // Auto-update start date when day changes if start doesn't yet match
  useEffect(() => {
    if (!sheetOpen) return;
    if (!startDate) {
      setStartDate(firstDateForDay(dayOfWeek, todayISO()));
      return;
    }
    const d = new Date(`${startDate}T00:00:00`);
    if (d.getDay() !== DAYS.indexOf(dayOfWeek)) {
      setStartDate(firstDateForDay(dayOfWeek, startDate));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dayOfWeek, sheetOpen]);

  // Default price from pupil rate or instructor rate
  useEffect(() => {
    if (!sheetOpen || editing) return;
    const p = pupils.find((x) => x.id === pupilId);
    const rate = Number(p?.custom_rate ?? 0) || defaultRate;
    if (rate > 0) setPrice(String(rate));
  }, [pupilId, pupils, defaultRate, sheetOpen, editing]);

  const previewDates = useMemo(
    () => (startDate ? getOccurrences(dayOfWeek, startDate, hasEnd ? endDate || null : null, frequency, 5) : []),
    [dayOfWeek, startDate, hasEnd, endDate, frequency],
  );

  const filteredPupils = useMemo(() => {
    const q = pupilSearch.trim().toLowerCase();
    if (!q) return pupils;
    return pupils.filter((p) => (p.name ?? p.first_name ?? "").toLowerCase().includes(q));
  }, [pupils, pupilSearch]);

  async function handleSave() {
    if (!userId) return;
    if (!pupilId) return toast.error("Pick a pupil");
    if (!startDate) return toast.error("Pick a start date");
    setSaving(true);
    try {
      const payload: any = {
        instructor_id: userId,
        pupil_id: pupilId,
        day_of_week: dayOfWeek,
        lesson_time: `${lessonTime}:00`,
        duration_minutes: duration,
        frequency,
        start_date: startDate,
        end_date: hasEnd && endDate ? endDate : null,
        price_per_lesson: price ? Number(price) : null,
        notes: notes.trim() || null,
        is_active: true,
      };

      let seriesId = editing?.id ?? null;
      if (editing) {
        const { error } = await supabase.from("lesson_series").update(payload).eq("id", editing.id);
        if (error) throw error;
        toast.success("Series updated");
      } else {
        const { data: inserted, error } = await supabase
          .from("lesson_series")
          .insert(payload)
          .select("id")
          .single();
        if (error) throw error;
        seriesId = (inserted as any).id;

        const allDates = getOccurrences(dayOfWeek, startDate, hasEnd && endDate ? endDate : null, frequency, 200);
        const lessons = allDates.map((date) => ({
          instructor_id: userId,
          pupil_id: pupilId,
          lesson_date: date,
          lesson_time: `${lessonTime}:00`,
          duration_minutes: duration,
          status: "confirmed",
          payment_status: "unpaid",
          amount_due: price ? Number(price) : 0,
          series_id: seriesId,
        }));
        for (let i = 0; i < lessons.length; i += 50) {
          const batch = lessons.slice(i, i + 50);
          const res = await fetch(`${SUPABASE_URL}/rest/v1/lessons`, {
            method: "POST",
            headers: {
              apikey: SUPABASE_ANON_KEY,
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
              Prefer: "return=minimal",
            },
            body: JSON.stringify(batch),
          });
          if (!res.ok) throw new Error(await res.text());
        }
        toast.success(`Series created — ${allDates.length} lessons generated`);
      }
      setSheetOpen(false);
      await loadAll();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Failed to save series");
    } finally {
      setSaving(false);
    }
  }

  async function pauseSeries(s: Series) {
    setMenuOpenId(null);
    const { error } = await supabase.from("lesson_series").update({ is_active: false }).eq("id", s.id);
    if (error) return toast.error(error.message);
    const today = todayISO();
    await supabase
      .from("lessons")
      .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
      .eq("series_id", s.id)
      .gt("lesson_date", today)
      .eq("status", "confirmed");
    toast.success("Series paused, future lessons cancelled");
    await loadAll();
  }

  async function confirmEndSeries() {
    const id = endSeriesId;
    if (!id || !endDateValue) return;
    const { error } = await supabase.from("lesson_series").update({ end_date: endDateValue }).eq("id", id);
    if (error) return toast.error(error.message);
    await supabase
      .from("lessons")
      .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
      .eq("series_id", id)
      .gt("lesson_date", endDateValue)
      .eq("status", "confirmed");
    toast.success("Series end date set");
    setEndSeriesId(null);
    await loadAll();
  }

  function nextOccurrenceFor(s: Series): string | null {
    const [dates] = [getOccurrences(s.day_of_week, todayISO(), s.end_date, s.frequency, 1)];
    return dates[0] ?? null;
  }

  return (
    <PageLayout style={{ background: "#FFFFFF", ...POPPINS }}>
      <div style={{ background: "#0F2044", color: "#FFFFFF", padding: "16px" }}>
        <div className="flex items-center gap-3">
          <button
            type="button"
            aria-label="Back"
            onClick={() => navigate({ to: "/schedule" })}
            className="flex items-center justify-center w-8 h-8 -ml-1"
          >
            <ArrowLeft size={20} color="#FFFFFF" />
          </button>
          <p style={{ fontSize: 18, fontWeight: 600 }}>Recurring lessons</p>
        </div>
      </div>

      {/* Intro card */}
      <div
        style={{
          background: "#F0F4FF",
          border: "0.5px solid #BFDBFE",
          borderRadius: 12,
          padding: 16,
          margin: "16px",
        }}
      >
        <div className="flex items-start gap-3">
          <RefreshCw size={18} color="#1A52A0" />
          <div>
            <p style={{ fontSize: 14, fontWeight: 600, color: "#0F2044" }}>Recurring lesson series</p>
            <p style={{ fontSize: 12, color: "#6B7280", marginTop: 4 }}>
              Set up weekly or fortnightly lessons that generate automatically.
            </p>
          </div>
        </div>
      </div>

      {/* List */}
      {series === null ? null : series.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center px-6 py-12">
          <RefreshCw size={48} color="#D1D5DB" style={{ marginBottom: 12 }} />
          <p style={{ fontSize: 15, fontWeight: 600, color: "#6B7280" }}>No recurring series</p>
          <p style={{ fontSize: 13, color: "#9CA3AF", marginTop: 4 }}>
            Set up weekly lessons to save time booking
          </p>
          <button
            type="button"
            onClick={openAdd}
            className="cf-tap"
            style={{
              marginTop: 20,
              background: "#0F2044",
              color: "#FFFFFF",
              padding: "10px 18px",
              borderRadius: 12,
              fontWeight: 600,
              fontSize: 14,
            }}
          >
            + Create your first series
          </button>
        </div>
      ) : (
        <>
          {series.map((s) => {
            const p = s.pupils;
            const colour = p?.calendar_colour || "#1A52A0";
            const next = nextOccurrenceFor(s);
            const generated = counts[s.id] ?? 0;
            return (
              <div
                key={s.id}
                style={{
                  background: "#FFFFFF",
                  border: "0.5px solid #E2E6ED",
                  borderRadius: 12,
                  padding: 16,
                  margin: "8px 16px 0 16px",
                  position: "relative",
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center" style={{ gap: 10, minWidth: 0, flex: 1 }}>
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 999,
                        background: colour,
                        color: "#FFFFFF",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 12,
                        fontWeight: 700,
                        flexShrink: 0,
                      }}
                    >
                      {initialsOf(p)}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontSize: 14, fontWeight: 600, color: "#0F2044" }}>
                        {p?.name ?? p?.first_name ?? "Pupil"}
                      </p>
                      <p style={{ fontSize: 12, color: "#9CA3AF" }}>
                        {s.day_of_week} at {fmtTime(s.lesson_time)} · {s.duration_minutes} mins
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      style={{
                        background: "#F0F4FF",
                        color: "#1A52A0",
                        fontSize: 11,
                        fontWeight: 700,
                        padding: "2px 8px",
                        borderRadius: 999,
                      }}
                    >
                      {s.frequency === "fortnightly" ? "Fortnightly" : "Weekly"}
                    </span>
                    <button
                      type="button"
                      aria-label="Series menu"
                      onClick={() => setMenuOpenId(menuOpenId === s.id ? null : s.id)}
                      className="cf-tap"
                      style={{ width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center" }}
                    >
                      <MoreHorizontal size={18} color="#6B7280" />
                    </button>
                  </div>
                </div>

                {menuOpenId === s.id && (
                  <div
                    style={{
                      position: "absolute",
                      top: 46,
                      right: 12,
                      background: "#FFFFFF",
                      border: "0.5px solid #E2E6ED",
                      borderRadius: 10,
                      boxShadow: "0 6px 20px rgba(11,31,58,0.12)",
                      minWidth: 160,
                      zIndex: 5,
                      overflow: "hidden",
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => openEdit(s)}
                      className="cf-tap w-full text-left"
                      style={{ padding: "10px 14px", fontSize: 13, color: "#0F2044" }}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => pauseSeries(s)}
                      className="cf-tap w-full text-left"
                      style={{ padding: "10px 14px", fontSize: 13, color: "#0F2044", borderTop: "0.5px solid #F3F4F6" }}
                    >
                      Pause
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEndSeriesId(s.id);
                        setEndDateValue(todayISO());
                        setMenuOpenId(null);
                      }}
                      className="cf-tap w-full text-left"
                      style={{ padding: "10px 14px", fontSize: 13, color: "#DC2626", borderTop: "0.5px solid #F3F4F6" }}
                    >
                      End series
                    </button>
                  </div>
                )}

                <div className="flex items-center" style={{ gap: 16, marginTop: 8 }}>
                  <div className="flex items-center gap-1">
                    <Calendar size={12} color="#9CA3AF" />
                    <span style={{ fontSize: 12, color: "#6B7280" }}>Started {fmtShortDate(s.start_date)}</span>
                  </div>
                  {s.end_date ? (
                    <span style={{ fontSize: 12, color: "#6B7280" }}>Until {fmtShortDate(s.end_date)}</span>
                  ) : (
                    <span style={{ fontSize: 12, color: "#16A34A" }}>Ongoing</span>
                  )}
                </div>

                <div style={{ marginTop: 6 }}>
                  <span style={{ fontSize: 12, color: "#9CA3AF" }}>Next lesson: </span>
                  <span style={{ fontSize: 12, color: "#0F2044", fontWeight: 600 }}>
                    {next ? fmtLongDate(next) : "—"}
                  </span>
                </div>

                <div style={{ marginTop: 6 }}>
                  <span style={{ fontSize: 12, color: "#9CA3AF" }}>{generated} lessons generated</span>
                </div>
              </div>
            );
          })}

          <button
            type="button"
            onClick={openAdd}
            className="cf-tap"
            style={{
              display: "block",
              background: "#0F2044",
              color: "#FFFFFF",
              padding: "12px",
              borderRadius: 12,
              fontWeight: 600,
              fontSize: 14,
              margin: "12px 16px 24px 16px",
              width: "calc(100% - 32px)",
            }}
          >
            + New recurring series
          </button>
        </>
      )}

      {/* End series dialog */}
      {endSeriesId && (
        <div
          role="dialog"
          onClick={() => setEndSeriesId(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(11,31,58,0.45)",
            zIndex: 60,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: "#FFFFFF", borderRadius: 14, padding: 20, width: "100%", maxWidth: 360 }}
          >
            <p style={{ fontSize: 15, fontWeight: 600, color: "#0F2044", marginBottom: 8 }}>End series</p>
            <p style={{ fontSize: 12, color: "#6B7280", marginBottom: 12 }}>
              Pick the last date. Lessons after this date will be cancelled.
            </p>
            <input
              type="date"
              value={endDateValue}
              onChange={(e) => setEndDateValue(e.target.value)}
              style={{
                width: "100%",
                height: 44,
                borderRadius: 10,
                border: "0.5px solid #E2E6ED",
                padding: "0 12px",
                fontSize: 14,
                color: "#0F2044",
              }}
            />
            <div className="flex gap-2" style={{ marginTop: 14 }}>
              <button
                type="button"
                onClick={() => setEndSeriesId(null)}
                className="cf-tap flex-1"
                style={{ padding: "10px", borderRadius: 10, border: "0.5px solid #E2E6ED", fontSize: 14, color: "#0F2044" }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmEndSeries}
                className="cf-tap flex-1"
                style={{ padding: "10px", borderRadius: 10, background: "#0F2044", color: "#FFFFFF", fontSize: 14, fontWeight: 600 }}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit sheet */}
      <BottomSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        title={editing ? "Edit series" : "New recurring series"}
        maxHeightVh={92}
      >
        <div style={POPPINS}>
          {/* Pupil */}
          <label style={{ display: "block", fontSize: 12, color: "#9CA3AF", marginBottom: 6 }}>Pupil</label>
          <div
            style={{
              border: "0.5px solid #E2E6ED",
              borderRadius: 10,
              padding: "8px 10px",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <Search size={14} color="#9CA3AF" />
            <input
              type="text"
              placeholder={pupilId ? pupils.find((p) => p.id === pupilId)?.name ?? "Search pupils…" : "Search pupils…"}
              value={pupilSearch}
              onChange={(e) => setPupilSearch(e.target.value)}
              style={{ border: "none", outline: "none", flex: 1, fontSize: 14, color: "#0F2044", background: "transparent" }}
            />
            {pupilId && (
              <button type="button" onClick={() => setPupilId("")} aria-label="Clear">
                <X size={14} color="#9CA3AF" />
              </button>
            )}
          </div>
          {(pupilSearch || !pupilId) && (
            <div
              style={{
                marginTop: 6,
                maxHeight: 180,
                overflowY: "auto",
                border: "0.5px solid #E2E6ED",
                borderRadius: 10,
              }}
            >
              {filteredPupils.length === 0 ? (
                <div style={{ padding: 12, fontSize: 13, color: "#9CA3AF" }}>No pupils found</div>
              ) : (
                filteredPupils.slice(0, 20).map((p) => {
                  const c = p.calendar_colour || "#1A52A0";
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        setPupilId(p.id);
                        setPupilSearch("");
                      }}
                      className="cf-tap w-full"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        padding: "8px 12px",
                        borderTop: "0.5px solid #F3F4F6",
                        textAlign: "left",
                      }}
                    >
                      <span
                        style={{
                          width: 24,
                          height: 24,
                          borderRadius: 999,
                          background: c,
                          color: "#FFFFFF",
                          fontSize: 10,
                          fontWeight: 700,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        {initialsOf(p)}
                      </span>
                      <span style={{ fontSize: 13, color: "#0F2044" }}>{p.name ?? p.first_name}</span>
                    </button>
                  );
                })
              )}
            </div>
          )}

          {/* Day */}
          <label style={{ display: "block", fontSize: 12, color: "#9CA3AF", marginBottom: 6, marginTop: 12 }}>Day</label>
          <div className="grid grid-cols-7 gap-1">
            {DAY_LABELS.map((label, i) => {
              const full = DAYS[i];
              const active = dayOfWeek === full;
              return (
                <button
                  key={full}
                  type="button"
                  onClick={() => setDayOfWeek(full)}
                  className="cf-tap"
                  style={{
                    padding: "8px 0",
                    borderRadius: 999,
                    fontSize: 12,
                    fontWeight: 600,
                    background: active ? "#0F2044" : "#F7FAFC",
                    color: active ? "#FFFFFF" : "#0F2044",
                    border: active ? "none" : "0.5px solid #E2E6ED",
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* Time */}
          <label style={{ display: "block", fontSize: 12, color: "#9CA3AF", marginBottom: 6, marginTop: 12 }}>Time</label>
          <input
            type="time"
            value={lessonTime}
            onChange={(e) => setLessonTime(e.target.value)}
            style={{
              width: "100%",
              height: 44,
              borderRadius: 10,
              border: "0.5px solid #E2E6ED",
              padding: "0 12px",
              fontSize: 14,
              color: "#0F2044",
            }}
          />

          {/* Duration */}
          <label style={{ display: "block", fontSize: 12, color: "#9CA3AF", marginBottom: 6, marginTop: 12 }}>Duration</label>
          <div className="grid grid-cols-4 gap-2">
            {[45, 60, 90, 120].map((m) => {
              const active = duration === m;
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => setDuration(m)}
                  className="cf-tap"
                  style={{
                    padding: "10px 0",
                    borderRadius: 10,
                    fontSize: 13,
                    fontWeight: 600,
                    background: active ? "#0F2044" : "#F7FAFC",
                    color: active ? "#FFFFFF" : "#0F2044",
                    border: active ? "none" : "0.5px solid #E2E6ED",
                  }}
                >
                  {m} min
                </button>
              );
            })}
          </div>

          {/* Frequency */}
          <label style={{ display: "block", fontSize: 12, color: "#9CA3AF", marginBottom: 6, marginTop: 12 }}>Frequency</label>
          <div className="grid grid-cols-2 gap-2">
            {(["weekly", "fortnightly"] as const).map((f) => {
              const active = frequency === f;
              return (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFrequency(f)}
                  className="cf-tap"
                  style={{
                    padding: "10px 0",
                    borderRadius: 10,
                    fontSize: 13,
                    fontWeight: 600,
                    background: active ? "#0F2044" : "#F7FAFC",
                    color: active ? "#FFFFFF" : "#0F2044",
                    border: active ? "none" : "0.5px solid #E2E6ED",
                    textTransform: "capitalize",
                  }}
                >
                  {f}
                </button>
              );
            })}
          </div>

          {/* Start date */}
          <label style={{ display: "block", fontSize: 12, color: "#9CA3AF", marginBottom: 6, marginTop: 12 }}>First lesson</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            style={{
              width: "100%",
              height: 44,
              borderRadius: 10,
              border: "0.5px solid #E2E6ED",
              padding: "0 12px",
              fontSize: 14,
              color: "#0F2044",
            }}
          />

          {/* End date */}
          <label style={{ display: "block", fontSize: 12, color: "#9CA3AF", marginBottom: 6, marginTop: 12 }}>End date</label>
          <div className="grid grid-cols-2 gap-2">
            {[
              { k: false, label: "Ongoing" },
              { k: true, label: "Set end date" },
            ].map((opt) => {
              const active = hasEnd === opt.k;
              return (
                <button
                  key={String(opt.k)}
                  type="button"
                  onClick={() => setHasEnd(opt.k)}
                  className="cf-tap"
                  style={{
                    padding: "10px 0",
                    borderRadius: 10,
                    fontSize: 13,
                    fontWeight: 600,
                    background: active ? "#0F2044" : "#F7FAFC",
                    color: active ? "#FFFFFF" : "#0F2044",
                    border: active ? "none" : "0.5px solid #E2E6ED",
                  }}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
          {hasEnd && (
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              style={{
                width: "100%",
                height: 44,
                borderRadius: 10,
                border: "0.5px solid #E2E6ED",
                padding: "0 12px",
                fontSize: 14,
                color: "#0F2044",
                marginTop: 8,
              }}
            />
          )}

          {/* Price */}
          <label style={{ display: "block", fontSize: 12, color: "#9CA3AF", marginBottom: 6, marginTop: 12 }}>Price per lesson</label>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              border: "0.5px solid #E2E6ED",
              borderRadius: 10,
              padding: "0 12px",
              height: 44,
            }}
          >
            <span style={{ color: "#9CA3AF", fontSize: 14, marginRight: 6 }}>£</span>
            <input
              type="number"
              inputMode="decimal"
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              style={{ border: "none", outline: "none", flex: 1, fontSize: 14, color: "#0F2044" }}
            />
          </div>

          {/* Notes */}
          <label style={{ display: "block", fontSize: 12, color: "#9CA3AF", marginBottom: 6, marginTop: 12 }}>Notes</label>
          <textarea
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any notes for this series..."
            style={{
              width: "100%",
              borderRadius: 10,
              border: "0.5px solid #E2E6ED",
              padding: "10px 12px",
              fontSize: 14,
              color: "#0F2044",
              resize: "vertical",
            }}
          />

          {/* Preview */}
          <div
            style={{
              background: "#F7FAFC",
              border: "0.5px solid #E2E6ED",
              borderRadius: 10,
              padding: 12,
              marginTop: 12,
            }}
          >
            <p style={{ fontSize: 12, color: "#6B7280", marginBottom: 6 }}>This will generate lessons on:</p>
            {previewDates.length === 0 ? (
              <p style={{ fontSize: 13, color: "#9CA3AF" }}>Pick a day and start date to preview.</p>
            ) : (
              previewDates.map((d) => (
                <p key={d} style={{ fontSize: 13, color: "#0F2044" }}>
                  {fmtLongDate(d)}
                </p>
              ))
            )}
          </div>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="cf-tap"
            style={{
              width: "100%",
              background: "#0F2044",
              color: "#FFFFFF",
              padding: "12px",
              borderRadius: 12,
              fontWeight: 600,
              fontSize: 14,
              marginTop: 16,
              opacity: saving ? 0.6 : 1,
            }}
          >
            {saving ? "Saving…" : editing ? "Save changes" : "Create series & generate lessons"}
          </button>
        </div>
      </BottomSheet>
    </PageLayout>
  );
}

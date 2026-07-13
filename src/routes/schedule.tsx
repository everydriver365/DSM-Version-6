import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Plus } from "lucide-react";
import {
  IconSearch,
  IconPlus,
  IconChevronDown,
  IconChevronLeft,
  IconChevronRight,
  IconArrowLeft,
  IconArrowRight,
} from "@tabler/icons-react";
import { supabase } from "../lib/supabaseClient";
import WorkspaceDots from "../components/dsm/WorkspaceDots";
import { PAGE_BACKGROUND } from "@/components/PageLayout";

export const Route = createFileRoute("/schedule")({
  head: () => ({
    meta: [
      { title: "Schedule — DSM by EveryDriver" },
      { name: "description", content: "Scrollable agenda view of your lessons." },
    ],
  }),
  component: SchedulePage,
});

const POPPINS = { fontFamily: "Poppins, Inter, sans-serif" } as const;

// ── Gap detection shared by calendar + agenda views ────────────────────
function timeToMins(t: string): number {
  if (!t) return 0;
  const parts = t.split(":").map(Number);
  return (parts[0] || 0) * 60 + (parts[1] || 0);
}
function minsToTime(m: number): string {
  const h = Math.floor(m / 60);
  const min = m % 60;
  const period = h >= 12 ? "pm" : "am";
  const dh = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return dh + ":" + String(min).padStart(2, "0") + period;
}
function formatMins(mins: number) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h && m) return `${h}h ${m}m`;
  if (h) return `${h}h`;
  return `${m}m`;
}

type GapInfo = {
  startMins: number;
  endMins: number;
  gapMins: number;
  startTime: string;
  endTime: string;
  potential: number;
};
function detectGaps(
  lessons: Array<{ status?: string | null; lesson_time: string; duration_minutes?: number | null; pupils?: { buffer_after_minutes?: number | null } | null }>,
  workStart: string,
  workEnd: string,
  bufferAfter: number,
  calendarBlocks: Array<{ start_datetime: string; end_datetime: string; is_all_day?: boolean | null }>,
  recurringBlocks: Array<{ day_of_week: string; start_time: string; end_time: string; is_active?: boolean }>,
  timeOff: Array<{ start_date: string; end_date: string; all_day?: boolean | null }>,
  dateStr: string,
  hourlyRate: number,
): GapInfo[] {
  const wsMin = timeToMins(workStart || "09:00");
  const weMin = timeToMins(workEnd || "18:00");
  const nowMins = new Date().getHours() * 60 + new Date().getMinutes();
  const isToday = dateStr === new Date().toISOString().split("T")[0];
  const minStart = isToday ? Math.max(wsMin, nowMins + 30) : wsMin;

  const dayTimeOff = (timeOff || []).filter((t) => t.start_date <= dateStr && t.end_date >= dateStr);
  if (dayTimeOff.some((t) => t.all_day)) return [];

  const busy: { start: number; end: number }[] = [];
  for (const l of (lessons || []).filter((l) => !["cancelled"].includes(String(l.status || "")))) {
    const lStart = timeToMins(l.lesson_time);
    const pupilBufAfter = l.pupils?.buffer_after_minutes ?? bufferAfter;
    // Buffer applies only AFTER each lesson; no buffer before the next.
    busy.push({ start: lStart, end: lStart + (l.duration_minutes || 60) + pupilBufAfter });
  }
  const dayBlocks = (calendarBlocks || []).filter((b) => {
    const s = b.start_datetime?.substring(0, 10);
    const e = b.end_datetime?.substring(0, 10);
    return s === dateStr || (s <= dateStr && e >= dateStr);
  });
  for (const b of dayBlocks) {
    const isAllDay = b.is_all_day || false;
    busy.push({
      start: isAllDay ? 0 : timeToMins(b.start_datetime?.substring(11, 16) || "00:00"),
      end: isAllDay ? 1439 : timeToMins(b.end_datetime?.substring(11, 16) || "23:59"),
    });
  }
  const dayName = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][
    new Date(dateStr + "T12:00:00").getDay()
  ];
  const dayRecurring = (recurringBlocks || []).filter((b) => b.day_of_week === dayName && b.is_active !== false);
  for (const b of dayRecurring) {
    busy.push({ start: timeToMins(b.start_time), end: timeToMins(b.end_time) });
  }

  busy.sort((a, b) => a.start - b.start);
  const merged: { start: number; end: number }[] = [];
  for (const b of busy) {
    if (merged.length && b.start <= merged[merged.length - 1].end) {
      merged[merged.length - 1].end = Math.max(merged[merged.length - 1].end, b.end);
    } else {
      merged.push({ ...b });
    }
  }

  const checkPoints = [
    { start: minStart, end: merged[0]?.start ?? weMin },
    ...merged.map((b, i) => ({ start: b.end, end: merged[i + 1]?.start ?? weMin })),
  ];
  const gaps: GapInfo[] = [];
  for (const cp of checkPoints) {
    const gapStart = Math.max(cp.start, minStart);
    const gapEnd = Math.min(cp.end, weMin);
    const gapMins = gapEnd - gapStart;
    if (gapMins >= 60) {
      gaps.push({
        startMins: gapStart,
        endMins: gapEnd,
        gapMins,
        startTime: minsToTime(gapStart),
        endTime: minsToTime(gapEnd),
        potential: Math.round((gapMins / 60) * (hourlyRate || 40)),
      });
    }
  }
  return gaps;
}


// Deterministic pupil colour palette. Same pupil_id -> same colour everywhere.
const PUPIL_PALETTE = [
  "#185FA5",
  "#6B4FD6",
  "#3B6D11",
  "#C4501E",
  "#0C8577",
  "#A32D2D",
  "#854F0B",
  "#185F8A",
];
function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}
// Name-based colour overrides. Central place to pin a pupil to a specific
// palette colour regardless of the hash outcome.
const PUPIL_COLOUR_OVERRIDES: Record<string, string> = {
  "joseph thorne": "#3B6D11",
};
function pupilColour(
  pupilId: string | null | undefined,
  fallback?: string | null,
  name?: string | null,
): string {
  const key = (name ?? "").trim().toLowerCase();
  if (key && PUPIL_COLOUR_OVERRIDES[key]) return PUPIL_COLOUR_OVERRIDES[key];
  if (fallback && /^#[0-9a-fA-F]{3,8}$/.test(fallback)) return fallback;
  if (!pupilId) return PUPIL_PALETTE[0];
  return PUPIL_PALETTE[hashString(pupilId) % PUPIL_PALETTE.length];
}


interface Pupil {
  id?: string;
  name: string | null;
  first_name?: string | null;
  last_name?: string | null;
  calendar_colour?: string | null;
}

interface Lesson {
  id: string;
  pupil_id?: string | null;
  lesson_date: string;
  lesson_time: string;
  duration_minutes: number | null;
  status: string;
  lesson_type?: string | null;
  pupil: Pupil | null;
}

// NOTE: External calendar events, personal/block time, tasks, and public
// holiday rows are not yet in the data model. Placeholder row renderers
// below accept a common AgendaEntry shape so wiring those sources later
// is a matter of pushing entries into the same list — no UI rewrite.
type AgendaEntry =
  | { kind: "lesson"; id: string; start: Date; end: Date; allDay: false; lesson: Lesson }
  | { kind: "block"; id: string; start: Date; end: Date; allDay: false; title: string }
  // Reserved for future wiring:
  | { kind: "external"; id: string; start: Date; end: Date; allDay: boolean; title: string; colour?: string | null }
  | { kind: "personal"; id: string; start: Date; end: Date; allDay: boolean; title: string }
  | { kind: "task"; id: string; start: Date; end: Date; allDay: boolean; title: string; completed?: boolean }
  | { kind: "holiday"; id: string; start: Date; end: Date; allDay: true; title: string };


function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
function ymdLocal(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function pupilDisplayName(p: Pupil | null) {
  if (!p) return "Unknown pupil";
  if (p.name) return p.name;
  const full = [p.first_name, p.last_name].filter(Boolean).join(" ").trim();
  return full || "Unknown pupil";
}
function fmtTime(d: Date) {
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

function getBlockColour(title: string): { bg: string; border: string; icon: string; text: string } {
  const t = (title || "").toLowerCase();
  if (t.includes("meeting") || t.includes("call") || t.includes("zoom") || t.includes("teams"))
    return { bg: "#EFF6FF", border: "#1A52A0", icon: "💼", text: "#1A52A0" };
  if (
    t.includes("doctor") || t.includes("dentist") || t.includes("hospital") ||
    t.includes("appointment") || t.includes("medical") || t.includes("physio")
  )
    return { bg: "#FEF2F2", border: "#CC2229", icon: "🏥", text: "#CC2229" };
  if (
    t.includes("school") || t.includes("pickup") || t.includes("drop") ||
    t.includes("kids") || t.includes("child") || t.includes("nursery")
  )
    return { bg: "#FFFBEB", border: "#D97706", icon: "🎒", text: "#D97706" };
  if (
    t.includes("lunch") || t.includes("dinner") || t.includes("coffee") ||
    t.includes("birthday") || t.includes("party") || t.includes("wedding")
  )
    return { bg: "#E0FFF4", border: "#16A34A", icon: "🎉", text: "#16A34A" };
  if (
    t.includes("travel") || t.includes("flight") || t.includes("train") ||
    t.includes("holiday") || t.includes("vacation") || t.includes("away")
  )
    return { bg: "#F5F3FF", border: "#7C3AED", icon: "✈️", text: "#7C3AED" };
  if (
    t.includes("gym") || t.includes("sport") || t.includes("football") ||
    t.includes("tennis") || t.includes("run") || t.includes("swim")
  )
    return { bg: "#E0FFF4", border: "#00B5A5", icon: "🏃", text: "#00B5A5" };
  return { bg: "#F3F4F6", border: "#9CA3AF", icon: "📅", text: "#6B7280" };
}
function lessonStart(l: Lesson) {
  return new Date(`${l.lesson_date}T${(l.lesson_time ?? "00:00:00").slice(0, 8)}`);
}
function lessonEnd(l: Lesson) {
  return new Date(lessonStart(l).getTime() + (l.duration_minutes ?? 60) * 60000);
}

// Monday-start week key so "Week of..." labels group by ISO week.
function mondayOf(d: Date) {
  const x = startOfDay(d);
  const day = x.getDay(); // 0=Sun
  const diff = (day + 6) % 7;
  return addDays(x, -diff);
}
function weekRangeLabel(d: Date) {
  const start = mondayOf(d);
  const end = addDays(start, 6);
  const sameMonth = start.getMonth() === end.getMonth();
  const s = start.toLocaleDateString("en-GB", { month: "short", day: "numeric" });
  const e = end.toLocaleDateString("en-GB", { month: sameMonth ? undefined : "short", day: "numeric" });
  return `Week of ${s} – ${e}`;
}

const PAST_DAYS = 30;
const FUTURE_DAYS = 180;

function SchedulePage() {
  const navigate = useNavigate();
  const today = useMemo(() => startOfDay(new Date()), []);
  const rangeStart = useMemo(() => addDays(today, -PAST_DAYS), [today]);
  const rangeEnd = useMemo(() => addDays(today, FUTURE_DAYS), [today, rangeStart]);

  const [lessons, setLessons] = useState<Lesson[] | null>(null);
  const [calendarBlocks, setCalendarBlocks] = useState<Array<{ id: string; start_datetime: string; end_datetime: string; title: string | null; is_all_day?: boolean | null }>>([]);
  const [recurringBlocks, setRecurringBlocks] = useState<Array<{ day_of_week: string; start_time: string; end_time: string; is_active: boolean }>>([]);
  const [timeOff, setTimeOff] = useState<Array<{ start_date: string; end_date: string; all_day: boolean }>>([]);
  const [workStart, setWorkStart] = useState<string>("09:00");
  const [workEnd, setWorkEnd] = useState<string>("18:00");
  const [perDayHours, setPerDayHours] = useState<Record<string, { start: string; end: string; active: boolean }> | null>(null);
  const [workingDaysList, setWorkingDaysList] = useState<string[]>(["Monday","Tuesday","Wednesday","Thursday","Friday"]);
  const [bufferAfter, setBufferAfter] = useState<number>(15);
  const [hourlyRate, setHourlyRate] = useState<number>(40);
  const [calendarMonth, setCalendarMonth] = useState<Date>(() => {
    const d = new Date(today);
    d.setDate(1);
    return d;
  });
  const [selectedDateKey, setSelectedDateKey] = useState<string>(() => ymdLocal(today));

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const todayRef = useRef<HTMLDivElement | null>(null);
  const dayRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const didScrollToToday = useRef(false);
  const suppressScrollUpdate = useRef(false);

  // Fetch lessons in the full ±window. Uses the same lessons/pupils select
  // pattern already used elsewhere in the app. Range is 210 days of the
  // instructor's own rows (RLS scoped) — a single windowed query is fine at
  // this size; if the row count ever grows problematic, split into ±30 day
  // pages keyed by scroll boundary.
  useEffect(() => {
    let cancelled = false;
    setLessons(null);
    (async () => {
      // `pupil:pupils!inner(...)` promotes the join to an INNER JOIN so the
      // pupil-level filters below actually drop lessons whose pupil is
      // inactive/archived/deleted. Without !inner, PostgREST returns the
      // lesson with pupil=null instead of filtering the lesson out.
      const { data, error } = await supabase
        .from("lessons")
        .select(
          "id, pupil_id, lesson_date, lesson_time, duration_minutes, status, lesson_type, pupil:pupils!inner(id, name, first_name, last_name, calendar_colour, status, deleted_at)",
        )
        .is("deleted_at", null)
        .eq("pupil.status", "active")
        .is("pupil.deleted_at", null)
        .gte("lesson_date", ymdLocal(rangeStart))
        .lte("lesson_date", ymdLocal(rangeEnd))
        .order("lesson_date", { ascending: true })
        .order("lesson_time", { ascending: true });
      if (cancelled) return;
      if (error) {
        console.error("[schedule] fetch error", error);
        setLessons([]);
        return;
      }
      setLessons((data as unknown as Lesson[]) ?? []);
    })();
    return () => {
      cancelled = true;
    };
  }, [rangeStart, rangeEnd]);

  // Fetch external calendar blocks in the same window.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const SUPABASE_URL = "https://bjpqxfrihwjcqprmoqfs.supabase.co";
      const SUPABASE_ANON_KEY =
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJqcHF4ZnJpaHdqY3Fwcm1vcWZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0NzQ4MjEsImV4cCI6MjA5NzA1MDgyMX0.HKlgx3dxP3uxX9wMRRUnfb0IPwaBpFcut_iUgT5XFeo";
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        const userId = session?.user?.id;
        if (!token || !userId) return;
        const startIso = ymdLocal(rangeStart);
        const endIso = ymdLocal(rangeEnd);
        const res = await fetch(
          `${SUPABASE_URL}/rest/v1/calendar_blocks?instructor_id=eq.${userId}&source=eq.external_calendar&start_datetime=gte.${startIso}&start_datetime=lte.${endIso}T23:59:59&select=id,start_datetime,end_datetime,title`,
          { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${token}` } },
        );
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        setCalendarBlocks(Array.isArray(data) ? data : []);
      } catch (err) {
        console.warn("[schedule] calendar_blocks fetch failed", err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [rangeStart, rangeEnd]);

  // Fetch instructor working hours + buffers + rate, plus recurring blocks and time off.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const SUPABASE_URL = "https://bjpqxfrihwjcqprmoqfs.supabase.co";
      const SUPABASE_ANON_KEY =
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJqcHF4ZnJpaHdqY3Fwcm1vcWZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0NzQ4MjEsImV4cCI6MjA5NzA1MDgyMX0.HKlgx3dxP3uxX9wMRRUnfb0IPwaBpFcut_iUgT5XFeo";
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        const userId = session?.user?.id;
        if (!token || !userId) return;
        const headers = { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${token}` };
        const startIso = ymdLocal(rangeStart);
        const endIso = ymdLocal(rangeEnd);
        const [instrRow, recRes, offRes] = await Promise.all([
          supabase
            .from("instructors")
            .select("working_hours_start,working_hours_end,working_days,per_day_hours,lesson_buffer_after,hourly_rate")
            .eq("id", userId)
            .maybeSingle(),
          fetch(`${SUPABASE_URL}/rest/v1/instructor_recurring_blocks?instructor_id=eq.${userId}&is_active=eq.true`, { headers }),
          fetch(`${SUPABASE_URL}/rest/v1/instructor_time_off?instructor_id=eq.${userId}&start_date=lte.${endIso}&end_date=gte.${startIso}`, { headers }),
        ]);
        if (cancelled) return;
        const i = (instrRow.data ?? {}) as {
          working_hours_start?: string | null;
          working_hours_end?: string | null;
          working_days?: string[] | null;
          per_day_hours?: Record<string, { start: string; end: string; active: boolean }> | null;
          lesson_buffer_after?: number | null;
          hourly_rate?: number | null;
        };
        if (i.working_hours_start) setWorkStart(String(i.working_hours_start).slice(0, 5));
        if (i.working_hours_end) setWorkEnd(String(i.working_hours_end).slice(0, 5));
        if (Array.isArray(i.working_days) && i.working_days.length) setWorkingDaysList(i.working_days);
        setPerDayHours(i.per_day_hours ?? null);
        if (i.lesson_buffer_after != null) setBufferAfter(Number(i.lesson_buffer_after));
        if (i.hourly_rate != null) setHourlyRate(Number(i.hourly_rate) || 40);
        if (recRes.ok) {
          const d = await recRes.json();
          if (!cancelled && Array.isArray(d)) setRecurringBlocks(d);
        }
        if (offRes.ok) {
          const d = await offRes.json();
          if (!cancelled && Array.isArray(d)) setTimeOff(d);
        }
      } catch (err) {
        console.warn("[schedule] availability fetch failed", err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [rangeStart, rangeEnd]);


  // Group entries by day (YYYY-MM-DD), skipping days with zero entries.
  const entriesByDay = useMemo(() => {
    const map = new Map<string, AgendaEntry[]>();
    for (const l of lessons ?? []) {
      const key = l.lesson_date.substring(0, 10);
      const arr = map.get(key) ?? [];
      arr.push({
        kind: "lesson",
        id: l.id,
        start: lessonStart(l),
        end: lessonEnd(l),
        allDay: false,
        lesson: l,
      });
      map.set(key, arr);
    }
    // Merge external calendar blocks into the same per-day map.
    for (const b of calendarBlocks) {
      if (!b.start_datetime || !b.end_datetime) continue;
      const key = b.start_datetime.substring(0, 10);
      const start = new Date(b.start_datetime);
      const end = new Date(b.end_datetime);
      const arr = map.get(key) ?? [];
      arr.push({
        kind: "block",
        id: `block-${b.id}`,
        start,
        end,
        allDay: false,
        title: b.title || "Busy",
      });
      map.set(key, arr);
    }
    for (const [k, arr] of map) {
      arr.sort((a, b) => {
        if (a.allDay && !b.allDay) return -1;
        if (!a.allDay && b.allDay) return 1;
        return a.start.getTime() - b.start.getTime();
      });
      map.set(k, arr);
    }
    return map;
  }, [lessons, calendarBlocks]);

  // Ordered list of day keys that actually have entries.
  const orderedDayKeys = useMemo(() => {
    return [...entriesByDay.keys()].sort();
  }, [entriesByDay]);

  const todayKey = ymdLocal(today);

  // Fix 4: ensure today always appears in the agenda, even with no lessons.
  const orderedDayKeysWithToday = useMemo(() => {
    if (orderedDayKeys.includes(todayKey)) return orderedDayKeys;
    const merged = [...orderedDayKeys, todayKey].sort();
    return merged;
  }, [orderedDayKeys, todayKey]);

  // Insert "Week of ..." labels above the first day of each new week.
  type Row =
    | { type: "week"; key: string; label: string }
    | { type: "day"; key: string; date: Date; entries: AgendaEntry[] };
  const rows: Row[] = useMemo(() => {
    const out: Row[] = [];
    let lastWeekKey = "";
    for (const key of orderedDayKeysWithToday) {
      const [y, m, d] = key.split("-").map(Number);
      const date = new Date(y, m - 1, d);
      const wk = ymdLocal(mondayOf(date));
      if (wk !== lastWeekKey) {
        out.push({ type: "week", key: `w-${wk}`, label: weekRangeLabel(date) });
        lastWeekKey = wk;
      }
      out.push({ type: "day", key, date, entries: entriesByDay.get(key) ?? [] });
    }
    return out;
  }, [orderedDayKeysWithToday, entriesByDay]);

  // Fix 1: auto-scroll to today on first paint after data loads.
  // Suppress the scroll observer during the programmatic scroll so it doesn't
  // rewrite calendarMonth to a past month during the initial jump.
  useLayoutEffect(() => {
    if (didScrollToToday.current) return;
    if (lessons === null) return;
    const el = todayRef.current;
    const scroller = scrollRef.current;
    if (!scroller) return;
    suppressScrollUpdate.current = true;
    if (el) {
      const top = el.offsetTop - scroller.offsetTop - 8;
      scroller.scrollTop = top;
    } else {
      const nextKey = orderedDayKeysWithToday.find((k) => k >= todayKey);
      const target = nextKey ? dayRefs.current.get(nextKey) : undefined;
      if (target) scroller.scrollTop = target.offsetTop - scroller.offsetTop - 8;
    }
    didScrollToToday.current = true;
    window.setTimeout(() => {
      suppressScrollUpdate.current = false;
    }, 250);
  }, [lessons, orderedDayKeysWithToday, todayKey]);


  // As the agenda scrolls, update the calendar month + selected-date
  // highlight to follow the top-most visible day.
  const onScroll = useCallback(() => {
    if (suppressScrollUpdate.current) return;
    const scroller = scrollRef.current;
    if (!scroller) return;
    const scrollerTop = scroller.getBoundingClientRect().top;
    let currentKey: string | null = null;
    for (const [key, el] of dayRefs.current) {
      const rect = el.getBoundingClientRect();
      if (rect.top - scrollerTop <= 120) {
        currentKey = key;
      } else {
        break;
      }
    }
    if (currentKey) {
      const [y, m, d] = currentKey.split("-").map(Number);
      const date = new Date(y, m - 1, d);
      setSelectedDateKey((prev) => (prev === currentKey ? prev : currentKey!));
      setCalendarMonth((prev) => {
        if (prev.getFullYear() === date.getFullYear() && prev.getMonth() === date.getMonth()) return prev;
        return new Date(date.getFullYear(), date.getMonth(), 1);
      });
    }
  }, []);

  const goToLesson = (id: string) => {
    navigate({ to: "/lessons/$id" as never, params: { id } as never });
  };

  // Colour dots per date, one per unique pupil, capped at 3.
  const dotsByDay = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const l of lessons ?? []) {
      const key = l.lesson_date.substring(0, 10);
      const arr = map.get(key) ?? [];
      const colour = pupilColour(l.pupil_id ?? null, l.pupil?.calendar_colour ?? null, pupilDisplayName(l.pupil));
      if (!arr.includes(colour) && arr.length < 3) arr.push(colour);
      map.set(key, arr);
    }
    return map;
  }, [lessons]);

  const scrollToDate = useCallback(
    (key: string) => {
      // If that date has no entries, jump to the nearest future day that does.
      let targetKey = key;
      if (!dayRefs.current.has(targetKey)) {
        const found = orderedDayKeys.find((k) => k >= key);
        if (!found) return;
        targetKey = found;
      }
      const el = dayRefs.current.get(targetKey);
      const scroller = scrollRef.current;
      if (!el || !scroller) return;
      setSelectedDateKey(key);
      suppressScrollUpdate.current = true;
      const top = el.offsetTop - scroller.offsetTop - 8;
      scroller.scrollTo({ top, behavior: "smooth" });
      // Release the scroll-driven month/selected updater after the smooth
      // scroll settles, so the user's tap wins over the scroll observer.
      window.setTimeout(() => {
        suppressScrollUpdate.current = false;
      }, 450);
    },
    [orderedDayKeys],
  );

  // ── Chrome ────────────────────────────────────────────────────────────
  return (
    <div
      onTouchStart={(e) => {
        (window as any).__wsSwipe = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }}
      onTouchEnd={(e) => {
        const s = (window as any).__wsSwipe;
        if (!s) return;
        const dx = e.changedTouches[0].clientX - s.x;
        const dy = e.changedTouches[0].clientY - s.y;
        (window as any).__wsSwipe = null;
        if (Math.abs(dx) < 60 || Math.abs(dy) > Math.abs(dx)) return;
        const target = dx < 0 ? 2 : 0; // schedule=1: left→pupils(2), right→today(0)
        navigate({ to: "/home" as never, search: { ws: target } as any });
      }}
      style={{
        position: "fixed",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        background: PAGE_BACKGROUND,
        color: "#111827",
        ...POPPINS,
      }}
    >
      <div style={{ background: "#0F2044", paddingTop: "env(safe-area-inset-top, 0px)" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 16px 6px",
            color: "#FFFFFF",
          }}
        >
          <button
            type="button"
            aria-label="Back"
            onClick={() => navigate({ to: "/home" as never })}
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              border: 0,
              background: "rgba(255,255,255,0.10)",
              color: "#FFFFFF",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
          >
            <IconArrowLeft size={20} stroke={2} />
          </button>
          <div style={{ fontSize: 16, fontWeight: 600, ...POPPINS }}>Schedule</div>
        </div>
        <WorkspaceDots activeIndex={1} />
      </div>

      <MonthStrip
        viewMonth={calendarMonth}
        selectedDateKey={selectedDateKey}
        todayKey={ymdLocal(today)}
        lessons={lessons ?? []}
        onPrevMonth={() => {
          const d = new Date(calendarMonth);
          d.setMonth(d.getMonth() - 1);
          setCalendarMonth(d);
        }}
        onNextMonth={() => {
          const d = new Date(calendarMonth);
          d.setMonth(d.getMonth() + 1);
          setCalendarMonth(d);
        }}
        onSelectDate={(key) => {
          setSelectedDateKey(key);
          scrollToDate(key);
        }}
        onToday={() => {
          const d = new Date(today);
          d.setDate(1);
          setCalendarMonth(d);
          scrollToDate(ymdLocal(today));
        }}
      />

      <div
        ref={scrollRef}
        onScroll={onScroll}
        style={{
          flex: 1,
          overflowY: "auto",
          overflowX: "hidden",
          padding: "0 16px calc(80px + env(safe-area-inset-bottom))",
        }}
      >


        <div style={{ padding: "8px 0 0" }}>

        {lessons === null ? (
          <div style={{ padding: 24, color: "#B0BAC9", fontSize: 14 }}>Loading…</div>
        ) : rows.length === 0 ? (
          <div style={{ padding: 24, color: "#B0BAC9", fontSize: 14 }}>Nothing scheduled.</div>
        ) : (
          rows.map((row, rowIdx) => {
            if (row.type === "week") {
              const isFirstWeek = rowIdx === 0;
              return (
                <div
                  key={row.key}
                  style={{
                    fontSize: 11,
                    fontWeight: 500,
                    letterSpacing: "0.4px",
                    textTransform: "uppercase",
                    color: "#8A93A3",
                    marginTop: isFirstWeek ? 4 : 24,
                    marginBottom: 16,
                  }}
                >
                  {row.label.toUpperCase()}
                </div>
              );
            }
            const isToday = row.key === todayKey;
            const isPast = row.key < todayKey;
            const weekday = row.date
              .toLocaleDateString("en-GB", { weekday: "short" })
              .slice(0, 3)
              .toUpperCase();
            const dayNum = row.date.getDate();
            return (
              <div
                key={row.key}
                ref={(el) => {
                  if (el) {
                    dayRefs.current.set(row.key, el);
                    if (isToday) todayRef.current = el;
                  } else {
                    dayRefs.current.delete(row.key);
                  }
                }}
                style={{
                  marginBottom: 18,
                }}
              >
                {/* Day heading */}
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 10 }}>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 500,
                      color: "#8A93A3",
                      textTransform: "uppercase",
                      letterSpacing: "0.04em",
                    }}
                  >
                    {weekday}
                  </span>
                  <span
                    style={{
                      fontSize: 16,
                      fontWeight: 600,
                      color: "#0F2044",
                      fontVariantNumeric: "tabular-nums",
                      ...POPPINS,
                    }}
                  >
                    {dayNum}
                  </span>
                </div>

                {row.entries.length === 0 && isToday ? (
                  <div
                    style={{
                      background: "#EEF2F7",
                      border: "1.5px dashed #D0D5DD",
                      borderRadius: 12,
                      padding: "10px 14px",
                      textAlign: "center",
                      fontSize: 12,
                      color: "#B0BAC9",
                      ...POPPINS,
                    }}
                  >
                    Today — no lessons
                  </div>
                ) : (
                  (() => {
                    type GapRow = { kind: 'gap-row'; id: string; startMins: number; startTime: string; endTime: string; mins: number; potential: number };
                    const dayLessons = (lessons ?? []).filter((l) => l.lesson_date.substring(0, 10) === row.key);
                    const dayName = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"][
                      new Date(row.key + "T12:00:00").getDay()
                    ];
                    const dayConfig = perDayHours?.[dayName];
                    const dayStart = dayConfig?.start || workStart || "09:00";
                    const dayEnd = dayConfig?.end || workEnd || "18:00";
                    const isDayActive = dayConfig
                      ? dayConfig.active === true
                      : workingDaysList.includes(dayName);
                    const gaps = isDayActive
                      ? detectGaps(
                          dayLessons.map((l) => ({
                            status: l.status,
                            lesson_time: l.lesson_time,
                            duration_minutes: l.duration_minutes,
                            pupils: null,
                          })),
                          dayStart,
                          dayEnd,
                          bufferAfter,
                          calendarBlocks,
                          recurringBlocks,
                          timeOff,
                          row.key,
                          hourlyRate,
                        )
                      : [];
                    const gapRows: GapRow[] = gaps.map((g, i) => ({
                      kind: 'gap-row',
                      id: `gap-${row.key}-${i}`,
                      startMins: g.startMins,
                      startTime: g.startTime,
                      endTime: g.endTime,
                      mins: g.gapMins,
                      potential: g.potential,
                    }));
                    const entryWithMins = row.entries.map((e) => ({
                      entry: e,
                      mins: e.start.getHours() * 60 + e.start.getMinutes(),
                    }));
                    const combined: Array<{ kind: 'entry'; startMins: number; entry: AgendaEntry } | { kind: 'gap'; startMins: number; gap: GapRow }> = [
                      ...entryWithMins.map((x) => ({ kind: 'entry' as const, startMins: x.mins, entry: x.entry })),
                      ...gapRows.map((g) => ({ kind: 'gap' as const, startMins: g.startMins, gap: g })),
                    ].sort((a, b) => a.startMins - b.startMins);
                    const items: Array<AgendaEntry | GapRow> = combined.map((c) =>
                      c.kind === 'entry' ? c.entry : c.gap,
                    );

                    return (
                      <div style={{ position: "relative", paddingLeft: 22 }}>
                        <div
                          aria-hidden
                          style={{
                            position: "absolute",
                            left: 6,
                            top: 6,
                            bottom: 6,
                            width: 2,
                            background: "#DDE4ED",
                          }}
                        />
                        {items.map((e) => {
                          if (e.kind === 'gap-row') {
                            return (
                              <div key={e.id} style={{ position: "relative", marginBottom: 16 }}>
                                <span
                                  aria-hidden
                                  style={{
                                    position: "absolute",
                                    left: -22,
                                    top: 4,
                                    width: 12,
                                    height: 12,
                                    borderRadius: "50%",
                                    background: "#E6F1FB",
                                    border: "2px solid #185FA5",
                                    boxSizing: "border-box",
                                  }}
                                />
                                <div
                                  onClick={() => navigate({ to: '/gaps' as never })}
                                  role="button"
                                  tabIndex={0}
                                  style={{
                                    background: "#FFFFFF",
                                    borderRadius: 12,
                                    boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
                                    padding: "12px 14px",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 10,
                                    cursor: "pointer",
                                    ...POPPINS,
                                  }}
                                >
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontSize: 13, fontWeight: 500, color: "#0F2044", fontVariantNumeric: "tabular-nums" }}>
                                      {e.startTime} – {e.endTime}
                                    </div>
                                    <div style={{ fontSize: 11, color: "#4A7BA6", marginTop: 2 }}>
                                      {formatMins(e.mins)} free
                                    </div>
                                  </div>
                                  <div style={{ fontSize: 12, fontWeight: 600, color: "#3B6D11" }}>
                                    £{e.potential}
                                  </div>
                                  <button
                                    type="button"
                                    onClick={(ev) => { ev.stopPropagation(); navigate({ to: '/gaps' as never }); }}
                                    style={{
                                      background: "#185FA5",
                                      color: "#FFFFFF",
                                      fontSize: 12,
                                      fontWeight: 500,
                                      padding: "8px 12px",
                                      borderRadius: 9,
                                      border: "none",
                                      cursor: "pointer",
                                    }}
                                  >
                                    Fill
                                  </button>
                                </div>
                              </div>
                            );
                          }

                          // Resolve entry marker/tag color
                          let markerColor = "#8A93A3";
                          let title = "";
                          let timeText = `${fmtTime(e.start)} – ${fmtTime(e.end)}`;
                          if (e.kind === "lesson") {
                            const name = pupilDisplayName(e.lesson.pupil);
                            markerColor = pupilColour(e.lesson.pupil_id ?? null, e.lesson.pupil?.calendar_colour ?? null, name);
                            const typeRaw = (e.lesson.lesson_type ?? "").trim();
                            const showType = typeRaw && typeRaw.toLowerCase() !== "standard";
                            title = showType ? `${name} · ${typeRaw}` : name;
                          } else if (e.kind === "block") {
                            markerColor = getBlockColour(e.title).border;
                            title = e.title;
                          } else if (e.kind === "external") {
                            markerColor = e.colour && /^#[0-9a-fA-F]{3,8}$/.test(e.colour) ? e.colour : "#4AABDB";
                            title = e.title;
                            if (e.allDay) timeText = "All day";
                          } else if (e.kind === "personal") {
                            markerColor = "#E8B84B";
                            title = e.title;
                            if (e.allDay) timeText = "All day";
                          } else if (e.kind === "task") {
                            markerColor = "#6B6BD6";
                            title = e.title;
                            timeText = "";
                          } else if (e.kind === "holiday") {
                            markerColor = "#3D9E7A";
                            title = e.title;
                            timeText = "All day";
                          }
                          const cancelled = e.kind === "lesson" && e.lesson.status === "cancelled";
                          const clickable = e.kind === "lesson";

                          return (
                            <div key={e.id} style={{ position: "relative", marginBottom: 16 }}>
                              <span
                                aria-hidden
                                style={{
                                  position: "absolute",
                                  left: -22,
                                  top: 4,
                                  width: 12,
                                  height: 12,
                                  borderRadius: "50%",
                                  background: markerColor,
                                }}
                              />
                              <div
                                onClick={clickable ? () => goToLesson((e as Extract<AgendaEntry, { kind: 'lesson' }>).lesson.id) : undefined}
                                role={clickable ? "button" : undefined}
                                tabIndex={clickable ? 0 : undefined}
                                style={{
                                  background: "#FFFFFF",
                                  borderRadius: 12,
                                  boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
                                  padding: "12px 14px",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 10,
                                  cursor: clickable ? "pointer" : "default",
                                  opacity: cancelled ? 0.55 : 1,
                                  ...POPPINS,
                                }}
                              >
                                <span
                                  aria-hidden
                                  style={{
                                    width: 8,
                                    height: 8,
                                    borderRadius: "50%",
                                    background: markerColor,
                                    flexShrink: 0,
                                  }}
                                />
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div
                                    style={{
                                      fontSize: 14,
                                      fontWeight: 500,
                                      color: "#0F2044",
                                      overflow: "hidden",
                                      textOverflow: "ellipsis",
                                      whiteSpace: "nowrap",
                                      textDecoration: cancelled ? "line-through" : "none",
                                    }}
                                  >
                                    {title}
                                  </div>
                                  {timeText ? (
                                    <div style={{ fontSize: 11, color: "#8A93A3", marginTop: 2, fontVariantNumeric: "tabular-nums" }}>
                                      {timeText}
                                    </div>
                                  ) : null}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()

                )}
              </div>

            );
          })
        )}
        </div>

      </div>


      <button
        type="button"
        onClick={() => navigate({ to: '/lessons/new' as never })}
        style={{
          position: 'fixed',
          bottom: 'calc(80px + env(safe-area-inset-bottom, 0px))',
          right: 20,
          width: 50,
          height: 50,
          borderRadius: '50%',
          background: '#0F2044',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 10px rgba(15,32,68,0.3)',
          zIndex: 50,
        }}
        aria-label="Add lesson"
      >
        <Plus size={22} color="white" />
      </button>
    </div>
  );
}

const iconBtn: React.CSSProperties = {
  width: 40,
  height: 40,
  borderRadius: 10,
  border: 0,
  background: "transparent",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
};

function DayHeader({ date, isToday, isPast }: { date: Date; isToday: boolean; isPast: boolean }) {
  const weekday = date
    .toLocaleDateString("en-GB", { weekday: "short" })
    .slice(0, 3)
    .toUpperCase();
  const dayNum = date.getDate();
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        paddingTop: 6,
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 500,
          letterSpacing: "0.04em",
          color: isPast ? "#94A3B8" : isToday ? "#185FA5" : "#6B7280",
        }}
      >
        {weekday}
      </div>
      <div
        style={{
          marginTop: 2,
          width: 30,
          height: 30,
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: isToday ? "#185FA5" : "transparent",
          color: isToday ? "#FFFFFF" : isPast ? "#94A3B8" : "#0B1F3A",
          fontSize: 15,
          fontWeight: 600,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {dayNum}
      </div>
    </div>
  );
}

function EntryRow({
  entry,
  onLessonTap,
}: {
  entry: AgendaEntry;
  onLessonTap: (id: string) => void;
}) {
  if (entry.kind === "lesson") {
    const l = entry.lesson;
    const name = pupilDisplayName(l.pupil);
    // Fix 3: hide the default "standard" lesson type suffix.
    const typeRaw = (l.lesson_type ?? "").trim();
    const showType = typeRaw && typeRaw.toLowerCase() !== "standard";
    const label = showType ? `${name} · ${typeRaw}` : name;
    const bg = pupilColour(l.pupil_id ?? null, l.pupil?.calendar_colour ?? null, name);
    const cancelled = l.status === "cancelled";

    return (
      <button
        type="button"
        onClick={() => onLessonTap(l.id)}
        style={rowBase(bg, cancelled)}
      >
        <div style={rowTitle}>{label}</div>
        <div style={rowSub}>
          {fmtTime(entry.start)} – {fmtTime(entry.end)}
        </div>
      </button>
    );
  }
  if (entry.kind === "block") {
    const c = getBlockColour(entry.title);
    return (
      <div
        style={{
          background: c.bg,
          borderLeft: `3px solid ${c.border}`,
          borderRadius: 8,
          padding: "10px 12px",
          margin: "2px 0",
          display: "flex",
          alignItems: "center",
          gap: 8,
          ...POPPINS,
        }}
      >
        <span style={{ fontSize: 14 }} aria-hidden>{c.icon}</span>
        <div style={{ fontSize: 13, color: c.text, fontWeight: 500, flex: 1 }}>{entry.title}</div>
        <div style={{ fontSize: 11, color: "#9CA3AF", fontVariantNumeric: "tabular-nums" }}>
          {fmtTime(entry.start)} – {fmtTime(entry.end)}
        </div>
      </div>
    );
  }
  if (entry.kind === "external") {
    const bg = entry.colour && /^#[0-9a-fA-F]{3,8}$/.test(entry.colour) ? entry.colour : "#4AABDB";
    return (
      <div style={rowBase(bg, false)}>
        <div style={rowTitle}>{entry.title}</div>
        {!entry.allDay ? (
          <div style={rowSub}>
            {fmtTime(entry.start)} – {fmtTime(entry.end)}
          </div>
        ) : null}
      </div>
    );
  }
  if (entry.kind === "personal") {
    return (
      <div style={rowBase("#E8B84B", false)}>
        <div style={rowTitle}>{entry.title}</div>
        {!entry.allDay ? (
          <div style={rowSub}>
            {fmtTime(entry.start)} – {fmtTime(entry.end)}
          </div>
        ) : null}
      </div>
    );
  }
  if (entry.kind === "task") {
    const done = !!entry.completed;
    return (
      <div style={rowBase("#6B6BD6", false)}>
        <div
          style={{
            ...rowTitle,
            display: "flex",
            alignItems: "center",
            gap: 6,
            opacity: done ? 0.6 : 1,
            textDecoration: done ? "line-through" : "none",
          }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <circle cx="12" cy="12" r="9" />
            <path d="M9 12l2 2 4-4" />
          </svg>
          <span>{entry.title}</span>
        </div>
      </div>
    );
  }
  // holiday
  return (
    <div style={rowBase("#3D9E7A", false)}>
      <div style={rowTitle}>{entry.title}</div>
    </div>
  );
}

function rowBase(bg: string, cancelled: boolean): React.CSSProperties {
  return {
    width: "100%",
    textAlign: "left",
    border: 0,
    borderRadius: 12,
    padding: "12px 14px",
    background: bg,
    color: "#FFFFFF",
    cursor: "pointer",
    opacity: cancelled ? 0.5 : 1,
    textDecoration: cancelled ? "line-through" : "none",
    display: "block",
    ...POPPINS,
  };
}
const rowTitle: React.CSSProperties = {
  fontSize: 14,
  fontWeight: 500,
  color: "#FFFFFF",
  lineHeight: 1.3,
};
const rowSub: React.CSSProperties = {
  marginTop: 2,
  fontSize: 12,
  color: "rgba(255,255,255,0.8)",
  fontVariantNumeric: "tabular-nums",
};


// ── Month calendar ────────────────────────────────────────────────────
function MonthCalendar({
  month,
  today,
  selectedDateKey,
  dotsByDay,
  onSelectDate,
  onPrevMonth,
  onNextMonth,
  onOpenMonthPicker,
  onSearch,
  onAdd,
}: {
  month: Date;
  today: Date;
  selectedDateKey: string;
  dotsByDay: Map<string, string[]>;
  onSelectDate: (key: string) => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onOpenMonthPicker: () => void;
  onSearch: () => void;
  onAdd: () => void;
}) {
  const monthLabel = month.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
  const todayKey = ymdLocal(today);

  // Build a 6-row (Mon-start) grid covering the full visible month.
  const cells = useMemo(() => {
    const first = new Date(month.getFullYear(), month.getMonth(), 1);
    const gridStart = mondayOf(first);
    const out: Date[] = [];
    for (let i = 0; i < 42; i++) out.push(addDays(gridStart, i));
    return out;
  }, [month]);

  const dow = ["M", "T", "W", "T", "F", "S", "S"];

  return (
    <div
      style={{
        position: "sticky",
        top: 0,
        zIndex: 5,
        background: "#FFFFFF",
        borderRadius: 14,
        boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
        padding: 12,
        boxSizing: "border-box",
      }}
    >
      {/* Top row: month + nav + actions */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 8,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <button type="button" aria-label="Previous month" onClick={onPrevMonth} style={calChevronBtn}>
            <IconChevronLeft size={16} stroke={1.75} color="#8A93A3" />
          </button>
          <button
            type="button"
            onClick={onOpenMonthPicker}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              background: "transparent",
              border: 0,
              padding: "0 4px",
              fontSize: 15,
              fontWeight: 500,
              lineHeight: 1,
              color: "#0F2044",
              ...POPPINS,
              cursor: "pointer",
            }}
          >
            <span>{monthLabel}</span>
            <IconChevronDown size={13} stroke={1.75} color="#8A93A3" />
          </button>
          <button type="button" aria-label="Next month" onClick={onNextMonth} style={calChevronBtn}>
            <IconChevronRight size={16} stroke={1.75} color="#8A93A3" />
          </button>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button
            type="button"
            aria-label="Search"
            onClick={onSearch}
            style={{ ...calChip, background: "#E6F1FB" }}
          >
            <IconSearch size={14} stroke={1.75} color="#185FA5" />
          </button>
          <button
            type="button"
            aria-label="Add lesson"
            onClick={onAdd}
            style={{ ...calChip, background: "#185FA5" }}
          >
            <IconPlus size={14} stroke={1.75} color="#FFFFFF" />
          </button>
        </div>
      </div>

      {/* Day-of-week header */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          paddingBottom: 6,
        }}
      >
        {dow.map((d, i) => (
          <div
            key={i}
            style={{
              textAlign: "center",
              fontSize: 10,
              fontWeight: 500,
              lineHeight: 1,
              color: "#8A93A3",
              ...POPPINS,
            }}
          >
            {d}
          </div>
        ))}
      </div>

      {/* Date grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 0 }}>
        {cells.map((d) => {
          const key = ymdLocal(d);
          const inMonth = d.getMonth() === month.getMonth();
          const isToday = key === todayKey;
          const isSelected = key === selectedDateKey && !isToday;
          const dots = dotsByDay.get(key) ?? [];
          const dotColour = dots[0];
          const numColour = isToday
            ? "#FFFFFF"
            : isSelected
              ? "#185FA5"
              : !inMonth
                ? "#C7CCD4"
                : "#0F2044";
          return (
            <button
              type="button"
              key={key}
              onClick={() => onSelectDate(key)}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "flex-start",
                background: "transparent",
                border: 0,
                padding: "4px 0",
                cursor: "pointer",
                ...POPPINS,
              }}
            >
              <div
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: isToday ? "#185FA5" : "transparent",
                  border: isSelected ? "1.5px solid #185FA5" : "none",
                  color: numColour,
                  fontSize: 13,
                  fontWeight: isToday || isSelected ? 500 : 400,
                  fontVariantNumeric: "tabular-nums",
                  boxSizing: "border-box",
                }}
              >
                {d.getDate()}
              </div>
              <div
                style={{
                  margin: "2px auto 0",
                  width: 3,
                  height: 3,
                  borderRadius: "50%",
                  background: dotColour ?? "transparent",
                }}
              />
            </button>
          );
        })}
      </div>
    </div>

  );
}

const calChevronBtn: React.CSSProperties = {
  width: 22,
  height: 22,
  borderRadius: 8,
  border: 0,
  background: "transparent",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  padding: 0,
};

const calChip: React.CSSProperties = {
  width: 26,
  height: 26,
  borderRadius: 8,
  border: 0,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  padding: 0,
};



import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Zap,
  Calendar as CalendarIcon,
  Clock,
  Users,
  MessageSquare,
  Plus,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
} from "lucide-react";
import { ChevronRight, RefreshCw, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "../lib/supabaseClient";

export const Route = createFileRoute("/gaps")({
  head: () => ({
    meta: [
      { title: "Fill My Slots — DSM" },
      {
        name: "description",
        content: "Find the right pupil for a free lesson slot in seconds.",
      },
    ],
  }),
  component: GapsPage,
});

const FONT = { fontFamily: "Inter, sans-serif" } as const;
const NAVY = "#0F2044";
const BLUE = "#1A52A0";
const BLUE_BRIGHT = "#3B82F6";
const TINT = "#E0F4FF";
const TEAL = "#00B5A5";
const MUTED = "#6B7280";
const BORDER = "#E2E6ED";
const DAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

interface FreeSlot {
  date: string;
  startTime: string;
  endTime: string;
  gapMinutes: number;
  possibleDurations: number[];
  bufferMinutes?: number;
}

interface DayGroup {
  iso: string;
  dayName: string;
  isWorkDay: boolean;
  slots: FreeSlot[];
  totalFreeMinutes: number;
  busyMinutes: number;
  busy: BusyEntry[];
  lunch?: { start: string; end: string } | null;
}

interface BusyEntry {
  start: number; // minutes from midnight
  end: number;
  title: string;
  color: string;
}

const BUSY_PALETTE = ["#EF4444", "#F97316", "#3B82F6", "#8B5CF6", "#10B981", "#EC4899"];
function pickBusyColor(preferred: string | null | undefined, idx: number) {
  if (preferred && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(preferred)) return preferred;
  return BUSY_PALETTE[idx % BUSY_PALETTE.length];
}
function fmtGap(mins: number) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h && m) return `${h}h ${m}m`;
  if (h) return `${h}h`;
  return `${m}m`;
}

function addDaysIso(base: Date, n: number) {
  const d = new Date(base);
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

function hmToMin(t: string) {
  const [h, m] = t.split(":").map((x) => parseInt(x, 10));
  return (h || 0) * 60 + (m || 0);
}

function minToHm(m: number) {
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${String(h).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

function getCalendarBlocksForDate(
  calendarBlocks: Array<{ start_datetime?: string | null; end_datetime?: string | null; title?: string | null }>,
  dateStr: string,
): { startMins: number; endMins: number; title: string; isAllDay: boolean }[] {
  return (calendarBlocks || [])
    .filter((b) => {
      const startDate = (b.start_datetime ?? "").substring(0, 10);
      const endDate = (b.end_datetime ?? "").substring(0, 10);
      return (
        startDate === dateStr ||
        (startDate < dateStr && endDate > dateStr) ||
        (startDate < dateStr && endDate === dateStr)
      );
    })
    .map((b) => {
      const startDate = (b.start_datetime ?? "").substring(0, 10);
      const endDate = (b.end_datetime ?? "").substring(0, 10);
      const startTime = (b.start_datetime ?? "").substring(11, 16) || "00:00";
      const endTime = (b.end_datetime ?? "").substring(11, 16) || "23:59";
      const isAllDay =
        startTime === "00:00" && (endTime === "00:00" || endTime === "23:59");
      // For multi-day spans, clamp to full-day on interior/end dates.
      const spansIntoDay = startDate < dateStr;
      const spansOutOfDay = endDate > dateStr;
      return {
        startMins: isAllDay || spansIntoDay ? 0 : hmToMin(startTime),
        endMins: isAllDay || spansOutOfDay ? 1439 : hmToMin(endTime),
        title: b.title || "Busy",
        isAllDay,
      };
    });
}

function fmtSlotDateLong(iso: string) {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function fmt12h(t: string) {
  const [hStr, mStr] = t.split(":");
  let h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  const suffix = h >= 12 ? "pm" : "am";
  h = h % 12;
  if (h === 0) h = 12;
  return m === 0 ? `${h}${suffix}` : `${h}:${String(m).padStart(2, "0")}${suffix}`;
}

interface Pupil {
  id: string;
  name: string | null;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  postcode: string | null;
  calendar_colour: string | null;
  last_lesson_date: string | null;
}

interface Availability {
  pupil_id: string;
  available_days: string[] | null;
  available_from: string | null;
  available_until: string | null;
  min_notice_hours: number | null;
  short_notice_opt_in: boolean | null;
  preferred_duration_minutes: number | null;
}

interface Ranked {
  pupil: Pupil;
  settings: Availability | null;
  lastLesson: string | null;
  daysSince: number | null;
  score: number;
  dayMatch: "yes" | "no" | "unknown";
  shortNotice: boolean;
  shortNoticeOk: boolean;
  minNoticeHours: number;
  matchedSlots: SlotMatch[];
}

interface SelectedSlot {
  date: string;
  time: string;
  duration: number;
}

interface SlotMatch extends SelectedSlot {
  match: boolean;
  subScore: number;
}

interface OfferRow {
  id: string;
  pupil_id: string;
  slot_date: string;
  slot_time: string;
  duration_minutes: number;
  status: string;
  created_at: string;
  pupils?: { name: string | null; first_name: string | null } | null;
}

function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

function firstNameOf(p: Pupil) {
  return (
    p.first_name ||
    (p.name ? p.name.split(" ")[0] : "there") ||
    "there"
  );
}

function fullNameOf(p: Pupil) {
  return (
    p.name ||
    [p.first_name, p.last_name].filter(Boolean).join(" ") ||
    "Unnamed pupil"
  );
}

function fmtDateLong(iso: string) {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function fmtTimeHm(t: string) {
  return t.slice(0, 5);
}

function slotKey(s: SelectedSlot) {
  return `${s.date}|${s.time}|${s.duration}`;
}

function describeSlot(
  _p: Pupil,
  s: Availability | null,
  last: string | null,
  sl: SelectedSlot,
  nowMs: number,
) {
  const dayOfWeek = DAYS[new Date(sl.date + "T00:00:00").getDay()];
  const slotDateTime = new Date(`${sl.date}T${sl.time}:00`);
  let daysSince: number | null = null;
  if (last) {
    daysSince = Math.floor(
      (new Date(sl.date + "T00:00:00").getTime() -
        new Date(last + "T00:00:00").getTime()) /
        86400000,
    );
  }
  let dayMatch: "yes" | "no" | "unknown" = "unknown";
  let shortNotice = false;
  let shortNoticeOk = false;
  let minNoticeHours = 24;
  if (s) {
    const availDays = s.available_days || [];
    if (availDays.length) {
      dayMatch = availDays.includes(dayOfWeek) ? "yes" : "no";
    }
    const hoursUntilSlot = Math.floor(
      (slotDateTime.getTime() - nowMs) / 3600000,
    );
    minNoticeHours = s.min_notice_hours || 24;
    if (hoursUntilSlot < minNoticeHours) {
      shortNotice = true;
      if (s.short_notice_opt_in) shortNoticeOk = true;
    }
  }
  return { daysSince, dayMatch, shortNotice, shortNoticeOk, minNoticeHours };
}

function scoreSlot(
  p: Pupil,
  s: Availability | null,
  last: string | null,
  sl: SelectedSlot,
  nowMs: number,
): SlotMatch {
  let score = 50;
  const dayOfWeek = DAYS[new Date(sl.date + "T00:00:00").getDay()];
  const slotHour = parseInt(sl.time.split(":")[0], 10);
  const slotDateTime = new Date(`${sl.date}T${sl.time}:00`);

  if (last) {
    const daysSince = Math.floor(
      (new Date(sl.date + "T00:00:00").getTime() -
        new Date(last + "T00:00:00").getTime()) /
        86400000,
    );
    if (daysSince > 14) score += 20;
    else if (daysSince > 7) score += 10;
    else if (daysSince < 3) score -= 20;
  } else {
    score += 30;
  }

  if (s) {
    const availDays = s.available_days || [];
    if (availDays.length) {
      if (availDays.includes(dayOfWeek)) score += 15;
      else score -= 30;
    }
    const fromHour = parseInt((s.available_from || "08:00").split(":")[0], 10);
    const untilHour = parseInt(
      (s.available_until || "18:00").split(":")[0],
      10,
    );
    if (slotHour >= fromHour && slotHour < untilHour) score += 10;
    else score -= 20;

    const hoursUntilSlot = Math.floor(
      (slotDateTime.getTime() - nowMs) / 3600000,
    );
    const minNoticeHours = s.min_notice_hours || 24;
    if (hoursUntilSlot < minNoticeHours) {
      if (s.short_notice_opt_in) score += 5;
      else score -= 40;
    }
    if (s.preferred_duration_minutes === sl.duration) score += 10;
  }

  score = Math.max(0, Math.min(100, score));
  // Suppress unused parameter warning
  void p;
  return { ...sl, subScore: score, match: score >= 50 };
}

function GapsPage() {
  const navigate = useNavigate();
  console.log("[gaps] component mounted");
  const [userId, setUserId] = useState<string | null>(null);

  const [slotDate, setSlotDate] = useState<string>(todayIso());
  const [slotTime, setSlotTime] = useState<string>("10:00");
  const [duration, setDuration] = useState<number>(60);

  const [loading, setLoading] = useState(false);
  const [ranked, setRanked] = useState<Ranked[] | null>(null);
  const [searchSlots, setSearchSlots] = useState<SelectedSlot[]>([]);

  const [offers, setOffers] = useState<OfferRow[]>([]);
  const [offersOpen, setOffersOpen] = useState(false);
  const [monthlyRevenue, setMonthlyRevenue] = useState<number>(0);
  const [reloadKey, setReloadKey] = useState(0);

  const [freeSlots, setFreeSlots] = useState<FreeSlot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [selectedSlots, setSelectedSlots] = useState<SelectedSlot[]>([]);
  const [manualMode, setManualMode] = useState(false);
  const [dayGroups, setDayGroups] = useState<DayGroup[]>([]);
  const [hourlyRate, setHourlyRate] = useState<number>(0);
  const [calendarBlocks, setCalendarBlocks] = useState<Array<{ id: string; start_datetime: string; end_datetime: string; title: string | null }>>([]);

  useEffect(() => {
    console.log("[gaps] slot-detection effect fired; userId =", userId);
    if (!userId) return;
    let cancelled = false;
    (async () => {
      setSlotsLoading(true);
      try {
        const today = new Date();
        const startIso = todayIso();
        const endIso = addDaysIso(today, 14);
        const [lessonsRes, instrRes] = await Promise.all([
          supabase
            .from("lessons")
            .select("lesson_date,lesson_time,duration_minutes,notes,pupil_id,pupils(name,first_name,calendar_colour,buffer_before_minutes,buffer_after_minutes)")
            .eq("instructor_id", userId)
            .is("deleted_at", null)
            .in("status", ["confirmed", "pending"])
            .gte("lesson_date", startIso)
            .lte("lesson_date", endIso)
            .order("lesson_date", { ascending: true })
            .order("lesson_time", { ascending: true }),
          supabase
            .from("instructors")
            .select(
              "working_hours_start,working_hours_end,working_days,lesson_buffer_minutes,lesson_buffer_before,lesson_buffer_after,hourly_rate",
            )
            .eq("id", userId)
            .maybeSingle(),
        ]);

        // Fetch external calendar blocks in the same window.
        let blocks: Array<{ id: string; start_datetime: string; end_datetime: string; title: string | null }> = [];
        try {
          const { data: { session } } = await supabase.auth.getSession();
          const token = session?.access_token;
          if (token) {
            const SUPABASE_URL = "https://bjpqxfrihwjcqprmoqfs.supabase.co";
            const SUPABASE_ANON_KEY =
              "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJqcHF4ZnJpaHdqY3Fwcm1vcWZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0NzQ4MjEsImV4cCI6MjA5NzA1MDgyMX0.HKlgx3dxP3uxX9wMRRUnfb0IPwaBpFcut_iUgT5XFeo";
            const blocksRes = await fetch(
              `${SUPABASE_URL}/rest/v1/calendar_blocks?instructor_id=eq.${userId}&source=eq.external_calendar&start_datetime=gte.${startIso}&start_datetime=lte.${endIso}T23:59:59&select=id,start_datetime,end_datetime,title`,
              { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${token}` } },
            );
            if (blocksRes.ok) {
              const data = await blocksRes.json();
              if (Array.isArray(data)) blocks = data;
            }
          }
        } catch (err) {
          console.warn("[gaps] calendar_blocks fetch failed", err);
        }
        if (!cancelled) setCalendarBlocks(blocks);
        if (cancelled) return;
        console.log(
          "[gaps] lessons fetched:",
          (lessonsRes.data ?? []).length,
          "err:",
          lessonsRes.error,
        );
        console.log(
          "[gaps] instructor row:",
          instrRes.data,
          "err:",
          instrRes.error,
        );

        const instr = (instrRes.data ?? {}) as {
          working_hours_start?: string | null;
          working_hours_end?: string | null;
          working_days?: string[] | null;
          lesson_buffer_minutes?: number | null;
          lesson_buffer_before?: number | null;
          lesson_buffer_after?: number | null;
        };
        const workStart = instr.working_hours_start || "09:00";
        const workEnd = instr.working_hours_end || "18:00";
        const buffer = instr.lesson_buffer_minutes ?? 15;
        const instrBufBefore = instr.lesson_buffer_before ?? 0;
        const instrBufAfter = instr.lesson_buffer_after ?? 15;
        const workDays =
          instr.working_days && instr.working_days.length
            ? instr.working_days
            : ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
        console.log("[gaps] working days:", workDays, "hours:", workStart, "-", workEnd, "buffer:", buffer);
        const rate = Number(
          (instr as { hourly_rate?: number | null }).hourly_rate ?? 0,
        );
        if (!cancelled) setHourlyRate(rate);

        const byDay = new Map<
          string,
          { start: number; end: number; title: string; color: string | null; bufBefore: number; bufAfter: number }[]
        >();
        let busyIdx = 0;
        for (const l of (lessonsRes.data ?? []) as {
          lesson_date: string | null;
          lesson_time: string | null;
          duration_minutes: number | null;
          notes: string | null;
          pupil_id?: string | null;
          pupils?: { name?: string | null; first_name?: string | null; calendar_colour?: string | null; buffer_before_minutes?: number | null; buffer_after_minutes?: number | null } | null;
        }[]) {
          if (!l.lesson_date || !l.lesson_time) continue;
          const s = hmToMin(l.lesson_time);
          const e = s + (l.duration_minutes ?? 60);
          const title =
            l.pupils?.name ||
            l.pupils?.first_name ||
            (l.notes ? l.notes.split("\n")[0].slice(0, 40) : null) ||
            "Lesson";
          const bufBefore = l.pupils?.buffer_before_minutes != null
            ? Number(l.pupils.buffer_before_minutes)
            : instrBufBefore;
          const bufAfter = l.pupils?.buffer_after_minutes != null
            ? Number(l.pupils.buffer_after_minutes)
            : instrBufAfter;
          const arr = byDay.get(l.lesson_date) ?? [];
          arr.push({ start: s, end: e, title, color: l.pupils?.calendar_colour ?? null, bufBefore, bufAfter });
          byDay.set(l.lesson_date, arr);
          busyIdx++;
        }
        void busyIdx;

        const slots: FreeSlot[] = [];
        const groups: DayGroup[] = [];
        const wsMin = hmToMin(workStart);
        const weMin = hmToMin(workEnd);
        for (let i = 0; i < 14; i++) {
          const dt = new Date(today);
          dt.setDate(dt.getDate() + i);
          const dayName = DAYS[dt.getDay()];
          const iso = addDaysIso(today, i);
          const isWorkDay = workDays.includes(dayName);
          // Merge external calendar blocks as pseudo-lessons for gap detection.
          const dayBlocks = getCalendarBlocksForDate(blocks, iso).map((b) => ({
            start: b.startMins,
            end: b.endMins,
            title: `🗓 ${b.title}`,
            color: "#7C3AED" as string | null,
            bufBefore: 0,
            bufAfter: 0,
          }));
          const dayLessons = [...(byDay.get(iso) ?? []), ...dayBlocks].slice().sort(
            (a, b) => a.start - b.start,
          );
          const busyMinutes = dayLessons.reduce(
            (sum, l) => sum + (l.end - l.start),
            0,
          );
          if (!isWorkDay) {
            groups.push({
              iso,
              dayName,
              isWorkDay: false,
              slots: [],
              totalFreeMinutes: 0,
              busyMinutes,
              busy: dayLessons.map((l, i) => ({
                start: l.start,
                end: l.end,
                title: l.title,
                color: pickBusyColor(l.color, i),
              })),
            });
            continue;
          }
          // Build gap boundaries. Reserve buffer for BOTH sides:
          //   • the existing adjacent lesson's own buffer (pupil override or instructor default), and
          //   • the NEW lesson we'd slot in, which needs the instructor default buffer around itself.
          // start/end are the USABLE window (buffer-adjusted); bufferTotal is the total minutes
          // reserved on both sides so the display can show "usable (raw − buffer)".
          const gaps: { start: number; end: number; bufferTotal: number }[] = [];
          let rawCursor = wsMin;               // real end of the previous block (lesson end or workday start)
          let prevBufAfter = 0;                 // existing lesson's after-buffer (0 at workday start)
          let hasPrevLesson = false;            // false only for the very first gap of the day
          for (const l of dayLessons) {
            const rawEnd = l.start;
            const leftReserve = hasPrevLesson ? prevBufAfter + instrBufBefore : 0;
            const rightReserve = l.bufBefore + instrBufAfter;
            const effStart = rawCursor + leftReserve;
            const effEnd = rawEnd - rightReserve;
            if (effEnd - effStart >= 60) {
              gaps.push({
                start: effStart,
                end: effEnd,
                bufferTotal: leftReserve + rightReserve,
              });
            }
            rawCursor = Math.max(rawCursor, l.end);
            prevBufAfter = l.bufAfter;
            hasPrevLesson = true;
          }
          // Tail gap to end of workday (no next lesson → no right-side reserve)
          const leftReserve = hasPrevLesson ? prevBufAfter + instrBufBefore : 0;
          const tailStart = rawCursor + leftReserve;
          if (weMin - tailStart >= 60) {
            gaps.push({ start: tailStart, end: weMin, bufferTotal: leftReserve });
          }
          const daySlots: FreeSlot[] = [];
          let dayFree = 0;
          for (const g of gaps) {
            let gStart = g.start;
            if (i === 0) {
              const nowMins = today.getHours() * 60 + today.getMinutes();
              const minStartMins = nowMins + 30; // at least 30 mins from now
              if (gStart < minStartMins) gStart = Math.ceil(minStartMins / 15) * 15;
              if (gStart >= g.end) continue; // slot fully in the past / too soon
            }
            const gapMinutes = g.end - gStart;
            if (gapMinutes < 60) continue;
            const possible = [60, 90, 120].filter((d) => d <= gapMinutes);
            if (!possible.length) continue;
            const slot: FreeSlot = {
              date: iso,
              startTime: minToHm(gStart),
              endTime: minToHm(g.end),
              gapMinutes,
              possibleDurations: possible,
              bufferMinutes: g.bufferTotal,
            };
            slots.push(slot);
            daySlots.push(slot);
            dayFree += gapMinutes;
          }
          groups.push({
            iso,
            dayName,
            isWorkDay: true,
            slots: daySlots,
            totalFreeMinutes: dayFree,
            busyMinutes,
            busy: dayLessons.map((l, i) => ({
              start: l.start,
              end: l.end,
              title: l.title,
              color: pickBusyColor(l.color, i),
            })),
          });
        }
        if (!cancelled) {
          setFreeSlots(slots);
          setDayGroups(groups);
          console.log(
            "[gaps] detected",
            slots.length,
            "free slots across",
            groups.filter((g) => g.slots.length > 0).length,
            "days",
          );
        }
      } catch (err) {
        console.error("[gaps] free-slot detection failed:", err);
        if (!cancelled) {
          setFreeSlots([]);
          setDayGroups([]);
        }
      } finally {
        if (!cancelled) setSlotsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, reloadKey]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data, error }) => {
      console.log("[gaps] getUser →", data?.user?.id, "err:", error);
      setUserId(data.user?.id ?? null);
    });
  }, []);

  useEffect(() => {
    if (!userId) return;
    (async () => {
      const { data: offerRows } = await supabase
        .from("gap_filler_offers")
        .select("*, pupils(name, first_name)")
        .eq("instructor_id", userId)
        .order("created_at", { ascending: false })
        .limit(10);
      setOffers((offerRows ?? []) as OfferRow[]);

      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
        .toISOString()
        .slice(0, 10);
      const { data: accepted } = await supabase
        .from("gap_filler_offers")
        .select("id")
        .eq("instructor_id", userId)
        .eq("status", "accepted")
        .gte("created_at", monthStart);
      const { data: recent } = await supabase
        .from("lesson_history")
        .select("lesson_cost")
        .eq("instructor_id", userId)
        .eq("payment_status", "paid")
        .order("created_at", { ascending: false })
        .limit(20);
      const paid = (recent ?? [])
        .map((r: { lesson_cost: number | null }) => Number(r.lesson_cost ?? 0))
        .filter((n: number) => n > 0);
      const avg = paid.length
        ? paid.reduce((a: number, b: number) => a + b, 0) / paid.length
        : 40;
      setMonthlyRevenue(Math.round((accepted?.length ?? 0) * avg * 100) / 100);
    })();
  }, [userId, reloadKey]);

  async function findPupils(override?: SelectedSlot[]) {
    if (!userId) return;
    const slotsToScore = override && override.length ? override : selectedSlots;
    if (slotsToScore.length === 0) return;
    setLoading(true);
    setRanked(null);
    try {
      const [pupilsRes, availRes, lessonsRes] = await Promise.all([
        supabase
          .from("pupils")
          .select(
            "id,name,first_name,last_name,phone,postcode,calendar_colour,last_lesson_date",
          )
          .eq("instructor_id", userId)
          .eq("status", "active")
          .is("deleted_at", null),
        supabase
          .from("pupil_ready_to_learn_settings")
          .select("*")
          .eq("instructor_id", userId),
        supabase
          .from("lessons")
          .select("pupil_id,lesson_date,lesson_time")
          .eq("instructor_id", userId)
          .is("deleted_at", null)
          .in("status", ["completed", "confirmed"])
          .order("lesson_date", { ascending: false }),
      ]);

      const pupils = (pupilsRes.data ?? []) as Pupil[];
      const availMap = new Map<string, Availability>();
      for (const a of (availRes.data ?? []) as Availability[]) {
        if (a.pupil_id) availMap.set(a.pupil_id, a);
      }
      const lastLessonMap = new Map<string, string>();
      for (const l of (lessonsRes.data ?? []) as {
        pupil_id: string | null;
        lesson_date: string | null;
      }[]) {
        if (!l.pupil_id || !l.lesson_date) continue;
        if (!lastLessonMap.has(l.pupil_id))
          lastLessonMap.set(l.pupil_id, l.lesson_date);
      }

      const nowMs = Date.now();
      // slotsToScore captured above

      const scored: Ranked[] = pupils.map((p) => {
        const s = availMap.get(p.id) || null;
        const last = lastLessonMap.get(p.id) || p.last_lesson_date || null;
        const matched: SlotMatch[] = slotsToScore.map((sl) =>
          scoreSlot(p, s, last, sl, nowMs),
        );
        const matchCount = matched.filter((m) => m.match).length;
        const avg =
          matched.reduce((sum, m) => sum + m.subScore, 0) /
          Math.max(1, matched.length);
        const score = Math.max(
          0,
          Math.min(
            100,
            Math.round((matchCount / matched.length) * 60 + avg * 0.4),
          ),
        );
        // Best slot for "summary" fields
        const best = matched.reduce((a, b) =>
          b.subScore > a.subScore ? b : a,
        );
        const bestInfo = describeSlot(p, s, last, best, nowMs);
        return {
          pupil: p,
          settings: s,
          lastLesson: last,
          daysSince: bestInfo.daysSince,
          score,
          dayMatch: bestInfo.dayMatch,
          shortNotice: bestInfo.shortNotice,
          shortNoticeOk: bestInfo.shortNoticeOk,
          minNoticeHours: bestInfo.minNoticeHours,
          matchedSlots: matched,
        };
      });

      scored.sort((a, b) => b.score - a.score);
      setRanked(scored);
      setSearchSlots(slotsToScore);
    } catch (err) {
      console.error("[gaps] findPupils failed:", err);
      toast.error("Could not load pupils");
    } finally {
      setLoading(false);
    }
  }

  async function logOffer(pupilId: string, via: "sms" | "message") {
    if (!userId) return;
    const slots = searchSlots.length ? searchSlots : selectedSlots;
    if (!slots.length) return;
    try {
      const rows = slots.map((s) => ({
        instructor_id: userId,
        pupil_id: pupilId,
        slot_date: s.date,
        slot_time: s.time,
        duration_minutes: s.duration,
        status: "sent",
        sent_via: via,
      }));
      const { error } = await supabase.from("gap_filler_offers").insert(rows);
      if (error) throw error;
      setReloadKey((k) => k + 1);
    } catch (err) {
      console.warn("[gaps] logOffer failed:", err);
    }
  }

  function handleText(r: Ranked) {
    const first = firstNameOf(r.pupil);
    const matches = r.matchedSlots.filter((m) => m.match);
    const offerSlots =
      matches.length > 0 ? matches : r.matchedSlots;
    let body: string;
    if (offerSlots.length === 1) {
      const s = offerSlots[0];
      body = `Hi ${first}, I have a ${s.duration} minute lesson slot available on ${fmtDateLong(s.date)} at ${fmtTimeHm(s.time)}. Would you like it? Reply YES to confirm or let me know if another time works better. Thanks!`;
    } else {
      const lines = offerSlots
        .map(
          (s) =>
            `- ${fmtDateLong(s.date)} at ${fmtTimeHm(s.time)} (${s.duration} min)`,
        )
        .join("\n");
      body = `Hi ${first}, I have ${offerSlots.length} lesson slots available — would any of these suit you?\n${lines}\nReply with which one(s) you'd like and I'll get you booked in!`;
    }
    const phone = r.pupil.phone || "";
    const href = `sms:${phone}?body=${encodeURIComponent(body)}`;
    window.location.href = href;
    void logOffer(r.pupil.id, "sms");
  }

  function handleMessage(r: Ranked) {
    void logOffer(r.pupil.id, "message");
    navigate({ to: "/messages/$pupilId", params: { pupilId: r.pupil.id } });
  }

  function handleBook(r: Ranked) {
    const matches = r.matchedSlots.filter((m) => m.match);
    const s = matches[0] || r.matchedSlots[0];
    if (!s) return;
    const qs = new URLSearchParams({
      pupilId: r.pupil.id,
      date: s.date,
      time: s.time,
      duration: String(s.duration),
    });
    navigate({ to: `/lessons/new?${qs.toString()}` as unknown as "/lessons/new" });
  }

  const noGoodMatches = useMemo(
    () =>
      ranked !== null && ranked.length > 0 && ranked.every((r) => r.score < 20),
    [ranked],
  );

  const dayOfWeekLabel =
    searchSlots[0]
      ? DAYS[new Date(searchSlots[0].date + "T00:00:00").getDay()]
      : "";

  // NOTE: Potential earnings requires hourlyRate from profile — if 0/absent we render "—" per spec.
  const totalFreeMinsAll = dayGroups.reduce((s, d) => s + d.totalFreeMinutes, 0);
  const potentialValue =
    hourlyRate > 0
      ? `£${Math.round((totalFreeMinsAll / 60) * hourlyRate).toLocaleString()}`
      : "—";
  const daysWithGaps = dayGroups.filter((g) => g.slots.length > 0).length;

  const HAIRLINE = "#EEF2F7";
  const CHIP_BG = "#E6F1FB";
  const ACCENT = "#185FA5";
  const TEXT_PRIMARY = "#12142B";
  const TEXT_MUTED = "#B0BAC9";
  const TEXT_SUBTLE = "#8A94A6";

  return (
    <div
      className="min-h-screen"
      style={{ ...FONT, backgroundColor: "#F7F9FC", margin: -8 }}
    >
      {/* Header — dark navy */}
      <div
        style={{
          background: NAVY,
          padding: "16px 18px 20px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 16,
          }}
        >
          <button
            onClick={() => navigate({ to: "/home" })}
            aria-label="Back"
            style={{
              width: 34,
              height: 34,
              borderRadius: 10,
              background: "rgba(255,255,255,0.1)",
              border: "none",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              color: "#FFFFFF",
              flexShrink: 0,
            }}
          >
            <ArrowLeft size={17} />
          </button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1
              style={{
                ...FONT,
                color: "#FFFFFF",
                fontSize: 18,
                fontWeight: 600,
                margin: 0,
                lineHeight: 1.2,
              }}
            >
              Fill My Slots
            </h1>
            <div
              style={{
                color: "#9AA7C4",
                fontSize: 12,
                marginTop: 1,
              }}
            >
              Available gaps in the next 14 days
            </div>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: 10,
          }}
        >
          {[
            { label: "SLOTS", value: String(freeSlots.length), color: "#FFFFFF" },
            { label: "DAYS", value: String(daysWithGaps), color: "#FFFFFF" },
            {
              label: "POTENTIAL",
              value: potentialValue,
              color: hourlyRate > 0 ? "#2E9E5B" : "#9AA7C4",
            },
          ].map((s) => (
            <div
              key={s.label}
              style={{
                background: "rgba(255,255,255,0.08)",
                borderRadius: 14,
                padding: "12px 14px",
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 500,
                  color: "#9AA7C4",
                  letterSpacing: "0.03em",
                  marginBottom: 6,
                }}
              >
                {s.label}
              </div>
              <div
                style={{
                  fontSize: 22,
                  fontWeight: 600,
                  color: s.color,
                  lineHeight: 1.1,
                }}
              >
                {s.value}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Ranking info card */}
      <div
        style={{
          background: "#FFFFFF",
          borderRadius: 12,
          padding: "10px 14px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
          margin: "14px 16px 16px",
          display: "flex",
          alignItems: "flex-start",
          gap: 10,
        }}
      >
        <Zap
          size={16}
          color={ACCENT}
          style={{ flexShrink: 0, marginTop: 1 }}
        />
        <div style={{ fontSize: 12, color: TEXT_SUBTLE, lineHeight: 1.5 }}>
          We rank pupils by availability, preferences and time since last lesson.
        </div>
      </div>

      {/* Section header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 16px",
          marginBottom: 4,
        }}
      >
        <div style={{ fontSize: 15, fontWeight: 600, color: TEXT_PRIMARY }}>
          Your free slots
        </div>
        {freeSlots.length > 0 && (
          <button
            onClick={() => {
              if (selectedSlots.length > 0) {
                setSelectedSlots([]);
              } else {
                setSelectedSlots(
                  freeSlots.map((s) => ({
                    date: s.date,
                    time: s.startTime,
                    duration: 60,
                  })),
                );
              }
            }}
            style={{
              background: "transparent",
              border: "none",
              padding: 0,
              fontSize: 13,
              fontWeight: 500,
              color: ACCENT,
              cursor: "pointer",
            }}
          >
            {selectedSlots.length > 0 ? "Clear all" : "Select all"}
          </button>
        )}
      </div>
      <div
        style={{
          fontSize: 12,
          color: TEXT_MUTED,
          padding: "0 16px",
          marginBottom: 16,
        }}
      >
        {slotsLoading
          ? "Scanning diary…"
          : `${freeSlots.length} free slot${freeSlots.length === 1 ? "" : "s"} across ${daysWithGaps} day${daysWithGaps === 1 ? "" : "s"}`}
      </div>

      <div>
        {!slotsLoading && freeSlots.length === 0 && (
          <div
            style={{
              background: "#FFFFFF",
              borderRadius: 14,
              padding: 24,
              margin: "0 16px 14px",
              textAlign: "center",
              boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 999,
                background: CHIP_BG,
                margin: "0 auto 10px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <CalendarIcon size={20} color={ACCENT} />
            </div>
            <div style={{ color: TEXT_PRIMARY, fontWeight: 600, fontSize: 15 }}>
              No free slots in the next 14 days
            </div>
            <div style={{ color: TEXT_SUBTLE, fontSize: 13, marginTop: 6 }}>
              Your diary looks full — check your schedule
            </div>
            <button
              onClick={() => navigate({ to: "/schedule" })}
              style={{
                marginTop: 12,
                background: "transparent",
                border: "none",
                color: ACCENT,
                fontWeight: 600,
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              View schedule →
            </button>
          </div>
        )}

        {dayGroups.map((g) => {
          const shortLabel = new Date(g.iso + "T00:00:00").toLocaleDateString(
            "en-GB",
            { weekday: "short", day: "numeric", month: "short" },
          );
          const hasGaps = g.slots.length > 0;
          const dotColor = hasGaps ? ACCENT : TEXT_MUTED;
          const dayLabelColor = hasGaps ? TEXT_PRIMARY : TEXT_SUBTLE;

          return (
            <div key={g.iso} style={{ marginBottom: 14 }}>
              {/* Day header row */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "0 16px",
                  marginBottom: 8,
                }}
              >
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 999,
                      background: dotColor,
                      display: "inline-block",
                    }}
                  />
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 500,
                      color: dayLabelColor,
                    }}
                  >
                    {shortLabel}
                  </span>
                  {!g.isWorkDay && (
                    <span style={{ fontSize: 11, color: TEXT_MUTED }}>
                      · day off
                    </span>
                  )}
                </span>
                <button
                  onClick={() => {
                    setManualMode(true);
                    setSlotDate(g.iso);
                    setSelectedSlots([]);
                  }}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    background: CHIP_BG,
                    border: "none",
                    borderRadius: 20,
                    padding: "6px 12px",
                    fontSize: 12,
                    fontWeight: 500,
                    color: ACCENT,
                    cursor: "pointer",
                  }}
                >
                  <Plus size={12} /> Add
                </button>
              </div>

              {/* Day content card */}
              <div
                style={{
                  background: "#FFFFFF",
                  borderRadius: 14,
                  overflow: "hidden",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
                  margin: "0 16px",
                }}
              >
                {!hasGaps && (
                  <div
                    style={{
                      padding: "14px 16px",
                      textAlign: "center",
                      fontSize: 13,
                      color: TEXT_MUTED,
                    }}
                  >
                    {g.isWorkDay
                      ? "Nothing scheduled"
                      : "Day off — tap Add to open"}
                  </div>
                )}

                {g.slots.map((slot, i) => {
                  const isLast = i === g.slots.length - 1;
                  const anySelected = slot.possibleDurations.some((d) =>
                    selectedSlots.some(
                      (s) =>
                        slotKey(s) ===
                        slotKey({
                          date: slot.date,
                          time: slot.startTime,
                          duration: d,
                        }),
                    ),
                  );
                  const default60Key = slotKey({
                    date: slot.date,
                    time: slot.startTime,
                    duration: 60,
                  });
                  return (
                    <div
                      key={`gap-${slot.startTime}`}
                      style={{
                        borderBottom: isLast
                          ? "none"
                          : `0.5px solid ${HAIRLINE}`,
                      }}
                    >
                      <button
                        onClick={() => {
                          setSelectedSlots((prev) => {
                            const exists = prev.some(
                              (s) => slotKey(s) === default60Key,
                            );
                            if (exists)
                              return prev.filter(
                                (s) =>
                                  !(
                                    s.date === slot.date &&
                                    s.time === slot.startTime
                                  ),
                              );
                            return [
                              ...prev,
                              {
                                date: slot.date,
                                time: slot.startTime,
                                duration: 60,
                              },
                            ];
                          });
                        }}
                        style={{
                          width: "100%",
                          textAlign: "left",
                          background: anySelected ? "#F3F8FF" : "#FFFFFF",
                          border: "none",
                          padding: "13px 16px",
                          display: "flex",
                          alignItems: "center",
                          gap: 12,
                          cursor: "pointer",
                        }}
                      >
                        <div
                          style={{
                            width: 40,
                            height: 40,
                            borderRadius: 12,
                            background: CHIP_BG,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                          }}
                        >
                          <Zap size={20} color={ACCENT} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            style={{
                              color: TEXT_PRIMARY,
                              fontWeight: 500,
                              fontSize: 14,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {fmtGap(slot.gapMinutes)} free
                          </div>
                          <div
                            style={{
                              color: TEXT_MUTED,
                              fontSize: 12,
                              marginTop: 1,
                            }}
                          >
                            {minToHm(hmToMin(slot.startTime))} –{" "}
                            {minToHm(hmToMin(slot.endTime))} · tap to fill
                          </div>
                        </div>
                        <RefreshCw
                          size={16}
                          color={TEXT_MUTED}
                          style={{ flexShrink: 0 }}
                        />
                        <ChevronRight
                          size={16}
                          color={TEXT_MUTED}
                          style={{ flexShrink: 0 }}
                        />
                      </button>

                      {anySelected && slot.possibleDurations.length > 1 && (
                        <div
                          style={{
                            display: "flex",
                            flexWrap: "wrap",
                            gap: 6,
                            padding: "0 16px 12px",
                          }}
                        >
                          {slot.possibleDurations.map((d) => {
                            const key = slotKey({
                              date: slot.date,
                              time: slot.startTime,
                              duration: d,
                            });
                            const isSelected = selectedSlots.some(
                              (s) => slotKey(s) === key,
                            );
                            return (
                              <button
                                key={d}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedSlots((prev) => {
                                    const filtered = prev.filter(
                                      (s) =>
                                        !(
                                          s.date === slot.date &&
                                          s.time === slot.startTime
                                        ),
                                    );
                                    if (isSelected) return filtered;
                                    return [
                                      ...filtered,
                                      {
                                        date: slot.date,
                                        time: slot.startTime,
                                        duration: d,
                                      },
                                    ];
                                  });
                                }}
                                style={{
                                  background: isSelected ? ACCENT : "#FFFFFF",
                                  color: isSelected ? "#FFFFFF" : TEXT_SUBTLE,
                                  border: `1px solid ${isSelected ? ACCENT : HAIRLINE}`,
                                  borderRadius: 999,
                                  padding: "4px 10px",
                                  fontSize: 11,
                                  fontWeight: 500,
                                  cursor: "pointer",
                                }}
                              >
                                {d} MIN
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {!slotsLoading && dayGroups.length > 0 && (
          <SummaryStats
            dayGroups={dayGroups}
            hourlyRate={hourlyRate}
          />
        )}


        <div style={{ marginTop: 8, textAlign: "center" }}>
          <button
            onClick={() => setManualMode((m) => !m)}
            style={{
              background: "transparent",
              border: "none",
              color: BLUE,
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {manualMode
              ? "Hide manual entry"
              : "Don't see the right slot? Enter manually →"}
          </button>
        </div>

        {manualMode && (
          <div
            style={{
              background: "#FFFFFF",
              border: `0.5px solid ${BORDER}`,
              borderRadius: 12,
              padding: 16,
              marginTop: 8,
            }}
          >
            <FieldLabel>Date</FieldLabel>
            <input
              type="date"
              value={slotDate}
              onChange={(e) => {
                setSlotDate(e.target.value);
                setSelectedSlots([]);
              }}
              style={inputStyle}
            />
            <div style={{ height: 10 }} />
            <FieldLabel>Start time</FieldLabel>
            <input
              type="time"
              value={slotTime}
              onChange={(e) => {
                setSlotTime(e.target.value);
                setSelectedSlots([]);
              }}
              style={inputStyle}
            />
            <div style={{ height: 10 }} />
            <FieldLabel>Duration</FieldLabel>
            <select
              value={duration}
              onChange={(e) => {
                setDuration(parseInt(e.target.value, 10));
                setSelectedSlots([]);
              }}
              style={inputStyle}
            >
              <option value={60}>60 mins</option>
              <option value={90}>90 mins</option>
              <option value={120}>120 mins</option>
            </select>
            <button
              onClick={() => {
                const one: SelectedSlot = {
                  date: slotDate,
                  time: slotTime,
                  duration,
                };
                setSelectedSlots([one]);
                void findPupils([one]);
              }}
              disabled={loading}
              style={{
                marginTop: 16,
                width: "100%",
                height: 48,
                borderRadius: 12,
                background: NAVY,
                color: "#FFFFFF",
                fontWeight: 600,
                fontSize: 15,
                border: "none",
                cursor: "pointer",
                opacity: loading ? 0.6 : 1,
              }}
            >
              {loading ? "Finding pupils…" : "Find pupils →"}
            </button>
          </div>
        )}
      </div>

      {monthlyRevenue > 0 && (
        <div
          style={{
            background: "#E0FFF4",
            border: "1px solid #86EFAC",
            borderRadius: 12,
            padding: 16,
            margin: "12px 16px 0",
            color: "#065F46",
            fontWeight: 600,
            fontSize: 14,
          }}
        >
          💰 Revenue recovered this month: £{monthlyRevenue.toFixed(2)}
        </div>
      )}

      {ranked !== null && (
        <div style={{ marginTop: 16 }}>
          <div style={{ margin: "0 16px 8px" }}>
            <div style={{ fontWeight: 700, color: NAVY, fontSize: 16 }}>
              {ranked.length} pupil{ranked.length === 1 ? "" : "s"} ranked for{" "}
              {searchSlots.length} slot{searchSlots.length === 1 ? "" : "s"}
            </div>
            <div style={{ color: MUTED, fontSize: 13 }}>
              {searchSlots.length === 1
                ? `${fmtDateLong(searchSlots[0].date)} at ${fmtTimeHm(searchSlots[0].time)} · ${searchSlots[0].duration} min`
                : `Across ${new Set(searchSlots.map((s) => s.date)).size} day${new Set(searchSlots.map((s) => s.date)).size === 1 ? "" : "s"}`}
            </div>
          </div>

          {ranked.length === 0 && (
            <div
              style={{
                margin: "0 16px",
                padding: 24,
                textAlign: "center",
                border: `0.5px solid ${BORDER}`,
                borderRadius: 12,
                background: "#FFFFFF",
              }}
            >
              <Users size={40} color="#9CA3AF" style={{ margin: "0 auto" }} />
              <div style={{ fontWeight: 600, color: NAVY, marginTop: 8 }}>
                No active pupils found
              </div>
              <div style={{ color: MUTED, fontSize: 13, marginTop: 4 }}>
                Add pupils to DSM to use gap filler
              </div>
            </div>
          )}

          {noGoodMatches && (
            <div
              style={{
                margin: "0 16px 12px",
                padding: 16,
                background: "#FEF3C7",
                border: "1px solid #FCD34D",
                borderRadius: 12,
              }}
            >
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  alignItems: "center",
                  color: "#92400E",
                  fontWeight: 700,
                  fontSize: 14,
                }}
              >
                <AlertTriangle size={16} /> No strong matches for this slot
              </div>
              <div style={{ color: "#78350F", fontSize: 13, marginTop: 6 }}>
                These pupils have low availability for this time — consider
                offering to EveryDriver instead.
              </div>
              <button
                onClick={() => navigate({ to: "/marketplace" })}
                style={{
                  marginTop: 10,
                  background: "#0F2044",
                  color: "#FFFFFF",
                  border: "none",
                  borderRadius: 12,
                  padding: "8px 14px",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Post to EveryDriver →
              </button>
            </div>
          )}

          {ranked.map((r, idx) => (
            <PupilCard
              key={r.pupil.id}
              rank={idx + 1}
              r={r}
              dayOfWeekLabel={dayOfWeekLabel}
              multi={searchSlots.length > 1}
              onText={() => handleText(r)}
              onMessage={() => handleMessage(r)}
              onBook={() => handleBook(r)}
            />
          ))}
        </div>
      )}

      <div style={{ margin: "16px 16px 40px" }}>
        <button
          onClick={() => setOffersOpen((o) => !o)}
          style={{
            width: "100%",
            background: "#FFFFFF",
            border: `1px solid ${BORDER}`,
            borderRadius: 16,
            padding: "14px 16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            cursor: "pointer",
          }}
        >
          <span
            style={{
              fontWeight: 700,
              color: NAVY,
              fontSize: 14,
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            Recent offers
            <span
              style={{
                background: TINT,
                color: BLUE,
                fontSize: 11,
                fontWeight: 700,
                padding: "2px 8px",
                borderRadius: 999,
              }}
            >
              {offers.length}
            </span>
          </span>
          {offersOpen ? (
            <ChevronUp size={18} color={MUTED} />
          ) : (
            <ChevronDown size={18} color={MUTED} />
          )}
        </button>
        {offersOpen && (
          <div style={{ marginTop: 10 }}>
            {offers.length === 0 && (
              <div
                style={{
                  color: MUTED,
                  fontSize: 13,
                  padding: "10px 4px",
                  textAlign: "center",
                }}
              >
                No offers yet.
              </div>
            )}
            {offers.map((o) => (
              <div
                key={o.id}
                style={{
                  background: "#F8FAFC",
                  borderRadius: 12,
                  padding: "10px 12px",
                  marginBottom: 6,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  <div style={{ color: NAVY, fontWeight: 600, fontSize: 13 }}>
                    {o.pupils?.name || o.pupils?.first_name || "Pupil"}
                  </div>
                  <div style={{ color: MUTED, fontSize: 12 }}>
                    {fmtDateLong(o.slot_date)} · {fmtTimeHm(o.slot_time)} ·{" "}
                    {o.duration_minutes}m
                  </div>
                </div>
                <StatusBadge status={o.status} />
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedSlots.length > 0 && (
        <>
          <div style={{ height: 108 }} />
          <div
            style={{
              position: "fixed",
              bottom: 80,
              left: 0,
              right: 0,
              padding: "14px 20px",
              background: "rgba(255,255,255,0.92)",
              backdropFilter: "blur(8px)",
              WebkitBackdropFilter: "blur(8px)",
              borderTop: `1px solid ${BORDER}`,
              zIndex: 50,
            }}
          >
            <button
              onClick={() => void findPupils()}
              disabled={loading}
              style={{
                width: "100%",
                background: BLUE_BRIGHT,
                color: "#FFFFFF",
                fontWeight: 700,
                fontSize: 15,
                borderRadius: 16,
                border: "none",
                padding: "14px 20px",
                cursor: "pointer",
                opacity: loading ? 0.6 : 1,
                boxShadow:
                  "0 8px 20px rgba(59, 130, 246, 0.28)",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
              }}
            >
              {loading
                ? "Finding…"
                : `Find pupils for ${selectedSlots.length} slot${selectedSlots.length === 1 ? "" : "s"} →`}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function SummaryStats({
  dayGroups,
  hourlyRate,
}: {
  dayGroups: DayGroup[];
  hourlyRate: number;
}) {
  const workDays = dayGroups.filter((d) => d.isWorkDay);
  if (!workDays.length) return null;
  const busiest = workDays.reduce((a, b) =>
    b.busyMinutes > a.busyMinutes ? b : a,
  );
  const mostFree = workDays.reduce((a, b) =>
    b.totalFreeMinutes > a.totalFreeMinutes ? b : a,
  );
  const totalFreeMins = workDays.reduce((s, d) => s + d.totalFreeMinutes, 0);
  const totalFreeHours = totalFreeMins / 60;
  const potential = hourlyRate > 0 ? totalFreeHours * hourlyRate : 0;

  const dayLabel = (iso: string) =>
    new Date(iso + "T00:00:00").toLocaleDateString("en-GB", {
      weekday: "long",
    });

  return (
    <div
      style={{
        background: "#FFFFFF",
        border: `0.5px solid ${BORDER}`,
        borderRadius: 12,
        padding: 14,
        margin: "12px 16px 0",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          padding: "4px 0",
          fontSize: 13,
        }}
      >
        <span style={{ color: MUTED }}>Busiest day this week:</span>
        <span style={{ color: NAVY, fontWeight: 600 }}>
          {busiest.busyMinutes > 0 ? dayLabel(busiest.iso) : "—"}
        </span>
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          padding: "4px 0",
          fontSize: 13,
        }}
      >
        <span style={{ color: MUTED }}>Most free time:</span>
        <span style={{ color: NAVY, fontWeight: 600 }}>
          {mostFree.totalFreeMinutes > 0
            ? `${dayLabel(mostFree.iso)} · ${(mostFree.totalFreeMinutes / 60).toFixed(1)}h`
            : "—"}
        </span>
      </div>
      {hourlyRate > 0 && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            padding: "4px 0",
            fontSize: 13,
          }}
        >
          <span style={{ color: MUTED }}>Potential revenue if filled:</span>
          <span style={{ color: "#065F46", fontWeight: 700 }}>
            £{potential.toFixed(0)}
          </span>
        </div>
      )}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  height: 44,
  borderRadius: 10,
  border: `0.5px solid ${BORDER}`,
  padding: "0 12px",
  fontSize: 14,
  color: NAVY,
  background: "#FFFFFF",
  fontFamily: "Inter, sans-serif",
};

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{ fontSize: 12, color: MUTED, fontWeight: 500, marginBottom: 4 }}
    >
      {children}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; fg: string; label: string }> = {
    sent: { bg: "#DBEAFE", fg: "#1E40AF", label: "Sent" },
    accepted: { bg: "#D1FAE5", fg: "#065F46", label: "Accepted" },
    declined: { bg: "#FEE2E2", fg: "#991B1B", label: "Declined" },
    expired: { bg: "#E5E7EB", fg: "#374151", label: "Expired" },
  };
  const s = map[status] || { bg: "#E5E7EB", fg: "#374151", label: status };
  return (
    <span
      style={{
        background: s.bg,
        color: s.fg,
        borderRadius: 999,
        padding: "3px 10px",
        fontSize: 11,
        fontWeight: 600,
      }}
    >
      {s.label}
    </span>
  );
}

function rankColor(rank: number) {
  if (rank === 1) return { bg: "#FEF3C7", fg: "#92400E" };
  if (rank === 2) return { bg: "#E5E7EB", fg: "#374151" };
  if (rank === 3) return { bg: "#FED7AA", fg: "#7C2D12" };
  return { bg: "#F3F4F6", fg: "#6B7280" };
}

function PupilCard({
  rank,
  r,
  dayOfWeekLabel,
  multi,
  onText,
  onMessage,
  onBook,
}: {
  rank: number;
  r: Ranked;
  dayOfWeekLabel: string;
  multi: boolean;
  onText: () => void;
  onMessage: () => void;
  onBook: () => void;
}) {
  const rc = rankColor(rank);
  const availLabel =
    r.dayMatch === "yes"
      ? { text: `✓ Available ${dayOfWeekLabel}s`, color: "#047857" }
      : r.dayMatch === "no"
        ? { text: `⚠ Usually busy ${dayOfWeekLabel}s`, color: "#B45309" }
        : { text: "✗ No availability set", color: "#B91C1C" };
  const last =
    r.lastLesson && r.daysSince !== null
      ? `Last lesson: ${r.daysSince} day${r.daysSince === 1 ? "" : "s"} ago`
      : "New pupil";

  return (
    <div
      style={{
        background: "#FFFFFF",
        border: `0.5px solid ${BORDER}`,
        borderRadius: 12,
        padding: "14px 16px",
        margin: "0 16px 8px",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span
            style={{
              background: rc.bg,
              color: rc.fg,
              borderRadius: 999,
              width: 26,
              height: 26,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 12,
              fontWeight: 700,
            }}
          >
            #{rank}
          </span>
          <span style={{ color: NAVY, fontWeight: 700, fontSize: 14 }}>
            {fullNameOf(r.pupil)}
          </span>
        </div>
        <span
          style={{
            background: "#E0F4FF",
            color: BLUE,
            fontWeight: 700,
            fontSize: 11,
            padding: "2px 8px",
            borderRadius: 999,
          }}
        >
          {r.score}%
        </span>
      </div>

      <div
        style={{
          display: "flex",
          gap: 12,
          marginTop: 6,
          flexWrap: "wrap",
          fontSize: 12,
        }}
      >
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            color: availLabel.color,
          }}
        >
          <CalendarIcon size={12} /> {availLabel.text}
        </span>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            color: MUTED,
          }}
        >
          <Clock size={12} /> {last}
        </span>
      </div>

      {r.shortNotice && (
        <div style={{ marginTop: 4, fontSize: 12 }}>
          {r.shortNoticeOk ? (
            <span style={{ color: "#047857" }}>✓ Accepts short notice</span>
          ) : (
            <span style={{ color: "#B45309" }}>
              ⚠ Prefers {r.minNoticeHours}hrs notice
            </span>
          )}
        </div>
      )}

      {multi && r.matchedSlots.length > 0 && (
        <div
          style={{
            display: "flex",
            gap: 6,
            flexWrap: "wrap",
            marginTop: 8,
          }}
        >
          {r.matchedSlots.map((m) => {
            const label = `${new Date(m.date + "T00:00:00").toLocaleDateString(
              "en-GB",
              { weekday: "short" },
            )} ${fmt12h(m.time)}`;
            return (
              <span
                key={slotKey(m)}
                style={{
                  background: m.match ? "#D1FAE5" : "#F3F4F6",
                  color: m.match ? "#065F46" : "#6B7280",
                  border: `0.5px solid ${m.match ? "#86EFAC" : "#E5E7EB"}`,
                  borderRadius: 999,
                  padding: "2px 8px",
                  fontSize: 11,
                  fontWeight: 600,
                }}
              >
                {m.match ? "✓" : "✗"} {label}
              </span>
            );
          })}
        </div>
      )}

      <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
        <button
          onClick={onText}
          style={{
            background: NAVY,
            color: "#FFFFFF",
            borderRadius: 12,
            padding: "10px 14px",
            fontSize: 13,
            fontWeight: 600,
            border: "none",
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          📱 Text
        </button>
        <button
          onClick={onMessage}
          style={{
            background: TEAL,
            color: "#FFFFFF",
            borderRadius: 12,
            padding: "10px 14px",
            fontSize: 13,
            fontWeight: 600,
            border: "none",
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <MessageSquare size={14} /> Message
        </button>
        <button
          onClick={onBook}
          style={{
            background: "#FFFFFF",
            color: NAVY,
            borderRadius: 12,
            padding: "10px 14px",
            fontSize: 13,
            fontWeight: 600,
            border: `0.5px solid ${NAVY}`,
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <Plus size={14} /> Book
        </button>
      </div>
    </div>
  );
}

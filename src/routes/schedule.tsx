import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  IconSearch,
  IconPlus,
  IconChevronDown,
  IconChevronLeft,
  IconChevronRight,
} from "@tabler/icons-react";
import { supabase } from "../lib/supabaseClient";

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
function pupilColour(pupilId: string | null | undefined, fallback?: string | null): string {
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
    // TODO: merge external calendar / personal / task / holiday entries here
    // when their data sources land.
    for (const [k, arr] of map) {
      arr.sort((a, b) => {
        if (a.allDay && !b.allDay) return -1;
        if (!a.allDay && b.allDay) return 1;
        return a.start.getTime() - b.start.getTime();
      });
      map.set(k, arr);
    }
    return map;
  }, [lessons]);

  // Ordered list of day keys that actually have entries.
  const orderedDayKeys = useMemo(() => {
    return [...entriesByDay.keys()].sort();
  }, [entriesByDay]);

  const todayKey = ymdLocal(today);

  // Insert "Week of ..." labels above the first day of each new week.
  type Row =
    | { type: "week"; key: string; label: string }
    | { type: "day"; key: string; date: Date; entries: AgendaEntry[] };
  const rows: Row[] = useMemo(() => {
    const out: Row[] = [];
    let lastWeekKey = "";
    for (const key of orderedDayKeys) {
      const [y, m, d] = key.split("-").map(Number);
      const date = new Date(y, m - 1, d);
      const wk = ymdLocal(mondayOf(date));
      if (wk !== lastWeekKey) {
        out.push({ type: "week", key: `w-${wk}`, label: weekRangeLabel(date) });
        lastWeekKey = wk;
      }
      out.push({ type: "day", key, date, entries: entriesByDay.get(key)! });
    }
    return out;
  }, [orderedDayKeys, entriesByDay]);

  // Auto-scroll to today on first paint after data loads.
  useLayoutEffect(() => {
    if (didScrollToToday.current) return;
    if (lessons === null) return;
    const el = todayRef.current;
    const scroller = scrollRef.current;
    if (!scroller) return;
    if (el) {
      // Scroll such that today sits near the top of the scroll container.
      const top = el.offsetTop - scroller.offsetTop - 8;
      scroller.scrollTop = top;
    } else {
      // No entries on today — find the nearest future day with entries.
      const nextKey = orderedDayKeys.find((k) => k >= todayKey);
      const target = nextKey ? dayRefs.current.get(nextKey) : undefined;
      if (target) scroller.scrollTop = target.offsetTop - scroller.offsetTop - 8;
    }
    didScrollToToday.current = true;
  }, [lessons, orderedDayKeys, todayKey]);

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
      const colour = pupilColour(l.pupil_id ?? null, l.pupil?.calendar_colour ?? null);
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
      style={{
        position: "fixed",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        background: "#FFFFFF",
        color: "#111827",
        ...POPPINS,
      }}
    >


      <div
        ref={scrollRef}
        onScroll={onScroll}
        style={{
          flex: 1,
          overflowY: "auto",
          overflowX: "hidden",
          padding: "0 0 calc(80px + env(safe-area-inset-bottom)) 0",
        }}
      >
        <MonthCalendar
          month={calendarMonth}
          today={today}
          selectedDateKey={selectedDateKey}
          dotsByDay={dotsByDay}
          onSelectDate={scrollToDate}
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
          onOpenMonthPicker={() => {
            // No project-wide month picker exists yet — jump to today as a
            // useful fallback so the chevron isn't inert. Replace with a real
            // picker when one lands.
            const d = new Date(today);
            d.setDate(1);
            setCalendarMonth(d);
            scrollToDate(ymdLocal(today));
          }}
          onSearch={() => navigate({ to: "/search" as never })}
          onAdd={() => navigate({ to: "/lessons/new" as never })}
        />
        <div style={{ padding: "8px 12px 0" }}>

        {lessons === null ? (
          <div style={{ padding: 24, color: "#6B7280", fontSize: 14 }}>Loading…</div>
        ) : rows.length === 0 ? (
          <div style={{ padding: 24, color: "#6B7280", fontSize: 14 }}>Nothing scheduled.</div>
        ) : (
          rows.map((row) => {
            if (row.type === "week") {
              return (
                <div
                  key={row.key}
                  style={{
                    fontSize: 11,
                    fontWeight: 500,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    color: "#94A3B8",
                    padding: "16px 4px 6px",
                  }}
                >
                  {row.label}
                </div>
              );
            }
            const isToday = row.key === todayKey;
            const isPast = row.key < todayKey;
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
                  display: "grid",
                  gridTemplateColumns: "48px 1fr",
                  gap: 8,
                  padding: "6px 0",
                  opacity: isPast ? 0.55 : 1,
                }}
              >
                <DayHeader date={row.date} isToday={isToday} isPast={isPast} />
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {row.entries.map((e) => (
                    <EntryRow key={e.id} entry={e} onLessonTap={goToLesson} />
                  ))}
                </div>
              </div>
            );
          })
        )}
        </div>
      </div>
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
    const label = l.lesson_type ? `${name} · ${l.lesson_type}` : name;
    const bg = pupilColour(l.pupil_id ?? null, l.pupil?.calendar_colour ?? null);
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
    borderRadius: 8,
    padding: "8px 12px",
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
  fontSize: 13,
  fontWeight: 500,
  color: "#FFFFFF",
  lineHeight: 1.3,
};
const rowSub: React.CSSProperties = {
  marginTop: 2,
  fontSize: 11,
  color: "#FFFFFF",
  opacity: 0.85,
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
        padding: "12px 14px 0",
        borderBottom: "0.5px solid #E5E7EB",
        height: 220,
        maxHeight: 220,
        boxSizing: "border-box",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
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
          <button type="button" aria-label="Previous month" onClick={onPrevMonth} style={calIconBtn}>
            <IconChevronLeft size={18} stroke={1.75} color="#0B1F3A" />
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
              padding: 0,
              fontSize: 15,
              fontWeight: 500,
              lineHeight: 1,
              color: "#0B1F3A",
              ...POPPINS,
              cursor: "pointer",
            }}
          >
            <span>{monthLabel}</span>
            <IconChevronDown size={16} stroke={1.75} color="#6B7280" />
          </button>
          <button type="button" aria-label="Next month" onClick={onNextMonth} style={calIconBtn}>
            <IconChevronRight size={18} stroke={1.75} color="#0B1F3A" />
          </button>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <button type="button" aria-label="Search" onClick={onSearch} style={calIconBtn}>
            <IconSearch size={19} stroke={1.75} color="#0B1F3A" />
          </button>
          <button type="button" aria-label="Add lesson" onClick={onAdd} style={calIconBtn}>
            <IconPlus size={19} stroke={1.75} color="#0B1F3A" />
          </button>
        </div>
      </div>

      {/* Day-of-week header */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          marginBottom: 4,
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
              color: "#94A3B8",
              padding: "2px 0",
            }}
          >
            {d}
          </div>
        ))}
      </div>

      {/* Date grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gridTemplateRows: "repeat(6, minmax(0, 1fr))", flex: "1 1 0", minHeight: 0, paddingBottom: 0 }}>
        {cells.map((d) => {
          const key = ymdLocal(d);
          const inMonth = d.getMonth() === month.getMonth();
          const isToday = key === todayKey;
          const isPast = key < todayKey;
          const isSelected = key === selectedDateKey && !isToday;
          const dots = dotsByDay.get(key) ?? [];
          const numColour = isToday
            ? "#FFFFFF"
            : !inMonth || isPast
              ? "#94A3B8"
              : "#0B1F3A";
          return (
            <button
              type="button"
              key={key}
              onClick={() => onSelectDate(key)}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 1,
                background: "transparent",
                border: 0,
                padding: 0,
                cursor: "pointer",
                height: "100%",
                minHeight: 0,
                ...POPPINS,
              }}
            >
              <div
                style={{
                  position: "relative",
                  width: 24,
                  height: 24,
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: isToday ? "#185FA5" : isSelected ? "#E6F1FB" : "transparent",
                  color: numColour,
                  fontSize: 12,
                  fontWeight: 500,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {d.getDate()}
                <div
                  style={{
                    position: "absolute",
                    bottom: 2,
                    left: 0,
                    right: 0,
                    display: "flex",
                    gap: 2,
                    justifyContent: "center",
                  }}
                >
                  {dots.map((c, i) => (
                    <span
                      key={i}
                      style={{
                        width: 3,
                        height: 3,
                        borderRadius: "50%",
                        background: isToday ? "rgba(255,255,255,0.7)" : c,
                        display: "inline-block",
                      }}
                    />
                  ))}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

const calIconBtn: React.CSSProperties = {
  width: 32,
  height: 32,
  borderRadius: 8,
  border: 0,
  background: "transparent",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
};

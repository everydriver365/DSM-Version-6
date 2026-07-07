/**
 * Ported verbatim from `@everydriver` (DriveEasy Online) at
 * `src/components/instructor/WeekTimelineView.tsx`.
 *
 * Only change vs. source: the `CalendarEvent` type import points at a
 * local mirror (`./types`) instead of the source project's supabase-backed
 * `useInstructorCalendar` hook. No supabase imports.
 */
import { useMemo, useEffect, useState, useRef, useLayoutEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { addDays, startOfWeek, isSameDay, format, differenceInCalendarDays } from "date-fns";
import type { CalendarEvent } from "./types";

interface Props {
  events: CalendarEvent[];
  currentDate: Date;
  onGoToDate: (d: Date) => void;
  onEventClick: (e: CalendarEvent) => void;
  onAddEvent: (d?: Date) => void;
  loading?: boolean;
}

const HOUR_HEIGHT = 56; // px per hour
const DAY_LABELS_FULL = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const GUTTER = 44;
const DAY_HEADER_H = 44;
const VISIBLE_DAYS = 7;
const WINDOW_WEEKS = 5; // 2 before + current + 2 after — more room to glide
const TOTAL_DAYS = 7 * WINDOW_WEEKS;
const ANCHOR_OFFSET_WEEKS = 2;

function isWholeDayEvent(ev: CalendarEvent) {
  const durMs = ev.end.getTime() - ev.start.getTime();
  return durMs >= 23 * 60 * 60 * 1000;
}

function eventColor(e: CalendarEvent): { bg: string; text: string } {
  if (e.type === "block") return { bg: "#B23A3F", text: "#FFFFFF" };
  if (e.type === "external") return { bg: "#6E7C99", text: "#FFFFFF" };
  const status = e.data?.status as string | undefined;
  if (status === "cancelled") return { bg: "#9CA3AF", text: "#FFFFFF" };
  return { bg: "#F08A2E", text: "#FFFFFF" };
}

function isPaid(e: CalendarEvent): boolean | null {
  if (e.type !== "lesson") return null;
  const ps = (e.data?.payment_status || "").toLowerCase();
  if (ps === "paid") return true;
  if (ps === "unpaid" || ps === "pending") return false;
  const bal = e.data?.pupil_account_balance ?? 0;
  return bal >= 0;
}

export function WeekTimelineView({
  events,
  currentDate,
  onGoToDate,
  onEventClick,
  onAddEvent,
}: Props) {
  const anchorDate = useMemo(
    () => addDays(startOfWeek(currentDate, { weekStartsOn: 1 }), -7 * ANCHOR_OFFSET_WEEKS),
    [currentDate]
  );
  const days = useMemo(
    () => Array.from({ length: TOTAL_DAYS }, (_, i) => addDays(anchorDate, i)),
    [anchorDate]
  );
  const [displayWeekStart, setDisplayWeekStart] = useState<Date>(() => startOfWeek(currentDate, { weekStartsOn: 1 }));
  useEffect(() => {
    setDisplayWeekStart(startOfWeek(currentDate, { weekStartsOn: 1 }));
  }, [currentDate]);
  const weekStart = displayWeekStart;

  const { startHour, endHour } = useMemo(() => {
    let min = 8;
    let max = 19;
    events.forEach((ev) => {
      if (isWholeDayEvent(ev)) return;
      if (days.some((d) => isSameDay(d, ev.start))) {
        min = Math.min(min, ev.start.getHours());
        max = Math.max(max, ev.end.getHours() + (ev.end.getMinutes() > 0 ? 1 : 0));
      }
    });
    return { startHour: Math.max(0, min), endHour: Math.min(24, Math.max(max, min + 1)) };
  }, [events, days]);

  const hours = useMemo(
    () => Array.from({ length: endHour - startHour + 1 }, (_, i) => startHour + i),
    [startHour, endHour]
  );

  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  const hScrollRef = useRef<HTMLDivElement | null>(null);
  const vScrollRef = useRef<HTMLDivElement | null>(null);
  const [containerW, setContainerW] = useState(0);
  useLayoutEffect(() => {
    if (!hScrollRef.current) return;
    const el = hScrollRef.current;
    const ro = new ResizeObserver(() => setContainerW(el.clientWidth));
    ro.observe(el);
    setContainerW(el.clientWidth);
    return () => ro.disconnect();
  }, []);
  const dayWidth = containerW > 0 ? (containerW - GUTTER) / VISIBLE_DAYS : 0;
  const totalHeight = (endHour - startHour) * HOUR_HEIGHT;

  useEffect(() => {
    if (!vScrollRef.current) return;
    const target = (Math.max(startHour, 8) - startHour) * HOUR_HEIGHT - 8;
    vScrollRef.current.scrollTop = Math.max(0, target);
  }, [startHour]);

  const ignoreScrollRef = useRef(false);
  const positionToCurrent = useCallback(() => {
    if (!hScrollRef.current || dayWidth <= 0) return;
    const idx = differenceInCalendarDays(startOfWeek(currentDate, { weekStartsOn: 1 }), anchorDate);
    ignoreScrollRef.current = true;
    hScrollRef.current.scrollLeft = idx * dayWidth;
    requestAnimationFrame(() => {
      ignoreScrollRef.current = false;
    });
  }, [currentDate, anchorDate, dayWidth]);

  useLayoutEffect(() => {
    positionToCurrent();
  }, [positionToCurrent]);

  const scrollEndTimer = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const handleHScroll = () => {
    if (ignoreScrollRef.current || dayWidth <= 0) return;
    if (rafRef.current == null) {
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        if (!hScrollRef.current) return;
        const sl = hScrollRef.current.scrollLeft;
        const centreIdx = Math.round(sl / dayWidth + (VISIBLE_DAYS - 1) / 2);
        const centreDate = days[Math.max(0, Math.min(TOTAL_DAYS - 1, centreIdx))];
        if (!centreDate) return;
        const ws = startOfWeek(centreDate, { weekStartsOn: 1 });
        setDisplayWeekStart((prev) => (isSameDay(prev, ws) ? prev : ws));
      });
    }
    if (scrollEndTimer.current) window.clearTimeout(scrollEndTimer.current);
    scrollEndTimer.current = window.setTimeout(() => {
      if (!hScrollRef.current) return;
      const sl = hScrollRef.current.scrollLeft;
      const centreIdx = Math.round(sl / dayWidth + (VISIBLE_DAYS - 1) / 2);
      const newDate = days[Math.max(0, Math.min(TOTAL_DAYS - 1, centreIdx))];
      if (!newDate) return;
      const newWeekStart = startOfWeek(newDate, { weekStartsOn: 1 });
      if (!isSameDay(newWeekStart, startOfWeek(currentDate, { weekStartsOn: 1 }))) {
        onGoToDate(newWeekStart);
      }
    }, 180);
  };

  const goPrev = () => onGoToDate(addDays(weekStart, -7));
  const goNext = () => onGoToDate(addDays(weekStart, 7));
  const goToday = () => onGoToDate(new Date());

  const { eventsByDay, allDayByDay } = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    const allDay: Record<string, CalendarEvent[]> = {};
    days.forEach((d) => {
      const k = format(d, "yyyy-MM-dd");
      map[k] = [];
      allDay[k] = [];
    });
    events.forEach((ev) => {
      const k = format(ev.start, "yyyy-MM-dd");
      if (!(k in map)) return;
      if (isWholeDayEvent(ev)) allDay[k].push(ev);
      else map[k].push(ev);
    });
    return { eventsByDay: map, allDayByDay: allDay };
  }, [events, days]);

  const maxAllDay = Math.max(0, ...Object.values(allDayByDay).map((a) => a.length));
  const ALL_DAY_ROW_H = 18;
  const allDayStripH = maxAllDay > 0 ? maxAllDay * (ALL_DAY_ROW_H + 2) + 4 : 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", backgroundColor: "#FFFFFF" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", borderBottom: "0.5px solid #F0F3F8" }}>
        <button onClick={goPrev} aria-label="Previous week" style={{ width: 32, height: 32, borderRadius: 16, border: "none", background: "#F2F4F8", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <ChevronLeft style={{ width: 16, height: 16, color: "#3D55A1" }} />
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: "#1A1A1A" }}>
            {format(weekStart, "MMM d")} – {format(addDays(weekStart, 6), "MMM d")}
          </span>
          <button onClick={goToday} style={{ fontSize: 11, fontWeight: 600, color: "#3D55A1", background: "#EDF2FE", border: "none", padding: "4px 8px", borderRadius: 999 }}>
            Today
          </button>
        </div>
        <button onClick={goNext} aria-label="Next week" style={{ width: 32, height: 32, borderRadius: 16, border: "none", background: "#F2F4F8", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <ChevronRight style={{ width: 16, height: 16, color: "#3D55A1" }} />
        </button>
      </div>

      <div
        ref={(el) => {
          hScrollRef.current = el;
          vScrollRef.current = el;
        }}
        onScroll={handleHScroll}
        style={{
          flex: 1,
          minHeight: 0,
          overflow: "auto",
          scrollSnapType: "none",
          overscrollBehavior: "contain",
          WebkitOverflowScrolling: "touch",
          touchAction: "pan-x pan-y",
        }}
      >
        <div
          style={{
            width: dayWidth > 0 ? GUTTER + dayWidth * TOTAL_DAYS : "100%",
            display: "flex",
            flexDirection: "column",
            position: "relative",
          }}
        >
          <div style={{ display: "flex", height: DAY_HEADER_H, borderBottom: "0.5px solid #F0F3F8", background: "#FFFFFF", position: "sticky", top: 0, zIndex: 6 }}>
            <div style={{ width: GUTTER, position: "sticky", left: 0, zIndex: 4, background: "#FFFFFF" }} />
            {days.map((d, i) => {
              const today = isSameDay(d, now);
              const dayLabel = DAY_LABELS_FULL[d.getDay()];
              return (
                <button
                  key={i}
                  onClick={() => onGoToDate(d)}
                  style={{
                    width: dayWidth || `${100 / VISIBLE_DAYS}%`,
                    flexShrink: 0,
                    display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
                    padding: "4px 0", border: "none", background: "transparent", cursor: "pointer",
                  }}
                >
                  <span style={{ fontSize: 10, color: "#8E8E93", fontWeight: 500 }}>{dayLabel}</span>
                  <span
                    style={{
                      width: 26, height: 26, borderRadius: 13,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 13, fontWeight: 700,
                      background: today ? "#3D55A1" : "transparent",
                      color: today ? "#FFFFFF" : "#1A1A1A",
                    }}
                  >
                    {format(d, "d")}
                  </span>
                </button>
              );
            })}
          </div>

          {maxAllDay > 0 && (
            <div style={{ display: "flex", borderBottom: "0.5px solid #F0F3F8", background: "#FAFBFC", minHeight: allDayStripH, position: "sticky", top: DAY_HEADER_H, zIndex: 5 }}>
              <div style={{ width: GUTTER, position: "sticky", left: 0, zIndex: 4, background: "#FAFBFC", fontSize: 9, color: "#8E8E93", fontWeight: 600, textAlign: "right", padding: "4px 4px 0 0" }}>
                all-day
              </div>
              {days.map((d) => {
                const k = format(d, "yyyy-MM-dd");
                const items = allDayByDay[k] || [];
                return (
                  <div key={k} style={{ width: dayWidth || `${100 / VISIBLE_DAYS}%`, flexShrink: 0, borderLeft: "0.5px solid #F0F3F8", padding: "2px 1px", display: "flex", flexDirection: "column", gap: 2 }}>
                    {items.map((ev) => {
                      const colors = eventColor(ev);
                      return (
                        <button
                          key={ev.id}
                          onClick={() => onEventClick(ev)}
                          style={{
                            height: ALL_DAY_ROW_H,
                            background: colors.bg,
                            color: colors.text,
                            border: "none",
                            borderRadius: 3,
                            padding: "0 4px",
                            textAlign: "left",
                            fontSize: 9,
                            fontWeight: 600,
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            cursor: "pointer",
                          }}
                        >
                          {ev.title}
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          )}

          <div style={{ display: "flex", height: totalHeight, position: "relative" }}>
              <div style={{ width: GUTTER, position: "sticky", left: 0, zIndex: 3, background: "#FFFFFF" }}>
                {hours.map((h, i) => (
                  <div
                    key={h}
                    style={{
                      position: "absolute", top: i * HOUR_HEIGHT - 6, right: 4,
                      fontSize: 10, color: "#8E8E93", fontWeight: 500,
                    }}
                  >
                    {String(h).padStart(2, "0")}:00
                  </div>
                ))}
              </div>

              {days.map((d) => {
                const key = format(d, "yyyy-MM-dd");
                const dayEvents = eventsByDay[key] || [];
                const today = isSameDay(d, now);
                const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                const nowMins = today ? now.getHours() * 60 + now.getMinutes() - startHour * 60 : null;

                return (
                  <div
                    key={key}
                    onClick={(e) => {
                      if (e.target === e.currentTarget) onAddEvent(d);
                    }}
                    style={{
                      width: dayWidth || `${100 / VISIBLE_DAYS}%`,
                      flexShrink: 0,
                      position: "relative",
                      borderLeft: "0.5px solid #F0F3F8",
                      background: isWeekend ? "#FAFBFC" : "#FFFFFF",
                    }}
                  >
                    {hours.map((_, i) => (
                      <div
                        key={i}
                        style={{
                          position: "absolute", left: 0, right: 0, top: i * HOUR_HEIGHT,
                          height: 1, background: "#F0F3F8",
                        }}
                      />
                    ))}

                    {nowMins !== null && nowMins >= 0 && nowMins <= (endHour - startHour) * 60 && (
                      <div
                        style={{
                          position: "absolute", left: 0, right: 0,
                          top: (nowMins / 60) * HOUR_HEIGHT,
                          height: 2, background: "#3D55A1", zIndex: 5,
                        }}
                      >
                        <div style={{ position: "absolute", left: -3, top: -3, width: 8, height: 8, borderRadius: 4, background: "#3D55A1" }} />
                      </div>
                    )}

                    {dayEvents.map((ev) => {
                      const startMins = ev.start.getHours() * 60 + ev.start.getMinutes() - startHour * 60;
                      const durMins = Math.max(30, (ev.end.getTime() - ev.start.getTime()) / 60000);
                      const top = (startMins / 60) * HOUR_HEIGHT;
                      const height = (durMins / 60) * HOUR_HEIGHT - 2;
                      const colors = eventColor(ev);
                      const paid = isPaid(ev);

                      return (
                        <button
                          key={ev.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            onEventClick(ev);
                          }}
                          style={{
                            position: "absolute",
                            top, left: 1, right: 1, height,
                            background: colors.bg,
                            color: colors.text,
                            border: "none",
                            borderRadius: 4,
                            padding: "3px 4px 0",
                            textAlign: "left",
                            overflow: "hidden",
                            display: "flex",
                            flexDirection: "column",
                            cursor: "pointer",
                            boxShadow: "0 1px 2px rgba(0,0,0,0.08)",
                          }}
                        >
                          <div
                            style={{
                              fontSize: 9, fontWeight: 600, lineHeight: "11px",
                              overflow: "hidden",
                              display: "-webkit-box",
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: "vertical",
                              wordBreak: "break-word",
                            }}
                          >
                            {ev.title}
                          </div>
                          {height >= 38 && (
                            <div style={{ fontSize: 9, fontWeight: 700, marginTop: 2, lineHeight: "11px" }}>
                              {format(ev.start, "HH:mm")}
                            </div>
                          )}
                          {height >= 52 && (
                            <div style={{ fontSize: 9, fontWeight: 700, lineHeight: "11px" }}>
                              {format(ev.end, "HH:mm")}
                            </div>
                          )}
                          {paid !== null && height >= 30 && (
                            <div style={{ marginTop: "auto", marginLeft: -4, marginRight: -4, marginBottom: 0 }}>
                              <div
                                style={{
                                  background: paid ? "#2BB673" : "#E94B7B",
                                  color: "#FFFFFF",
                                  fontSize: 9,
                                  fontWeight: 700,
                                  textAlign: "center",
                                  padding: "2px 0",
                                }}
                              >
                                {paid ? "Paid" : "Unpaid"}
                              </div>
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
        </div>

    </div>
  );
}
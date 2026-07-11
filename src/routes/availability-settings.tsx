import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Clock,
  Shield,
  RefreshCw,
  Calendar as CalendarIcon,
  Car,
  X,
  Plus,
} from "lucide-react";
import { supabase } from "../lib/supabaseClient";

export const Route = createFileRoute("/availability-settings")({
  head: () => ({
    meta: [
      { title: "My Availability — DSM" },
      { name: "description", content: "Set your working hours, buffers, recurring blocks, time off and travel time." },
    ],
  }),
  component: AvailabilitySettingsPage,
});

const NAVY = "#0F2044";
const MUTED = "#9CA3AF";
const BORDER = "#E2E6ED";
const FONT = { fontFamily: "Inter, sans-serif" } as const;

const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const DAY_SHORT: Record<string, string> = {
  Monday: "Mon", Tuesday: "Tue", Wednesday: "Wed", Thursday: "Thu",
  Friday: "Fri", Saturday: "Sat", Sunday: "Sun",
};

interface RecurringBlock {
  id: string;
  day_of_week: string;
  start_time: string;
  end_time: string;
  label: string | null;
  is_active: boolean;
}
interface TimeOff {
  id: string;
  reason: string | null;
  start_date: string;
  end_date: string;
  all_day: boolean;
  start_time?: string | null;
  end_time?: string | null;
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}
function fmtDate(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-GB", {
    day: "numeric", month: "short", year: "numeric",
  });
}
function daysBetween(a: string, b: string) {
  const ms = new Date(b + "T00:00:00").getTime() - new Date(a + "T00:00:00").getTime();
  return Math.max(1, Math.round(ms / 86400000) + 1);
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      background: "#fff",
      border: `0.5px solid ${BORDER}`,
      borderRadius: 12,
      padding: 16,
      margin: "12px 16px 0",
    }}>{children}</div>
  );
}

function SectionHead({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
      {icon}
      <div style={{ fontSize: 14, fontWeight: 700, color: NAVY, ...FONT }}>{title}</div>
    </div>
  );
}

function PrimaryButton({ onClick, children, disabled }: { onClick: () => void; children: React.ReactNode; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        background: NAVY, color: "#fff", width: "100%",
        borderRadius: 12, padding: "12px 0", border: "none",
        fontSize: 14, fontWeight: 600, marginTop: 12,
        opacity: disabled ? 0.6 : 1, cursor: disabled ? "default" : "pointer",
        ...FONT,
      }}
    >{children}</button>
  );
}

function OutlineButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        background: "#fff", color: NAVY, width: "100%",
        border: `0.5px solid ${NAVY}`,
        borderRadius: 12, padding: "10px 0",
        fontSize: 14, fontWeight: 600, marginTop: 8, cursor: "pointer",
        ...FONT,
      }}
    >{children}</button>
  );
}

function AvailabilitySettingsPage() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);

  // Working hours (per-day)
  type DayHours = { start: string; end: string; active: boolean };
  const DEFAULT_DAY_HOURS: Record<string, DayHours> = {
    Monday:    { start: "09:00", end: "18:00", active: true },
    Tuesday:   { start: "09:00", end: "18:00", active: true },
    Wednesday: { start: "09:00", end: "18:00", active: true },
    Thursday:  { start: "09:00", end: "18:00", active: true },
    Friday:    { start: "09:00", end: "18:00", active: true },
    Saturday:  { start: "09:00", end: "18:00", active: false },
    Sunday:    { start: "09:00", end: "18:00", active: false },
  };
  const [dayHours, setDayHours] = useState<Record<string, DayHours>>(DEFAULT_DAY_HOURS);
  const [lunchOn, setLunchOn] = useState(false);
  const [lunchStart, setLunchStart] = useState("12:30");
  const [lunchEnd, setLunchEnd] = useState("13:30");

  // Buffers
  const [bufBefore, setBufBefore] = useState(0);
  const [bufAfter, setBufAfter] = useState(15);

  // Recurring blocks
  const [recurring, setRecurring] = useState<RecurringBlock[]>([]);
  const [addingRecurring, setAddingRecurring] = useState(false);
  const [rDay, setRDay] = useState("Monday");
  const [rStart, setRStart] = useState("15:00");
  const [rEnd, setREnd] = useState("15:30");
  const [rLabel, setRLabel] = useState("");

  // Time off
  const [timeOff, setTimeOff] = useState<TimeOff[]>([]);
  const [addingTimeOff, setAddingTimeOff] = useState(false);
  const [toReason, setToReason] = useState("");
  const [toFrom, setToFrom] = useState(todayIso());
  const [toTo, setToTo] = useState(todayIso());
  const [toAllDay, setToAllDay] = useState(true);
  const [toStartTime, setToStartTime] = useState("09:00");
  const [toEndTime, setToEndTime] = useState("17:00");

  // Travel
  const [useTravel, setUseTravel] = useState(false);
  const [travelSpeed, setTravelSpeed] = useState(25);
  const [travelBuffer, setTravelBuffer] = useState(10);

  const [savedFlash, setSavedFlash] = useState<string | null>(null);
  const flash = (msg: string) => { setSavedFlash(msg); setTimeout(() => setSavedFlash(null), 1800); };

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  useEffect(() => {
    if (!userId) return;
    (async () => {
      const { data: instr } = await supabase
        .from("instructors")
        .select("working_hours_start,working_hours_end,working_days,per_day_hours,lesson_buffer_before,lesson_buffer_after,lunch_break_start,lunch_break_end,use_travel_time,avg_travel_speed_mph,travel_buffer_mins")
        .eq("id", userId).maybeSingle();
      if (instr) {
        const i = instr as Record<string, unknown>;
        const perDay = i.per_day_hours as Record<string, DayHours> | null | undefined;
        if (perDay && typeof perDay === "object") {
          const next = { ...DEFAULT_DAY_HOURS };
          for (const d of DAY_NAMES) {
            const v = perDay[d];
            if (v && typeof v === "object") {
              next[d] = {
                start: String(v.start ?? next[d].start).slice(0, 5),
                end: String(v.end ?? next[d].end).slice(0, 5),
                active: !!v.active,
              };
            }
          }
          setDayHours(next);
        } else {
          const s = i.working_hours_start ? String(i.working_hours_start).slice(0, 5) : "09:00";
          const e = i.working_hours_end ? String(i.working_hours_end).slice(0, 5) : "18:00";
          const activeList = Array.isArray(i.working_days) && (i.working_days as string[]).length
            ? (i.working_days as string[])
            : ["Monday","Tuesday","Wednesday","Thursday","Friday"];
          const next: Record<string, DayHours> = { ...DEFAULT_DAY_HOURS };
          for (const d of DAY_NAMES) {
            next[d] = { start: s, end: e, active: activeList.includes(d) };
          }
          setDayHours(next);
        }
        if (i.lesson_buffer_before != null) setBufBefore(Number(i.lesson_buffer_before));
        if (i.lesson_buffer_after != null) setBufAfter(Number(i.lesson_buffer_after));
        if (i.lunch_break_start && i.lunch_break_end) {
          setLunchOn(true);
          setLunchStart(String(i.lunch_break_start).slice(0, 5));
          setLunchEnd(String(i.lunch_break_end).slice(0, 5));
        }
        if (i.use_travel_time) setUseTravel(!!i.use_travel_time);
        if (i.avg_travel_speed_mph) setTravelSpeed(Number(i.avg_travel_speed_mph));
        if (i.travel_buffer_mins != null) setTravelBuffer(Number(i.travel_buffer_mins));
      }

      const { data: rb } = await supabase
        .from("instructor_recurring_blocks")
        .select("*")
        .eq("instructor_id", userId)
        .order("day_of_week", { ascending: true });
      if (rb) setRecurring(rb as RecurringBlock[]);

      const { data: to } = await supabase
        .from("instructor_time_off")
        .select("*")
        .eq("instructor_id", userId)
        .gte("end_date", todayIso())
        .order("start_date", { ascending: true });
      if (to) setTimeOff(to as TimeOff[]);
    })();
  }, [userId]);

  const updateDay = (day: string, patch: Partial<DayHours>) => {
    setDayHours((prev) => ({ ...prev, [day]: { ...prev[day], ...patch } }));
  };
  const copyToAllActive = (sourceDay: string) => {
    setDayHours((prev) => {
      const src = prev[sourceDay];
      const next = { ...prev };
      for (const d of DAY_NAMES) {
        if (next[d].active) next[d] = { ...next[d], start: src.start, end: src.end };
      }
      return next;
    });
  };
  const copyToWeekdays = (sourceDay: string) => {
    setDayHours((prev) => {
      const src = prev[sourceDay];
      const next = { ...prev };
      for (const d of ["Monday","Tuesday","Wednesday","Thursday","Friday"]) {
        next[d] = { ...next[d], start: src.start, end: src.end };
      }
      return next;
    });
  };
  const quickSetAll = (start: string, end: string) => {
    setDayHours((prev) => {
      const next = { ...prev };
      for (const d of DAY_NAMES) {
        if (next[d].active) next[d] = { ...next[d], start, end };
      }
      return next;
    });
  };
  const mostFrequent = (arr: string[]): string | null => {
    if (!arr.length) return null;
    const counts = new Map<string, number>();
    for (const v of arr) counts.set(v, (counts.get(v) ?? 0) + 1);
    let best = arr[0], bestN = 0;
    counts.forEach((n, k) => { if (n > bestN) { best = k; bestN = n; } });
    return best;
  };

  async function saveWorkingHours() {
    if (!userId) return;
    const activeEntries = DAY_NAMES.filter((d) => dayHours[d].active);
    const mostCommonStart = mostFrequent(activeEntries.map((d) => dayHours[d].start)) ?? "09:00";
    const mostCommonEnd = mostFrequent(activeEntries.map((d) => dayHours[d].end)) ?? "18:00";
    const patch: Record<string, unknown> = {
      working_hours_start: mostCommonStart,
      working_hours_end: mostCommonEnd,
      working_days: activeEntries,
      per_day_hours: dayHours,
      lunch_break_start: lunchOn ? lunchStart : null,
      lunch_break_end: lunchOn ? lunchEnd : null,
    };
    const { error } = await supabase.from("instructors").update(patch).eq("id", userId);
    if (error) { console.error(error); return; }
    flash("Working hours saved");
  }

  async function saveBuffers() {
    if (!userId) return;
    const { error } = await supabase.from("instructors")
      .update({ lesson_buffer_before: bufBefore, lesson_buffer_after: bufAfter })
      .eq("id", userId);
    if (error) { console.error(error); return; }
    flash("Buffers saved");
  }

  async function saveTravel() {
    if (!userId) return;
    const { error } = await supabase.from("instructors")
      .update({ use_travel_time: useTravel, avg_travel_speed_mph: travelSpeed, travel_buffer_mins: travelBuffer })
      .eq("id", userId);
    if (error) { console.error(error); return; }
    flash("Travel settings saved");
  }

  async function addRecurring() {
    if (!userId) return;
    const { data, error } = await supabase.from("instructor_recurring_blocks").insert({
      instructor_id: userId,
      day_of_week: rDay,
      start_time: rStart,
      end_time: rEnd,
      label: rLabel || null,
      is_active: true,
    }).select().single();
    if (error) { console.error(error); return; }
    setRecurring((prev) => [...prev, data as RecurringBlock]);
    setAddingRecurring(false);
    setRLabel("");
  }
  async function deleteRecurring(id: string) {
    const { error } = await supabase.from("instructor_recurring_blocks").delete().eq("id", id);
    if (error) { console.error(error); return; }
    setRecurring((prev) => prev.filter(r => r.id !== id));
  }
  async function toggleRecurring(r: RecurringBlock) {
    const { error } = await supabase.from("instructor_recurring_blocks")
      .update({ is_active: !r.is_active }).eq("id", r.id);
    if (error) { console.error(error); return; }
    setRecurring((prev) => prev.map(x => x.id === r.id ? { ...x, is_active: !r.is_active } : x));
  }

  async function addTimeOff() {
    if (!userId) return;
    const payload: Record<string, unknown> = {
      instructor_id: userId,
      reason: toReason || null,
      start_date: toFrom,
      end_date: toTo,
      all_day: toAllDay,
    };
    if (!toAllDay) {
      payload.start_time = toStartTime;
      payload.end_time = toEndTime;
    }
    const { data, error } = await supabase.from("instructor_time_off").insert(payload).select().single();
    if (error) { console.error(error); return; }
    setTimeOff((prev) => [...prev, data as TimeOff].sort((a, b) => a.start_date.localeCompare(b.start_date)));
    setAddingTimeOff(false);
    setToReason("");
  }
  async function deleteTimeOff(id: string) {
    const { error } = await supabase.from("instructor_time_off").delete().eq("id", id);
    if (error) { console.error(error); return; }
    setTimeOff((prev) => prev.filter(t => t.id !== id));
  }

  return (
    <div style={{ minHeight: "100vh", background: "#fff", paddingBottom: 40, ...FONT }}>
      <div style={{
        position: "sticky", top: 0, zIndex: 40, display: "flex", alignItems: "center",
        background: NAVY, height: 52, padding: "0 8px",
      }}>
        <button
          type="button"
          aria-label="Back"
          onClick={() => navigate({ to: "/settings" })}
          style={{ width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center", background: "transparent", border: "none", cursor: "pointer" }}
        >
          <ArrowLeft size={22} color="#fff" />
        </button>
        <div style={{ flex: 1, textAlign: "center", color: "#fff", fontSize: 15, fontWeight: 600 }}>My Availability</div>
        <div style={{ width: 40 }} />
      </div>

      {savedFlash ? (
        <div style={{ margin: "12px 16px 0", padding: "8px 12px", background: "#E0FFF4", border: "0.5px solid #86EFAC", color: "#166534", borderRadius: 8, fontSize: 13 }}>
          {savedFlash}
        </div>
      ) : null}

      {/* SECTION 1 — WORKING HOURS */}
      <Card>
        <SectionHead icon={<Clock size={16} color={NAVY} />} title="Working hours" />

        {/* Quick set pills */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
          <span style={{ fontSize: 12, color: MUTED }}>Quick set:</span>
          {[
            { label: "9-5", s: "09:00", e: "17:00" },
            { label: "9-6", s: "09:00", e: "18:00" },
            { label: "8-6", s: "08:00", e: "18:00" },
          ].map((q) => (
            <button
              key={q.label}
              type="button"
              onClick={() => quickSetAll(q.s, q.e)}
              style={{
                background: "#F0F4FF", color: "#1A52A0",
                fontSize: 12, fontWeight: 600,
                padding: "6px 12px", borderRadius: 999,
                border: "none", cursor: "pointer",
              }}
            >
              {q.label}
            </button>
          ))}
        </div>

        {/* Per-day rows */}
        <div>
          {DAY_NAMES.map((d) => {
            const cfg = dayHours[d];
            return (
              <div
                key={d}
                style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "10px 0",
                  borderBottom: "0.5px solid #F3F4F6",
                }}
              >
                {/* Left: toggle + day name */}
                <div style={{ width: 100, display: "flex", alignItems: "center" }}>
                  <button
                    type="button" role="switch" aria-checked={cfg.active}
                    onClick={() => updateDay(d, { active: !cfg.active })}
                    style={{
                      width: 34, height: 20, borderRadius: 999, position: "relative",
                      background: cfg.active ? NAVY : "#EEF2F7", border: "none", cursor: "pointer",
                      flexShrink: 0,
                    }}
                  >
                    <span style={{
                      position: "absolute", top: 2, left: cfg.active ? 16 : 2,
                      width: 16, height: 16, borderRadius: "50%", background: "#fff",
                      transition: "left 120ms",
                    }} />
                  </button>
                  <span style={{ marginLeft: 8, fontSize: 13, fontWeight: 500, color: NAVY }}>
                    {DAY_SHORT[d]}
                  </span>
                </div>

                {/* Middle: times (only if active) */}
                {cfg.active ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1 }}>
                    <input
                      type="time" value={cfg.start}
                      onChange={(e) => updateDay(d, { start: e.target.value })}
                      style={{
                        background: "#F7FAFC", border: `0.5px solid ${BORDER}`,
                        borderRadius: 8, padding: "8px 10px", width: 100,
                        fontSize: 13, color: NAVY,
                      }}
                    />
                    <span style={{ fontSize: 12, color: "#9CA3AF" }}>to</span>
                    <input
                      type="time" value={cfg.end}
                      onChange={(e) => updateDay(d, { end: e.target.value })}
                      style={{
                        background: "#F7FAFC", border: `0.5px solid ${BORDER}`,
                        borderRadius: 8, padding: "8px 10px", width: 100,
                        fontSize: 13, color: NAVY,
                      }}
                    />
                  </div>
                ) : (
                  <div style={{ flex: 1, fontSize: 12, color: "#C7CCD4" }}>Off</div>
                )}

                {/* Right: copy actions */}
                {cfg.active ? (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2 }}>
                    <button
                      type="button"
                      onClick={() => copyToAllActive(d)}
                      style={{
                        background: "none", border: "none", cursor: "pointer",
                        fontSize: 11, fontWeight: 600, color: "#1A52A0", padding: 0,
                      }}
                    >
                      Copy to all ↓
                    </button>
                    {d === "Monday" && (
                      <button
                        type="button"
                        onClick={() => copyToWeekdays(d)}
                        style={{
                          background: "none", border: "none", cursor: "pointer",
                          fontSize: 11, color: "#9CA3AF", padding: 0,
                        }}
                      >
                        Copy to weekdays
                      </button>
                    )}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>


        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0" }}>
          <div style={{ fontSize: 14, color: NAVY }}>Lunch break</div>
          <button type="button" role="switch" aria-checked={lunchOn} onClick={() => setLunchOn((v) => !v)}
            style={{
              width: 40, height: 22, borderRadius: 999, position: "relative",
              background: lunchOn ? NAVY : "#EEF2F7", border: "none", cursor: "pointer",
            }}>
            <span style={{
              position: "absolute", top: 2, left: lunchOn ? 20 : 2,
              width: 18, height: 18, borderRadius: "50%", background: "#fff",
              transition: "left 120ms",
            }} />
          </button>
        </div>
        {lunchOn && (
          <div style={{ display: "flex", gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, color: MUTED, marginBottom: 4 }}>Lunch start</div>
              <input type="time" value={lunchStart} onChange={(e) => setLunchStart(e.target.value)}
                style={{ width: "100%", height: 40, borderRadius: 8, border: `0.5px solid ${BORDER}`, padding: "0 10px", fontSize: 14 }} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, color: MUTED, marginBottom: 4 }}>Lunch end</div>
              <input type="time" value={lunchEnd} onChange={(e) => setLunchEnd(e.target.value)}
                style={{ width: "100%", height: 40, borderRadius: 8, border: `0.5px solid ${BORDER}`, padding: "0 10px", fontSize: 14 }} />
            </div>
          </div>
        )}

        <PrimaryButton onClick={saveWorkingHours}>Save working hours</PrimaryButton>
      </Card>

      {/* SECTION 2 — LESSON BUFFERS */}
      <Card>
        <SectionHead icon={<Shield size={16} color={NAVY} />} title="Lesson buffers" />
        <div style={{ display: "flex", gap: 12 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, color: MUTED, marginBottom: 4 }}>Buffer before lesson</div>
            <select value={bufBefore} onChange={(e) => setBufBefore(Number(e.target.value))}
              style={{ width: "100%", height: 40, borderRadius: 8, border: `0.5px solid ${BORDER}`, padding: "0 10px", fontSize: 14, background: "#fff" }}>
              {[0,5,10,15,20,30].map(v => <option key={v} value={v}>{v} mins</option>)}
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, color: MUTED, marginBottom: 4 }}>Buffer after lesson</div>
            <select value={bufAfter} onChange={(e) => setBufAfter(Number(e.target.value))}
              style={{ width: "100%", height: 40, borderRadius: 8, border: `0.5px solid ${BORDER}`, padding: "0 10px", fontSize: 14, background: "#fff" }}>
              {[0,5,10,15,20,30].map(v => <option key={v} value={v}>{v} mins</option>)}
            </select>
          </div>
        </div>
        <PrimaryButton onClick={saveBuffers}>Save buffers</PrimaryButton>
      </Card>

      {/* SECTION 3 — RECURRING BLOCKS */}
      <Card>
        <SectionHead icon={<RefreshCw size={16} color={NAVY} />} title="Recurring unavailability" />
        <div style={{ fontSize: 12, color: MUTED, marginBottom: 12 }}>
          Add times you're regularly unavailable e.g. school run, weekly appointment
        </div>

        {recurring.map((r, idx) => (
          <div key={r.id} style={{
            display: "flex", alignItems: "center", padding: "10px 0",
            borderTop: idx === 0 ? "none" : "0.5px solid #F3F4F6",
            gap: 8,
          }}>
            <span style={{ background: "#F0F4FF", color: "#1A52A0", fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 999 }}>
              {DAY_SHORT[r.day_of_week] ?? r.day_of_week.slice(0, 3)}
            </span>
            <span style={{ fontSize: 14, color: NAVY }}>
              {r.start_time.slice(0, 5)} – {r.end_time.slice(0, 5)}
            </span>
            <span style={{ fontSize: 12, color: MUTED, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {r.label || ""}
            </span>
            <button type="button" onClick={() => toggleRecurring(r)}
              style={{
                width: 34, height: 20, borderRadius: 999, position: "relative",
                background: r.is_active ? NAVY : "#E5E7EB", border: "none", cursor: "pointer",
              }}>
              <span style={{ position: "absolute", top: 2, left: r.is_active ? 16 : 2, width: 16, height: 16, borderRadius: "50%", background: "#fff" }} />
            </button>
            <button type="button" onClick={() => deleteRecurring(r.id)}
              style={{ background: "transparent", border: "none", cursor: "pointer", padding: 4 }}>
              <X size={16} color="#9CA3AF" />
            </button>
          </div>
        ))}

        {addingRecurring ? (
          <div style={{ marginTop: 12, padding: 12, background: "#F9FAFB", borderRadius: 8 }}>
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 11, color: MUTED, marginBottom: 4 }}>Day</div>
              <select value={rDay} onChange={(e) => setRDay(e.target.value)}
                style={{ width: "100%", height: 40, borderRadius: 8, border: `0.5px solid ${BORDER}`, padding: "0 10px", fontSize: 14, background: "#fff" }}>
                {DAY_NAMES.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, color: MUTED, marginBottom: 4 }}>Start</div>
                <input type="time" value={rStart} onChange={(e) => setRStart(e.target.value)}
                  style={{ width: "100%", height: 40, borderRadius: 8, border: `0.5px solid ${BORDER}`, padding: "0 10px", fontSize: 14 }} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, color: MUTED, marginBottom: 4 }}>End</div>
                <input type="time" value={rEnd} onChange={(e) => setREnd(e.target.value)}
                  style={{ width: "100%", height: 40, borderRadius: 8, border: `0.5px solid ${BORDER}`, padding: "0 10px", fontSize: 14 }} />
              </div>
            </div>
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 11, color: MUTED, marginBottom: 4 }}>Label</div>
              <input type="text" value={rLabel} onChange={(e) => setRLabel(e.target.value)}
                placeholder="e.g. School run"
                style={{ width: "100%", height: 40, borderRadius: 8, border: `0.5px solid ${BORDER}`, padding: "0 10px", fontSize: 14 }} />
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button type="button" onClick={() => setAddingRecurring(false)}
                style={{ flex: 1, height: 40, borderRadius: 8, background: "#fff", border: `0.5px solid ${BORDER}`, fontSize: 14, cursor: "pointer" }}>Cancel</button>
              <button type="button" onClick={addRecurring}
                style={{ flex: 1, height: 40, borderRadius: 8, background: NAVY, color: "#fff", border: "none", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Save</button>
            </div>
          </div>
        ) : (
          <OutlineButton onClick={() => setAddingRecurring(true)}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><Plus size={14} /> Add recurring block</span>
          </OutlineButton>
        )}
      </Card>

      {/* SECTION 4 — TIME OFF */}
      <Card>
        <SectionHead icon={<CalendarIcon size={16} color={NAVY} />} title="Time off & holidays" />
        <div style={{ fontSize: 12, color: MUTED, marginBottom: 12 }}>
          Add holidays, training days or any time you won't be available
        </div>

        {timeOff.map((t, idx) => (
          <div key={t.id} style={{
            display: "flex", alignItems: "center", padding: "10px 0",
            borderTop: idx === 0 ? "none" : "0.5px solid #F3F4F6",
            gap: 8,
          }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, color: NAVY }}>
                {fmtDate(t.start_date)}{t.start_date !== t.end_date ? ` – ${fmtDate(t.end_date)}` : ""}
              </div>
              {t.reason ? <div style={{ fontSize: 12, color: MUTED }}>{t.reason}</div> : null}
            </div>
            <span style={{ background: "#F0F4FF", color: "#1A52A0", fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 999 }}>
              {daysBetween(t.start_date, t.end_date)} days
            </span>
            <button type="button" onClick={() => deleteTimeOff(t.id)}
              style={{ background: "transparent", border: "none", cursor: "pointer", padding: 4 }}>
              <X size={16} color="#9CA3AF" />
            </button>
          </div>
        ))}

        {addingTimeOff ? (
          <div style={{ marginTop: 12, padding: 12, background: "#F9FAFB", borderRadius: 8 }}>
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 11, color: MUTED, marginBottom: 4 }}>Reason</div>
              <input type="text" value={toReason} onChange={(e) => setToReason(e.target.value)}
                placeholder="e.g. Summer holiday"
                style={{ width: "100%", height: 40, borderRadius: 8, border: `0.5px solid ${BORDER}`, padding: "0 10px", fontSize: 14 }} />
            </div>
            <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, color: MUTED, marginBottom: 4 }}>From</div>
                <input type="date" value={toFrom} onChange={(e) => setToFrom(e.target.value)}
                  style={{ width: "100%", height: 40, borderRadius: 8, border: `0.5px solid ${BORDER}`, padding: "0 10px", fontSize: 14 }} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, color: MUTED, marginBottom: 4 }}>To</div>
                <input type="date" value={toTo} onChange={(e) => setToTo(e.target.value)}
                  style={{ width: "100%", height: 40, borderRadius: 8, border: `0.5px solid ${BORDER}`, padding: "0 10px", fontSize: 14 }} />
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0" }}>
              <div style={{ fontSize: 14, color: NAVY }}>All day</div>
              <button type="button" role="switch" aria-checked={toAllDay} onClick={() => setToAllDay((v) => !v)}
                style={{ width: 40, height: 22, borderRadius: 999, position: "relative", background: toAllDay ? NAVY : "#EEF2F7", border: "none", cursor: "pointer" }}>
                <span style={{ position: "absolute", top: 2, left: toAllDay ? 20 : 2, width: 18, height: 18, borderRadius: "50%", background: "#fff" }} />
              </button>
            </div>
            {!toAllDay && (
              <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, color: MUTED, marginBottom: 4 }}>Start time</div>
                  <input type="time" value={toStartTime} onChange={(e) => setToStartTime(e.target.value)}
                    style={{ width: "100%", height: 40, borderRadius: 8, border: `0.5px solid ${BORDER}`, padding: "0 10px", fontSize: 14 }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, color: MUTED, marginBottom: 4 }}>End time</div>
                  <input type="time" value={toEndTime} onChange={(e) => setToEndTime(e.target.value)}
                    style={{ width: "100%", height: 40, borderRadius: 8, border: `0.5px solid ${BORDER}`, padding: "0 10px", fontSize: 14 }} />
                </div>
              </div>
            )}
            <div style={{ display: "flex", gap: 8 }}>
              <button type="button" onClick={() => setAddingTimeOff(false)}
                style={{ flex: 1, height: 40, borderRadius: 8, background: "#fff", border: `0.5px solid ${BORDER}`, fontSize: 14, cursor: "pointer" }}>Cancel</button>
              <button type="button" onClick={addTimeOff}
                style={{ flex: 1, height: 40, borderRadius: 8, background: NAVY, color: "#fff", border: "none", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Save</button>
            </div>
          </div>
        ) : (
          <OutlineButton onClick={() => setAddingTimeOff(true)}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><Plus size={14} /> Add time off</span>
          </OutlineButton>
        )}
      </Card>

      {/* SECTION 5 — TRAVEL TIME */}
      <Card>
        <SectionHead icon={<Car size={16} color={NAVY} />} title="Travel time between lessons" />
        <div style={{ fontSize: 12, color: MUTED, marginBottom: 12 }}>
          Automatically add travel time between lessons based on pupil postcodes
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0" }}>
          <div style={{ fontSize: 14, color: NAVY }}>Calculate travel time</div>
          <button type="button" role="switch" aria-checked={useTravel} onClick={() => setUseTravel((v) => !v)}
            style={{ width: 40, height: 22, borderRadius: 999, position: "relative", background: useTravel ? NAVY : "#EEF2F7", border: "none", cursor: "pointer" }}>
            <span style={{ position: "absolute", top: 2, left: useTravel ? 20 : 2, width: 18, height: 18, borderRadius: "50%", background: "#fff" }} />
          </button>
        </div>

        {useTravel && (
          <>
            <div style={{ marginTop: 8 }}>
              <div style={{ fontSize: 11, color: MUTED, marginBottom: 4 }}>Average driving speed</div>
              <select value={travelSpeed} onChange={(e) => setTravelSpeed(Number(e.target.value))}
                style={{ width: "100%", height: 40, borderRadius: 8, border: `0.5px solid ${BORDER}`, padding: "0 10px", fontSize: 14, background: "#fff" }}>
                <option value={20}>Urban (20mph)</option>
                <option value={25}>Mixed (25mph)</option>
                <option value={30}>Suburban (30mph)</option>
                <option value={40}>Rural (40mph)</option>
              </select>
            </div>
            <div style={{ marginTop: 8 }}>
              <div style={{ fontSize: 11, color: MUTED, marginBottom: 4 }}>Extra buffer</div>
              <select value={travelBuffer} onChange={(e) => setTravelBuffer(Number(e.target.value))}
                style={{ width: "100%", height: 40, borderRadius: 8, border: `0.5px solid ${BORDER}`, padding: "0 10px", fontSize: 14, background: "#fff" }}>
                {[0,5,10,15].map(v => <option key={v} value={v}>{v} mins</option>)}
              </select>
            </div>
            <div style={{ marginTop: 8, background: "#F0F4FF", border: "0.5px solid #BFDBFE", borderRadius: 8, padding: 12, fontSize: 12, color: "#1A52A0", lineHeight: 1.5 }}>
              • DSM calculates straight-line distance between lesson postcodes<br />
              • Travel time = distance ÷ speed + extra buffer<br />
              • This is an estimate — actual drive times may vary<br />
              • Accuracy improves when pupils have postcodes set
            </div>
          </>
        )}

        <PrimaryButton onClick={saveTravel}>Save travel settings</PrimaryButton>
      </Card>
    </div>
  );
}

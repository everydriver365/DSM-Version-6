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
const NAVY_DEEP = "#0B1F3A";
const BLUE = "#1A52A0";
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
}

interface DayGroup {
  iso: string;
  dayName: string;
  isWorkDay: boolean;
  slots: FreeSlot[];
  totalFreeMinutes: number;
  busyMinutes: number;
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

  useEffect(() => {
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
            .select("lesson_date,lesson_time,duration_minutes")
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
              "working_hours_start,working_hours_end,working_days,lesson_buffer_minutes,hourly_rate",
            )
            .eq("id", userId)
            .maybeSingle(),
        ]);
        if (cancelled) return;

        const instr = (instrRes.data ?? {}) as {
          working_hours_start?: string | null;
          working_hours_end?: string | null;
          working_days?: string[] | null;
          lesson_buffer_minutes?: number | null;
        };
        const workStart = instr.working_hours_start || "09:00";
        const workEnd = instr.working_hours_end || "18:00";
        const buffer = instr.lesson_buffer_minutes ?? 15;
        const workDays =
          instr.working_days && instr.working_days.length
            ? instr.working_days
            : ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
        const rate = Number(
          (instr as { hourly_rate?: number | null }).hourly_rate ?? 0,
        );
        if (!cancelled) setHourlyRate(rate);

        const byDay = new Map<
          string,
          { start: number; end: number }[]
        >();
        for (const l of (lessonsRes.data ?? []) as {
          lesson_date: string | null;
          lesson_time: string | null;
          duration_minutes: number | null;
        }[]) {
          if (!l.lesson_date || !l.lesson_time) continue;
          const s = hmToMin(l.lesson_time);
          const e = s + (l.duration_minutes ?? 60);
          const arr = byDay.get(l.lesson_date) ?? [];
          arr.push({ start: s, end: e });
          byDay.set(l.lesson_date, arr);
        }

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
          const dayLessons = (byDay.get(iso) ?? []).slice().sort(
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
            });
            continue;
          }
          // Build gap boundaries
          const gaps: { start: number; end: number }[] = [];
          let cursor = wsMin;
          for (const l of dayLessons) {
            const gapEnd = l.start - buffer;
            if (gapEnd - cursor >= 60) {
              gaps.push({ start: cursor, end: gapEnd });
            }
            cursor = Math.max(cursor, l.end + buffer);
          }
          if (weMin - cursor >= 60) {
            gaps.push({ start: cursor, end: weMin });
          }
          const daySlots: FreeSlot[] = [];
          let dayFree = 0;
          for (const g of gaps) {
            let gStart = g.start;
            if (i === 0) {
              const nowMins = today.getHours() * 60 + today.getMinutes();
              if (gStart < nowMins) gStart = Math.ceil(nowMins / 15) * 15;
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
          });
        }
        if (!cancelled) {
          setFreeSlots(slots);
          setDayGroups(groups);
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
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
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

  async function findPupils() {
    if (!userId) return;
    if (selectedSlots.length === 0) return;
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
      const slotsToScore = selectedSlots;

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

  return (
    <div
      className="min-h-screen"
      style={{ ...FONT, backgroundColor: "#FFFFFF", margin: -8 }}
    >
      <div
        className="sticky top-0 z-40 h-[52px] px-4 flex items-center"
        style={{ backgroundColor: NAVY_DEEP }}
      >
        <button
          onClick={() => navigate({ to: "/home" })}
          aria-label="Back"
          className="p-1 -ml-1"
          style={{ color: "#fff" }}
        >
          <ArrowLeft size={22} />
        </button>
        <h1
          className="absolute left-1/2 -translate-x-1/2 text-white text-[16px] font-medium"
          style={FONT}
        >
          Fill My Slots
        </h1>
      </div>

      <div
        style={{
          background: "#F0F4FF",
          border: "1px solid #BFDBFE",
          borderRadius: 12,
          padding: 16,
          margin: "16px 16px 0",
          display: "flex",
          gap: 12,
        }}
      >
        <Zap size={20} color={BLUE} style={{ flexShrink: 0, marginTop: 2 }} />
        <div>
          <div style={{ fontWeight: 700, color: NAVY, fontSize: 14 }}>
            Got a free slot? Find the right pupil in seconds.
          </div>
          <div
            style={{ color: MUTED, fontSize: 13, marginTop: 4, lineHeight: 1.4 }}
          >
            We'll rank your pupils based on their availability, preferences and
            how long since their last lesson.
          </div>
        </div>
      </div>

      <div style={{ marginTop: 16 }}>
        <div style={{ margin: "0 16px" }}>
          <div style={{ fontWeight: 700, color: NAVY, fontSize: 16 }}>
            Your free slots — next 14 days
          </div>
          <div style={{ color: MUTED, fontSize: 13, marginBottom: 12 }}>
            {slotsLoading
              ? "Scanning diary…"
              : `${freeSlots.length} free slot${freeSlots.length === 1 ? "" : "s"} across ${dayGroups.filter((g) => g.slots.length > 0).length} day${dayGroups.filter((g) => g.slots.length > 0).length === 1 ? "" : "s"}`}
          </div>
        </div>

        {!slotsLoading && freeSlots.length === 0 && (
          <div
            style={{
              background: "#FFFFFF",
              border: `0.5px solid ${BORDER}`,
              borderRadius: 12,
              padding: 20,
              margin: "0 16px",
              textAlign: "center",
            }}
          >
            <div style={{ color: NAVY, fontWeight: 600, fontSize: 14 }}>
              No free slots in the next 14 days
            </div>
            <div style={{ color: MUTED, fontSize: 13, marginTop: 4 }}>
              Your diary looks full — check your schedule
            </div>
            <button
              onClick={() => navigate({ to: "/schedule" })}
              style={{
                marginTop: 10,
                background: "transparent",
                border: "none",
                color: BLUE,
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
          const dLabel = new Date(g.iso + "T00:00:00").toLocaleDateString(
            "en-GB",
            { weekday: "long", day: "numeric", month: "long" },
          );
          // Off-day or fully-booked: single muted row
          if (!g.isWorkDay || g.slots.length === 0) {
            const rightLabel = !g.isWorkDay ? "Day off" : "Fully booked";
            const clickable = !g.isWorkDay;
            return (
              <div
                key={g.iso}
                onClick={
                  clickable
                    ? () => {
                        setManualMode(true);
                        setSlotDate(g.iso);
                        setSelectedSlotKey(null);
                      }
                    : undefined
                }
                style={{
                  padding: "10px 16px",
                  borderTop: `0.5px solid ${BORDER}`,
                  background: "#FAFAFA",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  cursor: clickable ? "pointer" : "default",
                }}
              >
                <span style={{ color: "#9CA3AF", fontSize: 13 }}>{dLabel}</span>
                <span style={{ color: "#9CA3AF", fontSize: 12 }}>
                  {rightLabel}
                </span>
              </div>
            );
          }

          return (
            <div key={g.iso}>
              <div
                style={{
                  padding: "8px 16px",
                  background: "#F7FAFC",
                  borderTop: `0.5px solid ${BORDER}`,
                  borderBottom: `0.5px solid ${BORDER}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <span style={{ color: NAVY, fontWeight: 700, fontSize: 13 }}>
                  {dLabel}
                </span>
                <span style={{ color: MUTED, fontSize: 11 }}>
                  {g.slots.length} slot{g.slots.length === 1 ? "" : "s"}{" "}
                  available
                </span>
              </div>
              <div style={{ padding: "0 16px" }}>
                {g.slots.map((slot) => (
                  <div
                    key={`${slot.date}|${slot.startTime}`}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "10px 0",
                      borderBottom: "0.5px solid #F3F4F6",
                      flexWrap: "wrap",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        flex: "1 1 auto",
                        minWidth: 130,
                      }}
                    >
                      <Clock size={14} color="#9CA3AF" />
                      <span
                        style={{
                          color: NAVY,
                          fontSize: 13,
                          fontWeight: 500,
                        }}
                      >
                        {fmt12h(slot.startTime)} – {fmt12h(slot.endTime)}
                      </span>
                    </div>
                    <span style={{ color: MUTED, fontSize: 11 }}>
                      {(slot.gapMinutes / 60).toFixed(
                        slot.gapMinutes % 60 === 0 ? 0 : 1,
                      )}{" "}
                      hrs free
                    </span>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {slot.possibleDurations.map((d) => {
                        const key = `${slot.date}|${slot.startTime}|${d}`;
                        const isSelected = selectedSlotKey === key;
                        return (
                          <button
                            key={d}
                            onClick={() => {
                              setSelectedSlotKey(key);
                              setSlotDate(slot.date);
                              setSlotTime(slot.startTime);
                              setDuration(d);
                            }}
                            style={{
                              background: isSelected ? BLUE : "#F0F4FF",
                              color: isSelected ? "#FFFFFF" : BLUE,
                              border: `0.5px solid ${isSelected ? BLUE : "#BFDBFE"}`,
                              borderRadius: 999,
                              padding: "4px 10px",
                              fontSize: 12,
                              fontWeight: 600,
                              cursor: "pointer",
                            }}
                          >
                            {d} min
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
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
                setSelectedSlotKey(null);
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
                setSelectedSlotKey(null);
              }}
              style={inputStyle}
            />
            <div style={{ height: 10 }} />
            <FieldLabel>Duration</FieldLabel>
            <select
              value={duration}
              onChange={(e) => {
                setDuration(parseInt(e.target.value, 10));
                setSelectedSlotKey(null);
              }}
              style={inputStyle}
            >
              <option value={60}>60 mins</option>
              <option value={90}>90 mins</option>
              <option value={120}>120 mins</option>
            </select>
            <button
              onClick={findPupils}
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
              {fmtDateLong(searchDate)} at {fmtTimeHm(searchTime)}
            </div>
            <div style={{ color: MUTED, fontSize: 13 }}>
              {searchDuration} min slot
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
            border: `0.5px solid ${BORDER}`,
            borderRadius: 12,
            padding: "12px 14px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            cursor: "pointer",
          }}
        >
          <span style={{ fontWeight: 600, color: NAVY, fontSize: 14 }}>
            Recent offers ({offers.length})
          </span>
          {offersOpen ? (
            <ChevronUp size={18} color={MUTED} />
          ) : (
            <ChevronDown size={18} color={MUTED} />
          )}
        </button>
        {offersOpen && (
          <div style={{ marginTop: 8 }}>
            {offers.length === 0 && (
              <div style={{ color: MUTED, fontSize: 13, padding: "8px 4px" }}>
                No offers yet.
              </div>
            )}
            {offers.map((o) => (
              <div
                key={o.id}
                style={{
                  background: "#FFFFFF",
                  border: `0.5px solid ${BORDER}`,
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

      {selectedSlotKey && (
        <>
          <div style={{ height: 96 }} />
          <div
            style={{
              position: "fixed",
              bottom: 80,
              left: 16,
              right: 16,
              maxWidth: 430,
              margin: "0 auto",
              zIndex: 50,
            }}
          >
            <button
              onClick={findPupils}
              disabled={loading}
              style={{
                width: "100%",
                background: NAVY,
                color: "#FFFFFF",
                fontWeight: 600,
                fontSize: 14,
                borderRadius: 12,
                border: "none",
                padding: "12px 16px",
                cursor: "pointer",
                boxShadow: "0 6px 20px rgba(15, 32, 68, 0.25)",
                opacity: loading ? 0.6 : 1,
              }}
            >
              {loading
                ? "Finding pupils…"
                : `Find pupils for ${new Date(
                    slotDate + "T00:00:00",
                  ).toLocaleDateString("en-GB", {
                    weekday: "long",
                    day: "numeric",
                    month: "short",
                  })} at ${fmt12h(slotTime)} (${duration} min) →`}
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
  onText,
  onMessage,
  onBook,
}: {
  rank: number;
  r: Ranked;
  dayOfWeekLabel: string;
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

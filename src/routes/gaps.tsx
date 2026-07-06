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

  // Offer-sheet state (per-pupil slot picker across ALL free slots)
  const [offerFor, setOfferFor] = useState<Ranked | null>(null);
  const [offerSlotStates, setOfferSlotStates] = useState<
    Record<string, { selected: boolean; duration: number }>
  >({});

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
    await logOfferSlots(pupilId, via, slots);
  }

  async function logOfferSlots(
    pupilId: string,
    via: "sms" | "message",
    slots: SelectedSlot[],
  ) {
    if (!userId || !slots.length) return;
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

  function slotDayTimeKey(date: string, startTime: string) {
    return `${date}|${startTime}`;
  }

  function openOfferSheet(r: Ranked) {
    const defaults: Record<string, { selected: boolean; duration: number }> = {};
    const pref = r.settings?.preferred_duration_minutes ?? 60;
    for (const s of freeSlots) {
      const possible = s.possibleDurations;
      const chosen = possible.includes(pref) ? pref : possible[0] ?? 60;
      defaults[slotDayTimeKey(s.date, s.startTime)] = {
        selected: true,
        duration: chosen,
      };
    }
    setOfferSlotStates(defaults);
    setOfferFor(r);
  }

  function closeOfferSheet() {
    setOfferFor(null);
    setOfferSlotStates({});
  }

  function buildOfferMessage(first: string, slots: SelectedSlot[]) {
    if (slots.length === 1) {
      const s = slots[0];
      return `Hi ${first}, I have a ${s.duration} minute lesson slot available on ${fmtDateLong(s.date)} at ${fmtTimeHm(s.time)}. Would you like it? Reply YES to confirm or let me know if another time works better. Thanks!`;
    }
    const lines = slots
      .map(
        (s) =>
          `- ${fmtDateLong(s.date)} at ${fmtTimeHm(s.time)} (${s.duration} min)`,
      )
      .join("\n");
    return `Hi ${first}, I have the following lesson slots available — would any suit you?\n${lines}\nReply YES + date/time to confirm, or let me know what works for you!`;
  }

  function checkedSlotsFor(_r: Ranked): SelectedSlot[] {
    const out: SelectedSlot[] = [];
    for (const s of freeSlots) {
      const st = offerSlotStates[slotDayTimeKey(s.date, s.startTime)];
      if (st?.selected) {
        out.push({ date: s.date, time: s.startTime, duration: st.duration });
      }
    }
    return out;
  }

  function handleSheetSms(r: Ranked) {
    const slots = checkedSlotsFor(r);
    if (!slots.length) {
      toast.error("Select at least one slot to offer");
      return;
    }
    const body = buildOfferMessage(firstNameOf(r.pupil), slots);
    const phone = r.pupil.phone || "";
    window.location.href = `sms:${phone}?body=${encodeURIComponent(body)}`;
    void logOfferSlots(r.pupil.id, "sms", slots);
    closeOfferSheet();
  }

  function handleSheetMessage(r: Ranked) {
    const slots = checkedSlotsFor(r);
    if (!slots.length) {
      toast.error("Select at least one slot to offer");
      return;
    }
    void logOfferSlots(r.pupil.id, "message", slots);
    closeOfferSheet();
    navigate({ to: "/messages/$pupilId", params: { pupilId: r.pupil.id } });
  }

  function handleSheetBook(r: Ranked) {
    const slots = checkedSlotsFor(r);
    if (slots.length === 0) {
      toast.error("Select one slot to book");
      return;
    }
    if (slots.length > 1) {
      toast.info("Select one slot to book");
      return;
    }
    const s = slots[0];
    const qs = new URLSearchParams({
      pupilId: r.pupil.id,
      date: s.date,
      time: s.time,
      duration: String(s.duration),
    });
    closeOfferSheet();
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
      {/* Light header */}
      <div
        className="sticky top-0 z-40"
        style={{
          background: "#FFFFFF",
          borderBottom: `0.5px solid ${BORDER}`,
          padding: "14px 20px 12px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button
            onClick={() => navigate({ to: "/home" })}
            aria-label="Back"
            style={{
              background: "#F1F5F9",
              border: "none",
              width: 36,
              height: 36,
              borderRadius: 999,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              color: NAVY,
            }}
          >
            <ArrowLeft size={18} />
          </button>
          <div style={{ flex: 1 }}>
            <h1
              style={{
                ...FONT,
                color: NAVY,
                fontSize: 22,
                fontWeight: 700,
                letterSpacing: "-0.01em",
                margin: 0,
                lineHeight: 1.1,
              }}
            >
              Fill My Slots
            </h1>
            <div style={{ color: "#94A3B8", fontSize: 13, marginTop: 2 }}>
              Available gaps in the next 14 days
            </div>
          </div>
        </div>
      </div>

      {/* Stat cards */}
      <div
        style={{
          padding: "16px 20px 8px",
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: 10,
        }}
      >
        {[
          { label: "Slots", value: String(freeSlots.length) },
          {
            label: "Days",
            value: String(
              dayGroups.filter((g) => g.slots.length > 0).length,
            ),
          },
          {
            label: "Potential",
            value:
              hourlyRate > 0
                ? `£${Math.round(
                    (dayGroups.reduce(
                      (s, d) => s + d.totalFreeMinutes,
                      0,
                    ) /
                      60) *
                      hourlyRate,
                  )}`
                : "—",
          },
        ].map((s) => (
          <div
            key={s.label}
            style={{
              background: TINT,
              padding: "12px 12px 10px",
              borderRadius: 16,
            }}
          >
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: BLUE,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                marginBottom: 4,
              }}
            >
              {s.label}
            </div>
            <div style={{ fontSize: 20, fontWeight: 700, color: NAVY }}>
              {s.value}
            </div>
          </div>
        ))}
      </div>

      {/* Reassurance strip */}
      <div
        style={{
          margin: "4px 20px 4px",
          display: "flex",
          alignItems: "center",
          gap: 8,
          color: MUTED,
          fontSize: 12,
        }}
      >
        <Zap size={13} color={BLUE_BRIGHT} />
        <span>
          We rank pupils by availability, preferences and time since last
          lesson.
        </span>
      </div>

      <div style={{ marginTop: 16 }}>
        <div style={{ margin: "0 16px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 8,
            }}
          >
            <div style={{ fontWeight: 700, color: NAVY, fontSize: 16 }}>
              Your free slots — next 14 days
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
                  color: BLUE,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  padding: 0,
                }}
              >
                {selectedSlots.length > 0 ? "Clear all" : "Select all"}
              </button>
            )}
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
              border: `1px solid ${BORDER}`,
              borderRadius: 20,
              padding: 24,
              margin: "0 16px",
              textAlign: "center",
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 999,
                background: TINT,
                margin: "0 auto 10px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <CalendarIcon size={20} color={BLUE_BRIGHT} />
            </div>
            <div style={{ color: NAVY, fontWeight: 700, fontSize: 15 }}>
              No free slots in the next 14 days
            </div>
            <div style={{ color: MUTED, fontSize: 13, marginTop: 6 }}>
              Your diary looks full — check your schedule
            </div>
            <button
              onClick={() => navigate({ to: "/schedule" })}
              style={{
                marginTop: 12,
                background: "transparent",
                border: "none",
                color: BLUE_BRIGHT,
                fontWeight: 700,
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
                        setSelectedSlots([]);
                      }
                    : undefined
                }
                style={{
                  padding: "10px 20px",
                  margin: "0 20px 6px",
                  borderRadius: 12,
                  background: "#F8FAFC",
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
            <div key={g.iso} style={{ marginBottom: 18 }}>
              <div
                style={{
                  padding: "6px 20px 10px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <span
                  style={{
                    color: "#94A3B8",
                    fontWeight: 700,
                    fontSize: 11,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                  }}
                >
                  {dLabel}
                </span>
                <span style={{ color: "#94A3B8", fontSize: 11 }}>
                  {g.slots.length} slot{g.slots.length === 1 ? "" : "s"}
                </span>
              </div>
              <div
                style={{
                  padding: "0 20px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                }}
              >
                {g.slots.map((slot) => {
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
                  return (
                    <div
                      key={`${slot.date}|${slot.startTime}`}
                      style={{
                        background: "#FFFFFF",
                        border: anySelected
                          ? `2px solid ${BLUE_BRIGHT}`
                          : `1px solid #EEF2F7`,
                        borderRadius: 16,
                        padding: "14px 14px",
                        boxShadow:
                          "0 1px 2px rgba(15, 32, 68, 0.04)",
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                      }}
                    >
                      {/* Radio dot */}
                      <div
                        style={{
                          width: 20,
                          height: 20,
                          borderRadius: 999,
                          border: `2px solid ${anySelected ? BLUE_BRIGHT : "#E2E8F0"}`,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        {anySelected && (
                          <div
                            style={{
                              width: 10,
                              height: 10,
                              borderRadius: 999,
                              background: BLUE_BRIGHT,
                            }}
                          />
                        )}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            color: NAVY,
                            fontWeight: 700,
                            fontSize: 14,
                          }}
                        >
                          {fmt12h(slot.startTime)} – {fmt12h(slot.endTime)}
                        </div>
                        <div
                          style={{
                            display: "flex",
                            flexWrap: "wrap",
                            gap: 6,
                            marginTop: 8,
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
                                onClick={() => {
                                  setSelectedSlots((prev) => {
                                    const exists = prev.some(
                                      (s) => slotKey(s) === key,
                                    );
                                    if (exists)
                                      return prev.filter(
                                        (s) => slotKey(s) !== key,
                                      );
                                    return [
                                      ...prev,
                                      {
                                        date: slot.date,
                                        time: slot.startTime,
                                        duration: d,
                                      },
                                    ];
                                  });
                                }}
                                style={{
                                  background: isSelected
                                    ? BLUE_BRIGHT
                                    : "#F1F5F9",
                                  color: isSelected ? "#FFFFFF" : "#475569",
                                  border: "none",
                                  borderRadius: 6,
                                  padding: "3px 8px",
                                  fontSize: 10,
                                  fontWeight: 700,
                                  letterSpacing: "0.04em",
                                  cursor: "pointer",
                                }}
                              >
                                {d} MIN
                              </button>
                            );
                          })}
                        </div>
                      </div>
                      {hourlyRate > 0 && (
                        <div
                          style={{
                            color: BLUE,
                            fontWeight: 700,
                            fontSize: 13,
                            textAlign: "right",
                          }}
                        >
                          £
                          {(
                            (slot.gapMinutes / 60) *
                            hourlyRate
                          ).toFixed(0)}
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
              onOffer={() => openOfferSheet(r)}
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

      {offerFor && (
        <OfferSheet
          r={offerFor}
          freeSlots={freeSlots}
          slotStates={offerSlotStates}
          setSlotStates={setOfferSlotStates}
          onClose={closeOfferSheet}
          onSms={() => handleSheetSms(offerFor)}
          onMessage={() => handleSheetMessage(offerFor)}
          onBook={() => handleSheetBook(offerFor)}
        />
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
  onOffer,
}: {
  rank: number;
  r: Ranked;
  dayOfWeekLabel: string;
  multi: boolean;
  onOffer: () => void;
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

      <div style={{ marginTop: 12 }}>
        <button
          onClick={onOffer}
          style={{
            background: NAVY,
            color: "#FFFFFF",
            borderRadius: 12,
            padding: "10px 16px",
            fontSize: 14,
            fontWeight: 600,
            border: "none",
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          Offer slots →
        </button>
      </div>
    </div>
  );
}

function OfferSheet({
  r,
  checked,
  setChecked,
  onClose,
  onSms,
  onMessage,
  onBook,
}: {
  r: Ranked;
  checked: Record<string, boolean>;
  setChecked: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  onClose: () => void;
  onSms: () => void;
  onMessage: () => void;
  onBook: () => void;
}) {
  const name = fullNameOf(r.pupil);
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15,32,68,0.45)",
        zIndex: 100,
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#FFFFFF",
          width: "100%",
          maxWidth: 480,
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          padding: "20px 20px 24px",
          maxHeight: "85vh",
          overflowY: "auto",
          boxShadow: "0 -8px 32px rgba(15,32,68,0.2)",
        }}
      >
        <div
          style={{
            width: 40,
            height: 4,
            background: "#E5E7EB",
            borderRadius: 999,
            margin: "0 auto 14px",
          }}
        />
        <div style={{ color: NAVY, fontSize: 18, fontWeight: 700 }}>
          Offer slots to {name}
        </div>
        <div style={{ color: MUTED, fontSize: 13, marginBottom: 16 }}>
          Select which slots to offer
        </div>

        <div>
          {r.matchedSlots.map((m) => {
            const key = slotKey(m);
            const isChecked = !!checked[key];
            const dLabel = new Date(m.date + "T00:00:00").toLocaleDateString(
              "en-GB",
              { weekday: "long", day: "numeric", month: "long" },
            );
            return (
              <label
                key={key}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "10px 0",
                  borderBottom: "0.5px solid #F3F4F6",
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={(e) =>
                    setChecked((prev) => ({
                      ...prev,
                      [key]: e.target.checked,
                    }))
                  }
                  style={{
                    width: 18,
                    height: 18,
                    accentColor: NAVY,
                    cursor: "pointer",
                    flexShrink: 0,
                  }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: NAVY, fontSize: 14 }}>
                    {dLabel} at {fmt12h(m.time)} · {m.duration} mins
                  </div>
                  <div style={{ fontSize: 12, marginTop: 2 }}>
                    {m.match ? (
                      <span style={{ color: "#047857" }}>✓ Available</span>
                    ) : (
                      <span style={{ color: "#B45309" }}>
                        ⚠️ Prefers different time
                      </span>
                    )}
                  </div>
                </div>
              </label>
            );
          })}
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 8,
            marginTop: 16,
          }}
        >
          <button
            onClick={onSms}
            style={{
              background: NAVY,
              color: "#FFFFFF",
              width: "100%",
              borderRadius: 12,
              padding: "12px 16px",
              fontSize: 15,
              fontWeight: 600,
              border: "none",
              cursor: "pointer",
            }}
          >
            📱 Send SMS
          </button>
          <button
            onClick={onMessage}
            style={{
              background: TEAL,
              color: "#FFFFFF",
              width: "100%",
              borderRadius: 12,
              padding: "12px 16px",
              fontSize: 15,
              fontWeight: 600,
              border: "none",
              cursor: "pointer",
            }}
          >
            💬 In-app message
          </button>
          <button
            onClick={onBook}
            style={{
              background: "#FFFFFF",
              color: NAVY,
              width: "100%",
              borderRadius: 12,
              padding: "12px 16px",
              fontSize: 15,
              fontWeight: 600,
              border: `0.5px solid ${NAVY}`,
              cursor: "pointer",
            }}
          >
            📅 Book directly
          </button>
        </div>

        <button
          onClick={onClose}
          style={{
            display: "block",
            margin: "12px auto 0",
            background: "transparent",
            border: "none",
            color: "#9CA3AF",
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

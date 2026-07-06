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
  Tag,
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

function addMinutesToTime(time: string, minutes: number) {
  const [h, m] = time.split(":").map((x) => parseInt(x, 10));
  const total = (h || 0) * 60 + (m || 0) + minutes;
  const newH = Math.floor(total / 60) % 24;
  const newM = ((total % 60) + 60) % 60;
  return `${String(newH).padStart(2, "0")}:${String(newM).padStart(2, "0")}`;
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
  last_lesson_date?: string | null;
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

interface DiscountConfig {
  enabled: boolean;
  type: "percent" | "fixed";
  value: number;
}

function computeDiscount(
  hourlyRate: number,
  durationMins: number,
  d: DiscountConfig,
) {
  const lessonPrice = (hourlyRate / 60) * durationMins;
  const rawDiscount =
    d.type === "percent" ? lessonPrice * (d.value / 100) : d.value;
  const discountAmount = Math.max(0, Math.min(lessonPrice, rawDiscount));
  const discountedPrice = Math.max(0, lessonPrice - discountAmount);
  return { lessonPrice, discountAmount, discountedPrice };
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
  const [bufferMins, setBufferMins] = useState<number>(15);

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
        if (!cancelled) setBufferMins(buffer);
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
            dayFree += gapMinutes;
            // Generate every 30-minute start time within the gap that still
            // leaves room for at least a 60-min lesson.
            let current = gStart;
            while (current + 60 <= g.end) {
              const remaining = g.end - current;
              const possible = [60, 90, 120].filter((d) => d <= remaining);
              if (possible.length) {
                const maxDur = possible[possible.length - 1];
                const slot: FreeSlot = {
                  date: iso,
                  startTime: minToHm(current),
                  endTime: minToHm(current + maxDur),
                  gapMinutes: remaining,
                  possibleDurations: possible,
                };
                slots.push(slot);
                daySlots.push(slot);
              }
              current += 30;
            }
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
    console.log("[gaps] findPupils called, slots:", slotsToScore);
    if (slotsToScore.length === 0) return;
    setLoading(true);
    setRanked(null);
    try {
      const [pupilsRes, availRes, lessonsRes] = await Promise.all([
        supabase
          .from("pupils")
          .select(
            "id,name,first_name,last_name,phone,postcode,calendar_colour",
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
      if (pupilsRes.error)
        console.error("[gaps] pupils fetch error:", pupilsRes.error);
      if (availRes.error)
        console.error("[gaps] settings fetch error:", availRes.error);
      if (lessonsRes.error)
        console.error("[gaps] lessons fetch error:", lessonsRes.error);

      const pupils = (pupilsRes.data ?? []) as Pupil[];
      const settingsList = (availRes.data ?? []) as Availability[];
      console.log("[gaps] pupils fetched:", pupils.length);
      console.log("[gaps] settings fetched:", settingsList.length);
      const availMap = new Map<string, Availability>();
      for (const a of settingsList) {
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
      console.log("[gaps] ranked result:", scored.length);
      setRanked(scored);
      setSearchSlots(slotsToScore);
    } catch (err) {
      console.error("[gaps] findPupils failed:", err);
      toast.error("Failed to find pupils — please try again");
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
    discount?: DiscountConfig,
    hourlyRate?: number,
  ) {
    if (!userId || !slots.length) return;
    try {
      const rows = slots.map((s) => {
        const base: Record<string, unknown> = {
          instructor_id: userId,
          pupil_id: pupilId,
          slot_date: s.date,
          slot_time: s.time,
          duration_minutes: s.duration,
          status: "sent",
          sent_via: via,
        };
        if (discount?.enabled && hourlyRate && hourlyRate > 0) {
          const priced = computeDiscount(hourlyRate, s.duration, discount);
          base.discount_type = discount.type;
          base.discount_value = discount.value;
          base.original_price = priced.lessonPrice;
          base.discounted_price = priced.discountedPrice;
        }
        return base;
      });
      const { error } = await supabase.from("gap_filler_offers").insert(rows);
      if (error) throw error;
      setReloadKey((k) => k + 1);
    } catch (err) {
      console.warn("[gaps] logOffer failed:", err);
    }
  }
  // NOTE: to persist discount fields, run in Supabase:
  //   alter table gap_filler_offers add column if not exists discount_type text;
  //   alter table gap_filler_offers add column if not exists discount_value numeric(5,2);
  //   alter table gap_filler_offers add column if not exists original_price numeric(8,2);
  //   alter table gap_filler_offers add column if not exists discounted_price numeric(8,2);

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
        selected: false,
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

  function buildOfferMessage(
    first: string,
    slots: SelectedSlot[],
    discount?: DiscountConfig,
    hourlyRate?: number,
  ) {
    const priceLine = (s: SelectedSlot) => {
      if (!discount?.enabled || !hourlyRate || hourlyRate <= 0) return "";
      const p = computeDiscount(hourlyRate, s.duration, discount);
      return ` Special offer: this slot is discounted to £${p.discountedPrice.toFixed(0)} (usually £${p.lessonPrice.toFixed(0)}).`;
    };
    if (slots.length === 1) {
      const s = slots[0];
      return `Hi ${first}, I have a ${s.duration} minute lesson slot available on ${fmtDateLong(s.date)} at ${fmtTimeHm(s.time)}.${priceLine(s)} Would you like it? Reply YES to confirm or let me know if another time works better. Thanks!`;
    }
    const lines = slots
      .map(
        (s) =>
          `- ${fmtDateLong(s.date)} at ${fmtTimeHm(s.time)} (${s.duration} min)${priceLine(s)}`,
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

  function handleSheetSms(r: Ranked, discount: DiscountConfig) {
    const slots = checkedSlotsFor(r);
    if (!slots.length) {
      toast.error("Select at least one slot to offer");
      return;
    }
    const body = buildOfferMessage(
      firstNameOf(r.pupil),
      slots,
      discount,
      hourlyRate,
    );
    const phone = r.pupil.phone || "";
    window.location.href = `sms:${phone}?body=${encodeURIComponent(body)}`;
    void logOfferSlots(r.pupil.id, "sms", slots, discount, hourlyRate);
    closeOfferSheet();
  }

  function handleSheetMessage(r: Ranked, discount: DiscountConfig) {
    const slots = checkedSlotsFor(r);
    if (!slots.length) {
      toast.error("Select at least one slot to offer");
      return;
    }
    void logOfferSlots(r.pupil.id, "message", slots, discount, hourlyRate);
    closeOfferSheet();
    navigate({ to: "/messages/$pupilId", params: { pupilId: r.pupil.id } });
  }

  function handleSheetBook(r: Ranked, discount: DiscountConfig) {
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
    const params: Record<string, string> = {
      pupilId: r.pupil.id,
      date: s.date,
      time: s.time,
      duration: String(s.duration),
    };
    if (discount.enabled && hourlyRate > 0) {
      const priced = computeDiscount(hourlyRate, s.duration, discount);
      params.amount = priced.discountedPrice.toFixed(2);
    }
    const qs = new URLSearchParams(params);
    closeOfferSheet();
    navigate({ to: `/lessons/new?${qs.toString()}` as unknown as "/lessons/new" });
  }

  const noGoodMatches = useMemo(
    () =>
      ranked !== null && ranked.length > 0 && ranked.every((r) => r.score < 20),
    [ranked],
  );

  // Blocked time ranges (per date) created by already-selected slots.
  // Each selected slot blocks: [start, start + duration + buffer).
  const blockedByDate = useMemo(() => {
    const map: Record<string, { start: number; end: number }[]> = {};
    for (const s of selectedSlots) {
      const start = hmToMin(s.time);
      const end = start + s.duration + bufferMins;
      (map[s.date] ??= []).push({ start, end });
    }
    for (const k of Object.keys(map)) map[k].sort((a, b) => a.start - b.start);
    return map;
  }, [selectedSlots, bufferMins]);

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
                  // Dynamic blocking from already-selected slots on same day.
                  const slotStartMin = hmToMin(slot.startTime);
                  const dayBlocks = blockedByDate[slot.date] ?? [];
                  const isBlocked =
                    !anySelected &&
                    dayBlocks.some(
                      (b) => slotStartMin >= b.start && slotStartMin < b.end,
                    );
                  // How much free time exists from this start until the next
                  // blocked range begins (or gap end via gapMinutes fallback).
                  const nextBlockStart = dayBlocks
                    .filter((b) => b.start > slotStartMin)
                    .reduce(
                      (min, b) => Math.min(min, b.start),
                      Number.POSITIVE_INFINITY,
                    );
                  const freeMinsFromHere = Math.min(
                    slot.gapMinutes,
                    nextBlockStart === Number.POSITIVE_INFINITY
                      ? slot.gapMinutes
                      : nextBlockStart - slotStartMin,
                  );
                  const durations = anySelected
                    ? slot.possibleDurations
                    : slot.possibleDurations.filter(
                        (d) => d <= freeMinsFromHere,
                      );
                  // Hide slots that are fully consumed by a later block and
                  // cannot fit any lesson, unless already selected.
                  if (!anySelected && !isBlocked && durations.length === 0) {
                    return null;
                  }
                  const selectedDuration =
                    selectedSlots.find(
                      (s) =>
                        s.date === slot.date && s.time === slot.startTime,
                    )?.duration ??
                    durations[0] ??
                    slot.possibleDurations[0] ??
                    60;
                  const displayEnd = addMinutesToTime(
                    slot.startTime,
                    selectedDuration,
                  );
                  const toggleWholeSlot = () => {
                    setSelectedSlots((prev) => {
                      // Deselect: remove ALL entries for this date+startTime
                      const filtered = prev.filter(
                        (s) =>
                          !(s.date === slot.date && s.time === slot.startTime),
                      );
                      if (filtered.length !== prev.length) return filtered;
                      // Select: add with the current default duration
                      return [
                        ...prev,
                        {
                          date: slot.date,
                          time: slot.startTime,
                          duration: selectedDuration,
                        },
                      ];
                    });
                  };
                  return (
                    <div
                      key={`${slot.date}|${slot.startTime}`}
                      onClick={isBlocked ? undefined : toggleWholeSlot}
                      role="button"
                      aria-pressed={anySelected}
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
                        opacity: isBlocked ? 0.4 : 1,
                        pointerEvents: isBlocked ? "none" : "auto",
                        cursor: isBlocked ? "default" : "pointer",
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
                          {fmt12h(slot.startTime)} – {fmt12h(displayEnd)}
                        </div>
                        <div
                          style={{
                            display: "flex",
                            flexWrap: "wrap",
                            gap: 6,
                            marginTop: 8,
                          }}
                        >
                          {durations.map((d) => {
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
                                    const exists = prev.some(
                                      (s) => slotKey(s) === key,
                                    );
                                    if (exists)
                                      return prev.filter(
                                        (s) => slotKey(s) !== key,
                                      );
                                    // Replace any existing entry for this slot
                                    // with the newly-chosen duration so a slot
                                    // has exactly one active duration at a time.
                                    const cleared = prev.filter(
                                      (s) =>
                                        !(
                                          s.date === slot.date &&
                                          s.time === slot.startTime
                                        ),
                                    );
                                    return [
                                      ...cleared,
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
                Add pupils to DSM to use Fill My Slots
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

          {(() => {
            const withAvailability = ranked.filter((r) => r.settings != null);
            const withoutAvailability = ranked
              .filter((r) => r.settings == null)
              .slice()
              .sort((a, b) =>
                fullNameOf(a.pupil).localeCompare(fullNameOf(b.pupil)),
              );
            return (
              <>
                {withAvailability.length > 0 && (
                  <>
                    <div
                      style={{
                        margin: "8px 16px 6px",
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <span
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: 999,
                          background: "#16A34A",
                          display: "inline-block",
                        }}
                      />
                      <span
                        style={{
                          color: NAVY,
                          fontWeight: 700,
                          fontSize: 14,
                        }}
                      >
                        Best matches
                      </span>
                      <span style={{ color: "#16A34A", fontSize: 12 }}>
                        Availability set
                      </span>
                    </div>
                    {withAvailability.map((r, idx) => (
                      <PupilCard
                        key={r.pupil.id}
                        rank={idx + 1}
                        r={r}
                        dayOfWeekLabel={dayOfWeekLabel}
                        multi={searchSlots.length > 1}
                        onOffer={() => openOfferSheet(r)}
                      />
                    ))}
                  </>
                )}
                {withoutAvailability.length > 0 && (
                  <>
                    <div
                      style={{
                        margin: "16px 16px 6px",
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        flexWrap: "wrap",
                      }}
                    >
                      <span
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: 999,
                          background: "#9CA3AF",
                          display: "inline-block",
                        }}
                      />
                      <span
                        style={{
                          color: NAVY,
                          fontWeight: 700,
                          fontSize: 14,
                        }}
                      >
                        Other pupils
                      </span>
                      <span style={{ color: "#9CA3AF", fontSize: 12 }}>
                        No availability set — may still be interested
                      </span>
                    </div>
                    {withoutAvailability.map((r) => (
                      <div key={r.pupil.id}>
                        <div style={{ margin: "0 16px 4px" }}>
                          <span
                            style={{
                              display: "inline-block",
                              background: "#FEF3C7",
                              color: "#92400E",
                              border: "0.5px solid #FCD34D",
                              borderRadius: 999,
                              padding: "2px 8px",
                              fontSize: 11,
                              fontWeight: 600,
                            }}
                          >
                            No availability preferences set
                          </span>
                        </div>
                        <PupilCard
                          rank={0}
                          r={r}
                          dayOfWeekLabel={dayOfWeekLabel}
                          multi={searchSlots.length > 1}
                          onOffer={() => openOfferSheet(r)}
                        />
                      </div>
                    ))}
                  </>
                )}
              </>
            );
          })()}
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
          hourlyRate={hourlyRate}
          onClose={closeOfferSheet}
          onSms={(d) => handleSheetSms(offerFor, d)}
          onMessage={(d) => handleSheetMessage(offerFor, d)}
          onBook={(d) => handleSheetBook(offerFor, d)}
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
  freeSlots,
  slotStates,
  setSlotStates,
  hourlyRate,
  onClose,
  onSms,
  onMessage,
  onBook,
}: {
  r: Ranked;
  freeSlots: FreeSlot[];
  slotStates: Record<string, { selected: boolean; duration: number }>;
  setSlotStates: React.Dispatch<
    React.SetStateAction<
      Record<string, { selected: boolean; duration: number }>
    >
  >;
  hourlyRate: number;
  onClose: () => void;
  onSms: (d: DiscountConfig) => void;
  onMessage: (d: DiscountConfig) => void;
  onBook: (d: DiscountConfig) => void;
}) {
  const name = fullNameOf(r.pupil);
  const first = firstNameOf(r.pupil);
  const settings = r.settings;

  const [discountEnabled, setDiscountEnabled] = useState(false);
  const [discountType, setDiscountType] = useState<"percent" | "fixed">(
    "percent",
  );
  const [discountValue, setDiscountValue] = useState<number>(10);

  function handleTypeSwitch(next: "percent" | "fixed") {
    setDiscountType(next);
    setDiscountValue(next === "percent" ? 10 : 5);
  }

  const discount: DiscountConfig = {
    enabled: discountEnabled,
    type: discountType,
    value: Number.isFinite(discountValue) ? discountValue : 0,
  };

  // Group free slots by day
  const byDay = new Map<string, FreeSlot[]>();
  for (const s of freeSlots) {
    const arr = byDay.get(s.date) ?? [];
    arr.push(s);
    byDay.set(s.date, arr);
  }
  const dayEntries = Array.from(byDay.entries()).sort(([a], [b]) =>
    a.localeCompare(b),
  );

  function slotDTKey(s: FreeSlot) {
    return `${s.date}|${s.startTime}`;
  }

  function matchInfo(s: FreeSlot): { text: string; color: string } | null {
    if (!settings) return null;
    const dayOfWeek = DAYS[new Date(s.date + "T00:00:00").getDay()];
    const availDays = settings.available_days || [];
    if (availDays.length && !availDays.includes(dayOfWeek)) {
      return { text: "✗ Not their preferred day", color: "#CC2229" };
    }
    const slotHour = parseInt(s.startTime.split(":")[0], 10);
    const fromHour = parseInt(
      (settings.available_from || "08:00").split(":")[0],
      10,
    );
    const untilHour = parseInt(
      (settings.available_until || "18:00").split(":")[0],
      10,
    );
    if (slotHour < fromHour || slotHour >= untilHour) {
      return { text: "⚠️ Outside their preferred hours", color: "#D97706" };
    }
    return {
      text: `✓ ${first} is usually available at this time`,
      color: "#16A34A",
    };
  }

  const selectedList = freeSlots
    .map((s) => ({ s, st: slotStates[slotDTKey(s)] }))
    .filter((x) => x.st?.selected);

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
          maxHeight: "85vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 -8px 32px rgba(15,32,68,0.2)",
        }}
      >
        <div style={{ padding: "12px 20px 0" }}>
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
          <div style={{ color: MUTED, fontSize: 13, marginBottom: 8 }}>
            Select which slots to offer
          </div>
        </div>

        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "4px 20px 12px",
          }}
        >
          {freeSlots.length === 0 && (
            <div
              style={{
                color: MUTED,
                fontSize: 13,
                textAlign: "center",
                padding: "24px 0",
              }}
            >
              No free slots detected in the next 14 days.
            </div>
          )}
          {dayEntries.map(([iso, slots]) => {
            const dLabel = new Date(iso + "T00:00:00").toLocaleDateString(
              "en-GB",
              { weekday: "long", day: "numeric", month: "long" },
            );
            return (
              <div key={iso}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "baseline",
                    justifyContent: "space-between",
                    marginTop: 12,
                    marginBottom: 6,
                  }}
                >
                  <span
                    style={{ color: NAVY, fontWeight: 700, fontSize: 13 }}
                  >
                    {dLabel}
                  </span>
                  {(() => {
                    const allSelected = slots.every(
                      (s) => slotStates[slotDTKey(s)]?.selected,
                    );
                    return (
                      <button
                        type="button"
                        onClick={() =>
                          setSlotStates((prev) => {
                            const next = { ...prev };
                            for (const s of slots) {
                              const k = slotDTKey(s);
                              const cur = next[k];
                              next[k] = {
                                selected: !allSelected,
                                duration:
                                  cur?.duration ??
                                  s.possibleDurations[0] ??
                                  60,
                              };
                            }
                            return next;
                          })
                        }
                        style={{
                          background: "transparent",
                          border: "none",
                          padding: 0,
                          color: BLUE,
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: "pointer",
                        }}
                      >
                        {allSelected ? "Clear today" : "Select all today"}
                      </button>
                    );
                  })()}
                </div>
                {slots.map((s) => {
                  const key = slotDTKey(s);
                  const st = slotStates[key] ?? {
                    selected: false,
                    duration: s.possibleDurations[0] ?? 60,
                  };
                  const info = matchInfo(s);
                  const hoursFree = (s.gapMinutes / 60).toFixed(
                    s.gapMinutes % 60 === 0 ? 0 : 1,
                  );
                  return (
                    <div
                      key={key}
                      style={{
                        background: "#FFFFFF",
                        border: `0.5px solid ${BORDER}`,
                        borderRadius: 10,
                        padding: "12px 14px",
                        marginBottom: 6,
                        opacity: st.selected ? 1 : 0.5,
                        transition: "opacity 120ms ease",
                      }}
                    >
                      <div
                        style={{ display: "flex", alignItems: "center" }}
                      >
                        <button
                          type="button"
                          onClick={() =>
                            setSlotStates((prev) => ({
                              ...prev,
                              [key]: {
                                selected: !st.selected,
                                duration: st.duration,
                              },
                            }))
                          }
                          aria-label={
                            st.selected ? "Deselect slot" : "Select slot"
                          }
                          style={{
                            width: 20,
                            height: 20,
                            borderRadius: 6,
                            background: st.selected ? NAVY : "#FFFFFF",
                            border: st.selected
                              ? `1.5px solid ${NAVY}`
                              : `1.5px solid ${BORDER}`,
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            padding: 0,
                            cursor: "pointer",
                            flexShrink: 0,
                          }}
                        >
                          {st.selected && (
                            <svg
                              width="12"
                              height="12"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="#FFFFFF"
                              strokeWidth="3.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          )}
                        </button>
                        <span
                          style={{
                            marginLeft: 10,
                            color: NAVY,
                            fontSize: 14,
                            fontWeight: 500,
                          }}
                        >
                          {fmt12h(s.startTime)} –{" "}
                          {fmt12h(addMinutesToTime(s.startTime, st.duration))}
                        </span>
                        <span
                          style={{
                            marginLeft: "auto",
                            color: "#9CA3AF",
                            fontSize: 12,
                          }}
                        >
                          {hoursFree} hrs free
                        </span>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: 6,
                          marginTop: 8,
                          marginLeft: 30,
                        }}
                      >
                        {s.possibleDurations.map((d) => {
                          const isSel = st.duration === d;
                          return (
                            <button
                              key={d}
                              type="button"
                              onClick={() =>
                                setSlotStates((prev) => ({
                                  ...prev,
                                  [key]: {
                                    selected: true,
                                    duration: d,
                                  },
                                }))
                              }
                              style={{
                                background: isSel ? NAVY : "#F0F4FF",
                                color: isSel ? "#FFFFFF" : BLUE,
                                border: isSel
                                  ? "none"
                                  : "0.5px solid #BFDBFE",
                                borderRadius: 999,
                                padding: "3px 10px",
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
                      {info && (
                        <div
                          style={{
                            marginTop: 4,
                            marginLeft: 30,
                            color: info.color,
                            fontSize: 12,
                          }}
                        >
                          {info.text}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* Sticky summary + actions */}
        <div
          style={{
            borderTop: `0.5px solid ${BORDER}`,
            padding: "12px 20px 20px",
            background: "#FFFFFF",
          }}
        >
          <div style={{ color: "#9CA3AF", fontSize: 12, marginBottom: 6 }}>
            Offering {selectedList.length} slot
            {selectedList.length === 1 ? "" : "s"}:
          </div>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 6,
              marginBottom: 12,
              minHeight: 24,
            }}
          >
            {selectedList.map(({ s, st }) => {
              const wd = new Date(s.date + "T00:00:00").toLocaleDateString(
                "en-GB",
                { weekday: "short" },
              );
              return (
                <span
                  key={slotDTKey(s)}
                  style={{
                    background: NAVY,
                    color: "#FFFFFF",
                    borderRadius: 999,
                    padding: "3px 10px",
                    fontSize: 11,
                    fontWeight: 600,
                  }}
                >
                  {wd} {fmt12h(s.startTime)} ({st!.duration}min)
                </span>
              );
            })}
          </div>

        {/* Discount card */}
        {(() => {
          const now = Date.now();
          const earliestMs = selectedList.reduce((min, { s }) => {
            const ts = new Date(`${s.date}T${s.startTime}:00`).getTime();
            return ts < min ? ts : min;
          }, Number.POSITIVE_INFINITY);
          const hrsUntil =
            earliestMs === Number.POSITIVE_INFINITY
              ? Infinity
              : (earliestMs - now) / (1000 * 60 * 60);
          const hint =
            hrsUntil <= 4
              ? "💡 Try 15-20% off to fill this slot quickly"
              : hrsUntil <= 24
                ? "💡 Last-minute slots fill faster with a small discount"
                : null;
          const suffix = discountType === "percent" ? "%" : "£";
          return (
            <div
              style={{
                background: "#FFFFFF",
                border: `0.5px solid ${BORDER}`,
                borderRadius: 10,
                padding: 14,
                marginTop: 12,
                marginBottom: 12,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <Tag size={16} color="#D97706" />
                  <span
                    style={{
                      color: NAVY,
                      fontSize: 14,
                      fontWeight: 600,
                    }}
                  >
                    Offer a discount?
                  </span>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={discountEnabled}
                  onClick={() => setDiscountEnabled((v) => !v)}
                  style={{
                    width: 40,
                    height: 22,
                    borderRadius: 999,
                    background: discountEnabled ? NAVY : "#E2E6ED",
                    border: "none",
                    padding: 0,
                    position: "relative",
                    cursor: "pointer",
                    transition: "background 120ms ease",
                  }}
                >
                  <span
                    style={{
                      position: "absolute",
                      top: 2,
                      left: discountEnabled ? 20 : 2,
                      width: 18,
                      height: 18,
                      background: "#FFFFFF",
                      borderRadius: 999,
                      boxShadow: "0 1px 2px rgba(15,32,68,0.25)",
                      transition: "left 120ms ease",
                    }}
                  />
                </button>
              </div>
              {discountEnabled && (
                <>
                  <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                    {(
                      [
                        { k: "percent", label: "% off" },
                        { k: "fixed", label: "£ off" },
                      ] as const
                    ).map((opt) => {
                      const sel = discountType === opt.k;
                      return (
                        <button
                          key={opt.k}
                          type="button"
                          onClick={() => handleTypeSwitch(opt.k)}
                          style={{
                            background: sel ? NAVY : "#F3F4F6",
                            color: sel ? "#FFFFFF" : "#6B7280",
                            border: "none",
                            borderRadius: 999,
                            padding: "6px 14px",
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: "pointer",
                          }}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      marginTop: 8,
                    }}
                  >
                    <input
                      type="number"
                      min={0}
                      value={Number.isFinite(discountValue) ? discountValue : 0}
                      onChange={(e) => {
                        const n = parseFloat(e.target.value);
                        setDiscountValue(Number.isFinite(n) ? n : 0);
                      }}
                      style={{
                        background: "#F7FAFC",
                        border: `0.5px solid ${BORDER}`,
                        borderRadius: 8,
                        padding: "8px 12px",
                        width: 80,
                        textAlign: "center",
                        fontWeight: 700,
                        color: NAVY,
                        fontSize: 14,
                      }}
                    />
                    <span
                      style={{ color: NAVY, fontWeight: 600, fontSize: 14 }}
                    >
                      {suffix}
                    </span>
                  </div>
                  {hourlyRate > 0 && selectedList.length > 0 && (
                    <div style={{ marginTop: 8 }}>
                      {selectedList.map(({ s, st }) => {
                        const priced = computeDiscount(
                          hourlyRate,
                          st!.duration,
                          discount,
                        );
                        const wd = new Date(
                          s.date + "T00:00:00",
                        ).toLocaleDateString("en-GB", { weekday: "short" });
                        return (
                          <div
                            key={`price-${slotDTKey(s)}`}
                            style={{
                              display: "flex",
                              alignItems: "baseline",
                              gap: 8,
                              flexWrap: "wrap",
                              marginTop: 2,
                            }}
                          >
                            <span
                              style={{
                                color: "#9CA3AF",
                                fontSize: 11,
                                minWidth: 90,
                              }}
                            >
                              {wd} {fmt12h(s.startTime)}
                            </span>
                            <span
                              style={{
                                color: "#9CA3AF",
                                fontSize: 13,
                                textDecoration: "line-through",
                              }}
                            >
                              £{priced.lessonPrice.toFixed(0)}
                            </span>
                            <span style={{ color: "#9CA3AF" }}>→</span>
                            <span
                              style={{
                                color: TEAL,
                                fontSize: 14,
                                fontWeight: 700,
                              }}
                            >
                              £{priced.discountedPrice.toFixed(0)}
                            </span>
                            <span
                              style={{
                                color: "#16A34A",
                                fontSize: 11,
                              }}
                            >
                              Saving £{priced.discountAmount.toFixed(0)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {hint && (
                    <div
                      style={{
                        marginTop: 8,
                        color: "#6B7280",
                        fontSize: 11,
                      }}
                    >
                      {hint}
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })()}

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          <button
            onClick={() => onSms(discount)}
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
            onClick={() => onMessage(discount)}
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
            onClick={() => onBook(discount)}
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
    </div>
  );
}

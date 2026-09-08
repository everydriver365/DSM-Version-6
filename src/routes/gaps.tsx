import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";
import { computeDayGaps } from "@/lib/gapDetection";
import { previewMatchForGap } from "@/lib/pupilMatching";
import {
  useGapWindowDays,
  GAP_WINDOW_OPTIONS,
  writeGapWindowDays,
} from "@/lib/gapPrefs";

import {
  proximityToNeighbours,
  proximityRank,
  proximityLabel,
  type Proximity,
} from "@/lib/travel";
import {
  IconArrowLeft,
  IconBolt,
  IconCalendar,
  IconClock,
  IconSend,
  IconLoader2,
} from "@tabler/icons-react";
import { toast } from "@/lib/toast";

export const Route = createFileRoute("/gaps")({
  head: () => ({
    meta: [
      { title: "Gap filler — EveryDriver" },
      {
        name: "description",
        content: "Find free slots in your diary and offer them to the right pupils in seconds.",
      },
      { property: "og:title", content: "Gap filler — EveryDriver" },
      {
        property: "og:description",
        content: "Find free slots in your diary and offer them to the right pupils in seconds.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: GapsPage,
});

const SUPABASE_URL = "https://bjpqxfrihwjcqprmoqfs.supabase.co";

const MIN_GAP = 60;

const NAVY = "#0B2341";
const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function minToHm(m: number): string {
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

function localDateStr(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function addDays(iso: string, n: number): string {
  const d = new Date(iso + "T12:00:00");
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function fmtDateLong(iso: string): string {
  return new Date(iso + "T12:00:00").toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function fmtDuration(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h > 0 && m > 0) return `${h}hr ${m}min`;
  if (h > 0) return `${h}hr`;
  return `${m}min`;
}

function initials(name: string): string {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "P";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const AVATAR_COLOURS = ["#1877D6", "#18A999", "#E53935", "#F59E0B", "#8B5CF6", "#EC4899"];

function avatarColor(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) & 0xffffffff;
  return AVATAR_COLOURS[Math.abs(h) % AVATAR_COLOURS.length];
}

type Gap = {
  date: string;
  startMins: number;
  endMins: number;
  durationMins: number;
  // Where the instructor is coming from / heading to around this gap.
  beforePostcode: string | null;
  afterPostcode: string | null;
};

type Pupil = {
  id: string;
  name: string | null;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  postcode: string | null;
  calendar_colour: string | null;
  buffer_after_minutes: number | null;
};

type Availability = {
  pupil_id: string;
  available_days: string[] | null;
  available_from: string | null;
  available_until: string | null;
  min_notice_hours: number | null;
  short_notice_opt_in: boolean | null;
  preferred_duration_minutes: number | null;
};

type Unavailability = {
  pupil_id: string;
  start_date: string;
  end_date: string;
};

type MatchStatus = "available" | "no-preference" | "unavailable";

function pupilDisplayName(p: Pupil): string {
  const full = [p.first_name, p.last_name].filter(Boolean).join(" ").trim();
  return full || p.name || "Pupil";
}

function GapsPage() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [gaps, setGaps] = useState<Gap[]>([]);
  const [pupils, setPupils] = useState<Pupil[]>([]);
  const [availability, setAvailability] = useState<Availability[]>([]);
  const [unavailability, setUnavailability] = useState<Unavailability[]>([]);
  const [selectedGapIdx, setSelectedGapIdx] = useState(0);
  const [selectedPupilIds, setSelectedPupilIds] = useState<string[]>([]);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [instructorName, setInstructorName] = useState("");
  const [hourlyRate, setHourlyRate] = useState<number | null>(null);

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function load() {
    setLoading(true);
    setLoadError("");
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        navigate({ to: "/login" as never });
        return;
      }
      const uid = user.id;

      const today = todayIso();
      const endDate = addDays(today, RANGE_DAYS - 1);

      // --- Instructor settings (required: working hours drive everything) ---
      const instructorRes = await supabase
        .from("instructors")
        .select(
          "name, working_hours_start, working_hours_end, working_days, per_day_hours, lesson_buffer_after, hourly_rate",
        )
        .eq("id", uid)
        .maybeSingle();
      if (instructorRes.error) throw new Error(`Working hours: ${instructorRes.error.message}`);
      if (!instructorRes.data) throw new Error("We couldn't find your instructor profile.");

      const instr = instructorRes.data as {
        name: string | null;
        working_hours_start: string | null;
        working_hours_end: string | null;
        working_days: string[] | null;
        per_day_hours: Record<string, { active?: boolean; start?: string; end?: string }> | null;
        lesson_buffer_after: number | null;
        hourly_rate: number | null;
      };

      setInstructorName(instr.name ?? "");
      setHourlyRate(instr.hourly_rate == null ? null : Number(instr.hourly_rate));

      const workStart = String(instr.working_hours_start ?? "09:00").slice(0, 5);
      const workEnd = String(instr.working_hours_end ?? "18:00").slice(0, 5);
      const workingDays = instr.working_days ?? [
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
      ];
      const perDay = instr.per_day_hours;
      const bufferAfter = Number(instr.lesson_buffer_after ?? 0) || 0;

      // --- Diary data ---
      const [lessonsRes, icsRes, recurringRes, timeOffRes, pupilsRes] = await Promise.all([
        supabase
          .from("lessons")
          .select("lesson_date, lesson_time, duration_minutes, status, pupil_id")
          .eq("instructor_id", uid)
          .is("deleted_at", null)
          .gte("lesson_date", today)
          .lte("lesson_date", endDate),
        supabase
          .from("calendar_blocks")
          .select("start_datetime, end_datetime, title, is_all_day, blocks_availability")
          .eq("instructor_id", uid)
          // Same rows Schedule displays: imported ICS feeds AND Google
          // Calendar events. Rows with blocks_availability = false are
          // ignored by computeDayGaps and stay non-blocking.
          .eq("source", "external_calendar")
          // Overlap, not "starts inside": ends after the window opens and
          // starts before it closes. Local midnight is converted to a real
          // instant (BST/GMT aware) so nothing is lost at either boundary.
          .gt("end_datetime", new Date(`${today}T00:00:00`).toISOString())
          .lt("start_datetime", new Date(`${addDays(endDate, 1)}T00:00:00`).toISOString()),
        supabase
          .from("instructor_recurring_blocks")
          .select("day_of_week, start_time, end_time, is_active")
          .eq("instructor_id", uid),
        supabase
          .from("instructor_time_off")
          .select("start_date, end_date, start_time, end_time, all_day")
          .eq("instructor_id", uid)
          .gte("end_date", today)
          .lte("start_date", endDate),
        supabase
          .from("pupils")
          .select("id, name, first_name, last_name, phone, postcode, calendar_colour, buffer_after_minutes")
          .eq("instructor_id", uid)
          .is("deleted_at", null)
          .eq("status", "active"),
      ]);

      if (lessonsRes.error) throw new Error(`Lessons: ${lessonsRes.error.message}`);
      if (icsRes.error) throw new Error(`Calendar: ${icsRes.error.message}`);
      if (recurringRes.error) throw new Error(`Recurring blocks: ${recurringRes.error.message}`);
      if (timeOffRes.error) throw new Error(`Time off: ${timeOffRes.error.message}`);
      if (pupilsRes.error) throw new Error(`Pupils: ${pupilsRes.error.message}`);

      const lessons = (lessonsRes.data ?? []) as Array<{
        lesson_date: string;
        lesson_time: string | null;
        duration_minutes: number | null;
        status: string | null;
        pupil_id: string | null;
      }>;
      const icsData = (icsRes.data ?? []) as Array<{
        start_datetime: string;
        end_datetime: string;
        title: string | null;
        is_all_day: boolean | null;
        blocks_availability: boolean | null;
      }>;
      const recurringData = (recurringRes.data ?? []) as Array<{
        day_of_week: string;
        start_time: string;
        end_time: string;
        is_active: boolean | null;
      }>;
      const timeOffData = (timeOffRes.data ?? []) as Array<{
        start_date: string;
        end_date: string;
        start_time: string | null;
        end_time: string | null;
        all_day: boolean | null;
      }>;
      const pupilData = (pupilsRes.data ?? []) as Pupil[];
      const pupilIds = pupilData.map((p) => p.id);

      // --- Pupil availability + holidays (pupil ids only; no instructor column) ---
      let availData: Availability[] = [];
      let unavailData: Unavailability[] = [];
      if (pupilIds.length > 0) {
        const [availRes, unavailRes] = await Promise.all([
          supabase
            .from("pupil_ready_to_learn_settings")
            .select(
              "pupil_id, available_days, available_from, available_until, min_notice_hours, short_notice_opt_in, preferred_duration_minutes",
            )
            .in("pupil_id", pupilIds),
          supabase
            .from("pupil_unavailability")
            .select("pupil_id, start_date, end_date")
            .in("pupil_id", pupilIds),
        ]);
        if (availRes.error) throw new Error(`Pupil availability: ${availRes.error.message}`);
        if (unavailRes.error) throw new Error(`Pupil holidays: ${unavailRes.error.message}`);
        availData = (availRes.data ?? []) as Availability[];
        unavailData = (unavailRes.data ?? []) as Unavailability[];
      }

      setPupils(pupilData);
      setAvailability(availData);
      setUnavailability(unavailData);

      const pupilBuffers = new Map(pupilData.map((p) => [p.id, p.buffer_after_minutes]));
      const pupilPostcodes = new Map(pupilData.map((p) => [p.id, p.postcode]));

      // --- Exactly 7 days: today .. today + 6 ---
      const computed: Gap[] = [];
      for (let i = 0; i < RANGE_DAYS; i++) {
        const dateStr = addDays(today, i);
        const dayName = DAY_NAMES[new Date(dateStr + "T12:00:00").getDay()];

        const dayCfg = perDay?.[dayName];
        const isWorkingDay = dayCfg ? dayCfg.active !== false : workingDays.includes(dayName);
        if (!isWorkingDay) continue;

        const dayStart = (dayCfg?.start || workStart).slice(0, 5);
        const dayEnd = (dayCfg?.end || workEnd).slice(0, 5);
        if (!dayStart || !dayEnd) continue;

        const fullDayOff = timeOffData.some(
          (t) => t.all_day && t.start_date <= dateStr && t.end_date >= dateStr,
        );
        if (fullDayOff) continue;

        const dayLessons = lessons
          .filter((l) => l.lesson_date === dateStr && l.lesson_time)
          .map((l) => ({
            lesson_time: l.lesson_time as string,
            duration_minutes: l.duration_minutes ?? 60,
            status: l.status,
            bufferAfterMinutes: l.pupil_id
              ? pupilBuffers.get(l.pupil_id) ?? bufferAfter
              : bufferAfter,
          }));

        const dayIcs = icsData.filter((b) => {
          const sd = localDateStr(b.start_datetime);
          const ed = localDateStr(b.end_datetime);
          return sd <= dateStr && ed >= dateStr;
        });

        const dayRecurring = recurringData
          .filter((b) => b.day_of_week === dayName && b.is_active !== false)
          .map((b) => ({ day_of_week: b.day_of_week, start_time: b.start_time, end_time: b.end_time }));

        const dayTimeOff = timeOffData
          .filter(
            (t) =>
              !t.all_day &&
              t.start_date <= dateStr &&
              t.end_date >= dateStr &&
              t.start_time &&
              t.end_time,
          )
          .map((t) => ({ start_time: t.start_time, end_time: t.end_time, all_day: false }));

        const result = computeDayGaps({
          dayLessons,
          calendarBlocks: dayIcs,
          recurringBlocks: dayRecurring,
          dayTimeOff,
          dayStart,
          dayEnd,
          instructorBufferAfter: bufferAfter,
          dateStr,
          isToday: dateStr === today,
          minGapMinutes: MIN_GAP,
        });

        // Where the instructor is before and after each gap, for travel ranking.
        const daySpans = lessons
          .filter(
            (l) =>
              l.lesson_date === dateStr &&
              l.lesson_time &&
              (l.status ?? "scheduled") !== "cancelled",
          )
          .map((l) => {
            const [h, m] = (l.lesson_time as string).split(":").map(Number);
            const start = (h || 0) * 60 + (m || 0);
            return {
              start,
              end: start + (l.duration_minutes ?? 60),
              postcode: l.pupil_id ? pupilPostcodes.get(l.pupil_id) ?? null : null,
            };
          })
          .sort((a, b) => a.start - b.start);

        for (const g of result) {
          const before = [...daySpans].reverse().find((s) => s.end <= g.startMins);
          const after = daySpans.find((s) => s.start >= g.endMins);
          computed.push({
            date: dateStr,
            startMins: g.startMins,
            endMins: g.endMins,
            durationMins: g.gapMins,
            beforePostcode: before?.postcode ?? null,
            afterPostcode: after?.postcode ?? null,
          });
        }
      }


      setGaps(computed);
      setSelectedGapIdx(0);
      setSelectedPupilIds([]);
    } catch (error) {
      console.error("[gaps] failed to load", error);
      setGaps([]);
      const detail = error instanceof Error ? error.message.trim() : String(error ?? "").trim();
      setLoadError(detail || "Your diary could not be loaded.");
    } finally {
      setLoading(false);
    }
  }

  const selectedGap = gaps[selectedGapIdx] ?? null;

  /** Match status per pupil, straight from the shared matching engine. */
  const statusByPupil = useMemo(() => {
    const map = new Map<string, MatchStatus>();
    if (!selectedGap) return map;
    const dayName = DAY_NAMES[new Date(selectedGap.date + "T12:00:00").getDay()];
    const { allMatched } = previewMatchForGap({
      date: selectedGap.date,
      dayName,
      startMin: selectedGap.startMins,
      durationMin: selectedGap.durationMins,
      allPupils: pupils,
      allAvailability: availability,
      unavailability,
    });
    const matchedIds = new Set(allMatched.map((p) => p.id));
    const hasSettings = new Set(availability.map((a) => a.pupil_id));
    for (const p of pupils) {
      map.set(
        p.id,
        matchedIds.has(p.id) ? "available" : hasSettings.has(p.id) ? "unavailable" : "no-preference",
      );
    }
    return map;
  }, [selectedGap, pupils, availability, unavailability]);

  const availableCount = useMemo(
    () => pupils.filter((p) => statusByPupil.get(p.id) === "available").length,
    [pupils, statusByPupil],
  );

  /** How close each pupil is to the lessons either side of this gap. */
  const proximityByPupil = useMemo(() => {
    const map = new Map<string, Proximity>();
    for (const p of pupils) {
      map.set(
        p.id,
        selectedGap
          ? proximityToNeighbours(p.postcode, selectedGap.beforePostcode, selectedGap.afterPostcode)
          : "unknown",
      );
    }
    return map;
  }, [pupils, selectedGap]);

  const sortedPupils = useMemo(() => {
    const rank: Record<MatchStatus, number> = { available: 0, "no-preference": 1, unavailable: 2 };
    return [...pupils].sort((a, b) => {
      const ra = rank[statusByPupil.get(a.id) ?? "no-preference"];
      const rb = rank[statusByPupil.get(b.id) ?? "no-preference"];
      if (ra !== rb) return ra - rb;
      // Closest first, so the least driving is offered first.
      const pa = proximityRank(proximityByPupil.get(a.id) ?? "unknown");
      const pb = proximityRank(proximityByPupil.get(b.id) ?? "unknown");
      if (pa !== pb) return pa - pb;
      return pupilDisplayName(a).localeCompare(pupilDisplayName(b));
    });
  }, [pupils, statusByPupil, proximityByPupil]);

  function selectGap(i: number) {
    setSelectedGapIdx(i);
    setSelectedPupilIds([]);
  }

  function togglePupil(id: string) {
    setSelectedPupilIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  function selectAllAvailable() {
    setSelectedPupilIds(pupils.filter((p) => statusByPupil.get(p.id) === "available").map((p) => p.id));
  }

  function openSheet() {
    if (!selectedGap || selectedPupilIds.length === 0) return;
    const isToday = selectedGap.date === todayIso();
    const dayLabel = isToday ? "today" : fmtDateLong(selectedGap.date);
    const timeStr = `${minToHm(selectedGap.startMins)}–${minToHm(selectedGap.endMins)}`;
    setMessage(
      `Hi [first name], I have a lesson available ${dayLabel} ${timeStr}.\nReply YES to book or NO to decline.\n— ${instructorName || "Your instructor"}`,
    );
    setSheetOpen(true);
  }

  function personalise(template: string, pupil: Pupil): string {
    const firstName = pupil.first_name || (pupil.name || "").split(" ")[0] || "there";
    return template.replace(/\[first name\]/gi, firstName);
  }

  async function sendOffers() {
    if (!selectedGap || selectedPupilIds.length === 0) return;
    setSending(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        navigate({ to: "/login" as never });
        return;
      }
      const slotTime = minToHm(selectedGap.startMins);
      const chosen = pupils.filter((p) => selectedPupilIds.includes(p.id));

      let created = 0;
      let duplicates = 0;
      let noPhone = 0;
      let failed = 0;
      // Queue row ids created by THIS action — the only rows we may report on.
      const queuedIds: string[] = [];

      for (const pupil of chosen) {
        // 1. Duplicate pending offer for this pupil + slot?
        const existing = await supabase
          .from("gap_filler_offers")
          .select("id")
          .eq("instructor_id", user.id)
          .eq("pupil_id", pupil.id)
          .eq("slot_date", selectedGap.date)
          .eq("slot_time", slotTime)
          .eq("status", "pending")
          .limit(1);
        if (existing.error) {
          console.error("[gaps] duplicate check failed", existing.error);
          failed++;
          continue;
        }
        if ((existing.data ?? []).length > 0) {
          duplicates++;
          continue;
        }

        // 2. Create the offer.
        const insertOffer = await supabase.from("gap_filler_offers").insert({
          instructor_id: user.id,
          pupil_id: pupil.id,
          slot_date: selectedGap.date,
          slot_time: slotTime,
          duration_minutes: selectedGap.durationMins,
          status: "pending",
          sent_via: "sms",
        });
        if (insertOffer.error) {
          console.error("[gaps] offer insert failed", insertOffer.error);
          failed++;
          continue;
        }
        created++;

        // 3. Queue the SMS and keep its row id.
        if (!pupil.phone) {
          noPhone++;
          continue;
        }
        const insertSms = await supabase
          .from("sms_queue")
          .insert({
            instructor_id: user.id,
            pupil_phone: pupil.phone,
            message: personalise(message, pupil),
          })
          .select("id");
        if (insertSms.error) {
          console.error("[gaps] sms queue insert failed", insertSms.error);
          failed++;
          continue;
        }
        for (const row of (insertSms.data ?? []) as Array<{ id: string }>) {
          queuedIds.push(row.id);
        }
      }

      // 4. Trigger the sender, then judge ONLY our own rows by their status.
      // send-sms is account-wide and its {sent, failed} counts can include
      // other features' messages, so its response is never used for reporting.
      let smsSent = 0;
      let smsFailed = 0;
      let stillQueued = queuedIds.length;
      if (queuedIds.length > 0) {
        try {
          const {
            data: { session },
          } = await supabase.auth.getSession();
          const res = await fetch(`${SUPABASE_URL}/functions/v1/send-sms`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session?.access_token ?? ""}`,
            },
            // send-sms takes no parameters: it processes queued rows.
            body: "{}",
          });
          if (!res.ok) console.error("[gaps] send-sms responded", res.status);
        } catch (smsError) {
          console.error("[gaps] send-sms call failed", smsError);
        }

        const statusRes = await supabase
          .from("sms_queue")
          .select("id, status")
          .in("id", queuedIds);
        if (statusRes.error) {
          console.error("[gaps] sms status check failed", statusRes.error);
        } else {
          smsSent = 0;
          smsFailed = 0;
          stillQueued = 0;
          for (const row of (statusRes.data ?? []) as Array<{ status: string | null }>) {
            const s = String(row.status ?? "queued").toLowerCase();
            if (s === "sent") smsSent++;
            else if (s === "failed") smsFailed++;
            else stillQueued++;
          }
        }
      }

      const parts: string[] = [];
      if (smsSent > 0) parts.push(`${smsSent} text${smsSent === 1 ? "" : "s"} sent`);
      if (stillQueued > 0) parts.push(`${stillQueued} still queued`);
      if (smsFailed > 0) parts.push(`${smsFailed} text${smsFailed === 1 ? "" : "s"} failed`);
      if (smsSent === 0 && stillQueued === 0 && smsFailed === 0 && created > 0) {
        parts.push(`${created} offer${created === 1 ? "" : "s"} created`);
      }
      if (duplicates > 0) parts.push(`${duplicates} already offered`);
      if (noPhone > 0) parts.push(`${noPhone} no phone`);
      if (failed > 0) parts.push(`${failed} failed`);

      const summary = parts.length ? parts.join(" · ") : "Nothing to send";
      if (smsSent > 0 || stillQueued > 0 || created > 0) toast.success(summary);
      else toast.error(summary);

      setSheetOpen(false);
      setSelectedPupilIds([]);
    } catch (error) {
      console.error("[gaps] send failed", error);
      toast.error("Couldn't send your offers. Please try again.");
    } finally {
      setSending(false);
    }
  }

  // ---------------- UI ----------------

  const page: React.CSSProperties = {
    minHeight: "100vh",
    background: "#F4F6F8",
    fontFamily: "Poppins, sans-serif",
    paddingBottom: "calc(env(safe-area-inset-bottom) + 90px)",
  };

  const header = (
    <div
      style={{
        background: NAVY,
        padding: "16px",
        paddingTop: "calc(env(safe-area-inset-top) + 16px)",
        display: "flex",
        alignItems: "center",
        gap: 12,
        position: "sticky",
        top: 0,
        zIndex: 10,
      }}
    >
      <button
        onClick={() => navigate({ to: "/home" as never })}
        aria-label="Back"
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          border: "0.5px solid rgba(255,255,255,0.25)",
          background: "transparent",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
        }}
      >
        <IconArrowLeft size={20} color="#FFFFFF" />
      </button>
      <span style={{ fontSize: 18, fontWeight: 600, color: "#FFFFFF" }}>Gap filler</span>
    </div>
  );

  if (loading) {
    return (
      <div style={page}>
        {header}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "80px 0",
          }}
        >
          <IconLoader2 size={28} style={{ animation: "spin 1s linear infinite", color: "#2C97DE" }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div style={page}>
        {header}
        <div style={{ padding: 16 }}>
          <div
            style={{
              background: "#FFFFFF",
              borderRadius: 12,
              padding: 20,
              textAlign: "center",
              boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
            }}
          >
            <div style={{ fontSize: 15, fontWeight: 600, color: NAVY }}>Couldn't load your gaps</div>
            <div style={{ fontSize: 13, color: "#536579", marginTop: 4 }}>Please try again</div>
            <div style={{ fontSize: 11, color: "#7A8A9A", marginTop: 8 }}>{loadError}</div>
            <button
              type="button"
              onClick={() => void load()}
              style={{
                marginTop: 16,
                width: "100%",
                border: "none",
                borderRadius: 8,
                padding: "12px 16px",
                background: "#2C97DE",
                color: "#FFFFFF",
                fontFamily: "inherit",
                fontWeight: 600,
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (gaps.length === 0) {
    return (
      <div style={page}>
        {header}
        <div style={{ padding: 16 }}>
          <div
            style={{
              background: "#FFFFFF",
              borderRadius: 12,
              padding: 24,
              textAlign: "center",
              color: "#536579",
              fontSize: 13,
              boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
            }}
          >
            No gaps in the next 7 days
          </div>
        </div>
      </div>
    );
  }

  const potential =
    selectedGap && hourlyRate != null && hourlyRate > 0
      ? Math.round((selectedGap.durationMins / 60) * hourlyRate)
      : null;

  return (
    <div style={page}>
      {header}

      <div style={{ padding: 16 }}>
        {/* Success banner */}
        <div
          style={{
            background: "#EAF3DE",
            borderRadius: 12,
            padding: 14,
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 16,
          }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: "50%",
              background: "#3B6D11",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <IconBolt size={20} color="#fff" />
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#3B6D11" }}>
              {gaps.length} gap{gaps.length !== 1 ? "s" : ""} found
            </div>
            <div style={{ fontSize: 11, color: "#5A7C3A", marginTop: 2 }}>
              Based on your working hours
            </div>
          </div>
        </div>

        {/* Gap selector */}
        {gaps.length > 1 && (
          <div
            style={{
              display: "flex",
              gap: 8,
              overflowX: "auto",
              paddingBottom: 12,
              scrollbarWidth: "none",
            }}
          >
            {gaps.map((g, i) => {
              const isToday = g.date === todayIso();
              const label = `${
                isToday
                  ? "Today"
                  : new Date(g.date + "T12:00:00").toLocaleDateString("en-GB", {
                      weekday: "short",
                      day: "numeric",
                    })
              } ${minToHm(g.startMins)}`;
              const active = i === selectedGapIdx;
              return (
                <button
                  key={`${g.date}-${g.startMins}`}
                  onClick={() => selectGap(i)}
                  style={{
                    padding: "6px 12px",
                    borderRadius: 20,
                    fontSize: 11,
                    whiteSpace: "nowrap",
                    cursor: "pointer",
                    border: "0.5px solid",
                    background: active ? NAVY : "#FFFFFF",
                    color: active ? "#FFFFFF" : "#536579",
                    borderColor: active ? NAVY : "#E4E8EF",
                    fontWeight: 500,
                    fontFamily: "inherit",
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>
        )}

        {selectedGap && (
          <>
            {/* Selected gap card */}
            <div
              style={{
                background: "#FFFFFF",
                borderRadius: 12,
                padding: 16,
                boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
                marginBottom: 16,
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 600, color: NAVY, marginBottom: 4 }}>
                {fmtDateLong(selectedGap.date)}
              </div>
              <div style={{ fontSize: 22, fontWeight: 700, color: NAVY, marginBottom: 8 }}>
                {minToHm(selectedGap.startMins)} – {minToHm(selectedGap.endMins)}
              </div>
              <div style={{ fontSize: 12, color: "#536579", display: "flex", gap: 6 }}>
                <span>{fmtDuration(selectedGap.durationMins)} free</span>
                {potential != null && (
                  <>
                    <span>·</span>
                    <span>£{potential} potential</span>
                  </>
                )}
              </div>
            </div>

            {/* Pupils */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 10,
              }}
            >
              <div style={{ fontSize: 14, fontWeight: 600, color: NAVY }}>
                Your pupils · {availableCount} available
              </div>
              <button
                type="button"
                onClick={selectAllAvailable}
                disabled={availableCount === 0}
                style={{
                  border: "none",
                  background: "none",
                  fontFamily: "inherit",
                  fontSize: 11,
                  fontWeight: 600,
                  color: availableCount === 0 ? "#9CA3AF" : "#2C97DE",
                  cursor: availableCount === 0 ? "default" : "pointer",
                  padding: 0,
                }}
              >
                Select all available
              </button>
            </div>

            {sortedPupils.length === 0 ? (
              <div
                style={{
                  background: "#FFFFFF",
                  borderRadius: 12,
                  padding: 16,
                  textAlign: "center",
                  color: "#536579",
                  fontSize: 13,
                }}
              >
                No active pupils found
              </div>
            ) : (
              <div style={{ background: "#FFFFFF", borderRadius: 12, overflow: "hidden" }}>
                {sortedPupils.map((p, idx) => {
                  const status = statusByPupil.get(p.id) ?? "no-preference";
                  const checked = selectedPupilIds.includes(p.id);
                  const badge =
                    status === "available"
                      ? { label: "Available", bg: "#EAF3DE", color: "#3B6D11" }
                      : status === "no-preference"
                        ? { label: "No preference", bg: "#F3F4F6", color: "#6B7280" }
                        : { label: "Unavailable", bg: "#F3F4F6", color: "#9CA3AF" };
                  const name = pupilDisplayName(p);
                  const travel = proximityLabel(proximityByPupil.get(p.id) ?? "unknown");
                  return (
                    <div
                      key={p.id}
                      onClick={() => togglePupil(p.id)}
                      role="button"
                      tabIndex={0}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        padding: "10px 12px",
                        borderTop: idx === 0 ? "none" : "0.5px solid #F4F6F8",
                        cursor: "pointer",
                        opacity: status === "unavailable" ? 0.6 : 1,
                      }}
                    >
                      <div
                        style={{
                          width: 34,
                          height: 34,
                          borderRadius: "50%",
                          background: p.calendar_colour || avatarColor(p.id),
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "#FFFFFF",
                          fontSize: 11,
                          fontWeight: 700,
                          flexShrink: 0,
                        }}
                      >
                        {initials(name)}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: 13,
                            fontWeight: 600,
                            color: NAVY,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {name}
                        </div>
                        <div style={{ fontSize: 11, color: "#536579" }}>
                          {p.phone || "No phone"}
                          {travel ? ` · ${travel}` : ""}
                        </div>
                      </div>
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 600,
                          background: badge.bg,
                          color: badge.color,
                          padding: "2px 6px",
                          borderRadius: 4,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {badge.label}
                      </span>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => togglePupil(p.id)}
                        onClick={(e) => e.stopPropagation()}
                        style={{ width: 18, height: 18, accentColor: "#2C97DE", flexShrink: 0 }}
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* Send bar */}
      {selectedGap && sortedPupils.length > 0 && (
        <div
          style={{
            position: "fixed",
            left: 0,
            right: 0,
            bottom: 0,
            background: "#FFFFFF",
            borderTop: "0.5px solid #E4E8EF",
            padding: "12px 16px",
            paddingBottom: "calc(env(safe-area-inset-bottom) + 12px)",
            zIndex: 20,
          }}
        >
          <button
            type="button"
            onClick={openSheet}
            disabled={selectedPupilIds.length === 0}
            style={{
              width: "100%",
              border: "none",
              borderRadius: 10,
              padding: "13px 0",
              background: selectedPupilIds.length === 0 ? "#C7D2DD" : NAVY,
              color: "#FFFFFF",
              fontSize: 13,
              fontWeight: 600,
              fontFamily: "inherit",
              cursor: selectedPupilIds.length === 0 ? "default" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
            }}
          >
            <IconSend size={15} />
            Send to {selectedPupilIds.length} pupil{selectedPupilIds.length === 1 ? "" : "s"}
          </button>
        </div>
      )}

      {/* Offer sheet */}
      {sheetOpen && selectedGap && (
        <div
          onClick={() => !sending && setSheetOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            zIndex: 200,
            display: "flex",
            alignItems: "flex-end",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#FFFFFF",
              borderRadius: "16px 16px 0 0",
              width: "100%",
              maxHeight: "85vh",
              overflowY: "auto",
              padding: 16,
              paddingBottom: "calc(env(safe-area-inset-bottom) + 16px)",
            }}
          >
            <div style={{ fontSize: 15, fontWeight: 700, color: NAVY, marginBottom: 10 }}>
              Offer this slot
            </div>

            <div style={{ background: "#F4F6F8", borderRadius: 10, padding: 12, marginBottom: 12 }}>
              <div
                style={{
                  fontSize: 12,
                  color: "#536579",
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  marginBottom: 2,
                }}
              >
                <IconCalendar size={12} />
                {fmtDateLong(selectedGap.date)}
              </div>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: NAVY,
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <IconClock size={12} />
                {minToHm(selectedGap.startMins)} – {minToHm(selectedGap.endMins)} ·{" "}
                {fmtDuration(selectedGap.durationMins)}
              </div>
            </div>

            <div style={{ fontSize: 12, fontWeight: 600, color: NAVY, marginBottom: 6 }}>
              Sending to {selectedPupilIds.length} pupil{selectedPupilIds.length === 1 ? "" : "s"}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
              {pupils
                .filter((p) => selectedPupilIds.includes(p.id))
                .map((p) => (
                  <span
                    key={p.id}
                    style={{
                      fontSize: 11,
                      background: "#F4F6F8",
                      color: "#536579",
                      borderRadius: 20,
                      padding: "4px 10px",
                    }}
                  >
                    {pupilDisplayName(p)}
                    {p.phone ? "" : " · no phone"}
                  </span>
                ))}
            </div>

            <div style={{ fontSize: 12, fontWeight: 600, color: NAVY, marginBottom: 6 }}>Message</div>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              style={{
                width: "100%",
                border: "0.5px solid #E4E8EF",
                borderRadius: 8,
                padding: "8px 10px",
                fontSize: 12,
                color: NAVY,
                background: "#F4F6F8",
                resize: "none",
                height: 96,
                fontFamily: "inherit",
                lineHeight: 1.4,
              }}
            />
            <div style={{ fontSize: 10, color: "#7A8A9A", marginTop: 4 }}>
              [first name] is replaced with each pupil's name.
            </div>

            <button
              onClick={() => void sendOffers()}
              disabled={sending}
              style={{
                width: "100%",
                marginTop: 12,
                background: sending ? "#9CA3AF" : NAVY,
                color: "#FFFFFF",
                border: "none",
                borderRadius: 8,
                padding: "12px 0",
                fontSize: 13,
                fontWeight: 600,
                fontFamily: "inherit",
                cursor: sending ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
              }}
            >
              {sending ? (
                "Sending..."
              ) : (
                <>
                  <IconSend size={14} /> Send offers
                </>
              )}
            </button>
            <button
              onClick={() => setSheetOpen(false)}
              disabled={sending}
              style={{
                width: "100%",
                marginTop: 6,
                background: "none",
                color: "#536579",
                border: "0.5px solid #E4E8EF",
                borderRadius: 8,
                padding: "10px 0",
                fontSize: 13,
                fontFamily: "inherit",
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

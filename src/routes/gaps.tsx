import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";
import { computeDayGaps } from "@/lib/gapDetection";
import { previewMatchForGap } from "@/lib/pupilMatching";
import { useMinGapMinutes } from "@/lib/gapPrefs";
import {
  IconArrowLeft,
  IconBolt,
  IconCalendar,
  IconClock,
  IconCurrencyPound,
  IconSend,
  IconUsers,
  IconInfoCircle,
  IconLoader2,
} from "@tabler/icons-react";
import { toast } from "@/lib/toast";

export const Route = createFileRoute("/gaps")({
  head: () => ({
    meta: [
      { title: "Fill My Slots — EDP" },
      {
        name: "description",
        content: "Find the right pupil for a free lesson slot in seconds.",
      },
      { property: "og:title", content: "Fill My Slots — EveryDriver" },
      { property: "og:description", content: "Find the right pupil for a free lesson slot in seconds." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: GapsPage,
});

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

const RANGE_DAYS = 7;
const MIN_GAP = 60;
const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function hmToMin(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

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

function initials(name: string): string {
  const parts = (name || "").trim().split(/\s+/);
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
};

type Pupil = {
  id: string;
  name: string | null;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  address: string | null;
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

type MatchResult = {
  pupil: Pupil;
  tier: "high" | "good" | "possible";
  reasons: string[];
};

function tierStyle(tier: MatchResult["tier"]) {
  switch (tier) {
    case "high":
      return { bg: "#EAF3DE", color: "#3B6D11" };
    case "good":
      return { bg: "#EAF5FC", color: "#185FA5" };
    default:
      return { bg: "#F3F4F6", color: "#6B7280" };
  }
}

function reasonsFor(pupil: Pupil, avail: Availability | undefined, durationMins: number): string[] {
  const reasons: string[] = [];
  if (avail?.available_days?.length) {
    reasons.push("Available this day");
  }
  if (avail?.preferred_duration_minutes === durationMins) {
    reasons.push("Preferred duration");
  }
  if (avail?.short_notice_opt_in) {
    reasons.push("Short notice OK");
  }
  if (reasons.length === 0) {
    reasons.push("Active pupil");
  }
  return reasons;
}

function GapsPage() {
  const navigate = useNavigate();
  const minGapMinutes = useMinGapMinutes();

  const [loading, setLoading] = useState(true);
  const [gaps, setGaps] = useState<Gap[]>([]);
  const [pupils, setPupils] = useState<Pupil[]>([]);
  const [availability, setAvailability] = useState<Availability[]>([]);
  const [unavailability, setUnavailability] = useState<Unavailability[]>([]);
  const [selectedGapIdx, setSelectedGapIdx] = useState(0);
  const [offerPupil, setOfferPupil] = useState<Pupil | null>(null);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [instructorName, setInstructorName] = useState("");
  const [hourlyRate, setHourlyRate] = useState<number | null>(null);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    void load();
  }, [minGapMinutes]);

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

      // Profile settings are optional: Schedule and Home both fall back to
      // defaults when the row (or a column) is unavailable, so Gap filler must
      // never fail the whole page because of them.
      const INSTRUCTOR_COLS =
        "name, working_hours_start, working_hours_end, working_days, per_day_hours, lesson_buffer_after, hourly_rate";
      const INSTRUCTOR_COLS_MIN = "name, working_hours_start, working_hours_end, working_days, lesson_buffer_after";
      type InstructorSettings = {
        name?: string | null;
        working_hours_start?: string | null;
        working_hours_end?: string | null;
        working_days?: string[] | null;
        per_day_hours?: Record<string, { active?: boolean; start?: string; end?: string }> | null;
        lesson_buffer_after?: number | null;
        hourly_rate?: number | null;
      };
      let instr: InstructorSettings = {};
      try {
        let row = await supabase.from("instructors").select(INSTRUCTOR_COLS).eq("id", uid).maybeSingle();
        if (row.error) {
          console.warn("[gaps] instructor settings retry:", row.error.message);
          row = await supabase.from("instructors").select(INSTRUCTOR_COLS_MIN).eq("id", uid).maybeSingle();
        }
        if (!row.data) {
          // Some accounts store the auth user under user_id rather than id.
          const byUserId = await supabase
            .from("instructors")
            .select(INSTRUCTOR_COLS_MIN)
            .eq("user_id", uid)
            .maybeSingle();
          if (byUserId.data) row = byUserId as typeof row;
        }
        if (row.data) instr = row.data as InstructorSettings;
        else console.warn("[gaps] no instructor settings row; using defaults");
      } catch (settingsError) {
        console.warn("[gaps] instructor settings unavailable:", settingsError);
      }

      setInstructorName(instr?.name ?? "");
      setHourlyRate(instr.hourly_rate == null ? null : Number(instr.hourly_rate));

      const workStart = String(instr?.working_hours_start ?? "09:00").slice(0, 5);
      const workEnd = String(instr?.working_hours_end ?? "18:00").slice(0, 5);
      const workingDays: string[] = instr?.working_days ?? ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
      const perDay = instr?.per_day_hours as Record<string, { active?: boolean; start?: string; end?: string }> | null;
      const bufferAfter = instr?.lesson_buffer_after ?? 0;

      const today = todayIso();
      const endDate = addDays(today, RANGE_DAYS - 1);

      const [lessonsResult, icsResult, recurringResult, timeOffResult, pupilsResult, unavailabilityResult] = await Promise.all([
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
            .in("source", ["ics_inbound", "external_calendar"])
            .gt("end_datetime", `${today}T00:00:00`)
            .lt("start_datetime", `${addDays(endDate, 1)}T00:00:00`),
          supabase.from("instructor_recurring_blocks").select("day_of_week, start_time, end_time, is_active").eq("instructor_id", uid),
          supabase
            .from("instructor_time_off")
            .select("start_date, end_date, start_time, end_time, all_day")
            .eq("instructor_id", uid)
            .gte("end_date", today)
            .lte("start_date", endDate),
          supabase
            .from("pupils")
            .select("id, name, first_name, last_name, phone, address, postcode, calendar_colour, buffer_after_minutes")
            .eq("instructor_id", uid)
            .is("deleted_at", null)
            .not("status", "in", "(inactive,archived,cancelled,deleted)"),
          supabase.from("pupil_unavailability").select("pupil_id, start_date, end_date").eq("instructor_id", uid),
        ]);

      // Lessons are essential; everything else degrades gracefully so one
      // unreadable table can never blank the whole page.
      if (lessonsResult.error) throw new Error(lessonsResult.error.message);

      const skipped: string[] = [];
      const optional = <T,>(
        label: string,
        result: { data: T[] | null; error: { message: string } | null },
      ): T[] => {
        if (result.error) {
          console.warn(`[gaps] skipped ${label}:`, result.error.message);
          skipped.push(label);
          return [];
        }
        return result.data ?? [];
      };

      const pupilData = optional<Pupil>("pupils", pupilsResult as never);
      const pupilIds = pupilData.map((pupil) => pupil.id);
      let availData: Availability[] = [];
      if (pupilIds.length > 0) {
        const availabilityResult = await supabase
          .from("pupil_availability")
          .select("pupil_id, available_days, available_from, available_until, min_notice_hours, short_notice_opt_in, preferred_duration_minutes")
          .in("pupil_id", pupilIds);
        availData = optional<Availability>("pupil_availability", availabilityResult as never);
      }

      const lessons = lessonsResult.data ?? [];
      const icsData = optional<{
        start_datetime: string;
        end_datetime: string;
        title?: string | null;
        is_all_day?: boolean | null;
        blocks_availability?: boolean | null;
      }>("calendar_blocks", icsResult as never);
      const recurringData = optional<{
        day_of_week: string;
        start_time: string;
        end_time: string;
        is_active?: boolean | null;
      }>("recurring_blocks", recurringResult as never);
      const timeOffData = optional<{
        start_date: string;
        end_date: string;
        start_time: string | null;
        end_time: string | null;
        all_day: boolean | null;
      }>("time_off", timeOffResult as never);
      const unavailData = optional<Unavailability>("pupil_unavailability", unavailabilityResult as never);

      console.info(
        `[gaps] loaded lessons=${lessons.length} calendar=${icsData.length} recurring=${recurringData.length} timeOff=${timeOffData.length} pupils=${pupilData.length} availability=${availData.length}` +
          (skipped.length ? ` | unavailable: ${skipped.join(", ")}` : ""),
      );

      setPupils(pupilData);
      setAvailability(availData);
      setUnavailability(unavailData);
      const pupilBuffers = new Map(pupilData.map((pupil) => [pupil.id, pupil.buffer_after_minutes]));

      const computed: Gap[] = [];

      for (let i = 0; i < RANGE_DAYS; i++) {
        const dateStr = addDays(today, i);
        const date = new Date(dateStr + "T12:00:00");
        const dayName = DAY_NAMES[date.getDay()];

        const dayCfg = perDay?.[dayName];
        const isActive = dayCfg ? dayCfg.active !== false : workingDays.includes(dayName);
        if (!isActive) continue;

        const dayStart = dayCfg?.start || workStart;
        const dayEnd = dayCfg?.end || workEnd;
        if (!dayEnd) continue;

        const fullDayOff = (timeOffData ?? []).some(
          (t) => t.all_day && t.start_date <= dateStr && t.end_date >= dateStr,
        );
        if (fullDayOff) continue;

        const dayLessons = (lessons ?? [])
          .filter((l) => l.lesson_date === dateStr)
          .map((l) => ({
            lesson_time: l.lesson_time || "",
            duration_minutes: l.duration_minutes ?? 60,
            status: l.status,
            bufferAfterMinutes: l.pupil_id ? pupilBuffers.get(l.pupil_id) ?? bufferAfter : bufferAfter,
          }));

        const dayIcsBlocks = (icsData ?? [])
          .filter((b) => {
            const sd = localDateStr(b.start_datetime);
            const ed = localDateStr(b.end_datetime);
            return sd === dateStr || (sd < dateStr && ed > dateStr) || (sd < dateStr && ed === dateStr);
          })
          .map((b) => ({
            start_datetime: b.start_datetime,
            end_datetime: b.end_datetime,
             is_all_day: b.is_all_day,
             blocks_availability: b.blocks_availability,
          }));

        const dayTimeOff = (timeOffData ?? [])
          .filter((t) => !t.all_day && t.start_date <= dateStr && t.end_date >= dateStr && t.start_time && t.end_time)
          .map((t) => ({
            start_time: t.start_time,
            end_time: t.end_time,
            all_day: false as boolean,
          }));

        const dayRecurring = (recurringData ?? [])
          .filter((b) => b.day_of_week === dayName && b.is_active !== false)
          .map((b) => ({
            day_of_week: b.day_of_week,
            start_time: b.start_time,
            end_time: b.end_time,
          }));

        const isToday = dateStr === today;

        const result = computeDayGaps({
          dayLessons,
          calendarBlocks: dayIcsBlocks,
          recurringBlocks: dayRecurring,
          dayTimeOff,
          dayStart,
          dayEnd,
          instructorBufferAfter: bufferAfter,
          dateStr,
          isToday,
          minGapMinutes: minGapMinutes ?? MIN_GAP,
        });

        for (const g of result) {
          computed.push({
            date: dateStr,
            startMins: g.startMins,
            endMins: g.endMins,
            durationMins: g.gapMins,
          });
        }
      }

      setGaps(computed);
      setSelectedGapIdx(0);
    } catch (error) {
      console.error("[gaps] Failed to load diary", error);
      setGaps([]);
      const detail = error instanceof Error ? error.message.trim() : String(error ?? "").trim();
      setLoadError(detail || "Your diary could not be loaded.");
    } finally {
      setLoading(false);
    }
  }

  const selectedGap = gaps[selectedGapIdx] ?? null;

  const matches: MatchResult[] = useMemo(() => {
    if (!selectedGap || !pupils.length) return [];
    const date = selectedGap.date;
    const dayName = DAY_NAMES[new Date(date + "T12:00:00").getDay()];

    const { allMatched } = previewMatchForGap({
      date,
      dayName,
      startMin: selectedGap.startMins,
      durationMin: selectedGap.durationMins,
      allPupils: pupils,
      allAvailability: availability,
      unavailability,
    });

    return allMatched
      .map((p) => {
        const avail = availability.find((a) => a.pupil_id === p.id);
        return {
          pupil: p,
          tier: "possible" as MatchResult["tier"],
          reasons: reasonsFor(p, avail, selectedGap.durationMins),
        };
      })
      .map((m, i, arr) => {
        const tier: MatchResult["tier"] = i < Math.ceil(arr.length / 3) ? "high" : i < Math.ceil((arr.length * 2) / 3) ? "good" : "possible";
        return { ...m, tier };
      })
      .slice(0, 6);
  }, [selectedGap, pupils, availability, unavailability]);

  function openOffer(pupil: Pupil) {
    const firstName = pupil.first_name || (pupil.name || "").split(" ")[0] || "there";
    const gap = selectedGap!;
    const timeStr = `${minToHm(gap.startMins)}–${minToHm(gap.endMins)}`;
    const isToday = gap.date === todayIso();
    const dateLabel = isToday ? "today" : fmtDateLong(gap.date);
    setMessage(
      `Hi ${firstName}, I have a lesson available ${dateLabel} ${timeStr}. Reply YES to book or NO to decline. — ${instructorName || "Your instructor"}`,
    );
    setOfferPupil(pupil);
  }

  async function sendOffer() {
    if (!offerPupil || !selectedGap) return;
    setSending(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      await supabase.from("gap_filler_offers").insert({
        instructor_id: user.id,
        pupil_id: offerPupil.id,
        slot_date: selectedGap.date,
        slot_time: minToHm(selectedGap.startMins),
        duration_minutes: selectedGap.durationMins,
        status: "pending",
        sent_via: "sms",
      });

      if (offerPupil.phone) {
        await supabase.from("sms_queue").insert({
          instructor_id: user.id,
          pupil_phone: offerPupil.phone,
          message,
        });

        const {
          data: { session },
        } = await supabase.auth.getSession();
        await fetch(`${SUPABASE_URL}/functions/v1/send-sms`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token}`,
            apikey: SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({}),
        });
        toast.success(`Offer sent to ${offerPupil.first_name || offerPupil.name}`);
      } else {
        toast.error("No phone number for this pupil");
      }

      setOfferPupil(null);
    } catch (err) {
      toast.error("Failed to send offer");
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "Poppins, sans-serif",
        }}
      >
        <IconLoader2 size={28} style={{ animation: "spin 1s linear infinite", color: "#1877D6" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#F4F6F8",
        fontFamily: "Poppins, sans-serif",
        paddingBottom: "calc(env(safe-area-inset-bottom) + 24px)",
      }}
    >
      {/* Header */}
      <div
        style={{
          background: "#fff",
          padding: "16px",
          paddingTop: "calc(env(safe-area-inset-top) + 16px)",
          borderBottom: "0.5px solid #E4E8EF",
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
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            border: "0.5px solid #E4E8EF",
            background: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
          }}
        >
          <IconArrowLeft size={20} color="#0B2341" />
        </button>
        <span style={{ fontSize: 18, fontWeight: 600, color: "#0B2341" }}>Gap filler</span>
      </div>

      <div style={{ padding: 16 }}>
        {/* Success banner */}
        {gaps.length > 0 ? (
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
                {gaps.length} gap{gaps.length !== 1 ? "s" : ""} available
              </div>
              <div style={{ fontSize: 11, color: "#5A7C3A", marginTop: 2 }}>
                Based on your diary and working hours
              </div>
            </div>
          </div>
        ) : (
          <div
            style={{
              background: "#F3F4F6",
              borderRadius: 12,
              padding: 14,
              color: "#536579",
              fontSize: 13,
              textAlign: "center",
              marginBottom: 16,
            }}
          >
            {loadError ? (
              <>
                <div>We couldn't load your diary. Please try again.</div>
                <div style={{ fontSize: 11, color: "#7A8A9A", marginTop: 6 }}>{loadError}</div>
              </>
            ) : (
              `No gaps found in the next ${RANGE_DAYS} days`
            )}
          </div>
        )}

        {loadError && (
          <button
            type="button"
            onClick={() => void load()}
            style={{ width: "100%", marginBottom: 16, border: "none", borderRadius: 8, padding: "11px 16px", background: "#1877D6", color: "#fff", fontFamily: "inherit", fontWeight: 600, cursor: "pointer" }}
          >
            Try again
          </button>
        )}

        {/* Slot pills */}
        {gaps.length > 1 && (
          <div
            style={{
              display: "flex",
              gap: 8,
              overflowX: "auto",
              paddingBottom: 12,
              marginBottom: 4,
              scrollbarWidth: "none",
            }}
          >
            {gaps.map((g, i) => {
              const isToday = g.date === todayIso();
              const label = isToday
                ? `Today ${minToHm(g.startMins)}`
                : `${new Date(g.date + "T12:00:00").toLocaleDateString("en-GB", { weekday: "short", day: "numeric" })} ${minToHm(g.startMins)}`;
              return (
                <button
                  key={i}
                  onClick={() => setSelectedGapIdx(i)}
                  style={{
                    padding: "5px 10px",
                    borderRadius: 20,
                    fontSize: 11,
                    whiteSpace: "nowrap",
                    cursor: "pointer",
                    border: "0.5px solid",
                    background: i === selectedGapIdx ? "#0B2341" : "#fff",
                    color: i === selectedGapIdx ? "#fff" : "#536579",
                    borderColor: i === selectedGapIdx ? "#0B2341" : "#E4E8EF",
                    fontWeight: 500,
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>
        )}

        {/* Selected gap card */}
        {selectedGap && (
          <>
            <div
              style={{
                background: "#fff",
                borderRadius: 12,
                padding: 16,
                boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
                marginBottom: 16,
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 600, color: "#0B2341", marginBottom: 4 }}>
                {fmtDateLong(selectedGap.date)}
              </div>
              <div style={{ fontSize: 22, fontWeight: 700, color: "#0B2341", marginBottom: 8 }}>
                {minToHm(selectedGap.startMins)} – {minToHm(selectedGap.endMins)}
              </div>
              <div style={{ fontSize: 12, color: "#536579", display: "flex", alignItems: "center", gap: 6 }}>
                <span>
                  {selectedGap.durationMins >= 60
                    ? `${Math.floor(selectedGap.durationMins / 60)}h${selectedGap.durationMins % 60 ? ` ${selectedGap.durationMins % 60}m` : ""} free`
                    : `${selectedGap.durationMins}m free`}
                </span>
                <span>·</span>
                {hourlyRate != null && hourlyRate > 0 && (
                  <span style={{ display: "flex", alignItems: "center", gap: 2 }}>
                    <IconCurrencyPound size={12} />
                    {Math.round((selectedGap.durationMins / 60) * hourlyRate)} potential
                  </span>
                )}
              </div>
            </div>

            {/* Suggested pupils */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 10,
              }}
            >
              <div style={{ fontSize: 14, fontWeight: 600, color: "#0B2341" }}>Suggested pupils</div>
              <div style={{ fontSize: 11, color: "#536579", display: "flex", alignItems: "center", gap: 4 }}>
                <IconUsers size={12} />
                All pupils ({pupils.length})
              </div>
            </div>

            {matches.length === 0 ? (
              <div
                style={{
                  background: "#fff",
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
              matches.map((m, i) => {
                const name = m.pupil.first_name || m.pupil.name || "";
                const col = avatarColor(m.pupil.id);
                const pill = tierStyle(m.tier);

                return (
                  <div
                    key={m.pupil.id + i}
                    style={{
                      background: "#fff",
                      borderRadius: 12,
                      padding: 12,
                      marginBottom: 10,
                      boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                      <div
                        style={{
                          width: 38,
                          height: 38,
                          borderRadius: "50%",
                          background: col,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "#fff",
                          fontSize: 12,
                          fontWeight: 700,
                          flexShrink: 0,
                        }}
                      >
                        {initials(name)}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "#0B2341", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {name}
                        </div>
                        <div
                          style={{
                            fontSize: 10,
                            fontWeight: 600,
                            background: pill.bg,
                            color: pill.color,
                            display: "inline-block",
                            padding: "2px 6px",
                            borderRadius: 4,
                            marginTop: 2,
                          }}
                        >
                          {m.tier === "high" ? "High match" : m.tier === "good" ? "Good match" : "Possible"}
                        </div>
                      </div>
                    </div>

                    <div style={{ fontSize: 11, color: "#536579", marginBottom: 10 }}>
                      {m.reasons.join(" · ")}
                    </div>

                    <button
                      onClick={() => openOffer(m.pupil)}
                      style={{
                        width: "100%",
                        background: "#0B2341",
                        color: "#fff",
                        border: "none",
                        borderRadius: 6,
                        padding: "7px 0",
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      Offer slot
                    </button>
                  </div>
                );
              })
            )}

            {/* Broadcast */}
            {matches.length > 0 && (
              <div
                onClick={() => {
                  const p = matches[0].pupil;
                  openOffer(p);
                }}
                style={{
                  background: "#EAF5FC",
                  borderRadius: 10,
                  padding: "10px 12px",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  cursor: "pointer",
                  marginTop: 6,
                }}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: "50%",
                    background: "#185FA5",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <IconSend size={14} color="#fff" />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#0B2341" }}>
                    Offer to all {matches.length} pupils
                  </div>
                  <div style={{ fontSize: 11, color: "#536579" }}>First to reply YES gets the slot</div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Offer sheet */}
      {offerPupil && (
        <div
          onClick={() => setOfferPupil(null)}
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
              background: "#fff",
              borderRadius: "16px 16px 0 0",
              width: "100%",
              padding: 16,
              paddingBottom: "calc(env(safe-area-inset-bottom) + 16px)",
            }}
          >
            {/* Pupil header */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <div
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: "50%",
                  background: avatarColor(offerPupil.id),
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#fff",
                  fontSize: 13,
                  fontWeight: 700,
                }}
              >
                {initials(offerPupil.first_name || offerPupil.name || "")}
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 600, color: "#0B2341" }}>
                  {offerPupil.first_name || offerPupil.name}
                </div>
                <div style={{ fontSize: 12, color: "#536579" }}>
                  {offerPupil.phone || "No phone number"}
                </div>
              </div>
            </div>

            {/* Lesson details */}
            {selectedGap && (
              <div
                style={{
                  background: "#F4F6F8",
                  borderRadius: 10,
                  padding: 12,
                  marginBottom: 14,
                }}
              >
                <div style={{ fontSize: 12, color: "#536579", display: "flex", alignItems: "center", gap: 4, marginBottom: 2 }}>
                  <IconCalendar size={12} />
                  {fmtDateLong(selectedGap.date)}
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#0B2341", display: "flex", alignItems: "center", gap: 4 }}>
                  <IconClock size={12} />
                  {minToHm(selectedGap.startMins)} – {minToHm(selectedGap.endMins)} ·{" "}
                  {selectedGap.durationMins >= 60
                    ? `${Math.floor(selectedGap.durationMins / 60)}h${selectedGap.durationMins % 60 ? ` ${selectedGap.durationMins % 60}m` : ""}`
                    : `${selectedGap.durationMins}m`}
                </div>
              </div>
            )}

            {/* Message */}
            <div style={{ fontSize: 12, fontWeight: 600, color: "#0B2341", marginBottom: 6 }}>Message to pupil</div>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              style={{
                width: "100%",
                border: "0.5px solid #E4E8EF",
                borderRadius: 8,
                padding: "8px 10px",
                fontSize: 12,
                color: "#0B2341",
                background: "#F4F6F8",
                resize: "none",
                height: 80,
                fontFamily: "inherit",
                lineHeight: 1.4,
              }}
            />

            {/* Buttons */}
            <button
              onClick={sendOffer}
              disabled={sending}
              style={{
                width: "100%",
                marginTop: 10,
                background: sending ? "#9CA3AF" : "#0B2341",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                padding: "12px 0",
                fontSize: 13,
                fontWeight: 600,
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
                  <IconSend size={14} /> Send offer + SMS
                </>
              )}
            </button>
            <button
              onClick={() => setOfferPupil(null)}
              style={{
                width: "100%",
                marginTop: 6,
                background: "none",
                color: "#536579",
                border: "0.5px solid #E4E8EF",
                borderRadius: 8,
                padding: "10px 0",
                fontSize: 13,
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

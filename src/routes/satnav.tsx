import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { X, Phone, MessageSquare, Navigation } from "lucide-react";
import { supabase } from "../lib/supabaseClient";

export const Route = createFileRoute("/satnav")({
  head: () => ({
    meta: [{ title: "Sat Nav — DSM by EveryDriver" }],
  }),
  component: SatNavPage,
});

const POPPINS = { fontFamily: "Inter, sans-serif" } as const;

interface NextLesson {
  id: string;
  lesson_date: string;
  lesson_time: string;
  duration_minutes: number | null;
  status: string;
  pupil_id: string;
  pupils: { name: string; phone: string | null } | null;
}

function formatTime(t: string) {
  return (t ?? "").slice(0, 5);
}

function formatDateLong(d: Date) {
  return d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
}

function ymd(d: Date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

function SatNavPage() {
  const navigate = useNavigate();
  const [lesson, setLesson] = useState<NextLesson | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data, error: authError } = await supabase.auth.getUser();
      if (authError) console.error("[satnav] auth.getUser error", authError);
      const u = data.user;
      if (!u) {
        console.warn("[satnav] no authenticated user");
        return;
      }
      setUserId(u.id);
    })();
  }, []);

  useEffect(() => {
    if (!userId) return;
    (async () => {
      const todayYmd = ymd(new Date());
      const { data, error } = await supabase
        .from("lessons")
        .select("id, lesson_date, lesson_time, duration_minutes, status, pupil_id, pupils(name, phone)")
        .eq("instructor_id", userId)
        .is("deleted_at", null)
        .neq("status", "cancelled")
        .neq("status", "completed")
        .gte("lesson_date", todayYmd)
        .order("lesson_date", { ascending: true })
        .order("lesson_time", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (error) console.error("[satnav] next lesson fetch error", error);
      setLesson((data ?? null) as unknown as NextLesson | null);
    })();
  }, [userId]);

  const pupilName = lesson?.pupils?.name ?? "Pupil";
  const pupilPhone = lesson?.pupils?.phone ?? null;
  const lessonTime = lesson ? `${formatDateLong(new Date(lesson.lesson_date))} · ${formatTime(lesson.lesson_time)}` : "No upcoming lesson";

  const mapsUrl = pupilPhone
    ? `https://maps.google.com/?q=${encodeURIComponent(pupilPhone)}`
    : "https://maps.google.com";

  return (
    <div className="h-screen flex flex-col" style={POPPINS}>
      {/* TOP BAR */}
      <div
        className="shrink-0 h-[52px] px-4 flex items-center justify-between relative z-50"
        style={{ backgroundColor: "#072b47" }}
      >
        <div className="w-10" />
        <span className="text-white text-[15px] font-semibold">Sat Nav</span>
        <button
          type="button"
          aria-label="Close"
          onClick={() => navigate({ to: "/home" })}
          className="w-10 flex items-center justify-end"
        >
          <X size={22} color="#ffffff" />
        </button>
      </div>

      {/* MAP AREA */}
      <div className="flex-1 relative overflow-hidden" style={{ backgroundColor: "#E8F0E8" }}>
        {/* Road grid pattern */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(#9CA3AF 1px, transparent 1px), linear-gradient(90deg, #9CA3AF 1px, transparent 1px)",
            backgroundSize: "60px 60px",
            opacity: 0.25,
          }}
        />
        {/* Additional road lines for depth */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(#6B7280 2px, transparent 2px), linear-gradient(90deg, #6B7280 2px, transparent 2px)",
            backgroundSize: "180px 180px",
            opacity: 0.15,
          }}
        />

        {/* Speed display */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <div
              className="text-[60px] font-bold leading-none"
              style={{
                color: "#ffffff",
                textShadow: "0 2px 8px rgba(0,0,0,0.4), 0 0 20px rgba(0,0,0,0.2)",
              }}
            >
              0
            </div>
            <div
              className="text-[14px] font-medium mt-1"
              style={{
                color: "#ffffff",
                textShadow: "0 1px 4px rgba(0,0,0,0.4)",
              }}
            >
              mph
            </div>
          </div>
        </div>
      </div>

      {/* BOTTOM OVERLAY CARD */}
      <div
        className="shrink-0 bg-white relative z-10"
        style={{
          borderRadius: "16px 16px 0 0",
          padding: 16,
          paddingBottom: 28,
          boxShadow: "0 -4px 20px rgba(0,0,0,0.08)",
        }}
      >
        {lesson ? (
          <>
            <div
              className="text-[10px] uppercase text-[#6B7280]"
              style={{ letterSpacing: "0.08em" }}
            >
              NEXT LESSON
            </div>
            <div className="text-[18px] font-semibold text-[#0B1F3A] mt-1">{pupilName}</div>
            <div className="text-[14px] text-[#6B7280] mt-0.5">
              {pupilPhone ?? "No phone number"}
            </div>
            <div className="text-[14px] font-bold text-[#0B1F3A] mt-1">{lessonTime}</div>

            <div className="flex mt-4" style={{ gap: 8 }}>
              <a
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-1 text-white text-[13px] font-medium"
                style={{ height: 40, borderRadius: 8, backgroundColor: "#16A34A" }}
              >
                <Navigation size={16} /> Navigate
              </a>
              <a
                href={pupilPhone ? `tel:${pupilPhone}` : "#"}
                className="flex-1 flex items-center justify-center gap-1 text-white text-[13px] font-medium"
                style={{ height: 40, borderRadius: 8, backgroundColor: "#1877D6" }}
              >
                <Phone size={16} /> Call
              </a>
              <a
                href={pupilPhone ? `sms:${pupilPhone}` : "#"}
                className="flex-1 flex items-center justify-center gap-1 text-[13px] font-medium"
                style={{
                  height: 40,
                  borderRadius: 8,
                  backgroundColor: "#F3F4F6",
                  color: "#1A1A2E",
                }}
              >
                <MessageSquare size={16} /> Text
              </a>
            </div>
          </>
        ) : (
          <div className="text-center py-6 text-[14px] text-[#6B7280]">
            No upcoming lessons found
          </div>
        )}
      </div>
    </div>
  );
}

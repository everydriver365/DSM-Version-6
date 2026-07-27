import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CalendarDays, MapPin, Clock, Bell } from "lucide-react";
import InstructorTopBar from "@/components/dsm/InstructorTopBar";
import { toast } from "sonner";
import { supabase } from "../lib/supabaseClient";
import { formatCountdown } from "@/lib/dateHelpers";
import { PageLayout } from "@/components/PageLayout";

export const Route = createFileRoute("/upcoming-tests")({
  head: () => ({
    meta: [
      { title: "Upcoming driving tests — DSM by EveryDriver" },
      { name: "description", content: "All upcoming driving tests for your pupils." },
      { property: "og:title", content: "Upcoming driving tests — DSM by EveryDriver" },
      { property: "og:description", content: "All upcoming driving tests for your pupils." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: UpcomingTestsPage,
});

const POPPINS = { fontFamily: "Inter, sans-serif" } as const;

interface PupilTestRow {
  id: string;
  name: string;
  test_date: string;
  test_time: string | null;
  test_centre: string | null;
}

function todayYmd() {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

function initials(name: string) {
  const parts = (name ?? "").trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const second = parts[1]?.[0] ?? "";
  return (first + second).toUpperCase() || "?";
}

function formatDateLong(ymd: string) {
  const d = new Date(`${ymd}T00:00:00`);
  return d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

function formatTime(t: string | null) {
  return (t ?? "").slice(0, 5);
}

function daysUntil(ymd: string) {
  const today = new Date(`${todayYmd()}T00:00:00`);
  const target = new Date(`${ymd}T00:00:00`);
  const diff = Math.round((target.getTime() - today.getTime()) / 86400000);
  return diff;
}

function UpcomingTestsPage() {
  const navigate = useNavigate();
  const [tests, setTests] = useState<PupilTestRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) {
        setLoading(false);
        return;
      }
      const { data, error } = await supabase
        .from("pupils")
        .select("id, name, first_name, test_date, test_time, test_centre")
        .eq("instructor_id", userId)
        .not("test_date", "is", null)
        .gte("test_date", todayYmd())
        .order("test_date", { ascending: true });
      if (error) {
        console.error("[upcoming-tests] fetch error", error);
        toast.error("Could not load upcoming tests");
      }
      setTests(
        ((data ?? []) as any[]).map((p) => ({
          id: p.id,
          name: p.name || p.first_name || "Pupil",
          test_date: p.test_date,
          test_time: p.test_time ?? null,
          test_centre: p.test_centre ?? null,
        })),
      );
      setLoading(false);
    })();
  }, []);

  return (
    <PageLayout className="pb-8" style={POPPINS}>
      {/* Header */}
      <InstructorTopBar
        firstName=""
        pageTitle="Upcoming tests"
        onBack={() => navigate({ to: "/home" } as never)}
        onBell={() => navigate({ to: "/notifications" as never })}
        onPhone={() => navigate({ to: "/enquiries" as never })}
        onLiveTrack={() => navigate({ to: "/live" as never })}
        onMenu={() => navigate({ to: "/more" as never })}
        onMicPress={() => toast.info("Voice commands coming soon!")}
      />
      <div style={{ height: "calc(60px + env(safe-area-inset-top, 0px))" }} />

      {/* Actions row */}
      <div className="flex justify-end px-4 pt-3">
        <button
          type="button"
          onClick={() => navigate({ to: "/tests" })}
          className="inline-flex items-center gap-2 text-[13px] font-semibold"
          style={{ height: 34, padding: "0 12px", borderRadius: 10, border: "1px solid #E2E8F0", background: "#FFFFFF", color: "#0B1F3A" }}
        >
          <Bell size={15} />
          Test reminders
        </button>
      </div>


      <div className="px-4 pt-4">
        {loading ? (
          <div className="py-8 text-center text-[13px]" style={{ color: "#6B7280", ...POPPINS }}>
            Loading upcoming tests…
          </div>
        ) : tests.length === 0 ? (
          <div
            className="py-8 text-center text-[13px]"
            style={{ color: "#6B7280", ...POPPINS }}
          >
            No upcoming tests. Add a test from the Driving tests page.
          </div>
        ) : (
          <div className="flex flex-col" style={{ gap: 10 }}>
            {tests.map((t) => (
              <TestRow key={t.id} test={t} />
            ))}
          </div>
        )}
      </div>
    </PageLayout>
  );
}

function TestRow({ test }: { test: PupilTestRow }) {
  const days = daysUntil(test.test_date);
  const daysLabel = days === 0 ? "Today" : days === 1 ? "Tomorrow" : `${days} days away`;

  return (
    <div
      style={{
        background: "#FFFFFF",
        borderRadius: 18,
        border: "1px solid #E2E8F0",
        boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
        padding: "16px 18px",
      }}
    >
      <div className="flex items-start" style={{ gap: 12 }}>
        <div
          className="flex items-center justify-center text-white text-[13px] font-semibold shrink-0"
          style={{ width: 42, height: 42, borderRadius: 999, backgroundColor: "#1877D6", ...POPPINS }}
        >
          {initials(test.name)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between" style={{ gap: 8 }}>
            <div className="text-[15px] font-semibold truncate" style={{ color: "#0B1F3A", ...POPPINS }}>
              {test.name}
            </div>
            <span
              className="text-[11px] font-semibold shrink-0"
              style={{
                color: days === 0 ? "#CC2229" : "#1877D6",
                backgroundColor: days === 0 ? "#FCE9E9" : "#E6F1FB",
                padding: "3px 10px",
                borderRadius: 999,
                ...POPPINS,
              }}
            >
              {daysLabel}
            </span>
          </div>

          <div className="text-[13px] font-bold mt-1" style={{ color: "#0B1F3A", ...POPPINS }}>
            {formatDateLong(test.test_date)}
          </div>

          <div className="flex flex-wrap items-center gap-2 mt-2 text-[12px]" style={{ color: "#6B7280", ...POPPINS }}>
            <span className="inline-flex items-center gap-1">
              <Clock size={12} strokeWidth={2} color="#6B7280" />
              {formatTime(test.test_time) || "Time TBC"}
            </span>
            <span style={{ color: "#E2E8F0" }}>·</span>
            <span className="inline-flex items-center gap-1">
              <MapPin size={12} strokeWidth={2} color="#6B7280" />
              {test.test_centre || "Centre TBC"}
            </span>
          </div>

          <div className="text-[11px] font-medium mt-2" style={{ color: "#1877D6", ...POPPINS }}>
            <CalendarDays size={12} strokeWidth={2} className="inline mr-1" color="#1877D6" />
            {formatCountdown(test.test_date, test.test_time) ?? "Overdue"}
          </div>
        </div>
      </div>
    </div>
  );
}

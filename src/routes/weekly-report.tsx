import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Users,
  Star,
  Download,
} from "lucide-react";
import { supabase } from "../lib/supabaseClient";

export const Route = createFileRoute("/weekly-report")({
  head: () => ({
    meta: [
      { title: "Weekly report — DSM by EveryDriver" },
      { name: "description", content: "Your week at a glance." },
    ],
  }),
  component: WeeklyReportPage,
  errorComponent: ({ error }) => (
    <div className="p-4 text-sm text-red-600">{error.message}</div>
  ),
  notFoundComponent: () => <div className="p-4 text-sm">Not found.</div>,
});

const POPPINS = { fontFamily: "Poppins, sans-serif" } as const;
const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
const MONTH_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function startOfWeek(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  const day = x.getDay(); // 0 Sun..6 Sat
  const diff = day === 0 ? -6 : 1 - day; // back to Monday
  x.setDate(x.getDate() + diff);
  return x;
}
function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
function ymd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}
function shortRange(start: Date, end: Date): string {
  const s = `${start.getDate()} ${MONTH_SHORT[start.getMonth()]}`;
  const e = `${end.getDate()} ${MONTH_SHORT[end.getMonth()]}`;
  return `${s}–${e}`;
}
function gbp(pence: number): string {
  return `£${(pence / 100).toFixed(2)}`;
}
function gbpFromPounds(n: number): string {
  return `£${n.toFixed(2)}`;
}

type Lesson = {
  id: string;
  lesson_date: string;
  duration_minutes: number | null;
  status: string | null;
  payment_status: string | null;
  amount_due: number | null;
  eol_completed: boolean | null;
  pupil_id: string | null;
};
type HistoryRow = {
  id: string;
  lesson_cost: number | null;
  payment_status: string | null;
  created_at: string;
  lesson_date: string | null;
  pupil_id: string | null;
};
type Pupil = {
  id: string;
  name: string | null;
  test_date: string | null;
  prepaid_hours: number | null;
  account_balance: number | null;
};

function WeeklyReportPage() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [weekStart, setWeekStart] = useState<Date>(() => startOfWeek(new Date()));
  const [loading, setLoading] = useState(true);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [pupils, setPupils] = useState<Record<string, Pupil>>({});
  const [pupilUsedHours, setPupilUsedHours] = useState<Record<string, number>>({});
  const [prevLessonCount, setPrevLessonCount] = useState(0);
  const [testsThisWeek, setTestsThisWeek] = useState(0);

  const weekEnd = useMemo(() => addDays(weekStart, 6), [weekStart]);
  const thisWeekStart = useMemo(() => startOfWeek(new Date()), []);
  const isCurrentWeek = ymd(weekStart) === ymd(thisWeekStart);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user) setUserId(data.user.id);
    })();
  }, []);

  useEffect(() => {
    if (!userId) return;
    void loadWeek();
     
  }, [userId, weekStart]);

  async function loadWeek() {
    if (!userId) return;
    setLoading(true);
    const startStr = ymd(weekStart);
    const endStr = ymd(weekEnd);
    const prevStart = ymd(addDays(weekStart, -7));
    const prevEnd = ymd(addDays(weekStart, -1));
    // ISO bounds for created_at
    const createdGte = `${startStr}T00:00:00.000Z`;
    const createdLte = `${endStr}T23:59:59.999Z`;

    const [lRes, hRes, prevRes, pRes] = await Promise.all([
      supabase
        .from("lessons")
        .select("id, lesson_date, duration_minutes, status, payment_status, amount_due, eol_completed, pupil_id")
        .eq("instructor_id", userId)
        .is("deleted_at", null)
        .gte("lesson_date", startStr)
        .lte("lesson_date", endStr),
      supabase
        .from("lesson_history")
        .select("id, lesson_cost, payment_status, created_at, lesson_date, pupil_id")
        .eq("instructor_id", userId)
        .gte("created_at", createdGte)
        .lte("created_at", createdLte),
      supabase
        .from("lessons")
        .select("id", { count: "exact", head: true })
        .eq("instructor_id", userId)
        .is("deleted_at", null)
        .in("status", ["confirmed", "completed"])
        .gte("lesson_date", prevStart)
        .lte("lesson_date", prevEnd),
      supabase
        .from("pupils")
        .select("id, name, test_date")
        .eq("instructor_id", userId),
    ]);

    const lRows = (lRes.data ?? []) as Lesson[];
    const hRows = (hRes.data ?? []) as HistoryRow[];
    const pupilMap: Record<string, Pupil> = {};
    (pRes.data ?? []).forEach((p: any) => {
      pupilMap[p.id] = { id: p.id, name: p.name ?? "Unknown", test_date: p.test_date ?? null };
    });

    setLessons(lRows);
    setHistory(hRows);
    setPupils(pupilMap);
    setPrevLessonCount(prevRes.count ?? 0);

    const testsCount = Object.values(pupilMap).filter((p) => {
      if (!p.test_date) return false;
      return p.test_date >= startStr && p.test_date <= endStr;
    }).length;
    setTestsThisWeek(testsCount);

    setLoading(false);
  }

  // Headline stats
  const taughtLessons = useMemo(
    () => lessons.filter((l) => l.status === "confirmed" || l.status === "completed"),
    [lessons],
  );
  const lessonsTaught = taughtLessons.length;
  const hoursTaught = useMemo(
    () => taughtLessons.reduce((acc, l) => acc + (l.duration_minutes ?? 0) / 60, 0),
    [taughtLessons],
  );
  const earningsPence = useMemo(
    () =>
      history
        .filter((h) => h.payment_status === "paid")
        .reduce((acc, h) => acc + (h.lesson_cost ?? 0), 0),
    [history],
  );
  const outstandingPounds = useMemo(
    () =>
      lessons
        .filter((l) => l.payment_status === "unpaid")
        .reduce((acc, l) => acc + (l.amount_due ?? 0), 0),
    [lessons],
  );

  // Per-day breakdown
  const dailyEarningsMap = useMemo(() => {
    return history
      .filter((h) => h.payment_status === "paid")
      .reduce<Record<string, number>>((acc, h) => {
        const dateKey = (h.lesson_date ?? h.created_at?.slice(0, 10)) || "";
        if (!dateKey) return acc;
        acc[dateKey] = (acc[dateKey] ?? 0) + Number(h.lesson_cost ?? 0);
        return acc;
      }, {});
  }, [history]);

  const dayRows = useMemo(() => {
    return DAY_LABELS.map((label, i) => {
      const date = addDays(weekStart, i);
      const dateStr = ymd(date);
      const dayLessons = taughtLessons.filter((l) => l.lesson_date === dateStr);
      const hours = dayLessons.reduce((a, l) => a + (l.duration_minutes ?? 0) / 60, 0);
      const dayEarningsPence = dailyEarningsMap[dateStr] ?? 0;
      return {
        key: dateStr,
        label,
        dayNum: date.getDate(),
        count: dayLessons.length,
        hours,
        earningsPence: dayEarningsPence,
      };
    });
  }, [taughtLessons, dailyEarningsMap, weekStart]);

  // Pupils this week
  const pupilRows = useMemo(() => {
    const byPupil: Record<string, { id: string; name: string; lessons: number; hours: number; allEol: boolean }> = {};
    taughtLessons.forEach((l) => {
      if (!l.pupil_id) return;
      const p = pupils[l.pupil_id];
      const name = p?.name ?? "Unknown";
      const row = byPupil[l.pupil_id] ?? { id: l.pupil_id, name, lessons: 0, hours: 0, allEol: true };
      row.lessons += 1;
      row.hours += (l.duration_minutes ?? 0) / 60;
      if (!l.eol_completed) row.allEol = false;
      byPupil[l.pupil_id] = row;
    });
    return Object.values(byPupil).sort((a, b) => b.lessons - a.lessons);
  }, [taughtLessons, pupils]);

  // Highlights
  const highlights = useMemo(() => {
    const out: string[] = [];
    const diff = lessonsTaught - prevLessonCount;
    if (diff > 0) out.push(`📈 ${diff} more lesson${diff === 1 ? "" : "s"} than last week`);
    if (lessonsTaught > 0 && taughtLessons.every((l) => l.eol_completed)) {
      out.push("✅ EOL completed for all lessons");
    }
    if (testsThisWeek > 0) out.push(`🎯 ${testsThisWeek} pupil${testsThisWeek === 1 ? "" : "s"} have tests this week`);
    if (earningsPence > 0) out.push(`💰 ${gbp(earningsPence)} earned this week`);
    if (outstandingPounds > 0) out.push(`⚠️ ${gbpFromPounds(outstandingPounds)} outstanding — consider chasing payments`);
    return out;
  }, [lessonsTaught, prevLessonCount, taughtLessons, testsThisWeek, earningsPence, outstandingPounds]);

  function gotoPrevWeek() {
    setWeekStart((w) => addDays(w, -7));
  }
  function gotoNextWeek() {
    if (isCurrentWeek) return;
    setWeekStart((w) => addDays(w, 7));
  }

  function exportCsv() {
    const rows: string[][] = [];
    rows.push(["Type", "Date", "Pupil", "Hours", "Status", "PaymentStatus", "AmountDuePounds", "EarningsPence"]);
    taughtLessons.forEach((l) => {
      const name = (l.pupil_id && pupils[l.pupil_id]?.name) || "";
      rows.push([
        "lesson",
        l.lesson_date,
        name,
        ((l.duration_minutes ?? 0) / 60).toFixed(2),
        l.status ?? "",
        l.payment_status ?? "",
        String(l.amount_due ?? 0),
        "",
      ]);
    });
    history.forEach((h) => {
      const name = (h.pupil_id && pupils[h.pupil_id]?.name) || "";
      rows.push([
        "payment",
        h.created_at.slice(0, 10),
        name,
        "",
        "",
        h.payment_status ?? "",
        "",
        String(h.lesson_cost ?? 0),
      ]);
    });
    const csv = rows
      .map((r) => r.map((c) => (/[",\n]/.test(c) ? `"${c.replace(/"/g, '""')}"` : c)).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `weekly-report-${ymd(weekStart)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  const maxDayHours = Math.max(8, ...dayRows.map((d) => d.hours));

  return (
    <div className="min-h-screen" style={{ background: "#FFFFFF" }}>
      {/* Top bar */}
      <div
        style={{
          background: "#0F2044",
          color: "#FFFFFF",
          padding: "12px 16px",
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <button
          type="button"
          onClick={() => navigate({ to: "/home" })}
          aria-label="Back"
          style={{ background: "transparent", border: "none", color: "#FFFFFF", padding: 4, cursor: "pointer" }}
        >
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1 text-center">
          <div className="text-[15px] font-semibold" style={POPPINS}>Weekly report</div>
          <div className="text-[11px] opacity-80" style={POPPINS}>{shortRange(weekStart, weekEnd)}</div>
        </div>
        <div style={{ width: 28 }} />
      </div>

      {/* Week navigation */}
      <div
        style={{
          background: "#FFFFFF",
          padding: "12px 16px",
          borderBottom: "0.5px solid #E2E6ED",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <button
          type="button"
          onClick={gotoPrevWeek}
          aria-label="Previous week"
          style={{ background: "transparent", border: "none", padding: 4, cursor: "pointer", color: "#0F2044" }}
        >
          <ChevronLeft size={22} />
        </button>
        <div className="text-[14px] font-medium" style={{ ...POPPINS, color: "#0F2044" }}>
          Week of {DAY_LABELS[0]} {weekStart.getDate()} {MONTH_SHORT[weekStart.getMonth()]}
        </div>
        <button
          type="button"
          onClick={gotoNextWeek}
          disabled={isCurrentWeek}
          aria-label="Next week"
          style={{
            background: "transparent",
            border: "none",
            padding: 4,
            cursor: isCurrentWeek ? "not-allowed" : "pointer",
            color: isCurrentWeek ? "#9CA3AF" : "#0F2044",
          }}
        >
          <ChevronRight size={22} />
        </button>
      </div>

      {/* Section 1 — Headline stats */}
      <div className="grid grid-cols-2 gap-3" style={{ padding: 16 }}>
        <StatTile label="Lessons taught" value={loading ? "…" : String(lessonsTaught)} />
        <StatTile label="Hours taught" value={loading ? "…" : `${hoursTaught.toFixed(1)}h`} />
        <StatTile label="Earnings" value={loading ? "…" : gbp(earningsPence)} />
        <StatTile
          label="Outstanding"
          value={loading ? "…" : gbpFromPounds(outstandingPounds)}
          valueColor={outstandingPounds > 0 ? "#DC2626" : "#0F2044"}
        />
      </div>

      {/* Section 2 — Day by day */}
      <div style={{ margin: "0 16px" }}>
        <CardBox>
          <SectionHead icon={<CalendarIcon size={16} color="#1A52A0" />} title="Day by day" />
          <div className="flex flex-col gap-2 mt-3">
            {dayRows.map((d) => {
              const pct = Math.min(100, (d.hours / maxDayHours) * 100);
              const hasLessons = d.count > 0;
              return (
                <div key={d.key} className="flex items-center gap-3">
                  <div
                    className="text-[12px] font-medium"
                    style={{ ...POPPINS, width: 56, color: hasLessons ? "#0F2044" : "#6B7280" }}
                  >
                    {d.label} {d.dayNum}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div
                      style={{
                        width: `${pct}%`,
                        height: 6,
                        borderRadius: 3,
                        background: hasLessons ? "#1A52A0" : "#E5E7EB",
                        minWidth: hasLessons ? 8 : 0,
                      }}
                    />
                  </div>
                  <div className="text-[12px]" style={{ ...POPPINS, color: "#6B7280", width: 56, textAlign: "right" }}>
                    {d.count} · {d.hours.toFixed(1)}h
                  </div>
                  <div
                    className="text-[12px] font-medium"
                    style={{
                      ...POPPINS,
                      width: 60,
                      textAlign: "right",
                      color: d.earningsPence > 0 ? "#15803D" : hasLessons ? "#B45309" : "#9CA3AF",
                    }}
                  >
                    {d.earningsPence > 0 ? gbp(d.earningsPence) : hasLessons ? "Unpaid" : ""}
                  </div>
                </div>
              );
            })}
          </div>
        </CardBox>
      </div>

      {/* Section 3 — Pupils this week */}
      <div style={{ margin: "12px 16px 0" }}>
        <CardBox>
          <SectionHead icon={<Users size={16} color="#1A52A0" />} title="Pupils this week" />
          {pupilRows.length === 0 ? (
            <div className="text-[13px] mt-3" style={{ ...POPPINS, color: "#6B7280" }}>
              No pupils taught this week.
            </div>
          ) : (
            <div className="flex flex-col mt-2">
              {pupilRows.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => navigate({ to: "/pupils/$id", params: { id: p.id } })}
                  className="flex items-center justify-between py-2 text-left"
                  style={{ borderTop: "0.5px solid #F1F3F7", background: "transparent", border: "none" }}
                >
                  <div className="min-w-0">
                    <div className="text-[14px] font-medium" style={{ ...POPPINS, color: "#0F2044" }}>
                      {p.name}
                    </div>
                    <div className="text-[12px]" style={{ ...POPPINS, color: "#6B7280" }}>
                      {p.lessons} lesson{p.lessons === 1 ? "" : "s"} · {p.hours.toFixed(1)}h
                    </div>
                  </div>
                  <span
                    className="text-[11px] font-semibold"
                    style={{
                      ...POPPINS,
                      padding: "4px 8px",
                      borderRadius: 999,
                      background: p.allEol ? "#DCFCE7" : "#FEF3C7",
                      color: p.allEol ? "#15803D" : "#B45309",
                    }}
                  >
                    {p.allEol ? "EOL ✓" : "EOL pending"}
                  </span>
                </button>
              ))}
            </div>
          )}
        </CardBox>
      </div>

      {/* Section 4 — Highlights */}
      <div style={{ margin: "12px 16px 0" }}>
        <CardBox>
          <SectionHead icon={<Star size={16} color="#1A52A0" />} title="Week highlights" />
          {highlights.length === 0 ? (
            <div className="text-[13px] mt-3" style={{ ...POPPINS, color: "#6B7280" }}>
              No highlights yet for this week.
            </div>
          ) : (
            <ul className="mt-2 flex flex-col gap-2">
              {highlights.map((h, i) => (
                <li key={i} className="text-[13px]" style={{ ...POPPINS, color: "#0F2044" }}>
                  {h}
                </li>
              ))}
            </ul>
          )}
        </CardBox>
      </div>

      {/* Section 5 — Export */}
      <div style={{ padding: 16 }}>
        <button
          type="button"
          onClick={exportCsv}
          className="w-full flex items-center justify-center gap-2"
          style={{
            ...POPPINS,
            padding: "12px",
            borderRadius: 10,
            border: "0.5px solid #1A52A0",
            color: "#1A52A0",
            background: "#FFFFFF",
            fontSize: 14,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          <Download size={16} />
          Export week CSV
        </button>
      </div>
    </div>
  );
}

function StatTile({
  label,
  value,
  valueColor = "#0F2044",
}: {
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <div
      style={{
        background: "#FFFFFF",
        border: "0.5px solid #E2E6ED",
        borderRadius: 12,
        padding: 14,
      }}
    >
      <div className="text-[11px] uppercase tracking-wide" style={{ ...POPPINS, color: "#6B7280" }}>
        {label}
      </div>
      <div className="text-[20px] font-semibold mt-1" style={{ ...POPPINS, color: valueColor }}>
        {value}
      </div>
    </div>
  );
}

function CardBox({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        background: "#FFFFFF",
        border: "0.5px solid #E2E6ED",
        borderRadius: 12,
        padding: 16,
      }}
    >
      {children}
    </div>
  );
}

function SectionHead({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2">
      {icon}
      <div className="text-[14px] font-semibold" style={{ ...POPPINS, color: "#0F2044" }}>
        {title}
      </div>
    </div>
  );
}

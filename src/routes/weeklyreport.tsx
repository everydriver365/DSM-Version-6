import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ChevronLeft, ChevronRight, Share2 } from "lucide-react";
import { SectionHeader } from "../components/dsm/SectionHeader";
import { Card } from "../components/dsm/Card";
import { Button } from "../components/dsm/Button";
import { supabase } from "../lib/supabaseClient";

export const Route = createFileRoute("/weeklyreport")({
  head: () => ({
    meta: [
      { title: "Weekly report — DSM" },
      { name: "description", content: "Weekly summary of lessons, earnings and expenses." },
    ],
  }),
  component: WeeklyReportPage,
});

const POPPINS = { fontFamily: "Inter, sans-serif" } as const;

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
function startOfWeek(d: Date) {
  const x = startOfDay(d);
  const day = (x.getDay() + 6) % 7; // Mon=0
  x.setDate(x.getDate() - day);
  return x;
}
function ymd(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function formatShort(d: Date) {
  return d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
}
function formatGBP(n: number) {
  return `£${n.toFixed(2)}`;
}

interface LessonRow {
  id: string;
  lesson_date: string;
  lesson_time: string;
  duration_minutes: number | null;
  status: string;
  pupil_id: string;
  pupils?: { name: string } | null;
}
interface PaymentRow {
  amount: number | null;
  paid_at: string;
  pupil_id: string | null;
  pupils?: { name: string } | null;
}

function WeeklyReportPage() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [weekOffset, setWeekOffset] = useState(0);
  const [lessons, setLessons] = useState<LessonRow[]>([]);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [expensesTotal, setExpensesTotal] = useState(0);
  const [notes, setNotes] = useState("");

  const weekStart = useMemo(() => addDays(startOfWeek(new Date()), weekOffset * 7), [weekOffset]);
  const weekEnd = useMemo(() => addDays(weekStart, 7), [weekStart]);
  const weekKey = useMemo(() => `weeklyreport:notes:${ymd(weekStart)}`, [weekStart]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      setUserId(data.user?.id ?? null);
    })();
  }, []);

  useEffect(() => {
    const stored = typeof window !== "undefined" ? window.localStorage.getItem(weekKey) : null;
    setNotes(stored ?? "");
  }, [weekKey]);

  useEffect(() => {
    if (!userId) return;
    (async () => {
      const startYmd = ymd(weekStart);
      const endYmd = ymd(addDays(weekStart, 6));

      const { data: lessonRows } = await supabase
        .from("lessons")
        .select("id, lesson_date, lesson_time, duration_minutes, status, pupil_id, pupils(name)")
        .eq("instructor_id", userId)
        .is("deleted_at", null)
        .gte("lesson_date", startYmd)
        .lte("lesson_date", endYmd);
      setLessons((lessonRows ?? []) as unknown as LessonRow[]);

      const { data: payRows } = await supabase
        .from("payments")
        .select("amount, paid_at, pupil_id, pupils(name)")
        .eq("instructor_id", userId)
        .is("deleted_at", null)
        .gte("paid_at", weekStart.toISOString())
        .lt("paid_at", weekEnd.toISOString());
      setPayments((payRows ?? []) as unknown as PaymentRow[]);

      const { data: expRows } = await supabase
        .from("expenses")
        .select("amount, expense_date")
        .eq("instructor_id", userId)
        .is("deleted_at", null)
        .gte("expense_date", startYmd)
        .lte("expense_date", endYmd);
      setExpensesTotal((expRows ?? []).reduce((s, e) => s + Number(e.amount ?? 0), 0));
    })();
  }, [userId, weekStart, weekEnd]);

  const completed = lessons.filter((l) => l.status === "completed");
  const cancelled = lessons.filter((l) => l.status === "cancelled");
  const noShow = lessons.filter((l) => l.status === "no_show" || l.status === "no-show");

  const totalLessons = completed.length;
  const totalHours = completed.reduce((s, l) => s + (l.duration_minutes ?? 0), 0) / 60;
  const totalEarned = payments.reduce((s, p) => s + Number(p.amount ?? 0), 0);

  // Top earners
  const byPupil = new Map<string, { name: string; count: number; amount: number }>();
  completed.forEach((l) => {
    const key = l.pupil_id;
    const cur = byPupil.get(key) ?? { name: l.pupils?.name ?? "Pupil", count: 0, amount: 0 };
    cur.count += 1;
    byPupil.set(key, cur);
  });
  payments.forEach((p) => {
    if (!p.pupil_id) return;
    const cur = byPupil.get(p.pupil_id) ?? { name: p.pupils?.name ?? "Pupil", count: 0, amount: 0 };
    cur.amount += Number(p.amount ?? 0);
    byPupil.set(p.pupil_id, cur);
  });
  const topEarners = [...byPupil.values()]
    .sort((a, b) => b.amount - a.amount || b.count - a.count)
    .slice(0, 3);

  // Daily breakdown
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(weekStart, i);
    const dStr = ymd(d);
    const dayLessons = completed.filter((l) => l.lesson_date === dStr);
    const dayPayments = payments.filter((p) => {
      const pd = new Date(p.paid_at);
      return ymd(pd) === dStr;
    });
    return {
      date: d,
      label: d.toLocaleDateString("en-GB", { weekday: "short" }),
      count: dayLessons.length,
      hours: dayLessons.reduce((s, l) => s + (l.duration_minutes ?? 0), 0) / 60,
      earned: dayPayments.reduce((s, p) => s + Number(p.amount ?? 0), 0),
    };
  });

  const saveNotes = (v: string) => {
    setNotes(v);
    if (typeof window !== "undefined") window.localStorage.setItem(weekKey, v);
  };

  const shareReport = async () => {
    const lines = [
      `Weekly report: ${formatShort(weekStart)} — ${formatShort(addDays(weekStart, 6))}`,
      `Lessons: ${totalLessons}`,
      `Hours: ${totalHours.toFixed(1)}`,
      `Earned: ${formatGBP(totalEarned)}`,
      `Expenses: ${formatGBP(expensesTotal)}`,
      "",
      `Completed: ${completed.length}  Cancelled: ${cancelled.length}  No-show: ${noShow.length}`,
    ];
    if (notes.trim()) lines.push("", `Notes: ${notes.trim()}`);
    const text = lines.join("\n");
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({ title: "Weekly report", text });
      } else if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(text);
        alert("Report copied to clipboard");
      }
    } catch {
      /* user cancelled */
    }
  };

  return (
    <div className="min-h-screen bg-white pb-12" style={POPPINS}>
      {/* TOP BAR */}
      <div
        className="sticky top-0 z-40 h-[52px] px-4 flex items-center justify-between"
        style={{ backgroundColor: "#072b47" }}
      >
        <button
          type="button"
          aria-label="Back"
          onClick={() => navigate({ to: "/home" })}
          className="flex items-center justify-center"
          style={{ width: 28, height: 28 }}
        >
          <ArrowLeft size={20} color="#ffffff" />
        </button>
        <div className="text-white text-[15px] font-semibold">Weekly report</div>
        <div style={{ width: 28 }} />
      </div>

      {/* WEEK SELECTOR */}
      <div className="px-4 mt-3 flex items-center justify-between">
        <button
          type="button"
          aria-label="Previous week"
          onClick={() => setWeekOffset((w) => w - 1)}
          className="flex items-center justify-center"
          style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: "#F3F4F6" }}
        >
          <ChevronLeft size={18} color="#0C2340" />
        </button>
        <div className="text-[14px] font-medium text-[#0C2340]">
          {formatShort(weekStart)} — {formatShort(addDays(weekStart, 6))}
        </div>
        <button
          type="button"
          aria-label="Next week"
          onClick={() => setWeekOffset((w) => w + 1)}
          className="flex items-center justify-center"
          style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: "#F3F4F6" }}
        >
          <ChevronRight size={18} color="#0C2340" />
        </button>
      </div>

      {/* SUMMARY CARD */}
      <div
        className="mx-4 mt-3"
        style={{ backgroundColor: "#0C2340", borderRadius: 12, padding: 16 }}
      >
        <div className="grid grid-cols-2 gap-3">
          <SummaryStat label="Lessons" value={String(totalLessons)} color="#ffffff" />
          <SummaryStat label="Hours" value={totalHours.toFixed(1)} color="#ffffff" />
          <SummaryStat label="Earned" value={formatGBP(totalEarned)} color="#F59E0B" />
          <SummaryStat label="Expenses" value={formatGBP(expensesTotal)} color="#CC2229" />
        </div>
      </div>

      <div className="px-4">
        <SectionHeader>LESSON BREAKDOWN</SectionHeader>
        <Card>
          <BreakdownRow label="Completed" count={completed.length} color="#16A34A" />
          <div style={{ height: 1, backgroundColor: "#EEF2F7", margin: "10px 0" }} />
          <BreakdownRow label="Cancelled" count={cancelled.length} color="#CC2229" />
          <div style={{ height: 1, backgroundColor: "#EEF2F7", margin: "10px 0" }} />
          <BreakdownRow label="No-show" count={noShow.length} color="#F59E0B" />
        </Card>

        <SectionHeader>TOP EARNERS THIS WEEK</SectionHeader>
        <Card>
          {topEarners.length === 0 ? (
            <div className="text-[13px] text-[#6B7280] text-center py-2">No earners yet</div>
          ) : (
            topEarners.map((p, i) => (
              <div key={i}>
                {i > 0 && (
                  <div style={{ height: 1, backgroundColor: "#EEF2F7", margin: "10px 0" }} />
                )}
                <div className="flex items-center" style={{ gap: 12 }}>
                  <div
                    className="flex items-center justify-center text-white text-[13px] font-semibold"
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 18,
                      backgroundColor: "#1A4A6E",
                    }}
                  >
                    {p.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <div className="text-[14px] font-medium text-[#0C2340]">{p.name}</div>
                    <div className="text-[12px] text-[#6B7280]">
                      {p.count} lesson{p.count === 1 ? "" : "s"}
                    </div>
                  </div>
                  <div className="text-[14px] font-semibold text-[#0C2340]">
                    {formatGBP(p.amount)}
                  </div>
                </div>
              </div>
            ))
          )}
        </Card>

        <SectionHeader>DAILY BREAKDOWN</SectionHeader>
        <Card>
          {days.map((d, i) => {
            const empty = d.count === 0;
            return (
              <div key={i}>
                {i > 0 && (
                  <div style={{ height: 1, backgroundColor: "#EEF2F7", margin: "8px 0" }} />
                )}
                <div
                  className="flex items-center justify-between"
                  style={{ opacity: empty ? 0.45 : 1 }}
                >
                  <div className="text-[14px] font-medium text-[#0C2340]" style={{ width: 56 }}>
                    {d.label}
                  </div>
                  <div className="text-[13px] text-[#6B7280] flex-1 text-center">
                    {d.count} · {d.hours.toFixed(1)}h
                  </div>
                  <div className="text-[14px] font-semibold text-[#0C2340]">
                    {formatGBP(d.earned)}
                  </div>
                </div>
              </div>
            );
          })}
        </Card>

        <SectionHeader>NOTES</SectionHeader>
        <textarea
          value={notes}
          onChange={(e) => saveNotes(e.target.value)}
          placeholder="Add notes for this week…"
          className="w-full text-[14px] text-[#0C2340]"
          style={{
            minHeight: 96,
            borderRadius: 12,
            padding: 12,
            backgroundColor: "#F8F9FB",
            borderWidth: "0.5px",
            borderStyle: "solid",
            borderColor: "#EEF2F7",
            fontFamily: "Inter, sans-serif",
            resize: "vertical",
          }}
        />

        <div className="mt-6">
          <Button variant="ghost" onClick={shareReport}>
            <Share2 size={16} style={{ marginRight: 8 }} />
            Share report
          </Button>
        </div>
      </div>
    </div>
  );
}

function SummaryStat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div>
      <div
        className="text-[10px] uppercase"
        style={{ color: "#9CA3AF", letterSpacing: "0.08em" }}
      >
        {label}
      </div>
      <div className="text-[22px] font-bold mt-1" style={{ color }}>
        {value}
      </div>
    </div>
  );
}

function BreakdownRow({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center" style={{ gap: 10 }}>
        <span className="rounded-full" style={{ width: 10, height: 10, backgroundColor: color }} />
        <span className="text-[14px] text-[#0C2340]">{label}</span>
      </div>
      <span className="text-[14px] font-semibold text-[#0C2340]">{count}</span>
    </div>
  );
}

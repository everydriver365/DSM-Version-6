import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft } from "lucide-react";
import { Card } from "../components/dsm/Card";
import { SectionHeader } from "../components/dsm/SectionHeader";
import { StatTile } from "../components/dsm/StatTile";
import { supabase } from "../lib/supabaseClient";

export const Route = createFileRoute("/reports")({
  head: () => ({
    meta: [
      { title: "Reports — DSM by EveryDriver" },
      { name: "description", content: "Insights into your lessons, earnings and pupils." },
    ],
  }),
  component: ReportsPage,
});

const POPPINS = { fontFamily: "Inter, sans-serif" } as const;

function formatGBP(n: number) {
  return `£${n.toFixed(2)}`;
}
function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function startOfWeek(d: Date) {
  const x = startOfDay(d);
  const day = (x.getDay() + 6) % 7;
  x.setDate(x.getDate() - day);
  return x;
}
function ymd(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

interface LessonRow {
  id: string;
  status: string;
  lesson_date: string;
  pupil_id: string;
  pupils?: { name: string } | null;
}
interface AmountRow {
  amount: number | string | null;
}
interface DatedAmount extends AmountRow {
  date: string;
}

function ReportsPage() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [lessons, setLessons] = useState<LessonRow[]>([]);
  const [payments, setPayments] = useState<DatedAmount[]>([]);
  const [expenses, setExpenses] = useState<DatedAmount[]>([]);

  const now = useMemo(() => new Date(), []);
  const weekStart = useMemo(() => startOfWeek(now), [now]);
  const weekStartYmd = useMemo(() => ymd(weekStart), [weekStart]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user) setUserId(data.user.id);
    })();
  }, []);

  useEffect(() => {
    if (!userId) return;
    (async () => {
      const [{ data: lessonRows }, { data: payRows }, { data: expRows }] = await Promise.all([
        supabase
          .from("lessons")
          .select("id, status, lesson_date, pupil_id, pupils(name)")
          .eq("instructor_id", userId)
          .is("deleted_at", null),
        supabase.from("payments").select("amount, paid_at").eq("instructor_id", userId).is("deleted_at", null),
        supabase.from("expenses").select("amount, expense_date").eq("instructor_id", userId).is("deleted_at", null),
      ]);
      setLessons((lessonRows ?? []) as unknown as LessonRow[]);
      setPayments(
        (payRows ?? []).map((p: { amount: number | string | null; paid_at: string }) => ({
          amount: p.amount,
          date: p.paid_at,
        })),
      );
      setExpenses(
        (expRows ?? []).map((e: { amount: number | string | null; expense_date: string }) => ({
          amount: e.amount,
          date: e.expense_date,
        })),
      );
    })();
  }, [userId]);

  const totalLessons = lessons.length;
  const totalEarned = payments.reduce((s, p) => s + Number(p.amount ?? 0), 0);
  const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount ?? 0), 0);
  const profit = totalEarned - totalExpenses;

  const lessonsThisWeek = lessons.filter((l) => l.lesson_date >= weekStartYmd).length;
  const earnedThisWeek = payments
    .filter((p) => new Date(p.date) >= weekStart)
    .reduce((s, p) => s + Number(p.amount ?? 0), 0);
  const expensesThisWeek = expenses
    .filter((e) => e.date >= weekStartYmd)
    .reduce((s, e) => s + Number(e.amount ?? 0), 0);
  const netThisWeek = earnedThisWeek - expensesThisWeek;

  const counts = useMemo(() => {
    const c = { confirmed: 0, completed: 0, cancelled: 0 };
    lessons.forEach((l) => {
      if (l.status === "confirmed") c.confirmed++;
      else if (l.status === "completed") c.completed++;
      else if (l.status === "cancelled") c.cancelled++;
    });
    return c;
  }, [lessons]);

  const topPupils = useMemo(() => {
    const map = new Map<string, { name: string; count: number }>();
    lessons.forEach((l) => {
      const name = l.pupils?.name ?? "Pupil";
      const cur = map.get(l.pupil_id) ?? { name, count: 0 };
      cur.count++;
      cur.name = name;
      map.set(l.pupil_id, cur);
    });
    return Array.from(map.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [lessons]);

  return (
    <div className="min-h-screen bg-white" style={POPPINS}>
      {/* TOP BAR */}
      <div
        className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] h-[52px] flex items-center px-3 z-50"
        style={{ background: "#072b47" }}
      >
        <button
          type="button"
          onClick={() => navigate({ to: "/home" })}
          className="p-1"
          aria-label="Back"
        >
          <ChevronLeft size={24} color="#FFFFFF" />
        </button>
        <div className="absolute left-1/2 -translate-x-1/2 text-white text-[16px] font-semibold">
          Reports
        </div>
      </div>

      <div className="pt-[52px] pb-8">
        {/* OVERVIEW */}
        <div className="mx-4">
          <SectionHeader>OVERVIEW</SectionHeader>
          <div className="grid grid-cols-2" style={{ gap: 8 }}>
            <StatTile value={totalLessons} label="Total lessons" />
            <StatTile value={formatGBP(totalEarned)} label="Total earned" />
            <StatTile value={formatGBP(totalExpenses)} label="Total expenses" />
            <StatTile value={formatGBP(profit)} label="Profit" />
          </div>
        </div>

        {/* THIS WEEK */}
        <div className="mx-4">
          <SectionHeader>THIS WEEK</SectionHeader>
          <div className="grid grid-cols-2" style={{ gap: 8 }}>
            <StatTile value={lessonsThisWeek} label="Lessons this week" />
            <StatTile value={formatGBP(earnedThisWeek)} label="Earned this week" />
            <StatTile value={formatGBP(expensesThisWeek)} label="Expenses this week" />
            <StatTile value={formatGBP(netThisWeek)} label="Net this week" />
          </div>
        </div>

        {/* LESSON BREAKDOWN */}
        <div className="mx-4">
          <SectionHeader>LESSON BREAKDOWN</SectionHeader>
          <Card>
            <BreakdownRow color="#16A34A" label="Confirmed" count={counts.confirmed} />
            <div className="h-px bg-[#EEF2F7] my-2" />
            <BreakdownRow color="#00A3B4" label="Completed" count={counts.completed} />
            <div className="h-px bg-[#EEF2F7] my-2" />
            <BreakdownRow color="#CC2229" label="Cancelled" count={counts.cancelled} />
          </Card>
        </div>

        {/* TOP PUPILS */}
        <div className="mx-4">
          <SectionHeader>TOP PUPILS</SectionHeader>
          <Card className="p-0">
            {topPupils.length === 0 && (
              <div className="p-4 text-[13px] text-[#6B7280]">No lessons yet.</div>
            )}
            {topPupils.map((p, idx) => (
              <div key={p.name + idx}>
                {idx > 0 && <div className="h-px bg-[#EEF2F7] mx-3" />}
                <div className="flex items-center px-3 py-3">
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-white text-[12px] font-semibold"
                    style={{ background: "#00A3B4" }}
                  >
                    {initials(p.name)}
                  </div>
                  <div className="flex-1 ml-3 text-[14px] text-[#0A2540]">{p.name}</div>
                  <div className="text-[14px] font-semibold text-[#0A2540]">{p.count}</div>
                </div>
              </div>
            ))}
          </Card>
        </div>
      </div>
    </div>
  );
}

function BreakdownRow({ color, label, count }: { color: string; label: string; count: number }) {
  return (
    <div className="flex items-center">
      <div className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
      <div className="flex-1 ml-3 text-[14px] text-[#0A2540]">{label}</div>
      <div className="text-[14px] font-semibold text-[#0A2540]">{count}</div>
    </div>
  );
}

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { SectionHeader } from "../components/dsm/SectionHeader";
import { StatTile } from "../components/dsm/StatTile";
import { supabase } from "../lib/supabaseClient";

export const Route = createFileRoute("/performance")({
  head: () => ({
    meta: [{ title: "Performance — DSM by EveryDriver" }],
  }),
  component: PerformancePage,
});

const POPPINS = { fontFamily: "Inter, sans-serif" } as const;

type Period = "week" | "month" | "year" | "all";
const TABS: { key: Period; label: string }[] = [
  { key: "week", label: "This week" },
  { key: "month", label: "This month" },
  { key: "year", label: "This year" },
  { key: "all", label: "All time" },
];

function ymd(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function rangeStart(period: Period): string | null {
  if (period === "all") return null;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  if (period === "week") {
    const day = (now.getDay() + 6) % 7;
    now.setDate(now.getDate() - day);
  } else if (period === "month") {
    now.setDate(1);
  } else if (period === "year") {
    now.setMonth(0, 1);
  }
  return ymd(now);
}

interface LessonRow { id: string; status: string; pupil_id: string; lesson_date: string }
interface PupilRow { id: string; status: string | null }
interface PaymentRow { amount: number; paid_at: string }
interface ExpenseRow { amount: number; expense_date: string }
interface TestRow { id: string; result: string | null; pupil_id: string; test_date: string }

function PerformancePage() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [period, setPeriod] = useState<Period>("month");

  const [lessons, setLessons] = useState<LessonRow[]>([]);
  const [pupils, setPupils] = useState<PupilRow[]>([]);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRow[]>([]);
  const [tests, setTests] = useState<TestRow[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user) setUserId(data.user.id);
    })();
  }, []);

  const start = useMemo(() => rangeStart(period), [period]);

  useEffect(() => {
    if (!userId) return;
    (async () => {
      let lessonsQ = supabase
        .from("lessons")
        .select("id, status, pupil_id, lesson_date")
        .eq("instructor_id", userId)
        .is("deleted_at", null);
      if (start) lessonsQ = lessonsQ.gte("lesson_date", start);

      let paymentsQ = supabase
        .from("payments")
        .select("amount, paid_at")
        .eq("instructor_id", userId)
        .is("deleted_at", null);
      if (start) paymentsQ = paymentsQ.gte("paid_at", start);

      let expensesQ = supabase
        .from("expenses")
        .select("amount, expense_date")
        .eq("instructor_id", userId)
        .is("deleted_at", null);
      if (start) expensesQ = expensesQ.gte("expense_date", start);

      let testsQ = supabase
        .from("driving_tests")
        .select("id, result, pupil_id, test_date")
        .eq("instructor_id", userId);
      if (start) testsQ = testsQ.gte("test_date", start);

      const pupilsQ = supabase
        .from("pupils")
        .select("id, status")
        .eq("instructor_id", userId)
        .is("deleted_at", null);

      const [lRes, pRes, payRes, expRes, tRes] = await Promise.all([
        lessonsQ,
        pupilsQ,
        paymentsQ,
        expensesQ,
        testsQ,
      ]);

      if (lRes.error) console.error("[perf] lessons error", lRes.error);
      if (pRes.error) console.error("[perf] pupils error", pRes.error);
      if (payRes.error) console.error("[perf] payments error", payRes.error);
      if (expRes.error) console.error("[perf] expenses error", expRes.error);
      if (tRes.error) console.error("[perf] tests error", tRes.error);

      setLessons((lRes.data ?? []) as LessonRow[]);
      setPupils((pRes.data ?? []) as PupilRow[]);
      setPayments((payRes.data ?? []) as PaymentRow[]);
      setExpenses((expRes.data ?? []) as ExpenseRow[]);
      setTests((tRes.data ?? []) as TestRow[]);
    })();
  }, [userId, start]);

  // ---- Calculations
  const passCount = tests.filter((t) => (t.result ?? "").toLowerCase() === "pass").length;
  const failCount = tests.filter((t) => (t.result ?? "").toLowerCase() === "fail").length;
  const pendingCount = tests.filter((t) => !t.result).length;
  const resolvedTests = passCount + failCount;
  const passRate = resolvedTests > 0 ? Math.round((passCount / resolvedTests) * 100) : 0;

  const passedPupilIds = new Set(
    tests.filter((t) => (t.result ?? "").toLowerCase() === "pass").map((t) => t.pupil_id),
  );
  const lessonsByPupil = new Map<string, number>();
  lessons.forEach((l) => {
    lessonsByPupil.set(l.pupil_id, (lessonsByPupil.get(l.pupil_id) ?? 0) + 1);
  });
  const avgLessonsToPass = passedPupilIds.size
    ? Math.round(
        [...passedPupilIds].reduce((s, id) => s + (lessonsByPupil.get(id) ?? 0), 0) /
          passedPupilIds.size,
      )
    : 0;

  const totalPupils = pupils.length;
  const activePupils = pupils.filter((p) => (p.status ?? "active") === "active").length;

  const totalLessons = lessons.length;
  const completedLessons = lessons.filter((l) => l.status === "completed").length;
  const cancelledLessons = lessons.filter((l) => l.status === "cancelled").length;
  const cancellationRate =
    totalLessons > 0 ? Math.round((cancelledLessons / totalLessons) * 100) : 0;
  const uniquePupilsInLessons = new Set(lessons.map((l) => l.pupil_id)).size;
  const avgLessonsPerPupil = uniquePupilsInLessons
    ? Math.round((totalLessons / uniquePupilsInLessons) * 10) / 10
    : 0;

  const totalEarned = payments.reduce((s, p) => s + Number(p.amount ?? 0), 0);
  const avgPerLesson = completedLessons > 0 ? totalEarned / completedLessons : 0;
  const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount ?? 0), 0);
  const netProfit = totalEarned - totalExpenses;

  const fmtMoney = (n: number) => `£${n.toFixed(0)}`;
  const testsTotal = passCount + failCount + pendingCount;

  return (
    <div className="min-h-screen bg-[#EEF2F7] pb-8" style={POPPINS}>
      <div
        className="sticky top-0 z-40 flex items-center justify-between px-2"
        style={{ height: 52, backgroundColor: "#0B1F3A" }}
      >
        <button
          type="button"
          aria-label="Back"
          onClick={() => navigate({ to: "/home" })}
          className="flex items-center justify-center"
          style={{ width: 40, height: 40 }}
        >
          <ArrowLeft size={22} color="#FFFFFF" />
        </button>
        <div className="flex-1 text-center text-[15px] font-semibold text-white">Performance</div>
        <div style={{ width: 40, height: 40 }} />
      </div>

      {/* Period tabs */}
      <div
        className="mx-4 mt-3 flex"
        style={{ backgroundColor: "#F3F4F6", borderRadius: 10, padding: 4, gap: 4 }}
      >
        {TABS.map((t) => {
          const active = period === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setPeriod(t.key)}
              className="flex-1 inline-flex items-center justify-center text-[12px] font-medium"
              style={{
                height: 32,
                borderRadius: 8,
                backgroundColor: active ? "#FFFFFF" : "transparent",
                color: active ? "#1877D6" : "#6B7280",
                boxShadow: active ? "0 1px 2px rgba(11,31,58,0.08)" : "none",
                ...POPPINS,
              }}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      <div className="px-4">
        <SectionHeader>OVERVIEW</SectionHeader>
        <div className="grid grid-cols-2" style={{ gap: 8 }}>
          <StatTile value={`${passRate}%`} label="Pass rate" />
          <StatTile value={avgLessonsToPass} label="Avg lessons to pass" />
          <StatTile value={totalPupils} label="Total pupils" />
          <StatTile value={activePupils} label="Active pupils" />
        </div>

        <SectionHeader>LESSON STATS</SectionHeader>
        <div className="grid grid-cols-2" style={{ gap: 8 }}>
          <StatTile value={totalLessons} label="Total lessons" />
          <StatTile value={completedLessons} label="Completed" />
          <StatTile value={`${cancellationRate}%`} label="Cancellation rate" />
          <StatTile value={avgLessonsPerPupil} label="Avg per pupil" />
        </div>

        <SectionHeader>EARNINGS</SectionHeader>
        <div className="grid grid-cols-2" style={{ gap: 8 }}>
          <StatTile value={fmtMoney(totalEarned)} label="Total earned" />
          <StatTile value={fmtMoney(avgPerLesson)} label="Avg per lesson" />
          <StatTile value={fmtMoney(totalExpenses)} label="Total expenses" />
          <StatTile value={fmtMoney(netProfit)} label="Net profit" />
        </div>

        <SectionHeader>TEST RESULTS</SectionHeader>
        <div
          className="rounded-xl p-4 flex flex-col"
          style={{
            backgroundColor: "#F8F9FB",
            border: "0.5px solid #EEF2F7",
            gap: 12,
          }}
        >
          <ResultBar label="Pass" count={passCount} total={testsTotal} color="#1877D6" />
          <ResultBar label="Fail" count={failCount} total={testsTotal} color="#1877D6" />
          <ResultBar label="Pending" count={pendingCount} total={testsTotal} color="#9CA3AF" />
          {testsTotal === 0 && (
            <div className="text-[13px] text-center" style={{ color: "#6B7280" }}>
              No tests in this period
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ResultBar({
  label,
  count,
  total,
  color,
}: {
  label: string;
  count: number;
  total: number;
  color: string;
}) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div>
      <div className="flex items-center justify-between">
        <span className="text-[13px] font-medium" style={{ color: "#0B1F3A" }}>{label}</span>
        <span className="text-[13px]" style={{ color: "#6B7280" }}>{count}</span>
      </div>
      <div
        className="mt-1 overflow-hidden"
        style={{ height: 8, borderRadius: 4, backgroundColor: "#EEF2F7" }}
      >
        <div style={{ width: `${pct}%`, height: "100%", backgroundColor: color }} />
      </div>
    </div>
  );
}

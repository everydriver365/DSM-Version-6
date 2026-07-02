import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import { SectionHeader } from "../components/dsm/SectionHeader";
import { Button } from "../components/dsm/Button";
import { supabase } from "../lib/supabaseClient";

export const Route = createFileRoute("/monthend")({
  head: () => ({
    meta: [
      { title: "Month end review — DSM by EveryDriver" },
      { name: "description", content: "Summary of lessons, earnings, expenses and mileage for the month." },
    ],
  }),
  component: MonthEndPage,
});

const POPPINS = { fontFamily: "Inter, sans-serif" } as const;
const MILEAGE_RATE = 0.45;
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

interface LessonRow {
  id: string;
  lesson_date: string;
  duration_minutes: number | null;
  status: string;
  pupil_id: string;
  pupils?: { name: string | null } | null;
}
interface PaymentRow {
  id: string;
  pupil_id: string;
  amount: number;
  paid_at: string;
  pupils?: { name: string | null } | null;
}
interface ExpenseRow {
  id: string;
  category: string | null;
  description: string | null;
  amount: number;
  expense_date: string;
}
interface MileageRow { miles: number; trip_date: string }
interface FuelRow { total_cost: number; fill_date: string }

function pad(n: number) { return String(n).padStart(2, "0"); }
function monthBounds(year: number, monthIdx: number) {
  const start = `${year}-${pad(monthIdx + 1)}-01`;
  const lastDay = new Date(year, monthIdx + 1, 0).getDate();
  const end = `${year}-${pad(monthIdx + 1)}-${pad(lastDay)}`;
  return { start, end };
}
function fmtGBP(n: number) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency", currency: "GBP", minimumFractionDigits: 2,
  }).format(n);
}
function fmtDate(d: string) {
  const dt = new Date(`${d}T00:00:00`);
  return dt.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}
function initials(name: string | null | undefined) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}
function csvEscape(v: string | number | null | undefined) {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function MonthEndPage() {
  const navigate = useNavigate();
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [monthIdx, setMonthIdx] = useState(today.getMonth());

  const [lessons, setLessons] = useState<LessonRow[]>([]);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRow[]>([]);
  const [mileage, setMileage] = useState<MileageRow[]>([]);
  const [fuel, setFuel] = useState<FuelRow[]>([]);
  const [loading, setLoading] = useState(true);

  const monthKey = `${year}-${pad(monthIdx + 1)}`;
  const [notes, setNotes] = useState("");

  useEffect(() => {
    const stored = typeof window !== "undefined"
      ? window.localStorage.getItem(`monthend:notes:${monthKey}`)
      : null;
    setNotes(stored ?? "");
  }, [monthKey]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(`monthend:notes:${monthKey}`, notes);
  }, [notes, monthKey]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      const { start, end } = monthBounds(year, monthIdx);

      const [lessonsRes, paymentsRes, expensesRes, mileageRes, fuelRes] = await Promise.all([
        supabase.from("lessons")
          .select("id, lesson_date, duration_minutes, status, pupil_id, pupils(name)")
          .eq("instructor_id", user.id)
          .is("deleted_at", null)
          .gte("lesson_date", start)
          .lte("lesson_date", end),
        supabase.from("payments")
          .select("id, pupil_id, amount, paid_at, pupils(name)")
          .eq("instructor_id", user.id)
          .gte("paid_at", start)
          .lte("paid_at", end)
          .order("paid_at", { ascending: false }),
        supabase.from("expenses")
          .select("id, category, description, amount, expense_date")
          .eq("instructor_id", user.id)
          .gte("expense_date", start)
          .lte("expense_date", end)
          .order("expense_date", { ascending: false }),
        supabase.from("mileage_logs")
          .select("miles, trip_date")
          .eq("instructor_id", user.id)
          .gte("trip_date", start)
          .lte("trip_date", end),
        supabase.from("fuel_log")
          .select("total_cost, fill_date")
          .eq("instructor_id", user.id)
          .gte("fill_date", start)
          .lte("fill_date", end),
      ]);

      if (cancelled) return;
      if (lessonsRes.error) console.error("[monthend] lessons", lessonsRes.error);
      if (paymentsRes.error) console.error("[monthend] payments", paymentsRes.error);
      if (expensesRes.error) console.error("[monthend] expenses", expensesRes.error);
      if (mileageRes.error) console.error("[monthend] mileage", mileageRes.error);
      if (fuelRes.error) console.error("[monthend] fuel", fuelRes.error);

      setLessons((lessonsRes.data ?? []) as unknown as LessonRow[]);
      setPayments((paymentsRes.data ?? []) as unknown as PaymentRow[]);
      setExpenses((expensesRes.data ?? []) as ExpenseRow[]);
      setMileage((mileageRes.data ?? []) as MileageRow[]);
      setFuel((fuelRes.data ?? []) as FuelRow[]);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [year, monthIdx]);

  const stats = useMemo(() => {
    const completed = lessons.filter((l) => l.status === "completed");
    const cancelled = lessons.filter((l) => l.status === "cancelled");
    const noShow = lessons.filter((l) => l.status === "no_show" || l.status === "no-show");
    const totalMinutes = completed.reduce((s, l) => s + (l.duration_minutes ?? 0), 0);
    const hours = totalMinutes / 60;
    const earned = payments.reduce((s, p) => s + Number(p.amount || 0), 0);
    const spent = expenses.reduce((s, e) => s + Number(e.amount || 0), 0);
    const miles = mileage.reduce((s, m) => s + Number(m.miles || 0), 0);
    const fuelCost = fuel.reduce((s, f) => s + Number(f.total_cost || 0), 0);
    const cancellationRate = lessons.length
      ? (cancelled.length / lessons.length) * 100
      : 0;
    const taxRelief = miles * MILEAGE_RATE;
    return {
      lessonsCount: lessons.length,
      completed: completed.length,
      cancelled: cancelled.length,
      noShow: noShow.length,
      hours,
      earned,
      spent,
      net: earned - spent,
      miles,
      fuelCost,
      cancellationRate,
      taxRelief,
    };
  }, [lessons, payments, expenses, mileage, fuel]);

  const topPupils = useMemo(() => {
    const counts = new Map<string, { name: string; lessons: number; paid: number }>();
    lessons.filter((l) => l.status === "completed").forEach((l) => {
      const k = l.pupil_id;
      const cur = counts.get(k) ?? { name: l.pupils?.name ?? "Pupil", lessons: 0, paid: 0 };
      cur.lessons += 1;
      counts.set(k, cur);
    });
    payments.forEach((p) => {
      const cur = counts.get(p.pupil_id) ?? { name: p.pupils?.name ?? "Pupil", lessons: 0, paid: 0 };
      cur.paid += Number(p.amount || 0);
      counts.set(p.pupil_id, cur);
    });
    return [...counts.values()].sort((a, b) => b.lessons - a.lessons).slice(0, 3);
  }, [lessons, payments]);

  function shiftMonth(delta: number) {
    let m = monthIdx + delta;
    let y = year;
    while (m < 0) { m += 12; y -= 1; }
    while (m > 11) { m -= 12; y += 1; }
    setMonthIdx(m);
    setYear(y);
  }

  function handleExport() {
    const lines: string[] = [];
    const label = `${MONTH_NAMES[monthIdx]} ${year}`;
    lines.push(`Month end review,${csvEscape(label)}`);
    lines.push("");
    lines.push("Summary");
    lines.push(`Lessons,${stats.lessonsCount}`);
    lines.push(`Completed,${stats.completed}`);
    lines.push(`Cancelled,${stats.cancelled}`);
    lines.push(`No-show,${stats.noShow}`);
    lines.push(`Cancellation rate,${stats.cancellationRate.toFixed(1)}%`);
    lines.push(`Hours,${stats.hours.toFixed(2)}`);
    lines.push(`Earned,${stats.earned.toFixed(2)}`);
    lines.push(`Expenses,${stats.spent.toFixed(2)}`);
    lines.push(`Net profit,${stats.net.toFixed(2)}`);
    lines.push(`Miles,${stats.miles.toFixed(2)}`);
    lines.push(`Tax relief @ £${MILEAGE_RATE.toFixed(2)},${stats.taxRelief.toFixed(2)}`);
    lines.push(`Fuel cost,${stats.fuelCost.toFixed(2)}`);
    lines.push("");
    lines.push("Payments");
    lines.push("Date,Pupil,Amount");
    payments.forEach((p) => {
      lines.push([csvEscape(p.paid_at), csvEscape(p.pupils?.name ?? ""), Number(p.amount).toFixed(2)].join(","));
    });
    lines.push("");
    lines.push("Expenses");
    lines.push("Date,Category,Description,Amount");
    expenses.forEach((e) => {
      lines.push([
        csvEscape(e.expense_date),
        csvEscape(e.category ?? ""),
        csvEscape(e.description ?? ""),
        Number(e.amount).toFixed(2),
      ].join(","));
    });
    lines.push("");
    lines.push("Notes");
    lines.push(csvEscape(notes));

    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `month-end-${monthKey}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  const monthLabel = `${MONTH_NAMES[monthIdx]} ${year}`;
  const monthLabelUpper = monthLabel.toUpperCase();

  return (
    <div className="min-h-screen bg-white pb-12" style={POPPINS}>
      {/* Top bar */}
      <div
        className="sticky top-0 z-40 flex items-center justify-between px-2"
        style={{ height: 52, backgroundColor: "#072b47" }}
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
        <div className="flex-1 text-center text-[15px] font-semibold text-white" style={POPPINS}>
          Month end review
        </div>
        <div className="flex items-center" style={{ width: 80, justifyContent: "flex-end" }}>
          <button
            type="button"
            aria-label="Previous month"
            onClick={() => shiftMonth(-1)}
            className="flex items-center justify-center"
            style={{ width: 32, height: 40 }}
          >
            <ChevronLeft size={20} color="#FFFFFF" />
          </button>
          <button
            type="button"
            aria-label="Next month"
            onClick={() => shiftMonth(1)}
            className="flex items-center justify-center"
            style={{ width: 32, height: 40 }}
          >
            <ChevronRight size={20} color="#FFFFFF" />
          </button>
        </div>
      </div>

      {/* Month selector */}
      <div className="flex items-center justify-between px-4 mt-3">
        <button
          type="button"
          aria-label="Previous month"
          onClick={() => shiftMonth(-1)}
          className="flex items-center justify-center"
          style={{ width: 36, height: 36, borderRadius: 8 }}
        >
          <ChevronLeft size={20} color="#0C2340" />
        </button>
        <div className="text-[16px] font-semibold text-[#0C2340]">{monthLabel}</div>
        <button
          type="button"
          aria-label="Next month"
          onClick={() => shiftMonth(1)}
          className="flex items-center justify-center"
          style={{ width: 36, height: 36, borderRadius: 8 }}
        >
          <ChevronRight size={20} color="#0C2340" />
        </button>
      </div>

      {/* Summary card */}
      <div
        className="mx-4 mt-3"
        style={{ backgroundColor: "#0C2340", borderRadius: 12, padding: 16 }}
      >
        <div
          className="text-[10px] uppercase"
          style={{ color: "#9CA3AF", letterSpacing: "0.08em" }}
        >
          {monthLabelUpper}
        </div>
        <div className="grid grid-cols-2 gap-3 mt-3">
          <SummaryStat label="Lessons" value={String(stats.lessonsCount)} color="#FFFFFF" />
          <SummaryStat label="Hours" value={stats.hours.toFixed(1)} color="#FFFFFF" />
          <SummaryStat label="Earned" value={fmtGBP(stats.earned)} color="#F59E0B" />
          <SummaryStat label="Expenses" value={fmtGBP(stats.spent)} color="#CC2229" />
        </div>
        <div
          className="mt-4 flex items-center justify-between"
          style={{ borderTop: "0.5px solid rgba(255,255,255,0.12)", paddingTop: 12 }}
        >
          <div
            className="text-[10px] uppercase"
            style={{ color: "#9CA3AF", letterSpacing: "0.08em" }}
          >
            Net profit
          </div>
          <div className="text-white font-bold" style={{ fontSize: 24 }}>
            {fmtGBP(stats.net)}
          </div>
        </div>
      </div>

      {loading && (
        <div className="px-4 mt-3 text-[13px] text-[#6B7280]">Loading…</div>
      )}

      <div className="px-4">
        {/* Lesson breakdown */}
        <SectionHeader>Lesson breakdown</SectionHeader>
        <PanelCard>
          <BreakdownRow dot="#16A34A" label="Completed" value={String(stats.completed)} />
          <BreakdownRow dot="#CC2229" label="Cancelled" value={String(stats.cancelled)} />
          <BreakdownRow dot="#F59E0B" label="No-show" value={String(stats.noShow)} />
          <BreakdownRow label="Cancellation rate" value={`${stats.cancellationRate.toFixed(1)}%`} />
        </PanelCard>

        {/* Earnings */}
        <SectionHeader>Earnings breakdown</SectionHeader>
        <PanelCard>
          {payments.length === 0 ? (
            <EmptyRow label="No payments this month" />
          ) : (
            <>
              {payments.map((p) => (
                <ListRow
                  key={p.id}
                  primary={p.pupils?.name ?? "Pupil"}
                  secondary={fmtDate(p.paid_at)}
                  right={fmtGBP(Number(p.amount))}
                />
              ))}
              <TotalRow label="Total" value={fmtGBP(stats.earned)} />
            </>
          )}
        </PanelCard>

        {/* Expenses */}
        <SectionHeader>Expenses breakdown</SectionHeader>
        <PanelCard>
          {expenses.length === 0 ? (
            <EmptyRow label="No expenses this month" />
          ) : (
            <>
              {expenses.map((e) => (
                <ListRow
                  key={e.id}
                  primary={e.category ?? "Other"}
                  secondary={e.description ?? fmtDate(e.expense_date)}
                  right={fmtGBP(Number(e.amount))}
                />
              ))}
              <TotalRow label="Total" value={fmtGBP(stats.spent)} />
            </>
          )}
        </PanelCard>

        {/* Mileage */}
        <SectionHeader>Mileage</SectionHeader>
        <PanelCard>
          <BreakdownRow label="Total miles" value={`${stats.miles.toFixed(1)} mi`} />
          <BreakdownRow label={`Tax relief @ £${MILEAGE_RATE.toFixed(2)}`} value={fmtGBP(stats.taxRelief)} />
          {fuel.length > 0 && (
            <BreakdownRow label="Fuel cost" value={fmtGBP(stats.fuelCost)} />
          )}
        </PanelCard>

        {/* Top pupils */}
        <SectionHeader>Top pupils this month</SectionHeader>
        <PanelCard>
          {topPupils.length === 0 ? (
            <EmptyRow label="No completed lessons" />
          ) : (
            topPupils.map((p, i) => (
              <div
                key={`${p.name}-${i}`}
                className="flex items-center"
                style={{ gap: 12, paddingTop: 10, paddingBottom: 10, borderTop: i === 0 ? "none" : "0.5px solid #EEF2F7" }}
              >
                <div
                  className="flex items-center justify-center text-white text-[12px] font-semibold"
                  style={{ width: 36, height: 36, borderRadius: 999, backgroundColor: "#1A4A6E" }}
                >
                  {initials(p.name)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="text-[14px] font-semibold text-[#0C2340] truncate">{p.name}</div>
                  <div className="text-[12px] text-[#6B7280]">{p.lessons} lesson{p.lessons === 1 ? "" : "s"}</div>
                </div>
                <div className="text-[14px] font-semibold text-[#0C2340]">{fmtGBP(p.paid)}</div>
              </div>
            ))
          )}
        </PanelCard>

        {/* Notes */}
        <SectionHeader>Notes</SectionHeader>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Reflections on the month, wins, things to improve…"
          rows={5}
          className="w-full rounded-xl px-3 py-2 text-[14px] text-[#1A1A2E] bg-white focus:border-[#1A4A6E] focus:outline-none"
          style={{
            fontFamily: "Inter, sans-serif",
            borderWidth: "0.5px",
            borderStyle: "solid",
            borderColor: "#EEF2F7",
          }}
        />

        <div className="mt-6">
          <Button variant="ghost" onClick={handleExport} type="button">
            Export CSV
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
      <div className="font-semibold mt-1" style={{ color, fontSize: 20 }}>
        {value}
      </div>
    </div>
  );
}

function PanelCard({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="bg-white"
      style={{
        borderRadius: 12,
        borderWidth: "0.5px",
        borderStyle: "solid",
        borderColor: "#EEF2F7",
        padding: 12,
      }}
    >
      {children}
    </div>
  );
}

function BreakdownRow({ dot, label, value }: { dot?: string; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between" style={{ paddingTop: 8, paddingBottom: 8 }}>
      <div className="flex items-center" style={{ gap: 8 }}>
        {dot && <span style={{ width: 8, height: 8, borderRadius: 999, backgroundColor: dot }} />}
        <span className="text-[14px] text-[#0C2340]">{label}</span>
      </div>
      <span className="text-[14px] font-semibold text-[#0C2340]">{value}</span>
    </div>
  );
}

function ListRow({ primary, secondary, right }: { primary: string; secondary: string; right: string }) {
  return (
    <div
      className="flex items-center justify-between"
      style={{ paddingTop: 10, paddingBottom: 10, borderTop: "0.5px solid #EEF2F7" }}
    >
      <div style={{ minWidth: 0 }}>
        <div className="text-[14px] font-semibold text-[#0C2340] truncate">{primary}</div>
        <div className="text-[12px] text-[#6B7280] truncate">{secondary}</div>
      </div>
      <div className="text-[14px] font-semibold text-[#0C2340]">{right}</div>
    </div>
  );
}

function TotalRow({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="flex items-center justify-between"
      style={{ paddingTop: 10, paddingBottom: 4, borderTop: "0.5px solid #EEF2F7", marginTop: 4 }}
    >
      <span className="text-[14px] font-bold text-[#0C2340]">{label}</span>
      <span className="text-[14px] font-bold text-[#0C2340]">{value}</span>
    </div>
  );
}

function EmptyRow({ label }: { label: string }) {
  return (
    <div className="text-[13px] text-[#9CA3AF]" style={{ paddingTop: 4, paddingBottom: 4 }}>
      {label}
    </div>
  );
}

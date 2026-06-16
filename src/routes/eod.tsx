import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Card } from "../components/dsm/Card";
import { SectionHeader } from "../components/dsm/SectionHeader";
import { Button } from "../components/dsm/Button";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { supabase } from "../lib/supabaseClient";

export const Route = createFileRoute("/eod")({
  head: () => ({
    meta: [
      { title: "End of day — DSM by EveryDriver" },
      { name: "description", content: "Wrap up your day: review lessons, payments and notes." },
    ],
  }),
  component: EodPage,
});

const POPPINS = { fontFamily: "Poppins, sans-serif" } as const;

interface Lesson {
  id: string;
  lesson_date: string;
  lesson_time: string;
  duration_minutes: number | null;
  status: string;
  pupils?: { name: string } | null;
}

interface Payment {
  id: string;
  amount: number;
  paid_at: string;
  method: string | null;
  pupils?: { name: string } | null;
}

function ymd(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function statusColor(s: string) {
  if (s === "confirmed") return "#16A34A";
  if (s === "completed") return "#1A52A0";
  if (s === "pending") return "#F59E0B";
  if (s === "cancelled") return "#CC2229";
  return "#6B7280";
}
function timeOnly(t: string) {
  return (t ?? "00:00:00").slice(0, 5);
}

function EodPage() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [tomorrowLessons, setTomorrowLessons] = useState<Lesson[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [expenses, setExpenses] = useState(0);
  const [notes, setNotes] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [dayComplete, setDayComplete] = useState(false);

  const today = useMemo(() => startOfDay(new Date()), []);
  const todayYmd = ymd(today);
  const notesKey = `dsm:eod_notes:${todayYmd}`;

  const dateLabel = `Today · ${today.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  })}`;

  useEffect(() => {
    setNotes(localStorage.getItem(notesKey) ?? "");
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user) setUserId(data.user.id);
    })();
  }, [notesKey]);

  useEffect(() => {
    if (!userId) return;
    (async () => {
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dayAfter = new Date(tomorrow);
      dayAfter.setDate(dayAfter.getDate() + 1);

      const { data: ls } = await supabase
        .from("lessons")
        .select("id, lesson_date, lesson_time, duration_minutes, status, pupils(name)")
        .eq("instructor_id", userId)
        .is("deleted_at", null)
        .eq("lesson_date", todayYmd)
        .order("lesson_time", { ascending: true });
      setLessons((ls ?? []) as unknown as Lesson[]);

      const { data: tls } = await supabase
        .from("lessons")
        .select("id, lesson_date, lesson_time, duration_minutes, status, pupils(name)")
        .eq("instructor_id", userId)
        .is("deleted_at", null)
        .eq("lesson_date", ymd(tomorrow))
        .order("lesson_time", { ascending: true });
      setTomorrowLessons((tls ?? []) as unknown as Lesson[]);

      const { data: pays } = await supabase
        .from("payments")
        .select("id, amount, paid_at, method, pupils(name)")
        .eq("instructor_id", userId)
        .is("deleted_at", null)
        .gte("paid_at", today.toISOString())
        .lt("paid_at", tomorrow.toISOString())
        .order("paid_at", { ascending: true });
      setPayments((pays ?? []) as unknown as Payment[]);

      const { data: exps } = await supabase
        .from("expenses")
        .select("amount, expense_date")
        .eq("instructor_id", userId)
        .is("deleted_at", null)
        .eq("expense_date", todayYmd);
      setExpenses((exps ?? []).reduce((s, e) => s + Number(e.amount ?? 0), 0));
    })();
  }, [userId, today, todayYmd]);

  const completedCount = lessons.filter((l) => l.status === "completed").length;
  const totalMinutes = lessons
    .filter((l) => l.status === "completed" || l.status === "confirmed")
    .reduce((s, l) => s + (l.duration_minutes ?? 0), 0);
  const totalHours = (totalMinutes / 60).toFixed(1);
  const earned = payments.reduce((s, p) => s + Number(p.amount ?? 0), 0);

  function saveNotes(v: string) {
    setNotes(v);
    localStorage.setItem(notesKey, v);
  }

  async function markComplete(id: string) {
    const { error } = await supabase.from("lessons").update({ status: "completed" }).eq("id", id);
    if (error) {
      console.error("[eod] mark complete error", error);
      return;
    }
    setLessons((prev) => prev.map((l) => (l.id === id ? { ...l, status: "completed" } : l)));
  }

  async function completeDay() {
    if (!userId) return;
    const ids = lessons.filter((l) => l.status === "confirmed").map((l) => l.id);
    if (ids.length > 0) {
      const { error } = await supabase
        .from("lessons")
        .update({ status: "completed" })
        .in("id", ids);
      if (error) {
        console.error("[eod] complete day error", error);
        return;
      }
      setLessons((prev) =>
        prev.map((l) => (ids.includes(l.id) ? { ...l, status: "completed" } : l)),
      );
    }
    setDayComplete(true);
  }

  return (
    <div className="min-h-screen bg-white pb-12" style={POPPINS}>
      <div
        className="sticky top-0 z-40 h-[52px] px-4 flex items-center justify-between"
        style={{ backgroundColor: "#0F2044" }}
      >
        <button
          type="button"
          aria-label="Back"
          onClick={() => navigate({ to: "/home" })}
          className="flex items-center justify-center"
          style={{ width: 40, height: 40 }}
        >
          <ArrowLeft size={22} color="#ffffff" />
        </button>
        <div className="text-white text-[15px] font-semibold">End of day</div>
        <div style={{ width: 40 }} />
      </div>

      <div
        className="text-[13px] text-center pt-3"
        style={{ color: "#6B7280" }}
      >
        {dateLabel}
      </div>

      {/* Summary card */}
      <div
        className="mx-4 mt-3"
        style={{ backgroundColor: "#0F2044", borderRadius: 12, padding: 16 }}
      >
        <div className="grid grid-cols-2" style={{ gap: 12 }}>
          <StatBox value={String(completedCount)} label="Lessons completed" />
          <StatBox value={totalHours} label="Hours taught" />
          <StatBox value={`£${earned.toFixed(0)}`} label="Earned today" color="#F59E0B" />
          <StatBox value={`£${expenses.toFixed(0)}`} label="Expenses today" color="#CC2229" />
        </div>
      </div>

      <div className="mx-4">
        <SectionHeader>LESSONS TODAY</SectionHeader>
        <div className="flex flex-col" style={{ gap: 8 }}>
          {lessons.length === 0 ? (
            <div className="text-[13px] text-[#6B7280] text-center py-6">
              No lessons today
            </div>
          ) : (
            lessons.map((l) => (
              <div
                key={l.id}
                className="bg-white"
                style={{
                  padding: 12,
                  borderRadius: 10,
                  borderWidth: "0.5px",
                  borderStyle: "solid",
                  borderColor: "#E2E6ED",
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center" style={{ gap: 12 }}>
                    <span className="text-[14px] font-bold text-[#0F2044]">
                      {timeOnly(l.lesson_time)}
                    </span>
                    <span className="text-[14px] text-[#0F2044]">
                      {l.pupils?.name ?? "Pupil"}
                    </span>
                  </div>
                  <span
                    className="text-[10px] uppercase font-medium"
                    style={{
                      color: statusColor(l.status),
                      letterSpacing: "0.05em",
                      padding: "3px 8px",
                      borderRadius: 999,
                      backgroundColor: `${statusColor(l.status)}14`,
                    }}
                  >
                    {l.status}
                  </span>
                </div>
                {l.status === "confirmed" && (
                  <div className="mt-2">
                    <Button variant="ghost" inline onClick={() => markComplete(l.id)}>
                      Mark complete
                    </Button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        <SectionHeader>PAYMENTS TODAY</SectionHeader>
        <div className="flex flex-col" style={{ gap: 8 }}>
          {payments.length === 0 ? (
            <div className="text-[13px] text-[#6B7280] text-center py-6">
              No payments today
            </div>
          ) : (
            payments.map((p) => (
              <div
                key={p.id}
                className="bg-white flex items-center justify-between"
                style={{
                  padding: 12,
                  borderRadius: 10,
                  borderWidth: "0.5px",
                  borderStyle: "solid",
                  borderColor: "#E2E6ED",
                }}
              >
                <div>
                  <div className="text-[14px] text-[#0F2044]">
                    {p.pupils?.name ?? "Pupil"}
                  </div>
                  <div className="text-[12px] text-[#6B7280]">
                    {p.method ?? "Payment"} ·{" "}
                    {new Date(p.paid_at).toLocaleTimeString("en-GB", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>
                <span className="text-[14px] font-semibold" style={{ color: "#F59E0B" }}>
                  £{Number(p.amount ?? 0).toFixed(2)}
                </span>
              </div>
            ))
          )}
        </div>

        <SectionHeader>NOTES</SectionHeader>
        <textarea
          rows={4}
          value={notes}
          onChange={(e) => saveNotes(e.target.value)}
          placeholder="How did the day go?"
          className="w-full rounded-lg p-3 text-[14px] text-[#1A1A2E] bg-white focus:border-[#1A52A0] focus:outline-none resize-none"
          style={{
            fontFamily: "Poppins, sans-serif",
            borderWidth: "0.5px",
            borderStyle: "solid",
            borderColor: "#E2E6ED",
          }}
        />

        <SectionHeader>TOMORROW</SectionHeader>
        <div className="flex flex-col" style={{ gap: 8 }}>
          {tomorrowLessons.length === 0 ? (
            <div className="text-[13px] text-[#6B7280] text-center py-6">
              No lessons scheduled
            </div>
          ) : (
            tomorrowLessons.map((l) => (
              <div
                key={l.id}
                className="bg-white flex items-center justify-between"
                style={{
                  padding: 12,
                  borderRadius: 10,
                  borderWidth: "0.5px",
                  borderStyle: "solid",
                  borderColor: "#E2E6ED",
                }}
              >
                <div className="flex items-center" style={{ gap: 12 }}>
                  <span className="text-[14px] font-bold text-[#0F2044]">
                    {timeOnly(l.lesson_time)}
                  </span>
                  <span className="text-[14px] text-[#0F2044]">
                    {l.pupils?.name ?? "Pupil"}
                  </span>
                </div>
                <span className="text-[12px] text-[#6B7280]">
                  {l.duration_minutes ?? 60} min
                </span>
              </div>
            ))
          )}
        </div>

        {dayComplete ? (
          <Card
            className="mt-6"
            style={{ backgroundColor: "#ECFDF5", borderColor: "#A7F3D0" }}
          >
            <div
              className="text-[15px] font-semibold text-center"
              style={{ color: "#065F46" }}
            >
              Day complete! See you tomorrow.
            </div>
          </Card>
        ) : (
          <div className="mt-6">
            <Button onClick={() => setConfirmOpen(true)}>Complete day</Button>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="Complete day?"
        message="This will mark all confirmed lessons as completed."
        confirmLabel="Complete day"
        cancelLabel="Cancel"
        onConfirm={() => {
          setConfirmOpen(false);
          completeDay();
        }}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}

function StatBox({
  value,
  label,
  color = "#ffffff",
}: {
  value: string;
  label: string;
  color?: string;
}) {
  return (
    <div>
      <div className="text-[20px] font-bold" style={{ color }}>
        {value}
      </div>
      <div
        className="text-[11px] mt-0.5"
        style={{ color: "#9CA3AF", letterSpacing: "0.04em" }}
      >
        {label}
      </div>
    </div>
  );
}

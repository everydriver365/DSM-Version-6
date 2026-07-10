import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, GraduationCap } from "lucide-react";
import { toast } from "sonner";
import { Card } from "../components/dsm/Card";
import { SectionHeader } from "../components/dsm/SectionHeader";
import { Input } from "../components/dsm/Input";
import { Button } from "../components/dsm/Button";
import { supabase } from "../lib/supabaseClient";
import { PageLayout } from "@/components/PageLayout";

export const Route = createFileRoute("/testday")({
  head: () => ({
    meta: [
      { title: "Test day — DSM by EveryDriver" },
      { name: "description", content: "Manage your next pupil's driving test day." },
    ],
  }),
  component: TestDayPage,
});

const POPPINS = { fontFamily: "Inter, sans-serif" } as const;

const CHECKLIST_ITEMS = [
  "Theory pass certificate checked",
  "Provisional licence checked",
  "Glasses/contacts if needed",
  "Insurance documents in car",
  "Sat nav removed from windscreen",
  "L plates displayed",
  "Vehicle taxed and insured",
  "MOT valid",
  "Pupil knows test route area",
  "Emergency stop practised",
  "Manoeuvres practised",
];

interface DrivingTest {
  id: string;
  pupil_id: string;
  test_date: string;
  test_time: string | null;
  test_centre: string | null;
  result: string | null;
  faults: number | null;
  result_notes: string | null;
  pupils: { id: string; name: string } | null;
}

interface LessonRow {
  id: string;
  lesson_date: string;
  duration_minutes: number | null;
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

function formatDateLong(ymd: string) {
  const d = new Date(`${ymd}T00:00:00`);
  return d.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function daysUntil(ymd: string) {
  const today = new Date(`${todayYmd()}T00:00:00`);
  const target = new Date(`${ymd}T00:00:00`);
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

function fmtTime(t: string | null) {
  return (t ?? "").slice(0, 5);
}

function TestDayPage() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [test, setTest] = useState<DrivingTest | null>(null);
  const [lesson, setLesson] = useState<LessonRow | null>(null);

  const [checks, setChecks] = useState<Record<string, boolean>>({});
  const [focusNotes, setFocusNotes] = useState("");
  const [result, setResult] = useState<"Pass" | "Fail" | null>(null);
  const [faults, setFaults] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user) setUserId(data.user.id);
    })();
  }, []);

  useEffect(() => {
    if (!userId) return;
    (async () => {
      setLoading(true);
      const today = todayYmd();
      const { data, error } = await supabase
        .from("driving_tests")
        .select(
          "id, pupil_id, test_date, test_time, test_centre, result, faults, result_notes, pupils(id, name)",
        )
        .eq("instructor_id", userId)
        .gte("test_date", today)
        .order("test_date", { ascending: true })
        .limit(1);
      if (error) console.error("[testday] fetch", error);
      const t = ((data ?? [])[0] ?? null) as unknown as DrivingTest | null;
      setTest(t);

      if (t) {
        setResult((t.result as "Pass" | "Fail" | null) ?? null);
        setFaults(t.faults != null ? String(t.faults) : "");
        setNotes(t.result_notes ?? "");

        // Lesson same day for this pupil
        const { data: lessons } = await supabase
          .from("lessons")
          .select("id, lesson_date, duration_minutes")
          .eq("instructor_id", userId)
          .eq("pupil_id", t.pupil_id)
          .gte("lesson_date", `${t.test_date}T00:00:00`)
          .lt("lesson_date", `${t.test_date}T23:59:59`)
          .order("lesson_date", { ascending: true })
          .limit(1);
        setLesson(((lessons ?? [])[0] ?? null) as LessonRow | null);
      }
      setLoading(false);
    })();
  }, [userId]);

  // localStorage by test id
  const storageKey = useMemo(
    () => (test ? `testday:${test.id}` : null),
    [test],
  );
  useEffect(() => {
    if (!storageKey) return;
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw) as {
          checks?: Record<string, boolean>;
          focusNotes?: string;
        };
        setChecks(parsed.checks ?? {});
        setFocusNotes(parsed.focusNotes ?? "");
      } else {
        setChecks({});
        setFocusNotes("");
      }
    } catch {
      /* ignore */
    }
  }, [storageKey]);

  function persist(nextChecks: Record<string, boolean>, nextFocus: string) {
    if (!storageKey) return;
    try {
      localStorage.setItem(
        storageKey,
        JSON.stringify({ checks: nextChecks, focusNotes: nextFocus }),
      );
    } catch {
      /* ignore */
    }
  }

  function toggleCheck(item: string) {
    const next = { ...checks, [item]: !checks[item] };
    setChecks(next);
    persist(next, focusNotes);
  }

  function updateFocus(v: string) {
    setFocusNotes(v);
    persist(checks, v);
  }

  async function saveResult() {
    if (!test) return;
    if (!result) {
      toast.error("Select Pass or Fail");
      return;
    }
    setSaving(true);
    const faultsNum = faults.trim() === "" ? null : Number(faults);
    const { error } = await supabase
      .from("driving_tests")
      .update({
        result,
        faults: faultsNum,
        result_notes: notes || null,
        result_logged_at: new Date().toISOString(),
      })
      .eq("id", test.id);
    setSaving(false);
    if (error) {
      toast.error("Failed to save result");
      console.error(error);
      return;
    }
    toast.success("Result saved");
    setTest({ ...test, result, faults: faultsNum, result_notes: notes || null });
  }

  return (
    <PageLayout className="pb-12" style={POPPINS}>
      {/* Top bar */}
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
        <div className="flex-1 text-center text-[15px] font-semibold text-white" style={POPPINS}>
          Test day
        </div>
        <div style={{ width: 40 }} />
      </div>

      {loading ? (
        <div className="px-4 mt-6 text-[13px]" style={{ color: "#6B7280" }}>
          Loading…
        </div>
      ) : !test ? (
        <div
          className="flex flex-col items-center justify-center text-center px-6"
          style={{ marginTop: 80, gap: 12 }}
        >
          <GraduationCap size={40} color="#6B7280" />
          <div className="text-[15px] font-semibold" style={{ color: "#0B1F3A" }}>
            No upcoming tests
          </div>
          <div className="w-full max-w-[240px]">
            <Button onClick={() => navigate({ to: "/tests" })}>Add test</Button>
          </div>
        </div>
      ) : (
        <>
          {/* Countdown card */}
          <div
            className="mx-4 mt-3"
            style={{
              backgroundColor: "#0B1F3A",
              borderRadius: 12,
              padding: 16,
              color: "#FFFFFF",
            }}
          >
            <div
              className="text-[10px] uppercase"
              style={{ color: "#9CA3AF", letterSpacing: "0.06em" }}
            >
              Next test
            </div>
            <div className="text-[22px] font-bold leading-tight mt-1">
              {test.pupils?.name ?? "Unknown pupil"}
            </div>
            <div className="text-[18px] font-bold mt-1">
              {formatDateLong(test.test_date)}
              {fmtTime(test.test_time) ? ` · ${fmtTime(test.test_time)}` : ""}
            </div>
            <div className="text-[14px]" style={{ color: "#9CA3AF" }}>
              {test.test_centre || "Test centre TBC"}
            </div>
            <div className="mt-3 inline-flex">
              <span
                className="text-[14px] font-semibold"
                style={{
                  backgroundColor: "#1877D6",
                  color: "#0B1F3A",
                  borderRadius: 8,
                  padding: "8px 16px",
                }}
              >
                {(() => {
                  const d = daysUntil(test.test_date);
                  if (d === 0) return "Today";
                  if (d === 1) return "1 day to go";
                  return `${d} days to go`;
                })()}
              </span>
            </div>
          </div>

          <div className="px-4">
            <SectionHeader>TEST DAY CHECKLIST</SectionHeader>
            <Card>
              <div className="flex flex-col" style={{ gap: 10 }}>
                {CHECKLIST_ITEMS.map((item) => {
                  const checked = !!checks[item];
                  return (
                    <label
                      key={item}
                      className="flex items-center cursor-pointer select-none"
                      style={{ gap: 10 }}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleCheck(item)}
                        style={{ width: 18, height: 18, accentColor: "#1877D6" }}
                      />
                      <span
                        className="text-[14px]"
                        style={{
                          color: "#0B1F3A",
                          textDecoration: checked ? "line-through" : "none",
                          opacity: checked ? 0.7 : 1,
                          ...POPPINS,
                        }}
                      >
                        {item}
                      </span>
                    </label>
                  );
                })}
              </div>
            </Card>

            <SectionHeader>LESSON PLAN</SectionHeader>
            <Card>
              <div
                className="text-[11px] uppercase font-medium"
                style={{ color: "#6B7280", letterSpacing: "0.05em" }}
              >
                Pre-test lesson
              </div>
              <div className="text-[14px] mt-1" style={{ color: "#0B1F3A" }}>
                {lesson
                  ? `${new Date(lesson.lesson_date).toLocaleTimeString("en-GB", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })} · ${lesson.duration_minutes ?? 60} min`
                  : "No lesson booked on test day"}
              </div>

              <div
                className="text-[11px] uppercase font-medium mt-4"
                style={{ color: "#6B7280", letterSpacing: "0.05em" }}
              >
                Recommended focus areas
              </div>
              <textarea
                value={focusNotes}
                onChange={(e) => updateFocus(e.target.value)}
                placeholder="Roundabouts, parallel parking, dual carriageways…"
                rows={4}
                className="w-full mt-1 rounded-lg p-3 text-[14px] bg-white focus:border-[#1877D6] focus:outline-none"
                style={{
                  borderWidth: "0.5px",
                  borderStyle: "solid",
                  borderColor: "#EEF2F7",
                  color: "#0B1F3A",
                  ...POPPINS,
                }}
              />
            </Card>

            <SectionHeader>LOG RESULT</SectionHeader>
            <Card>
              <div className="flex" style={{ gap: 8 }}>
                {(["Pass", "Fail"] as const).map((opt) => {
                  const active = result === opt;
                  const activeBg = opt === "Pass" ? "#1877D6" : "#1877D6";
                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setResult(opt)}
                      className="flex-1 text-[15px] font-semibold"
                      style={{
                        height: 52,
                        borderRadius: 10,
                        backgroundColor: active ? activeBg : "#F3F8FF",
                        color: active ? "#FFFFFF" : "#0B1F3A",
                        borderWidth: "0.5px",
                        borderStyle: "solid",
                        borderColor: active ? activeBg : "#EEF2F7",
                        ...POPPINS,
                      }}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>

              <div className="mt-3">
                <Input
                  label="Faults"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={faults}
                  onChange={(e) => setFaults(e.target.value)}
                  placeholder="e.g. 3"
                />
              </div>

              <div className="mt-3">
                <label
                  className="block mb-1 text-[12px] font-medium"
                  style={{ color: "#6B7280", ...POPPINS }}
                >
                  Notes
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  placeholder="Examiner comments, mistakes, follow-ups…"
                  className="w-full rounded-lg p-3 text-[14px] bg-white focus:border-[#1877D6] focus:outline-none"
                  style={{
                    borderWidth: "0.5px",
                    borderStyle: "solid",
                    borderColor: "#EEF2F7",
                    color: "#0B1F3A",
                    ...POPPINS,
                  }}
                />
              </div>

              <div className="mt-4">
                <Button onClick={saveResult} disabled={saving}>
                  {saving ? "Saving…" : "Save result"}
                </Button>
              </div>
            </Card>
          </div>
        </>
      )}
    </PageLayout>
  );
}

export default TestDayPage;

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Plus, X, GraduationCap } from "lucide-react";
import { toast } from "sonner";
import { Card } from "../components/dsm/Card";
import { SectionHeader } from "../components/dsm/SectionHeader";
import { Input } from "../components/dsm/Input";
import { Button } from "../components/dsm/Button";
import { supabase } from "../lib/supabaseClient";
import { PageLayout } from "@/components/PageLayout";

export const Route = createFileRoute("/tests")({
  head: () => ({
    meta: [{ title: "Driving tests — DSM by EveryDriver" }],
  }),
  component: TestsPage,
});

const POPPINS = { fontFamily: "Inter, sans-serif" } as const;

interface Pupil {
  id: string;
  name: string;
}

type TestStatus = "passed" | "failed" | "abandoned" | "cancelled" | null;

interface DrivingTest {
  id: string; // pupil id (pupils is the single source of truth)
  pupil_id: string; // same as id, kept for existing TestCard/LogResultSheet code
  test_date: string;
  test_time: string | null;
  test_centre: string | null;
  test_examiner: string | null;
  test_status: TestStatus;
  examiner_first_name: string | null;
  examiner_surname: string | null;
  minor_faults: number | null;
  serious_faults: number | null;
  dangerous_faults: number | null;
  examiner_took_action: boolean | null;
  test_vehicle_owner: "instructor" | "own_car" | null;
  test_transmission: "manual" | "automatic" | null;
  // Derived/compat fields used by the existing TestCard UI:
  result: "Pass" | "Fail" | null;
  faults: number | null;
  result_notes: string | null;
  result_logged_at: string | null;
  pupils: { id: string; name: string } | null;
}

interface PupilTestRow {
  id: string;
  name: string;
  test_date: string;
  test_time: string | null;
  test_centre: string | null;
  test_examiner: string | null;
  test_status: string | null;
  examiner_first_name: string | null;
  examiner_surname: string | null;
  minor_faults: number | null;
  serious_faults: number | null;
  dangerous_faults: number | null;
  examiner_took_action: boolean | null;
  test_vehicle_owner: "instructor" | "own_car" | null;
  test_transmission: "manual" | "automatic" | null;
}

function mapPupilRowToTest(row: PupilTestRow): DrivingTest {
  const status = (row.test_status ?? null) as TestStatus;
  const totalFaults =
    (row.minor_faults ?? 0) + (row.serious_faults ?? 0) + (row.dangerous_faults ?? 0);
  const hasAnyFault =
    row.minor_faults != null || row.serious_faults != null || row.dangerous_faults != null;
  return {
    id: row.id,
    pupil_id: row.id,
    test_date: row.test_date,
    test_time: row.test_time,
    test_centre: row.test_centre,
    test_examiner: row.test_examiner,
    test_status: status,
    examiner_first_name: row.examiner_first_name,
    examiner_surname: row.examiner_surname,
    minor_faults: row.minor_faults,
    serious_faults: row.serious_faults,
    dangerous_faults: row.dangerous_faults,
    examiner_took_action: row.examiner_took_action,
    test_vehicle_owner: row.test_vehicle_owner,
    test_transmission: row.test_transmission,
    result: status === "passed" ? "Pass" : status === "failed" ? "Fail" : null,
    faults: hasAnyFault ? totalFaults : null,
    result_notes: null,
    result_logged_at: null,
    pupils: { id: row.id, name: row.name },
  };
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
  return d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
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

function TestsPage() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [tests, setTests] = useState<DrivingTest[]>([]);
  const [pupils, setPupils] = useState<Pupil[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [resultFor, setResultFor] = useState<DrivingTest | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user) setUserId(data.user.id);
    })();
  }, []);

  async function loadTests(uid: string) {
    const { data, error } = await supabase
      .from("pupils")
      .select(
        "id, name, test_date, test_time, test_centre, test_examiner, test_status, examiner_first_name, examiner_surname, minor_faults, serious_faults, dangerous_faults, examiner_took_action, test_vehicle_owner, test_transmission",
      )
      .eq("instructor_id", uid)
      .is("deleted_at", null)
      .not("test_date", "is", null)
      .order("test_date", { ascending: true });
    if (error) console.error("[tests] fetch error", error);
    setTests(((data ?? []) as PupilTestRow[]).map(mapPupilRowToTest));
  }


  async function loadPupils(uid: string) {
    const { data, error } = await supabase
      .from("pupils")
      .select("id, name")
      .eq("instructor_id", uid)
      .is("deleted_at", null)
      .order("name", { ascending: true });
    if (error) console.error("[tests] pupils fetch error", error);
    setPupils((data ?? []) as Pupil[]);
  }

  useEffect(() => {
    if (!userId) return;
    loadTests(userId);
    loadPupils(userId);
  }, [userId]);

  const today = todayYmd();
  // Terminal statuses are grouped by status regardless of date.
  const passed = tests.filter((t) => t.test_status === "passed");
  const failed = tests.filter((t) => t.test_status === "failed");
  const abandoned = tests.filter((t) => t.test_status === "abandoned");
  const cancelled = tests.filter((t) => t.test_status === "cancelled");
  const openTests = tests.filter(
    (t) => t.test_status == null || t.test_status === ("upcoming" as unknown as TestStatus),
  );
  const upcoming = openTests.filter((t) => t.test_date >= today);
  const needsResult = openTests.filter((t) => t.test_date < today).reverse();
  const dvsaMetrics = computeDvsaRiskMetrics(tests);
  const examinerStats = computeExaminerStats(tests);

  const sections: {
    key: string;
    title: string;
    items: DrivingTest[];
    showDaysBadge?: boolean;
    pastProminent?: boolean;
    emptyText: string;
  }[] = [
    { key: "upcoming", title: "UPCOMING TESTS", items: upcoming, showDaysBadge: true, emptyText: "No upcoming tests" },
    { key: "needs", title: "NEEDS A RESULT", items: needsResult, showDaysBadge: true, emptyText: "No tests waiting for a result" },
    { key: "passed", title: "PASSED", items: passed, pastProminent: true, emptyText: "No passes yet" },
    { key: "failed", title: "FAILED", items: failed, pastProminent: true, emptyText: "No fails logged" },
    { key: "abandoned", title: "ABANDONED", items: abandoned, pastProminent: true, emptyText: "No abandoned tests" },
    { key: "cancelled", title: "CANCELLED", items: cancelled, pastProminent: true, emptyText: "No cancelled tests" },
  ];

  return (
    <PageLayout className="pb-8" style={POPPINS}>
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
          Driving tests
        </div>
        <button
          type="button"
          aria-label="Add test"
          onClick={() => setAddOpen(true)}
          className="flex items-center justify-center"
          style={{ width: 40, height: 40 }}
        >
          <Plus size={22} color="#FFFFFF" />
        </button>
      </div>

      <div className="px-4">
        {dvsaMetrics && <DvsaRiskCard metrics={dvsaMetrics} />}
        {examinerStats.length > 0 && <ExaminerStatsCard stats={examinerStats} />}
        {sections.map((section) => (
          <div key={section.key}>
            <SectionHeader>{section.title}</SectionHeader>
            {section.items.length === 0 ? (
              <EmptyState text={section.emptyText} />
            ) : (
              <div className="flex flex-col" style={{ gap: 8 }}>
                {section.items.map((t) => (
                  <TestCard
                    key={`${section.key}-${t.id}`}
                    test={t}
                    showDaysBadge={section.showDaysBadge}
                    pastProminent={section.pastProminent}
                    onLogResult={section.showDaysBadge ? () => setResultFor(t) : undefined}
                  />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>


      {addOpen && userId && (
        <AddTestSheet
          pupils={pupils}
          userId={userId}
          onClose={() => setAddOpen(false)}
          onAdded={() => {
            setAddOpen(false);
            loadTests(userId);
          }}
        />
      )}

      {resultFor && (
        <LogResultSheet
          test={resultFor}
          onClose={() => setResultFor(null)}
          onSaved={() => {
            setResultFor(null);
            if (userId) loadTests(userId);
          }}
        />
      )}
    </PageLayout>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div
      className="flex flex-col items-center justify-center text-[13px]"
      style={{ color: "#6B7280", padding: "24px 0" }}
    >
      <GraduationCap size={24} color="#6B7280" />
      <div className="mt-2">{text}</div>
    </div>
  );
}

function computeDvsaRiskMetrics(tests: DrivingTest[]) {
  const today = todayYmd();
  const d = new Date(`${today}T00:00:00`);
  d.setFullYear(d.getFullYear() - 1);
  const twelveMonthsAgo = d.toISOString().slice(0, 10);

  const completed = tests.filter(
    (t) =>
      t.test_date >= twelveMonthsAgo &&
      t.test_date <= today &&
      ["passed", "failed", "abandoned"].includes(t.test_status ?? ""),
  );

  const totalTests = completed.length;
  if (totalTests === 0) return null;

  const sumMinor = completed.reduce((acc, t) => acc + (t.minor_faults ?? 0), 0);
  const sumSerious = completed.reduce((acc, t) => acc + (t.serious_faults ?? 0), 0);
  const interventions = completed.filter((t) => t.examiner_took_action === true).length;
  const passes = completed.filter((t) => t.test_status === "passed").length;

  const avgMinorFaults = sumMinor / totalTests;
  const avgSeriousFaults = sumSerious / totalTests;
  const interventionRate = (interventions / totalTests) * 100;
  const passRate = (passes / totalTests) * 100;

  const triggers = {
    avgMinorFaults: avgMinorFaults >= 6,
    avgSeriousFaults: avgSeriousFaults >= 0.55,
    interventionRate: interventionRate >= 10,
    passRate: passRate <= 55,
  };

  const triggerCount = Object.values(triggers).filter(Boolean).length;

  return {
    totalTests,
    avgMinorFaults,
    avgSeriousFaults,
    interventionRate,
    passRate,
    triggerCount,
    triggers,
  };
}

function DvsaRiskCard({ metrics }: { metrics: NonNullable<ReturnType<typeof computeDvsaRiskMetrics>> }) {
  const bannerBg =
    metrics.triggerCount >= 3 ? "#FEE2E2" : metrics.triggerCount === 2 ? "#FEF3C7" : "#F3F4F6";
  const bannerColor =
    metrics.triggerCount >= 3 ? "#991B1B" : metrics.triggerCount === 2 ? "#92400E" : "#4B5563";

  return (
    <div className="mb-4" style={{ borderRadius: 12, background: "#FFFFFF", border: "0.5px solid #EEF2F7", overflow: "hidden" }}>
      <div className="px-3 py-3" style={{ background: "#0B1F3A" }}>
        <div className="text-[13px] font-semibold text-white" style={POPPINS}>DVSA Standards Check risk</div>
        <div className="text-[11px] text-white/80 mt-0.5" style={POPPINS}>Last 12 months · completed tests only</div>
      </div>
      <div className="px-3">
        <DvsaMetricRow
          label="Avg minor faults"
          value={metrics.avgMinorFaults}
          valueSuffix=""
          threshold="6+"
          triggered={metrics.triggers.avgMinorFaults}
          decimals={1}
        />
        <DvsaMetricRow
          label="Avg serious faults"
          value={metrics.avgSeriousFaults}
          valueSuffix=""
          threshold="0.55+"
          triggered={metrics.triggers.avgSeriousFaults}
          decimals={2}
        />
        <DvsaMetricRow
          label="Intervention rate"
          value={metrics.interventionRate}
          valueSuffix="%"
          threshold="10%+"
          triggered={metrics.triggers.interventionRate}
          decimals={0}
        />
        <DvsaMetricRow
          label="Pass rate"
          value={metrics.passRate}
          valueSuffix="%"
          threshold="≤55%"
          triggered={metrics.triggers.passRate}
          decimals={0}
        />
      </div>
      <div className="px-3 py-3 text-[12px] font-medium" style={{ background: bannerBg, color: bannerColor, ...POPPINS }}>
        {metrics.triggerCount} of 4 triggers met — DVSA typically requests a check at 3 or more. Based on {metrics.totalTests} completed tests.
      </div>
    </div>
  );
}

function DvsaMetricRow({
  label,
  value,
  valueSuffix,
  threshold,
  triggered,
  decimals,
}: {
  label: string;
  value: number;
  valueSuffix: string;
  threshold: string;
  triggered: boolean;
  decimals: number;
}) {
  const formatted = Number.isFinite(value) ? value.toFixed(decimals) : "0";
  return (
    <div className="flex items-center justify-between py-2" style={{ borderBottom: "0.5px solid #EEF2F7" }}>
      <span className="text-[13px]" style={{ color: "#6B7280", ...POPPINS }}>{label}</span>
      <span className="text-[13px] font-semibold" style={{ color: triggered ? "#CC2229" : "#1E8E5A", ...POPPINS }}>
        {formatted}{valueSuffix} (trigger: {threshold})
      </span>
    </div>
  );
}


function TestCard({
  test,
  showDaysBadge,
  pastProminent,
  onLogResult,
}: {
  test: DrivingTest;
  showDaysBadge?: boolean;
  pastProminent?: boolean;
  onLogResult?: () => void;
}) {
  const name = test.pupils?.name ?? "Unknown pupil";
  const days = daysUntil(test.test_date);
  const daysLabel = days === 0 ? "Today" : days === 1 ? "Tomorrow" : `${days} days`;
  const resultColor = test.result === "Pass" ? "#1877D6" : test.result === "Fail" ? "#1877D6" : null;

  return (
    <Card>
      <div className="flex items-start" style={{ gap: 12 }}>
        <div
          className="flex items-center justify-center text-white text-[13px] font-semibold shrink-0"
          style={{ width: 40, height: 40, borderRadius: 999, backgroundColor: "#1877D6", ...POPPINS }}
        >
          {initials(name)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between" style={{ gap: 8 }}>
            <div className="text-[14px] font-semibold truncate" style={{ color: "#0B1F3A", ...POPPINS }}>
              {name}
            </div>
            {showDaysBadge && (
              <span
                className="text-[11px] font-medium shrink-0"
                style={{
                  color: "#1877D6",
                  backgroundColor: "#EEF4FB",
                  padding: "2px 8px",
                  borderRadius: 999,
                  ...POPPINS,
                }}
              >
                {daysLabel}
              </span>
            )}
            {pastProminent && resultColor && (
              <span
                className="text-[11px] font-semibold text-white shrink-0"
                style={{
                  backgroundColor: resultColor,
                  padding: "3px 10px",
                  borderRadius: 999,
                  ...POPPINS,
                }}
              >
                {test.result}
                {test.faults != null ? ` · ${test.faults}` : ""}
              </span>
            )}
          </div>
          <div className="text-[13px] font-bold mt-1" style={{ color: "#0B1F3A", ...POPPINS }}>
            {formatDateLong(test.test_date)}
          </div>
          <div className="text-[12px]" style={{ color: "#6B7280", ...POPPINS }}>
            {formatTime(test.test_time) || "—"}
            {test.test_centre ? ` · ${test.test_centre}` : ""}
          </div>

          {showDaysBadge && (
            <div className="mt-2 flex items-center" style={{ gap: 8 }}>
              {resultColor ? (
                <span
                  className="text-[11px] font-semibold text-white"
                  style={{
                    backgroundColor: resultColor,
                    padding: "3px 10px",
                    borderRadius: 999,
                    ...POPPINS,
                  }}
                >
                  {test.result}
                  {test.faults != null ? ` · ${test.faults} faults` : ""}
                </span>
              ) : (
                onLogResult && (
                  <button
                    type="button"
                    onClick={onLogResult}
                    className="inline-flex items-center justify-center text-[12px] font-medium"
                    style={{
                      height: 32,
                      padding: "0 12px",
                      borderRadius: 8,
                      backgroundColor: "transparent",
                      border: "1px solid #1877D6",
                      color: "#1877D6",
                      ...POPPINS,
                    }}
                  >
                    Log result
                  </button>
                )
              )}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

interface ExaminerStat {
  key: string;
  name: string;
  tests: DrivingTest[];
  total: number;
  passes: number;
  passRate: number;
  avgMinor: number;
  avgSerious: number;
  interventions: number;
}

function computeExaminerStats(tests: DrivingTest[]): ExaminerStat[] {
  const completed = tests.filter((t) =>
    ["passed", "failed", "abandoned"].includes(t.test_status ?? ""),
  );
  const groups = new Map<string, ExaminerStat>();
  for (const t of completed) {
    const first = (t.examiner_first_name ?? "").trim();
    const surname = (t.examiner_surname ?? "").trim();
    if (!first && !surname) continue;
    const key = `${first}|${surname}`.toLowerCase();
    const name = [first, surname].filter(Boolean).join(" ");
    let g = groups.get(key);
    if (!g) {
      g = {
        key,
        name,
        tests: [],
        total: 0,
        passes: 0,
        passRate: 0,
        avgMinor: 0,
        avgSerious: 0,
        interventions: 0,
      };
      groups.set(key, g);
    }
    g.tests.push(t);
  }
  const out: ExaminerStat[] = [];
  for (const g of groups.values()) {
    const total = g.tests.length;
    const passes = g.tests.filter((t) => t.test_status === "passed").length;
    const sumMinor = g.tests.reduce((a, t) => a + (t.minor_faults ?? 0), 0);
    const sumSerious = g.tests.reduce((a, t) => a + (t.serious_faults ?? 0), 0);
    const interventions = g.tests.filter((t) => t.examiner_took_action === true).length;
    out.push({
      ...g,
      total,
      passes,
      passRate: (passes / total) * 100,
      avgMinor: sumMinor / total,
      avgSerious: sumSerious / total,
      interventions,
      tests: [...g.tests].sort((a, b) => (a.test_date < b.test_date ? 1 : -1)),
    });
  }
  return out.sort((a, b) => b.total - a.total);
}

function ExaminerStatsCard({ stats }: { stats: ExaminerStat[] }) {
  const [openKey, setOpenKey] = useState<string | null>(null);
  return (
    <div className="mb-4" style={{ borderRadius: 12, background: "#FFFFFF", border: "0.5px solid #EEF2F7", overflow: "hidden" }}>
      <div className="px-3 py-3" style={{ background: "#0B1F3A" }}>
        <div className="text-[13px] font-semibold text-white" style={POPPINS}>Examiner stats</div>
        <div className="text-[11px] text-white/80 mt-0.5" style={POPPINS}>Completed tests grouped by examiner</div>
      </div>
      <div>
        {stats.map((s) => {
          const open = openKey === s.key;
          return (
            <div key={s.key} style={{ borderBottom: "0.5px solid #EEF2F7" }}>
              <button
                type="button"
                onClick={() => setOpenKey(open ? null : s.key)}
                className="w-full text-left px-3 py-3"
                style={POPPINS}
              >
                <div className="flex items-center justify-between" style={{ gap: 8 }}>
                  <span className="text-[13px] font-semibold" style={{ color: "#0B1F3A" }}>{s.name}</span>
                  <span className="text-[11px] font-medium" style={{ color: "#1877D6", backgroundColor: "#EEF4FB", padding: "2px 8px", borderRadius: 999 }}>
                    {s.total} test{s.total === 1 ? "" : "s"}
                  </span>
                </div>
                <div className="text-[12px] mt-1" style={{ color: "#6B7280" }}>
                  {s.passRate.toFixed(0)}% pass · avg {s.avgMinor.toFixed(1)} min / {s.avgSerious.toFixed(2)} ser · {s.interventions} intervention{s.interventions === 1 ? "" : "s"}
                </div>
              </button>
              {open && (
                <div className="px-3 pb-3 flex flex-col" style={{ gap: 6 }}>
                  {s.tests.map((t) => {
                    const label =
                      t.test_status === "passed" ? "Pass" :
                      t.test_status === "failed" ? "Fail" :
                      t.test_status === "abandoned" ? "Abandoned" : "—";
                    const color =
                      t.test_status === "passed" ? "#1E8E5A" :
                      t.test_status === "failed" ? "#CC2229" : "#6B7280";
                    return (
                      <div
                        key={t.id}
                        className="flex items-center justify-between px-2 py-2"
                        style={{ background: "#F9FAFB", borderRadius: 8, ...POPPINS }}
                      >
                        <div className="min-w-0">
                          <div className="text-[12px] font-medium truncate" style={{ color: "#0B1F3A" }}>
                            {t.pupils?.name ?? "Pupil"}
                          </div>
                          <div className="text-[11px]" style={{ color: "#6B7280" }}>
                            {formatDateLong(t.test_date)}
                            {t.test_centre ? ` · ${t.test_centre}` : ""}
                            {" · "}{t.minor_faults ?? 0}m / {t.serious_faults ?? 0}s
                            {t.examiner_took_action ? " · intervention" : ""}
                          </div>
                        </div>
                        <span className="text-[11px] font-semibold shrink-0" style={{ color }}>
                          {label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SheetShell({
  title,
  onClose,
  children,
  footer,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center" style={POPPINS}>
      <div
        className="absolute inset-0"
        style={{ backgroundColor: "rgba(11,31,58,0.5)" }}
        onClick={onClose}
        aria-hidden
      />
      <div
        className="relative w-full bg-white flex flex-col"
        style={{
          borderTopLeftRadius: 16,
          borderTopRightRadius: 16,
          maxHeight: "92vh",
        }}
      >
        <div className="flex items-center justify-between px-4 pt-4 shrink-0">
          <span className="text-[11px] font-semibold tracking-wider" style={{ color: "#6B7280" }}>
            {title}
          </span>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="flex items-center justify-center"
            style={{ width: 32, height: 32 }}
          >
            <X size={18} color="#6B7280" />
          </button>
        </div>
        <div className="px-4 pt-2 pb-4 overflow-y-auto" style={{ flex: 1, minHeight: 0 }}>
          {children}
        </div>
        {footer && (
          <div
            className="shrink-0"
            style={{
              position: "sticky",
              bottom: 0,
              background: "#FFFFFF",
              borderTop: "1px solid #EEF2F7",
              padding: 16,
              zIndex: 10,
              paddingBottom: "calc(16px + env(safe-area-inset-bottom) + 64px)",
            }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

function AddTestSheet({
  pupils,
  userId,
  onClose,
  onAdded,
}: {
  pupils: Pupil[];
  userId: string;
  onClose: () => void;
  onAdded: () => void;
}) {
  const [pupilId, setPupilId] = useState("");
  const [date, setDate] = useState(todayYmd());
  const [time, setTime] = useState("");
  const [centre, setCentre] = useState("");
  const [examinerFirst, setExaminerFirst] = useState("");
  const [examinerSurname, setExaminerSurname] = useState("");
  const [saving, setSaving] = useState(false);
  const [centreSuggestions, setCentreSuggestions] = useState<string[]>([]);
  const [pairs, setPairs] = useState<ExaminerPair[]>([]);
  const [showDl25, setShowDl25] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("pupils")
        .select("test_centre, examiner_first_name, examiner_surname")
        .eq("instructor_id", userId);
      const centres = new Set<string>();
      const seen = new Set<string>();
      const out: ExaminerPair[] = [];
      for (const row of (data ?? []) as { test_centre: string | null; examiner_first_name: string | null; examiner_surname: string | null }[]) {
        const c = (row.test_centre ?? "").trim();
        if (c) centres.add(c);
        const f = (row.examiner_first_name ?? "").trim();
        const s = (row.examiner_surname ?? "").trim();
        const key = `${f}|${s}`.toLowerCase();
        if (f && !seen.has(key)) {
          seen.add(key);
          out.push({ first: f, surname: s });
        }
      }
      setCentreSuggestions(Array.from(centres).sort());
      setPairs(out);
    })();
  }, [userId]);

  const firstSuggestions = Array.from(new Set(pairs.map((p) => p.first).filter(Boolean)));
  const surnameSuggestions = Array.from(
    new Set(
      pairs
        .filter((p) => !examinerFirst || p.first.toLowerCase() === examinerFirst.trim().toLowerCase())
        .map((p) => p.surname)
        .filter(Boolean),
    ),
  );

  async function save() {
    if (!pupilId || !date || saving) return;
    setSaving(true);
    const { error } = await supabase
      .from("pupils")
      .update({
        test_date: date,
        test_time: time || null,
        test_centre: centre || null,
        examiner_first_name: examinerFirst.trim() || null,
        examiner_surname: examinerSurname.trim() || null,
        test_status: null,
      })
      .eq("id", pupilId)
      .eq("instructor_id", userId);

    setSaving(false);
    if (error) {
      console.error("[tests] insert error", error);
      toast.error("Couldn't add test");
      return;
    }
    const pupilName = pupils.find((p) => p.id === pupilId)?.name ?? "Pupil";
    const { error: notifErr } = await supabase.from("instructor_notifications").insert({
      instructor_id: userId,
      title: "Test date set",
      body: `${pupilName}'s test is on ${formatDateLong(date)} at ${centre || "TBC"}`,
      type: "test",
      read: false,
    });
    if (notifErr) console.error("[tests] notification error", notifErr);
    toast.success("Test added");
    onAdded();
  }

  return (
    <SheetShell
      title="ADD TEST"
      onClose={onClose}
      footer={
        <div className="grid grid-cols-2" style={{ gap: 8 }}>
          <Button variant="ghost" onClick={onClose} type="button">Cancel</Button>
          <Button onClick={save} disabled={!pupilId || !date || saving} type="button">
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      }
    >
      <div className="flex flex-col" style={{ gap: 12 }}>
        <div>
          <label className="block mb-1 text-[12px] font-medium text-[#6B7280]">Pupil</label>
          <select
            value={pupilId}
            onChange={(e) => setPupilId(e.target.value)}
            className="w-full px-3 bg-white"
            style={{
              height: 44,
              borderRadius: 8,
              border: "0.5px solid #EEF2F7",
              color: "#0B1F3A",
              fontSize: 14,
              ...POPPINS,
            }}
          >
            <option value="" disabled>Select a pupil</option>
            {pupils.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        <Input label="Test date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <Input label="Test time" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
        <ExaminerNameInput
          label="Test centre"
          value={centre}
          onChange={setCentre}
          suggestions={centreSuggestions}
        />

        <div className="grid grid-cols-2" style={{ gap: 8 }}>
          <ExaminerNameInput
            label="Examiner first name"
            value={examinerFirst}
            onChange={setExaminerFirst}
            suggestions={firstSuggestions}
          />
          <ExaminerNameInput
            label="Examiner surname"
            value={examinerSurname}
            onChange={setExaminerSurname}
            suggestions={surnameSuggestions}
          />
        </div>
      </div>
    </SheetShell>
  );
}

interface ExaminerPair {
  first: string;
  surname: string;
}

function ExaminerNameInput({
  label,
  value,
  onChange,
  suggestions,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  suggestions: string[];
}) {
  const [open, setOpen] = useState(false);
  const q = value.trim().toLowerCase();
  const filtered = q
    ? suggestions.filter((s) => s.toLowerCase().includes(q) && s.toLowerCase() !== q).slice(0, 6)
    : [];
  return (
    <div style={{ position: "relative" }}>
      <Input
        label={label}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        autoComplete="off"
      />
      {open && filtered.length > 0 && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            marginTop: 4,
            background: "#FFFFFF",
            border: "1px solid #EEF2F7",
            borderRadius: 8,
            boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
            zIndex: 20,
            maxHeight: 180,
            overflowY: "auto",
          }}
        >
          {filtered.map((s) => (
            <button
              key={s}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                onChange(s);
                setOpen(false);
              }}
              className="w-full text-left px-3 py-2 text-[14px]"
              style={{ color: "#0B1F3A", ...POPPINS }}
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function LogResultSheet({
  test,
  onClose,
  onSaved,
}: {
  test: DrivingTest;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [result, setResult] = useState<"Pass" | "Fail">("Pass");
  const [vehicleOwner, setVehicleOwner] = useState<"instructor" | "own_car">(
    test.test_vehicle_owner ?? "instructor",
  );
  const [transmission, setTransmission] = useState<"manual" | "automatic">(
    test.test_transmission ?? "manual",
  );
  const [examinerFirst, setExaminerFirst] = useState("");
  const [examinerSurname, setExaminerSurname] = useState("");
  const [minorFaults, setMinorFaults] = useState("0");
  const [seriousFaults, setSeriousFaults] = useState("0");
  const [dangerousFaults, setDangerousFaults] = useState("0");
  const [tookAction, setTookAction] = useState(false);
  const [sendReview, setSendReview] = useState(true);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [pairs, setPairs] = useState<ExaminerPair[]>([]);
  const [showDl25, setShowDl25] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) return;
      const { data } = await supabase
        .from("pupils")
        .select("examiner_first_name, examiner_surname")
        .eq("instructor_id", uid)
        .not("examiner_first_name", "is", null);
      const seen = new Set<string>();
      const out: ExaminerPair[] = [];
      for (const row of (data ?? []) as { examiner_first_name: string | null; examiner_surname: string | null }[]) {
        const f = (row.examiner_first_name ?? "").trim();
        const s = (row.examiner_surname ?? "").trim();
        const key = `${f}|${s}`.toLowerCase();
        if (!f || seen.has(key)) continue;
        seen.add(key);
        out.push({ first: f, surname: s });
      }
      setPairs(out);
    })();
  }, []);

  const firstSuggestions = Array.from(new Set(pairs.map((p) => p.first).filter(Boolean)));
  const surnameSuggestions = Array.from(
    new Set(
      pairs
        .filter((p) => !examinerFirst || p.first.toLowerCase() === examinerFirst.trim().toLowerCase())
        .map((p) => p.surname)
        .filter(Boolean),
    ),
  );

  async function save() {
    if (saving) return;
    setSaving(true);
    const minor = parseInt(minorFaults, 10) || 0;
    const serious = parseInt(seriousFaults, 10) || 0;
    const dangerous = parseInt(dangerousFaults, 10) || 0;
    void notes; // reserved for future pupil-side notes field; not yet on schema


    const { error: pupilErr } = await supabase
      .from("pupils")
      .update({
        examiner_first_name: examinerFirst.trim() || null,
        examiner_surname: examinerSurname.trim() || null,
        minor_faults: minor,
        serious_faults: serious,
        dangerous_faults: dangerous,
        examiner_took_action: tookAction,
        test_status: result === "Pass" ? "passed" : "failed",
        test_vehicle_owner: vehicleOwner,
        test_transmission: transmission,
      })
      .eq("id", test.pupil_id);
    if (pupilErr) console.error("[tests] pupil update error", pupilErr);

    if (result === "Pass" && sendReview) {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      const { data: pupilRow } = await supabase
        .from("pupils")
        .select("phone, name")
        .eq("id", test.pupil_id)
        .maybeSingle();
      const phone = (pupilRow as { phone: string | null } | null)?.phone ?? null;
      const pupilName = (pupilRow as { name: string | null } | null)?.name ?? test.pupils?.name ?? "";
      const firstName = pupilName.split(/\s+/)[0] || "there";
      const message = `Hi ${firstName}, huge congrats on passing your driving test! 🎉 If you have a moment, it would mean the world if you left a quick Google review — thank you!`;
      if (phone && uid) {
        const { error: smsErr } = await supabase.from("sms_queue").insert({
          instructor_id: uid,
          pupil_phone: phone,
          message,
        });
        if (smsErr) console.error("[tests] sms_queue insert failed", smsErr);
      }
      if (uid) {
        const { error: chatErr } = await supabase.from("chat_messages").insert({
          instructor_id: uid,
          pupil_id: test.pupil_id,
          direction: "outbound",
          body: message,
        });
        if (chatErr) console.error("[tests] chat_messages insert failed", chatErr);
      }
    }

    setSaving(false);
    toast.success(
      result === "Pass" && sendReview ? "Result logged · review request queued" : "Result logged",
    );
    onSaved();
  }

  const numInputStyle = {
    borderWidth: "0.5px",
    borderStyle: "solid",
    borderColor: "#EEF2F7",
  } as const;

  return (
    <>
    <SheetShell
      title="LOG RESULT"
      onClose={onClose}
      footer={
        <div className="grid grid-cols-2" style={{ gap: 8 }}>
          <Button variant="ghost" onClick={onClose} type="button">Cancel</Button>
          <Button onClick={save} disabled={saving} type="button">
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      }
    >
      <div className="flex flex-col" style={{ gap: 12 }}>
        <div className="rounded-[12px] p-3" style={{ backgroundColor: "#F3F4F6" }}>
          <div className="text-[14px] font-semibold" style={{ color: "#0B1F3A" }}>
            {test.pupils?.name ?? "Pupil"}
          </div>
          <div className="text-[12px]" style={{ color: "#6B7280" }}>
            {formatDateLong(test.test_date)}
            {test.test_time ? ` · ${formatTime(test.test_time)}` : ""}
          </div>
        </div>

        <ChoiceRow
          label="Result"
          options={[
            { value: "Pass", label: "Pass" },
            { value: "Fail", label: "Fail" },
          ]}
          value={result}
          onChange={setResult}
        />

        <ChoiceRow
          label="Vehicle used"
          options={[
            { value: "instructor", label: "Instructor's car" },
            { value: "own_car", label: "Their own car" },
          ]}
          value={vehicleOwner}
          onChange={setVehicleOwner}
        />

        <ChoiceRow
          label="Transmission"
          options={[
            { value: "manual", label: "Manual" },
            { value: "automatic", label: "Automatic" },
          ]}
          value={transmission}
          onChange={setTransmission}
        />

        <div className="grid grid-cols-2" style={{ gap: 8 }}>
          <ExaminerNameInput
            label="Examiner first name"
            value={examinerFirst}
            onChange={setExaminerFirst}
            suggestions={firstSuggestions}
          />
          <ExaminerNameInput
            label="Examiner surname"
            value={examinerSurname}
            onChange={setExaminerSurname}
            suggestions={surnameSuggestions}
          />
        </div>

        <div className="grid grid-cols-3" style={{ gap: 8 }}>
          <Input
            label="Minors"
            type="number"
            inputMode="numeric"
            min={0}
            value={minorFaults}
            onChange={(e) => setMinorFaults(e.target.value)}
            style={numInputStyle}
          />
          <Input
            label="Serious"
            type="number"
            inputMode="numeric"
            min={0}
            value={seriousFaults}
            onChange={(e) => setSeriousFaults(e.target.value)}
            style={numInputStyle}
          />
          <Input
            label="Dangerous"
            type="number"
            inputMode="numeric"
            min={0}
            value={dangerousFaults}
            onChange={(e) => setDangerousFaults(e.target.value)}
            style={numInputStyle}
          />
        </div>

        <ToggleRow
          label="Did the examiner take physical control of the vehicle?"
          value={tookAction}
          onChange={setTookAction}
        />

        {result === "Pass" && (
          <ToggleRow
            label="Send Google review request to pupil"
            value={sendReview}
            onChange={setSendReview}
          />
        )}

        <div>
          <label className="block mb-1 text-[12px] font-medium text-[#6B7280]">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 bg-white"
            style={{
              borderRadius: 8,
              border: "0.5px solid #EEF2F7",
              color: "#0B1F3A",
              fontSize: 14,
              resize: "none",
              ...POPPINS,
            }}
          />
        </div>

        <button
          type="button"
          onClick={() => setShowDl25(true)}
          className="w-full flex items-center justify-center text-[13px] font-semibold"
          style={{
            height: 44,
            borderRadius: 10,
            border: "1px dashed #1877D6",
            color: "#1877D6",
            background: "#F4F8FE",
            ...POPPINS,
          }}
        >
          Fill in DL25 form
        </button>
      </div>
    </SheetShell>
    {showDl25 && (
      <DL25Sheet
        pupilId={test.pupil_id}
        testDate={test.test_date}
        onClose={() => setShowDl25(false)}
        onSaved={(totals) => {
          setMinorFaults(String(totals.minor));
          setSeriousFaults(String(totals.serious));
          setDangerousFaults(String(totals.dangerous));
          setShowDl25(false);
        }}
      />
    )}
    </>
  );
}

function ToggleRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className="w-full flex items-center justify-between p-3"
      style={{
        borderRadius: 10,
        border: "0.5px solid #EEF2F7",
        background: "#FFFFFF",
        textAlign: "left",
      }}
    >
      <span className="text-[13px] pr-3" style={{ color: "#0B1F3A", ...POPPINS }}>
        {label}
      </span>
      <span
        style={{
          width: 40,
          height: 24,
          borderRadius: 999,
          background: value ? "#1877D6" : "#D1D5DB",
          position: "relative",
          flexShrink: 0,
          transition: "background 0.15s",
        }}
      >
        <span
          style={{
            position: "absolute",
            top: 2,
            left: value ? 18 : 2,
            width: 20,
            height: 20,
            borderRadius: 999,
            background: "#FFFFFF",
            transition: "left 0.15s",
            boxShadow: "0 1px 2px rgba(0,0,0,0.2)",
          }}
        />
      </span>
    </button>
  );
}

function ChoiceRow<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div>
      <label className="block mb-1 text-[12px] font-medium text-[#6B7280]">{label}</label>
      <div className="grid grid-cols-2" style={{ gap: 8 }}>
        {options.map((opt) => {
          const active = value === opt.value;
          const color = "#1877D6";
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              className="inline-flex items-center justify-center text-[14px] font-medium"
              style={{
                height: 44,
                borderRadius: 8,
                backgroundColor: active ? color : "transparent",
                color: active ? "#FFFFFF" : color,
                border: `1px solid ${color}`,
                ...POPPINS,
              }}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ============ DL25 Sheet ============

type DL25Mark = null | "fault" | "serious" | "dangerous";
type FaultMarks = Record<string, DL25Mark>;

type DL25Node =
  | { kind: "standalone"; key: string; label: string; faultOnly?: boolean }
  | { kind: "group"; slug: string; title: string; items: Array<{ key: string; label: string }> }
  | { kind: "manoeuvres" };

const DL25_MANOEUVRE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "reverse_right", label: "Reverse / Right" },
  { value: "reverse_park_road", label: "Reverse park (road)" },
  { value: "reverse_park_car_park", label: "Reverse park (car park)" },
  { value: "forward_park", label: "Forward park" },
];

const DL25_SCHEMA: DL25Node[] = [
  { kind: "standalone", key: "eyesight_test", label: "Eyesight test", faultOnly: true },
  {
    kind: "group",
    slug: "control",
    title: "Control",
    items: [
      { key: "clutch", label: "Clutch" },
      { key: "gears", label: "Gears" },
      { key: "footbrake", label: "Footbrake" },
      { key: "parking_brake", label: "Parking brake" },
      { key: "steering", label: "Steering" },
      { key: "precautions", label: "Precautions" },
      { key: "ancillary_controls", label: "Ancillary controls" },
      { key: "accelerator", label: "Accelerator" },
    ],
  },
  {
    kind: "group",
    slug: "move_off",
    title: "Move off",
    items: [
      { key: "safety", label: "Safety" },
      { key: "control", label: "Control" },
    ],
  },
  {
    kind: "group",
    slug: "use_of_mirrors",
    title: "Use of mirrors",
    items: [
      { key: "signalling", label: "Signalling" },
      { key: "change_direction", label: "Change direction" },
      { key: "change_speed", label: "Change speed" },
    ],
  },
  {
    kind: "group",
    slug: "signals",
    title: "Signals",
    items: [
      { key: "necessary", label: "Necessary" },
      { key: "correctly", label: "Correctly" },
      { key: "timed", label: "Timed" },
    ],
  },
  {
    kind: "group",
    slug: "junctions",
    title: "Junctions",
    items: [
      { key: "approach_speed", label: "Approach speed" },
      { key: "observation", label: "Observation" },
      { key: "turning_right", label: "Turning right" },
      { key: "turning_left", label: "Turning left" },
      { key: "cutting_corners", label: "Cutting corners" },
    ],
  },
  {
    kind: "group",
    slug: "judgement",
    title: "Judgement",
    items: [
      { key: "overtaking", label: "Overtaking" },
      { key: "meeting", label: "Meeting" },
      { key: "crossing", label: "Crossing" },
    ],
  },
  { kind: "standalone", key: "clearance", label: "Clearance" },
  { kind: "standalone", key: "following_distance", label: "Following distance" },
  { kind: "standalone", key: "use_of_speed", label: "Use of speed" },
  {
    kind: "group",
    slug: "positioning",
    title: "Positioning",
    items: [
      { key: "lane_discipline", label: "Lane discipline" },
      { key: "normal_driving", label: "Normal driving" },
    ],
  },
  { kind: "standalone", key: "pedestrian_crossings", label: "Pedestrian crossings" },
  { kind: "standalone", key: "position_normal_stop", label: "Position / normal stop" },
  { kind: "standalone", key: "awareness_planning", label: "Awareness / planning" },
  {
    kind: "group",
    slug: "progress",
    title: "Progress",
    items: [
      { key: "appropriate_speed", label: "Appropriate speed" },
      { key: "undue_hesitation", label: "Undue hesitation" },
    ],
  },
  {
    kind: "group",
    slug: "response_to_signs_signals",
    title: "Response to signs / signals",
    items: [
      { key: "traffic_signs", label: "Traffic signs" },
      { key: "road_markings", label: "Road markings" },
      { key: "traffic_lights", label: "Traffic lights" },
      { key: "traffic_controllers", label: "Traffic controllers" },
      { key: "other_road_users", label: "Other road users" },
    ],
  },
  {
    kind: "group",
    slug: "controlled_stop",
    title: "Controlled stop",
    items: [{ key: "controlled_stop", label: "Controlled stop" }],
  },
  {
    kind: "group",
    slug: "show_me_tell_me",
    title: "Show me / Tell me",
    items: [{ key: "questions", label: "Show me / Tell me question(s)" }],
  },
  { kind: "manoeuvres" },
];

function dl25AllKeys(manoeuvreSlug: string): string[] {
  const keys: string[] = [];
  for (const node of DL25_SCHEMA) {
    if (node.kind === "standalone") keys.push(node.key);
    else if (node.kind === "group") {
      for (const it of node.items) keys.push(`${node.slug}_${it.key}`);
    } else {
      keys.push(`manoeuvres_${manoeuvreSlug}_control`);
      keys.push(`manoeuvres_${manoeuvreSlug}_observation`);
    }
  }
  return keys;
}

function DL25Sheet({
  pupilId,
  testDate,
  onClose,
  onSaved,
}: {
  pupilId: string;
  testDate: string;
  onClose: () => void;
  onSaved: (totals: { minor: number; serious: number; dangerous: number }) => void;
}) {
  const [manoeuvre, setManoeuvre] = useState<string>(DL25_MANOEUVRE_OPTIONS[0].value);
  const [marks, setMarks] = useState<FaultMarks>({});
  const [saving, setSaving] = useState(false);

  function setMark(key: string, mark: DL25Mark) {
    setMarks((m) => {
      const next = { ...m };
      if (mark === null) delete next[key];
      else next[key] = mark;
      return next;
    });
  }

  function totals() {
    let minor = 0, serious = 0, dangerous = 0;
    for (const v of Object.values(marks)) {
      if (v === "fault") minor++;
      else if (v === "serious") serious++;
      else if (v === "dangerous") dangerous++;
    }
    return { minor, serious, dangerous };
  }

  async function save() {
    if (saving) return;
    setSaving(true);
    const t = totals();
    // Ensure all schema keys exist in stored blob (nulls filled in)
    const allKeys = dl25AllKeys(manoeuvre);
    const fullMarks: FaultMarks = {};
    for (const k of allKeys) fullMarks[k] = marks[k] ?? null;
    fullMarks["manoeuvres_selected"] = null;
    const payload: Record<string, unknown> = {
      pupil_id: pupilId,
      test_date: testDate,
      fault_marks: { ...fullMarks, manoeuvres_selected: manoeuvre },
    };
    const { error: insertErr } = await supabase.from("dl25_reports").insert(payload);
    if (insertErr) console.error("[dl25] insert error", insertErr);

    const { error: pupilErr } = await supabase
      .from("pupils")
      .update({
        minor_faults: t.minor,
        serious_faults: t.serious,
        dangerous_faults: t.dangerous,
      })
      .eq("id", pupilId);
    if (pupilErr) console.error("[dl25] pupil update error", pupilErr);

    setSaving(false);
    if (insertErr) {
      toast.error("Couldn't save DL25");
      return;
    }
    toast.success("DL25 saved");
    onSaved(t);
  }

  const t = totals();

  return (
    <SheetShell
      title="DL25 REPORT"
      onClose={onClose}
      footer={
        <div className="flex flex-col" style={{ gap: 8 }}>
          <div className="flex items-center justify-between text-[12px]" style={{ color: "#6B7280", ...POPPINS }}>
            <span>Totals</span>
            <span>
              <span style={{ color: "#0B1F3A", fontWeight: 600 }}>{t.minor}</span> minor ·{" "}
              <span style={{ color: "#B5661E", fontWeight: 600 }}>{t.serious}</span> serious ·{" "}
              <span style={{ color: "#CC2229", fontWeight: 600 }}>{t.dangerous}</span> dangerous
            </span>
          </div>
          <div className="grid grid-cols-2" style={{ gap: 8 }}>
            <Button variant="ghost" onClick={onClose} type="button">Cancel</Button>
            <Button onClick={save} disabled={saving} type="button">
              {saving ? "Saving…" : "Save DL25"}
            </Button>
          </div>
        </div>
      }
    >
      <div className="flex flex-col" style={{ gap: 16 }}>
        {DL25_SCHEMA.map((node, idx) => {
          if (node.kind === "standalone") {
            return (
              <DL25ItemRow
                key={node.key}
                label={node.label}
                value={marks[node.key] ?? null}
                onChange={(m) => setMark(node.key, m)}
                faultOnly={node.faultOnly}
              />
            );
          }
          if (node.kind === "group") {
            return (
              <div key={node.slug}>
                <div
                  className="text-[11px] font-semibold tracking-wider mb-2"
                  style={{ color: "#6B7280" }}
                >
                  {node.title.toUpperCase()}
                </div>
                <div className="flex flex-col" style={{ gap: 6 }}>
                  {node.items.map((it) => {
                    const k = `${node.slug}_${it.key}`;
                    return (
                      <DL25ItemRow
                        key={k}
                        label={it.label}
                        value={marks[k] ?? null}
                        onChange={(m) => setMark(k, m)}
                      />
                    );
                  })}
                </div>
              </div>
            );
          }
          // manoeuvres
          return (
            <div key={`man-${idx}`}>
              <div
                className="text-[11px] font-semibold tracking-wider mb-2"
                style={{ color: "#6B7280" }}
              >
                MANOEUVRES
              </div>
              <div className="mb-2">
                <label className="block mb-1 text-[12px] font-medium text-[#6B7280]">
                  Manoeuvre used
                </label>
                <select
                  value={manoeuvre}
                  onChange={(e) => setManoeuvre(e.target.value)}
                  className="w-full px-3 bg-white"
                  style={{
                    height: 44,
                    borderRadius: 8,
                    border: "0.5px solid #EEF2F7",
                    color: "#0B1F3A",
                    fontSize: 14,
                    ...POPPINS,
                  }}
                >
                  {DL25_MANOEUVRE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col" style={{ gap: 6 }}>
                {(["control", "observation"] as const).map((sub) => {
                  const k = `manoeuvres_${manoeuvre}_${sub}`;
                  return (
                    <DL25ItemRow
                      key={k}
                      label={sub === "control" ? "Control" : "Observation"}
                      value={marks[k] ?? null}
                      onChange={(m) => setMark(k, m)}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </SheetShell>
  );
}

function DL25ItemRow({
  label,
  value,
  onChange,
  faultOnly,
}: {
  label: string;
  value: DL25Mark;
  onChange: (m: DL25Mark) => void;
  faultOnly?: boolean;
}) {
  const opts: Array<{ v: DL25Mark; l: string; c: string }> = [
    { v: null, l: "OK", c: "#6B7280" },
    { v: "fault", l: "Fault", c: "#B5661E" },
  ];
  if (!faultOnly) {
    opts.push({ v: "serious", l: "S", c: "#CC2229" });
    opts.push({ v: "dangerous", l: "D", c: "#7A1218" });
  }
  return (
    <div
      className="flex items-center justify-between"
      style={{
        padding: "8px 10px",
        borderRadius: 10,
        border: "0.5px solid #EEF2F7",
        background: "#FFFFFF",
      }}
    >
      <span className="text-[13px] pr-2" style={{ color: "#0B1F3A", ...POPPINS }}>
        {label}
      </span>
      <div className="flex" style={{ gap: 4 }}>
        {opts.map((o) => {
          const active = value === o.v;
          return (
            <button
              key={o.l}
              type="button"
              onClick={() => onChange(o.v)}
              className="text-[12px] font-semibold"
              style={{
                minWidth: 40,
                height: 30,
                padding: "0 8px",
                borderRadius: 8,
                border: `1px solid ${active ? o.c : "#E5E7EB"}`,
                background: active ? o.c : "#FFFFFF",
                color: active ? "#FFFFFF" : o.c,
                ...POPPINS,
              }}
            >
              {o.l}
            </button>
          );
        })}
      </div>
    </div>
  );
}

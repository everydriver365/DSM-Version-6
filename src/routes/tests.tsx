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
        "id, name, test_date, test_time, test_centre, test_examiner, test_status, examiner_first_name, examiner_surname, minor_faults, serious_faults, dangerous_faults, examiner_took_action",
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

function SheetShell({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" style={POPPINS}>
      <div
        className="absolute inset-0"
        style={{ backgroundColor: "rgba(11,31,58,0.5)" }}
        onClick={onClose}
        aria-hidden
      />
      <div
        className="relative w-full bg-white"
        style={{
          borderTopLeftRadius: 16,
          borderTopRightRadius: 16,
          maxHeight: "92vh",
          overflowY: "auto",
          paddingBottom: 24,
        }}
      >
        <div className="flex items-center justify-between px-4 pt-4">
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
        <div className="px-4 pt-2">{children}</div>
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
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!pupilId || !date || saving) return;
    setSaving(true);
    const { error } = await supabase
      .from("pupils")
      .update({
        test_date: date,
        test_time: time || null,
        test_centre: centre || null,
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
    <SheetShell title="ADD TEST" onClose={onClose}>
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
        <Input label="Test centre" value={centre} onChange={(e) => setCentre(e.target.value)} placeholder="e.g. Mill Hill" />

        <div className="mt-2 grid grid-cols-2" style={{ gap: 8 }}>
          <Button variant="ghost" onClick={onClose} type="button">Cancel</Button>
          <Button onClick={save} disabled={!pupilId || !date || saving} type="button">
            {saving ? "Saving…" : "Save"}
          </Button>
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
    <SheetShell title="LOG RESULT" onClose={onClose}>
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

        <div>
          <label className="block mb-1 text-[12px] font-medium text-[#6B7280]">Result</label>
          <div className="grid grid-cols-2" style={{ gap: 8 }}>
            {(["Pass", "Fail"] as const).map((r) => {
              const active = result === r;
              const color = "#1877D6";
              return (
                <button
                  key={r}
                  type="button"
                  onClick={() => setResult(r)}
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
                  {r}
                </button>
              );
            })}
          </div>
        </div>

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

        <div className="mt-2 grid grid-cols-2" style={{ gap: 8 }}>
          <Button variant="ghost" onClick={onClose} type="button">Cancel</Button>
          <Button onClick={save} disabled={saving} type="button">
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>
    </SheetShell>
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

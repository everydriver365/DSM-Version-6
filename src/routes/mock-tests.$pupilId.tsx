import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ClipboardCheck, Mic, MicOff, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { supabase } from "../lib/supabaseClient";

export const Route = createFileRoute("/mock-tests/$pupilId")({
  head: () => ({ meta: [{ title: "Mock tests — DSM by EveryDriver" }] }),
  component: MockTestsPage,
});

const INTER = { fontFamily: "Inter, sans-serif" } as const;

const SUPABASE_URL = "https://bjpqxfrihwjcqprmoqfs.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJqcHF4ZnJpaHdqY3Fwcm1vcWZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0NzQ4MjEsImV4cCI6MjA5NzA1MDgyMX0.HKlgx3dxP3uxX9wMRRUnfb0IPwaBpFcut_iUgT5XFeo";

type MockTest = {
  id: string;
  pupil_id: string;
  instructor_id: string | null;
  test_date: string;
  passed: boolean | null;
  fault_count: number | null;
  serious_faults: number | null;
  dangerous_faults: number | null;
  score: number | null;
  notes: string | null;
  created_at: string | null;
};

async function restHeaders() {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token ?? SUPABASE_ANON_KEY;
  return {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

function fmtDDMMYYYY(iso: string) {
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getFullYear()}`;
}

function todayISO() {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

function useMic(onResult: (t: string) => void) {
  const rRef = useRef<any>(null);
  const [listening, setListening] = useState(false);
  const start = () => {
    const SR: any =
      (typeof window !== "undefined" &&
        ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)) ||
      null;
    if (!SR) {
      toast.error("Voice input not supported in this browser");
      return;
    }
    const r = new SR();
    r.continuous = false;
    r.interimResults = false;
    r.lang = "en-GB";
    r.onresult = (e: any) => {
      const t = e.results?.[0]?.[0]?.transcript ?? "";
      if (t) onResult(t);
    };
    r.onend = () => setListening(false);
    r.onerror = () => setListening(false);
    rRef.current = r;
    setListening(true);
    try {
      r.start();
    } catch {
      setListening(false);
    }
  };
  const stop = () => {
    try {
      rRef.current?.stop();
    } catch {}
    setListening(false);
  };
  return { listening, start, stop };
}

function MicTextarea({
  value,
  onChange,
  placeholder,
  rows = 3,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  const { listening, start, stop } = useMic((t) => onChange(value ? `${value} ${t}` : t));
  return (
    <div className="relative">
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="w-full text-[14px] px-3 py-2 pr-11 rounded-lg border outline-none"
        style={{ borderColor: "#E2E6ED", ...INTER }}
      />
      <button
        type="button"
        onClick={listening ? stop : start}
        aria-label={listening ? "Stop dictation" : "Start dictation"}
        className="absolute right-2 top-2 inline-flex items-center justify-center rounded-full"
        style={{
          width: 32,
          height: 32,
          backgroundColor: listening ? "#0891B2" : "#F3F4F6",
          color: listening ? "#FFFFFF" : "#0F2044",
          border: "none",
        }}
      >
        {listening ? <MicOff size={16} /> : <Mic size={16} />}
      </button>
    </div>
  );
}

function StatCard({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div
      className="flex-1"
      style={{
        backgroundColor: "#FFFFFF",
        border: "0.5px solid #E2E6ED",
        borderRadius: 12,
        padding: 12,
      }}
    >
      <div className="text-[11px]" style={{ color: "#6B7280" }}>
        {label}
      </div>
      <div className="text-[18px] font-semibold mt-1" style={{ color: tone || "#0F2044" }}>
        {value}
      </div>
    </div>
  );
}

function MockTestsPage() {
  const { pupilId } = Route.useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [pupilName, setPupilName] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [tests, setTests] = useState<MockTest[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [addOpen, setAddOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testDate, setTestDate] = useState<string>(todayISO());
  const [passed, setPassed] = useState<boolean | null>(null);
  const [faults, setFaults] = useState<string>("0");
  const [serious, setSerious] = useState<string>("0");
  const [dangerous, setDangerous] = useState<string>("0");
  const [score, setScore] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  const loadTests = async () => {
    const headers = await restHeaders();
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/mock_tests?pupil_id=eq.${encodeURIComponent(pupilId)}&deleted_at=is.null&order=test_date.desc`,
      { headers },
    );
    const data = res.ok ? await res.json() : [];
    setTests(Array.isArray(data) ? (data as MockTest[]) : []);
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const headers = await restHeaders();
      const { data: auth } = await supabase.auth.getUser();
      setUserId(auth.user?.id ?? null);
      try {
        const [pRes] = await Promise.all([
          fetch(
            `${SUPABASE_URL}/rest/v1/pupils?id=eq.${encodeURIComponent(pupilId)}&select=name,first_name,last_name`,
            { headers },
          ),
          loadTests(),
        ]);
        const pJson = pRes.ok ? await pRes.json() : [];
        if (cancelled) return;
        const p = Array.isArray(pJson) ? pJson[0] : null;
        setPupilName(
          p?.name ||
            [(p?.first_name || "").trim(), (p?.last_name || "").trim()].filter(Boolean).join(" ") ||
            "",
        );
      } catch {
        if (!cancelled) toast.error("Could not load mock tests");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pupilId]);

  const stats = useMemo(() => {
    const total = tests.length;
    const passes = tests.filter((t) => t.passed === true).length;
    const rate = total ? Math.round((passes / total) * 100) : 0;
    const sorted = [...tests].sort((a, b) => (b.test_date || "").localeCompare(a.test_date || ""));
    const last = sorted[0] ?? null;
    return { total, rate, last };
  }, [tests]);

  const chartData = useMemo(
    () =>
      [...tests]
        .filter((t) => t.test_date)
        .sort((a, b) => (a.test_date || "").localeCompare(b.test_date || ""))
        .map((t) => ({
          date: fmtDDMMYYYY(t.test_date).slice(0, 5),
          faults: t.fault_count ?? 0,
        })),
    [tests],
  );

  const resetForm = () => {
    setTestDate(todayISO());
    setPassed(null);
    setFaults("0");
    setSerious("0");
    setDangerous("0");
    setScore("");
    setNotes("");
  };

  const submit = async () => {
    if (passed === null) {
      toast.error("Choose Pass or Fail");
      return;
    }
    if (!testDate) {
      toast.error("Pick a test date");
      return;
    }
    setSaving(true);
    try {
      const headers = await restHeaders();
      const body = {
        pupil_id: pupilId,
        instructor_id: userId,
        test_date: testDate,
        passed,
        fault_count: Number(faults) || 0,
        serious_faults: Number(serious) || 0,
        dangerous_faults: Number(dangerous) || 0,
        score: score.trim() === "" ? null : Number(score),
        notes: notes.trim() || null,
      };
      const res = await fetch(`${SUPABASE_URL}/rest/v1/mock_tests`, {
        method: "POST",
        headers: { ...headers, Prefer: "return=representation" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await res.text());
      await loadTests();
      setAddOpen(false);
      resetForm();
      toast.success("Mock test recorded");
    } catch (e: any) {
      toast.error(e?.message || "Could not save mock test");
    } finally {
      setSaving(false);
    }
  };

  const deleteTest = async (id: string) => {
    if (!confirm("Delete this mock test?")) return;
    try {
      const headers = await restHeaders();
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/mock_tests?id=eq.${encodeURIComponent(id)}`,
        {
          method: "PATCH",
          headers,
          body: JSON.stringify({ deleted_at: new Date().toISOString() }),
        },
      );
      if (!res.ok) throw new Error(await res.text());
      setTests((prev) => prev.filter((t) => t.id !== id));
      setExpandedId(null);
      toast.success("Deleted");
    } catch (e: any) {
      toast.error(e?.message || "Could not delete");
    }
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#FFFFFF", ...INTER }}>
      {/* Top bar */}
      <div
        className="sticky top-0 z-10 px-4 py-3 flex items-center gap-3"
        style={{ backgroundColor: "#0F2044", color: "#FFFFFF" }}
      >
        <button
          type="button"
          onClick={() => navigate({ to: "/pupils/$id", params: { id: pupilId } })}
          className="inline-flex items-center justify-center rounded-full"
          style={{
            width: 36,
            height: 36,
            backgroundColor: "rgba(255,255,255,0.12)",
            border: "none",
            color: "#FFFFFF",
          }}
          aria-label="Back"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="text-[15px] font-semibold truncate flex-1">
          Mock tests {pupilName ? `— ${pupilName}` : ""}
        </div>
        <button
          type="button"
          onClick={() => {
            resetForm();
            setAddOpen(true);
          }}
          aria-label="Record mock test"
          className="inline-flex items-center justify-center rounded-full"
          style={{ width: 36, height: 36, backgroundColor: "#0891B2", border: "none", color: "#FFFFFF" }}
        >
          <Plus size={18} />
        </button>
      </div>

      {/* Stats */}
      <div className="p-4 flex gap-2">
        <StatCard label="Tests taken" value={String(stats.total)} />
        <StatCard label="Pass rate" value={`${stats.rate}%`} />
        <StatCard
          label="Last result"
          value={stats.last ? (stats.last.passed ? "Pass ✓" : "Fail ✗") : "—"}
          tone={stats.last ? (stats.last.passed ? "#059669" : "#DC2626") : undefined}
        />
      </div>

      {/* Trend chart */}
      {chartData.length >= 2 && (
        <div className="px-4 pb-2">
          <div
            style={{
              backgroundColor: "#FFFFFF",
              border: "0.5px solid #E2E6ED",
              borderRadius: 12,
              padding: 12,
            }}
          >
            <div className="text-xs font-semibold mb-2" style={{ color: "#0F2044" }}>
              Fault trend
            </div>
            <div style={{ width: "100%", height: 160 }}>
              <ResponsiveContainer>
                <LineChart data={chartData} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#EEF2F7" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#6B7280" }} />
                  <YAxis tick={{ fontSize: 10, fill: "#6B7280" }} allowDecimals={false} />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="faults"
                    stroke="#0891B2"
                    strokeWidth={2}
                    dot={{ r: 3, fill: "#0891B2" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="p-6 text-center text-[13px]" style={{ color: "#6B7280" }}>
          Loading…
        </div>
      ) : tests.length === 0 ? (
        <div className="px-6 py-14 flex flex-col items-center text-center">
          <ClipboardCheck size={56} color="#0891B2" />
          <div className="mt-4 text-[16px] font-bold" style={{ color: "#0F2044" }}>
            No mock tests recorded yet
          </div>
          <div className="mt-2 text-sm max-w-xs mx-auto" style={{ color: "#6B7280" }}>
            Record mock test results to track your pupil's readiness for their practical test.
          </div>
        </div>
      ) : (
        <div className="pt-1 pb-24">
          {tests.map((t) => {
            const isOpen = expandedId === t.id;
            return (
              <div
                key={t.id}
                onClick={() => setExpandedId(isOpen ? null : t.id)}
                style={{
                  backgroundColor: "#FFFFFF",
                  border: "0.5px solid #E2E6ED",
                  borderRadius: 12,
                  padding: 16,
                  marginLeft: 16,
                  marginRight: 16,
                  marginBottom: 8,
                  cursor: "pointer",
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="text-[14px] font-semibold" style={{ color: "#0F2044" }}>
                    {fmtDDMMYYYY(t.test_date)}
                  </div>
                  <span
                    className="text-[11px] font-semibold px-2 py-1 rounded-full"
                    style={{
                      backgroundColor: t.passed ? "#D1FAE5" : "#FEE2E2",
                      color: t.passed ? "#059669" : "#B91C1C",
                    }}
                  >
                    {t.passed ? "PASS" : "FAIL"}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[12px]" style={{ color: "#374151" }}>
                  <span>Faults: <b>{t.fault_count ?? 0}</b></span>
                  <span style={{ color: (t.serious_faults ?? 0) > 0 ? "#DC2626" : "#374151" }}>
                    Serious: <b>{t.serious_faults ?? 0}</b>
                  </span>
                  <span style={{ color: (t.dangerous_faults ?? 0) > 0 ? "#7F1D1D" : "#374151" }}>
                    Dangerous: <b>{t.dangerous_faults ?? 0}</b>
                  </span>
                </div>
                {t.score != null && (
                  <div className="mt-1 text-[12px]" style={{ color: "#0F2044" }}>
                    Score: <b>{t.score}/100</b>
                  </div>
                )}
                {t.notes && (
                  <div className="mt-2 text-[13px] italic" style={{ color: "#6B7280", whiteSpace: "pre-wrap" }}>
                    {t.notes}
                  </div>
                )}
                {isOpen && (
                  <div
                    className="mt-3 flex justify-end"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      onClick={() => deleteTest(t.id)}
                      className="inline-flex items-center gap-1 text-[12px] font-medium px-3 h-8 rounded-lg"
                      style={{ backgroundColor: "#FEE2E2", color: "#B91C1C", border: "none" }}
                    >
                      <Trash2 size={14} />
                      Delete
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Bottom sheet */}
      {addOpen && (
        <div
          className="fixed inset-0 z-40 flex items-end"
          style={{ backgroundColor: "rgba(15,32,68,0.45)" }}
          onClick={() => (saving ? null : setAddOpen(false))}
        >
          <div
            className="w-full"
            style={{
              backgroundColor: "#FFFFFF",
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              maxHeight: "88vh",
              overflowY: "auto",
              paddingBottom: 96,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 pt-3 pb-2 flex items-center justify-between sticky top-0 bg-white z-10">
              <div className="text-[15px] font-semibold" style={{ color: "#0F2044" }}>
                Record mock test
              </div>
              <button
                type="button"
                aria-label="Close"
                onClick={() => setAddOpen(false)}
                className="inline-flex items-center justify-center rounded-full"
                style={{ width: 32, height: 32, backgroundColor: "#F3F4F6", border: "none", color: "#0F2044" }}
              >
                <X size={16} />
              </button>
            </div>
            <div className="px-4 pt-2 space-y-4">
              <div>
                <div className="text-xs font-semibold mb-1" style={{ color: "#0F2044" }}>
                  Test date
                </div>
                <input
                  type="date"
                  value={testDate}
                  onChange={(e) => setTestDate(e.target.value)}
                  className="w-full h-11 px-3 rounded-lg border text-[14px] bg-white"
                  style={{ borderColor: "#E2E6ED", color: "#0F2044" }}
                />
              </div>

              <div>
                <div className="text-xs font-semibold mb-2" style={{ color: "#0F2044" }}>
                  Result
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setPassed(true)}
                    className="flex-1 h-12 rounded-lg text-[14px] font-semibold"
                    style={{
                      backgroundColor: passed === true ? "#10B981" : "#F3F4F6",
                      color: passed === true ? "#FFFFFF" : "#0F2044",
                      border: "none",
                    }}
                  >
                    Pass ✓
                  </button>
                  <button
                    type="button"
                    onClick={() => setPassed(false)}
                    className="flex-1 h-12 rounded-lg text-[14px] font-semibold"
                    style={{
                      backgroundColor: passed === false ? "#DC2626" : "#F3F4F6",
                      color: passed === false ? "#FFFFFF" : "#0F2044",
                      border: "none",
                    }}
                  >
                    Fail ✗
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <div className="text-xs font-semibold mb-1" style={{ color: "#0F2044" }}>
                    Driver faults
                  </div>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={faults}
                    onChange={(e) => setFaults(e.target.value)}
                    className="w-full h-11 px-3 rounded-lg border text-[14px] bg-white"
                    style={{ borderColor: "#E2E6ED", color: "#0F2044" }}
                  />
                </div>
                <div>
                  <div className="text-xs font-semibold mb-1" style={{ color: "#DC2626" }}>
                    Serious
                  </div>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={serious}
                    onChange={(e) => setSerious(e.target.value)}
                    className="w-full h-11 px-3 rounded-lg border text-[14px] bg-white"
                    style={{ borderColor: "#E2E6ED", color: "#0F2044" }}
                  />
                </div>
                <div>
                  <div className="text-xs font-semibold mb-1" style={{ color: "#7F1D1D" }}>
                    Dangerous
                  </div>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={dangerous}
                    onChange={(e) => setDangerous(e.target.value)}
                    className="w-full h-11 px-3 rounded-lg border text-[14px] bg-white"
                    style={{ borderColor: "#E2E6ED", color: "#0F2044" }}
                  />
                </div>
              </div>

              <div>
                <div className="text-xs font-semibold mb-1" style={{ color: "#0F2044" }}>
                  Score (optional)
                </div>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={score}
                  onChange={(e) => setScore(e.target.value)}
                  placeholder="0–100"
                  className="w-full h-11 px-3 rounded-lg border text-[14px] bg-white"
                  style={{ borderColor: "#E2E6ED", color: "#0F2044" }}
                />
              </div>

              <div>
                <div className="text-xs font-semibold mb-1" style={{ color: "#0F2044" }}>
                  Notes (optional)
                </div>
                <MicTextarea
                  value={notes}
                  onChange={setNotes}
                  placeholder="Observations, areas needing more work…"
                />
              </div>

              <button
                type="button"
                disabled={saving}
                onClick={submit}
                className="w-full text-white text-[14px] font-semibold inline-flex items-center justify-center gap-2"
                style={{
                  height: 48,
                  borderRadius: 10,
                  backgroundColor: "#0891B2",
                  border: "none",
                  opacity: saving ? 0.7 : 1,
                }}
              >
                <ClipboardCheck size={16} />
                {saving ? "Saving…" : "Save mock test"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { tokens } from "@/lib/tokens";
import { useEffect, useMemo, useState } from "react";
import {
  IconCalendar,
  IconCheck,
  IconChevronRight,
  IconClipboard,
  IconExternalLink,
  IconInfoCircle,
  IconPlus,
  IconSearch,
  IconX,
} from "@tabler/icons-react";
import DSMTopSheet from "@/components/dsm/DSMTopSheet";
import { EmptyState } from "@/components/dsm/EmptyState";

import { toast } from "sonner";
import { Card } from "../components/dsm/Card";
import { SectionHeader } from "../components/dsm/SectionHeader";
import { Input } from "../components/dsm/Input";
import { Button } from "../components/dsm/Button";
import { supabase } from "../lib/supabaseClient";
import { DL25Sheet } from "./tests";

export const Route = createFileRoute("/mock-tests")({
  head: () => ({
    meta: [{ title: "Mock tests — DSM by EveryDriver" }],
  }),
  validateSearch: (search: Record<string, unknown>): { pupilId?: string } => ({
    pupilId: typeof search.pupilId === "string" ? search.pupilId : "",
  }),
  component: MockTestsPage,
});

const POPPINS = { fontFamily: "Poppins, sans-serif" } as const;

interface Pupil {
  id: string;
  name: string;
}

interface MockTestResult {
  id: string;
  pupil_id: string;
  test_date: string;
  result: string | null;
  minor_faults: number | null;
  serious_faults: number | null;
  dangerous_faults: number | null;
  pupils: { name: string }[] | null;
  fault_marks: Record<string, { fault?: number; serious?: number; dangerous?: number }> | null;
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
  return d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
}

function initials(name: string) {
  const parts = (name ?? "").trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const second = parts[1]?.[0] ?? "";
  return (first + second).toUpperCase() || "?";
}

function MockTestsPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const [userId, setUserId] = useState<string | null>(null);
  const [pupils, setPupils] = useState<Pupil[]>([]);
  const [results, setResults] = useState<MockTestResult[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [dl25Args, setDl25Args] = useState<{ pupilId: string; testDate: string } | null>(null);
  const [viewingDl25, setViewingDl25] = useState<MockTestResult | null>(null);
  const [resultPrompt, setResultPrompt] = useState<{
    pupilId: string;
    testDate: string;
  } | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user) setUserId(data.user.id);
    })();
  }, []);

  async function loadPupils(uid: string) {
    const { data, error } = await supabase
      .from("pupils")
      .select("id, name")
      .eq("instructor_id", uid)
      .is("deleted_at", null)
      .order("name", { ascending: true });
    if (error) console.error("[mock-tests] pupils fetch error", error);
    setPupils((data ?? []) as Pupil[]);
  }

  async function loadResults(uid: string) {
    const { data, error } = await supabase
      .from("mock_test_results")
      .select("id, pupil_id, test_date, result, minor_faults, serious_faults, dangerous_faults, fault_marks, pupils(name)")
      .eq("instructor_id", uid)
      .order("test_date", { ascending: false });
    if (error) console.error("[mock-tests] results fetch error", error);
    setResults((data ?? []) as unknown as MockTestResult[]);
  }

  useEffect(() => {
    if (!userId) return;
    loadPupils(userId);
    loadResults(userId);
  }, [userId]);

  useEffect(() => {
    if (search.pupilId) setAddOpen(true);
  }, [search.pupilId]);

  async function handleSetResult(passed: boolean) {
    if (!userId || !resultPrompt) return;
    const { data: rows, error } = await supabase
      .from("mock_test_results")
      .select("id")
      .eq("instructor_id", userId)
      .eq("pupil_id", resultPrompt.pupilId)
      .eq("test_date", resultPrompt.testDate)
      .order("created_at", { ascending: false })
      .limit(1);
    if (error || !rows || rows.length === 0) {
      console.error("[mock-tests] find latest error", error);
      toast.error("Couldn't find mock test record");
      setResultPrompt(null);
      return;
    }
    const latestId = (rows[0] as { id: string }).id;
    const { error: updateErr } = await supabase
      .from("mock_test_results")
      .update({ result: passed ? "Passed" : "Failed" })
      .eq("id", latestId);
    if (updateErr) {
      console.error("[mock-tests] result update error", updateErr);
      toast.error("Couldn't update result");
    } else {
      toast.success(passed ? "Marked as passed" : "Marked as failed");
      loadResults(userId);
    }
    setResultPrompt(null);
  }

  return (
    <DSMTopSheet title="Mock Tests">
      <div style={POPPINS}>
        {/* Action bar */}
        <div
          className="flex items-center justify-end"
          style={{ background: tokens.white, padding: "12px 16px", borderBottom: "1px solid #EEF2F7" }}
        >
          <div className="flex items-center" style={{ gap: 10 }}>
            <button
              type="button"
              onClick={() => setAddOpen(true)}
              className="inline-flex items-center justify-center"
              style={{ width: 36, height: 36, borderRadius: 999, background: tokens.blue, border: "none" }}
            >
              <IconPlus stroke={2} size={18} color="#FFFFFF" />
            </button>
            <button
              type="button"
              className="inline-flex items-center justify-center"
              style={{ width: 36, height: 36, borderRadius: 999, background: "#EEF2F7", border: "none" }}
            >
              <IconSearch stroke={1.5} size={18} color="#6B7280" />
            </button>
          </div>
        </div>

        <div className="px-4 pt-4">
          <div className="flex items-center justify-between" style={{ marginBottom: 12 }}>
            <div className="flex items-center" style={{ gap: 8 }}>
              <div style={{ width: 4, height: 18, borderRadius: 2, background: tokens.blue }} />
              <span className="text-[15px] font-semibold" style={{ color: tokens.navy, ...POPPINS }}>
                Mock test history
              </span>
              <IconInfoCircle stroke={1.5} size={16} color="#9CA3AF" />
            </div>
          </div>

          {results.length === 0 ? (
            <EmptyState
              icon={<IconClipboard size={32} color="#9CA3AF" stroke={1.5} />}
              title="No mock tests yet"
              subtitle="Log a mock test to track pupil progress"
            />
          ) : (
            <div className="flex flex-col" style={{ gap: 10 }}>
              {results.map((r) => {
                const name = (Array.isArray(r.pupils) ? r.pupils[0]?.name : (r.pupils as any)?.name) ?? "Unknown pupil";
                const result = r.result ?? "Result not set";
                const passed = result === "Passed";
                const failed = result === "Failed";
                const resultBg = passed ? "#DCFCE7" : failed ? "#FEE2E2" : "#F3F4F6";
                const resultColor = passed ? "#166534" : failed ? "#991B1B" : "#6B7280";
                const resultIcon = passed ? <IconCheck size={14} color={resultColor} stroke={2.5} /> : failed ? <IconX size={14} color={resultColor} stroke={2.5} /> : null;
                return (
                  <Card key={r.id} style={{ padding: 14 }}>
                    <div className="flex items-start" style={{ gap: 12 }}>
                      <div
                        className="flex items-center justify-center text-white text-[14px] font-bold shrink-0"
                        style={{ width: 44, height: 44, borderRadius: 999, backgroundColor: tokens.blue, ...POPPINS }}
                      >
                        {initials(name)}
                      </div>
                      <div className="flex-1 min-w-0" style={{ paddingTop: 2 }}>
                        <div className="flex items-start justify-between" style={{ gap: 8 }}>
                          <div className="text-[15px] font-semibold" style={{ color: tokens.navy, ...POPPINS }}>
                            {name}
                          </div>
                          <span
                            className="inline-flex items-center gap-1 text-[11px] font-semibold shrink-0"
                            style={{ backgroundColor: resultBg, color: resultColor, padding: "4px 10px", borderRadius: 999, ...POPPINS }}
                          >
                            {resultIcon}
                            {result}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 mt-1" style={{ color: "#6B7280", ...POPPINS }}>
                          <IconCalendar stroke={1.5} size={14} color="#9CA3AF" />
                          <span className="text-[13px] font-medium">{formatDateLong(r.test_date)}</span>
                        </div>
                        {failed && (
                          <div className="text-[12px] mt-1" style={{ color: "#6B7280", ...POPPINS }}>
                            {r.minor_faults ?? 0} minor · {r.serious_faults ?? 0} serious · {r.dangerous_faults ?? 0} dangerous
                          </div>
                        )}
                        {hasFaultMarks(r.fault_marks) && (
                          <button
                            type="button"
                            onClick={() => setViewingDl25(r)}
                            className="inline-flex items-center gap-1 text-[13px] font-semibold mt-2"
                            style={{ color: tokens.blue, background: "none", border: "none", padding: 0, ...POPPINS }}
                          >
                            View DL25
                            <IconExternalLink stroke={1.5} size={14} color={tokens.blue} />
                          </button>
                        )}
                      </div>
                      <div className="shrink-0 self-center" style={{ marginLeft: 4 }}>
                        <IconChevronRight stroke={1.5} size={20} color="#9CA3AF" />
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

      {addOpen && (
        <NewMockTestSheet
          pupils={pupils}
          initialPupilId={search.pupilId ?? ""}
          onClose={() => setAddOpen(false)}
          onStart={({ pupilId, testDate }) => {
            setAddOpen(false);
            setDl25Args({ pupilId, testDate });
          }}
        />
      )}

      {dl25Args && (
        <DL25Sheet
          pupilId={dl25Args.pupilId}
          testDate={dl25Args.testDate}
          mode="mock"
          onClose={() => setDl25Args(null)}
          onSaved={(totals) => {
            setDl25Args(null);
            setResultPrompt({ pupilId: dl25Args.pupilId, testDate: dl25Args.testDate });
            if (userId) loadResults(userId);
            void totals;
          }}
        />
      )}

      {viewingDl25 && (
        <DL25Sheet
          pupilId={viewingDl25.pupil_id}
          testDate={viewingDl25.test_date}
          readOnly
          initialMarks={(viewingDl25.fault_marks ?? {}) as never}
          onClose={() => setViewingDl25(null)}
          onSaved={() => setViewingDl25(null)}
        />
      )}

      {resultPrompt && (
        <ResultPromptSheet
          onClose={() => setResultPrompt(null)}
          onPass={() => handleSetResult(true)}
          onFail={() => handleSetResult(false)}
        />
      )}
      </div>
    </DSMTopSheet>
  );
}

function hasFaultMarks(fm: MockTestResult["fault_marks"]) {
  if (!fm) return false;
  return Object.keys(fm).length > 0;
}


function NewMockTestSheet({
  pupils,
  initialPupilId,
  onClose,
  onStart,
}: {
  pupils: Pupil[];
  initialPupilId: string;
  onClose: () => void;
  onStart: (p: { pupilId: string; testDate: string }) => void;
}) {
  const [pupilId, setPupilId] = useState(initialPupilId);
  const [date, setDate] = useState(todayYmd());
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const selectedPupil = pupils.find((p) => p.id === pupilId);

  useEffect(() => {
    if (initialPupilId) setPupilId(initialPupilId);
  }, [initialPupilId]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return pupils;
    return pupils.filter((p) => p.name.toLowerCase().includes(q));
  }, [search, pupils]);

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
            NEW MOCK TEST
          </span>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="flex items-center justify-center"
            style={{ width: 32, height: 32 }}
          >
            <IconX stroke={1.5} size={18} color="#6B7280" />
          </button>
        </div>
        <div className="px-4 pt-2 pb-4 overflow-y-auto" style={{ flex: 1, minHeight: 0 }}>
          <div className="flex flex-col" style={{ gap: 12 }}>
            <div style={{ position: "relative" }}>
              <label className="block mb-1 text-[12px] font-medium text-[#6B7280]">Pupil</label>
              <div
                className="w-full flex items-center px-3 bg-white"
                style={{
                  height: 44,
                  borderRadius: 12,
                  border: "0.5px solid #EEF2F7",
                }}
              >
                <IconSearch stroke={1.5} size={16} color="#6B7280" style={{ marginRight: 8 }} />
                <input
                  type="text"
                  value={selectedPupil ? selectedPupil.name : search}
                  placeholder="Select pupil…"
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPupilId("");
                    setOpen(true);
                  }}
                  onFocus={() => setOpen(true)}
                  className="w-full bg-transparent outline-none text-[14px]"
                  style={{ color: tokens.navy, ...POPPINS }}
                />
                {selectedPupil && (
                  <button
                    type="button"
                    onClick={() => {
                      setPupilId("");
                      setSearch("");
                      setOpen(true);
                    }}
                    className="flex items-center justify-center"
                    style={{ marginLeft: 8 }}
                  >
                    <IconX stroke={1.5} size={16} color="#6B7280" />
                  </button>
                )}
              </div>
              {open && !selectedPupil && (
                <div
                  style={{
                    position: "absolute",
                    top: "100%",
                    left: 0,
                    right: 0,
                    marginTop: 4,
                    background: tokens.white,
                    border: "1px solid #EEF2F7",
                    borderRadius: tokens.radiusCard,
                    boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                    zIndex: 20,
                    maxHeight: 220,
                    overflowY: "auto",
                  }}
                >
                  {!pupilId && filtered.length > 0 && (
                    <div
                      className="px-3 py-2 text-[12px]"
                      style={{ color: tokens.textMuted, ...POPPINS }}
                    >
                      Select pupil…
                    </div>
                  )}
                  {filtered.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        setPupilId(p.id);
                        setSearch(p.name);
                        setOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 text-[14px]"
                      style={{ color: tokens.navy, ...POPPINS }}
                    >
                      {p.name}
                    </button>
                  ))}
                  {filtered.length === 0 && (
                    <div
                      className="px-3 py-2 text-[12px]"
                      style={{ color: tokens.textMuted, ...POPPINS }}
                    >
                      No pupils found
                    </div>
                  )}
                </div>
              )}
            </div>

            <Input
              label="Test date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />

            <button
              type="button"
              onClick={() => onStart({ pupilId, testDate: date })}
              disabled={!pupilId || !date}
              className="w-full flex items-center justify-center text-[13px] font-semibold"
              style={{
                height: 44,
                borderRadius: 12,
                border: "1px dashed #1877D6",
                color: tokens.blue,
                background: "#F4F8FE",
                opacity: !pupilId || !date ? 0.5 : 1,
                ...POPPINS,
              }}
            >
              Start DL25
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ResultPromptSheet({
  onClose,
  onPass,
  onFail,
}: {
  onClose: () => void;
  onPass: () => void;
  onFail: () => void;
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
            MOCK TEST RESULT
          </span>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="flex items-center justify-center"
            style={{ width: 32, height: 32 }}
          >
            <IconX stroke={1.5} size={18} color="#6B7280" />
          </button>
        </div>
        <div className="px-4 pt-2 pb-4 overflow-y-auto" style={{ flex: 1, minHeight: 0 }}>
          <p className="text-[14px] mb-4" style={{ color: tokens.navy, ...POPPINS }}>
            How did the mock test go?
          </p>
          <div className="grid grid-cols-2" style={{ gap: 8 }}>
            <Button variant="ghost" onClick={onFail} type="button">
              Fail
            </Button>
            <Button onClick={onPass} type="button">
              Pass
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default MockTestsPage;

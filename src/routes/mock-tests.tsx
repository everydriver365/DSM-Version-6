import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Plus, Search, X } from "lucide-react";
import { toast } from "sonner";
import { Card } from "../components/dsm/Card";
import { SectionHeader } from "../components/dsm/SectionHeader";
import { Input } from "../components/dsm/Input";
import { Button } from "../components/dsm/Button";
import { supabase } from "../lib/supabaseClient";
import { PageLayout } from "@/components/PageLayout";
import { DL25Sheet } from "./tests";

export const Route = createFileRoute("/mock-tests")({
  head: () => ({
    meta: [{ title: "Mock tests — DSM by EveryDriver" }],
  }),
  component: MockTestsPage,
});

const POPPINS = { fontFamily: "Inter, sans-serif" } as const;

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
  const [userId, setUserId] = useState<string | null>(null);
  const [pupils, setPupils] = useState<Pupil[]>([]);
  const [results, setResults] = useState<MockTestResult[]>([]);
  const [addOpen, setAddOpen] = useState(false);
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
      .select("id, pupil_id, test_date, result, minor_faults, serious_faults, dangerous_faults, pupils(name)")
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

  async function handleSetResult(passed: boolean) {
    if (!userId || !resultPrompt) return;
    const { error } = await supabase
      .from("mock_test_results")
      .update({ result: passed ? "Passed" : "Failed" })
      .eq("instructor_id", userId)
      .eq("pupil_id", resultPrompt.pupilId)
      .eq("test_date", resultPrompt.testDate)
      .order("created_at", { ascending: false })
      .limit(1);
    if (error) {
      console.error("[mock-tests] result update error", error);
      toast.error("Couldn't update result");
    } else {
      toast.success(passed ? "Marked as passed" : "Marked as failed");
      loadResults(userId);
    }
    setResultPrompt(null);
  }

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
          Mock tests
        </div>
        <button
          type="button"
          aria-label="New mock test"
          onClick={() => setAddOpen(true)}
          className="flex items-center justify-center"
          style={{ width: 40, height: 40 }}
        >
          <Plus size={22} color="#FFFFFF" />
        </button>
      </div>

      <div className="px-4 pt-4">
        <SectionHeader>Mock test history</SectionHeader>
        {results.length === 0 ? (
          <EmptyState text="No mock tests logged yet" />
        ) : (
          <div className="flex flex-col" style={{ gap: 8 }}>
            {results.map((r) => {
              const name = r.pupils?.name ?? "Unknown pupil";
              const total = (r.minor_faults ?? 0) + (r.serious_faults ?? 0) + (r.dangerous_faults ?? 0);
              const result = r.result ?? "Result not set";
              const resultColor =
                r.result === "Passed" ? "#1E8E5A" : r.result === "Failed" ? "#CC2229" : "#6B7280";
              return (
                <Card key={r.id}>
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
                        <span
                          className="text-[11px] font-semibold text-white shrink-0"
                          style={{ backgroundColor: resultColor, padding: "3px 10px", borderRadius: 999, ...POPPINS }}
                        >
                          {result}
                        </span>
                      </div>
                      <div className="text-[13px] font-bold mt-1" style={{ color: "#0B1F3A", ...POPPINS }}>
                        {formatDateLong(r.test_date)}
                      </div>
                      {total > 0 && (
                        <div className="text-[12px] mt-1" style={{ color: "#6B7280", ...POPPINS }}>
                          {r.minor_faults ?? 0} minor · {r.serious_faults ?? 0} serious · {r.dangerous_faults ?? 0} dangerous
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {addOpen && userId && (
        <NewMockTestSheet
          pupils={pupils}
          onClose={() => setAddOpen(false)}
          onStart={({ pupilId, testDate }) => {
            setAddOpen(false);
            setResultPrompt({ pupilId, testDate });
          }}
        />
      )}

      {resultPrompt && (
        <ResultPromptSheet
          onClose={() => setResultPrompt(null)}
          onPass={() => handleSetResult(true)}
          onFail={() => handleSetResult(false)}
        />
      )}
    </PageLayout>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div
      style={{
        background: "#FFFFFF",
        borderRadius: 10,
        boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
        padding: "10px 14px",
        fontSize: 12,
        color: "#9CA3AF",
      }}
    >
      {text}
    </div>
  );
}

function NewMockTestSheet({
  pupils,
  onClose,
  onStart,
}: {
  pupils: Pupil[];
  onClose: () => void;
  onStart: (p: { pupilId: string; testDate: string }) => void;
}) {
  const [pupilId, setPupilId] = useState("");
  const [date, setDate] = useState(todayYmd());
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const selectedPupil = pupils.find((p) => p.id === pupilId);

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
            <X size={18} color="#6B7280" />
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
                  borderRadius: 8,
                  border: "0.5px solid #EEF2F7",
                }}
              >
                <Search size={16} color="#6B7280" style={{ marginRight: 8 }} />
                <input
                  type="text"
                  value={selectedPupil ? selectedPupil.name : search}
                  placeholder="Search pupils…"
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPupilId("");
                    setOpen(true);
                  }}
                  onFocus={() => setOpen(true)}
                  className="w-full bg-transparent outline-none text-[14px]"
                  style={{ color: "#0B1F3A", ...POPPINS }}
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
                    <X size={16} color="#6B7280" />
                  </button>
                )}
              </div>
              {open && filtered.length > 0 && !selectedPupil && (
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
                    maxHeight: 220,
                    overflowY: "auto",
                  }}
                >
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
                      style={{ color: "#0B1F3A", ...POPPINS }}
                    >
                      {p.name}
                    </button>
                  ))}
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
                borderRadius: 10,
                border: "1px dashed #1877D6",
                color: "#1877D6",
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
  const [dl25Open, setDl25Open] = useState(false);
  const [dl25Args, setDl25Args] = useState<{ pupilId: string; testDate: string } | null>(null);

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
            <X size={18} color="#6B7280" />
          </button>
        </div>
        <div className="px-4 pt-2 pb-4 overflow-y-auto" style={{ flex: 1, minHeight: 0 }}>
          <p className="text-[14px] mb-4" style={{ color: "#0B1F3A", ...POPPINS }}>
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

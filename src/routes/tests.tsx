import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Plus, X, GraduationCap } from "lucide-react";
import { toast } from "sonner";
import { Card } from "../components/dsm/Card";
import { SectionHeader } from "../components/dsm/SectionHeader";
import { Input } from "../components/dsm/Input";
import { Button } from "../components/dsm/Button";
import { supabase } from "../lib/supabaseClient";

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

interface DrivingTest {
  id: string;
  pupil_id: string;
  test_date: string;
  test_time: string | null;
  test_centre: string | null;
  result: string | null;
  faults: number | null;
  result_notes: string | null;
  result_logged_at: string | null;
  pupils: { id: string; name: string } | null;
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
      .from("driving_tests")
      .select(
        "id, pupil_id, test_date, test_time, test_centre, result, faults, result_notes, result_logged_at, pupils(id, name)",
      )
      .eq("instructor_id", uid)
      .order("test_date", { ascending: true });
    if (error) console.error("[tests] fetch error", error);
    setTests((data ?? []) as unknown as DrivingTest[]);
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
  const upcoming = tests.filter((t) => t.test_date >= today);
  const past = tests.filter((t) => t.test_date < today).reverse();

  return (
    <div className="min-h-screen bg-white pb-8" style={POPPINS}>
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
        <SectionHeader>UPCOMING TESTS</SectionHeader>
        {upcoming.length === 0 ? (
          <EmptyState text="No upcoming tests" />
        ) : (
          <div className="flex flex-col" style={{ gap: 8 }}>
            {upcoming.map((t) => (
              <TestCard
                key={t.id}
                test={t}
                showDaysBadge
                onLogResult={() => setResultFor(t)}
              />
            ))}
          </div>
        )}

        <SectionHeader>PAST TESTS</SectionHeader>
        {past.length === 0 ? (
          <EmptyState text="No past tests" />
        ) : (
          <div className="flex flex-col" style={{ gap: 8 }}>
            {past.map((t) => (
              <TestCard key={t.id} test={t} pastProminent />
            ))}
          </div>
        )}
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
    </div>
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
  const resultColor = test.result === "Pass" ? "#16A34A" : test.result === "Fail" ? "#CC2229" : null;

  return (
    <Card>
      <div className="flex items-start" style={{ gap: 12 }}>
        <div
          className="flex items-center justify-center text-white text-[13px] font-semibold shrink-0"
          style={{ width: 40, height: 40, borderRadius: 999, backgroundColor: "#00A3B4", ...POPPINS }}
        >
          {initials(name)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between" style={{ gap: 8 }}>
            <div className="text-[14px] font-semibold truncate" style={{ color: "#0A2540", ...POPPINS }}>
              {name}
            </div>
            {showDaysBadge && (
              <span
                className="text-[11px] font-medium shrink-0"
                style={{
                  color: "#00A3B4",
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
          <div className="text-[13px] font-bold mt-1" style={{ color: "#0A2540", ...POPPINS }}>
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
                      border: "1px solid #00A3B4",
                      color: "#00A3B4",
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
        style={{ backgroundColor: "rgba(15,32,68,0.5)" }}
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
    const { error } = await supabase.from("driving_tests").insert({
      instructor_id: userId,
      pupil_id: pupilId,
      test_date: date,
      test_time: time || null,
      test_centre: centre || null,
    });
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
              color: "#1A1A2E",
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
  const [faults, setFaults] = useState("0");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    if (saving) return;
    setSaving(true);
    const { error } = await supabase
      .from("driving_tests")
      .update({
        result,
        faults: parseInt(faults, 10) || 0,
        result_notes: notes || null,
        result_logged_at: new Date().toISOString(),
      })
      .eq("id", test.id);
    setSaving(false);
    if (error) {
      console.error("[tests] result update error", error);
      toast.error("Couldn't save result");
      return;
    }
    toast.success("Result logged");
    onSaved();
  }

  return (
    <SheetShell title="LOG RESULT" onClose={onClose}>
      <div className="flex flex-col" style={{ gap: 12 }}>
        <div
          className="rounded-[12px] p-3"
          style={{ backgroundColor: "#F3F4F6" }}
        >
          <div className="text-[14px] font-semibold" style={{ color: "#0A2540" }}>
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
              const color = r === "Pass" ? "#16A34A" : "#CC2229";
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

        <Input
          label="Faults"
          type="number"
          inputMode="numeric"
          min={0}
          value={faults}
          onChange={(e) => setFaults(e.target.value)}
        />

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
              color: "#1A1A2E",
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

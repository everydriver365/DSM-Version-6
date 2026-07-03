import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Calendar as CalendarIcon,
  ChevronDown,
  ChevronUp,
  MapPin,
  Mic,
  MicOff,
  Check,
  Plus,
  Search,
  Trophy,
  User,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "../lib/supabaseClient";

export const Route = createFileRoute("/driving-test/$pupilId")({
  head: () => ({ meta: [{ title: "Test report — DSM by EveryDriver" }] }),
  component: DrivingTestPage,
});

const INTER = { fontFamily: "Inter, sans-serif" } as const;

const SUPABASE_URL = "https://bjpqxfrihwjcqprmoqfs.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJqcHF4ZnJpaHdqY3Fwcm1vcWZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0NzQ4MjEsImV4cCI6MjA5NzA1MDgyMX0.HKlgx3dxP3uxX9wMRRUnfb0IPwaBpFcut_iUgT5XFeo";

async function restHeaders() {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token ?? SUPABASE_ANON_KEY;
  return {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

async function awardPoints(instructorId: string, event: string, token: string, metadata?: any) {
  try {
    await fetch(`${SUPABASE_URL}/functions/v1/award-points`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        apikey: SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({ instructorId, event, metadata }),
    });
  } catch (err) {
    console.warn("[rewards] award-points failed:", err);
  }
}

function todayISO() {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

function fmtDate(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getFullYear()}`;
}

type DL25Category = { id: string; name: string; subs?: string[] };

const DL25: DL25Category[] = [
  { id: "eyesight", name: "1. Eyesight check" },
  { id: "hwy_safety", name: "2. Highway code / safety margins" },
  { id: "controlled_stop", name: "3. Controlled stop" },
  { id: "move_off", name: "4. Move off", subs: ["Safety", "Control"] },
  { id: "emergency_stop", name: "5. Emergency stop" },
  {
    id: "mirrors",
    name: "6. Mirrors — rear observation",
    subs: ["Signalling", "Change direction", "Change speed"],
  },
  { id: "signals", name: "7. Signals", subs: ["Necessary", "Correctly", "Timed"] },
  {
    id: "response_signs",
    name: "8. Response to signs",
    subs: ["Traffic signs", "Road markings", "Traffic lights", "Traffic controllers", "Other road users"],
  },
  { id: "use_of_speed", name: "9. Use of speed" },
  { id: "following_distance", name: "10. Following distance" },
  {
    id: "progress",
    name: "11. Maintain progress",
    subs: ["Appropriate speed", "Undue hesitation"],
  },
  {
    id: "junctions",
    name: "12. Junctions",
    subs: ["Approach speed", "Observation", "Turning right", "Turning left", "Cutting corners"],
  },
  {
    id: "judgement",
    name: "13. Judgement",
    subs: ["Overtaking", "Meeting", "Crossing"],
  },
  {
    id: "positioning",
    name: "14. Positioning",
    subs: ["Normal driving", "Lane discipline"],
  },
  { id: "ped_crossings", name: "15. Pedestrian crossings" },
  { id: "normal_stops", name: "16. Position / normal stops" },
  { id: "awareness", name: "17. Awareness / planning" },
  { id: "ancillary", name: "18. Ancillary controls" },
  { id: "reverse_left", name: "19. Reverse left", subs: ["Control", "Observation"] },
  { id: "reverse_right", name: "20. Reverse right", subs: ["Control", "Observation"] },
  { id: "reverse_park_road", name: "21. Reverse park (road)", subs: ["Control", "Observation"] },
  { id: "reverse_park_carpark", name: "22. Reverse park (car park)", subs: ["Control", "Observation"] },
  { id: "forward_bay", name: "23. Forward bay park", subs: ["Control", "Observation"] },
  { id: "turn_in_road", name: "24. Turn in road", subs: ["Control", "Observation"] },
  { id: "vehicle_checks", name: "25. Vehicle checks", subs: ["Show me", "Tell me"] },
];

type FaultCell = { d: number; s: number; dn: number };
type FaultMap = Record<string, Record<string, FaultCell>>;

type TestCentre = { id: string; name: string; town: string | null };
type Examiner = { id: string; name: string };

type TestResult = {
  id: string;
  pupil_id: string;
  instructor_id: string | null;
  test_type: string | null;
  test_date: string;
  test_time: string | null;
  transmission: string | null;
  application_ref: string | null;
  adi_number: string | null;
  test_centre_id: string | null;
  test_centre_name: string | null;
  examiner_id: string | null;
  examiner_name: string | null;
  eta: boolean | null;
  result: string | null;
  fault_count: number | null;
  serious_faults: number | null;
  dangerous_faults: number | null;
  faults_detail: FaultMap | null;
  notes: string | null;
  created_at: string | null;
};

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
    r.start();
  };
  const stop = () => {
    try {
      rRef.current?.stop();
    } catch {}
    setListening(false);
  };
  return { listening, start, stop };
}

function DrivingTestPage() {
  const { pupilId } = Route.useParams();
  const navigate = useNavigate();
  const [pupilName, setPupilName] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [tab, setTab] = useState<"record" | "history">("record");

  // form state
  const [testType, setTestType] = useState<"mock" | "practical">("practical");
  const [testDate, setTestDate] = useState(todayISO());
  const [testTime, setTestTime] = useState("");
  const [transmission, setTransmission] = useState<"manual" | "automatic">("manual");
  const [applicationRef, setApplicationRef] = useState("");
  const [adiNumber, setAdiNumber] = useState("");
  const [centres, setCentres] = useState<TestCentre[]>([]);
  const [centreId, setCentreId] = useState<string | null>(null);
  const [centreName, setCentreName] = useState("");
  const [addingCentre, setAddingCentre] = useState(false);
  const [newCentre, setNewCentre] = useState({ name: "", town: "", postcode: "" });
  const [centreSearch, setCentreSearch] = useState("");
  const [showCentreDropdown, setShowCentreDropdown] = useState(false);
  const [selectedCentre, setSelectedCentre] = useState<{ id: string; name: string; town: string } | null>(null);
  const [examiners, setExaminers] = useState<Examiner[]>([]);
  const [examinerId, setExaminerId] = useState<string | null>(null);
  const [examinerName, setExaminerName] = useState("");
  const [addingExaminer, setAddingExaminer] = useState(false);
  const [newExaminer, setNewExaminer] = useState("");
  const [eta, setEta] = useState(false);
  const [result, setResult] = useState<"pass" | "fail" | "terminated" | "">("");
  const [driverFaults, setDriverFaults] = useState(0);
  const [seriousFaults, setSeriousFaults] = useState(0);
  const [dangerousFaults, setDangerousFaults] = useState(0);
  const [dl25Open, setDl25Open] = useState(false);
  const [faults, setFaults] = useState<FaultMap>({});
  const [notes, setNotes] = useState("");
  const notesMic = useMic((t) => setNotes((p) => (p ? p + " " + t : t)));
  const [saving, setSaving] = useState(false);

  const [history, setHistory] = useState<TestResult[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: s } = await supabase.auth.getSession();
      const uid = s.session?.user?.id ?? null;
      setUserId(uid);
      const headers = await restHeaders();
      // pupil
      try {
        const r = await fetch(
          `${SUPABASE_URL}/rest/v1/pupils?id=eq.${pupilId}&select=name,first_name,last_name`,
          { headers },
        );
        const j = await r.json();
        const p = Array.isArray(j) ? j[0] : null;
        if (p) {
          setPupilName(
            p.name ??
              [p.first_name, p.last_name].filter(Boolean).join(" ") ??
              "",
          );
        }
      } catch {}
      // centres
      try {
        const r = await fetch(
          `${SUPABASE_URL}/rest/v1/test_centres?select=id,name,town&order=name.asc`,
          { headers },
        );
        if (r.ok) setCentres(await r.json());
      } catch {}
      // examiners
      if (uid) {
        try {
          const r = await fetch(
            `${SUPABASE_URL}/rest/v1/examiners?instructor_id=eq.${uid}&select=id,name&order=name.asc`,
            { headers },
          );
          if (r.ok) setExaminers(await r.json());
        } catch {}
      }
      await loadHistory();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pupilId]);

  async function loadHistory() {
    const headers = await restHeaders();
    try {
      const r = await fetch(
        `${SUPABASE_URL}/rest/v1/driving_test_results?pupil_id=eq.${pupilId}&deleted_at=is.null&order=test_date.desc`,
        { headers },
      );
      if (r.ok) setHistory(await r.json());
    } catch {}
  }

  function bump(catId: string, subKey: string, col: "d" | "s" | "dn", delta: number) {
    setFaults((prev) => {
      const cat = { ...(prev[catId] ?? {}) };
      const existing = cat[subKey] ?? { d: 0, s: 0, dn: 0 };
      const next = Math.max(0, (existing[col] ?? 0) + delta);
      cat[subKey] = { ...existing, [col]: next };
      return { ...prev, [catId]: cat };
    });
  }
  function reset(catId: string, subKey: string) {
    setFaults((prev) => {
      const cat = { ...(prev[catId] ?? {}) };
      cat[subKey] = { d: 0, s: 0, dn: 0 };
      return { ...prev, [catId]: cat };
    });
  }

  const faultTotal = driverFaults + seriousFaults + dangerousFaults;

  async function addCentre() {
    if (!newCentre.name.trim()) return;
    const headers = await restHeaders();
    try {
      const r = await fetch(`${SUPABASE_URL}/rest/v1/test_centres`, {
        method: "POST",
        headers: { ...headers, Prefer: "return=representation" },
        body: JSON.stringify({
          name: newCentre.name.trim(),
          town: newCentre.town.trim() || null,
          postcode: newCentre.postcode.trim() || null,
        }),
      });
      if (r.ok) {
        const j = await r.json();
        const c = Array.isArray(j) ? j[0] : j;
        setCentres((cs) => [...cs, { id: c.id, name: c.name, town: c.town ?? null }]);
        setCentreId(c.id);
        setCentreName(c.name);
        setAddingCentre(false);
        setNewCentre({ name: "", town: "", postcode: "" });
      } else {
        toast.error("Could not add centre");
      }
    } catch {
      toast.error("Could not add centre");
    }
  }

  async function addCentreByName(name: string) {
    const trimmed = name.trim();
    if (!trimmed) return;
    const headers = await restHeaders();
    try {
      const r = await fetch(`${SUPABASE_URL}/rest/v1/test_centres`, {
        method: "POST",
        headers: { ...headers, Prefer: "return=representation" },
        body: JSON.stringify({ name: trimmed, town: null, postcode: null }),
      });
      if (r.ok) {
        const j = await r.json();
        const c = Array.isArray(j) ? j[0] : j;
        const centre = { id: c.id, name: c.name, town: c.town ?? null };
        setCentres((cs) => [...cs, centre]);
        setCentreId(c.id);
        setCentreName(c.name);
        setSelectedCentre({ id: c.id, name: c.name, town: c.town ?? "" });
        setCentreSearch(c.name);
        setShowCentreDropdown(false);
      } else {
        toast.error("Could not add centre");
      }
    } catch {
      toast.error("Could not add centre");
    }
  }

  async function addExaminer() {
    if (!newExaminer.trim() || !userId) return;
    const headers = await restHeaders();
    try {
      const r = await fetch(`${SUPABASE_URL}/rest/v1/examiners`, {
        method: "POST",
        headers: { ...headers, Prefer: "return=representation" },
        body: JSON.stringify({ instructor_id: userId, name: newExaminer.trim() }),
      });
      if (r.ok) {
        const j = await r.json();
        const e = Array.isArray(j) ? j[0] : j;
        setExaminers((xs) => [...xs, { id: e.id, name: e.name }]);
        setExaminerId(e.id);
        setExaminerName(e.name);
        setAddingExaminer(false);
        setNewExaminer("");
      } else {
        toast.error("Could not add examiner");
      }
    } catch {
      toast.error("Could not add examiner");
    }
  }

  async function save() {
    if (!testDate) {
      toast.error("Date is required");
      return;
    }
    if (!result) {
      toast.error("Please choose a result");
      return;
    }
    setSaving(true);
    const headers = await restHeaders();
    const payload: Record<string, any> = {
      pupil_id: pupilId,
      instructor_id: userId,
      test_type: testType,
      test_date: testDate,
      test_time: testTime || null,
      transmission,
      application_ref: applicationRef.trim() || null,
      adi_number: adiNumber.trim() || null,
      test_centre_id: centreId,
      test_centre_name: centreName || null,
      examiner_id: examinerId,
      examiner_name: examinerName || null,
      eta,
      result,
      fault_count: driverFaults,
      serious_faults: seriousFaults,
      dangerous_faults: dangerousFaults,
      faults_detail: faults,
      notes: notes.trim() || null,
    };
    try {
      const r = await fetch(`${SUPABASE_URL}/rest/v1/driving_test_results`, {
        method: "POST",
        headers: { ...headers, Prefer: "return=representation" },
        body: JSON.stringify(payload),
      });
      if (!r.ok) {
        toast.error("Could not save test result");
        setSaving(false);
        return;
      }
      let testResultId: string | null = null;
      try {
        const rows = await r.json();
        testResultId = Array.isArray(rows) ? rows[0]?.id ?? null : rows?.id ?? null;
      } catch {}
      // If passed and practical, mark pupil status
      if (result === "pass" && testType === "practical") {
        try {
          await fetch(`${SUPABASE_URL}/rest/v1/pupils?id=eq.${pupilId}`, {
            method: "PATCH",
            headers,
            body: JSON.stringify({ status: "passed", test_date: testDate }),
          });
        } catch {}
        try {
          const { data: sess } = await supabase.auth.getSession();
          const token = sess.session?.access_token;
          if (token && userId) {
            await awardPoints(userId, "LESSON_PUPIL_PASS", token, {
              referenceId: testResultId,
              referenceType: "driving_test",
            });
          }
        } catch (e) {
          console.warn("[rewards] pass award skipped", e);
        }
      }
      toast.success("Test result saved");
      // reset
      setResult("");
      setDriverFaults(0);
      setSeriousFaults(0);
      setDangerousFaults(0);
      setFaults({});
      setNotes("");
      await loadHistory();
      setTab("history");
    } finally {
      setSaving(false);
    }
  }

  const resultColor = (r: string | null) =>
    r === "pass" ? "#059669" : r === "fail" ? "#DC2626" : "#6B7280";

  return (
    <div className="min-h-screen bg-white pb-32" style={INTER}>
      {/* Top bar */}
      <div
        className="sticky top-0 z-20 flex items-center gap-3 px-4 py-3"
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
          Test report {pupilName ? `— ${pupilName}` : ""}
        </div>
      </div>

      {/* Tabs */}
      <div className="px-4 pt-4 flex gap-2">
        {(["record", "history"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className="flex-1 text-[13px] font-semibold"
            style={{
              height: 40,
              borderRadius: 10,
              backgroundColor: tab === t ? "#0F2044" : "#F1F4F9",
              color: tab === t ? "#FFFFFF" : "#0F2044",
              border: "none",
            }}
          >
            {t === "record" ? "Record test" : "History"}
          </button>
        ))}
      </div>

      {tab === "record" ? (
        <RecordTab
          {...{
            testType,
            setTestType,
            testDate,
            setTestDate,
            testTime,
            setTestTime,
            transmission,
            setTransmission,
            applicationRef,
            setApplicationRef,
            adiNumber,
            setAdiNumber,
            centres,
            centreId,
            centreName,
            setCentreId,
            setCentreName,
            addingCentre,
            setAddingCentre,
            newCentre,
            setNewCentre,
            addCentre,
            centreSearch,
            setCentreSearch,
            showCentreDropdown,
            setShowCentreDropdown,
            selectedCentre,
            setSelectedCentre,
            addCentreByName,
            examiners,
            examinerId,
            examinerName,
            setExaminerId,
            setExaminerName,
            addingExaminer,
            setAddingExaminer,
            newExaminer,
            setNewExaminer,
            addExaminer,
            eta,
            setEta,
            result,
            setResult,
            driverFaults,
            setDriverFaults,
            seriousFaults,
            setSeriousFaults,
            dangerousFaults,
            setDangerousFaults,
            faultTotal,
            dl25Open,
            setDl25Open,
            faults,
            bump,
            reset,
            notes,
            setNotes,
            notesMic,
          }}
        />
      ) : (
        <HistoryTab
          history={history}
          expandedId={expandedId}
          setExpandedId={setExpandedId}
          resultColor={resultColor}
        />
      )}

      {tab === "record" && (
        <div
          className="fixed left-0 right-0 bottom-0 z-30 px-4 py-3"
          style={{
            backgroundColor: "rgba(255,255,255,0.95)",
            borderTop: "0.5px solid #E2E6ED",
            paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))",
          }}
        >
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="w-full text-[14px] font-semibold"
            style={{
              height: 52,
              borderRadius: 12,
              backgroundColor: "#0F2044",
              color: "#FFFFFF",
              border: "none",
              opacity: saving ? 0.6 : 1,
            }}
          >
            {saving ? "Saving…" : "Save test report →"}
          </button>
        </div>
      )}
    </div>
  );
}

/* ---------------- Record tab ---------------- */

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="mx-4 mt-3"
      style={{
        backgroundColor: "#FFFFFF",
        border: "0.5px solid #E2E6ED",
        borderRadius: 12,
        padding: 16,
      }}
    >
      {children}
    </div>
  );
}

function SectionTitle({
  icon,
  children,
}: {
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div
      className="flex items-center gap-2 text-[13px] font-semibold mb-3"
      style={{ color: "#0F2044" }}
    >
      {icon}
      {children}
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-3 last:mb-0">
      <label className="block text-[11px] font-medium mb-1" style={{ color: "#6B7280" }}>
        {label}
      </label>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  height: 40,
  padding: "0 12px",
  borderRadius: 8,
  border: "0.5px solid #E2E6ED",
  fontSize: 14,
  backgroundColor: "#FFFFFF",
  color: "#0F2044",
  fontFamily: "Inter, sans-serif",
};

function CentreSearchSelect({
  centres,
  centreSearch,
  setCentreSearch,
  showDropdown,
  setShowDropdown,
  selectedCentre,
  setSelectedCentre,
  setCentreId,
  setCentreName,
  addCentreByName,
}: {
  centres: TestCentre[];
  centreSearch: string;
  setCentreSearch: (v: string) => void;
  showDropdown: boolean;
  setShowDropdown: (v: boolean) => void;
  selectedCentre: { id: string; name: string; town: string } | null;
  setSelectedCentre: (v: { id: string; name: string; town: string } | null) => void;
  setCentreId: (v: string | null) => void;
  setCentreName: (v: string) => void;
  addCentreByName: (name: string) => void;
}) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [setShowDropdown]);

  const q = centreSearch.trim().toLowerCase();
  const filtered = q
    ? centres.filter((c) => {
        const name = (c.name || "").toLowerCase();
        const town = (c.town || "").toLowerCase();
        return name.includes(q) || town.includes(q);
      })
    : centres;

  function pick(c: TestCentre) {
    const centre = { id: c.id, name: c.name, town: c.town ?? "" };
    setSelectedCentre(centre);
    setCentreId(c.id);
    setCentreName(c.name);
    setCentreSearch(c.name);
    setShowDropdown(false);
  }

  return (
    <div ref={wrapRef} style={{ position: "relative" }}>
      {selectedCentre ? (
        <div
          className="flex items-center justify-between"
          style={{
            padding: "10px 12px",
            borderRadius: 8,
            border: "0.5px solid #E2E6ED",
            backgroundColor: "#F0FDF4",
          }}
        >
          <div className="flex items-center gap-2">
            <Check size={16} color="#16A34A" />
            <span className="text-[14px] font-semibold" style={{ color: "#0F2044" }}>
              {selectedCentre.name}
              {selectedCentre.town ? (
                <span className="font-normal" style={{ color: "#64748B" }}>
                  {" "}
                  · {selectedCentre.town}
                </span>
              ) : null}
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              setSelectedCentre(null);
              setCentreId(null);
              setCentreName("");
              setCentreSearch("");
              setShowDropdown(true);
            }}
            className="text-[12px] font-semibold"
            style={{ color: "#1A52A0", background: "none", border: "none" }}
          >
            Change
          </button>
        </div>
      ) : (
        <>
          <div style={{ position: "relative" }}>
            <Search
              size={16}
              color="#64748B"
              style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }}
            />
            <input
              type="text"
              placeholder="Search test centres..."
              value={centreSearch}
              onChange={(e) => {
                setCentreSearch(e.target.value);
                setShowDropdown(true);
              }}
              onFocus={() => setShowDropdown(true)}
              style={{ ...inputStyle, paddingLeft: 36 }}
            />
          </div>
          {showDropdown && (
            <div
              style={{
                position: "absolute",
                top: "calc(100% + 4px)",
                left: 0,
                right: 0,
                backgroundColor: "#FFFFFF",
                border: "0.5px solid #E2E6ED",
                borderRadius: 8,
                boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                maxHeight: 200,
                overflowY: "auto",
                zIndex: 50,
              }}
            >
              {filtered.map((c) => (
                <div
                  key={c.id}
                  onClick={() => pick(c)}
                  className="cursor-pointer"
                  style={{ padding: "12px 16px" }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#F7FAFC")}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                >
                  <div className="text-[14px] font-semibold" style={{ color: "#0F2044" }}>
                    {c.name}
                  </div>
                  {c.town ? (
                    <div className="text-[12px]" style={{ color: "#64748B" }}>
                      {c.town}
                    </div>
                  ) : null}
                </div>
              ))}
              {filtered.length === 0 && centreSearch.trim().length > 2 && (
                <div
                  onClick={() => addCentreByName(centreSearch)}
                  className="cursor-pointer flex items-center gap-2"
                  style={{ padding: "12px 16px", color: "#1A52A0" }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#F7FAFC")}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                >
                  <Plus size={14} />
                  <span className="text-[13px] font-semibold">
                    Add &ldquo;{centreSearch.trim()}&rdquo; as new centre
                  </span>
                </div>
              )}
              {filtered.length === 0 && centreSearch.trim().length <= 2 && (
                <div className="text-[12px]" style={{ padding: "12px 16px", color: "#64748B" }}>
                  Keep typing to search or add a new centre…
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Pill({
  active,
  color,
  children,
  onClick,
}: {
  active?: boolean;
  color?: string;
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-[12px] font-medium"
      style={{
        height: 32,
        padding: "0 12px",
        borderRadius: 999,
        border: active ? "none" : "0.5px solid #E2E6ED",
        backgroundColor: active ? color ?? "#0F2044" : "#FFFFFF",
        color: active ? "#FFFFFF" : "#0F2044",
      }}
    >
      {children}
    </button>
  );
}

function RecordTab(props: any) {
  const {
    testType,
    setTestType,
    testDate,
    setTestDate,
    testTime,
    setTestTime,
    transmission,
    setTransmission,
    applicationRef,
    setApplicationRef,
    adiNumber,
    setAdiNumber,
    centres,
    centreId,
    centreName,
    setCentreId,
    setCentreName,
    addingCentre,
    setAddingCentre,
    newCentre,
    setNewCentre,
    addCentre,
    centreSearch,
    setCentreSearch,
    showCentreDropdown,
    setShowCentreDropdown,
    selectedCentre,
    setSelectedCentre,
    addCentreByName,
    examiners,
    examinerId,
    examinerName,
    setExaminerId,
    setExaminerName,
    addingExaminer,
    setAddingExaminer,
    newExaminer,
    setNewExaminer,
    addExaminer,
    eta,
    setEta,
    result,
    setResult,
    driverFaults,
    setDriverFaults,
    seriousFaults,
    setSeriousFaults,
    dangerousFaults,
    setDangerousFaults,
    faultTotal,
    dl25Open,
    setDl25Open,
    faults,
    bump,
    reset,
    notes,
    setNotes,
    notesMic,
  } = props;

  return (
    <div>
      {/* Test type */}
      <div className="px-4 pt-4">
        <div className="flex gap-2">
          {(["mock", "practical"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTestType(t)}
              className="flex-1 text-[13px] font-semibold"
              style={{
                height: 44,
                borderRadius: 999,
                backgroundColor: testType === t ? (t === "mock" ? "#D97706" : "#0F2044") : "#F1F4F9",
                color: testType === t ? "#FFFFFF" : "#0F2044",
                border: "none",
              }}
            >
              {t === "mock" ? "Mock test" : "Practical test"}
            </button>
          ))}
        </div>
        <div
          className="mt-3 text-[12px] font-medium px-3 py-2"
          style={{
            borderRadius: 10,
            backgroundColor: testType === "mock" ? "#FEF3C7" : "#DCE6F5",
            color: testType === "mock" ? "#92400E" : "#0F2044",
          }}
        >
          {testType === "mock" ? "Recording a mock test" : "Recording a practical test"}
        </div>
      </div>

      {/* Test details */}
      <Card>
        <SectionTitle icon={<CalendarIcon size={16} color="#0F2044" />}>Test details</SectionTitle>
        <Field label="Date">
          <input type="date" value={testDate} onChange={(e) => setTestDate(e.target.value)} style={inputStyle} />
        </Field>
        <Field label="Time (optional)">
          <input type="time" value={testTime} onChange={(e) => setTestTime(e.target.value)} style={inputStyle} />
        </Field>
        <Field label="Transmission">
          <div className="flex gap-2">
            {(["manual", "automatic"] as const).map((t) => (
              <Pill key={t} active={transmission === t} onClick={() => setTransmission(t)}>
                {t === "manual" ? "Manual" : "Automatic"}
              </Pill>
            ))}
          </div>
        </Field>
        <Field label="Application ref (optional)">
          <input
            type="text"
            value={applicationRef}
            onChange={(e) => setApplicationRef(e.target.value)}
            style={inputStyle}
          />
        </Field>
        <Field label="ADI cert number (optional)">
          <input
            type="text"
            value={adiNumber}
            onChange={(e) => setAdiNumber(e.target.value)}
            style={inputStyle}
          />
        </Field>
      </Card>

      {/* Test centre */}
      <Card>
        <SectionTitle icon={<MapPin size={16} color="#0F2044" />}>Test centre</SectionTitle>
        <CentreSearchSelect
          centres={centres}
          centreSearch={centreSearch}
          setCentreSearch={setCentreSearch}
          showDropdown={showCentreDropdown}
          setShowDropdown={setShowCentreDropdown}
          selectedCentre={selectedCentre}
          setSelectedCentre={setSelectedCentre}
          setCentreId={setCentreId}
          setCentreName={setCentreName}
          addCentreByName={addCentreByName}
        />
      </Card>

      {/* Examiner */}
      <Card>
        <SectionTitle icon={<User size={16} color="#0F2044" />}>Examiner</SectionTitle>
        <div className="flex flex-wrap gap-2">
          {examiners.map((e: Examiner) => (
            <Pill
              key={e.id}
              active={examinerId === e.id}
              onClick={() => {
                setExaminerId(e.id);
                setExaminerName(e.name);
              }}
            >
              {e.name}
            </Pill>
          ))}
          {!addingExaminer ? (
            <Pill onClick={() => setAddingExaminer(true)}>+ Add new examiner</Pill>
          ) : null}
        </div>
        {addingExaminer && (
          <div className="mt-3 flex gap-2">
            <input
              placeholder="Examiner name"
              value={newExaminer}
              onChange={(e) => setNewExaminer(e.target.value)}
              style={inputStyle}
            />
            <button
              type="button"
              onClick={addExaminer}
              className="text-[12px] font-semibold text-white px-3"
              style={{ height: 40, borderRadius: 8, backgroundColor: "#0F2044", border: "none" }}
            >
              Save
            </button>
          </div>
        )}
        <div className="mt-3 flex items-center justify-between">
          <div className="text-[12px]" style={{ color: "#0F2044" }}>
            Examiner took action (ETA)
          </div>
          <button
            type="button"
            onClick={() => setEta(!eta)}
            className="text-[11px] font-semibold"
            style={{
              width: 52,
              height: 28,
              borderRadius: 999,
              backgroundColor: eta ? "#0F2044" : "#E2E6ED",
              color: eta ? "#FFFFFF" : "#0F2044",
              border: "none",
            }}
          >
            {eta ? "Yes" : "No"}
          </button>
        </div>
      </Card>

      {/* Result */}
      <Card>
        <SectionTitle icon={<Trophy size={16} color="#0F2044" />}>Result</SectionTitle>
        <div className="grid grid-cols-3 gap-2">
          {[
            { k: "pass", label: "PASS 🎉", bg: "#059669" },
            { k: "fail", label: "FAIL", bg: "#DC2626" },
            { k: "terminated", label: "Terminated", bg: "#6B7280" },
          ].map((r) => (
            <button
              key={r.k}
              type="button"
              onClick={() => setResult(r.k)}
              className="text-[13px] font-bold text-white"
              style={{
                height: 52,
                borderRadius: 10,
                backgroundColor: r.bg,
                border: "none",
                opacity: result === r.k ? 1 : 0.55,
                outline: result === r.k ? "3px solid rgba(15,32,68,0.25)" : "none",
              }}
            >
              {r.label}
            </button>
          ))}
        </div>
      </Card>

      {/* Faults */}
      {result && (
        <Card>
          <SectionTitle>Faults</SectionTitle>
          <div className="grid grid-cols-3 gap-2">
            <NumBox label="Driver" value={driverFaults} onChange={setDriverFaults} color="#1877D6" />
            <NumBox label="Serious" value={seriousFaults} onChange={setSeriousFaults} color="#D97706" />
            <NumBox label="Dangerous" value={dangerousFaults} onChange={setDangerousFaults} color="#DC2626" />
          </div>
          <div className="mt-3 text-[12px]" style={{ color: "#6B7280" }}>
            Total faults: <span className="font-semibold" style={{ color: "#0F2044" }}>{faultTotal}</span>
          </div>
        </Card>
      )}

      {/* DL25 */}
      <Card>
        <button
          type="button"
          onClick={() => setDl25Open(!dl25Open)}
          className="w-full flex items-center justify-between"
          style={{ background: "none", border: "none", padding: 0 }}
        >
          <div className="text-[13px] font-semibold" style={{ color: "#0F2044" }}>
            Detailed faults (DL25)
          </div>
          {dl25Open ? <ChevronUp size={16} color="#0F2044" /> : <ChevronDown size={16} color="#0F2044" />}
        </button>
        {dl25Open && (
          <div className="mt-3 space-y-3">
            {DL25.map((cat) => (
              <div key={cat.id}>
                <div className="text-[12px] font-semibold mb-1" style={{ color: "#0F2044" }}>
                  {cat.name}
                </div>
                <div className="grid grid-cols-[1fr_44px_44px_44px] gap-1 items-center text-[10px]" style={{ color: "#6B7280" }}>
                  <div />
                  <div className="text-center">D</div>
                  <div className="text-center">S</div>
                  <div className="text-center">DN</div>
                </div>
                {(cat.subs ?? ["_"]).map((sub) => {
                  const key = sub;
                  const cell = faults?.[cat.id]?.[key] ?? { d: 0, s: 0, dn: 0 };
                  return (
                    <div
                      key={key}
                      className="grid grid-cols-[1fr_44px_44px_44px] gap-1 items-center mt-1"
                    >
                      <div className="text-[11px]" style={{ color: "#0F2044" }}>
                        {sub === "_" ? "—" : sub}
                      </div>
                      {(["d", "s", "dn"] as const).map((col) => {
                        const colColor = col === "d" ? "#1877D6" : col === "s" ? "#D97706" : "#DC2626";
                        return (
                          <button
                            key={col}
                            type="button"
                            onClick={() => bump(cat.id, key, col, 1)}
                            onContextMenu={(e) => {
                              e.preventDefault();
                              reset(cat.id, key);
                            }}
                            className="text-[12px] font-semibold"
                            style={{
                              height: 32,
                              borderRadius: 8,
                              backgroundColor: cell[col] > 0 ? colColor : "#F1F4F9",
                              color: cell[col] > 0 ? "#FFFFFF" : "#0F2044",
                              border: "none",
                            }}
                          >
                            {cell[col]}
                          </button>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            ))}
            <div className="text-[10px]" style={{ color: "#6B7280" }}>
              Tap to add. Right-click / long-press to reset a cell.
            </div>
          </div>
        )}
      </Card>

      {/* Notes */}
      <Card>
        <SectionTitle>Notes</SectionTitle>
        <div className="relative">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            placeholder="Any notes about the test…"
            style={{
              width: "100%",
              padding: 12,
              paddingRight: 44,
              borderRadius: 10,
              border: "0.5px solid #E2E6ED",
              fontSize: 14,
              color: "#0F2044",
              resize: "vertical",
              fontFamily: "Inter, sans-serif",
            }}
          />
          <button
            type="button"
            onClick={notesMic.listening ? notesMic.stop : notesMic.start}
            className="absolute right-2 top-2 inline-flex items-center justify-center rounded-full"
            style={{
              width: 32,
              height: 32,
              backgroundColor: notesMic.listening ? "#DC2626" : "#F1F4F9",
              color: notesMic.listening ? "#FFFFFF" : "#0F2044",
              border: "none",
            }}
            aria-label="Voice input"
          >
            {notesMic.listening ? <MicOff size={16} /> : <Mic size={16} />}
          </button>
        </div>
      </Card>
    </div>
  );
}

function NumBox({
  label,
  value,
  onChange,
  color,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  color: string;
}) {
  return (
    <div>
      <div className="text-[10px] font-medium mb-1" style={{ color }}>
        {label}
      </div>
      <input
        type="number"
        min={0}
        value={value}
        onChange={(e) => onChange(Math.max(0, Number(e.target.value) || 0))}
        style={{
          width: "100%",
          height: 44,
          textAlign: "center",
          fontSize: 18,
          fontWeight: 700,
          color,
          borderRadius: 10,
          border: `1px solid ${color}33`,
          backgroundColor: `${color}0D`,
          fontFamily: "Inter, sans-serif",
        }}
      />
    </div>
  );
}

/* ---------------- History tab ---------------- */

function HistoryTab({
  history,
  expandedId,
  setExpandedId,
  resultColor,
}: {
  history: TestResult[];
  expandedId: string | null;
  setExpandedId: (id: string | null) => void;
  resultColor: (r: string | null) => string;
}) {
  if (history.length === 0) {
    return (
      <div className="px-6 py-14 flex flex-col items-center text-center">
        <Trophy size={48} color="#D97706" />
        <div className="mt-4 text-[16px] font-bold" style={{ color: "#0F2044" }}>
          No test reports yet
        </div>
        <div className="mt-2 text-sm max-w-xs mx-auto" style={{ color: "#6B7280" }}>
          Record a mock or practical test to build your pupil's test history.
        </div>
      </div>
    );
  }
  return (
    <div className="pt-3 pb-6">
      {history.map((t) => {
        const badge =
          t.test_type === "mock" ? "MOCK" : t.result === "pass" ? "PASS" : t.result === "fail" ? "FAIL" : "TERM";
        const badgeBg = t.test_type === "mock" ? "#D97706" : resultColor(t.result);
        const isOpen = expandedId === t.id;
        return (
          <div
            key={t.id}
            className="mx-4 mb-2"
            style={{
              backgroundColor: "#FFFFFF",
              border: "0.5px solid #E2E6ED",
              borderRadius: 12,
              padding: 16,
            }}
          >
            <button
              type="button"
              onClick={() => setExpandedId(isOpen ? null : t.id)}
              className="w-full text-left"
              style={{ background: "none", border: "none", padding: 0 }}
            >
              <div className="flex items-center justify-between">
                <div className="text-[13px] font-semibold" style={{ color: "#0F2044" }}>
                  {fmtDate(t.test_date)}
                  {t.test_time ? ` · ${t.test_time.slice(0, 5)}` : ""}
                </div>
                <div
                  className="text-[10px] font-bold px-2 py-1 text-white"
                  style={{ borderRadius: 999, backgroundColor: badgeBg }}
                >
                  {badge}
                </div>
              </div>
              <div className="mt-1 text-[12px]" style={{ color: "#6B7280" }}>
                {t.test_centre_name ?? "—"}
                {t.examiner_name ? ` · ${t.examiner_name}` : ""}
              </div>
              <div className="mt-2 text-[12px]" style={{ color: "#0F2044" }}>
                <span style={{ color: "#1877D6" }}>{t.fault_count ?? 0} driver</span>
                {" | "}
                <span style={{ color: "#D97706" }}>{t.serious_faults ?? 0} serious</span>
                {" | "}
                <span style={{ color: "#DC2626" }}>{t.dangerous_faults ?? 0} dangerous</span>
              </div>
              <div className="mt-1 text-[11px]" style={{ color: "#6B7280" }}>
                {t.transmission === "automatic" ? "Automatic" : "Manual"}
                {t.eta ? " · ETA" : ""}
              </div>
              {t.notes ? (
                <div className="mt-2 text-[12px] italic" style={{ color: "#4A5A73" }}>
                  “{t.notes}”
                </div>
              ) : null}
            </button>
            {isOpen && t.faults_detail && (
              <div className="mt-3 pt-3" style={{ borderTop: "0.5px solid #E2E6ED" }}>
                <div className="text-[11px] font-semibold mb-2" style={{ color: "#0F2044" }}>
                  DL25 breakdown
                </div>
                {DL25.map((cat) => {
                  const rows = t.faults_detail?.[cat.id];
                  if (!rows) return null;
                  const anySub = Object.values(rows).some(
                    (c) => (c?.d ?? 0) + (c?.s ?? 0) + (c?.dn ?? 0) > 0,
                  );
                  if (!anySub) return null;
                  return (
                    <div key={cat.id} className="mb-2">
                      <div className="text-[11px] font-semibold" style={{ color: "#0F2044" }}>
                        {cat.name}
                      </div>
                      {Object.entries(rows).map(([sub, cell]) => {
                        const total = (cell?.d ?? 0) + (cell?.s ?? 0) + (cell?.dn ?? 0);
                        if (total === 0) return null;
                        return (
                          <div key={sub} className="text-[11px]" style={{ color: "#6B7280" }}>
                            {sub === "_" ? "•" : sub}: D {cell?.d ?? 0} · S {cell?.s ?? 0} · DN {cell?.dn ?? 0}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
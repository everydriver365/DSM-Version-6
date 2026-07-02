import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  BookOpen,
  ChevronDown,
  ChevronUp,
  FileCheck,
  Navigation,
  Search,
  Shield,
  Trophy,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "../lib/supabaseClient";

export const Route = createFileRoute("/test-day/$pupilId")({
  component: TestDayPage,
});

const POPPINS = { fontFamily: "Inter, system-ui, sans-serif" } as const;

type Pupil = {
  id: string;
  name: string | null;
  test_date: string | null;
  test_time: string | null;
  test_centre: string | null;
  test_centre_id: string | null;
  phone: string | null;
  status?: string | null;
};

type TestCentre = {
  id: string;
  name: string;
  address: string | null;
  town: string | null;
  postcode: string | null;
};

const DOCS = [
  "Provisional Driving Licence",
  "Theory Test Pass Certificate",
  "Glasses/contacts if needed",
  "Payment for test (if not paid online)",
];

const PREP = [
  "Practised reading number plate at 20m",
  "Revised Show Me / Tell Me questions",
  "Practised routes near test centre",
  "Practised all manoeuvres",
  "Good night's sleep planned",
  "Plan to arrive 10 minutes early",
  "Vehicle fuelled and ready",
];

const TELL_ME: { q: string; a: string }[] = [
  { q: "How would you check the brakes are working before starting a journey?", a: "Brakes should not feel spongy or slack. Test them as you set off — vehicle should not pull to one side." },
  { q: "Where would you find recommended tyre pressures and how would you check them?", a: "Vehicle handbook or door pillar sticker. Use a reliable pressure gauge when tyres are cold." },
  { q: "How would you check tyres are correctly inflated with sufficient tread?", a: "Check pressures with a gauge. Tread min 1.6mm across central ¾. Look for cuts, bulges, uneven wear." },
  { q: "How would you check headlights and tail lights are working?", a: "Turn on ignition, switch on headlights, walk around checking front and rear lights." },
  { q: "How would you know if there was an ABS problem?", a: "A warning light on the dashboard will illuminate if there's a fault." },
  { q: "How would you check direction indicators are working?", a: "Switch on ignition, activate indicators each direction, walk around to check." },
  { q: "How would you check brake lights are working?", a: "Apply footbrake, use a reflection in a window or ask someone to check." },
  { q: "How would you check power-assisted steering is working?", a: "Gentle pressure on steering when starting engine — should feel a slight movement and light steering." },
  { q: "How would you switch on rear fog lights and when would you use them?", a: "Show the switch. Use when visibility below 100m. Switch off when visibility improves." },
  { q: "How would you check the horn is working?", a: "Press the horn button. Only use when moving, not between 11:30pm–7am in built-up areas." },
  { q: "How would you check engine coolant level?", a: "Open bonnet, find coolant reservoir, check between min/max markings. Only open when cold." },
  { q: "How would you check engine oil level?", a: "Pull out dipstick, wipe clean, reinsert, pull out again. Level between min and max marks." },
];

const SHOW_ME: { q: string; a: string }[] = [
  { q: "Show me how you'd wash and clean the rear windscreen.", a: "Operate the rear windscreen washer and wiper." },
  { q: "Show me how you'd wash and clean the front windscreen.", a: "Operate the windscreen washer and wipers." },
  { q: "Show me how you'd set the rear demister.", a: "Press the heated rear window button." },
  { q: "Show me how you'd switch headlight from dipped to main beam.", a: "Push/pull the stalk and check the blue main beam warning light." },
  { q: "Show me how you'd open and close the side window.", a: "Operate the electric window switch or manual winder." },
  { q: "Show me how you'd check power-assisted steering is working.", a: "Gentle pressure on steering when starting engine — slight movement. At low speed, steering should feel light." },
  { q: "Show me how you'd demist the front windscreen.", a: "Set blowers to windscreen, increase fan, use warm air, switch on A/C if available." },
];

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const d = new Date(dateStr + "T00:00:00");
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - now.getTime()) / 86400000);
}

function fmtDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr + "T00:00:00").toLocaleDateString("en-GB", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        backgroundColor: "#FFFFFF",
        border: "0.5px solid #EEF2F7",
        borderRadius: 12,
        padding: 16,
        marginLeft: 16,
        marginRight: 16,
        marginTop: 12,
      }}
    >
      {children}
    </div>
  );
}

function Checkbox({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onChange}
      className="w-full flex items-center gap-3 py-2 text-left"
      style={POPPINS}
    >
      <span
        style={{
          width: 22,
          height: 22,
          borderRadius: 6,
          border: "1.5px solid #1877D6",
          backgroundColor: checked ? "#1877D6" : "#FFFFFF",
          color: "#FFFFFF",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          fontSize: 14,
          fontWeight: 700,
        }}
      >
        {checked ? "✓" : ""}
      </span>
      <span
        className="text-[14px]"
        style={{
          color: checked ? "#6B7280" : "#0B1F3A",
          textDecoration: checked ? "line-through" : "none",
        }}
      >
        {label}
      </span>
    </button>
  );
}

function QAItem({ type, q, a }: { type: "SHOW" | "TELL"; q: string; a: string }) {
  const [open, setOpen] = useState(false);
  const bg = type === "SHOW" ? "#1877D6" : "#1877D6";
  return (
    <div
      style={{
        borderTop: "1px solid #F3F4F6",
        paddingTop: 10,
        paddingBottom: 10,
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-start gap-2 text-left"
      >
        <span
          style={{
            backgroundColor: bg,
            color: "#FFFFFF",
            fontSize: 10,
            fontWeight: 700,
            padding: "2px 6px",
            borderRadius: 4,
            flexShrink: 0,
            marginTop: 2,
            ...POPPINS,
          }}
        >
          {type}
        </span>
        <span className="flex-1 text-[13px]" style={{ color: "#0B1F3A", ...POPPINS }}>
          {q}
        </span>
        {open ? (
          <ChevronUp size={16} color="#6B7280" />
        ) : (
          <ChevronDown size={16} color="#6B7280" />
        )}
      </button>
      {open && (
        <p
          className="text-[13px] mt-2"
          style={{ color: "#374151", paddingLeft: 38, ...POPPINS }}
        >
          {a}
        </p>
      )}
    </div>
  );
}

function TestDayPage() {
  const { pupilId } = Route.useParams();
  const navigate = useNavigate();
  const [pupil, setPupil] = useState<Pupil | null>(null);
  const [centre, setCentre] = useState<TestCentre | null>(null);
  const [allCentres, setAllCentres] = useState<TestCentre[]>([]);
  const [showCentrePicker, setShowCentrePicker] = useState(false);
  const [centreSearch, setCentreSearch] = useState("");
  const [docs, setDocs] = useState<boolean[]>(() => DOCS.map(() => false));
  const [prep, setPrep] = useState<boolean[]>(() => PREP.map(() => false));
  const [qaOpen, setQaOpen] = useState(false);
  const [confetti, setConfetti] = useState(false);
  const [askRetest, setAskRetest] = useState(false);

  const docsKey = `testday:${pupilId}:docs`;
  const prepKey = `testday:${pupilId}:prep`;

  useEffect(() => {
    try {
      const d = localStorage.getItem(docsKey);
      const p = localStorage.getItem(prepKey);
      if (d) setDocs(JSON.parse(d));
      if (p) setPrep(JSON.parse(p));
    } catch {}
  }, [docsKey, prepKey]);

  useEffect(() => {
    try {
      localStorage.setItem(docsKey, JSON.stringify(docs));
    } catch {}
  }, [docs, docsKey]);
  useEffect(() => {
    try {
      localStorage.setItem(prepKey, JSON.stringify(prep));
    } catch {}
  }, [prep, prepKey]);

  useEffect(() => {
    let cancel = false;
    (async () => {
      const { data } = await supabase
        .from("pupils")
        .select("id, name, test_date, test_time, test_centre, test_centre_id, phone, status")
        .eq("id", pupilId)
        .maybeSingle();
      if (cancel) return;
      setPupil((data as Pupil) ?? null);
      if ((data as any)?.test_centre_id) {
        const { data: tc } = await supabase
          .from("test_centres")
          .select("id, name, address, town, postcode")
          .eq("id", (data as any).test_centre_id)
          .maybeSingle();
        if (!cancel) setCentre((tc as TestCentre) ?? null);
      } else if (data?.test_centre) {
        const { data: tc } = await supabase
          .from("test_centres")
          .select("id, name, address, town, postcode")
          .eq("name", data.test_centre)
          .maybeSingle();
        if (!cancel && tc) setCentre(tc as TestCentre);
      }
    })();
    return () => {
      cancel = true;
    };
  }, [pupilId]);

  useEffect(() => {
    if (!showCentrePicker || allCentres.length > 0) return;
    let cancel = false;
    (async () => {
      const { data } = await supabase
        .from("test_centres")
        .select("id, name, address, town, postcode")
        .order("name", { ascending: true });
      if (!cancel) setAllCentres((data as TestCentre[]) ?? []);
    })();
    return () => {
      cancel = true;
    };
  }, [showCentrePicker, allCentres.length]);

  const centreDisplayName = centre?.name ?? pupil?.test_centre ?? null;
  const centreFullAddress = centre
    ? [centre.address, centre.town, centre.postcode].filter(Boolean).join(", ")
    : null;

  const days = useMemo(() => daysUntil(pupil?.test_date ?? null), [pupil?.test_date]);
  const isTestDay = days === 0;

  const mapsQuery = useMemo(() => {
    if (centre) {
      const parts = [centre.name, centre.address, centre.town, centre.postcode]
        .filter(Boolean)
        .join(", ");
      if (parts) return parts;
    }
    return pupil?.test_centre ?? "";
  }, [centre, pupil?.test_centre]);

  async function selectCentre(c: TestCentre) {
    if (!pupil) return;
    const { error } = await supabase
      .from("pupils")
      .update({ test_centre_id: c.id, test_centre: c.name })
      .eq("id", pupil.id);
    if (error) {
      toast.error("Could not update test centre");
      return;
    }
    setCentre(c);
    setPupil({ ...pupil, test_centre_id: c.id, test_centre: c.name });
    setShowCentrePicker(false);
    setCentreSearch("");
    toast.success("Test centre updated");
  }

  const recordResult = async (passed: boolean) => {
    if (!pupil) return;
    const { error } = await supabase
      .from("pupils")
      .update({ status: passed ? "passed" : "failed" })
      .eq("id", pupil.id);
    if (error) {
      toast.error("Could not save result");
      return;
    }
    if (passed) {
      setConfetti(true);
      toast.success("Congratulations! 🎉");
      setTimeout(() => setConfetti(false), 4000);
    } else {
      toast("Test result saved");
      setAskRetest(true);
    }
  };

  return (
    <div style={{ backgroundColor: "#FFFFFF", minHeight: "100vh", paddingBottom: 32 }}>
      {/* Top bar */}
      <div
        style={{
          backgroundColor: "#1877D6",
          color: "#FFFFFF",
          padding: "12px 16px",
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <button
          type="button"
          onClick={() => navigate({ to: "/pupils/$id", params: { id: pupilId } })}
          aria-label="Back"
          className="inline-flex items-center justify-center"
          style={{ background: "transparent", border: "none", color: "#FFFFFF" }}
        >
          <ArrowLeft size={22} color="#FFFFFF" />
        </button>
        <h1 className="text-[16px] font-semibold" style={POPPINS}>
          Test day — {pupil?.name ?? "…"}
        </h1>
      </div>

      {/* Countdown banner */}
      <div
        style={{
          backgroundColor: "#1877D6",
          color: "#FFFFFF",
          padding: 16,
          textAlign: "center",
          ...POPPINS,
        }}
      >
        <div className="text-[32px] font-bold leading-tight">
          {days == null
            ? "No test booked"
            : isTestDay
              ? "TEST DAY!"
              : days < 0
                ? `${Math.abs(days)} days ago`
                : `${days} day${days === 1 ? "" : "s"} until test`}
        </div>
        <div className="text-[14px] mt-1 opacity-95">
          {fmtDate(pupil?.test_date ?? null)}
          {pupil?.test_time ? ` • ${pupil.test_time}` : ""}
        </div>
        {pupil?.test_centre && (
          <div className="text-[14px] mt-1 opacity-95">{pupil.test_centre}</div>
        )}
      </div>

      {/* Documents */}
      <Card>
        <div className="flex items-center gap-2 mb-2">
          <FileCheck size={18} color="#1877D6" />
          <h2 className="text-[15px] font-semibold" style={{ color: "#0B1F3A", ...POPPINS }}>
            Documents to bring
          </h2>
        </div>
        {DOCS.map((label, i) => (
          <Checkbox
            key={label}
            checked={!!docs[i]}
            onChange={() =>
              setDocs((arr) => arr.map((v, idx) => (idx === i ? !v : v)))
            }
            label={label}
          />
        ))}
      </Card>

      {/* Preparation */}
      <Card>
        <div className="flex items-center gap-2 mb-2">
          <Shield size={18} color="#1877D6" />
          <h2 className="text-[15px] font-semibold" style={{ color: "#0B1F3A", ...POPPINS }}>
            Pre-test preparation
          </h2>
        </div>
        {PREP.map((label, i) => (
          <Checkbox
            key={label}
            checked={!!prep[i]}
            onChange={() =>
              setPrep((arr) => arr.map((v, idx) => (idx === i ? !v : v)))
            }
            label={label}
          />
        ))}
      </Card>

      {/* Show Me / Tell Me */}
      <Card>
        <button
          type="button"
          onClick={() => setQaOpen((v) => !v)}
          className="w-full flex items-center justify-between"
        >
          <span className="flex items-center gap-2">
            <BookOpen size={18} color="#1877D6" />
            <span
              className="text-[15px] font-semibold"
              style={{ color: "#0B1F3A", ...POPPINS }}
            >
              Show Me / Tell Me
            </span>
          </span>
          {qaOpen ? (
            <ChevronUp size={18} color="#6B7280" />
          ) : (
            <ChevronDown size={18} color="#6B7280" />
          )}
        </button>
        {!qaOpen && (
          <p className="text-[13px] mt-2" style={{ color: "#6B7280", ...POPPINS }}>
            12 Tell Me + 7 Show Me questions
          </p>
        )}
        {qaOpen && (
          <div className="mt-2">
            {TELL_ME.map((it, i) => (
              <QAItem key={`t${i}`} type="TELL" q={it.q} a={it.a} />
            ))}
            {SHOW_ME.map((it, i) => (
              <QAItem key={`s${i}`} type="SHOW" q={it.q} a={it.a} />
            ))}
          </div>
        )}
      </Card>

      {/* Navigate */}
      <Card>
        <div className="flex items-center gap-2 mb-2">
          <Navigation size={18} color="#1877D6" />
          <h2 className="text-[15px] font-semibold" style={{ color: "#0B1F3A", ...POPPINS }}>
            Navigate to test centre
          </h2>
        </div>
        <div className="text-[14px] font-semibold" style={{ color: "#0B1F3A", ...POPPINS }}>
          {centreDisplayName ?? "No test centre set"}
        </div>
        {centreFullAddress && (
          <div className="text-[13px] mt-1" style={{ color: "#6B7280", ...POPPINS }}>
            {centreFullAddress}
          </div>
        )}
        <button
          type="button"
          onClick={() => {
            setShowCentrePicker((v) => !v);
            setCentreSearch("");
          }}
          className="text-[12px] font-semibold mt-2"
          style={{ color: "#1877D6", background: "none", border: "none", padding: 0, ...POPPINS }}
        >
          {showCentrePicker ? "Cancel" : "Change test centre"}
        </button>
        {showCentrePicker && (
          <div className="mt-2" style={{ position: "relative" }}>
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
                onChange={(e) => setCentreSearch(e.target.value)}
                style={{
                  width: "100%",
                  height: 40,
                  padding: "0 12px 0 36px",
                  borderRadius: 8,
                  border: "0.5px solid #E2E6ED",
                  fontSize: 14,
                  outline: "none",
                  ...POPPINS,
                }}
              />
            </div>
            <div
              style={{
                marginTop: 6,
                border: "0.5px solid #E2E6ED",
                borderRadius: 8,
                maxHeight: 220,
                overflowY: "auto",
                backgroundColor: "#FFFFFF",
              }}
            >
              {(() => {
                const q = centreSearch.trim().toLowerCase();
                const filtered = q
                  ? allCentres.filter(
                      (c) =>
                        (c.name || "").toLowerCase().includes(q) ||
                        (c.town || "").toLowerCase().includes(q),
                    )
                  : allCentres;
                if (filtered.length === 0) {
                  return (
                    <div className="text-[13px]" style={{ padding: 12, color: "#6B7280", ...POPPINS }}>
                      No centres found
                    </div>
                  );
                }
                return filtered.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => selectCentre(c)}
                    className="cursor-pointer"
                    style={{ padding: "10px 12px", borderBottom: "0.5px solid #F3F4F6" }}
                  >
                    <div className="text-[14px] font-semibold" style={{ color: "#0B1F3A", ...POPPINS }}>
                      {c.name}
                    </div>
                    {c.town ? (
                      <div className="text-[12px]" style={{ color: "#6B7280", ...POPPINS }}>
                        {c.town}
                      </div>
                    ) : null}
                  </div>
                ));
              })()}
            </div>
          </div>
        )}
        <div className="grid grid-cols-2 gap-2 mt-3">
          <a
            href={
              mapsQuery
                ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapsQuery)}`
                : undefined
            }
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center text-[13px] font-medium text-white"
            style={{
              height: 40,
              borderRadius: 8,
              backgroundColor: "#1877D6",
              opacity: mapsQuery ? 1 : 0.5,
              pointerEvents: mapsQuery ? "auto" : "none",
              ...POPPINS,
            }}
          >
            Google Maps
          </a>
          <a
            href={
              mapsQuery
                ? `https://maps.apple.com/?q=${encodeURIComponent(mapsQuery)}`
                : undefined
            }
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center text-[13px] font-medium"
            style={{
              height: 40,
              borderRadius: 8,
              backgroundColor: "#F3F4F6",
              color: "#0B1F3A",
              opacity: mapsQuery ? 1 : 0.5,
              pointerEvents: mapsQuery ? "auto" : "none",
              ...POPPINS,
            }}
          >
            Apple Maps
          </a>
        </div>
      </Card>

      {/* Post test */}
      <Card>
        <div className="flex items-center gap-2 mb-3">
          <Trophy size={18} color="#1877D6" />
          <h2 className="text-[15px] font-semibold" style={{ color: "#0B1F3A", ...POPPINS }}>
            Record test result
          </h2>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => recordResult(true)}
            className="inline-flex items-center justify-center text-[15px] font-semibold text-white"
            style={{
              height: 56,
              borderRadius: 10,
              backgroundColor: "#1877D6",
              border: "none",
              ...POPPINS,
            }}
          >
            PASSED 🎉
          </button>
          <button
            type="button"
            onClick={() => recordResult(false)}
            className="inline-flex items-center justify-center text-[15px] font-semibold text-white"
            style={{
              height: 56,
              borderRadius: 10,
              backgroundColor: "#1877D6",
              border: "none",
              ...POPPINS,
            }}
          >
            FAILED
          </button>
        </div>
        {askRetest && (
          <div
            className="mt-3 p-3"
            style={{
              backgroundColor: "#EEF2F7",
              borderRadius: 8,
              ...POPPINS,
            }}
          >
            <p className="text-[13px]" style={{ color: "#0B1F3A" }}>
              Would you like to claim the free re-test guarantee?
            </p>
            <div className="flex gap-2 mt-2">
              <button
                type="button"
                onClick={() => {
                  toast.success("Re-test claim noted");
                  setAskRetest(false);
                }}
                className="text-[12px] font-medium text-white px-3 py-1.5"
                style={{ borderRadius: 6, backgroundColor: "#1877D6", border: "none" }}
              >
                Yes, claim
              </button>
              <button
                type="button"
                onClick={() => setAskRetest(false)}
                className="text-[12px] font-medium px-3 py-1.5"
                style={{
                  borderRadius: 6,
                  backgroundColor: "#FFFFFF",
                  color: "#0B1F3A",
                  border: "1px solid #EEF2F7",
                }}
              >
                No thanks
              </button>
            </div>
          </div>
        )}
      </Card>

      {/* Confetti */}
      {confetti && <Confetti />}
    </div>
  );
}

function Confetti() {
  const pieces = Array.from({ length: 60 });
  const colors = ["#1877D6", "#1877D6", "#1877D6", "#1877D6", "#1877D6"];
  return (
    <>
      <style>{`
        @keyframes td-fall {
          0% { transform: translateY(-10vh) rotate(0deg); opacity: 1; }
          100% { transform: translateY(110vh) rotate(720deg); opacity: 0.6; }
        }
      `}</style>
      <div
        style={{
          position: "fixed",
          inset: 0,
          pointerEvents: "none",
          overflow: "hidden",
          zIndex: 9999,
        }}
      >
        {pieces.map((_, i) => {
          const left = Math.random() * 100;
          const delay = Math.random() * 1.5;
          const dur = 2 + Math.random() * 2;
          const color = colors[i % colors.length];
          const size = 6 + Math.random() * 6;
          return (
            <span
              key={i}
              style={{
                position: "absolute",
                top: 0,
                left: `${left}%`,
                width: size,
                height: size * 1.6,
                backgroundColor: color,
                borderRadius: 2,
                animation: `td-fall ${dur}s linear ${delay}s forwards`,
              }}
            />
          );
        })}
      </div>
    </>
  );
}

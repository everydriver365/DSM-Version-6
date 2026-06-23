import { useEffect, useState } from "react";
import {
  Banknote,
  ArrowLeftRight,
  Gift,
  CheckCircle2,
  PartyPopper,
  X,
} from "lucide-react";

type ProgressLevel =
  | "not_started"
  | "introduced"
  | "talk_through"
  | "prompted"
  | "seldom_prompted"
  | "independent";

const LEVELS: {
  key: Exclude<ProgressLevel, "not_started">;
  n: 1 | 2 | 3 | 4 | 5;
  label: string;
  color: string;
}[] = [
  { key: "introduced", n: 1, label: "Introduced", color: "#9CA3AF" },
  { key: "talk_through", n: 2, label: "Talk-through", color: "#DC2626" },
  { key: "prompted", n: 3, label: "Prompted", color: "#F59E0B" },
  { key: "seldom_prompted", n: 4, label: "Seldom prompted", color: "#84CC16" },
  { key: "independent", n: 5, label: "Independent", color: "#16A34A" },
];

function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}
import { toast } from "sonner";
import { supabase } from "../../lib/supabaseClient";

const POPPINS = { fontFamily: "Poppins, sans-serif" } as const;

export interface EndLessonWizardProps {
  open: boolean;
  onClose: () => void;
  lessonId: string;
  pupilId: string;
  pupilName: string;
  instructorId: string;
  durationMinutes: number;
  lessonDate: string;
  startTime: string;
  onCompleted: () => void;
}

type PaymentMethod = "cash" | "bank" | "already_paid" | "waived";

const COMPETENCIES = [
  "Cockpit checks",
  "Moving off",
  "Steering",
  "Clutch control",
  "Gear changing",
  "Braking",
  "Junctions",
  "Roundabouts",
  "Dual carriageways",
  "Motorway",
  "Town driving",
  "Hazard perception",
  "Manoeuvres",
  "Emergency stop",
  "Independent driving",
  "Bay parking",
  "Parallel parking",
  "Theory",
];

// Map wizard label -> syllabus item_keys used by the Progress page.
// Empty array means no syllabus match; we fall back to an `eol_<slug>` key.
const SKILL_MAP: Record<string, string[]> = {
  "Cockpit checks": ["safety_cockpit_drill"],
  "Moving off": ["move_off_level", "move_off_hill", "move_off_angle"],
  Steering: ["safety_controls"],
  "Clutch control": ["safety_controls"],
  "Gear changing": ["safety_controls"],
  Braking: ["stopping_normal"],
  Junctions: [
    "junc_t_emerge",
    "junc_t_approach",
    "junc_crossroads",
    "junc_traffic_lights",
  ],
  Roundabouts: ["junc_roundabouts", "junc_mini_roundabouts"],
  "Dual carriageways": [
    "dual_joining",
    "dual_leaving",
    "dual_lane_discipline",
    "dual_overtaking",
  ],
  "Hazard perception": ["aware_observation", "aware_anticipation"],
  Manoeuvres: ["man_pull_up_right"],
  "Emergency stop": ["man_emergency_stop", "em_stop_technique", "em_stop_control"],
  "Independent driving": ["ind_sat_nav", "ind_road_signs", "ind_route_planning"],
  "Bay parking": ["man_bay_park_reverse", "man_bay_park_forward"],
  "Parallel parking": ["man_parallel_park"],
  Motorway: [],
  "Town driving": [],
  Theory: [],
};

const LEVEL_RANK: Record<ProgressLevel, number> = {
  not_started: 0,
  introduced: 1,
  talk_through: 2,
  prompted: 3,
  seldom_prompted: 4,
  independent: 5,
};

interface RouteSummary {
  distance_miles: number | null;
  duration_minutes: number | null;
  max_speed_mph: number | null;
  overspeed_count: number;
}

function formatDate(iso: string) {
  try {
    const d = new Date(`${iso}T00:00:00`);
    return d.toLocaleDateString("en-GB", {
      weekday: "short",
      day: "numeric",
      month: "short",
    });
  } catch {
    return iso;
  }
}

export function EndLessonWizard(props: EndLessonWizardProps) {
  const {
    open,
    onClose,
    lessonId,
    pupilId,
    pupilName,
    instructorId,
    durationMinutes,
    lessonDate,
    startTime,
    onCompleted,
  } = props;

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [notes, setNotes] = useState("");
  const [route, setRoute] = useState<RouteSummary | null>(null);

  const [hourlyRate, setHourlyRate] = useState<number>(40);
  const [balance, setBalance] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [amount, setAmount] = useState<string>("");
  const [paymentRecorded, setPaymentRecorded] = useState(false);
  const [paymentSaving, setPaymentSaving] = useState(false);

  const [levels, setLevels] = useState<Record<string, ProgressLevel>>({});
  const [progressComments, setProgressComments] = useState("");

  const [completing, setCompleting] = useState(false);
  const [done, setDone] = useState(false);
  const [courseComplete, setCourseComplete] = useState(false);
  const [finalDistance, setFinalDistance] = useState<number | null>(null);
  const [finalPaymentLabel, setFinalPaymentLabel] = useState<string>("Skipped");

  const lessonCost = +(hourlyRate * (durationMinutes / 60)).toFixed(2);

  // Reset when opening
  useEffect(() => {
    if (!open) return;
    setStep(1);
    setNotes("");
    setPaymentMethod("cash");
    setPaymentRecorded(false);
    setPaymentSaving(false);
    setLevels({});
    setProgressComments("");
    setCompleting(false);
    setDone(false);
    setCourseComplete(false);
    setFinalDistance(null);
    setFinalPaymentLabel("Skipped");
  }, [open, lessonId]);

  // Load route + instructor rate + pupil balance
  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    (async () => {
      const { data: r } = await supabase
        .from("lesson_routes")
        .select("distance_miles, duration_minutes, max_speed_mph, overspeed_count, overspeed_events")
        .eq("lesson_id", lessonId)
        .maybeSingle();
      if (cancelled) return;
      if (r) {
        const overspeed =
          (r as { overspeed_count?: number | null }).overspeed_count ??
          (Array.isArray((r as { overspeed_events?: unknown[] }).overspeed_events)
            ? ((r as { overspeed_events?: unknown[] }).overspeed_events as unknown[]).length
            : 0);
        setRoute({
          distance_miles: (r as { distance_miles: number | null }).distance_miles,
          duration_minutes: (r as { duration_minutes: number | null }).duration_minutes,
          max_speed_mph: (r as { max_speed_mph: number | null }).max_speed_mph,
          overspeed_count: overspeed ?? 0,
        });
        setFinalDistance((r as { distance_miles: number | null }).distance_miles);
      } else {
        setRoute(null);
      }

      const { data: prof } = await supabase
        .from("instructors_profile")
        .select("hourly_rate")
        .eq("user_id", instructorId)
        .maybeSingle();
      if (!cancelled && prof && (prof as { hourly_rate: number | null }).hourly_rate != null) {
        setHourlyRate(Number((prof as { hourly_rate: number }).hourly_rate));
      }

      const { data: p } = await supabase
        .from("pupils")
        .select("balance_owed")
        .eq("id", pupilId)
        .maybeSingle();
      if (!cancelled && p) {
        // DB stores amount owed (positive = pupil owes). Internal `balance` uses
        // account-balance semantics (positive = credit, negative = owes).
        setBalance(-Number((p as { balance_owed: number | null }).balance_owed ?? 0));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, lessonId, instructorId, pupilId]);

  // Pre-fill amount when entering step 2
  useEffect(() => {
    if (step === 2 && !amount) {
      setAmount(lessonCost.toFixed(2));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, lessonCost]);

  if (!open) return null;

  const recordPayment = async () => {
    setPaymentSaving(true);
    const amt = Number(amount) || 0;
    const newBalance = balance + (amt - lessonCost);

    const paymentStatus =
      paymentMethod === "waived"
        ? "waived"
        : paymentMethod === "already_paid"
          ? "paid"
          : "paid";

    const { error: lErr } = await supabase
      .from("lessons")
      .update({
        payment_status: paymentStatus,
        amount_due: lessonCost,
      })
      .eq("id", lessonId);

    if (lErr) {
      console.error("[eol-wizard] payment lesson update", lErr);
      toast.error("Couldn't record payment");
      setPaymentSaving(false);
      return;
    }

    if (paymentMethod !== "waived") {
      const { error: pErr } = await supabase
        .from("pupils")
        .update({ balance_owed: -newBalance })
        .eq("id", pupilId);
      if (pErr) console.warn("[eol-wizard] balance update failed", pErr);
      else setBalance(newBalance);
    }

    try {
      await supabase.from("lesson_history").insert({
        lesson_id: lessonId,
        instructor_id: instructorId,
        pupil_id: pupilId,
        lesson_date: lessonDate,
        lesson_time: startTime,
        duration_minutes: durationMinutes,
        payment_status: paymentStatus,
        payment_method: paymentMethod,
        amount: amt,
      });
    } catch (e) {
      console.warn("[eol-wizard] payment history insert failed", e);
    }

    setPaymentRecorded(true);
    setFinalPaymentLabel(
      paymentMethod === "cash"
        ? "Paid · Cash"
        : paymentMethod === "bank"
          ? "Paid · Bank transfer"
          : paymentMethod === "waived"
            ? "Waived"
            : "Already paid",
    );
    setPaymentSaving(false);
    toast.success("Payment recorded");
    setStep(3);
  };

  const skipPayment = () => {
    setFinalPaymentLabel("Skipped");
    setStep(3);
  };

  const completeEol = async () => {
    setCompleting(true);
    const nowIso = new Date().toISOString();

    const { error } = await supabase
      .from("lessons")
      .update({
        status: "completed",
        eol_completed: true,
        eol_completed_at: nowIso,
        notes,
      })
      .eq("id", lessonId);

    if (error) {
      console.error("[eol-wizard] complete error", error);
      toast.error("Couldn't complete lesson");
      setCompleting(false);
      return;
    }

    const updatedEntries = Object.entries(levels).filter(
      ([, v]) => v && v !== "not_started",
    ) as [string, ProgressLevel][];
    const practisedList = updatedEntries.map(([label]) => label);

    // Build "Skills updated: Roundabouts (4), Steering (3)" summary line.
    const skillsSummary = updatedEntries
      .map(([label, status]) => `${label} (${LEVEL_RANK[status]})`)
      .join(", ");

    let combinedNotes = progressComments
      ? `${notes}\n\nProgress: ${progressComments}`
      : notes;
    if (skillsSummary) {
      combinedNotes = `${combinedNotes}${combinedNotes ? "\n" : ""}Skills updated: ${skillsSummary}`;
    }

    try {
      await supabase.from("lesson_history").insert({
        lesson_id: lessonId,
        instructor_id: instructorId,
        pupil_id: pupilId,
        lesson_date: lessonDate,
        lesson_time: startTime,
        duration_minutes: durationMinutes,
        payment_status: paymentRecorded ? "paid" : "unpaid",
        payment_method: paymentRecorded ? paymentMethod : null,
        notes: combinedNotes,
        skills_practised: practisedList,
        eol_theory_checked: true,
        eol_payment_done: paymentRecorded,
        eol_notes_done: true,
      });
    } catch (e) {
      console.warn("[eol-wizard] history insert failed (non-fatal)", e);
    }

    // Update pupil progress rows (best-effort) — upsert by (pupil_id, item_key).
    // Map wizard labels to syllabus keys so they show on the Progress page.
    // Never downgrade an existing higher level.
    const appliedLabels: { label: string; level: number }[] = [];
    const blockedLabels: { label: string; tried: number; existing: number }[] = [];

    if (updatedEntries.length > 0) {
      try {
        // Resolve target item_keys per wizard label.
        const perLabelTargets = updatedEntries.map(([label, status]) => {
          const mapped = SKILL_MAP[label];
          const keys =
            mapped && mapped.length > 0 ? mapped : [`eol_${slugify(label)}`];
          return { label, status, keys };
        });

        // Read existing statuses for all referenced keys.
        const itemKeys = Array.from(
          new Set(perLabelTargets.flatMap((t) => t.keys)),
        );
        const existing: Record<string, ProgressLevel> = {};
        const { data: existingRows } = await supabase
          .from("pupil_progress")
          .select("item_key, status")
          .eq("pupil_id", pupilId)
          .in("item_key", itemKeys);
        for (const r of (existingRows ?? []) as {
          item_key: string;
          status: string | null;
        }[]) {
          const s = r.status as ProgressLevel | null;
          if (s && s in LEVEL_RANK) existing[r.item_key] = s;
        }

        // Per-label outcome + final upsert set with no-downgrade.
        const finalByKey: Record<string, ProgressLevel> = {};
        for (const { label, status, keys } of perLabelTargets) {
          const newRank = LEVEL_RANK[status];
          let anyApplied = false;
          let maxBlockingExisting = 0;
          for (const k of keys) {
            const prior = finalByKey[k] ?? existing[k] ?? "not_started";
            const priorRank = LEVEL_RANK[prior];
            if (newRank >= priorRank) {
              finalByKey[k] = status;
              anyApplied = true;
            } else {
              if (priorRank > maxBlockingExisting) maxBlockingExisting = priorRank;
            }
          }
          if (anyApplied) {
            appliedLabels.push({ label, level: newRank });
          } else {
            blockedLabels.push({
              label,
              tried: newRank,
              existing: maxBlockingExisting,
            });
          }
        }

        const rows = Object.entries(finalByKey).map(([item_key, status]) => ({
          pupil_id: pupilId,
          instructor_id: instructorId,
          item_key,
          status,
          updated_at: nowIso,
        }));

        if (rows.length > 0) {
          await supabase
            .from("pupil_progress")
            .upsert(rows, { onConflict: "pupil_id,item_key" });
        }
      } catch (e) {
        console.warn("[eol-wizard] pupil_progress upsert failed", e);
      }
    }

    // Summary toast for skill saves.
    if (appliedLabels.length > 0 || blockedLabels.length > 0) {
      const appliedSummary = appliedLabels
        .map((a) => `${a.label} (${a.level})`)
        .join(", ");
      const blockedSummary = blockedLabels
        .map((b) => `${b.label} (tried ${b.tried}, kept ${b.existing})`)
        .join(", ");

      if (appliedLabels.length > 0 && blockedLabels.length === 0) {
        toast.success(`Saved ${appliedLabels.length} skill score${appliedLabels.length === 1 ? "" : "s"}`, {
          description: appliedSummary,
        });
      } else if (appliedLabels.length > 0 && blockedLabels.length > 0) {
        toast.success(`Saved ${appliedLabels.length} skill score${appliedLabels.length === 1 ? "" : "s"}`, {
          description: `${appliedSummary}\nNot downgraded: ${blockedSummary}`,
        });
      } else {
        toast.warning("No skill scores saved — existing levels are higher", {
          description: blockedSummary,
        });
      }
    }


    // Check course completion
    try {
      const { data: p } = await supabase
        .from("pupils")
        .select("total_hours_completed, course_total_hours")
        .eq("id", pupilId)
        .maybeSingle();
      if (p) {
        const total = Number((p as { total_hours_completed: number | null }).total_hours_completed ?? 0);
        const target = Number((p as { course_total_hours: number | null }).course_total_hours ?? 0);
        if (target > 0 && total >= target) setCourseComplete(true);
      }
    } catch {
      /* ignore */
    }

    setCompleting(false);
    setDone(true);
  };

  const finish = () => {
    onCompleted();
    onClose();
  };

  const ProgressBar = ({ current }: { current: 1 | 2 | 3 }) => (
    <div className="flex items-center gap-2 mb-4">
      {[1, 2, 3].map((n) => (
        <div
          key={n}
          style={{
            flex: 1,
            height: 4,
            borderRadius: 999,
            backgroundColor: n <= current ? "#16A34A" : "#E2E6ED",
          }}
        />
      ))}
      <span
        className="text-[11px] ml-2"
        style={{ ...POPPINS, color: "#6B7280", fontWeight: 600 }}
      >
        Step {current} of 3
      </span>
    </div>
  );

  return (
    <div
      className="fixed inset-0 z-[90] flex items-end"
      style={{ backgroundColor: "rgba(15,32,68,0.4)", ...POPPINS }}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="absolute inset-0"
        aria-hidden
        onClick={() => !completing && !paymentSaving && onClose()}
      />
      <div
        className="relative w-full bg-white"
        style={{
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          padding: 20,
          maxHeight: "92vh",
          overflowY: "auto",
          boxShadow: "0 -10px 30px rgba(15,32,68,0.18)",
          paddingBottom: "calc(20px + env(safe-area-inset-bottom))",
        }}
      >
        <div
          style={{
            width: 36,
            height: 4,
            borderRadius: 999,
            backgroundColor: "#E2E6ED",
            margin: "0 auto 12px",
          }}
        />

        {!done && (
          <button
            type="button"
            aria-label="Close"
            onClick={() => !completing && !paymentSaving && onClose()}
            style={{
              position: "absolute",
              top: 16,
              right: 16,
              width: 28,
              height: 28,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <X size={18} color="#6B7280" />
          </button>
        )}

        {!done && <ProgressBar current={step} />}

        {/* STEP 1 — SUMMARY */}
        {!done && step === 1 && (
          <div>
            <div className="text-[16px] font-semibold" style={{ color: "#0F2044" }}>
              How did it go?
            </div>
            <div className="text-[12px] mt-1" style={{ color: "#6B7280" }}>
              {pupilName} · {formatDate(lessonDate)} · {durationMinutes} mins
            </div>

            <label
              className="block text-[12px] mt-4 mb-1"
              style={{ color: "#1A1A2E", fontWeight: 600 }}
            >
              Lesson notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="What did you cover? Any observations?"
              rows={4}
              className="w-full p-3 text-[14px]"
              style={{
                borderRadius: 10,
                border: "0.5px solid #E2E6ED",
                ...POPPINS,
                color: "#1A1A2E",
                resize: "vertical",
              }}
            />

            {route && (
              <div
                className="mt-4 p-3"
                style={{
                  borderRadius: 10,
                  backgroundColor: "#F8F9FB",
                  border: "0.5px solid #E2E6ED",
                }}
              >
                <div
                  className="text-[11px] uppercase mb-2"
                  style={{ color: "#6B7280", letterSpacing: "0.05em", fontWeight: 600 }}
                >
                  Route summary
                </div>
                <div className="grid grid-cols-2 gap-2 text-[13px]" style={{ color: "#1A1A2E" }}>
                  <div>
                    <div style={{ color: "#6B7280", fontSize: 11 }}>Distance</div>
                    <div style={{ fontWeight: 600 }}>
                      {route.distance_miles != null ? `${route.distance_miles.toFixed(1)} mi` : "—"}
                    </div>
                  </div>
                  <div>
                    <div style={{ color: "#6B7280", fontSize: 11 }}>Duration</div>
                    <div style={{ fontWeight: 600 }}>
                      {route.duration_minutes != null ? `${route.duration_minutes} min` : "—"}
                    </div>
                  </div>
                  <div>
                    <div style={{ color: "#6B7280", fontSize: 11 }}>Max speed</div>
                    <div style={{ fontWeight: 600 }}>
                      {route.max_speed_mph != null ? `${route.max_speed_mph} mph` : "—"}
                    </div>
                  </div>
                  <div>
                    <div style={{ color: "#6B7280", fontSize: 11 }}>Overspeed</div>
                    <div
                      style={{
                        fontWeight: 600,
                        color: route.overspeed_count > 0 ? "#CC2229" : "#16A34A",
                      }}
                    >
                      {route.overspeed_count} event{route.overspeed_count === 1 ? "" : "s"}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <button
              type="button"
              disabled={!notes.trim()}
              onClick={() => setStep(2)}
              className="mt-5 w-full h-11 rounded-lg text-[14px] font-semibold text-white"
              style={{
                backgroundColor: notes.trim() ? "#16A34A" : "#9CA3AF",
                border: "none",
              }}
            >
              Next: Payment →
            </button>
          </div>
        )}

        {/* STEP 2 — PAYMENT */}
        {!done && step === 2 && (
          <div>
            <div className="text-[16px] font-semibold" style={{ color: "#0F2044" }}>
              Record payment
            </div>
            <div className="text-[12px] mt-1" style={{ color: "#6B7280" }}>
              {pupilName} · {durationMinutes} mins
            </div>

            <div
              className="mt-3 p-3 flex items-center justify-between"
              style={{
                borderRadius: 10,
                backgroundColor: "#F8F9FB",
                border: "0.5px solid #E2E6ED",
              }}
            >
              <div>
                <div className="text-[11px]" style={{ color: "#6B7280" }}>
                  Lesson cost
                </div>
                <div className="text-[18px]" style={{ color: "#0F2044", fontWeight: 700 }}>
                  £{lessonCost.toFixed(2)}
                </div>
              </div>
              <div className="text-right">
                <div className="text-[11px]" style={{ color: "#6B7280" }}>
                  Balance
                </div>
                <div
                  className="text-[14px]"
                  style={{
                    color: balance < 0 ? "#CC2229" : balance > 0 ? "#16A34A" : "#0F2044",
                    fontWeight: 600,
                  }}
                >
                  {balance < 0 ? "−" : ""}£{Math.abs(balance).toFixed(2)}
                  <span style={{ color: "#6B7280", fontWeight: 400, marginLeft: 4 }}>
                    {balance < 0 ? "owes" : balance > 0 ? "credit" : ""}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 mt-4">
              {(
                [
                  { k: "cash", label: "Cash", icon: <Banknote size={20} /> },
                  { k: "bank", label: "Bank transfer", icon: <ArrowLeftRight size={20} /> },
                  { k: "already_paid", label: "Already paid", icon: <CheckCircle2 size={20} /> },
                  { k: "waived", label: "Waived", icon: <Gift size={20} /> },
                ] as { k: PaymentMethod; label: string; icon: React.ReactNode }[]
              ).map((m) => {
                const active = paymentMethod === m.k;
                return (
                  <button
                    key={m.k}
                    type="button"
                    onClick={() => setPaymentMethod(m.k)}
                    className="flex flex-col items-center justify-center gap-1 p-3"
                    style={{
                      borderRadius: 10,
                      backgroundColor: active ? "#F0FDF4" : "#F8F9FB",
                      border: `1px solid ${active ? "#16A34A" : "#E2E6ED"}`,
                      color: active ? "#16A34A" : "#1A1A2E",
                      minHeight: 72,
                    }}
                  >
                    {m.icon}
                    <span className="text-[12px]" style={{ fontWeight: 600 }}>
                      {m.label}
                    </span>
                  </button>
                );
              })}
            </div>

            <label
              className="block text-[12px] mt-4 mb-1"
              style={{ color: "#1A1A2E", fontWeight: 600 }}
            >
              Amount (£)
            </label>
            <input
              type="number"
              inputMode="decimal"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full p-3 text-[14px]"
              style={{
                borderRadius: 10,
                border: "0.5px solid #E2E6ED",
                ...POPPINS,
                color: "#1A1A2E",
              }}
            />

            <button
              type="button"
              onClick={recordPayment}
              disabled={paymentSaving}
              className="mt-5 w-full h-11 rounded-lg text-[14px] font-semibold text-white"
              style={{
                backgroundColor: "#16A34A",
                border: "none",
                opacity: paymentSaving ? 0.7 : 1,
              }}
            >
              {paymentSaving ? "Saving…" : "Record payment"}
            </button>
            <button
              type="button"
              onClick={skipPayment}
              disabled={paymentSaving}
              className="mt-2 w-full h-10 text-[13px]"
              style={{ color: "#6B7280", backgroundColor: "transparent", fontWeight: 500 }}
            >
              Skip payment
            </button>
          </div>
        )}

        {/* STEP 3 — SKILLS */}
        {!done && step === 3 && (
          <div>
            <div className="text-[16px] font-semibold" style={{ color: "#0F2044" }}>
              Pupil progress
            </div>
            <div className="text-[12px] mt-1" style={{ color: "#6B7280" }}>
              Any skills to update?
            </div>

            <div className="mt-3 flex flex-col gap-2">
              {COMPETENCIES.map((c) => {
                const current = levels[c] ?? "not_started";
                return (
                  <div
                    key={c}
                    className="p-2"
                    style={{
                      borderRadius: 10,
                      backgroundColor: "#F8F9FB",
                      border: "0.5px solid #E2E6ED",
                    }}
                  >
                    <div
                      className="text-[13px] mb-2"
                      style={{ color: "#1A1A2E", fontWeight: 600 }}
                    >
                      {c}
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {LEVELS.map((l) => {
                        const active = current === l.key;
                        return (
                          <button
                            key={l.key}
                            type="button"
                            aria-label={`${c}: ${l.label}`}
                            title={l.label}
                            onClick={() =>
                              setLevels((prev) => ({ ...prev, [c]: l.key }))
                            }
                            style={{
                              width: 30,
                              height: 30,
                              borderRadius: 999,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: 12,
                              fontWeight: 700,
                              color: active ? "#FFFFFF" : l.color,
                              backgroundColor: active ? l.color : "#FFFFFF",
                              border: `1.5px solid ${l.color}`,
                              cursor: "pointer",
                            }}
                          >
                            {l.n}
                          </button>
                        );
                      })}
                      {current !== "not_started" && (
                        <button
                          type="button"
                          onClick={() =>
                            setLevels((prev) => {
                              const next = { ...prev };
                              delete next[c];
                              return next;
                            })
                          }
                          className="text-[11px] ml-1"
                          style={{
                            color: "#6B7280",
                            background: "transparent",
                            border: "none",
                            textDecoration: "underline",
                          }}
                        >
                          Reset
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div
              className="mt-3 p-2 text-[11px] flex flex-wrap gap-x-3 gap-y-1"
              style={{ color: "#6B7280" }}
            >
              {LEVELS.map((l) => (
                <span key={l.key} className="flex items-center gap-1">
                  <span
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: 999,
                      backgroundColor: l.color,
                      display: "inline-block",
                    }}
                  />
                  {l.n} {l.label}
                </span>
              ))}
            </div>

            <label
              className="block text-[12px] mt-4 mb-1"
              style={{ color: "#1A1A2E", fontWeight: 600 }}
            >
              Comments on progress (optional)
            </label>
            <textarea
              value={progressComments}
              onChange={(e) => setProgressComments(e.target.value)}
              rows={3}
              className="w-full p-3 text-[14px]"
              style={{
                borderRadius: 10,
                border: "0.5px solid #E2E6ED",
                ...POPPINS,
                color: "#1A1A2E",
                resize: "vertical",
              }}
            />

            <button
              type="button"
              onClick={completeEol}
              disabled={completing}
              className="mt-5 w-full h-11 rounded-lg text-[14px] font-semibold text-white"
              style={{
                backgroundColor: "#16A34A",
                border: "none",
                opacity: completing ? 0.7 : 1,
              }}
            >
              {completing ? "Completing…" : "Complete EOL"}
            </button>
          </div>
        )}

        {/* COMPLETION SCREEN */}
        {done && (
          <div className="flex flex-col items-center text-center py-4">
            {courseComplete ? (
              <>
                <div style={{ position: "relative" }}>
                  <PartyPopper size={64} color="#16A34A" />
                  <div className="confetti-burst" aria-hidden />
                </div>
                <div
                  className="text-[20px] mt-3"
                  style={{ color: "#0F2044", fontWeight: 700 }}
                >
                  Course complete! 🎓
                </div>
                <div
                  className="text-[13px] mt-1"
                  style={{ color: "#6B7280" }}
                >
                  Congratulations! {pupilName} has completed their course.
                </div>
              </>
            ) : (
              <>
                <CheckCircle2 size={64} color="#16A34A" />
                <div
                  className="text-[20px] mt-3"
                  style={{ color: "#0F2044", fontWeight: 700 }}
                >
                  Lesson complete! 🎉
                </div>
              </>
            )}

            <div
              className="w-full mt-4 p-3"
              style={{
                borderRadius: 10,
                backgroundColor: "#F8F9FB",
                border: "0.5px solid #E2E6ED",
                textAlign: "left",
              }}
            >
              <div className="flex justify-between text-[13px] py-1">
                <span style={{ color: "#6B7280" }}>Pupil</span>
                <span style={{ color: "#1A1A2E", fontWeight: 600 }}>{pupilName}</span>
              </div>
              <div className="flex justify-between text-[13px] py-1">
                <span style={{ color: "#6B7280" }}>Duration</span>
                <span style={{ color: "#1A1A2E", fontWeight: 600 }}>{durationMinutes} mins</span>
              </div>
              {finalDistance != null && (
                <div className="flex justify-between text-[13px] py-1">
                  <span style={{ color: "#6B7280" }}>Distance</span>
                  <span style={{ color: "#1A1A2E", fontWeight: 600 }}>
                    {finalDistance.toFixed(1)} mi
                  </span>
                </div>
              )}
              <div className="flex justify-between text-[13px] py-1">
                <span style={{ color: "#6B7280" }}>Payment</span>
                <span style={{ color: "#1A1A2E", fontWeight: 600 }}>{finalPaymentLabel}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={finish}
              className="mt-5 w-full h-11 rounded-lg text-[14px] font-semibold text-white"
              style={{ backgroundColor: "#16A34A", border: "none" }}
            >
              Done
            </button>
          </div>
        )}

        <style>{`
          @keyframes confetti-pop {
            0% { transform: scale(0.2); opacity: 0; }
            40% { opacity: 1; }
            100% { transform: scale(2.2); opacity: 0; }
          }
          .confetti-burst {
            position: absolute;
            inset: -20px;
            border-radius: 999px;
            background: radial-gradient(circle, #F59E0B 0%, transparent 30%), radial-gradient(circle at 70% 30%, #1D4ED8 0%, transparent 25%), radial-gradient(circle at 30% 70%, #CC2229 0%, transparent 25%);
            animation: confetti-pop 1.2s ease-out infinite;
            pointer-events: none;
          }
        `}</style>
      </div>
    </div>
  );
}

export default EndLessonWizard;

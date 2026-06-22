import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Check } from "lucide-react";
import { SectionHeader } from "../components/dsm/SectionHeader";
import { Button } from "../components/dsm/Button";
import { supabase } from "../lib/supabaseClient";

export const Route = createFileRoute("/pupils/progress/$id")({
  head: () => ({ meta: [{ title: "Progress — DSM by EveryDriver" }] }),
  component: PupilProgressPage,
});

const POPPINS = { fontFamily: "Poppins, sans-serif" } as const;

type Status = "not_started" | "in_progress" | "competent";

const SYLLABUS: { title: string; items: { key: string; label: string }[] }[] = [
  {
    title: "Safety & vehicle checks",
    items: [
      { key: "safety_cockpit_drill", label: "Cockpit drill" },
      { key: "safety_show_me_tell_me", label: "Show me / tell me" },
      { key: "safety_controls", label: "Controls & instruments" },
    ],
  },
  {
    title: "Moving off & stopping",
    items: [
      { key: "move_off_level", label: "Moving off on the level" },
      { key: "move_off_hill", label: "Moving off uphill" },
      { key: "move_off_angle", label: "Moving off at an angle" },
      { key: "stopping_normal", label: "Stopping in a safe place" },
    ],
  },
  {
    title: "Junctions & roundabouts",
    items: [
      { key: "junc_t_emerge", label: "T-junctions emerging" },
      { key: "junc_t_approach", label: "T-junctions approaching" },
      { key: "junc_crossroads", label: "Crossroads" },
      { key: "junc_roundabouts", label: "Roundabouts" },
      { key: "junc_mini_roundabouts", label: "Mini roundabouts" },
      { key: "junc_traffic_lights", label: "Traffic lights" },
      { key: "junc_yellow_box", label: "Yellow box junctions" },
      { key: "junc_filter_lanes", label: "Filter lanes" },
    ],
  },
  {
    title: "Dual carriageways",
    items: [
      { key: "dual_joining", label: "Joining dual carriageways" },
      { key: "dual_leaving", label: "Leaving dual carriageways" },
      { key: "dual_lane_discipline", label: "Lane discipline" },
      { key: "dual_overtaking", label: "Overtaking safely" },
    ],
  },
  {
    title: "Manoeuvres",
    items: [
      { key: "man_parallel_park", label: "Parallel park" },
      { key: "man_bay_park_forward", label: "Bay park (forward)" },
      { key: "man_bay_park_reverse", label: "Bay park (reverse)" },
      { key: "man_pull_up_right", label: "Pull up on the right" },
      { key: "man_emergency_stop", label: "Controlled stop" },
    ],
  },
  {
    title: "Independent driving",
    items: [
      { key: "ind_sat_nav", label: "Following sat nav" },
      { key: "ind_road_signs", label: "Following road signs" },
      { key: "ind_route_planning", label: "Route planning" },
    ],
  },
  {
    title: "Emergency stop",
    items: [
      { key: "em_stop_technique", label: "Technique" },
      { key: "em_stop_control", label: "Vehicle control" },
    ],
  },
  {
    title: "Awareness & planning",
    items: [
      { key: "aware_observation", label: "Observation" },
      { key: "aware_anticipation", label: "Anticipation" },
      { key: "aware_pedestrians", label: "Pedestrians & cyclists" },
      { key: "aware_speed", label: "Use of speed" },
    ],
  },
];

const ALL_ITEMS = SYLLABUS.flatMap((s) => s.items);

function nextStatus(s: Status): Status {
  if (s === "not_started") return "in_progress";
  if (s === "in_progress") return "competent";
  return "not_started";
}

function PupilProgressPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [pupilName, setPupilName] = useState<string>("");
  const [statuses, setStatuses] = useState<Record<string, Status>>({});
  const [userId, setUserId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));

    supabase
      .from("pupils")
      .select("name")
      .eq("id", id)
      .maybeSingle()
      .then(({ data }) => setPupilName((data as { name: string } | null)?.name ?? ""));

    supabase
      .from("pupil_progress")
      .select("item_key, status")
      .eq("pupil_id", id)
      .then(({ data, error }) => {
        if (error) {
          console.error("[pupil-progress] fetch error", error);
          return;
        }
        const map: Record<string, Status> = {};
        for (const r of (data ?? []) as { item_key: string; status: Status }[]) {
          map[r.item_key] = r.status;
        }
        setStatuses(map);
      });
  }, [id]);

  function statusOf(key: string): Status {
    return statuses[key] ?? "not_started";
  }

  function cycle(key: string) {
    setStatuses((prev) => ({ ...prev, [key]: nextStatus(statusOf(key)) }));
  }

  const competentCount = ALL_ITEMS.filter((i) => statusOf(i.key) === "competent").length;
  const totalCount = ALL_ITEMS.length;
  const pct = totalCount > 0 ? Math.round((competentCount / totalCount) * 100) : 0;

  async function save() {
    if (!userId) return;
    setSaving(true);
    setSaved(false);
    const rows = ALL_ITEMS.map((i) => ({
      instructor_id: userId,
      pupil_id: id,
      item_key: i.key,
      status: statusOf(i.key),
      updated_at: new Date().toISOString(),
    }));
    const { error } = await supabase
      .from("pupil_progress")
      .upsert(rows, { onConflict: "pupil_id,item_key" });
    setSaving(false);
    if (error) {
      console.error("[pupil-progress] save error", error);
      return;
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  // Ring
  const size = 140;
  const stroke = 12;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (pct / 100) * c;

  return (
    <div className="min-h-screen bg-white pb-32" style={POPPINS}>
      <div
        className="sticky top-0 z-40 flex items-center px-2"
        style={{ height: 52, backgroundColor: "#072b47" }}
      >
        <button
          type="button"
          aria-label="Back"
          onClick={() => navigate({ to: "/pupils/$id", params: { id } })}
          className="flex items-center justify-center"
          style={{ width: 40, height: 40 }}
        >
          <ArrowLeft size={22} color="#FFFFFF" />
        </button>
        <div className="flex-1 text-center">
          <div className="text-[15px] font-semibold text-white" style={POPPINS}>
            Progress
          </div>
          {pupilName && (
            <div className="text-[13px]" style={{ color: "#9CA3AF", ...POPPINS }}>
              {pupilName}
            </div>
          )}
        </div>
        <div style={{ width: 40 }} />
      </div>

      <div className="flex flex-col items-center mt-6">
        <div style={{ width: size, height: size, position: "relative" }}>
          <svg width={size} height={size}>
            <circle
              cx={size / 2}
              cy={size / 2}
              r={r}
              stroke="#E2E6ED"
              strokeWidth={stroke}
              fill="none"
            />
            <circle
              cx={size / 2}
              cy={size / 2}
              r={r}
              stroke="#16A34A"
              strokeWidth={stroke}
              fill="none"
              strokeDasharray={c}
              strokeDashoffset={offset}
              strokeLinecap="round"
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
              style={{ transition: "stroke-dashoffset 0.3s ease" }}
            />
          </svg>
          <div
            className="absolute inset-0 flex flex-col items-center justify-center"
            style={POPPINS}
          >
            <div className="text-[28px] font-semibold text-[#0F2044] leading-none">
              {pct}%
            </div>
            <div className="text-[12px] text-[#6B7280] mt-1">
              {competentCount} of {totalCount} items
            </div>
          </div>
        </div>
      </div>

      <div className="px-4">
        {SYLLABUS.map((section) => {
          const done = section.items.filter((i) => statusOf(i.key) === "competent").length;
          return (
            <div key={section.title}>
              <SectionHeader>
                {section.title.toUpperCase()} ({done}/{section.items.length})
              </SectionHeader>
              <div
                className="rounded-xl bg-white"
                style={{
                  borderWidth: "0.5px",
                  borderStyle: "solid",
                  borderColor: "#E2E6ED",
                }}
              >
                {section.items.map((it, idx) => {
                  const s = statusOf(it.key);
                  return (
                    <button
                      key={it.key}
                      type="button"
                      onClick={() => cycle(it.key)}
                      className="w-full flex items-center justify-between px-3 py-3 text-left"
                      style={{
                        borderTopWidth: idx === 0 ? 0 : "0.5px",
                        borderTopStyle: "solid",
                        borderTopColor: "#E2E6ED",
                      }}
                    >
                      <span
                        className="text-[14px] text-[#0F2044]"
                        style={POPPINS}
                      >
                        {it.label}
                      </span>
                      <StatusCircle status={s} />
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div
        className="fixed bottom-0 left-0 right-0 px-4 py-3 bg-white"
        style={{ borderTopWidth: "0.5px", borderTopStyle: "solid", borderTopColor: "#E2E6ED" }}
      >
        {saved && (
          <div
            className="text-center text-[12px] mb-2"
            style={{ color: "#16A34A", ...POPPINS }}
          >
            Saved
          </div>
        )}
        <Button onClick={save} disabled={saving}>
          {saving ? "Saving…" : "Save progress"}
        </Button>
      </div>
    </div>
  );
}

function StatusCircle({ status }: { status: Status }) {
  if (status === "competent") {
    return (
      <span
        className="flex items-center justify-center rounded-full shrink-0"
        style={{ width: 24, height: 24, backgroundColor: "#16A34A" }}
      >
        <Check size={14} color="#FFFFFF" strokeWidth={3} />
      </span>
    );
  }
  if (status === "in_progress") {
    return (
      <span
        className="rounded-full shrink-0"
        style={{
          width: 24,
          height: 24,
          background: "linear-gradient(90deg, #F59E0B 50%, #FFFFFF 50%)",
          borderWidth: 2,
          borderStyle: "solid",
          borderColor: "#F59E0B",
        }}
      />
    );
  }
  return (
    <span
      className="rounded-full shrink-0"
      style={{
        width: 24,
        height: 24,
        borderWidth: 2,
        borderStyle: "solid",
        borderColor: "#D1D5DB",
      }}
    />
  );
}

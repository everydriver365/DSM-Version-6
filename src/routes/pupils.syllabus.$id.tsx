import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "../lib/supabaseClient";

export const Route = createFileRoute("/pupils/syllabus/$id")({
  head: () => ({ meta: [{ title: "Syllabus — DSM by EveryDriver" }] }),
  component: PupilSyllabusPage,
});

const POPPINS = { fontFamily: "Poppins, sans-serif" } as const;

type Competency = { id: string; name: string; description: string };
type Category = { key: string; title: string; items: Competency[] };

const DVSA_SYLLABUS: Category[] = [
  {
    key: "controls",
    title: "Controls",
    items: [
      { id: "safety_precautions", name: "Safety Precautions", description: "Pre-drive safety checks before moving off" },
      { id: "cockpit_drill", name: "Cockpit Drill", description: "Doors, seat, steering, seatbelt, mirrors" },
      { id: "controls_instruments", name: "Controls & Instruments", description: "Knowing & using primary and secondary controls" },
      { id: "moving_off", name: "Moving Off", description: "Safely, smoothly, with control on level/hill/angle" },
      { id: "making_progress_stopping", name: "Making Progress / Stopping", description: "Stopping smoothly in a safe place" },
    ],
  },
  {
    key: "road_procedure",
    title: "Road Procedure",
    items: [
      { id: "use_of_mirrors", name: "Use of Mirrors", description: "MSM routine effectively in all situations" },
      { id: "signals", name: "Signals", description: "Correct, timely signals to other road users" },
      { id: "response_signs_signals", name: "Response to Signs & Signals", description: "Reacting to road signs, markings, traffic lights" },
      { id: "use_of_speed", name: "Use of Speed", description: "Appropriate speed for conditions" },
      { id: "following_distance", name: "Following Distance", description: "Safe gap to the vehicle in front" },
      { id: "progress_hesitancy", name: "Progress & Hesitancy", description: "Making appropriate progress without undue hesitation" },
    ],
  },
  {
    key: "junctions",
    title: "Junctions",
    items: [
      { id: "junctions_turning", name: "Junctions - Turning", description: "Turning left & right at junctions" },
      { id: "junctions_emerging", name: "Junctions - Emerging", description: "Observation, judgement & decisions when emerging" },
      { id: "crossroads", name: "Crossroads", description: "Approach, observation & priority at crossroads" },
      { id: "roundabouts", name: "Roundabouts", description: "Mini, normal & multi-lane roundabouts" },
    ],
  },
  {
    key: "judgement",
    title: "Judgement",
    items: [
      { id: "meeting_traffic", name: "Meeting Traffic", description: "Judging gaps & priority with oncoming traffic" },
      { id: "crossing_traffic", name: "Crossing Traffic", description: "Crossing the path of oncoming traffic safely" },
      { id: "overtaking", name: "Overtaking", description: "Overtaking safely & legally" },
      { id: "pedestrian_crossings", name: "Pedestrian Crossings", description: "Approach & behaviour at all crossing types" },
      { id: "positioning", name: "Positioning", description: "Normal driving & lane discipline" },
      { id: "awareness_planning", name: "Awareness & Planning", description: "Anticipating hazards & planning ahead" },
    ],
  },
  {
    key: "manoeuvres",
    title: "Manoeuvres",
    items: [
      { id: "reverse_park_road", name: "Reverse Park (Road)", description: "Parallel park behind a vehicle on the road" },
      { id: "reverse_park_bay", name: "Reverse Park (Bay)", description: "Bay park (forward or reverse)" },
      { id: "pull_up_right", name: "Pull Up on Right", description: "Pull up on right, reverse 2 cars, rejoin" },
    ],
  },
  {
    key: "test_ready",
    title: "Test Ready",
    items: [
      { id: "independent_driving", name: "Independent Driving", description: "Follow sat nav or signs for ~20 minutes" },
      { id: "show_me_tell_me", name: "Show Me / Tell Me", description: "Vehicle safety questions" },
      { id: "emergency_stop", name: "Emergency Stop", description: "Stop promptly & safely in an emergency" },
    ],
  },
];

const TOTAL_COMPETENCIES = DVSA_SYLLABUS.reduce((sum, c) => sum + c.items.length, 0);
const MAX_POINTS = TOTAL_COMPETENCIES * 5;

const LEVEL_META: { n: 0 | 1 | 2 | 3 | 4 | 5; label: string; color: string }[] = [
  { n: 0, label: "Not started", color: "#9CA3AF" },
  { n: 1, label: "Introduced", color: "#DC2626" },
  { n: 2, label: "Under guidance", color: "#EA580C" },
  { n: 3, label: "Prompted", color: "#EAB308" },
  { n: 4, label: "Seldom prompted", color: "#1A52A0" },
  { n: 5, label: "Independent", color: "#16A34A" },
];

function levelColor(n: number) {
  return LEVEL_META[n]?.color ?? "#9CA3AF";
}

function PupilSyllabusPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [pupilName, setPupilName] = useState("");
  const [levels, setLevels] = useState<Record<string, number>>({});
  const [initial, setInitial] = useState<Record<string, number>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    [DVSA_SYLLABUS[0].key]: true,
  });
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: p } = await supabase
        .from("pupils")
        .select("name")
        .eq("id", id)
        .maybeSingle();
      if (p) setPupilName((p as { name: string }).name);

      const { data, error } = await supabase
        .from("pupil_syllabus_progress")
        .select("competency_id, level")
        .eq("pupil_id", id);
      if (error) console.error("[syllabus] fetch", error);
      const map: Record<string, number> = {};
      ((data as { competency_id: string; level: number }[]) ?? []).forEach((r) => {
        map[r.competency_id] = r.level;
      });
      setLevels(map);
      setInitial(map);
      setLoading(false);
    })();
  }, [id]);

  const totalPoints = useMemo(
    () =>
      DVSA_SYLLABUS.reduce(
        (sum, cat) => sum + cat.items.reduce((s, it) => s + (levels[it.id] ?? 0), 0),
        0,
      ),
    [levels],
  );
  const pct = Math.round((totalPoints / MAX_POINTS) * 100);
  let pctColor = "#CC2229";
  if (pct >= 80) pctColor = "#16A34A";
  else if (pct >= 60) pctColor = "#1A52A0";
  else if (pct >= 40) pctColor = "#F59E0B";

  const dirty = useMemo(() => {
    const keys = new Set([...Object.keys(levels), ...Object.keys(initial)]);
    for (const k of keys) {
      if ((levels[k] ?? 0) !== (initial[k] ?? 0)) return true;
    }
    return false;
  }, [levels, initial]);

  async function save() {
    setSaving(true);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      const instructorId = sess.session?.user?.id;
      if (!token || !instructorId) {
        toast.error("Not signed in");
        setSaving(false);
        return;
      }

      const SUPABASE_URL = "https://bjpqxfrihwjcqprmoqfs.supabase.co";
      const SUPABASE_ANON_KEY =
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJqcHF4ZnJpaHdqY3Fwcm1vcWZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0NzQ4MjEsImV4cCI6MjA5NzA1MDgyMX0.HKlgx3dxP3uxX9wMRRUnfb0IPwaBpFcut_iUgT5XFeo";

      const allKeys = new Set([...Object.keys(levels), ...Object.keys(initial)]);
      const changedLevels: Record<string, { from: number; to: number }> = {};
      for (const k of allKeys) {
        const from = initial[k] ?? 0;
        const to = levels[k] ?? 0;
        if (from !== to) changedLevels[k] = { from, to };
      }
      console.log("[syllabus] save triggered, changes:", changedLevels);

      const competencyIds = Object.keys(changedLevels);
      const nowIso = new Date().toISOString();
      const results: { competency_id: string; status: number; ok: boolean }[] = [];

      for (const competency_id of competencyIds) {
        const body = {
          pupil_id: id,
          instructor_id: instructorId,
          competency_id,
          level: levels[competency_id] ?? 0,
          updated_at: nowIso,
        };
        console.log("[syllabus] upsert payload:", body);
        const res = await fetch(`${SUPABASE_URL}/rest/v1/pupil_syllabus_progress`, {
          method: "POST",
          headers: {
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            Prefer: "resolution=merge-duplicates,return=minimal",
          },
          body: JSON.stringify(body),
        });
        let detail = "";
        if (!res.ok) {
          try {
            detail = await res.text();
          } catch {
            /* ignore */
          }
        }
        console.log("[syllabus] upsert result:", competency_id, res.status, detail);
        results.push({ competency_id, status: res.status, ok: res.ok });
        if (!res.ok) {
          throw new Error(`Upsert failed (${res.status}) for ${competency_id}: ${detail}`);
        }
      }

      setInitial({ ...levels });
      toast.success("Progress saved ✓", { style: { background: "#16A34A", color: "#fff" } });
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 2000);
    } catch (e) {
      console.error("[syllabus] save", e);
      toast.error("Failed to save — please try again", {
        style: { background: "#CC2229", color: "#fff" },
      });
    } finally {
      setSaving(false);
    }
  }


  return (
    <div className="min-h-screen bg-white pb-28" style={POPPINS}>
      {/* Top bar */}
      <div
        className="sticky top-0 z-40 flex items-center px-2"
        style={{ height: 52, backgroundColor: "#0F2044" }}
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
        <div
          className="flex-1 text-center text-[15px] font-semibold text-white truncate px-2"
          style={POPPINS}
        >
          {pupilName ? `${pupilName} · Syllabus` : "Syllabus"}
        </div>
        <div style={{ width: 40 }} />
      </div>

      {/* Overall progress */}
      <div className="mx-4 mt-3">
        <div
          className="bg-white"
          style={{
            padding: 14,
            borderRadius: 12,
            borderWidth: "0.5px",
            borderStyle: "solid",
            borderColor: "#E2E6ED",
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <span
              className="text-[11px] font-medium uppercase"
              style={{ color: "#6B7280", letterSpacing: "0.05em" }}
            >
              Overall progress
            </span>
            <span className="text-[14px] font-bold" style={{ color: pctColor }}>
              {pct}% test ready
            </span>
          </div>
          <div
            className="h-2 rounded-full overflow-hidden"
            style={{ backgroundColor: "#E2E6ED" }}
          >
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${pct}%`, backgroundColor: pctColor }}
            />
          </div>
          <div className="text-[11px] mt-2" style={{ color: "#6B7280" }}>
            {totalPoints} of {MAX_POINTS} points · {TOTAL_COMPETENCIES} competencies
          </div>
        </div>
      </div>

      {/* Category accordions */}
      <div className="mx-4 mt-3 flex flex-col gap-2">
        {loading ? (
          <div className="text-[13px] py-6 text-center" style={{ color: "#9CA3AF" }}>
            Loading…
          </div>
        ) : (
          DVSA_SYLLABUS.map((cat) => {
            const isOpen = !!expanded[cat.key];
            const completed = cat.items.filter((it) => (levels[it.id] ?? 0) >= 5).length;
            const total = cat.items.length;
            const catPct = total === 0 ? 0 : Math.round((completed / total) * 100);
            return (
              <div
                key={cat.key}
                className="bg-white"
                style={{
                  borderRadius: 10,
                  borderWidth: "0.5px",
                  borderStyle: "solid",
                  borderColor: "#E2E6ED",
                  overflow: "hidden",
                }}
              >
                <button
                  type="button"
                  onClick={() =>
                    setExpanded((prev) => ({ ...prev, [cat.key]: !prev[cat.key] }))
                  }
                  className="w-full text-left"
                  style={{ padding: 12, background: "transparent", border: "none", ...POPPINS }}
                  aria-expanded={isOpen}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-[14px] font-bold" style={{ color: "#0F2044" }}>
                      {cat.title}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px]" style={{ color: "#6B7280" }}>
                        {completed}/{total} complete
                      </span>
                      <ChevronDown
                        size={18}
                        color="#0F2044"
                        style={{
                          transition: "transform 150ms ease",
                          transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
                        }}
                      />
                    </div>
                  </div>
                  <div
                    className="rounded-full overflow-hidden mt-2"
                    style={{ height: 4, backgroundColor: "#E2E6ED" }}
                  >
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${catPct}%`, backgroundColor: "#1A52A0" }}
                    />
                  </div>
                </button>

                {isOpen && (
                  <div className="flex flex-col gap-2" style={{ padding: 12, paddingTop: 0 }}>
                    {cat.items.map((item) => {
                      const current = levels[item.id] ?? 0;
                      return (
                        <div
                          key={item.id}
                          className="bg-white"
                          style={{
                            padding: 12,
                            borderRadius: 10,
                            borderWidth: "0.5px",
                            borderStyle: "solid",
                            borderColor: "#E2E6ED",
                          }}
                        >
                          <div className="text-[14px] font-bold" style={{ color: "#0F2044" }}>
                            {item.name}
                          </div>
                          <div className="text-[11px] mt-0.5" style={{ color: "#6B7280" }}>
                            {item.description}
                          </div>
                          <div className="flex gap-1 mt-2">
                            {LEVEL_META.map((lv) => {
                              const isSel = current === lv.n;
                              return (
                                <button
                                  key={lv.n}
                                  type="button"
                                  onClick={() =>
                                    setLevels((prev) => ({ ...prev, [item.id]: lv.n }))
                                  }
                                  aria-label={`${lv.label} (${lv.n})`}
                                  title={lv.label}
                                  className="flex-1 text-[12px] font-semibold"
                                  style={{
                                    padding: "6px 0",
                                    borderRadius: 8,
                                    backgroundColor: isSel ? lv.color : "#F3F4F6",
                                    color: isSel ? "#FFFFFF" : "#0F2044",
                                    border: isSel
                                      ? `1px solid ${lv.color}`
                                      : "1px solid transparent",
                                  }}
                                >
                                  {lv.n}
                                </button>
                              );
                            })}
                          </div>
                          <div
                            className="text-[10px] mt-1 text-right"
                            style={{ color: levelColor(current) }}
                          >
                            {LEVEL_META[current]?.label}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Sticky save */}
      <div
        className="fixed bottom-0 left-0 right-0 px-4 py-3"
        style={{
          backgroundColor: "#FFFFFF",
          borderTop: "0.5px solid #E2E6ED",
        }}
      >
        <button
          type="button"
          onClick={save}
          disabled={!dirty || saving}
          className="w-full text-[14px] font-semibold text-white"
          style={{
            height: 44,
            borderRadius: 10,
            backgroundColor: !dirty || saving ? "#9CA3AF" : "#0F2044",
            border: "none",
            ...POPPINS,
          }}
        >
          {saving ? "Saving…" : dirty ? "Save changes" : "No changes"}
        </button>
      </div>
    </div>
  );
}

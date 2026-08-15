/**
 * Pupil Brief — data layer.
 *
 * Reads only what DSM already records (lessons, lesson_history, lesson_feedback,
 * lesson_routes, pupil_progress, mock/driving test results) and shapes it into a
 * "what happened last time / what to continue today" brief.
 *
 * Nothing is invented: every field is optional and the UI hides what is missing.
 */

import { supabase } from "./supabaseClient";
import type { Coord } from "./tripReport";

export type ProgressStatus =
  | "not_started"
  | "introduced"
  | "talk_through"
  | "prompted"
  | "seldom_prompted"
  | "independent";

export const LEVEL_RANK: Record<ProgressStatus, number> = {
  not_started: 0,
  introduced: 1,
  talk_through: 2,
  prompted: 3,
  seldom_prompted: 4,
  independent: 5,
};

export const LEVEL_LABEL: Record<ProgressStatus, string> = {
  not_started: "Not started",
  introduced: "Introduced",
  talk_through: "Under full talk-through",
  prompted: "Prompted",
  seldom_prompted: "Seldom prompted",
  independent: "Independent",
};

/** Colour + short verdict used on the brief chips. */
export const LEVEL_META: Record<
  ProgressStatus,
  { color: string; bg: string; verdict: string }
> = {
  not_started: { color: "#6B7A90", bg: "#F3F5F8", verdict: "Not started" },
  introduced: { color: "#6B7A90", bg: "#F3F5F8", verdict: "Introduced" },
  talk_through: { color: "#CC2229", bg: "#FDF2F2", verdict: "Needs work" },
  prompted: { color: "#D97706", bg: "#FFF8EB", verdict: "Continue practising" },
  seldom_prompted: { color: "#4D7C0F", bg: "#F3FAE9", verdict: "Nearly there" },
  independent: { color: "#1877D6", bg: "#EAF3FC", verdict: "Strong" },
};

export function normalizeStatus(raw: string | null | undefined): ProgressStatus {
  if (!raw) return "not_started";
  if (raw === "competent") return "independent";
  if (raw === "in_progress") return "prompted";
  return (raw in LEVEL_RANK ? raw : "not_started") as ProgressStatus;
}

/** item_key → label, mirroring the Progress page syllabus. */
export const SYLLABUS_LABELS: Record<string, string> = {
  safety_cockpit_drill: "Cockpit drill",
  safety_show_me_tell_me: "Show me / tell me",
  safety_controls: "Controls & instruments",
  move_off_level: "Moving off on the level",
  move_off_hill: "Moving off uphill",
  move_off_angle: "Moving off at an angle",
  stopping_normal: "Stopping in a safe place",
  junc_t_emerge: "T-junctions emerging",
  junc_t_approach: "T-junctions approaching",
  junc_crossroads: "Crossroads",
  junc_roundabouts: "Roundabouts",
  junc_mini_roundabouts: "Mini roundabouts",
  junc_traffic_lights: "Traffic lights",
  junc_yellow_box: "Yellow box junctions",
  junc_filter_lanes: "Filter lanes",
  dual_joining: "Joining dual carriageways",
  dual_leaving: "Leaving dual carriageways",
  dual_lane_discipline: "Lane discipline",
  dual_overtaking: "Overtaking safely",
  man_parallel_park: "Parallel park",
  man_bay_park_forward: "Bay park (forward)",
  man_bay_park_reverse: "Bay park (reverse)",
  man_pull_up_right: "Pull up on the right",
  man_emergency_stop: "Controlled stop",
  ind_sat_nav: "Following sat nav",
  ind_road_signs: "Following road signs",
  ind_route_planning: "Route planning",
  em_stop_technique: "Emergency stop technique",
  em_stop_control: "Emergency stop control",
  aware_observation: "Observation",
  aware_anticipation: "Anticipation",
  aware_pedestrians: "Pedestrians & cyclists",
  aware_speed: "Use of speed",
};

/** Progress item_keys that are manoeuvres. */
const MANOEUVRE_KEYS = new Set([
  "man_parallel_park",
  "man_bay_park_forward",
  "man_bay_park_reverse",
  "man_pull_up_right",
  "man_emergency_stop",
  "em_stop_technique",
  "em_stop_control",
]);

const MANOEUVRE_WORDS = [
  "bay park",
  "parallel park",
  "pull up on the right",
  "reverse",
  "turn in the road",
  "emergency stop",
  "controlled stop",
  "manoeuvre",
];

export function isManoeuvreLabel(label: string): boolean {
  const l = label.toLowerCase();
  return MANOEUVRE_WORDS.some((w) => l.includes(w));
}

export function progressLabel(itemKey: string): string {
  if (SYLLABUS_LABELS[itemKey]) return SYLLABUS_LABELS[itemKey];
  // End-of-lesson wizard fallback keys look like `eol_bay_parking`.
  const raw = itemKey.replace(/^eol_/, "").replace(/_/g, " ");
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export interface BriefPupil {
  id: string;
  name: string | null;
  first_name: string | null;
  address: string | null;
  postcode: string | null;
  test_date: string | null;
  test_time: string | null;
  test_centre: string | null;
  theory_pass: boolean | null;
  notes: string | null;
}

export interface BriefLesson {
  id: string;
  lesson_date: string;
  lesson_time: string | null;
  duration_minutes: number | null;
  status: string | null;
  notes: string | null;
  pickup_location: string | null;
}

export interface BriefHistory {
  id: string;
  lesson_id: string | null;
  lesson_date: string | null;
  lesson_time: string | null;
  duration_minutes: number | null;
  notes: string | null;
  skills_practised: string[] | null;
}

export interface BriefFeedback {
  lesson_id: string;
  topics_covered: string[] | null;
  progress_rating: number | null;
  instructor_notes: string | null;
}

export interface BriefRoute {
  id: string;
  lesson_id: string | null;
  started_at: string | null;
  duration_minutes: number | null;
  distance_miles: number | null;
  max_speed_mph: number | null;
  coordinates: Coord[] | null;
}

export interface BriefProgressItem {
  item_key: string;
  label: string;
  status: ProgressStatus;
  updated_at: string | null;
}

export interface ParsedNotes {
  /** Free-text lesson notes, minus the auto-generated lines. */
  body: string | null;
  /** The "Progress: …" comment written in the end-of-lesson wizard. */
  progress: string | null;
  /** Labels parsed out of the "Skills updated: X (4), Y (3)" summary line. */
  skills: { label: string; rank: number | null }[];
}

export interface PupilBriefData {
  pupil: BriefPupil | null;
  nextLesson: BriefLesson | null;
  lastLesson: BriefLesson | null;
  lastHistory: BriefHistory | null;
  lastFeedback: BriefFeedback | null;
  lastRoute: BriefRoute | null;
  recentLessons: BriefLesson[];
  historyByLessonId: Record<string, BriefHistory>;
  feedbackByLessonId: Record<string, BriefFeedback>;
  recentRoutes: BriefRoute[];
  progress: BriefProgressItem[];
  /** Latest DL25 grid we hold, from a real test or a mock. */
  faults: Record<string, Record<string, { d?: number; s?: number; dn?: number }>> | null;
  faultsSource: "test" | "mock" | null;
  faultsDate: string | null;
}

/* ------------------------------------------------------------------ */
/* Parsing helpers                                                     */
/* ------------------------------------------------------------------ */

/** Splits the combined end-of-lesson note back into its parts. */
export function parseLessonNotes(notes: string | null | undefined): ParsedNotes {
  if (!notes) return { body: null, progress: null, skills: [] };
  const lines = notes.split("\n");
  const bodyLines: string[] = [];
  let progress: string | null = null;
  let skills: ParsedNotes["skills"] = [];
  for (const line of lines) {
    const t = line.trim();
    if (/^progress:/i.test(t)) {
      progress = t.replace(/^progress:\s*/i, "").trim() || null;
    } else if (/^skills updated:/i.test(t)) {
      skills = t
        .replace(/^skills updated:\s*/i, "")
        .split(",")
        .map((chunk) => {
          const m = chunk.trim().match(/^(.*?)\s*\((\d)\)$/);
          if (m) return { label: m[1].trim(), rank: Number(m[2]) };
          return { label: chunk.trim(), rank: null };
        })
        .filter((s) => s.label.length > 0);
    } else {
      bodyLines.push(line);
    }
  }
  const body = bodyLines.join("\n").trim();
  return { body: body || null, progress, skills };
}

/** Everything practised in a lesson, split into manoeuvres and topics. */
export function splitCovered(
  history: BriefHistory | null,
  feedback: BriefFeedback | null,
  parsed: ParsedNotes,
): { manoeuvres: string[]; topics: string[] } {
  const all = new Set<string>();
  for (const s of history?.skills_practised ?? []) if (s) all.add(String(s).trim());
  for (const t of feedback?.topics_covered ?? []) if (t) all.add(String(t).trim());
  for (const s of parsed.skills) all.add(s.label);
  const manoeuvres: string[] = [];
  const topics: string[] = [];
  for (const label of all) {
    (isManoeuvreLabel(label) ? manoeuvres : topics).push(label);
  }
  return { manoeuvres: manoeuvres.sort(), topics: topics.sort() };
}

/** Ordered list of roads driven, from the recorded GPS trail. */
export function roadsFromCoords(coords: Coord[] | null | undefined, limit = 8): string[] {
  if (!coords || coords.length === 0) return [];
  const out: string[] = [];
  for (const c of coords) {
    const name = (c.road_name ?? "").trim();
    if (!name || name.toLowerCase() === "unknown road") continue;
    if (out[out.length - 1] === name) continue;
    if (out.includes(name)) continue;
    out.push(name);
    if (out.length >= limit) break;
  }
  return out;
}

/** Areas practised across several lessons — roads seen most often. */
export function frequentRoads(routes: BriefRoute[], limit = 10): { name: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const r of routes) {
    for (const name of roadsFromCoords(r.coordinates, 40)) {
      counts.set(name, (counts.get(name) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
    .slice(0, limit);
}

const GOOGLE_MAPS_KEY =
  (import.meta as any).env?.VITE_GOOGLE_API_KEY ||
  (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY ||
  "AIzaSyDWFw0oL9ZyhwdvdvYtDsdJrTFYzF0khFc";

/** Static map of the recorded trail (same approach as the pupil profile). */
export function routeStaticMapUrl(coords: Coord[] | null | undefined, width = 640, height = 260) {
  if (!coords || coords.length < 2) return null;
  const step = Math.max(1, Math.floor(coords.length / 80));
  const pts = coords.filter((_, i) => i % step === 0).map((c) => `${c.lat.toFixed(5)},${c.lng.toFixed(5)}`);
  const path = `color:0x1877D6CC|weight:4|${pts.join("|")}`;
  const start = coords[0];
  const end = coords[coords.length - 1];
  return (
    `https://maps.googleapis.com/maps/api/staticmap?size=${width}x${height}&scale=2` +
    `&path=${encodeURIComponent(path)}` +
    `&markers=${encodeURIComponent(`color:0x22A06B|label:S|${start.lat},${start.lng}`)}` +
    `&markers=${encodeURIComponent(`color:0xCC2229|label:F|${end.lat},${end.lng}`)}` +
    `&key=${GOOGLE_MAPS_KEY}`
  );
}

export function daysBetween(fromISO: string, toISO: string): number {
  const a = new Date(`${fromISO}T00:00:00`).getTime();
  const b = new Date(`${toISO}T00:00:00`).getTime();
  return Math.round((b - a) / 86400000);
}

export function formatDayGap(lessonDate: string | null | undefined): string | null {
  if (!lessonDate) return null;
  const today = new Date().toISOString().slice(0, 10);
  const d = daysBetween(lessonDate, today);
  if (d <= 0) return "Today";
  if (d === 1) return "Yesterday";
  if (d < 14) return `${d} days ago`;
  if (d < 60) return `${Math.round(d / 7)} weeks ago`;
  return `${Math.round(d / 30)} months ago`;
}

/* ------------------------------------------------------------------ */
/* Fetch                                                               */
/* ------------------------------------------------------------------ */

async function safe<T>(p: PromiseLike<{ data: T | null; error: unknown }>): Promise<T | null> {
  try {
    const { data, error } = await p;
    if (error) {
      console.warn("[pupil-brief] query failed", error);
      return null;
    }
    return data;
  } catch (e) {
    console.warn("[pupil-brief] query threw", e);
    return null;
  }
}

/** Loads everything the brief needs. Missing tables/columns degrade to null. */
export async function fetchPupilBrief(pupilId: string): Promise<PupilBriefData> {
  const today = new Date().toISOString().slice(0, 10);

  const pupil = (await safe<BriefPupil>(
    supabase
      .from("pupils")
      .select(
        "id, name, first_name, address, postcode, test_date, test_time, test_centre, theory_pass, notes",
      )
      .eq("id", pupilId)
      .maybeSingle() as any,
  )) as BriefPupil | null;

  const [nextRows, pastRows] = await Promise.all([
    safe<BriefLesson[]>(
      supabase
        .from("lessons")
        .select("id, lesson_date, lesson_time, duration_minutes, status, notes, pickup_location")
        .eq("pupil_id", pupilId)
        .is("deleted_at", null)
        .neq("status", "cancelled")
        .gte("lesson_date", today)
        .order("lesson_date", { ascending: true })
        .order("lesson_time", { ascending: true })
        .limit(1) as any,
    ),
    safe<BriefLesson[]>(
      supabase
        .from("lessons")
        .select("id, lesson_date, lesson_time, duration_minutes, status, notes, pickup_location")
        .eq("pupil_id", pupilId)
        .is("deleted_at", null)
        .neq("status", "cancelled")
        .lte("lesson_date", today)
        .order("lesson_date", { ascending: false })
        .order("lesson_time", { ascending: false })
        .limit(10) as any,
    ),
  ]);

  const recentLessons = (pastRows ?? []).filter((l) => l.status !== "scheduled" || l.lesson_date < today);
  const lastLesson = recentLessons[0] ?? null;
  const lessonIds = recentLessons.map((l) => l.id);

  const [history, feedback, routes, progressRows, testRows, mockRows] = await Promise.all([
    safe<BriefHistory[]>(
      supabase
        .from("lesson_history")
        .select("id, lesson_id, lesson_date, lesson_time, duration_minutes, notes, skills_practised")
        .eq("pupil_id", pupilId)
        .is("deleted_at", null)
        .order("lesson_date", { ascending: false })
        .limit(10) as any,
    ),
    lessonIds.length
      ? safe<BriefFeedback[]>(
          supabase
            .from("lesson_feedback")
            .select("lesson_id, topics_covered, progress_rating, instructor_notes")
            .in("lesson_id", lessonIds) as any,
        )
      : Promise.resolve([]),
    safe<BriefRoute[]>(
      supabase
        .from("lesson_routes")
        .select("id, lesson_id, started_at, duration_minutes, distance_miles, max_speed_mph, coordinates")
        .eq("pupil_id", pupilId)
        .order("started_at", { ascending: false })
        .limit(6) as any,
    ),
    safe<{ item_key: string; status: string | null; updated_at: string | null }[]>(
      supabase
        .from("pupil_progress")
        .select("item_key, status, updated_at")
        .eq("pupil_id", pupilId) as any,
    ),
    safe<{ test_date: string; faults_detail: any; result: string | null }[]>(
      supabase
        .from("driving_test_results")
        .select("test_date, faults_detail, result")
        .eq("pupil_id", pupilId)
        .is("deleted_at", null)
        .order("test_date", { ascending: false })
        .limit(1) as any,
    ),
    safe<{ test_date: string; fault_marks: any }[]>(
      supabase
        .from("mock_test_results")
        .select("test_date, fault_marks")
        .eq("pupil_id", pupilId)
        .order("test_date", { ascending: false })
        .limit(1) as any,
    ),
  ]);

  const historyByLessonId: Record<string, BriefHistory> = {};
  for (const h of history ?? []) {
    if (h.lesson_id && !historyByLessonId[h.lesson_id]) historyByLessonId[h.lesson_id] = h;
  }
  const feedbackByLessonId: Record<string, BriefFeedback> = {};
  for (const f of feedback ?? []) feedbackByLessonId[f.lesson_id] = f;

  const progress: BriefProgressItem[] = (progressRows ?? [])
    .map((r) => ({
      item_key: r.item_key,
      label: progressLabel(r.item_key),
      status: normalizeStatus(r.status),
      updated_at: r.updated_at,
    }))
    .filter((p) => p.status !== "not_started");

  let faults: PupilBriefData["faults"] = null;
  let faultsSource: PupilBriefData["faultsSource"] = null;
  let faultsDate: string | null = null;
  const test = (testRows ?? [])[0];
  const mock = (mockRows ?? [])[0];
  if (test?.faults_detail && Object.keys(test.faults_detail).length > 0) {
    faults = test.faults_detail;
    faultsSource = "test";
    faultsDate = test.test_date;
  } else if (mock?.fault_marks && Object.keys(mock.fault_marks).length > 0) {
    // Normalise the simpler mock shape into the DL25 grid the recommender reads.
    const grid: NonNullable<PupilBriefData["faults"]> = {};
    for (const [cat, value] of Object.entries(mock.fault_marks as Record<string, any>)) {
      if (typeof value === "number") {
        if (value > 0) grid[cat] = { _: { d: value } };
      } else if (value && typeof value === "object") {
        grid[cat] = { _: { d: value.fault ?? 0, s: value.serious ?? 0, dn: value.dangerous ?? 0 } };
      }
    }
    if (Object.keys(grid).length > 0) {
      faults = grid;
      faultsSource = "mock";
      faultsDate = mock.test_date;
    }
  }

  const lastRoute =
    (routes ?? []).find((r) => lastLesson && r.lesson_id === lastLesson.id) ?? null;

  return {
    pupil,
    nextLesson: (nextRows ?? [])[0] ?? null,
    lastLesson,
    lastHistory: lastLesson ? (historyByLessonId[lastLesson.id] ?? null) : ((history ?? [])[0] ?? null),
    lastFeedback: lastLesson ? (feedbackByLessonId[lastLesson.id] ?? null) : null,
    lastRoute,
    recentLessons,
    historyByLessonId,
    feedbackByLessonId,
    recentRoutes: routes ?? [],
    progress,
    faults,
    faultsSource,
    faultsDate,
  };
}

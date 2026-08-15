/**
 * Test result → DSM Learn recommendations.
 *
 * Reads the DL25 fault grid already recorded by the driving-test and
 * mock-test screens and maps weak areas onto existing DSM Learn content.
 * Pure functions — no fetching, no new tables.
 */

import { LEARN_LIBRARY, type LearnItem } from "./learnLibrary";

export type FaultCell = { d?: number; s?: number; dn?: number };
/** driving_test_results.faults_detail */
export type FaultMap = Record<string, Record<string, FaultCell>>;
/** mock_test_results.fault_marks */
export type MockFaultMarks = Record<
  string,
  { fault?: number; serious?: number; dangerous?: number } | number | undefined
>;

export type Severity = "dangerous" | "serious" | "driving";

export interface WeakArea {
  id: string;
  label: string;
  severity: Severity;
  count: number;
  keywords: string[];
}

export interface RecommendedItem {
  id: string;
  title: string;
  source: string;
  minutes?: number | null;
  /** "learn" = curated library item, "bitesize" = bitesize_videos row, "video" = learn_videos row. */
  kind: "learn" | "bitesize" | "video";
}

export interface Recommendation {
  topic: WeakArea;
  items: RecommendedItem[];
}

export const SEVERITY_COLOR: Record<Severity, string> = {
  dangerous: "#DC2626",
  serious: "#D97706",
  driving: "#EAB308",
};

export const SEVERITY_LABEL: Record<Severity, string> = {
  dangerous: "Dangerous",
  serious: "Serious",
  driving: "Driving fault",
};

/** DL25 category id → friendly label + the topic keywords to match content on. */
export const DL25_TOPICS: Record<string, { label: string; keywords: string[] }> = {
  eyesight: { label: "Eyesight check", keywords: ["eyesight", "vision", "checks"] },
  hwy_safety: { label: "Highway code / safety margins", keywords: ["highway code", "safety", "theory", "memory"] },
  controlled_stop: { label: "Controlled stop", keywords: ["control", "braking", "stops"] },
  move_off: { label: "Moving off", keywords: ["observation", "control", "confidence"] },
  emergency_stop: { label: "Emergency stop", keywords: ["braking", "reaction", "control"] },
  mirrors: { label: "Mirrors and rear observation", keywords: ["mirrors", "observation", "awareness", "routine"] },
  signals: { label: "Signals", keywords: ["signals", "communication", "planning"] },
  response_signs: { label: "Response to signs and signals", keywords: ["signs", "memory", "awareness", "theory"] },
  use_of_speed: { label: "Use of speed", keywords: ["speed", "risk", "young people", "behaviour"] },
  following_distance: { label: "Following distance", keywords: ["risk", "planning", "awareness"] },
  progress: { label: "Making progress", keywords: ["confidence", "nerves", "hesitation", "motivation", "mindset"] },
  junctions: { label: "Junctions", keywords: ["observation", "junctions", "planning", "awareness"] },
  judgement: { label: "Judgement", keywords: ["judgement", "risk", "decision", "awareness"] },
  positioning: { label: "Positioning", keywords: ["positioning", "lane", "planning"] },
  ped_crossings: { label: "Pedestrian crossings", keywords: ["awareness", "vulnerable", "observation"] },
  normal_stops: { label: "Normal stops", keywords: ["control", "positioning"] },
  awareness: { label: "Awareness and planning", keywords: ["awareness", "planning", "hazard", "technology"] },
  ancillary: { label: "Ancillary controls", keywords: ["control", "checks"] },
  reverse_left: { label: "Reverse left", keywords: ["manoeuvres", "control", "observation", "confidence"] },
  reverse_right: { label: "Reverse right", keywords: ["manoeuvres", "control", "observation", "confidence"] },
  reverse_park_road: { label: "Reverse park (road)", keywords: ["manoeuvres", "control", "confidence"] },
  reverse_park_carpark: { label: "Reverse park (car park)", keywords: ["manoeuvres", "control", "confidence"] },
  forward_bay: { label: "Forward bay park", keywords: ["manoeuvres", "control", "confidence"] },
  turn_in_road: { label: "Turn in the road", keywords: ["manoeuvres", "control", "confidence"] },
  vehicle_checks: { label: "Vehicle checks (show me / tell me)", keywords: ["checks", "memory", "learning"] },
};

const SEVERITY_RANK: Record<Severity, number> = { dangerous: 3, serious: 2, driving: 1 };

/** Collapses a DL25 fault grid into ranked weak areas. */
export function weakAreasFromFaults(faults: FaultMap | null | undefined): WeakArea[] {
  if (!faults) return [];
  const out: WeakArea[] = [];
  for (const [catId, subs] of Object.entries(faults)) {
    if (!subs || typeof subs !== "object") continue;
    let d = 0;
    let s = 0;
    let dn = 0;
    for (const cell of Object.values(subs)) {
      d += Number(cell?.d ?? 0) || 0;
      s += Number(cell?.s ?? 0) || 0;
      dn += Number(cell?.dn ?? 0) || 0;
    }
    const total = d + s + dn;
    if (total <= 0) continue;
    const meta = DL25_TOPICS[catId];
    out.push({
      id: catId,
      label: meta?.label ?? catId,
      keywords: meta?.keywords ?? [catId],
      severity: dn > 0 ? "dangerous" : s > 0 ? "serious" : "driving",
      count: total,
    });
  }
  return out.sort(
    (a, b) => SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity] || b.count - a.count,
  );
}

/** Same, for the simpler mock-test fault_marks shape. */
export function weakAreasFromMockMarks(marks: MockFaultMarks | null | undefined): WeakArea[] {
  if (!marks) return [];
  const grid: FaultMap = {};
  for (const [catId, value] of Object.entries(marks)) {
    if (typeof value === "number") {
      if (value > 0) grid[catId] = { _: { d: value } };
    } else if (value && typeof value === "object") {
      grid[catId] = {
        _: { d: value.fault ?? 0, s: value.serious ?? 0, dn: value.dangerous ?? 0 },
      };
    }
  }
  return weakAreasFromFaults(grid);
}

function scoreLibraryItem(item: LearnItem, area: WeakArea): number {
  let score = 0;
  if (item.topics?.includes(area.id)) score += 10;
  const haystack = [item.title, item.blurb, ...item.tags].join(" ").toLowerCase();
  for (const kw of area.keywords) {
    if (haystack.includes(kw.toLowerCase())) score += 3;
  }
  if (item.minutes <= 12) score += 1;
  return score;
}

export interface BitesizeLike {
  id: string;
  title: string;
  description?: string | null;
  category?: string | null;
  duration_mins?: number | null;
}

function scoreBitesize(video: BitesizeLike, area: WeakArea): number {
  const haystack = [video.title, video.description ?? "", video.category ?? ""]
    .join(" ")
    .toLowerCase();
  let score = 0;
  if (haystack.includes(area.label.toLowerCase())) score += 6;
  for (const kw of area.keywords) {
    if (haystack.includes(kw.toLowerCase())) score += 3;
  }
  return score;
}

/** A learn_videos library row, as far as the matcher cares. */
export interface VideoLike {
  id: string;
  title: string;
  description?: string | null;
  source?: string | null;
  categories?: string[] | null;
  topics?: string[] | null;
  minutes?: number | null;
}

function scoreVideo(video: VideoLike, area: WeakArea): number {
  let score = 0;
  if (video.topics?.includes(area.id)) score += 10;
  const haystack = [
    video.title,
    video.description ?? "",
    (video.categories ?? []).join(" "),
  ]
    .join(" ")
    .toLowerCase();
  if (haystack.includes(area.label.toLowerCase())) score += 6;
  for (const kw of area.keywords) {
    if (haystack.includes(kw.toLowerCase())) score += 3;
  }
  return score;
}

/**
 * Builds up to `perTopic` recommendations for each weak area, drawing on the
 * curated Learn library plus any existing bitesize videos passed in.
 */
export function recommendForFaults(
  areas: WeakArea[],
  bitesize: BitesizeLike[] = [],
  perTopic = 3,
  maxTopics = 6,
  videos: VideoLike[] = [],
): Recommendation[] {
  return areas.slice(0, maxTopics).map((topic) => {
    const scored: { item: RecommendedItem; score: number }[] = [];

    for (const item of LEARN_LIBRARY) {
      const score = scoreLibraryItem(item, topic);
      if (score > 0) {
        scored.push({
          score,
          item: { id: item.id, title: item.title, source: item.source, minutes: item.minutes, kind: "learn" },
        });
      }
    }
    for (const video of bitesize) {
      const score = scoreBitesize(video, topic);
      if (score > 0) {
        scored.push({
          score: score + 1, // nudge DSM's own video content up
          item: {
            id: video.id,
            title: video.title,
            source: video.category ? `Bitesize · ${video.category}` : "Bitesize",
            minutes: video.duration_mins ?? null,
            kind: "bitesize",
          },
        });
      }
    }

    for (const video of videos) {
      const score = scoreVideo(video, topic);
      if (score > 0) {
        scored.push({
          score: score + 1,
          item: {
            id: video.id,
            title: video.title,
            source: video.source ? `Video · ${video.source}` : "Video",
            minutes: video.minutes ?? null,
            kind: "video",
          },
        });
      }
    }

    scored.sort((a, b) => b.score - a.score);
    return { topic, items: scored.slice(0, perTopic).map((s) => s.item) };
  });
}

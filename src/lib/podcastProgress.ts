export type EpisodeProgress = {
  position: number;
  duration: number;
  played: boolean;
  updatedAt: number;
};

export type ProgressMap = Record<string, EpisodeProgress>;

const STORAGE_KEY = "dsm.podcasts.progress.v1";
const MAX_ENTRIES = 300;

/** Ignore a stored position below this (treat as "start"). */
export const MIN_RESUME_SECS = 5;
/** Within this of the end, treat the episode as finished. */
export const END_THRESHOLD_SECS = 30;

export function loadProgress(): ProgressMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return parsed as ProgressMap;
  } catch {
    return {};
  }
}

export function saveProgress(map: ProgressMap): void {
  if (typeof window === "undefined") return;
  try {
    let next = map;
    const keys = Object.keys(map);
    if (keys.length > MAX_ENTRIES) {
      const sorted = keys
        .sort((a, b) => (map[b]?.updatedAt ?? 0) - (map[a]?.updatedAt ?? 0))
        .slice(0, MAX_ENTRIES);
      next = {};
      for (const k of sorted) {
        const entry = map[k];
        if (entry) next[k] = entry;
      }
    }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* storage full or unavailable — progress is best-effort */
  }
}

export function isFinished(entry: EpisodeProgress | undefined): boolean {
  if (!entry) return false;
  if (entry.played) return true;
  if (!entry.duration) return false;
  return entry.position >= entry.duration - END_THRESHOLD_SECS;
}

/** Position to resume from, or 0 when the episode should start at the beginning. */
export function resumePosition(entry: EpisodeProgress | undefined): number {
  if (!entry || isFinished(entry)) return 0;
  return entry.position > MIN_RESUME_SECS ? entry.position : 0;
}

export function remainingLabel(entry: EpisodeProgress | undefined): string | null {
  if (!entry || isFinished(entry) || !entry.duration) return null;
  const remaining = entry.duration - entry.position;
  if (remaining <= 60) return "Less than a min left";
  return `${Math.round(remaining / 60)} min left`;
}

const LAST_PLAYED_KEY = "dsm.podcasts.lastPlayed.v1";

/** Id of the most recently played episode on this device. */
export function loadLastPlayedId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(LAST_PLAYED_KEY);
  } catch {
    return null;
  }
}

export function saveLastPlayedId(id: string | null): void {
  if (typeof window === "undefined") return;
  try {
    if (id) window.localStorage.setItem(LAST_PLAYED_KEY, id);
    else window.localStorage.removeItem(LAST_PLAYED_KEY);
  } catch {
    /* best-effort */
  }
}

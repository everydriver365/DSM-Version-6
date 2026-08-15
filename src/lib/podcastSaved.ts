import type { PodcastEpisode } from "./podcasts.functions";

export type SavedEpisode = PodcastEpisode & { savedAt: number };
export type SavedMap = Record<string, SavedEpisode>;

const STORAGE_KEY = "dsm.podcasts.saved.v1";
const MAX_ENTRIES = 200;

export function loadSaved(): SavedMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return parsed as SavedMap;
  } catch {
    return {};
  }
}

export function persistSaved(map: SavedMap): void {
  if (typeof window === "undefined") return;
  try {
    let next = map;
    const keys = Object.keys(map);
    if (keys.length > MAX_ENTRIES) {
      const sorted = keys
        .sort((a, b) => (map[b]?.savedAt ?? 0) - (map[a]?.savedAt ?? 0))
        .slice(0, MAX_ENTRIES);
      next = {};
      for (const k of sorted) {
        const entry = map[k];
        if (entry) next[k] = entry;
      }
    }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* storage full or unavailable — saving is best-effort */
  }
}

export function toggleSaved(map: SavedMap, episode: PodcastEpisode): SavedMap {
  const next: SavedMap = { ...map };
  if (next[episode.id]) delete next[episode.id];
  else next[episode.id] = { ...episode, savedAt: Date.now() };
  persistSaved(next);
  return next;
}

export function savedList(map: SavedMap): SavedEpisode[] {
  return Object.values(map).sort((a, b) => b.savedAt - a.savedAt);
}

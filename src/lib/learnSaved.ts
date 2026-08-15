/**
 * DSM Learn — saved items + lightweight "opened" history, on this device only.
 * Mirrors the localStorage pattern used by src/lib/podcastProgress.ts.
 */

const SAVED_KEY = "dsm.learn.saved.v1";
const SEEN_KEY = "dsm.learn.seen.v1";

function read(key: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((v) => typeof v === "string") : [];
  } catch {
    return [];
  }
}

function write(key: string, ids: string[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(ids.slice(0, 300)));
  } catch {
    /* storage full or blocked — saving is best-effort */
  }
}

export function loadSaved(): string[] {
  return read(SAVED_KEY);
}

export function toggleSaved(id: string): string[] {
  const current = read(SAVED_KEY);
  const next = current.includes(id) ? current.filter((x) => x !== id) : [id, ...current];
  write(SAVED_KEY, next);
  return next;
}

export function loadSeen(): string[] {
  return read(SEEN_KEY);
}

/** Records that an item was opened. Most recent first. */
export function markSeen(id: string): string[] {
  const next = [id, ...read(SEEN_KEY).filter((x) => x !== id)];
  write(SEEN_KEY, next);
  return next;
}

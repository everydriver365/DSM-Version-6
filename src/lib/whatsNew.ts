// Configuration for "What's new" sheet.
// Bump APP_VERSION when shipping a release that should re-trigger the sheet.
// Populate WHATS_NEW_BY_VERSION[version] with the items to feature.

export const APP_VERSION = "2026.07.21";

export type WhatsNewItem = {
  title: string;
  description: string;
  // Optional: link a short video/thumbnail asset in future. For now we use
  // the shared navy→blue gradient placeholder with a play button.
  videoUrl?: string;
  thumbnailUrl?: string;
};

export const WHATS_NEW_BY_VERSION: Record<string, WhatsNewItem[]> = {
  "2026.07.21": [
    {
      title: "Learn hub",
      description: "Short how-to videos to help you get more out of DSM.",
    },
    {
      title: "Auto-fill your gaps",
      description: "DSM now finds pupils to match empty slots in your day.",
    },
  ],
};

// Semantic version compare (works for both dotted numeric like "1.2.3"
// and date-stamped like "2026.07.21").
export function isNewerVersion(current: string, previous: string | null): boolean {
  if (!previous) return true;
  const a = current.split(".").map((n) => parseInt(n, 10) || 0);
  const b = previous.split(".").map((n) => parseInt(n, 10) || 0);
  const len = Math.max(a.length, b.length);
  for (let i = 0; i < len; i++) {
    const av = a[i] ?? 0;
    const bv = b[i] ?? 0;
    if (av > bv) return true;
    if (av < bv) return false;
  }
  return false;
}

const KEY = (userId: string) => `dsm.lastSeenVersion.${userId}`;

export function getLastSeenVersion(userId: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(KEY(userId));
  } catch {
    return null;
  }
}

export function setLastSeenVersion(userId: string, version: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY(userId), version);
  } catch {
    /* ignore */
  }
}

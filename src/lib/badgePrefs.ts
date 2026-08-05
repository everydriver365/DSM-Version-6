export type BadgePrefs = {
  issues: boolean;
  chat: boolean;
  admin: boolean;
};

export const DEFAULT_BADGE_PREFS: BadgePrefs = {
  issues: true,
  chat: true,
  admin: true,
};

function key(userId: string): string {
  return `dsm.realtimeBadges.${userId}`;
}

export function readBadgePrefs(userId: string): BadgePrefs {
  try {
    const raw = localStorage.getItem(key(userId));
    if (!raw) return DEFAULT_BADGE_PREFS;
    const parsed = JSON.parse(raw) as Partial<BadgePrefs>;
    return {
      issues: typeof parsed.issues === "boolean" ? parsed.issues : DEFAULT_BADGE_PREFS.issues,
      chat: typeof parsed.chat === "boolean" ? parsed.chat : DEFAULT_BADGE_PREFS.chat,
      admin: typeof parsed.admin === "boolean" ? parsed.admin : DEFAULT_BADGE_PREFS.admin,
    };
  } catch {
    return DEFAULT_BADGE_PREFS;
  }
}

export function writeBadgePrefs(userId: string, prefs: BadgePrefs): void {
  try {
    localStorage.setItem(key(userId), JSON.stringify(prefs));
  } catch {
    // ignore storage errors
  }
}

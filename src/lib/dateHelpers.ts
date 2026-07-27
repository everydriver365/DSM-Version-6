/**
 * Format a human-readable countdown from now to a target date (and optional time).
 * Returns null for past dates so callers can choose whether to show a status label instead.
 */
export function formatCountdown(dateIso: string, time?: string | null): string | null {
  const now = new Date();
  const [year, month, day] = dateIso.split("-").map(Number);

  let target: Date;
  if (time) {
    const [hours, minutes] = time.slice(0, 5).split(":").map(Number);
    target = new Date(year, month - 1, day, hours, minutes);
  } else {
    target = new Date(year, month - 1, day, 23, 59, 59);
  }

  const diffMs = target.getTime() - now.getTime();
  if (diffMs <= 0) return null;

  // Calendar-day difference (midnight to midnight), so "tomorrow at 9am"
  // reads as "Tomorrow" even when it is only ~15 hours away.
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfTarget = new Date(year, month - 1, day);
  const dayDiff = Math.round(
    (startOfTarget.getTime() - startOfToday.getTime()) / 86400000,
  );

  const totalMinutes = Math.floor(diffMs / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (dayDiff <= 0) {
    if (hours === 0) return `${minutes} min${minutes === 1 ? "" : "s"} left`;
    return minutes > 0
      ? `${hours} hr${hours === 1 ? "" : "s"} ${minutes} min${minutes === 1 ? "" : "s"} left`
      : `${hours} hr${hours === 1 ? "" : "s"} left`;
  }
  if (dayDiff === 1) {
    return hours < 24 ? `Tomorrow · ${hours} hr${hours === 1 ? "" : "s"} left` : "Tomorrow";
  }
  return `${dayDiff} days left`;
}


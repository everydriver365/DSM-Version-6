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

  const totalMinutes = Math.floor(diffMs / 60000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;

  if (days === 0 && hours === 0) {
    return `${minutes} min${minutes === 1 ? "" : "s"} left`;
  }
  if (days === 0) {
    return `${hours} hr${hours === 1 ? "" : "s"} left`;
  }
  if (days === 1) {
    return hours > 0 ? `Tomorrow · ${hours} hr${hours === 1 ? "" : "s"} left` : "Tomorrow";
  }
  return `${days} days${hours > 0 ? ` ${hours} hr${hours === 1 ? "" : "s"}` : ""} left`;
}

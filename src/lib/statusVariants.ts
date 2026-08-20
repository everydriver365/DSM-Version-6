import type { PillVariant } from "@/components/dsm/DSMPill";
import { PILL_COLORS } from "@/components/dsm/DSMPill";

/**
 * SINGLE SOURCE OF TRUTH for status -> pill variant mapping.
 *
 * Every schedule (lesson) status and every payment status in DSM must be
 * resolved through these maps so the same word always renders in the same
 * colour. Render the result with <DSMPill variant={...}> / pillStyle().
 */

/** Lesson / schedule statuses. */
export const LESSON_STATUS_VARIANTS: Record<string, PillVariant> = {
  live: "info",
  scheduled: "info",
  confirmed: "info",
  booked: "info",
  completed: "success",
  attended: "success",
  passed: "success",
  cancelled: "neutral",
  canceled: "neutral",
  rescheduled: "warning",
  pending: "warning",
  "no-show": "danger",
  no_show: "danger",
  noshow: "danger",
  failed: "danger",
  test: "purple",
};

/** Payment statuses. */
export const PAYMENT_STATUS_VARIANTS: Record<string, PillVariant> = {
  paid: "success",
  prepaid: "success",
  settled: "success",
  refunded: "info",
  credit: "info",
  partial: "warning",
  part_paid: "warning",
  pending: "warning",
  processing: "warning",
  due: "danger",
  unpaid: "danger",
  overdue: "danger",
  failed: "danger",
};

const norm = (s: string | null | undefined) =>
  (s ?? "").toLowerCase().trim().replace(/\s+/g, "_");

export function lessonStatusVariant(status: string | null | undefined): PillVariant {
  return LESSON_STATUS_VARIANTS[norm(status)] ?? "neutral";
}

export function paymentStatusVariant(status: string | null | undefined): PillVariant {
  return PAYMENT_STATUS_VARIANTS[norm(status)] ?? "neutral";
}

/** Colours for a status, for the rare place that can't render a pill element. */
export function lessonStatusColors(status: string | null | undefined) {
  return PILL_COLORS[lessonStatusVariant(status)];
}
export function paymentStatusColors(status: string | null | undefined) {
  return PILL_COLORS[paymentStatusVariant(status)];
}

/** Human label for a raw status string. */
export function statusLabel(status: string | null | undefined): string {
  const s = norm(status);
  if (!s) return "";
  const map: Record<string, string> = {
    no_show: "No show",
    "no-show": "No show",
    noshow: "No show",
    part_paid: "Part paid",
    partial: "Part paid",
  };
  return map[s] ?? s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, " ");
}

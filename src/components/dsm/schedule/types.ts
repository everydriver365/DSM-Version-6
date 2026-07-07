/**
 * Local mirror of the everydriver `CalendarEvent` shape.
 *
 * The original lives at `@/hooks/useInstructorCalendar` in the source
 * project and pulls in supabase. We deliberately do NOT copy the hook —
 * the ported UI components accept an array of these objects via props,
 * and it's up to the caller (this project's own diary/schedule hooks) to
 * shape their lesson rows into this structure.
 */
export type CalendarEventType = "lesson" | "block" | "external";

export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  type: CalendarEventType;
  /**
   * Free-form payload passed through by the source hook. The ported
   * WeekTimelineView reads `data.status` and `data.payment_status` to
   * decide colour + paid/unpaid tint. Keep both keys optional.
   */
  data?: {
    status?: string | null;
    payment_status?: string | null;
    pupil_account_balance?: number | null;
    [key: string]: unknown;
  };
}
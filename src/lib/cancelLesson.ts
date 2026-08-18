import { supabase } from "@/lib/supabaseClient";

/**
 * Cancellation with a short undo window.
 *
 * The lesson row is patched immediately (so the UI reflects the cancellation),
 * but every financial side effect — refunds, retained fees, prepaid-hour
 * returns and the cancellation audit row — is deferred until the undo window
 * closes. If the instructor taps "Undo" nothing financial ever happened and
 * the lesson row is restored from the snapshot taken before the patch.
 */

export const UNDO_WINDOW_MS = 8000;

type LessonSnapshot = {
  status: string | null;
  payment_status: string | null;
  amount_due: number | null;
  cancellation_reason: string | null;
  cancellation_notes: string | null;
  cancelled_at: string | null;
};

export interface CancelHandle {
  /** Runs the deferred financial work now. Idempotent. */
  commit: () => Promise<void>;
  /** Restores the lesson and skips the deferred work. Idempotent. */
  undo: () => Promise<void>;
}

/** Handles that still have deferred work outstanding. */
const pending = new Set<CancelHandle>();

/** Flush every outstanding cancellation (navigation away, app close). */
export async function flushPendingCancellations(): Promise<void> {
  const handles = [...pending];
  await Promise.all(handles.map((h) => h.commit()));
}

if (typeof window !== "undefined") {
  window.addEventListener("beforeunload", () => {
    void flushPendingCancellations();
  });
}

export async function cancelLessonWithUndo(input: {
  lessonId: string;
  /** Fields written to the lessons row to mark it cancelled. */
  patch: Record<string, unknown>;
  /** Deferred financial work — refunds, fees, prepaid returns, audit rows. */
  financials: () => Promise<void>;
  /** Optional extra work to run when the cancellation is undone. */
  onUndo?: () => Promise<void> | void;
  undoWindowMs?: number;
}): Promise<CancelHandle | null> {
  const { lessonId, patch, financials, onUndo } = input;
  const windowMs = input.undoWindowMs ?? UNDO_WINDOW_MS;

  // 1. Snapshot the pre-cancel state so undo can restore it exactly.
  const { data: before, error: readErr } = await supabase
    .from("lessons")
    .select(
      "status, payment_status, amount_due, cancellation_reason, cancellation_notes, cancelled_at, google_event_id, instructor_id",
    )
    .eq("id", lessonId)
    .maybeSingle();
  if (readErr) console.error("[cancelLesson] snapshot read", readErr);

  const row = (before ?? {}) as Partial<LessonSnapshot> & {
    google_event_id?: string | null;
    instructor_id?: string | null;
  };
  const snapshot: LessonSnapshot = {
    status: row.status ?? null,
    payment_status: row.payment_status ?? null,
    amount_due: row.amount_due ?? null,
    cancellation_reason: row.cancellation_reason ?? null,
    cancellation_notes: row.cancellation_notes ?? null,
    cancelled_at: row.cancelled_at ?? null,
  };
  const googleEventId = row.google_event_id ?? null;
  const instructorId = row.instructor_id ?? null;

  // 2. Patch the lesson row.
  const { error: updErr } = await supabase.from("lessons").update(patch as never).eq("id", lessonId);
  if (updErr) {
    console.error("[cancelLesson] update", updErr);
    return null;
  }

  // 3. Remove the calendar event.
  if (googleEventId) {
    pushLessonToGoogle(supabase,  { lesson_id: lessonId, instructor_id: instructorId ?? "", action: "delete" },
    });
  }

  let settled = false;
  let timer: ReturnType<typeof setTimeout> | null = null;

  const handle: CancelHandle = {
    async commit() {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      pending.delete(handle);
      try {
        await financials();
      } catch (e) {
        console.error("[cancelLesson] deferred financials", e);
      }
    },
    async undo() {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      pending.delete(handle);

      const { error } = await supabase
        .from("lessons")
        .update(snapshot as never)
        .eq("id", lessonId);
      if (error) {
        console.error("[cancelLesson] undo restore", error);
        throw error;
      }

      if (googleEventId) {
        pushLessonToGoogle(supabase,  { lesson_id: lessonId, instructor_id: instructorId ?? "", action: "upsert" },
        });
      }

      await onUndo?.();
    },
  };

  pending.add(handle);
  timer = setTimeout(() => {
    void handle.commit();
  }, windowMs);

  return handle;
}

import { supabase } from "./supabaseClient";

/**
 * Keep the pupil's test fields in step with test-day lessons.
 *
 * The Upcoming Tests tile on the dashboard and the Upcoming Tests page both
 * read tests from `pupils.test_date / test_time / test_centre`. Adding a test
 * through Add Lesson only writes a `lessons` row with `lesson_type = 'test'`,
 * so without this the test never shows anywhere.
 */
export async function syncPupilTestFields(opts: {
  pupilId: string | null | undefined;
  isTestDay: boolean;
  date: string | null;
  testTime: string | null;
  testCentre: string | null;
  /** True only when the lesson being saved was previously a test day. */
  wasTestDay?: boolean;
}) {
  const { pupilId, isTestDay, date, testTime, testCentre, wasTestDay = false } = opts;
  if (!pupilId) return;
  try {
    if (isTestDay) {
      await supabase
        .from("pupils")
        .update({
          test_date: date || null,
          test_time: testTime ? `${testTime.slice(0, 5)}:00` : null,
          test_centre: testCentre?.trim() || null,
          test_status: "upcoming",
        })
        .eq("id", pupilId);
    } else if (wasTestDay) {
      // Lesson was switched back from a test day — clear the stale test.
      await supabase
        .from("pupils")
        .update({ test_date: null, test_time: null, test_centre: null, test_status: null })
        .eq("id", pupilId);
    }
  } catch (e) {
    console.warn("[pupilTestSync] failed", e);
  }
}

  } catch (e) {
    console.warn("[pupilTestSync] failed", e);
  }
}

export type MissingTestDetails = { centre: boolean; time: boolean };

export function missingTestDetails(test: {
  test_time?: string | null;
  test_centre?: string | null;
}): MissingTestDetails {
  return {
    centre: !(test.test_centre ?? "").trim(),
    time: !(test.test_time ?? "").trim(),
  };
}

export function missingTestDetailsLabel(m: MissingTestDetails): string | null {
  if (m.centre && m.time) return "Test centre and time not set";
  if (m.centre) return "Test centre not set";
  if (m.time) return "Test time not set";
  return null;
}

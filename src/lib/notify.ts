import { supabase } from "./supabaseClient";

export type InstructorNotification = {
  instructor_id: string;
  title?: string;
  body?: string;
  message?: string;
  type?: string;
  read?: boolean;
  url?: string | null;
  reference_id?: string | null;
  reference_type?: string | null;
  [key: string]: unknown;
};

/**
 * Single push path for the app.
 *
 * Every in-app notification should go through here so the recipient also gets
 * an APNs alert and an app-icon badge. Rows are inserted FIRST, then the push
 * is sent, so `send-push` can read the exact unread count and set the badge
 * to that absolute value (never an incremented guess).
 *
 * Push failures never block the in-app notification.
 */
export async function notifyInstructors(
  rows: InstructorNotification | InstructorNotification[],
) {
  const list = Array.isArray(rows) ? rows : [rows];
  if (!list.length) return { error: null };

  const { error } = await supabase
    .from("instructor_notifications")
    .insert(list.map(({ url: _url, ...rest }) => ({ read: false, ...rest })));

  if (error) console.error("[notify] notification insert failed:", error);

  await Promise.all(
    list.map(async (row) => {
      const body = row.body ?? row.message ?? "";
      if (!body) return;
      try {
        await supabase.functions.invoke("send-push", {
          body: {
            instructor_id: row.instructor_id,
            title: row.title,
            body,
            type: row.type ?? "general",
            url: row.url ?? undefined,
            data: {
              reference_id: row.reference_id ?? null,
              reference_type: row.reference_type ?? null,
            },
          },
        });
      } catch (e) {
        console.warn("[notify] push failed:", row.type, e);
      }
    }),
  );

  try {
    window.dispatchEvent(new Event("dsm-notifications-updated"));
  } catch {
    /* non-browser context */
  }

  return { error };
}

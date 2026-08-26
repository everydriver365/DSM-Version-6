import { supabase } from "./supabaseClient";

export type InstructorNotification = {
  instructor_id: string;
  title: string;
  body: string;
  type: string;
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
 * an APNs alert and an app-icon badge. The push is sent BEFORE the row is
 * inserted, because `send-push` computes the badge as
 * (current unread count + 1) — the same ordering the lesson reminder job uses.
 *
 * Push failures never block the in-app notification.
 */
export async function notifyInstructors(
  rows: InstructorNotification | InstructorNotification[],
) {
  const list = Array.isArray(rows) ? rows : [rows];
  if (!list.length) return { error: null };

  await Promise.all(
    list.map(async (row) => {
      try {
        await supabase.functions.invoke("send-push", {
          body: {
            instructor_id: row.instructor_id,
            title: row.title,
            body: row.body,
            type: row.type,
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

  const { error } = await supabase
    .from("instructor_notifications")
    .insert(list.map(({ url: _url, ...rest }) => ({ read: false, ...rest })));

  if (error) console.error("[notify] notification insert failed:", error);

  try {
    window.dispatchEvent(new Event("dsm-notifications-updated"));
  } catch {
    /* non-browser context */
  }

  return { error };
}

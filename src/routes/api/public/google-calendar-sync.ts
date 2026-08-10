import { createFileRoute } from "@tanstack/react-router";
import {
  createAdminClient,
  createPublishableClient,
  performGoogleCalendarSync,
  verifyUserFromToken,
  type SyncResult,
} from "@/lib/googleCalendarSync.server";

export const Route = createFileRoute("/api/public/google-calendar-sync")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const authHeader = request.headers.get("Authorization");
        const cronSecret = request.headers.get("X-Cron-Secret");
        const expectedCronSecret = process.env["CRON_SECRET"];
        const googleClientId = process.env["GOOGLE_CLIENT_ID"];
        const googleClientSecret = process.env["GOOGLE_CLIENT_SECRET"];

        let instructorId: string | null = null;
        let supabase = createAdminClient();

        // 1. Cron mode: a scheduled job calls this with a shared secret.
        if (cronSecret && expectedCronSecret) {
          if (cronSecret !== expectedCronSecret) {
            return Response.json(
              { error: "Invalid cron secret", reconnect_required: false },
              { status: 401 },
            );
          }
          if (!supabase) {
            return Response.json(
              {
                error: "Server is not configured for cron sync. SUPABASE_SERVICE_ROLE_KEY is missing.",
                reconnect_required: false,
              },
              { status: 500 },
            );
          }
          const url = new URL(request.url);
          instructorId = url.searchParams.get("instructorId") ?? (await request.json()).instructorId;
          if (!instructorId) {
            return Response.json(
              { error: "Missing instructorId", reconnect_required: false },
              { status: 400 },
            );
          }
        }
        // 2. User mode: the app sends the current Supabase access token.
        else if (authHeader?.startsWith("Bearer ")) {
          const token = authHeader.slice(7);
          const user = await verifyUserFromToken(token);
          if (!user) {
            return Response.json(
              { error: "Invalid or expired session", reconnect_required: false },
              { status: 401 },
            );
          }
          instructorId = user.id;
          // Prefer the admin client when available, otherwise fall back to an
          // authenticated client using the user's own token so RLS permits updates.
          if (!supabase) {
            supabase = createPublishableClient();
            await supabase.auth.setSession({ access_token: token, refresh_token: "" });
          }
        } else {
          return Response.json(
            { error: "Authentication required", reconnect_required: false },
            { status: 401 },
          );
        }

        if (!googleClientId || !googleClientSecret) {
          return Response.json(
            {
              error: "Google OAuth credentials are not configured on the server.",
              reconnect_required: false,
            },
            { status: 500 },
          );
        }

        const result = await performGoogleCalendarSync(
          supabase,
          instructorId,
          googleClientId,
          googleClientSecret,
        );

        if (!result.success) {
          if ("reconnect_required" in result && result.reconnect_required) {
            return Response.json(
              { error: result.reason, reconnect_required: true },
              { status: 401 },
            );
          }
          return Response.json(
            { error: "error" in result ? result.error : "Sync failed", reconnect_required: false },
            { status: 500 },
          );
        }

        return Response.json(result, { status: 200 });
      },
    },
  },
});

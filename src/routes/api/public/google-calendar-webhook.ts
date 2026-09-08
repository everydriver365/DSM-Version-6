// Google Calendar push notifications land here.
// Google sends no event data — the notification only says "this calendar
// changed" — so we verify the channel and run the normal incremental sync.
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/google-calendar-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const channelId = request.headers.get("x-goog-channel-id");
        const resourceId = request.headers.get("x-goog-resource-id");
        // We set the channel token to the instructor id when registering.
        const token = request.headers.get("x-goog-channel-token");
        const state = request.headers.get("x-goog-resource-state");

        // Google sends one "sync" ping when a channel is created.
        if (state === "sync" || !token || !channelId) return new Response("ok");

        const url = process.env["SUPABASE_URL"];
        const serviceKey = process.env["SUPABASE_SERVICE_ROLE_KEY"];
        if (!url || !serviceKey) {
          console.error("[google-calendar-webhook] missing Supabase server config");
          return new Response("ok");
        }

        const { createClient } = await import("@supabase/supabase-js");
        const supabase = createClient(url, serviceKey, {
          auth: { persistSession: false, autoRefreshToken: false },
        });

        const { data: instructor } = await supabase
          .from("instructors")
          .select("id, google_channels, google_calendar_connected")
          .eq("id", token)
          .maybeSingle();

        if (!instructor?.google_calendar_connected) return new Response("ok");

        const channels = (instructor.google_channels ?? {}) as Record<string, any>;
        const known = Object.values(channels).some(
          (c: any) =>
            c?.channelId === channelId && (!resourceId || c?.resourceId === resourceId),
        );
        if (!known) {
          console.warn("[google-calendar-webhook] unknown channel", channelId);
          return new Response("ok");
        }

        const res = await fetch(`${url}/functions/v1/sync-google-calendar`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${serviceKey}`,
            apikey: serviceKey,
          },
          body: JSON.stringify({ instructor_id: instructor.id }),
        });
        console.log("[google-calendar-webhook] sync triggered", res.status);

        // Always 200 — Google retries and drops channels that keep erroring.
        return new Response("ok");
      },
      GET: async () => new Response("ok"),
    },
  },
});

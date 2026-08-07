import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { createAuthenticatedSupabaseClient } from "@/lib/carplay-auth.server";

const BodySchema = z.object({
  deviceId: z.string().min(1),
  platform: z.enum(["ios", "android", "carplay"]).default("ios"),
  apnsToken: z.string().optional(),
  oneSignalPlayerId: z.string().optional(),
  model: z.string().optional(),
  osVersion: z.string().optional(),
  appVersion: z.string().optional(),
  carplayEntitled: z.boolean().default(false),
});

export const Route = createFileRoute("/api/public/carplay/v1/devices")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = request.headers.get("Authorization");
        if (!auth || !auth.startsWith("Bearer ")) {
          return new Response("Unauthorized", { status: 401 });
        }
        const token = auth.slice("Bearer ".length);

        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return new Response("Invalid JSON body", { status: 400 });
        }
        const parsed = BodySchema.safeParse(body);
        if (!parsed.success) {
          return new Response(JSON.stringify({ errors: parsed.error.flatten() }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }

        const supabase = createAuthenticatedSupabaseClient(token);
        const { data: userData, error: userError } = await supabase.auth.getUser();
        if (userError || !userData?.user) {
          return new Response("Unauthorized", { status: 401 });
        }
        const userId = userData.user.id;
        const b = parsed.data;

        const { error } = await supabase.from("instructor_devices").upsert(
          {
            instructor_id: userId,
            device_id: b.deviceId,
            platform: b.platform,
            apns_token: b.apnsToken,
            onesignal_player_id: b.oneSignalPlayerId,
            model: b.model,
            os_version: b.osVersion,
            app_version: b.appVersion,
            carplay_entitled: b.carplayEntitled,
            last_seen_at: new Date().toISOString(),
          },
          {
            onConflict: "instructor_id, device_id, platform",
          },
        );

        if (error) {
          console.error("[carplay] device upsert error", error);
          return new Response("Failed to register device", { status: 500 });
        }
        return Response.json({ ok: true });
      },
    },
  },
});

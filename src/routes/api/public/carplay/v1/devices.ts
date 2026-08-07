import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { createAuthenticatedSupabaseClient } from "@/lib/carplay-auth.server";
import { jsonResponse, textResponse, corsOptionsResponse, extractBearer } from "@/lib/carplay-cors.server";

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
      OPTIONS: corsOptionsResponse,
      POST: async ({ request }) => {
        const token = extractBearer(request);
        if (!token) {
          return textResponse("Unauthorized", { status: 401 });
        }

        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return textResponse("Invalid JSON body", { status: 400 });
        }
        const parsed = BodySchema.safeParse(body);
        if (!parsed.success) {
          return jsonResponse({ errors: parsed.error.flatten() }, { status: 400 });
        }

        const supabase = createAuthenticatedSupabaseClient(token);
        const { data: userData, error: userError } = await supabase.auth.getUser();
        if (userError || !userData?.user) {
          return textResponse("Unauthorized", { status: 401 });
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
          return textResponse("Failed to register device", { status: 500 });
        }
        return jsonResponse({ ok: true });
      },
    },
  },
});

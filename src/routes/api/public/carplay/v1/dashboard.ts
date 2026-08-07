import { createFileRoute } from "@tanstack/react-router";
import { getCarPlayDashboard } from "@/lib/carplay.server";
import { jsonResponse, textResponse, corsOptionsResponse, extractBearer } from "@/lib/carplay-cors.server";

export const Route = createFileRoute("/api/public/carplay/v1/dashboard")({
  server: {
    handlers: {
      OPTIONS: corsOptionsResponse,
      GET: async ({ request }) => {
        const token = extractBearer(request);
        if (!token) {
          return textResponse("Unauthorized", { status: 401 });
        }
        const dashboard = await getCarPlayDashboard(token);
        if (!dashboard) {
          return textResponse("Unauthorized or error", { status: 401 });
        }
        return jsonResponse(dashboard);
      },
    },
  },
});

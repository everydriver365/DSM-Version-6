import { createFileRoute } from "@tanstack/react-router";
import { getCarPlayDashboard } from "@/lib/carplay.server";

export const Route = createFileRoute("/api/public/carplay/v1/dashboard")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const auth = request.headers.get("Authorization");
        if (!auth || !auth.startsWith("Bearer ")) {
          return new Response("Unauthorized", { status: 401 });
        }
        const token = auth.slice("Bearer ".length);
        const dashboard = await getCarPlayDashboard(token);
        if (!dashboard) {
          return new Response("Unauthorized or error", { status: 401 });
        }
        return Response.json(dashboard);
      },
    },
  },
});

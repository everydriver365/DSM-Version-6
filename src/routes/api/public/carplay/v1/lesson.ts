import { createFileRoute } from "@tanstack/react-router";
import { getCarPlayCurrentLesson } from "@/lib/carplay.server";
import { jsonResponse, textResponse, corsOptionsResponse, extractBearer } from "@/lib/carplay-cors.server";

export const Route = createFileRoute("/api/public/carplay/v1/lesson")({
  server: {
    handlers: {
      OPTIONS: corsOptionsResponse,
      GET: async ({ request }) => {
        const token = extractBearer(request);
        if (!token) {
          return textResponse("Unauthorized", { status: 401 });
        }
        const lesson = await getCarPlayCurrentLesson(token);
        return jsonResponse({ lesson });
      },
    },
  },
});

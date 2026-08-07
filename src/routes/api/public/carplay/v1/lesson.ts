import { createFileRoute } from "@tanstack/react-router";
import { getCarPlayCurrentLesson } from "@/lib/carplay.server";

export const Route = createFileRoute("/api/public/carplay/v1/lesson")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const auth = request.headers.get("Authorization");
        if (!auth || !auth.startsWith("Bearer ")) {
          return new Response("Unauthorized", { status: 401 });
        }
        const token = auth.slice("Bearer ".length);
        const lesson = await getCarPlayCurrentLesson(token);
        if (!lesson) {
          return Response.json({ lesson: null });
        }
        return Response.json({ lesson });
      },
    },
  },
});

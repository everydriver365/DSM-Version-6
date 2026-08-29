import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

export const Route = createFileRoute("/api/ed-ai")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const SUPABASE_URL = process.env["SUPABASE_URL"]!;
        const SERVICE_ROLE = process.env["SUPABASE_SERVICE_ROLE_KEY"]!;
        const ANTHROPIC_API_KEY = process.env["ANTHROPIC_API_KEY"];
        const LOVABLE_API_KEY = process.env["LOVABLE_API_KEY"];

        if (!SUPABASE_URL || !SERVICE_ROLE) {
          return Response.json({ error: "Server not configured" }, { status: 500 });
        }

        const authHeader = request.headers.get("authorization");
        if (!authHeader) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
          auth: { persistSession: false },
        });

        const {
          data: { user },
          error: authErr,
        } = await supabase.auth.getUser(authHeader.replace(/^Bearer /i, ""));

        if (authErr || !user) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        let body: { question?: string; context?: string } = {};
        try {
          body = await request.json();
        } catch {
          return Response.json({ error: "Invalid body" }, { status: 400 });
        }

        const question = (body.question ?? "").trim();
        if (!question) {
          return Response.json({ error: "No question" }, { status: 400 });
        }

        const { data: instructor } = await supabase
          .from("instructors")
          .select("name, phone, town, hourly_rate")
          .eq("id", user.id)
          .maybeSingle();

        const today = new Date().toISOString().slice(0, 10);
        const { data: todayLessons } = await supabase
          .from("lessons")
          .select(
            "id, lesson_date, lesson_time, duration_minutes, lesson_type, payment_status, amount_due, status, pupils(name, phone, postcode)",
          )
          .eq("instructor_id", user.id)
          .eq("lesson_date", today)
          .is("deleted_at", null)
          .order("lesson_time");

        const now = new Date().toTimeString().slice(0, 8);
        const nextLesson = (todayLessons ?? []).find(
          (l: any) => (l.lesson_time ?? "") > now && l.status !== "cancelled",
        ) as any;

        const { count: unreadCount } = await supabase
          .from("instructor_notifications")
          .select("*", { count: "exact", head: true })
          .eq("instructor_id", user.id)
          .eq("read", false);

        const { data: overdueItems } = await supabase
          .from("lessons")
          .select("amount_due, pupils(name)")
          .eq("instructor_id", user.id)
          .eq("payment_status", "unpaid")
          .gt("amount_due", 0)
          .is("deleted_at", null)
          .limit(5);

        const instructorName = instructor?.name?.split(" ")[0] ?? "there";

        const nextLessonText = nextLesson
          ? `Next lesson: ${nextLesson.pupils?.name} at ${String(nextLesson.lesson_time).slice(0, 5)}, ${nextLesson.duration_minutes} minutes, payment status: ${nextLesson.payment_status}, amount due: £${nextLesson.amount_due ?? 0}`
          : "No more lessons today";

        const todayText = todayLessons?.length
          ? `${todayLessons.length} lessons today`
          : "No lessons today";

        const overdueText = overdueItems?.length
          ? `Overdue payments from: ${(overdueItems as any[])
              .map((o) => `${o.pupils?.name} (£${o.amount_due})`)
              .join(", ")}`
          : "No overdue payments";

        const systemPrompt = `You are ED, a helpful voice assistant built into EveryDriver Pro, a driving instructor management app.

You are talking to ${instructorName}, a UK driving instructor.

Current context:
- ${todayText}
- ${nextLessonText}
- Unread notifications: ${unreadCount ?? 0}
- ${overdueText}
- Additional context: ${body.context ?? "none"}

IMPORTANT RULES:
1. Keep ALL responses under 3 sentences
2. Never use bullet points, lists or markdown
3. Speak naturally as if talking aloud
4. Be friendly, professional and concise
5. You know about UK driving instruction, DVSA rules, ADI standards, lesson planning and the driving test
6. If asked about pupil data you don't have, say you don't have that information right now
7. Never make up specific data you haven't been given
8. Refer to the instructor by first name occasionally to feel personal`;

        try {
          if (ANTHROPIC_API_KEY) {
            const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "x-api-key": ANTHROPIC_API_KEY,
                "anthropic-version": "2023-06-01",
              },
              body: JSON.stringify({
                model: "claude-sonnet-4-5",
                max_tokens: 200,
                system: systemPrompt,
                messages: [{ role: "user", content: question }],
              }),
            });
            const claudeData: any = await claudeRes.json();
            if (!claudeRes.ok) {
              console.error("[ed-ai] Claude error:", JSON.stringify(claudeData));
              return Response.json({ error: "AI unavailable" }, { status: 500 });
            }
            const answer = claudeData?.content?.[0]?.text ?? "I'm not sure about that.";
            return Response.json({ answer });
          }

          if (!LOVABLE_API_KEY) {
            return Response.json({ error: "AI unavailable" }, { status: 500 });
          }

          const gwRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${LOVABLE_API_KEY}`,
            },
            body: JSON.stringify({
              model: "google/gemini-3-flash",
              max_tokens: 200,
              messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: question },
              ],
            }),
          });
          const gwData: any = await gwRes.json();
          if (!gwRes.ok) {
            console.error("[ed-ai] gateway error:", JSON.stringify(gwData));
            return Response.json({ error: "AI unavailable" }, { status: 500 });
          }
          const answer =
            gwData?.choices?.[0]?.message?.content ?? "I'm not sure about that.";
          return Response.json({ answer });
        } catch (e: any) {
          console.error("[ed-ai] error:", e?.message);
          return Response.json({ error: "AI unavailable" }, { status: 500 });
        }
      },
    },
  },
});

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: corsHeaders }
      );
    }

    const { data: { user }, error: authErr } =
      await supabase.auth.getUser(
        authHeader.replace("Bearer ", "")
      );
    if (authErr || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: corsHeaders }
      );
    }

    const { question, context } = await req.json();
    if (!question) {
      return new Response(
        JSON.stringify({ error: "No question" }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Fetch instructor data
    const { data: instructor } = await supabase
      .from("instructors")
      .select("name, phone, town, hourly_rate")
      .eq("id", user.id)
      .single();

    // Fetch today's lessons
    const today = new Date().toISOString().slice(0, 10);
    const { data: todayLessons } = await supabase
      .from("lessons")
      .select(`
        id, lesson_date, lesson_time,
        duration_minutes, lesson_type,
        payment_status, amount_due,
        status, pickup_location,
        pupils(name, phone, postcode, address)
      `)
      .eq("instructor_id", user.id)
      .eq("lesson_date", today)
      .is("deleted_at", null)
      .order("lesson_time");

    const now = new Date().toTimeString().slice(0, 8);
    const nextLesson = todayLessons?.find(
      l => l.lesson_time > now && l.status !== "cancelled"
    );

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

    const instructorName =
      instructor?.name?.split(" ")[0] ?? "there";

    const pickup = nextLesson?.lesson_type === "test"
      ? ((nextLesson.pupils as any)?.address ??
         (nextLesson.pupils as any)?.postcode ??
         "address not set")
      : (nextLesson?.pickup_location ??
         (nextLesson?.pupils as any)?.address ??
         "address not set");

    const nextLessonText = nextLesson
      ? `Next lesson: ${(nextLesson.pupils as any)?.name} at ${nextLesson.lesson_time?.slice(0, 5)}, ${nextLesson.duration_minutes} minutes, pickup at ${pickup}, payment status: ${nextLesson.payment_status}, amount due: £${nextLesson.amount_due ?? 0}`
      : "No more lessons today";

    const overdueText = overdueItems?.length
      ? `Overdue payments from: ${overdueItems.map(o => `${(o.pupils as any)?.name} (£${o.amount_due})`).join(", ")}`
      : "No overdue payments";

    const systemPrompt = `You are ED, a helpful voice assistant built into EveryDriver Pro, a driving instructor management app.

You are talking to ${instructorName}, a UK driving instructor.

Current context:
- ${todayLessons?.length ?? 0} lessons today
- ${nextLessonText}
- Unread notifications: ${unreadCount ?? 0}
- ${overdueText}
- Additional context: ${context ?? "none"}

IMPORTANT RULES:
1. Keep ALL responses under 3 sentences
2. Never use bullet points, lists or markdown
3. Speak naturally as if talking aloud
4. Be friendly, professional and concise
5. You know about UK driving instruction, DVSA rules, ADI standards, lesson planning and the driving test
6. If asked about pupil data you do not have, say you do not have that information right now
7. Never make up specific data you have not been given
8. Refer to the instructor by first name occasionally to feel personal`;

    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY")!;

    const claudeRes = await fetch(
      "https://api.anthropic.com/v1/messages",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": anthropicKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 200,
          system: systemPrompt,
          messages: [{ role: "user", content: question }],
        }),
      }
    );

    const claudeData = await claudeRes.json();

    if (!claudeRes.ok) {
      console.error("[ed-ai] Claude error:", JSON.stringify(claudeData));
      return new Response(
        JSON.stringify({ error: "AI unavailable" }),
        { status: 500, headers: corsHeaders }
      );
    }

    const answer = claudeData.content?.[0]?.text ?? "I am not sure about that.";
    console.log("[ed-ai] question:", question, "answer:", answer);

    return new Response(
      JSON.stringify({ answer }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (e: any) {
    console.error("[ed-ai] error:", e.message);
    return new Response(
      JSON.stringify({ error: e.message }),
      { status: 500, headers: corsHeaders }
    );
  }
});

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
    const payload = await req.json();
    const { type, table, record, old_record } = payload;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const sendPush = async (instructor_id: string, title: string, body: string, notif_type: string, reference_id?: string) => {
      // Check not already sent
      if (reference_id) {
        const { data: existing } = await supabase
          .from("instructor_notifications")
          .select("id")
          .eq("instructor_id", instructor_id)
          .eq("type", notif_type)
          .eq("reference_id", reference_id)
          .limit(1);
        if (existing && existing.length > 0) {
          console.log("[notify-event] already sent", notif_type, reference_id);
          return;
        }
      }

      // Insert notification record
      await supabase.from("instructor_notifications").insert({
        instructor_id,
        title,
        body,
        type: notif_type,
        reference_id: reference_id ?? null,
        read: false,
        created_at: new Date().toISOString(),
      });

      // Send push
      await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-push`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
        },
        body: JSON.stringify({ instructor_id, title, body, type: notif_type }),
      });
    };

    // ── LESSONS ──────────────────────────────────────────────────────────
    if (table === "lessons") {
      const lesson = record;
      const instructor_id = lesson.instructor_id;
      if (!instructor_id) return new Response("ok", { headers: corsHeaders });

      // Get pupil name
      const { data: pupil } = await supabase
        .from("pupils")
        .select("name")
        .eq("id", lesson.pupil_id)
        .single();
      const name = pupil?.name ?? "Your pupil";

      // New booking confirmed
      if (type === "INSERT" && lesson.status === "confirmed") {
        await sendPush(
          instructor_id,
          "📅 New lesson booked",
          `${name} · ${lesson.lesson_date} at ${lesson.lesson_time?.slice(0,5)}`,
          "new_booking",
          lesson.id,
        );
      }

      // Lesson cancelled
      if (type === "UPDATE" && 
          record.status === "cancelled" && 
          old_record?.status !== "cancelled") {
        await sendPush(
          instructor_id,
          "❌ Lesson cancelled",
          `${name} · ${lesson.lesson_date} at ${lesson.lesson_time?.slice(0,5)}`,
          "lesson_cancelled",
          lesson.id,
        );
      }
    }

    // ── PAYMENTS ─────────────────────────────────────────────────────────
    if (table === "payments" && type === "INSERT") {
      const payment = record;
      const instructor_id = payment.instructor_id;
      if (!instructor_id) return new Response("ok", { headers: corsHeaders });

      const { data: pupil } = await supabase
        .from("pupils")
        .select("name")
        .eq("id", payment.pupil_id)
        .single();
      const name = pupil?.name ?? "A pupil";
      const amount = payment.amount ? `£${Number(payment.amount).toFixed(2)}` : "";

      await sendPush(
        instructor_id,
        "💰 Payment received",
        `${name} paid ${amount}`,
        "payment_received",
        payment.id,
      );
    }

    // ── ENQUIRIES ────────────────────────────────────────────────────────
    if (table === "enquiries" && type === "INSERT") {
      const enquiry = record;
      const instructor_id = enquiry.instructor_id;
      if (!instructor_id) return new Response("ok", { headers: corsHeaders });

      await sendPush(
        instructor_id,
        "📩 New enquiry",
        `${enquiry.name ?? "Someone"} is looking for lessons`,
        "new_enquiry",
        enquiry.id,
      );
    }

    // ── MESSAGES ─────────────────────────────────────────────────────────
    if (table === "instructor_messages" && type === "INSERT") {
      const message = record;
      const instructor_id = message.recipient_id ?? message.instructor_id;
      if (!instructor_id) return new Response("ok", { headers: corsHeaders });

      await sendPush(
        instructor_id,
        "💬 New message",
        message.content?.slice(0, 80) ?? "You have a new message",
        "new_message",
        message.id,
      );
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e: any) {
    console.error("[notify-event] error:", e.message);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});

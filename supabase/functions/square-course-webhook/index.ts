import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-square-hmacsha256-signature",
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

    const body = await req.text();
    const event = JSON.parse(body);

    console.log("[square-course-webhook] event type:", event.type);

    // Only handle payment completion
    if (event.type !== "payment.completed") {
      return new Response(JSON.stringify({ received: true }), {
        status: 200, headers: corsHeaders,
      });
    }

    const payment = event.data?.object?.payment;
    if (!payment) {
      return new Response(JSON.stringify({ error: "No payment in event" }), {
        status: 400, headers: corsHeaders,
      });
    }

    const orderId = payment.order_id;
    const amountPence = payment.amount_money?.amount ?? 0;
    const squarePaymentId = payment.id;

    console.log("[square-course-webhook] payment id:", squarePaymentId, "order:", orderId, "amount:", amountPence);

    // Find the pending booking by square_order_id
    const { data: booking, error: bookingErr } = await supabase
      .from("course_bookings")
      .select("id, course_id, instructor_id, pupil_name, pupil_email, pupil_phone, status")
      .eq("square_order_id", orderId)
      .maybeSingle();

    if (bookingErr || !booking) {
      console.error("[square-course-webhook] booking not found for order:", orderId);
      return new Response(JSON.stringify({ error: "Booking not found" }), {
        status: 404, headers: corsHeaders,
      });
    }

    // Already processed
    if (booking.status === "confirmed") {
      console.log("[square-course-webhook] already confirmed:", booking.id);
      return new Response(JSON.stringify({ already_confirmed: true }), {
        status: 200, headers: corsHeaders,
      });
    }

    // Update booking to confirmed
    const { error: updateErr } = await supabase
      .from("course_bookings")
      .update({
        status: "confirmed",
        amount_paid: amountPence / 100,
        square_payment_id: squarePaymentId,
        confirmed_at: new Date().toISOString(),
      })
      .eq("id", booking.id);

    if (updateErr) {
      console.error("[square-course-webhook] update failed:", updateErr.message);
      return new Response(JSON.stringify({ error: updateErr.message }), {
        status: 500, headers: corsHeaders,
      });
    }

    // Get course details for notification
    const { data: course } = await supabase
      .from("instructor_courses")
      .select("name, price")
      .eq("id", booking.course_id)
      .single();

    const courseName = course?.name ?? "Course";

    // Notify instructor
    if (booking.instructor_id) {
      await supabase.from("instructor_notifications").insert({
        instructor_id: booking.instructor_id,
        type: "new_booking",
        title: "🎉 New course booking!",
        body: `${booking.pupil_name} booked ${courseName} — deposit paid`,
        reference_id: booking.id,
        reference_type: "booking",
        read: false,
      });
    }

    console.log("[square-course-webhook] confirmed booking:", booking.id);

    return new Response(JSON.stringify({ ok: true, booking_id: booking.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e: any) {
    console.error("[square-course-webhook] error:", e.message);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: corsHeaders,
    });
  }
});

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

    const { course_id, pupil_name, pupil_email, pupil_phone } = await req.json();

    if (!course_id || !pupil_name) {
      return new Response(
        JSON.stringify({ error: "course_id and pupil_name required" }),
        { status: 400, headers: corsHeaders },
      );
    }

    // Get course details
    const { data: course, error: courseErr } = await supabase
      .from("instructor_courses")
      .select("id, name, price, instructor_id, school_skim_amount")
      .eq("id", course_id)
      .single();

    if (courseErr || !course) {
      console.error("[course-payment] course not found:", courseErr);
      return new Response(
        JSON.stringify({ error: "Course not found" }),
        { status: 404, headers: corsHeaders },
      );
    }

    // Get instructor details separately
    const { data: instructor } = await supabase
      .from("instructors")
      .select("name, phone")
      .eq("id", course.instructor_id)
      .single();

    const EVERYDRIVER_TOKEN = Deno.env.get("SQUARE_EVERYDRIVER_ACCESS_TOKEN")!;
    const EVERYDRIVER_LOCATION = Deno.env.get("SQUARE_EVERYDRIVER_LOCATION_ID")!;
    const ADMIN_FEE_PENCE = 20000; // £200 fixed admin fee

    const instructorName = instructor?.name ?? "your instructor";
    const instructorPhone = instructor?.phone ?? "";

    const idempotencyKey = `course-${course_id}-${Date.now()}`;

    // Build redirect URL
    // Insert pending booking first so we have the ID for the redirect
    let bookingId: string | null = null;
    try {
      const { data: bookingRow } = await supabase.from("course_bookings").insert({
        course_id,
        instructor_id: course.instructor_id,
        pupil_name,
        pupil_email: pupil_email ?? null,
        pupil_phone: pupil_phone ?? null,
        status: "pending_payment",
      }).select("id").single();
      bookingId = bookingRow?.id ?? null;
    } catch(e: any) {
      console.warn("[course-payment] pre-insert booking failed:", e.message);
    }

    const redirectUrl = bookingId
      ? `https://everydriver.co.uk/booking-confirmation?id=${bookingId}`
      : `https://everydriver.co.uk/booking-confirmation?course=${encodeURIComponent(course.name ?? "")}&instructor=${encodeURIComponent(instructorName)}&phone=${encodeURIComponent(instructorPhone)}`;

    // Create payment link on EveryDriver Square account
    const squareRes = await fetch(
      "https://connect.squareup.com/v2/online-checkout/payment-links",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${EVERYDRIVER_TOKEN}`,
          "Content-Type": "application/json",
          "Square-Version": "2024-01-18",
        },
        body: JSON.stringify({
          idempotency_key: idempotencyKey,
          order: {
            location_id: EVERYDRIVER_LOCATION,
            line_items: [
              {
                name: `Booking deposit: ${course.name ?? "Driving course"} with ${instructorName} (remaining balance paid direct to instructor)`,
                quantity: "1",
                base_price_money: {
                  amount: ADMIN_FEE_PENCE,
                  currency: "GBP",
                },
              },
            ],
          },
          checkout_options: {
            allow_tipping: false,
            redirect_url: redirectUrl,
            merchant_support_email: "support@everydriver.co.uk",
            ask_for_shipping_address: false,
          },
          pre_populated_data: {
            buyer_email: pupil_email ?? "",
          },
        }),
      },
    );

    const squareData = await squareRes.json();

    if (!squareRes.ok || squareData.errors) {
      console.error("[course-payment] Square error:", JSON.stringify(squareData.errors));
      return new Response(
        JSON.stringify({ error: squareData.errors?.[0]?.detail ?? "Square error" }),
        { status: 400, headers: corsHeaders },
      );
    }

    const link = squareData.payment_link;

    // Update booking with square_order_id now that we have it
    if (bookingId) {
      try {
        await supabase.from("course_bookings").update({
          square_order_id: link.order_id,
        }).eq("id", bookingId);
      } catch(e: any) {
        console.warn("[course-payment] booking update failed:", e.message);
      }
    }

    console.log("[course-payment] payment link created:", link.id);

    return new Response(
      JSON.stringify({
        url: link.url,
        long_url: link.long_url,
        order_id: link.order_id,
        admin_fee: 200,
        instructor_name: instructorName,
        instructor_phone: instructorPhone,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e: any) {
    console.error("[course-payment] error:", e.message);
    return new Response(
      JSON.stringify({ error: e.message }),
      { status: 500, headers: corsHeaders },
    );
  }
});

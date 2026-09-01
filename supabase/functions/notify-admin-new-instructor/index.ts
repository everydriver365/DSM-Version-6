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

    const { instructor_id } = await req.json();

    if (!instructor_id) {
      return new Response(
        JSON.stringify({ error: "instructor_id required" }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Get instructor details
    const { data: instructor } = await supabase
      .from("instructors")
      .select("name, email, phone, town, created_at")
      .eq("id", instructor_id)
      .single();

    if (!instructor) {
      return new Response(
        JSON.stringify({ error: "Instructor not found" }),
        { status: 404, headers: corsHeaders }
      );
    }

    const adminUrl = `https://admin.everydriver.pro/instructors/${instructor_id}`;
    const signupDate = new Date(instructor.created_at)
      .toLocaleString("en-GB", { timeZone: "Europe/London" });

    // Send email via Resend
    const resendKey = Deno.env.get("RESEND_API_KEY")!;

    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "EveryDriver Pro <noreply@everydriver.co.uk>",
        to: ["admin@everydriver.co.uk"],
        subject: `🎉 New instructor joined: ${instructor.name}`,
        html: `
          <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #0B2341; padding: 24px; border-radius: 12px 12px 0 0;">
              <h1 style="color: #fff; margin: 0; font-size: 24px;">
                🎉 New instructor joined
              </h1>
            </div>
            <div style="background: #F4F6F8; padding: 24px; border-radius: 0 0 12px 12px;">
              
              <div style="background: #fff; border-radius: 12px; padding: 20px; margin-bottom: 16px; border: 1px solid #E4E8EF;">
                <h2 style="color: #0B2341; margin: 0 0 16px; font-size: 18px;">
                  Instructor details
                </h2>
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 8px 0; color: #536579; font-size: 14px; width: 120px;">Name</td>
                    <td style="padding: 8px 0; color: #0B2341; font-size: 14px; font-weight: 600;">${instructor.name ?? "Not provided"}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #536579; font-size: 14px;">Email</td>
                    <td style="padding: 8px 0; color: #0B2341; font-size: 14px;">${instructor.email ?? "Not provided"}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #536579; font-size: 14px;">Phone</td>
                    <td style="padding: 8px 0; color: #0B2341; font-size: 14px;">${instructor.phone ?? "Not provided"}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #536579; font-size: 14px;">Location</td>
                    <td style="padding: 8px 0; color: #0B2341; font-size: 14px;">${instructor.town ?? "Not provided"}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #536579; font-size: 14px;">Signed up</td>
                    <td style="padding: 8px 0; color: #0B2341; font-size: 14px;">${signupDate}</td>
                  </tr>
                </table>
              </div>

              <a href="${adminUrl}" style="display: block; background: #2C97DE; color: #fff; text-align: center; padding: 14px; border-radius: 10px; text-decoration: none; font-size: 15px; font-weight: 700;">
                View in admin panel →
              </a>

              <p style="color: #536579; font-size: 12px; text-align: center; margin-top: 16px;">
                EveryDriver Pro · admin@everydriver.co.uk
              </p>
            </div>
          </div>
        `,
      }),
    });

    if (!emailRes.ok) {
      const err = await emailRes.json();
      console.error("[notify-admin] Resend error:", JSON.stringify(err));
      return new Response(
        JSON.stringify({ error: "Email failed" }),
        { status: 500, headers: corsHeaders }
      );
    }

    // Also send push notification to admin
    const onesignalKey = Deno.env.get("ONESIGNAL_REST_API_KEY")!;
    await fetch("https://api.onesignal.com/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Key ${onesignalKey}`,
      },
      body: JSON.stringify({
        app_id: "70d001f6-c98e-434d-8251-354c62447cb5",
        target_channel: "push",
        include_aliases: {
          external_id: ["fddb9b7e-fe81-4ffc-b20f-08a2e1b305d0"],
        },
        headings: { en: "🎉 New instructor joined!" },
        contents: { en: `${instructor.name} just signed up` },
      }),
    });

    console.log("[notify-admin] notified for instructor:", instructor_id);

    return new Response(
      JSON.stringify({ ok: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (e: any) {
    console.error("[notify-admin] error:", e.message);
    return new Response(
      JSON.stringify({ error: e.message }),
      { status: 500, headers: corsHeaders }
    );
  }
});

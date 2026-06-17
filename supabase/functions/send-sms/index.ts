// Supabase Edge Function: send-sms
// Processes queued SMS messages from the sms_queue table and sends them via Twilio.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface QueuedMessage {
  id: string;
  pupil_phone: string;
  message: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID");
  const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");
  const TWILIO_FROM_NUMBER = Deno.env.get("TWILIO_FROM_NUMBER");

  if (
    !SUPABASE_URL ||
    !SUPABASE_SERVICE_ROLE_KEY ||
    !TWILIO_ACCOUNT_SID ||
    !TWILIO_AUTH_TOKEN ||
    !TWILIO_FROM_NUMBER
  ) {
    return new Response(
      JSON.stringify({ error: "Missing required environment variables" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const { data: queued, error: fetchError } = await supabase
    .from("sms_queue")
    .select("id, pupil_phone, message")
    .eq("status", "queued")
    .lte("scheduled_for", new Date().toISOString())
    .limit(50);

  if (fetchError) {
    return new Response(JSON.stringify({ error: fetchError.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const messages = (queued ?? []) as QueuedMessage[];
  const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
  const authHeader = "Basic " + btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);

  let sent = 0;
  let failed = 0;

  for (const msg of messages) {
    try {
      const body = new URLSearchParams({
        To: msg.pupil_phone,
        From: TWILIO_FROM_NUMBER,
        Body: msg.message,
      });

      const res = await fetch(twilioUrl, {
        method: "POST",
        headers: {
          Authorization: authHeader,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: body.toString(),
      });

      if (res.ok) {
        await supabase
          .from("sms_queue")
          .update({ status: "sent", sent_at: new Date().toISOString() })
          .eq("id", msg.id);
        sent++;
      } else {
        const errText = await res.text();
        console.error(`Twilio send failed for ${msg.id}:`, res.status, errText);
        await supabase.from("sms_queue").update({ status: "failed" }).eq("id", msg.id);
        failed++;
      }
    } catch (err) {
      console.error(`Error sending message ${msg.id}:`, err);
      await supabase.from("sms_queue").update({ status: "failed" }).eq("id", msg.id);
      failed++;
    }
  }

  return new Response(JSON.stringify({ sent, failed }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});

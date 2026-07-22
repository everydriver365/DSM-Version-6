// Supabase Edge Function: ryft-webhook
// Handles Ryft payment completion callbacks.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error("ryft-webhook: missing required environment variables");
    return new Response(
      JSON.stringify({ error: "Missing required environment variables" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    const payload = await req.json();
    console.log("ryft-webhook: received payload", payload);

    // 3b. If jobOfferId in metadata
    if (payload?.metadata?.jobOfferId) {
      const jobOfferId = payload.metadata.jobOfferId;
      const amount =
        payload.amount ?? payload.amountPaid ?? payload.chargedAmount ?? 0;
      const paymentMethod =
        payload.paymentMethod ?? payload.method ?? payload.type ?? "card";

      const { error } = await supabase
        .from("job_offers")
        .update({
          amount_paid: amount,
          payment_method: paymentMethod,
          contact_released: true,
          paid_at: new Date().toISOString(),
        })
        .eq("id", jobOfferId);

      if (error) {
        console.error("ryft-webhook: job_offers update error", error);
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      return new Response(
        JSON.stringify({ ok: true, jobOfferId }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({ ok: true, message: "No job offer metadata" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("ryft-webhook: error", err);
    return new Response(
      JSON.stringify({ error: "Invalid payload" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  try {
    const { flow_id, instructor_id, tier, interval } = await req.json();
    const GC_TOKEN = Deno.env.get("GOCARDLESS_ACCESS_TOKEN");
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Complete redirect flow
    const completeRes = await fetch(
      `https://api.gocardless.com/redirect_flows/${flow_id}/actions/complete`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${GC_TOKEN}`,
          "GoCardless-Version": "2015-07-06",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ data: { session_token: instructor_id } }),
      }
    );
    const completeData = await completeRes.json();
    const mandateId = completeData.redirect_flows.links.mandate;

    // Determine amount in pence
    const amounts: Record<string, number> = {
      pro_monthly: 2499,
      pro_annual: 24999,
      pro_plus_monthly: 3999,
      pro_plus_annual: 39999,
    };
    const amount = amounts[`${tier}_${interval}`] ?? 2499;

    // Create subscription
    const intervalConfig = interval === "annual"
      ? { interval: 1, interval_unit: "yearly" }
      : { interval: 1, interval_unit: "monthly" };

    const subRes = await fetch("https://api.gocardless.com/subscriptions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GC_TOKEN}`,
        "GoCardless-Version": "2015-07-06",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        subscriptions: {
          amount,
          currency: "GBP",
          name: `EveryDriver ${tier.toUpperCase()}`,
          ...intervalConfig,
          links: { mandate: mandateId },
          metadata: { instructor_id, tier, interval },
        },
      }),
    });
    const subData = await subRes.json();
    const subscriptionId = subData.subscriptions.id;

    // Calculate expiry
    const expiresAt = new Date();
    if (interval === "annual") {
      expiresAt.setFullYear(expiresAt.getFullYear() + 1);
    } else {
      expiresAt.setMonth(expiresAt.getMonth() + 1);
    }

    // Update instructor
    await supabase
      .from("instructors")
      .update({
        subscription_tier: tier,
        subscription_status: "active",
        gc_mandate_id: mandateId,
        gc_subscription_id: subscriptionId,
        subscription_expires_at: expiresAt.toISOString(),
      })
      .eq("id", instructor_id);

    // Log subscription
    await supabase.from("subscriptions").insert({
      instructor_id,
      tier,
      status: "active",
      gc_subscription_id: subscriptionId,
      amount_pence: amount,
      interval,
    });

    return new Response(
      JSON.stringify({ ok: true, subscription_id: subscriptionId, tier }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: corsHeaders });
  }
});

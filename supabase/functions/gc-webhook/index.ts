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
    const body = await req.json();
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    for (const event of body.events) {
      const resourceType = event.resource_type;
      const action = event.action;

      if (resourceType === "subscriptions") {
        const subId = event.links.subscription;

        if (action === "cancelled" || action === "finished") {
          await supabase
            .from("instructors")
            .update({
              subscription_status: "cancelled",
              subscription_tier: "free",
            })
            .eq("gc_subscription_id", subId);
        }

        if (action === "resumed") {
          await supabase
            .from("instructors")
            .update({ subscription_status: "active" })
            .eq("gc_subscription_id", subId);
        }
      }

      if (resourceType === "payments") {
        const paymentId = event.links.payment;
        const subId = event.links.subscription;

        if (action === "paid_out") {
          const { data: instructor } = await supabase
            .from("instructors")
            .select("id, subscription_tier, subscription_expires_at")
            .eq("gc_subscription_id", subId)
            .single();

          if (instructor) {
            const currentExpiry = instructor.subscription_expires_at
              ? new Date(instructor.subscription_expires_at)
              : new Date();
            currentExpiry.setMonth(currentExpiry.getMonth() + 1);

            await supabase
              .from("instructors")
              .update({
                subscription_status: "active",
                subscription_expires_at: currentExpiry.toISOString(),
              })
              .eq("gc_subscription_id", subId);

            await supabase.from("subscriptions").insert({
              instructor_id: instructor.id,
              tier: instructor.subscription_tier,
              status: "paid",
              gc_subscription_id: subId,
              gc_payment_id: paymentId,
              amount_pence: 0,
              interval: "monthly",
            });
          }
        }

        if (action === "failed") {
          await supabase
            .from("instructors")
            .update({ subscription_status: "payment_failed" })
            .eq("gc_subscription_id", subId);
        }
      }
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});

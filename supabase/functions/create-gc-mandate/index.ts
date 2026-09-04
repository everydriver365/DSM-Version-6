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
    const { instructor_id, tier, interval, return_url } = await req.json();
    const GC_TOKEN = Deno.env.get("GOCARDLESS_ACCESS_TOKEN");
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const { data: instructor } = await supabase
      .from("instructors")
      .select("id, name, email, gc_customer_id")
      .eq("id", instructor_id)
      .single();
    if (!instructor) {
      return new Response(JSON.stringify({ error: "Instructor not found" }), { status: 404, headers: corsHeaders });
    }
    let customerId = instructor.gc_customer_id;
    if (!customerId) {
      const nameParts = (instructor.name ?? "").split(" ");
      const customerRes = await fetch("https://api.gocardless.com/customers", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${GC_TOKEN}`,
          "GoCardless-Version": "2015-07-06",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          customers: {
            email: instructor.email,
            given_name: nameParts[0] ?? "",
            family_name: nameParts.slice(1).join(" ") ?? "",
            metadata: { instructor_id },
          },
        }),
      });
      const customerData = await customerRes.json();
      customerId = customerData.customers.id;
      await supabase.from("instructors").update({ gc_customer_id: customerId }).eq("id", instructor_id);
    }
    const flowRes = await fetch("https://api.gocardless.com/redirect_flows", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GC_TOKEN}`,
        "GoCardless-Version": "2015-07-06",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        redirect_flows: {
          description: `EveryDriver ${tier.toUpperCase()} — ${interval}`,
          session_token: instructor_id,
          success_redirect_url: return_url,
          links: { customer: customerId },
        },
      }),
    });
    const flowData = await flowRes.json();
    return new Response(
      JSON.stringify({
        redirect_url: flowData.redirect_flows.redirect_url,
        flow_id: flowData.redirect_flows.id,
        tier,
        interval,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: corsHeaders });
  }
});

import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

const TIER_LABELS: Record<string, string> = {
  website: "DSM Essential",
  pro: "DSM Website Pro",
  managed: "DSM Max",
};

const TIER_PRICES: Record<string, { monthly: number; annual: number }> = {
  website: { monthly: 999, annual: 8990 },
  pro: { monthly: 1999, annual: 17990 },
  managed: { monthly: 3999, annual: 35990 },
};

const SUPPORTED_TIERS = Object.keys(TIER_LABELS);

export const Route = createFileRoute("/api/square-create-subscription")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const SUPABASE_URL = process.env["SUPABASE_URL"]!;
        const SERVICE_ROLE = process.env["SUPABASE_SERVICE_ROLE_KEY"]!;
        const SQUARE_ACCESS_TOKEN = process.env["SQUARE_ACCESS_TOKEN"];
        const SQUARE_LOCATION_ID = process.env["SQUARE_LOCATION_ID"];
        const SQUARE_ENVIRONMENT = process.env["SQUARE_ENVIRONMENT"] ?? "production";

        if (!SUPABASE_URL || !SERVICE_ROLE) {
          return Response.json({ error: "Missing Supabase environment variables" }, { status: 500 });
        }
        if (!SQUARE_ACCESS_TOKEN || !SQUARE_LOCATION_ID) {
          return Response.json({ error: "Square is not configured" }, { status: 500 });
        }

        const auth = request.headers.get("authorization");
        if (!auth) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
          auth: { autoRefreshToken: false, persistSession: false },
        });
        const { data: { user }, error: userError } = await supabase.auth.getUser(auth.replace("Bearer ", ""));
        if (userError || !user) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        let payload: {
          tier?: string;
          domain?: string | null;
          billing_period?: "monthly" | "annual";
          redirect_url?: string;
        };
        try {
          payload = await request.json();
        } catch {
          return Response.json({ error: "Invalid JSON body" }, { status: 400 });
        }

        const { tier, domain, billing_period, redirect_url } = payload;
        if (!tier || !SUPPORTED_TIERS.includes(tier)) {
          return Response.json({ error: "Invalid tier" }, { status: 400 });
        }

        const period = billing_period === "annual" ? "annual" : "monthly";
        const amountPence = TIER_PRICES[tier][period];
        const tierLabel = `${TIER_LABELS[tier]} — ${period === "annual" ? "Annual" : "Monthly"} Subscription`;

        const baseUrl = SQUARE_ENVIRONMENT === "sandbox"
          ? "https://connect.squareupsandbox.com"
          : "https://connect.squareup.com";

        try {
          const idempotencyKey = crypto.randomUUID();
          const res = await fetch(`${baseUrl}/v2/online-checkout/payment-links`, {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${SQUARE_ACCESS_TOKEN}`,
              "Content-Type": "application/json",
              "Square-Version": "2024-06-04",
            },
            body: JSON.stringify({
              idempotency_key: idempotencyKey,
              quick_pay: {
                name: tierLabel,
                price_money: {
                  amount: amountPence,
                  currency: "GBP",
                },
                location_id: SQUARE_LOCATION_ID,
              },
              redirect_url: redirect_url ?? `https://drivingschoolmanager.co.uk/subscription-success?tier=${tier}`,
              description: domain ? `Website subscription for ${domain}` : tierLabel,
            }),
          });

          const data = await res.json();
          if (!res.ok) {
            console.error("[square-create-subscription] Square error", data);
            return Response.json(
              { error: data?.errors?.[0]?.detail ?? "Could not create payment link" },
              { status: 500 },
            );
          }

          return Response.json({ url: data.payment_link.url });
        } catch (e) {
          console.error("[square-create-subscription] error", e);
          return Response.json({ error: "Could not create payment link" }, { status: 500 });
        }
      },
    },
  },
});

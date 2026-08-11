import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

/**
 * Square webhook — the only place a Square card payment becomes "paid".
 *
 * Generating a payment link is not payment. The app writes a `pending` row to
 * `square_payment_intents` when the link/QR is created; Square calls this
 * endpoint once the pupil actually pays, and `apply_square_payment()` settles
 * the ledger (lessons FIFO, account balance, audit rows, notification).
 *
 * Setup (Square Dashboard → Developer → Webhooks):
 *   URL:    https://drivingschoolmanager.co.uk/api/public/square-webhook
 *   Events: payment.created, payment.updated
 * Then add these server secrets:
 *   SQUARE_WEBHOOK_SIGNATURE_KEY  (shown in the Square webhook subscription)
 *   SQUARE_WEBHOOK_URL            (the exact URL above — Square signs it)
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

const SIGNATURE_HEADER = "x-square-hmacsha256-signature";

async function verifySignature(
  rawBody: string,
  signature: string,
  signatureKey: string,
  notificationUrl: string,
): Promise<boolean> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(signatureKey),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const mac = await crypto.subtle.sign("HMAC", key, enc.encode(notificationUrl + rawBody));
  const expected = btoa(String.fromCharCode(...new Uint8Array(mac)));
  if (expected.length !== signature.length) return false;
  // Constant-time compare.
  let diff = 0;
  for (let i = 0; i < expected.length; i += 1) {
    diff |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  return diff === 0;
}

interface SquarePayment {
  id?: string;
  status?: string;
  order_id?: string;
  amount_money?: { amount?: number };
}

export const Route = createFileRoute("/api/public/square-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const env = process.env as Record<string, string | undefined>;
        const signatureKey = env["SQUARE_WEBHOOK_SIGNATURE_KEY"];
        const notificationUrl = env["SQUARE_WEBHOOK_URL"];
        const supabaseUrl = env["SUPABASE_URL"];
        const serviceKey = env["SUPABASE_SERVICE_ROLE_KEY"];

        if (!signatureKey || !notificationUrl || !supabaseUrl || !serviceKey) {
          console.error("[square-webhook] missing server configuration");
          return new Response("Not configured", { status: 500 });
        }

        const rawBody = await request.text();
        const signature = request.headers.get(SIGNATURE_HEADER) ?? "";
        if (!signature || !(await verifySignature(rawBody, signature, signatureKey, notificationUrl))) {
          return new Response("Invalid signature", { status: 401 });
        }

        let payload: {
          type?: string;
          data?: { object?: { payment?: SquarePayment } };
        };
        try {
          payload = JSON.parse(rawBody);
        } catch {
          return new Response("Bad payload", { status: 400 });
        }

        const payment = payload.data?.object?.payment;
        if (!payment || (payment.status ?? "").toUpperCase() !== "COMPLETED") {
          // Nothing to settle yet (APPROVED / PENDING / FAILED). Ack so Square
          // does not retry.
          return new Response("ok");
        }

        const supabase = createClient(supabaseUrl, serviceKey, {
          auth: { persistSession: false, autoRefreshToken: false },
        });

        // Match the pending intent: order id first, then payment-link id, then
        // a unique recent pending intent for the same amount.
        let intentId: string | null = null;

        if (payment.order_id) {
          const { data } = await supabase
            .from("square_payment_intents")
            .select("id")
            .eq("status", "pending")
            .or(`order_id.eq.${payment.order_id},payment_link_id.eq.${payment.order_id}`)
            .limit(1)
            .maybeSingle();
          intentId = (data as { id: string } | null)?.id ?? null;
        }

        if (!intentId && typeof payment.amount_money?.amount === "number") {
          const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
          const { data } = await supabase
            .from("square_payment_intents")
            .select("id")
            .eq("status", "pending")
            .eq("amount_pence", payment.amount_money.amount)
            .gte("created_at", since)
            .order("created_at", { ascending: false })
            .limit(2);
          const rows = (data ?? []) as { id: string }[];
          // Only auto-match when it is unambiguous.
          if (rows.length === 1) intentId = rows[0].id;
        }

        if (!intentId) {
          console.warn("[square-webhook] no matching pending intent", payment.id);
          return new Response("ok");
        }

        const { error } = await supabase.rpc("apply_square_payment", {
          p_intent_id: intentId,
          p_square_payment_id: payment.id ?? null,
        });
        if (error) {
          console.error("[square-webhook] apply_square_payment", error);
          return new Response("Settlement failed", { status: 500 });
        }

        return new Response("ok");
      },
    },
  },
});

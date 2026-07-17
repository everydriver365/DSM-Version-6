// Supabase Edge Function: receive-sms
// Twilio inbound SMS webhook handler.
// - Validates the request is genuinely from Twilio via HMAC-SHA1 signature.
// - Matches the sender's phone number to a pupil.
// - Inserts the reply into chat_messages.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-twilio-signature",
};

// Normalise a phone number to digits only (drops '+', spaces, dashes, brackets).
function digitsOnly(s: string | null | undefined): string {
  return (s ?? "").replace(/\D+/g, "");
}

// Build the string Twilio signs: full URL + concatenated sorted (key + value) pairs.
function buildSignatureBase(url: string, params: Record<string, string>): string {
  const sortedKeys = Object.keys(params).sort();
  let base = url;
  for (const k of sortedKeys) {
    base += k + params[k];
  }
  return base;
}

// HMAC-SHA1 then base64 — matches Twilio's X-Twilio-Signature scheme.
async function hmacSha1Base64(key: string, data: string): Promise<string> {
  const enc = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    enc.encode(key),
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, enc.encode(data));
  const bytes = new Uint8Array(sig);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

// Constant-time string compare.
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function twiml(body: string): Response {
  const xml = `<?xml version="1.0" encoding="UTF-8"?><Response>${body}</Response>`;
  return new Response(xml, {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "text/xml" },
  });
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
  const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !TWILIO_AUTH_TOKEN) {
    console.error("receive-sms: missing required environment variables");
    return new Response(
      JSON.stringify({ error: "Missing required environment variables" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  // Twilio posts application/x-www-form-urlencoded.
  const rawBody = await req.text();
  const form = new URLSearchParams(rawBody);
  const params: Record<string, string> = {};
  for (const [k, v] of form.entries()) params[k] = v;

  // Reconstruct the exact public URL Twilio hit (Twilio signs this).
  // Prefer x-forwarded-* since edge functions sit behind a proxy.
  const proto = req.headers.get("x-forwarded-proto") ?? "https";
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "";
  const reqUrl = new URL(req.url);
  const publicUrl = `${proto}://${host}${reqUrl.pathname}${reqUrl.search}`;

  const signatureHeader = req.headers.get("x-twilio-signature") ?? "";
  const base = buildSignatureBase(publicUrl, params);
  const expected = await hmacSha1Base64(TWILIO_AUTH_TOKEN, base);

  if (!signatureHeader || !safeEqual(signatureHeader, expected)) {
    console.warn("receive-sms: invalid Twilio signature", {
      publicUrl,
      hasHeader: !!signatureHeader,
    });
    return new Response("Invalid signature", {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "text/plain" },
    });
  }

  const from = params["From"] ?? "";
  const body = params["Body"] ?? "";
  const messageSid = params["MessageSid"] ?? params["SmsMessageSid"] ?? "";

  if (!from) {
    return twiml("");
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Match sender to a pupil by comparing digits-only phone numbers, and also
  // by the last 10 digits (handles country-code differences).
  const fromDigits = digitsOnly(from);
  const fromTail = fromDigits.slice(-10);

  const { data: pupils, error: pupilError } = await supabase
    .from("pupils")
    .select("id, phone, instructor_id, first_name, last_name")
    .not("phone", "is", null);

  if (pupilError) {
    console.error("receive-sms: pupil lookup failed", pupilError);
    return twiml("");
  }

  const matched = (pupils ?? []).find((p: { phone: string | null }) => {
    const d = digitsOnly(p.phone);
    if (!d) return false;
    return d === fromDigits || d.slice(-10) === fromTail;
  });

  if (!matched) {
    console.log("receive-sms: no pupil matched", { from, messageSid });
    return twiml("");
  }

  const { error: insertError } = await supabase.from("chat_messages").insert({
    pupil_id: matched.id,
    instructor_id: matched.instructor_id,
    sender_type: "pupil",
    sender_id: matched.id,
    body,
  });

  if (insertError) {
    console.error("receive-sms: chat_messages insert failed", insertError);
    return twiml("");
  }

  return twiml("");
});

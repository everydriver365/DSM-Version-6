// Supabase Edge Function: receive-sms
// Twilio inbound SMS webhook handler.
// - Validates the request is genuinely from Twilio via HMAC-SHA1 signature.
// - Matches the sender's phone number to a pupil.
// - Inserts the reply into chat_messages.
// - If the reply is an acceptance of an open gap-filler offer, books the
//   lesson automatically (clash-checked), closes competing offers, notifies
//   the instructor and texts the pupil back.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { looksLikeAcceptance, OPEN_OFFER_STATUSES } from "../../../src/lib/smsAcceptance.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-twilio-signature",
};

// Normalise a phone number to digits only (drops '+', spaces, dashes, brackets).
function digitsOnly(s: string | null | undefined): string {
  return (s ?? "").replace(/\D+/g, "");
}

type InboundLogRow = {
  instructor_id?: string | null;
  pupil_id?: string | null;
  from_number?: string | null;
  message_sid?: string | null;
  body?: string | null;
  outcome: string;
  detail?: string | null;
};

// One audit row per inbound text. Never allowed to break reply handling.
// deno-lint-ignore no-explicit-any
async function logInbound(supabase: any, row: InboundLogRow): Promise<void> {
  try {
    const { error } = await supabase.from("sms_inbound_log").insert(row);
    if (error) console.error("receive-sms: inbound log insert failed", error);
  } catch (e) {
    console.error("receive-sms: inbound log threw", e);
  }
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

  // Hardcoded URL matching exactly what's configured in the Twilio console.
  const publicUrl = "https://bjpqxfrihwjcqprmoqfs.supabase.co/functions/v1/receive-sms";

  const signatureHeader = req.headers.get("x-twilio-signature") ?? "";
  const base = buildSignatureBase(publicUrl, params);
  const expected = await hmacSha1Base64(TWILIO_AUTH_TOKEN, base);

  console.log("receive-sms: signature check", { publicUrl, base, expected, signatureHeader });

  const from = params["From"] ?? "";
  const body = params["Body"] ?? "";
  const messageSid = params["MessageSid"] ?? params["SmsMessageSid"] ?? "";

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  if (!signatureHeader || !safeEqual(signatureHeader, expected)) {
    console.warn("receive-sms: invalid Twilio signature", {
      publicUrl,
      hasHeader: !!signatureHeader,
    });
    await logInbound(supabase, {
      from_number: from,
      message_sid: messageSid,
      body,
      outcome: "invalid_signature",
      detail: signatureHeader ? "Signature did not match" : "No signature header",
    });
    return new Response("Invalid signature", {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "text/plain" },
    });
  }

  if (!from) {
    await logInbound(supabase, {
      body,
      message_sid: messageSid,
      outcome: "error",
      detail: "No sender number on the request",
    });
    return twiml("");
  }

  // Match sender to a pupil by comparing digits-only phone numbers, and also
  // by the last 10 digits (handles country-code differences).
  const fromDigits = digitsOnly(from);
  const fromTail = fromDigits.slice(-10);

  // Only the columns needed here — a missing optional column must never make
  // the whole lookup fail and silently drop the reply.
  const { data: pupils, error: pupilError } = await supabase
    .from("pupils")
    .select("id, phone, instructor_id, name")
    .not("phone", "is", null);

  if (pupilError) {
    console.error("receive-sms: pupil lookup failed", pupilError);
    await logInbound(supabase, {
      from_number: from,
      message_sid: messageSid,
      body,
      outcome: "error",
      detail: `Pupil lookup failed: ${pupilError.message ?? "unknown error"}`,
    });
    return twiml("");
  }

  const matched = (pupils ?? []).find((p: { phone: string | null }) => {
    const d = digitsOnly(p.phone);
    if (!d) return false;
    return d === fromDigits || d.slice(-10) === fromTail;
  });

  if (!matched) {
    console.log("receive-sms: no pupil matched", { from, messageSid });
    await logInbound(supabase, {
      from_number: from,
      message_sid: messageSid,
      body,
      outcome: "no_pupil_match",
      detail: "No pupil has this phone number",
    });
    return twiml("");
  }

  const logBase = {
    instructor_id: matched.instructor_id ?? null,
    pupil_id: matched.id,
    from_number: from,
    message_sid: messageSid,
    body,
  };

  const { error: insertError } = await supabase.from("chat_messages").insert({
    pupil_id: matched.id,
    instructor_id: matched.instructor_id,
    sender_type: "pupil",
    sender_id: matched.id,
    source: "sms",
    body,
  });

  if (insertError) {
    console.error("receive-sms: chat_messages insert failed", insertError);
    await logInbound(supabase, {
      ...logBase,
      outcome: "error",
      detail: `Saving to the chat failed: ${insertError.message ?? "unknown error"}`,
    });
    return twiml("");
  }

  if (looksLikeAcceptance(body)) {
    try {
      await autoBookOffer(supabase, matched, from, logBase);
    } catch (err) {
      console.error("receive-sms: auto-book failed", err);
      await logInbound(supabase, {
        ...logBase,
        outcome: "error",
        detail: `Auto-booking failed: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  } else {
    await logInbound(supabase, {
      ...logBase,
      outcome: "logged_only",
      detail: "Saved to the chat — not read as an acceptance",
    });
  }

  return twiml("");


});

// ---------------------------------------------------------------------------
// Automatic booking of an accepted gap-filler offer.
// Mirrors the diary rules used by the app's double-booking check
// (src/lib/bookingConflicts.ts): lessons, blocking Google calendar events,
// recurring blocks and time off. The database overlap constraint remains the
// final guard.
// ---------------------------------------------------------------------------

const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

function hmToMin(t: string | null | undefined): number {
  if (!t) return 0;
  const [h, m] = String(t).split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

function overlaps(aS: number, aE: number, bS: number, bE: number): boolean {
  return aS < bE && bS < aE;
}

function londonParts(iso: string): { date: string; mins: number } {
  const d = new Date(iso);
  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const p: Record<string, string> = {};
  for (const part of fmt.formatToParts(d)) p[part.type] = part.value;
  return {
    date: `${p.year}-${p.month}-${p.day}`,
    mins: Number(p.hour) * 60 + Number(p.minute),
  };
}

function formatWhen(slotDate: string, slotTime: string): string {
  try {
    const d = new Date(`${slotDate}T${(slotTime || "00:00").slice(0, 5)}:00`);
    const day = d.toLocaleDateString("en-GB", {
      weekday: "long",
      day: "numeric",
      month: "long",
      timeZone: "Europe/London",
    });
    return `${day} at ${(slotTime || "").slice(0, 5)}`;
  } catch {
    return `${slotDate} at ${slotTime}`;
  }
}

// deno-lint-ignore no-explicit-any
async function autoBookOffer(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  // deno-lint-ignore no-explicit-any
  pupil: any,
  fromNumber: string,
  logBase: Omit<InboundLogRow, "outcome">,
) {
  const instructorId = pupil.instructor_id;
  if (!instructorId) {
    await logInbound(supabase, {
      ...logBase,
      outcome: "error",
      detail: "Pupil has no instructor",
    });
    return;
  }

  const { data: offer, error: offerErr } = await supabase
    .from("gap_filler_offers")
    .select("*")
    .eq("pupil_id", pupil.id)
    .eq("instructor_id", instructorId)
    .in("status", OPEN_OFFER_STATUSES)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (offerErr) {
    console.error("receive-sms: offer lookup failed", offerErr);
    await logInbound(supabase, {
      ...logBase,
      outcome: "error",
      detail: `Offer lookup failed: ${offerErr.message ?? "unknown error"}`,
    });
    return;
  }
  if (!offer) {
    console.log("receive-sms: acceptance with no open offer", { pupil: pupil.id });
    await logInbound(supabase, {
      ...logBase,
      outcome: "no_open_offer",
      detail: "Reply read as YES but no open offer for this pupil",
    });
    return;
  }


  const dateStr: string = offer.slot_date;
  const timeStr: string = String(offer.slot_time || "").slice(0, 5);
  const duration: number = Number(offer.duration_minutes ?? 60) || 60;
  const startMins = hmToMin(timeStr);
  const endMins = startMins + duration;
  const when = formatWhen(dateStr, timeStr);
  const pupilName = pupil.name || "Your pupil";

  // --- Clash check -------------------------------------------------------
  const nextDay = new Date(`${dateStr}T00:00:00Z`);
  nextDay.setUTCDate(nextDay.getUTCDate() + 1);

  const [lessonsRes, blocksRes, recurringRes, timeOffRes] = await Promise.all([
    supabase
      .from("lessons")
      .select("lesson_time, duration_minutes, status")
      .eq("instructor_id", instructorId)
      .is("deleted_at", null)
      .eq("lesson_date", dateStr),
    supabase
      .from("calendar_blocks")
      .select("start_datetime, end_datetime, is_all_day, blocks_availability")
      .eq("instructor_id", instructorId)
      .eq("source", "external_calendar")
      .gt("end_datetime", new Date(`${dateStr}T00:00:00Z`).toISOString())
      .lt("start_datetime", nextDay.toISOString()),
    supabase
      .from("instructor_recurring_blocks")
      .select("day_of_week, start_time, end_time, is_active")
      .eq("instructor_id", instructorId),
    supabase
      .from("instructor_time_off")
      .select("start_time, end_time, all_day")
      .eq("instructor_id", instructorId)
      .lte("start_date", dateStr)
      .gte("end_date", dateStr),
  ]);

  const queryError =
    lessonsRes.error || blocksRes.error || recurringRes.error || timeOffRes.error;
  if (queryError) {
    console.error("receive-sms: diary read failed", queryError);
    await logInbound(supabase, {
      ...logBase,
      outcome: "error",
      detail: `Diary check failed: ${queryError.message ?? "unknown error"}`,
    });
    return; // never book against unknown diary data

  }

  let clash = false;

  for (const t of timeOffRes.data ?? []) {
    if (t.all_day) clash = true;
    else if (t.start_time && t.end_time &&
      overlaps(startMins, endMins, hmToMin(t.start_time), hmToMin(t.end_time))) clash = true;
  }

  for (const l of lessonsRes.data ?? []) {
    if (!l.lesson_time) continue;
    if (String(l.status || "").toLowerCase() === "cancelled") continue;
    const s = hmToMin(l.lesson_time);
    const e = s + (Number(l.duration_minutes ?? 60) || 60);
    if (overlaps(startMins, endMins, s, e)) clash = true;
  }

  for (const b of blocksRes.data ?? []) {
    if (b.blocks_availability === false) continue;
    if (b.is_all_day) continue; // all-day entries are notes, not busy time
    const sP = londonParts(b.start_datetime);
    const eP = londonParts(b.end_datetime);
    const s = sP.date < dateStr ? 0 : sP.mins;
    const e = eP.date > dateStr ? 1440 : eP.mins;
    if (e > s && overlaps(startMins, endMins, s, e)) clash = true;
  }

  const dayName = DAY_NAMES[new Date(`${dateStr}T12:00:00Z`).getUTCDay()];
  for (const r of recurringRes.data ?? []) {
    if (r.is_active === false) continue;
    if (r.day_of_week !== dayName) continue;
    if (overlaps(startMins, endMins, hmToMin(r.start_time), hmToMin(r.end_time))) clash = true;
  }

  const queueSms = async (message: string) => {
    if (!fromNumber) return;
    const { error } = await supabase.from("sms_queue").insert({
      instructor_id: instructorId,
      pupil_phone: fromNumber,
      message,
    });
    if (error) console.error("receive-sms: sms queue insert failed", error);
    else {
      try {
        await supabase.functions.invoke("send-sms", { body: {} });
      } catch (e) {
        console.warn("receive-sms: send-sms invoke failed", e);
      }
    }
  };

  const notify = async (title: string, bodyText: string) => {
    const { error } = await supabase.from("instructor_notifications").insert({
      instructor_id: instructorId,
      title,
      body: bodyText,
      type: "lesson",
      read: false,
    });
    if (error) console.error("receive-sms: notification insert failed", error);
    try {
      await supabase.functions.invoke("send-push", {
        body: { instructor_id: instructorId, title, body: bodyText, type: "lesson" },
      });
    } catch (e) {
      console.warn("receive-sms: push failed", e);
    }
  };

  if (clash) {
    await supabase
      .from("gap_filler_offers")
      .update({ status: "expired" })
      .eq("id", offer.id);
    await queueSms(
      `Sorry — that slot on ${when} has just gone. I'll let you know as soon as another comes up.`,
    );
    await notify("Slot already taken", `${pupilName} accepted ${when}, but it clashed`);
    await logInbound(supabase, {
      ...logBase,
      outcome: "clash",
      detail: `Accepted ${when} but it clashed with the diary — not booked`,
    });
    return;

  }

  // --- Pricing -----------------------------------------------------------
  let amountDue: number | null = offer.original_price ?? null;
  if (offer.discount_code_id) {
    const { data: dc } = await supabase
      .from("discount_codes")
      .select("*")
      .eq("id", offer.discount_code_id)
      .maybeSingle();
    const now = Date.now();
    const expired = dc?.expires_at ? new Date(dc.expires_at).getTime() < now : false;
    const overUsed = dc?.max_uses != null && (dc.uses_count ?? 0) >= dc.max_uses;
    if (dc && dc.active !== false && !expired && !overUsed) {
      amountDue = offer.discounted_price ?? offer.original_price ?? null;
      await supabase
        .from("discount_codes")
        .update({ uses_count: (dc.uses_count ?? 0) + 1 })
        .eq("id", dc.id);
    }
  }

  const { data: pupilPricing } = await supabase
    .from("pupils")
    .select("pricing_type, address")
    .eq("id", pupil.id)
    .maybeSingle();
  const pricingType = String(pupilPricing?.pricing_type ?? "").toLowerCase();
  const isPrepaid = pricingType === "block" || pricingType === "national_intensives";

  // A real booking row, shaped exactly like a lesson added by hand so the
  // diary renders it identically.
  const { data: booked, error: lessonErr } = await supabase
    .from("lessons")
    .insert({
      instructor_id: instructorId,
      pupil_id: pupil.id,
      lesson_date: dateStr,
      lesson_time: offer.slot_time,
      duration_minutes: duration,
      status: "confirmed",
      lesson_type: "lesson",
      pickup_location: pupilPricing?.address ?? null,
      amount_due: amountDue,
      payment_status: isPrepaid ? "prepaid" : "unpaid",
    })
    .select("id, lesson_date, lesson_time, duration_minutes, pupil_id")
    .single();

  if (lessonErr) {
    console.error("receive-sms: lesson insert failed", lessonErr);
    await queueSms(
      `Sorry — that slot on ${when} has just gone. I'll let you know as soon as another comes up.`,
    );
    await notify("Slot already taken", `${pupilName} accepted ${when}, but it could not be booked`);
    return;
  }

  console.log("receive-sms: lesson booked", booked);


  await supabase
    .from("gap_filler_offers")
    .update({ status: "accepted", accepted_at: new Date().toISOString() })
    .eq("id", offer.id);

  // Close any other offers still out for the same slot.
  const { error: closeErr } = await supabase
    .from("gap_filler_offers")
    .update({ status: "expired" })
    .eq("instructor_id", instructorId)
    .eq("slot_date", dateStr)
    .eq("slot_time", offer.slot_time)
    .in("status", OPEN_OFFER_STATUSES)
    .neq("id", offer.id);
  if (closeErr) console.error("receive-sms: closing competing offers failed", closeErr);

  await supabase.from("chat_messages").insert({
    instructor_id: instructorId,
    pupil_id: pupil.id,
    sender_type: "instructor",
    sender_id: instructorId,
    source: "sms",
    body: `Great news — you're booked in for ${when}! See you then.`,
  });

  await queueSms(`Great news — you're booked in for ${when}! See you then.`);
  await notify("Lesson booked!", `${pupilName} confirmed ${when}`);
}

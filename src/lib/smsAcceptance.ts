// Shared rules for recognising a pupil's "yes" reply to a gap-filler offer.
// Imported by the app UI and (relatively) by the receive-sms Edge Function,
// so this file must stay dependency-free.

export const ACCEPT_WORDS = [
  "yes",
  "yeah",
  "yep",
  "yup",
  "sure",
  "ok",
  "okay",
  "confirm",
  "sounds good",
];

/** Statuses that mean an offer is still open and can be accepted. */
export const OPEN_OFFER_STATUSES = ["pending"];

export function looksLikeAcceptance(body: string): boolean {
  const t = (body ?? "").trim().toLowerCase();
  if (!t) return false;
  for (const w of ACCEPT_WORDS) {
    if (t === w) return true;
    if (t.startsWith(w)) {
      const nextChar = t.charAt(w.length);
      if (nextChar === "" || /[\s.!?,]/.test(nextChar)) return true;
    }
  }
  return false;
}

/**
 * Centralised external-link / native-intent helpers.
 *
 * Abstracts URL opening so the same call sites work in the web build today and
 * in a future Capacitor (native iOS) build without further changes.
 */

export function openUrl(
  url: string,
  target: "_blank" | "_system" = "_blank",
): void {
  // In future Capacitor build this will use:
  // import { Browser } from '@capacitor/browser';
  // Browser.open({ url });
  // For now use window.open
  if (!url) return;
  window.open(url, target, "noopener,noreferrer");
}

export function openSms(phone: string, body?: string): void {
  const encoded = body ? `?&body=${encodeURIComponent(body)}` : "";
  window.location.href = `sms:${phone}${encoded}`;
}

export function openTel(phone: string): void {
  window.location.href = `tel:${phone}`;
}

export function openMail(email: string): void {
  window.location.href = `mailto:${email}`;
}

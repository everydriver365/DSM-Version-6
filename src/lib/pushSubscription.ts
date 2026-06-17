// Web Push subscription helpers.
// Requires VAPID keys: generate with `npx web-push generate-vapid-keys`,
// paste the public key below, and add both VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY
// to Lovable Cloud secrets so the send-push edge function can sign messages.

import { supabase } from "./supabaseClient";

export const VAPID_PUBLIC_KEY = "BCPt7KU8Me_IlOTU1OlId15UTBFlWgTiZbW-IfQmA0M1NH0__IOfyhekALKRRPFSSCrKDPQ2y0qXK7wwftTBKWE";

const SW_PATH = "/sw.js";

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const buffer = new ArrayBuffer(raw.length);
  const output = new Uint8Array(buffer);
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i);
  return output;
}

export function pushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

async function getRegistration(): Promise<ServiceWorkerRegistration> {
  const existing = await navigator.serviceWorker.getRegistration(SW_PATH);
  if (existing) return existing;
  return navigator.serviceWorker.register(SW_PATH);
}

export async function getCurrentPushStatus(): Promise<"enabled" | "disabled" | "unsupported"> {
  if (!pushSupported()) return "unsupported";
  try {
    const reg = await navigator.serviceWorker.getRegistration(SW_PATH);
    if (!reg) return "disabled";
    const sub = await reg.pushManager.getSubscription();
    return sub ? "enabled" : "disabled";
  } catch {
    return "disabled";
  }
}

export async function subscribeToPush(): Promise<{ ok: boolean; error?: string }> {
  if (!pushSupported()) return { ok: false, error: "Push notifications are not supported in this browser." };
  if (!VAPID_PUBLIC_KEY) {
    return { ok: false, error: "VAPID public key is not configured." };
  }

  const perm = await Notification.requestPermission();
  if (perm !== "granted") return { ok: false, error: "Notification permission was not granted." };

  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData.user) return { ok: false, error: "Not signed in." };

  try {
    const reg = await getRegistration();
    await navigator.serviceWorker.ready;

    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
    }

    const json = sub.toJSON();
    const { error } = await supabase
      .from("push_subscriptions")
      .upsert(
        { instructor_id: userData.user.id, subscription: json },
        { onConflict: "instructor_id,endpoint" },
      );
    if (error) return { ok: false, error: error.message };

    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Subscription failed." };
  }
}

export async function unsubscribeFromPush(): Promise<{ ok: boolean; error?: string }> {
  if (!pushSupported()) return { ok: true };
  try {
    const reg = await navigator.serviceWorker.getRegistration(SW_PATH);
    const sub = await reg?.pushManager.getSubscription();
    const endpoint = sub?.endpoint;
    if (sub) await sub.unsubscribe();

    const { data: userData } = await supabase.auth.getUser();
    if (userData.user && endpoint) {
      const { error } = await supabase
        .from("push_subscriptions")
        .delete()
        .eq("instructor_id", userData.user.id)
        .eq("endpoint", endpoint);
      if (error) return { ok: false, error: error.message };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Unsubscribe failed." };
  }
}

import { getPlatform } from "./platform";

/**
 * Push notification abstraction.
 *
 * Works with Despia's native bridge today and is ready for Capacitor later
 * without changing any call sites.
 */

export interface PushToken {
  token: string;
  platform: "web" | "ios" | "android";
}

// Register for push notifications
// Returns token or null if not supported
export async function registerPush(): Promise<PushToken | null> {
  const platform = getPlatform();

  if (platform === "capacitor") {
    // TODO: Capacitor push registration
    // import { PushNotifications } from '@capacitor/push-notifications';
    // const result = await PushNotifications.requestPermissions();
    // await PushNotifications.register();
    // Token returned via listener
    console.log("[push] Capacitor push — not yet implemented");
    return null;
  }

  if (platform === "despia") {
    // Despia handles push via its own native bridge — no action needed here
    console.log("[push] Despia push — handled by native bridge");
    return null;
  }

  // Web push via OneSignal (existing)
  // OneSignal is already initialised elsewhere — just return null here
  return null;
}

// Request push permission
export async function requestPushPermission(): Promise<boolean> {
  const platform = getPlatform();

  if (platform === "capacitor") {
    // TODO: Capacitor permission request
    return false;
  }

  if (typeof window !== "undefined" && "Notification" in window) {
    const result = await Notification.requestPermission();
    return result === "granted";
  }

  return false;
}

// Send a local notification (future use)
export async function scheduleLocalNotification(
  title: string,
  body: string,
  delay?: number,
): Promise<void> {
  const platform = getPlatform();

  if (platform === "capacitor") {
    // TODO: Capacitor local notifications
    // import { LocalNotifications } from '@capacitor/local-notifications';
    return;
  }

  // Web — not supported
  console.log("[push] local notifications not supported on web", { title, body, delay });
}

import { Haptics, ImpactStyle, NotificationType } from "@capacitor/haptics";

// Light tap — for most button presses
export async function tapLight() {
  try {
    await Haptics.impact({ style: ImpactStyle.Light });
  } catch {}
}

// Medium tap — for important actions
export async function tapMedium() {
  try {
    await Haptics.impact({ style: ImpactStyle.Medium });
  } catch {}
}

// Heavy tap — for destructive actions
export async function tapHeavy() {
  try {
    await Haptics.impact({ style: ImpactStyle.Heavy });
  } catch {}
}

// Success — for completed actions
export async function hapticSuccess() {
  try {
    await Haptics.notification({ type: NotificationType.Success });
  } catch {}
}

// Warning — for alerts
export async function hapticWarning() {
  try {
    await Haptics.notification({ type: NotificationType.Warning });
  } catch {}
}

// Error — for failures
export async function hapticError() {
  try {
    await Haptics.notification({ type: NotificationType.Error });
  } catch {}
}

// Legacy dispatcher kept for existing callers (CommandPalette, Button, etc.)
export function haptic(kind: "selection" | "tap" | "success" | "warning" | "error") {
  switch (kind) {
    case "selection":
      tapLight();
      break;
    case "tap":
      tapLight();
      break;
    case "success":
      hapticSuccess();
      break;
    case "warning":
      hapticWarning();
      break;
    case "error":
      hapticError();
      break;
  }
}

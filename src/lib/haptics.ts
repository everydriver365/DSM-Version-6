import { Haptics, ImpactStyle, NotificationType } from "@capacitor/haptics";

export async function tapLight() {
  try {
    await Haptics.impact({ style: ImpactStyle.Light });
  } catch {}
}

export async function tapMedium() {
  try {
    await Haptics.impact({ style: ImpactStyle.Medium });
  } catch {}
}

export async function tapHeavy() {
  try {
    await Haptics.impact({ style: ImpactStyle.Heavy });
  } catch {}
}

export async function hapticSuccess() {
  try {
    await Haptics.notification({ type: NotificationType.Success });
  } catch {}
}

export async function hapticWarning() {
  try {
    await Haptics.notification({ type: NotificationType.Warning });
  } catch {}
}

export async function hapticError() {
  try {
    await Haptics.notification({ type: NotificationType.Error });
  } catch {}
}

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

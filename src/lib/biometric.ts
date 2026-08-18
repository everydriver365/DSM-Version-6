/**
 * Face ID / Touch ID helpers.
 *
 * Uses the maintained Capacitor biometric plugin. On the plain web build the
 * plugin has no native implementation, so every call throws and we fall back
 * to "not available" — the app keeps working exactly as before.
 */
import { BiometricAuth } from "@aparajita/capacitor-biometric-auth";

export async function isBiometricAvailable(): Promise<boolean> {
  try {
    const result = await BiometricAuth.checkBiometry();
    return result.isAvailable;
  } catch {
    return false;
  }
}

export async function authenticate(
  reason: string = "Verify your identity to access DSM",
): Promise<boolean> {
  try {
    await BiometricAuth.authenticate({
      reason,
      cancelTitle: "Cancel",
      allowDeviceCredential: true,
      iosFallbackTitle: "Use passcode",
    });
    return true;
  } catch {
    return false;
  }
}

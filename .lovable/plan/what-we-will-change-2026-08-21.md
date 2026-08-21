Replace the offline banner in `src/routes/__root.tsx` with toast-only notifications.

## What we will change

- In `src/routes/__root.tsx`:
  - Remove the `isOnline` and `bannerDismissed` React state hooks.
  - Remove the existing `useEffect` that listens to `online`/`offline` events and updates `isOnline`.
  - Remove the offline banner JSX block (the fixed yellow banner with WiFi icon and X button).
  - Add `import { toast } from "sonner";`.
  - Add a new `useEffect` that uses `toast.error('No internet connection', { duration: Infinity, id: 'offline-toast', icon: '📡' })` on `offline` and `toast.dismiss('offline-toast')` plus `toast.success('Back online', { duration: 2000, id: 'online-toast', icon: '✅' })` on `online`.
  - Remove `IconWifiOff` from the Tabler import line since it is no longer used. `IconX` stays because it is used elsewhere.

## Result

No persistent banner or layout shift. When the device goes offline, a persistent sonner toast appears. When it comes back online, the toast is dismissed and a brief "Back online" success toast is shown. Nothing is shown when the app is online.

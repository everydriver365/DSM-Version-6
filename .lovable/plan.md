# Plan: QR-code tile on the home FAB

Add a dedicated "QR payment" tile to the existing Quick-add bottom-sheet menu. Tapping it opens the existing payment sheet with the QR-code method already selected.

## What will change

1. **`src/components/payments/UnifiedPaymentSheet.tsx`**
   - Add optional `initialMethod?: PayMethod` to `UnifiedPaymentSheetProps`.
   - In the "reset on open" effect, set `method` to `initialMethod ?? "cash"` instead of always `"cash"`.

2. **`src/routes/home.tsx`**
   - Add `"qr_payment"` to the `QuickAddKey` union.
   - Add a new item to `QUICK_ADD_ITEMS` (Business group): label "QR payment", icon `IconQrcode`, background `#0B2341`.
   - Add state `unifiedPayInitialMethod` (default `null`).
   - Update `runQuickAdd`:
     - `case "qr_payment"`: set `unifiedPayInitialMethod("qr")`, then open `UnifiedPaymentSheet`.
     - `case "payment"`: continue opening `UnifiedPaymentSheet` with `initialMethod` reset to `"cash"`.
   - Pass `initialMethod={unifiedPayInitialMethod ?? undefined}` to the existing `<UnifiedPaymentSheet />` mount.

## Out of scope

- No changes to the QR generation logic, Square intents, or payment recording.
- No changes to the mini-player, header, or other routes.
- No changes to `capacitor.config.ts`.

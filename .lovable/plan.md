# Replace clipped Payments ellipsis menu with a portal-based QuickActionsMenu

## Problem

The inline popover menu in `src/routes/payments.tsx` is visually clipped by the parent card's `overflow: hidden` despite `z-index` adjustments. It is implemented with `position: relative` on the wrapper and `position: absolute` on the menu, which is trapped by the card's clipping.

## Solution

Create a new reusable, portal-based quick-actions menu component and replace the inline popover in the Payments list with it.

## Changes

### 1. Create `src/components/dsm/QuickActionsMenu.tsx`

A new component that renders its menu into `document.body` via `createPortal` so it is not clipped by ancestor overflow. It accepts:

- `trigger` — a render prop that receives an `onClick` prop and returns the button element.
- `items` — an array of `QuickAction` objects with `label`, `onClick`, and optional `destructive` flag.

The menu is positioned relative to the trigger's bounding rectangle using fixed viewport coordinates (`top: rect.bottom + 4`, `right: window.innerWidth - rect.right`). It includes a full-screen overlay to close the menu on outside click and supports destructive styling for danger items.

### 2. Update `src/routes/payments.tsx`

Replace the inline popover block (lines 548-597) with `QuickActionsMenu`, using the same trigger button, the same menu items (`Edit`, `Refund`, `Delete`), and the same action handlers. The `Delete` action remains async with the same confirmation and `deletePaymentRecord` call.

Remove the now-unused `menuId` / `setMenuId` state because the component only uses `useState` for this menu. No other UI in the file references it.

Do not modify `deletePaymentRecord`, the row's other click handlers, or any other section of the file.

## Scope

Only `src/components/dsm/QuickActionsMenu.tsx` (new) and `src/routes/payments.tsx`.

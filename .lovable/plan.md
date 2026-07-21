Plan: Make the Gap Filler message action discoverable and clearly labeled.

Background: The current `/gaps` action bar shows a button labeled "Message" (or "Message {n} selected →") after pupils are selected. There is also a "Send to {n} pupils" button inside the compose sheet. The user reports no visible "Send message" button on the main screen, suggesting the action-bar label is not obvious enough.

Scope: Only `src/routes/gaps.tsx`.

Changes:
1. In the fixed bottom action bar, replace the "Message" / "Message {n} selected →" label with a primary button labeled **"Send message"**.
2. Add a `Send` icon from `lucide-react` to the button to make the action visually clear.
3. For the single-slot + single-pupil case, keep "Book now" as the primary blue button and make the secondary "Send message" button white-outlined, matching the existing two-button layout.
4. For multi-pupil / multi-slot cases, use a single "Send message" button.
5. Do not change the compose sheet content, recipient expansion, or the backdrop behavior.

No other files touched.

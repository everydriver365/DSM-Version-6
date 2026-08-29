# ED Settings fixes

## What we’re fixing
1. **Voice preview uses the wrong voice** — the Preview buttons currently call the generic `speak()` helper, so they play the default/selected voice instead of the voice row being previewed.
2. **Grey status-bar strip above the navy header** — the safe-area padding at the top of the ED Settings page shows the page background colour (`#F4F6F8`) instead of the navy header colour (`#0B2341`).

Both fixes are scoped to `src/routes/ed-settings.tsx`.

## Changes

### 1. Load voices locally and add a per-row preview function
- Add a local `voices` state with a `useEffect` that loads `window.speechSynthesis.getVoices()` (filtered to `en-*`) and listens to `onvoiceschanged`.
- Use this local `voices` array to render the UK/US voice lists, so rows appear reliably even if the hook’s `availableVoices` loads late.
- Add a `previewVoice(voice: SpeechSynthesisVoice)` function that cancels any current speech, creates a `SpeechSynthesisUtterance` with:
  - text: `"Hi, I'm ED. How can I help?"`
  - `utt.voice = voice`
  - `pitch = 1.0`, `rate = 0.92`, `volume = 1.0`
- Update both UK and US Preview button `onClick` handlers to call `previewVoice(voice)` (the row’s specific `SpeechSynthesisVoice` object).

### 2. Fix the grey top strip
- Restructure the header so the navy background fills the safe-area inset.
- Option: wrap the header content in an inner container with the original padding, and set the outer header wrapper to `background: #0B2341` with `paddingTop: env(safe-area-inset-top, 0px)` (or move the safe-area padding onto a full-width navy pseudo-element/shell).
- Result: the very top of the screen is navy, not grey.

## Out of scope
- No changes to `useVoiceAssistant.ts` logic or voice commands.
- No changes to `capacitor.config.ts`.
- No other pages or components.

## Goal
Ship the existing Lovable web app (already published) as a native mobile app via Despia, using the user’s existing Despia account.

## Current state
- Lovable app is already published at: `https://everydriver-dash.lovable.app`
- No native Lovable → Despia integration exists; Despia consumes a web URL and wraps it.

## Step-by-step plan

1. **Verify the published app is live and suitable for wrapping**
   - Confirm `https://everydriver-dash.lovable.app` loads and works on mobile.
   - Check that the app is responsive and bottom navigation works in a mobile viewport.

2. **Log in to Despia and create a new app project**
   - Go to `https://v3.despia.com/` (from the Despia homepage CTA).
   - Create a new project/app.

3. **Point Despia to the Lovable published URL**
   - In Despia’s project setup, enter the web source URL:
     `https://everydriver-dash.lovable.app`
   - This is the “connection” — Despia will render the Lovable app inside its native shell.

4. **Configure the native app shell in Despia**
   - App name, icon, splash screen, theme color.
   - Enable/disable native features as needed (push notifications, deep links, biometric auth, etc.).
   - Note: The Lovable app currently uses Supabase/Lovable Cloud; any native features (push, background location) may require additional Supabase/capacitor wiring outside the web app.

5. **Test the wrapped app in Despia’s preview/builder**
   - Use the provided preview to ensure navigation, auth, and core flows work inside the native shell.

6. **Build and publish to App Store / Play Store via Despia**
   - Follow Despia’s one-click deployment for iOS/Android binaries.
   - Handle store compliance requirements (privacy policy, screenshots, app store metadata) in Despia/Apple/Google consoles.

## Out of scope (unless explicitly requested)
- No code changes inside the Lovable app are required for the basic web-to-native wrapper.
- If the user wants deeper native integrations (push notifications, in-app purchases, native login), that would be a separate follow-up plan.

## Verification
- Lovable app loads at its published URL.
- Despia project successfully loads the same URL in preview and builds without errors.
- Native app binary is generated for iOS and/or Android.
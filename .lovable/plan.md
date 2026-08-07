# Apple CarPlay Enablement Plan

## Goal

Make the DSM web app capable of powering a native iOS Apple CarPlay experience for driving instructors while they are driving between lessons.

## Important context: Apple CarPlay is a native iOS surface

Apple CarPlay cannot be built as a web/PWA page. It requires a native iOS app written in Swift/SwiftUI that is granted an Apple CarPlay entitlement. The Lovable web app will act as the **backend and data source** for the iOS app; the native iOS app will render the CarPlay UI and call the web app's server functions.

This plan therefore covers the **web-side APIs, data, and hooks** the iOS app needs, plus the native iOS work required.

## Supported CarPlay categories for this product

Given the user's choices, the app fits these Apple CarPlay categories:

- **Navigation**: route guidance to the next pupil, ETA, traffic-aware arrival.
- **Dashboard widget** (iOS 17+): today's next lesson, free slot count, payment alerts.
- **Communication**: hands-free voice messages / calls to pupils via Siri.
- **Audio**: Bitesize / Learn audio content as a driving podcast.

## Phase 1 — Build the CarPlay data layer

### 1.1 CarPlay session context

Create a server function that returns the instructor's current "CarPlay dashboard" state:

- Next lesson today (pupil name, address, postcode, phone, lesson start time, cost, payment status, vehicle type).
- Route polyline or destination coordinates for the next lesson.
- ETA and distance to next lesson.
- Today's remaining lesson count and free-slot count.
- Unread message count and urgent notifications.
- Pending payments / overdue pupils.

Files to add / change:

- `src/lib/carplay.functions.ts` — new server functions: `getDashboard`, `getNextLesson`, `getTodaySummary`, `getUnreadSummary`.
- `src/routes/api/public/carplay/v1/*` — stable public REST endpoints for the iOS app (JSON, versioned).

### 1.2 Navigation-ready directions endpoint

Add a server function that returns turn-by-turn route data from the current GPS location to the next lesson address:

- Input: current lat/lng.
- Output: route summary, polyline, distance, duration, steps, destination name, parking hint.
- Use Google Maps Routes API via the existing connector gateway.
- Cache the route against the lesson for a few minutes to avoid repeated API calls.

Files to add / change:

- `src/lib/carplay-directions.functions.ts`.
- `src/routes/api/public/carplay/v1/directions.ts`.

### 1.3 Lesson state for CarPlay

Ensure the iOS app can read and update the current lesson state:

- `GET /carplay/v1/lesson/current` — ongoing lesson, pupil, route, end-of-lesson timer.
- `POST /carplay/v1/lesson/start` — start tracking from CarPlay (uses existing live tracking logic).
- `POST /carplay/v1/lesson/end` — trigger end-of-lesson wizard from CarPlay (uses existing `EndLessonWizard` logic).
- `POST /carplay/v1/lesson/cancel` — cancel next lesson with a preset reason.

Files to add / change:

- `src/routes/api/public/carplay/v1/lesson.ts`.
- Reuse existing server functions from `src/routes/live.tsx` and `src/components/dsm/EndLessonWizard.tsx`.

## Phase 2 — Add communication features for CarPlay

### 2.1 Voice-message / call integration

CarPlay communication requires the native iOS app to use Siri and the CallKit/CommunicationKit APIs. The web side needs:

- `POST /carplay/v1/message/send` — send a pre-canned or transcribed voice message to a pupil.
- `GET /carplay/v1/message/templates` — quick-reply templates: "Running 5 minutes late", "Arrived", "See you soon", etc.
- `GET /carplay/v1/pupil/{id}/phone` — return the pupil's phone number and name for a CallKit call.

Files to add / change:

- `src/lib/carplay-messaging.functions.ts`.
- `src/routes/api/public/carplay/v1/messaging.ts`.

### 2.2 Mark messages read from CarPlay

Allow the iOS app to mark messages as read so the inbox badge stays in sync.

- `POST /carplay/v1/message/read` — mark conversation as read.

## Phase 3 — Add audio content for CarPlay

### 3.1 Audio-only feed

CarPlay audio apps need an MP3/feed. The current Bitesize / Learn videos are video-first. We need:

- Extract audio tracks or add audio-only content types.
- A server function that returns a CarPlay-compatible audio list: title, duration, audio URL, category.
- Playback progress tracking back to the web app.

Files to add / change:

- `src/routes/api/public/carplay/v1/audio.ts`.
- Add `audio_url` or `audio_track` support to the Bitesize/Learn content tables.

## Phase 4 — Real-time notifications for CarPlay

### 4.1 Push notification support

CarPlay needs to surface notifications while driving. The web app must send push notifications to the iOS app for:

- New pupil messages.
- Lesson cancellations.
- New bookings.
- Payment received.
- Upcoming lesson reminder (15 minutes before).

Files to add / change:

- `src/routes/api/public/push/apns.ts` — Apple Push Notification service endpoint (called by server functions).
- Store device tokens in a new `instructor_devices` table.

### 4.2 OneSignal or APNS integration

You already have a OneSignal device-registration call in `__root.tsx`. This can be extended to store the device token per instructor and use it for CarPlay notifications.

## Phase 5 — Native iOS CarPlay app

### 5.1 iOS project

- Create a new Xcode project with SwiftUI.
- Add the CarPlay capability entitlements (requires Apple approval).
- Implement `CPTemplateApplicationSceneDelegate` for CarPlay lifecycle.

### 5.2 CarPlay templates

- **Navigation**: use `CPNavigationSession` or `CPMapTemplate` with turn-by-turn directions from the directions endpoint.
- **Dashboard**: use `CPDashboardController` with a widget for next lesson.
- **Communication**: use `CPCommunicationsTemplate` or `CPMessageListItem` for messages/calls.
- **Audio**: use `CPAudioTemplate` or `CPNowPlayingTemplate` for Bitesize audio.

### 5.3 iOS → web bridge

- Authenticate the instructor with the existing Supabase auth flow.
- Call the `/carplay/v1/*` endpoints with the user's JWT.
- Forward Siri intents for voice messages.

## Phase 6 — Security and safety

### 6.1 CarPlay-specific safety

- CarPlay UI must be read-only while driving; avoid complex inputs.
- Limit actions to pre-canned messages, voice calls, and one-tap navigation.
- Disable lesson editing or payment entry from CarPlay.

### 6.2 API security

- Public `/api/public/carplay/v1/*` endpoints must validate the JWT.
- Rate-limit directions calls.
- Only return data for the authenticated instructor.

## Quick-start recommendation

If you want the fastest path to a working CarPlay demo, start with **Phase 1.1 (dashboard)** + **Phase 1.2 (directions)** + **Phase 5.2 (dashboard widget)**. This gives you a CarPlay widget showing the next lesson and one-tap navigation, which is the highest-value feature for an instructor driving between pupils.

## Files likely to be touched

- New: `src/lib/carplay*.functions.ts`, `src/routes/api/public/carplay/v1/*`, database migrations for device tokens and audio tracks.
- Existing: `src/routes/home.tsx`, `src/routes/live.tsx`, `src/routes/schedule.tsx`, `src/components/dsm/EndLessonWizard.tsx`, `src/lib/payments.ts`, `src/lib/messages.ts` (or equivalent), `src/routes/__root.tsx` for device registration.

## Native iOS work required

The web-side work alone is not enough. You will need to build a separate native iOS app with:

- Xcode project with CarPlay entitlements.
- SwiftUI views for each CarPlay template.
- Authentication bridge to Supabase.
- APNS push notification handling.
- Siri intents for voice messaging.

This native iOS app is out of scope for the Lovable web editor but is the only way to actually render on Apple CarPlay.

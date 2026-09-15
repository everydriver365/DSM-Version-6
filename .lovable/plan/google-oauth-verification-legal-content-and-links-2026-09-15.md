# Google OAuth verification: legal content and links

## Scope
Update only the existing legal-page wording and the minimum routing condition needed to keep those pages public. Do not alter OAuth, Google Calendar, authentication, Supabase, database, backend, bookings, payments, or other application behaviour.

## Confirmed current state
- `/privacy` and `/terms` already exist and are linked from the sign-in and Settings pages.
- `/cookies` does not exist; cookie information is currently a section within `/privacy`, so no new page will be created.
- The published URLs return HTTP 200 directly, but the shared desktop-width redirect subsequently sends a signed-out desktop visitor away from `/privacy` and `/terms`. This reproduces Google's access issue.
- The app requests Google Calendar event access and reads selected calendar metadata plus event titles, descriptions, locations, dates/times, all-day status, identifiers, update state, and colours. It also creates, updates, and deletes EveryDriver lesson events in Google Calendar.
- Imported Google events and connection/synchronisation information are stored in the existing Supabase-backed service. Disconnecting currently clears the stored access and refresh tokens, but does not itself remove all previously imported calendar rows or every synchronisation identifier. The policy must state this accurately.

## Changes
1. **Expand the existing Privacy Policy wording**
   - Keep `/privacy`, its branding, layout, fonts, colours, header, footer, contact details, and general styling.
   - Add clearly labelled sections covering:
     - Google User Data
     - How We Use Google User Data
     - Sharing of Google User Data
     - Protection of Google User Data
     - Retention of Google User Data
     - Deletion of Google User Data
   - State precisely that the integration can access selected calendar metadata and event details needed for synchronisation, scheduling, availability, and conflict checking; and can create, update, or remove EveryDriver lesson events in the connected calendar.
   - State that Google data is not sold, supplied to advertising networks or data brokers, used for unrelated purposes, or used to develop, improve, or train generalised AI/ML models.
   - Name only confirmed recipients: Google for the authorised Calendar service and Supabase as the existing hosting/data-processing provider; also include legally required disclosures and service/user protection.
   - Describe confirmed safeguards conservatively: HTTPS/TLS in transit, authenticated access, application access controls, restricted operational access, and appropriate technical and organisational measures. Do not claim certifications or unsupported encryption.
   - Describe retention honestly: data is kept while needed for calendar functionality and service records; cancelled/deleted Google events are removed during synchronisation; no unsupported fixed deletion period will be claimed.
   - Describe deletion honestly: disconnecting removes stored Google access and refresh tokens, while previously synchronised event information may remain until removed through normal synchronisation, account handling, or a support request. Account deletion is currently scheduled in Settings, so the policy will not claim immediate automatic erasure.
   - Include Google's required Limited Use disclosure verbatim in substance: EveryDriver Pro's use and transfer of information received from Google APIs complies with the Google API Services User Data Policy, including Limited Use requirements.
   - Update the displayed “Last updated” date to September 2026.

2. **Review Terms and cookie wording for consistency**
   - Keep `/terms` structurally and visually unchanged.
   - Make only any small wording adjustment needed to align its account-deletion statement with the actual “scheduled for deletion” behaviour and the expanded Privacy Policy.
   - Keep cookie information within `/privacy`; do not invent a `/cookies` page because none currently exists.

3. **Correct public access with one narrow exception**
   - Adjust only the existing desktop-domain redirect condition so `/privacy` and `/terms` remain on `app.everydriver.pro` for desktop visitors, including signed-out Google reviewers.
   - Leave the redirect unchanged for every other application page.
   - Do not add or remove any authentication guard.

4. **Verify links and public access**
   - Confirm existing Privacy Policy links on sign-in and Settings still resolve to `/privacy`; confirm Terms links resolve to `/terms`.
   - Test the published-style app while signed out at desktop and mobile widths, verifying `/privacy` and `/terms` render without login or cross-domain redirection.
   - Confirm all five Google review questions are explicitly answered in the rendered Privacy Policy.
   - Run the existing type check and relevant tests, then report only the requested legal-page/link/access confirmations and disclose the narrow desktop redirect exception.

## Files expected to change
- `src/routes/privacy.tsx` — legal wording only.
- `src/routes/terms.tsx` — only if a small consistency correction is required.
- `src/routes/__root.tsx` — only the narrow `/privacy` and `/terms` exemption from the existing desktop redirect.

No cookie route, new legal system, new deletion system, or integration change will be added.

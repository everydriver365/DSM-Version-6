## DSM Live — Mobile home redesign

Scope: only the `DsmLiveSection` in `src/routes/home.tsx` (~lines 1277–1600). No changes to the standalone `/dsm-live` page, no other routes, no data model changes.

### Direction (Editorial Premium, v3, adapted for mobile)

- Poppins typography.
- Palette locked to Navy `#0B1F3A`, Blue `#1877D6`, White `#FFFFFF`, Page bg `#DCE4F0`. Red `#E24B4A` reserved for the "Live" pulse only.
- Premium editorial feel: soft shadows, 30px card radius, generous whitespace, quiet motion.

### Layout (mobile, single column stack)

The desktop prototype had an 8/4 split. On mobile that collapses to a stack — no two-column grid. Order:

1. **Section header** — small navy rounded-square icon tile (video icon), tiny red pulsing dot + "LIVE NOW" uppercase micro-label above, `DSM Live` heading (20px, 700). Right side: "View all" text link with chevron.
2. **Featured session card** (first upcoming or currently-live session) — 30px radius white card, hero image top (16:9), body with two small category chips, title (17px/600), 2-line description, host row (avatar + name + role) on the left, navy "Join now" pill button on the right.
3. **Secondary session card** (next upcoming, if any) — compact white card, 30px radius, no hero. Red `LIVE` chip left / "Starts in Xm" right, title (15px/700), host avatar + name row.
4. **DSM Community promo card** — navy `#0B1F3A` background, 30px radius, soft blue blur accent top-right, white users icon in translucent square, "DSM Community" heading, one-line description, blue "Join the conversation →" link.

If no upcoming sessions and no podcast, the section still returns `null` (existing behavior).

### Detailed changes to `DsmLiveSection` in `src/routes/home.tsx`

- Replace the existing header block with the new icon-tile + micro-label + heading, keeping the existing `navigate({ to: "/dsm-live" })` handler on the "View all" link.
- Replace the current two-column grid (`gridTemplateColumns: "1fr 1fr"`) with a vertical `flex column` at `gap: 12px`, `margin: 0 16px`.
- Build a `FeaturedSessionCard` sub-render for `sortedSessions[0]` using its `image_url`, `category`, `title`, host_name, and date/time. Keep the existing `open(id)` click handler.
- Build a `SecondarySessionCard` sub-render for `sortedSessions[1]` when present. Show a live pulse if `is_live`, otherwise show relative start (`fmtDateTime`).
- Keep the podcast fallback logic (`latestPodcast`) but restyle it as the Community promo variant (dark navy card) only when there is a podcast to link to; otherwise omit. Podcast tap continues to navigate to `/dsm-live/podcast/$podcastId`.
- All copy, data fetches, category mapping (`sessionType`, `typeColor`, `typeIcon`), and empty-state logic stay unchanged.

### Visual tokens

- Card radius: 30px (featured, community); 20px (secondary compact).
- Shadow: `0 15px 40px -20px rgba(11,31,58,0.12)` for featured/community; `0 1px 3px rgba(0,0,0,0.06)` for secondary.
- Body text color `#6B7A90`, title color `#0B1F3A`, muted `#B0BAC9`.
- Live pulse: 6px red dot with CSS `@keyframes` ping (define in the section's `<style>` block if not already present).

### Out of scope

- Desktop layout for `/home` (mobile-only per user).
- The `/dsm-live` page.
- Any changes to session/podcast Supabase queries or schemas.

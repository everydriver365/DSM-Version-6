# Extend DSM Learn: TED, Wellbeing, Mind, Health + test-based recommendations

## What already exists (verified)

- `src/routes/learn.tsx` is a single scrolling page: a "How to" video grid backed by the `learn_videos` table, plus two hardcoded nav tile groups. No tabs, no categories, no saved items, no featured logic.
- Podcasts live in `src/routes/live-news.tsx` with a hand-curated show registry in `src/lib/podcasts.ts` (categories, `featured`, `recommended` flags), RSS parsing in `src/lib/podcasts.functions.ts`, and localStorage progress in `src/lib/podcastProgress.ts`. These instructor podcasts stay exactly as they are.
- `bitesize_videos` (CPD videos) and `learn_videos` are the existing content tables; `admin.featured.tsx` is about featured *marketplace instructors*, not learning content — it is not a content featuring system.
- Test faults are recorded in `driving_test_results.faults_detail` (real tests, DL25 grid) and `mock_test_results.fault_marks` (mocks). The DL25 category list (junctions, use_of_speed, mirrors, positioning, etc.) is already defined in `src/routes/driving-test.$pupilId.tsx`.

**One correction to the brief:** there is no Pre-Lesson Revision system in the codebase — no revision, quiz, activity-assignment or pupil-learning tables or screens exist anywhere. So step 8 cannot "connect to" something that isn't there. This plan builds the first half of that flow (test result → weak areas → recommended learning, visible to the instructor) and leaves a clean hook for a pupil-facing revision module later, rather than inventing a second pupil learning system now.

## What gets built

### 1. Curated content library (code, no database)

New `src/lib/learnLibrary.ts` holding one typed list of learning items:

- Fields: id, kind (`ted` / `video` / `article` / `podcast` / `activity`), title, source, url or TED embed id, duration in minutes, category, tags, `featured`, `topics` (DL25 fault ids it helps with), short blurb.
- Categories seeded: **TED Talks**, **Wellbeing**, **Mind**, **Health**, **5 Minutes For Me**.
- TED entries link to official ted.com talks and play through the official `embed.ted.com` iframe in-app; nothing is downloaded or re-hosted.
- Wellbeing / Mind / Health entries point at reputable official sources (e.g. NHS Every Mind Matters, Sleep Foundation, official podcast pages) via links and official embeds only.
- "5 Minutes For Me" entries are short (≤5 min) breathing, reset, wind-down and confidence activities — a mix of official external audio/video links and DSM-written copy.
- Health items carry a standing "general wellbeing, not medical advice" note so DSM is never presented as a medical service.

### 2. DSM Learn home restructured (not rebuilt)

`src/routes/learn.tsx` keeps its existing sections and `learn_videos` grid, and gains above them:

- **Your Next 10 Minutes** — a personalised row at the top: short items picked from the curated library plus existing podcast episodes, filtered to what fits in ~10 minutes, seeded by the instructor's saved items and recent views, excluding anything already completed. This is the only recommendation surface on the Learn home; no second system.
- **Featured** — a horizontal row of items flagged `featured` in the library, mixing TED, Wellbeing, Mind, Health and existing videos.
- **Category chips** — All / TED Talks / Wellbeing / Mind / Health / 5 Minutes For Me / Saved, filtering the item list below. The existing "How to" videos and nav tiles remain under the All view.
- **Saved** — a bookmark button on every card; saved ids persist to localStorage (`dsm.learn.saved.v1`) in the same style as the existing podcast progress store.
- Playback reuses the existing `SwipeableDetailShell` and video player components; TED items render the official embed inside that shell, with an "Open on TED" link.

### 3. Test result → Recommended Learning

New `src/lib/learnRecommend.ts`:

- Maps each DL25 fault id to learning topics (junctions → observation/judgement content, use_of_speed → risk and speed content, mirrors → awareness content, and so on).
- Given a saved test result, reads the faults, ranks them by severity (dangerous → serious → driving fault) and returns matching library items plus relevant existing bitesize videos and podcast episodes.

Surfaced as a **Recommended Learning** block on `src/routes/driving-test.$pupilId.tsx` once a result is saved: one row per weak area with a red / amber / yellow severity dot, the fault name, and up to three tappable recommendations that deep-link into the Learn item. The same helper is reused for mock test results on `src/routes/mock-tests_.$pupilId.tsx`.

### 4. Hook for Pre-Lesson Revision

The recommendation helper returns a plain list of `{ pupilId, topic, items }`, so a future pupil-facing revision screen can consume it directly. No new pupil learning tables or assignment flow are created in this pass.

## Technical notes

- No database migrations, no new Supabase tables, no Lovable Cloud. Reads use the existing Supabase client and existing tables only.
- Saved items and "watched" state use localStorage, matching the existing podcast progress pattern.
- Existing instructor podcasts, the podcast registry, the mini player and `live-news.tsx` are untouched.
- Files added: `src/lib/learnLibrary.ts`, `src/lib/learnSaved.ts`, `src/lib/learnRecommend.ts`.
- Files edited: `src/routes/learn.tsx`, `src/routes/driving-test.$pupilId.tsx`, `src/routes/mock-tests_.$pupilId.tsx`.
- Admin-managed featuring of the new content is out of scope here — featuring is a flag in the curated file. Say the word and I'll add a table plus admin screen as a follow-up.

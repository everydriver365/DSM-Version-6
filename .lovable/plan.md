Update AI-related copy on the marketing homepage and privacy page

## Current AI bullet points

1. **Apps for Everyone** feature list includes: "AI coaching tips".
2. **Call Answering Service** bullet list includes: "24/7 call handling", "Instant SMS summary", "Calendar integration", "Affordable add-on".

## Planned changes

### 1. `src/routes/index.tsx` — Apps for Everyone
Change the rendering of the "AI coaching tips" bullet so that a small note appears directly below it:

```tsx
<span style={{ fontSize: 11, color: '#6B7686' }}>
  ✓ Does not use your Google account data
</span>
```

### 2. `src/routes/index.tsx` — Call Answering Service
Append a new note item at the end of that section's bullet list:

```tsx
<li style={{ fontSize: 11, color: '#6B7686' }}>
  Does not access Google account data
</li>
```

### 3. `src/routes/privacy.tsx` — New AI section
Add a new `Section` titled **"AI Features & Google Data"` with this body:

> "DSM by EveryDriver uses AI to power certain features including coaching tips and our optional call answering service. None of these AI features access, process, or use your Google account data in any way. Google Calendar data obtained via our Calendar Sync feature is used solely to create, read, update and delete driving lesson appointments in your Google Calendar. It is never shared with or used by any AI service."

Place the section after the existing Google Calendar integration section.

## Verification
- Read back the edited sections to confirm the notes and new privacy section are in place.
- Optionally open the preview to confirm the marketing page and privacy page render correctly.

## Files touched
- `src/routes/index.tsx`
- `src/routes/privacy.tsx`

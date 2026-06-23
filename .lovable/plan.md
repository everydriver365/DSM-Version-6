## Goal
Make the Step 3 (Pupil progress) 1–5 scores from the End-Lesson wizard appear on the pupil's Progress page and leave a clear trail in the lesson history note.

## What changes

### 1. Map wizard skills → syllabus item keys
The wizard uses generic labels ("Cockpit checks", "Roundabouts"). The Progress page reads specific syllabus keys (`safety_cockpit_drill`, `junc_roundabouts`, …). Add a single `SKILL_MAP` in `src/components/dsm/EndLessonWizard.tsx` that maps each wizard label to one or more syllabus keys:

| Wizard label | Syllabus key(s) |
|---|---|
| Cockpit checks | `safety_cockpit_drill` |
| Moving off | `move_off_level`, `move_off_hill`, `move_off_angle` |
| Steering | `safety_controls` |
| Clutch control | `safety_controls` |
| Gear changing | `safety_controls` |
| Braking | `stopping_normal` |
| Junctions | `junc_t_emerge`, `junc_t_approach`, `junc_crossroads`, `junc_traffic_lights` |
| Roundabouts | `junc_roundabouts`, `junc_mini_roundabouts` |
| Dual carriageways | `dual_joining`, `dual_leaving`, `dual_lane_discipline`, `dual_overtaking` |
| Hazard perception | `aware_observation`, `aware_anticipation` |
| Manoeuvres | `man_pull_up_right` |
| Emergency stop | `man_emergency_stop`, `em_stop_technique`, `em_stop_control` |
| Independent driving | `ind_sat_nav`, `ind_road_signs`, `ind_route_planning` |
| Bay parking | `man_bay_park_reverse`, `man_bay_park_forward` |
| Parallel parking | `man_parallel_park` |
| Motorway / Town driving / Theory | no syllabus match — store under `eol_<slug>` fallback so nothing is lost |

Rule: when a wizard skill maps to multiple syllabus items, the chosen 1–5 level is written to **all** of them, but only if the new level is **greater than or equal to** what's already on file (so a quick wizard tap can't downgrade a deliberate score set on the Progress page). For unmapped labels, keep the existing `eol_<slug>` write so it isn't silently discarded.

### 2. Append a "Skills updated" line to lesson history note
In `completeEol`, build a one-line summary of what was scored, e.g.:

```
Skills updated: Roundabouts (4), Bay parking (5), Steering (3)
```

Append it to `combinedNotes` before the `lesson_history.insert`, so the note saved against the lesson reads:

```
<lesson notes>

Progress: <progress comments>
Skills updated: Roundabouts (4), Bay parking (5)
```

### 3. Persistence details
- Replace the current single `upsert` block with: read existing rows for the mapped keys, compute `max(existing, new)` per key, then `upsert` the merged set with `onConflict: "pupil_id,item_key"`.
- Continue to write `instructor_id`, `updated_at`, `status` (one of the 5 level keys).
- No schema change — `pupil_progress` already supports this.

## Result
- Pupil's Progress page shows the scores immediately and the % independent stat reflects them.
- Lesson history row carries a human-readable "Skills updated: …" line.
- Existing Progress page entries are never downgraded by a wizard tap.
- "Motorway", "Town driving", "Theory" are still recorded under `eol_*` keys for future use without breaking the Progress page.
## Move the + button next to "Today's lessons" in the swipeable stats card

The + button you're seeing in the screenshot lives in `SwipeableStatsCard` (src/routes/home.tsx, around lines 610–770), not in the `TodayLessonsTile` I edited before. That's why nothing appeared to change.

### Change (single file: src/routes/home.tsx)

1. Remove the bottom action row (lines ~714–763) that currently renders the outlined `+` in the lower-left of the "Today" slide, plus its now-empty flex wrapper.
2. In the title block (line 684), wrap `Today's lessons` and a new inline `+` button in a flex row with `gap: 8` so the button sits immediately to the right of the title, only on the `today` slide (`s.key === "today"`).
3. Reuse the existing handler behavior: `stopPropagation`, reset `startX/deltaRef/draggingMouse`, then call `onAddLesson()`. Keep `onPointerDown` stopPropagation so the swipe container doesn't hijack the tap.
4. Style the inline button as a small filled square to match the "Teaching today" one already added: 22×22, `borderRadius: 6`, `background: #185FA5`, white `<Plus size={14} strokeWidth={2.5} />`, no border.

No other tiles, slides, or files change.

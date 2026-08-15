# Lucide → Tabler icon migration (Batch 1)

Swap the icon library used by the app's pages from Lucide to Tabler, one batch at a time. No layout, sizing, colour, or logic changes — only icon import names, component names, and the `strokeWidth` → `stroke` prop rename.

## Icons found in the first 10 files

| File | Lucide icons imported |
| --- | --- |
| `src/routes/__root.tsx` | CalendarPlus, ListTodo, Sparkles, Receipt, Calculator, FileSignature, Megaphone, HelpCircle, Settings as SettingsIcon |
| `src/routes/home.tsx` | CalendarOff, Receipt, BookOpen, HelpCircle, Calculator, Fuel, FolderOpen, FileSignature, ToggleLeft, Crown, UserCircle, PlayCircle, CheckCheck, FileSpreadsheet, ArrowLeftRight, Megaphone, Sparkles, FileCheck, Headphones, Infinity, Move, Video, ShieldAlert, Building2 as Building, Calendar as CalendarIcon, Settings as SettingsIcon |
| `src/routes/schedule.tsx` | Move, ArrowDown |
| `src/routes/pupils.$id.tsx` | BookOpen, History |
| `src/routes/payments.tsx` | Banknote, Landmark, Wallet, QrCode, Receipt |
| `src/routes/courses.index.tsx` | Plus, GraduationCap, ChevronRight, MapPin |
| `src/routes/marketplace.tsx` | BookOpen, Megaphone, Search as SearchIcon |
| `src/routes/messages.index.tsx` | none — no lucide import, nothing to do |
| `src/routes/enquiries.tsx` | none — no lucide import, nothing to do |
| `src/routes/courses.$id.tsx` | none — no lucide import, nothing to do |

Replacements follow the supplied mapping exactly (e.g. `Building2` → `IconBuilding`, `PlayCircle` → `IconPlayerPlay`, `Infinity` → `IconInfinity`, `ShieldAlert` → `IconShieldExclamation`, `Fuel` → `IconGasStation`, `Megaphone` → `IconSpeakerphone`, `FileSignature` → `IconSignature`, `Move` → `IconMove`, `History` → `IconHistory`, `Landmark` → `IconBuildingBank`, `GraduationCap` → `IconSchool`).

## How each file is changed

1. Delete the `lucide-react` import line; add the equivalent `@tabler/icons-react` import.
2. Rename every JSX usage to the Tabler component name. Aliased imports (`Settings as SettingsIcon`, `Calendar as CalendarIcon`, `Search as SearchIcon`, `Building2 as Building`) get their usages renamed to `IconSettings`, `IconCalendar`, `IconSearch`, `IconBuilding` — no aliases kept.
3. Where a Lucide icon carried `strokeWidth={n}`, rename the prop to `stroke={n}`. All other props (`size`, `color`, `className`, `style`) stay byte-identical.
4. Icons referenced as values in data arrays (e.g. quick-access tile configs in `home.tsx` and `__root.tsx`) get the same name swap; the array shape is untouched.

## Verification

After the batch, run a TypeScript check and grep the 10 files to confirm zero remaining `lucide-react` references before reporting back. Remaining ~99 route files and ~30 component/lib files stay untouched until you approve the next batch.

## Note

`strokeWidth` on non-Lucide components (Tabler icons already in these files, plain SVGs) is left alone — only props on the migrated icons change.

# Standardize marketing site fonts to Poppins

## Goal
Replace every Inter / Sora / Manrope / bare system-ui font declaration in the marketing files with the unified Poppins stack, and update the shared Google Fonts import in `__root.tsx` to remove Manrope (no longer used) while keeping Inter and Sora for the app routes.

## Files and exact changes

### 1. `src/components/marketing/MarketingNav.tsx`
- Line 90: `fontFamily: "'Inter', sans-serif"` → `fontFamily: "'Poppins', system-ui, -apple-system, sans-serif"`

### 2. `src/components/marketing/MarketingFooter.tsx`
- Line 6: `style={{ fontFamily: "'Inter', sans-serif" }}` → `style={{ fontFamily: "'Poppins', system-ui, -apple-system, sans-serif" }}`

### 3. `src/routes/_marketing.tsx`
- Line 11: `fontFamily: "Inter, sans-serif"` → `fontFamily: "'Poppins', system-ui, -apple-system, sans-serif"`

### 4. `src/routes/_marketing.features.tsx`
- Line 52: `fontFamily: "'Inter', sans-serif"` → `fontFamily: "'Poppins', system-ui, -apple-system, sans-serif"`
- Line 80: `style={{ fontFamily: "'Inter', sans-serif" }}` → `style={{ fontFamily: "'Poppins', system-ui, -apple-system, sans-serif" }}`
- Line 89: `<div style={{ fontFamily: "'Inter', sans-serif" }}>` → `<div style={{ fontFamily: "'Poppins', system-ui, -apple-system, sans-serif" }}>`
- Line 223: `style={{ fontFamily: "'Inter', sans-serif" }}` → `style={{ fontFamily: "'Poppins', system-ui, -apple-system, sans-serif" }}`
- Line 241: `style={{ fontFamily: "'Inter', sans-serif" }}` → `style={{ fontFamily: "'Poppins', system-ui, -apple-system, sans-serif" }}`

### 5. `src/routes/_marketing.about.tsx`
- Line 49: `style={{ fontFamily: "'Inter', sans-serif" }}` → `style={{ fontFamily: "'Poppins', system-ui, -apple-system, sans-serif" }}`
- Line 66: `style={{ fontFamily: "'Inter', sans-serif" }}` → `style={{ fontFamily: "'Poppins', system-ui, -apple-system, sans-serif" }}`
- Line 87: `style={{ fontFamily: "'Inter', sans-serif" }}` → `style={{ fontFamily: "'Poppins', system-ui, -apple-system, sans-serif" }}`
- Line 100: `style={{ fontFamily: "'Inter', sans-serif" }}` → `style={{ fontFamily: "'Poppins', system-ui, -apple-system, sans-serif" }}`
- Line 124: `style={{ fontFamily: "'Inter', sans-serif" }}` → `style={{ fontFamily: "'Poppins', system-ui, -apple-system, sans-serif" }}`
- Line 138: `style={{ fontFamily: "'Inter', sans-serif" }}` → `style={{ fontFamily: "'Poppins', system-ui, -apple-system, sans-serif" }}`

### 6. `src/routes/_marketing.how-it-works.tsx`
- Line 146: `style={{ fontFamily: "'Inter', sans-serif" }}` → `style={{ fontFamily: "'Poppins', system-ui, -apple-system, sans-serif" }}`
- Line 163: `style={{ fontFamily: "'Inter', sans-serif" }}` → `style={{ fontFamily: "'Poppins', system-ui, -apple-system, sans-serif" }}`
- Line 171: `style={{ fontFamily: "'Inter', sans-serif" }}` → `style={{ fontFamily: "'Poppins', system-ui, -apple-system, sans-serif" }}`
- Line 179: `style={{ fontFamily: "'Inter', sans-serif" }}` → `style={{ fontFamily: "'Poppins', system-ui, -apple-system, sans-serif" }}`
- Line 200: `style={{ fontFamily: "'Inter', sans-serif" }}` → `style={{ fontFamily: "'Poppins', system-ui, -apple-system, sans-serif" }}`
- Line 219: `style={{ fontFamily: "'Inter', sans-serif" }}` → `style={{ fontFamily: "'Poppins', system-ui, -apple-system, sans-serif" }}`

### 7. `src/routes/_marketing.contact.tsx`
- Line 123: `style={{ fontFamily: "Inter, system-ui, sans-serif" }}` → `style={{ fontFamily: "'Poppins', system-ui, -apple-system, sans-serif" }}`

### 8. `src/routes/__root.tsx` (Google Fonts import)
- Current: `family=Inter:wght@300;400;500;600;700;800;900&family=Sora:wght@600;700;800&family=Manrope:wght@400;500;600;700&family=Poppins:wght@400;500;600;700;800`
- New: `family=Inter:wght@300;400;500;600;700;800;900&family=Sora:wght@600;700;800&family=Poppins:wght@400;500;600;700;800`
- Reason: Manrope is no longer used anywhere after the marketing changes. Inter and Sora must stay because app routes/components still reference them.

## Not changed
- `src/routes/index.tsx` already uses `const FONT = "'Poppins', system-ui, -apple-system, sans-serif";`.
- `src/components/marketing/ui.tsx` already uses the same Poppins stack.
- No app routes or components will be touched.

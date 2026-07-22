Update the instructor name lookup in src/routes/admin.job-offers.tsx to use the correct `name` column instead of `full_name`.

**Current query/map (lines 162-169):**
```typescript
const { data: instr } = await supabase
  .from("instructors")
  .select("id, full_name")
  .in("id", claimedIds);
const map: Record<string, string> = {};
(instr ?? []).forEach((i: any) => {
  map[i.id] = i.full_name ?? i.id;
});
```

**Corrected version:**
```typescript
const { data: instr } = await supabase
  .from("instructors")
  .select("id, name")
  .in("id", claimedIds);
const map: Record<string, string> = {};
(instr ?? []).forEach((i: any) => {
  map[i.id] = i.name ?? i.id;
});
```

No other changes will be made to this file.
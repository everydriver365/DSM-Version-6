## Summary
Add a `console.log` inside `src/lib/supabaseClient.ts` that prints the values of `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` when the module loads. This lets the user verify the environment variables are present before Supabase client initialisation.

## Steps
1. Edit `src/lib/supabaseClient.ts` to log the `url` and `anonKey` values after the existing warning check.
2. Keep the existing warning behaviour when values are missing.
3. Verify the file builds cleanly.
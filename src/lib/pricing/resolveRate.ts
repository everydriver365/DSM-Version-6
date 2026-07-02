// Extract outward code from UK postcode e.g. "SO22 5DR" -> "SO22"
export function extractOutwardCode(postcode: string | null | undefined): string | null {
  if (!postcode) return null;
  const cleaned = postcode.replace(/\s+/g, "").toUpperCase();
  if (cleaned.length < 4) return null;
  const outward = cleaned.slice(0, cleaned.length - 3);
  if (!/^[A-Z]{1,2}[0-9][0-9A-Z]?$/.test(outward)) return null;
  return outward;
}

// Fetch postcode rates for an instructor
export async function fetchPostcodeRates(
  instructorId: string,
  token: string,
): Promise<{ outward_code: string; hourly_rate: number }[]> {
  const SUPABASE_URL = "https://bjpqxfrihwjcqprmoqfs.supabase.co";
  const SUPABASE_ANON_KEY =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJqcHF4ZnJpaHdqY3Fwcm1vcWZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0NzQ4MjEsImV4cCI6MjA5NzA1MDgyMX0.HKlgx3dxP3uxX9wMRRUnfb0IPwaBpFcut_iUgT5XFeo";
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/instructor_postcode_rates?instructor_id=eq.${instructorId}&select=outward_code,hourly_rate`,
    {
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${token}` },
    },
  );
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

// Resolve the effective hourly rate
// Priority: pupil custom rate > postcode rate > instructor default
export function resolveHourlyRate(args: {
  pupilCustomRate?: number | null;
  pupilCustomRate90?: number | null;
  pupilCustomRate120?: number | null;
  pupilPostcode?: string | null;
  instructorDefaultRate?: number | null;
  postcodeRates?: { outward_code: string; hourly_rate: number }[];
  durationMinutes?: number;
}): number {
  const {
    pupilCustomRate,
    pupilCustomRate90,
    pupilCustomRate120,
    pupilPostcode,
    instructorDefaultRate,
    postcodeRates,
    durationMinutes,
  } = args;

  // Per-duration custom rates take highest priority
  if (durationMinutes === 90 && pupilCustomRate90 && pupilCustomRate90 > 0) return pupilCustomRate90;
  if (durationMinutes === 120 && pupilCustomRate120 && pupilCustomRate120 > 0) return pupilCustomRate120;

  // General custom rate
  if (pupilCustomRate && pupilCustomRate > 0) {
    const hours = (durationMinutes || 60) / 60;
    return Math.round(pupilCustomRate * hours * 100) / 100;
  }

  // Postcode rate
  const outward = extractOutwardCode(pupilPostcode);
  if (outward && postcodeRates?.length) {
    const match = postcodeRates.find((r) => r.outward_code.toUpperCase() === outward);
    if (match && match.hourly_rate > 0) {
      const hours = (durationMinutes || 60) / 60;
      return Math.round(match.hourly_rate * hours * 100) / 100;
    }
  }

  // Default rate
  const hours = (durationMinutes || 60) / 60;
  return Math.round((instructorDefaultRate || 0) * hours * 100) / 100;
}

// Compute lesson amount
export function computeLessonAmount(args: {
  durationMinutes: number;
  amountDue?: number | null;
  pupilCustomRate?: number | null;
  pupilCustomRate90?: number | null;
  pupilCustomRate120?: number | null;
  pupilPostcode?: string | null;
  instructorDefaultRate?: number | null;
  postcodeRates?: { outward_code: string; hourly_rate: number }[];
}): number {
  if (args.amountDue && Number(args.amountDue) > 0) return Number(args.amountDue);
  return resolveHourlyRate(args);
}
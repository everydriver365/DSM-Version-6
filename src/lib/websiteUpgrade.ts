// Shared website-tier data and upgrade helpers.
// Consumed by src/routes/minisite.tsx and the marketplace
// "Multi Page Custom Website" listing page.

const SUPABASE_URL = "https://bjpqxfrihwjcqprmoqfs.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJqcHF4ZnJpaHdqY3Fwcm1vcWZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0NzQ4MjEsImV4cCI6MjA5NzA1MDgyMX0.HKlgx3dxP3uxX9wMRRUnfb0IPwaBpFcut_iUgT5XFeo";

export type TierId = "free" | "website" | "pro" | "managed";
export type PaidTierId = "website" | "pro" | "managed";

export const TIER_ORDER: TierId[] = ["free", "website", "pro", "managed"];

export const TIER_NAMES: Record<TierId, string> = {
  free: "Free",
  website: "Essential",
  pro: "Pro",
  managed: "Max",
};

export type Tier = {
  id: PaidTierId;
  name: string;
  price: string;
  pillBg: string;
  pillColor: string;
  badge?: string;
  features: string[];
  cta: string;
  btnBg: string;
  btnShadow: string;
};

export const TIERS: Tier[] = [
  {
    id: "website",
    name: "DSM Essential",
    price: "£9.99/mo",
    pillBg: "#EFF6FF",
    pillColor: "#1877D6",
    badge: "Most popular",
    features: [
      "Your own .co.uk domain included",
      'Remove "Powered by EveryDriver"',
      "Gallery (up to 20 photos)",
      "Video intro",
      "Google reviews widget",
      "Priority listing on EveryDriver",
      "Analytics dashboard",
    ],
    cta: "Upgrade to DSM Website →",
    btnBg: "#1877D6",
    btnShadow: "0 3px 0 #0F52A8",
  },
  {
    id: "pro",
    name: "DSM Website Pro",
    price: "£19.99/mo",
    pillBg: "#EDE9FE",
    pillColor: "#7C3AED",
    features: [
      "Everything in DSM Website",
      "Multiple area pages",
      "Blog & content pages",
      "Advanced SEO tools",
      "Google Search Console",
      "Promo codes on booking",
      "Instructor login to edit site",
    ],
    cta: "Upgrade to Pro →",
    btnBg: "#7C3AED",
    btnShadow: "0 3px 0 #5B21B6",
  },
  {
    id: "managed",
    name: "DSM Max",
    price: "£29.99/mo",
    pillBg: "#F1F5F9",
    pillColor: "#0B1F3A",
    features: [
      "Everything in Pro",
      "We build your website for you",
      "Monthly content updates",
      "SEO reporting & management",
      "Google Business Profile setup",
      "Dedicated account manager",
    ],
    cta: "Get a managed website →",
    btnBg: "#0B1F3A",
    btnShadow: "0 3px 0 #050D1C",
  },
];

export type ComparisonGroup = {
  title: string;
  rows: { label: string; from: number }[];
};

/** Comparison table row groups. `from` is the index into COMPARISON_COLS
 *  at which the feature becomes included. */
export const COMPARISON_ROWS: ComparisonGroup[] = [
  {
    title: "Website basics",
    rows: [
      { label: "Own domain", from: 1 },
      { label: "Remove watermark", from: 1 },
      { label: "Gallery", from: 1 },
      { label: "Video intro", from: 1 },
      { label: "Analytics", from: 1 },
    ],
  },
  {
    title: "Growth features",
    rows: [
      { label: "Area pages", from: 2 },
      { label: "Blog", from: 2 },
      { label: "Advanced SEO", from: 2 },
      { label: "Promo codes", from: 2 },
    ],
  },
  {
    title: "Done-for-you",
    rows: [
      { label: "Managed by DSM", from: 3 },
      { label: "Dedicated manager", from: 3 },
    ],
  },
];

export const COMPARISON_COLS: { id: TierId; name: string; price: string }[] = [
  { id: "free", name: "Free", price: "£0" },
  { id: "website", name: "Essential", price: "£9.99/mo" },
  { id: "pro", name: "Pro", price: "£19.99/mo" },
  { id: "managed", name: "Max", price: "£29.99/mo" },
];

/** Normalise free text into a domain (defaults to .co.uk). */
export function normaliseDomain(input: string): string {
  const raw = input.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
  return raw.includes(".") ? raw : `${raw.replace(/[^a-z0-9-]/g, "")}.co.uk`;
}

export type DomainCheck = { domain: string; available: boolean; price?: string | number | null };

/** Calls the check-domain edge function. Throws on error. */
export async function checkDomainAvailability(
  input: string,
  accessToken?: string | null,
): Promise<DomainCheck> {
  const domain = normaliseDomain(input);
  const res = await fetch(`${SUPABASE_URL}/functions/v1/check-domain`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken ?? SUPABASE_ANON_KEY}`,
      apikey: SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({ domain }),
  });
  const data = await res.json();
  if (data?.error) throw new Error(data.error);
  return {
    domain: data?.domain ?? domain,
    available: !!data?.available,
    price: data?.price ?? null,
  };
}

/** Calls square-create-subscription and returns the checkout URL. Throws on error. */
export async function createSubscriptionPaymentLink(
  tier: PaidTierId,
  domain: string | null,
  billingPeriod: "monthly" | "annual",
  accessToken: string,
): Promise<{ url: string }> {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/square-create-subscription`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      apikey: SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({
      tier,
      domain: domain ?? null,
      billing_period: billingPeriod,
      redirect_url: `https://drivingschoolmanager.co.uk/subscription-success?tier=${tier}&domain=${domain ?? ""}`,
    }),
  });
  const data = await res.json();
  if (data?.error) throw new Error(data.error);
  if (!data?.url) throw new Error("Could not start upgrade");
  return { url: data.url as string };
}

// DSM News — shared category system, classification and dedupe helpers.
// Road Alerts owns live incidents/traffic/closures; News never duplicates those.

export type NewsCategoryKey =
  | "important"
  | "instructor"
  | "tests"
  | "dvsa"
  | "training"
  | "road-safety"
  | "business"
  | "cars-ev"
  | "tech-ai"
  | "wellbeing"
  | "data"
  | "general";

export interface NewsCategory {
  key: NewsCategoryKey;
  emoji: string;
  label: string;
  colour: string;
  bg: string;
  /** keywords used by the classifier */
  keywords: string[];
}

export const NEWS_CATEGORIES: NewsCategory[] = [
  {
    key: "important",
    emoji: "🚨",
    label: "Important",
    colour: "#CC2229",
    bg: "#FDECEC",
    keywords: ["rule change", "must now", "mandatory", "urgent", "immediate effect", "new requirement"],
  },
  {
    key: "instructor",
    emoji: "👨‍🏫",
    label: "Instructor",
    colour: "#0B1F3A",
    bg: "#E7ECF4",
    keywords: ["adi", "instructor", "pdi", "driving school", "trainer", "standards check"],
  },
  {
    key: "tests",
    emoji: "🚗",
    label: "Driving Tests",
    colour: "#1877D6",
    bg: "#E7F1FC",
    keywords: ["driving test", "test centre", "examiner", "test booking", "practical test", "theory test", "waiting time"],
  },
  {
    key: "dvsa",
    emoji: "🏛️",
    label: "DVSA",
    colour: "#0B1F3A",
    bg: "#E7ECF4",
    keywords: ["dvsa", "despatch", "dvla", "agency"],
  },
  {
    key: "training",
    emoji: "🎓",
    label: "Training & CPD",
    colour: "#7A5AF8",
    bg: "#EFEAFE",
    keywords: ["cpd", "training", "part 3", "part 2", "qualification", "course", "professional development"],
  },
  {
    key: "road-safety",
    emoji: "🚦",
    label: "Road Safety",
    colour: "#0F9D58",
    bg: "#E6F6EC",
    keywords: ["road safety", "campaign", "casualt", "collision research", "speeding", "seatbelt", "drink drive", "vision zero", "think!"],
  },
  {
    key: "business",
    emoji: "💼",
    label: "Business",
    colour: "#B8860B",
    bg: "#FBF3E0",
    keywords: ["insurance", "fuel price", "tax", "pricing", "self-employ", "marketing", "cost of", "hmrc", "finance"],
  },
  {
    key: "cars-ev",
    emoji: "⚡",
    label: "Cars & EV",
    colour: "#1877D6",
    bg: "#E7F1FC",
    keywords: ["electric", "ev ", "hybrid", "vehicle review", "new car", "running costs", "adas", "dual control"],
  },
  {
    key: "tech-ai",
    emoji: "🤖",
    label: "Technology & AI",
    colour: "#5B21B6",
    bg: "#F1EAFE",
    keywords: ["ai", "artificial intelligence", "autonomous", "self-driving", "telematics", "dash cam", "app ", "software", "technology"],
  },
  {
    key: "wellbeing",
    emoji: "🧠",
    label: "Wellbeing",
    colour: "#0F9D58",
    bg: "#E6F6EC",
    keywords: ["wellbeing", "mental health", "stress", "burnout", "sleep", "work-life", "fatigue"],
  },
  {
    key: "data",
    emoji: "📊",
    label: "Data",
    colour: "#334155",
    bg: "#EEF2F7",
    keywords: ["statistics", "pass rate", "figures", "data release", "research", "survey", "report"],
  },
  {
    key: "general",
    emoji: "📰",
    label: "General",
    colour: "#5B6472",
    bg: "#F1F5F9",
    keywords: [],
  },
];

export const CATEGORY_MAP: Record<string, NewsCategory> = Object.fromEntries(
  NEWS_CATEGORIES.map((c) => [c.key, c]),
) as Record<string, NewsCategory>;

/** Legacy rows used free-text categories ("official"/"industry"). Map them in. */
export function normaliseCategory(raw: string | null | undefined): NewsCategoryKey {
  const v = String(raw ?? "").trim().toLowerCase();
  if (!v) return "general";
  if (CATEGORY_MAP[v]) return v as NewsCategoryKey;
  if (v === "official") return "dvsa";
  if (v === "industry") return "instructor";
  if (v === "road safety") return "road-safety";
  if (v === "technology" || v === "ai") return "tech-ai";
  if (v === "cars" || v === "ev") return "cars-ev";
  return "general";
}

export function categoryOf(key: string | null | undefined): NewsCategory {
  return CATEGORY_MAP[normaliseCategory(key)] ?? CATEGORY_MAP["general"]!;
}

/** Live-incident content belongs to Road Alerts, never to News. */
const ROAD_ALERT_TERMS = [
  "closed due to",
  "lane closure",
  "delays of",
  "traffic jam",
  "congestion on",
  "crash on the",
  "incident on the",
  "road closed",
  "accident on",
  "queueing traffic",
];

export function isRoadAlertContent(text: string): boolean {
  const t = text.toLowerCase();
  return ROAD_ALERT_TERMS.some((term) => t.includes(term));
}

/** Keyword classifier used at ingest time; source default wins when nothing matches. */
export function classifyCategory(
  text: string,
  fallback: NewsCategoryKey = "general",
): NewsCategoryKey {
  const t = text.toLowerCase();
  let best: { key: NewsCategoryKey; score: number } | null = null;
  for (const cat of NEWS_CATEGORIES) {
    if (cat.key === "general" || cat.key === "important") continue;
    const score = cat.keywords.reduce((n, k) => (t.includes(k) ? n + 1 : n), 0);
    if (score > 0 && (!best || score > best.score)) best = { key: cat.key, score };
  }
  return best?.key ?? fallback;
}

const IMPORTANT_TERMS = [
  "rule change",
  "changes to the driving test",
  "test booking",
  "new requirement",
  "from 1 ",
  "comes into force",
  "licence change",
  "mandatory",
  "suspended",
  "withdrawn",
  "safety alert",
];

/** Only Tier 1 sources can raise an item to "important". */
export function detectImportance(text: string, tier: number): "important" | "normal" {
  if (tier > 1) return "normal";
  const t = text.toLowerCase();
  return IMPORTANT_TERMS.some((term) => t.includes(term)) ? "important" : "normal";
}

/** Normalised title used to merge the same story arriving from several sources. */
export function dedupeKey(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\b(the|a|an|of|to|for|and|in|on|new|update|updated)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .slice(0, 10)
    .join("-");
}

export const TIER_LABEL: Record<number, string> = {
  1: "Official",
  2: "Industry",
  3: "Motoring",
  4: "Social",
};

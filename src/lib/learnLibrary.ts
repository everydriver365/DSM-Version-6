/**
 * DSM Learn — curated content library.
 *
 * Hand-curated, code-only. No database, no re-hosting: TED talks play through
 * the official embed.ted.com player and everything else links out to the
 * original publisher.
 */

export type LearnCategory =
  | "TED Talks"
  | "Wellbeing"
  | "Mind"
  | "Health"
  | "5 Minutes For Me";

export type LearnKind = "ted" | "video" | "article" | "podcast" | "activity";

export interface LearnItem {
  id: string;
  kind: LearnKind;
  category: LearnCategory;
  title: string;
  source: string;
  /** External page (TED talk page, NHS page, show page). */
  url?: string;
  /** TED slug — used to build the official embed + page URLs. */
  tedSlug?: string;
  minutes: number;
  blurb: string;
  /** Free-text tags used for search, and by the recommendation matcher. */
  tags: string[];
  /** DL25 fault category ids this content helps with (optional). */
  topics?: string[];
  featured?: boolean;
  /** Step-by-step copy for DSM-written activities. */
  steps?: string[];
}

export const LEARN_CATEGORIES: LearnCategory[] = [
  "TED Talks",
  "Wellbeing",
  "Mind",
  "Health",
  "5 Minutes For Me",
];

export const CATEGORY_EMOJI: Record<LearnCategory, string> = {
  "TED Talks": "🎤",
  Wellbeing: "🌿",
  Mind: "🧠",
  Health: "💪",
  "5 Minutes For Me": "🌿",
};

export function tedEmbedUrl(slug: string): string {
  return `https://embed.ted.com/talks/${slug}`;
}

export function tedPageUrl(slug: string): string {
  return `https://www.ted.com/talks/${slug}`;
}

export function itemLink(item: LearnItem): string | null {
  if (item.tedSlug) return tedPageUrl(item.tedSlug);
  return item.url ?? null;
}

const ted = (
  id: string,
  title: string,
  speaker: string,
  slug: string,
  minutes: number,
  blurb: string,
  tags: string[],
  extra: Partial<LearnItem> = {},
): LearnItem => ({
  id,
  kind: "ted",
  category: "TED Talks",
  title,
  source: `TED · ${speaker}`,
  tedSlug: slug,
  minutes,
  blurb,
  tags,
  ...extra,
});

/* ---------------- TED Talks ---------------- */

const TED_TALKS: LearnItem[] = [
  ted(
    "ted-stress-friend",
    "How to make stress your friend",
    "Kelly McGonigal",
    "kelly_mcgonigal_how_to_make_stress_your_friend",
    14,
    "Reframing test-day nerves — for you and your pupils.",
    ["stress", "nerves", "psychology", "confidence"],
    { featured: true, topics: ["progress", "use_of_speed"] },
  ),
  ted(
    "ted-teen-brain",
    "The mysterious workings of the adolescent brain",
    "Sarah-Jayne Blakemore",
    "sarah_jayne_blakemore_the_mysterious_workings_of_the_adolescent_brain",
    15,
    "Why young learners take risks — and how to teach around it.",
    ["young people", "risk", "psychology", "behaviour"],
    { featured: true, topics: ["use_of_speed", "judgement", "awareness"] },
  ),
  ted(
    "ted-risk-teen",
    "How risk-taking changes a teenager's brain",
    "Kashfia Rahman",
    "kashfia_rahman_how_risk_taking_changes_a_teenager_s_brain",
    9,
    "Habituation to risk, explained by the student who researched it.",
    ["risk", "young people", "behaviour", "road safety"],
    { topics: ["use_of_speed", "following_distance", "judgement"] },
  ),
  ted(
    "ted-driverless",
    "How a driverless car sees the road",
    "Chris Urmson",
    "chris_urmson_how_a_driverless_car_sees_the_road",
    15,
    "Perception, prediction and planning — a great hazard-awareness analogy.",
    ["technology", "road safety", "awareness", "ai"],
    { topics: ["awareness", "judgement", "response_signs"] },
  ),
  ted(
    "ted-ai-business",
    "How AI could empower any business",
    "Andrew Ng",
    "andrew_ng_how_ai_could_empower_any_business",
    11,
    "What AI realistically means for a small business like a driving school.",
    ["ai", "technology", "business"],
  ),
  ted(
    "ted-speak",
    "How to speak so that people want to listen",
    "Julian Treasure",
    "julian_treasure_how_to_speak_so_that_people_want_to_listen",
    10,
    "Voice, tone and delivery — instant wins for in-car briefings.",
    ["communication", "teaching", "performance"],
    { featured: true, topics: ["signals", "mirrors"] },
  ),
  ted(
    "ted-conversation",
    "10 ways to have a better conversation",
    "Celeste Headlee",
    "celeste_headlee_10_ways_to_have_a_better_conversation",
    12,
    "Listening skills that transform pupil debriefs and parent calls.",
    ["communication", "listening", "emotional intelligence"],
  ),
  ted(
    "ted-motivation",
    "The puzzle of motivation",
    "Dan Pink",
    "dan_pink_the_puzzle_of_motivation",
    18,
    "Autonomy, mastery, purpose — why rewards alone don't work.",
    ["motivation", "performance", "business"],
  ),
  ted(
    "ted-growth",
    "The power of believing that you can improve",
    "Carol Dweck",
    "carol_dweck_the_power_of_believing_that_you_can_improve",
    10,
    "Growth mindset — the language to use with a struggling pupil.",
    ["mindset", "learning", "motivation", "confidence"],
    { featured: true, topics: ["progress", "junctions", "positioning"] },
  ),
  ted(
    "ted-memory",
    "Feats of memory anyone can do",
    "Joshua Foer",
    "joshua_foer_feats_of_memory_anyone_can_do",
    20,
    "How memory really works — useful for show me / tell me revision.",
    ["memory", "learning"],
    { topics: ["vehicle_checks", "response_signs"] },
  ),
  ted(
    "ted-better",
    "How to get better at the things you care about",
    "Eduardo Briceño",
    "eduardo_briceno_how_to_get_better_at_the_things_you_care_about",
    11,
    "The learning zone vs the performance zone — a CPD reset.",
    ["performance", "learning", "mindset"],
  ),
  ted(
    "ted-grit",
    "Grit: the power of passion and perseverance",
    "Angela Lee Duckworth",
    "angela_lee_duckworth_grit_the_power_of_passion_and_perseverance",
    6,
    "Six minutes on why persistence beats talent.",
    ["motivation", "resilience", "mindset"],
  ),
  ted(
    "ted-mindful-10",
    "All it takes is 10 mindful minutes",
    "Andy Puddicombe",
    "andy_puddicombe_all_it_takes_is_10_mindful_minutes",
    10,
    "The simplest possible case for a daily mental reset.",
    ["mindfulness", "stress", "wellbeing"],
  ),
  ted(
    "ted-calm",
    "How to stay calm when you know you'll be stressed",
    "Daniel Levitin",
    "daniel_levitin_how_to_stay_calm_when_you_know_you_ll_be_stressed",
    12,
    "Pre-mortems and systems that stop bad days snowballing.",
    ["stress", "resilience", "psychology"],
  ),
  ted(
    "ted-sleep",
    "Sleep is your superpower",
    "Matt Walker",
    "matt_walker_sleep_is_your_superpower",
    19,
    "What poor sleep does to concentration behind the wheel.",
    ["sleep", "health", "performance"],
    { featured: true },
  ),
  ted(
    "ted-exercise",
    "The brain-changing benefits of exercise",
    "Wendy Suzuki",
    "wendy_suzuki_the_brain_changing_benefits_of_exercise",
    13,
    "Why movement between lessons is a focus tool, not a luxury.",
    ["exercise", "health", "mood"],
  ),
  ted(
    "ted-resilient",
    "3 secrets of resilient people",
    "Lucy Hone",
    "lucy_hone_3_secrets_of_resilient_people",
    16,
    "Practical resilience for the tough weeks.",
    ["resilience", "wellbeing", "mind"],
  ),
  ted(
    "ted-worklife",
    "How to make work-life balance work",
    "Nigel Marsh",
    "nigel_marsh_how_to_make_work_life_balance_work",
    10,
    "For anyone whose diary has quietly eaten their evenings.",
    ["work life balance", "wellbeing"],
  ),
  ted(
    "ted-body-language",
    "Your body language may shape who you are",
    "Amy Cuddy",
    "amy_cuddy_your_body_language_may_shape_who_you_are",
    21,
    "Presence and confidence before a standards check.",
    ["confidence", "performance", "psychology"],
  ),
  ted(
    "ted-happy",
    "The happy secret to better work",
    "Shawn Achor",
    "shawn_achor_the_happy_secret_to_better_work",
    12,
    "Positivity as a performance advantage — and it's funny.",
    ["motivation", "mood", "performance"],
  ),
];

/* ---------------- Wellbeing ---------------- */

const WELLBEING: LearnItem[] = [
  {
    id: "wb-breathing-nhs",
    kind: "article",
    category: "Wellbeing",
    title: "Breathing exercises for stress",
    source: "NHS",
    url: "https://www.nhs.uk/mental-health/self-help/guides-tools-and-activities/breathing-exercises-for-stress/",
    minutes: 5,
    blurb: "A 5-minute breathing routine you can do parked up between lessons.",
    tags: ["stress", "breathing", "relaxation"],
    featured: true,
  },
  {
    id: "wb-emm",
    kind: "article",
    category: "Wellbeing",
    title: "Every Mind Matters — your mind plan",
    source: "NHS Every Mind Matters",
    url: "https://www.nhs.uk/every-mind-matters/",
    minutes: 5,
    blurb: "Answer five questions, get a personalised wellbeing action plan.",
    tags: ["stress", "wellbeing", "mind", "sleep"],
  },
  {
    id: "wb-sleep-nhs",
    kind: "article",
    category: "Wellbeing",
    title: "How to get to sleep",
    source: "NHS",
    url: "https://www.nhs.uk/live-well/sleep-and-tiredness/how-to-get-to-sleep/",
    minutes: 6,
    blurb: "Wind-down habits that work when your last lesson finishes at 9pm.",
    tags: ["sleep", "relaxation", "switching off"],
  },
  {
    id: "wb-mind-stress",
    kind: "article",
    category: "Wellbeing",
    title: "Managing stress and building resilience",
    source: "Mind",
    url: "https://www.mind.org.uk/information-support/types-of-mental-health-problems/stress/",
    minutes: 8,
    blurb: "What stress does, and the practical steps that help.",
    tags: ["stress", "resilience", "wellbeing"],
  },
  {
    id: "wb-switch-off",
    kind: "activity",
    category: "Wellbeing",
    title: "Switching off after the last lesson",
    source: "DSM",
    minutes: 4,
    blurb: "A three-step end-of-day routine so work doesn't follow you indoors.",
    tags: ["switching off", "work life balance", "relaxation"],
    steps: [
      "Before you drive home, log the day's notes and payments — then close DSM.",
      "Pick a 'finish line': the end of your road, the driveway, the front door. Work ends there.",
      "Spend two minutes on one thing that went well today. Say it out loud.",
      "Put the phone on Do Not Disturb until your first lesson tomorrow.",
    ],
  },
  {
    id: "wb-difficult",
    kind: "activity",
    category: "Wellbeing",
    title: "After a difficult lesson",
    source: "DSM",
    minutes: 3,
    blurb: "Reset after a near-miss, a heated pupil, or a bad test result.",
    tags: ["stress", "difficult situations", "resilience"],
    steps: [
      "Pull over safely and stop. Don't drive on adrenaline.",
      "Four slow breaths: in for four, hold for four, out for six.",
      "Name what actually happened in one factual sentence — no judgement.",
      "Decide one thing you'll do differently next time, then let the rest go.",
      "If it was serious, write it down while it's fresh and speak to someone today.",
    ],
  },
  {
    id: "wb-samaritans",
    kind: "article",
    category: "Wellbeing",
    title: "Free listening support, any time",
    source: "Samaritans",
    url: "https://www.samaritans.org/how-we-can-help/contact-samaritan/",
    minutes: 1,
    blurb: "Call 116 123 free, 24/7, if things feel like too much.",
    tags: ["support", "stress", "wellbeing"],
  },
];

/* ---------------- Mind ---------------- */

const MIND: LearnItem[] = [
  {
    id: "mind-confidence",
    kind: "activity",
    category: "Mind",
    title: "Confidence before a standards check",
    source: "DSM",
    minutes: 5,
    blurb: "A short mental rehearsal to walk in steady.",
    tags: ["confidence", "performance", "nerves"],
    steps: [
      "Write down the three things you already do well in a lesson.",
      "Picture the first two minutes of the check: greeting, briefing, moving off.",
      "Plan one sentence you'll use if you go blank: 'Let's pause and recap where we are.'",
      "Two minutes of slow breathing in the car before you go in.",
    ],
  },
  {
    id: "mind-emotional",
    kind: "article",
    category: "Mind",
    title: "Understanding emotional intelligence at work",
    source: "Mental Health Foundation",
    url: "https://www.mentalhealth.org.uk/explore-mental-health/publications/how-support-mental-health-work",
    minutes: 10,
    blurb: "Reading the room — with pupils, parents and yourself.",
    tags: ["emotional intelligence", "communication", "mind"],
  },
  {
    id: "mind-mindset",
    kind: "activity",
    category: "Mind",
    title: "Rewriting 'I'm a bad driver'",
    source: "DSM",
    minutes: 4,
    blurb: "Growth-mindset language to hand a pupil who's given up on themselves.",
    tags: ["mindset", "motivation", "teaching", "confidence"],
    topics: ["progress", "junctions", "reverse_park_road"],
    steps: [
      "Swap 'you can't' for 'you can't yet' — out loud, every time.",
      "Name the specific skill, never the person: 'the observation at that junction', not 'your driving'.",
      "Ask the pupil what changed between attempt one and attempt three.",
      "Finish every lesson with one measurable thing that improved.",
    ],
  },
  {
    id: "mind-motivation",
    kind: "activity",
    category: "Mind",
    title: "Motivating the pupil who's plateaued",
    source: "DSM",
    minutes: 5,
    blurb: "What to do when progress stalls around lesson 20.",
    tags: ["motivation", "teaching", "performance"],
    topics: ["progress", "awareness"],
    steps: [
      "Show them their own progress record — most pupils forget how far they've come.",
      "Change the environment: new route, new test centre area, new time of day.",
      "Set one micro-goal for the next lesson and nothing else.",
      "Agree what 'test ready' actually looks like, in writing.",
    ],
  },
];

/* ---------------- Health ---------------- */

const HEALTH: LearnItem[] = [
  {
    id: "health-posture",
    kind: "article",
    category: "Health",
    title: "Driving posture and back care",
    source: "NHS",
    url: "https://www.nhs.uk/conditions/back-pain/",
    minutes: 7,
    blurb: "Seat height, lumbar support and the small changes that add up over 30 hours a week.",
    tags: ["posture", "back", "neck", "health"],
    featured: true,
  },
  {
    id: "health-move",
    kind: "activity",
    category: "Health",
    title: "Move between lessons",
    source: "DSM",
    minutes: 3,
    blurb: "Three minutes of movement to undo a morning in the driver's seat.",
    tags: ["movement", "exercise", "posture", "habits"],
    steps: [
      "Get out of the car. Every time, even for 60 seconds.",
      "Shoulder rolls x10, neck turns x10 each way, slowly.",
      "Stand tall, hands on hips, gentle backward lean x5.",
      "Walk to the end of the road and back while you check your next pickup.",
    ],
  },
  {
    id: "health-active",
    kind: "article",
    category: "Health",
    title: "Physical activity guidelines for adults",
    source: "NHS",
    url: "https://www.nhs.uk/live-well/exercise/exercise-guidelines/physical-activity-guidelines-for-adults-aged-19-to-64/",
    minutes: 6,
    blurb: "What 150 minutes a week actually looks like around a full diary.",
    tags: ["exercise", "movement", "habits"],
  },
  {
    id: "health-eat",
    kind: "article",
    category: "Health",
    title: "Eating well on the road",
    source: "NHS Eatwell Guide",
    url: "https://www.nhs.uk/live-well/eat-well/food-guidelines-and-food-labels/the-eatwell-guide/",
    minutes: 6,
    blurb: "Beating the petrol-station lunch habit.",
    tags: ["nutrition", "habits", "health"],
  },
  {
    id: "health-water",
    kind: "activity",
    category: "Health",
    title: "Hydration without the toilet-stop problem",
    source: "DSM",
    minutes: 2,
    blurb: "How instructors actually stay hydrated across a 10-hour day.",
    tags: ["hydration", "habits", "health"],
    steps: [
      "One bottle in the door pocket, refilled at lunch — you'll drink what you can see.",
      "Sip between lessons rather than a big drink before a long one.",
      "Swap the third coffee for water; caffeine after 2pm costs you sleep.",
      "Know your toilet stops on each regular route — plan, don't ration.",
    ],
  },
  {
    id: "health-sleep-tired",
    kind: "article",
    category: "Health",
    title: "Sleep and tiredness",
    source: "NHS",
    url: "https://www.nhs.uk/live-well/sleep-and-tiredness/",
    minutes: 8,
    blurb: "Tiredness is a road-safety issue for you, not just your pupils.",
    tags: ["sleep", "tiredness", "road safety"],
  },
];

/* ---------------- 5 Minutes For Me ---------------- */

const FIVE_MINUTES: LearnItem[] = [
  {
    id: "5m-box-breathing",
    kind: "activity",
    category: "5 Minutes For Me",
    title: "Box breathing (2 min)",
    source: "DSM",
    minutes: 2,
    blurb: "The fastest way to drop your heart rate before the next pickup.",
    tags: ["breathing", "stress", "reset"],
    featured: true,
    steps: [
      "Sit upright, feet flat, hands off the wheel.",
      "Breathe in through the nose for 4.",
      "Hold for 4.",
      "Out through the mouth for 4. Hold for 4.",
      "Repeat eight times — that's roughly two minutes.",
    ],
  },
  {
    id: "5m-reset",
    kind: "activity",
    category: "5 Minutes For Me",
    title: "The 90-second stress reset",
    source: "DSM",
    minutes: 2,
    blurb: "For the gap between a hard lesson and a nervous pupil.",
    tags: ["stress", "reset", "relaxation"],
    steps: [
      "Windows down, engine off, phone face down.",
      "Name five things you can see, four you can hear, three you can feel.",
      "One long exhale, twice as long as the breath in.",
      "Say the next pupil's name and one thing you'll work on with them.",
    ],
  },
  {
    id: "5m-mindful",
    kind: "article",
    category: "5 Minutes For Me",
    title: "Mindfulness — a 5 minute guide",
    source: "NHS",
    url: "https://www.nhs.uk/mental-health/self-help/tips-and-support/mindfulness/",
    minutes: 5,
    blurb: "Official NHS guide to being present, without the jargon.",
    tags: ["mindfulness", "relaxation", "wellbeing"],
  },
  {
    id: "5m-relax-nhs",
    kind: "article",
    category: "5 Minutes For Me",
    title: "Relaxation tips for busy days",
    source: "NHS Every Mind Matters",
    url: "https://www.nhs.uk/every-mind-matters/mental-wellbeing-tips/self-care/",
    minutes: 5,
    blurb: "Short self-care ideas that fit in a cancelled slot.",
    tags: ["relaxation", "self care", "wellbeing"],
  },
  {
    id: "5m-confidence",
    kind: "activity",
    category: "5 Minutes For Me",
    title: "Confidence top-up (3 min)",
    source: "DSM",
    minutes: 3,
    blurb: "Before a test, a check, or a first lesson with a nervous pupil.",
    tags: ["confidence", "nerves", "performance"],
    steps: [
      "Sit tall, shoulders back, chin level for 60 seconds.",
      "Recall one lesson that went really well this month, in detail.",
      "Say your opening line for the next lesson out loud, once.",
      "Go.",
    ],
  },
  {
    id: "5m-winddown",
    kind: "activity",
    category: "5 Minutes For Me",
    title: "Wind-down for late finishers",
    source: "DSM",
    minutes: 5,
    blurb: "Five minutes that stop 9pm lessons costing you 11pm sleep.",
    tags: ["sleep", "relaxation", "switching off"],
    steps: [
      "No screens for the last 30 minutes — set an alarm to remind you.",
      "Warm shower or a warm drink, no caffeine.",
      "Write tomorrow's first three tasks on paper so your brain can let go of them.",
      "Slow breathing in bed: out-breath longer than in-breath, ten rounds.",
    ],
  },
];

export const LEARN_LIBRARY: LearnItem[] = [
  ...TED_TALKS,
  ...WELLBEING,
  ...MIND,
  ...HEALTH,
  ...FIVE_MINUTES,
];

export const HEALTH_DISCLAIMER =
  "General wellbeing information only — DSM is not a medical service. Speak to your GP or NHS 111 about health concerns.";

export function getLearnItem(id: string): LearnItem | undefined {
  return LEARN_LIBRARY.find((i) => i.id === id);
}

export function searchLibrary(items: LearnItem[], query: string): LearnItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return items;
  return items.filter((i) =>
    [i.title, i.source, i.blurb, i.category, ...i.tags]
      .join(" ")
      .toLowerCase()
      .includes(q),
  );
}

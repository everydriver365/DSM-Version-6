/**
 * Home screen demo-preview mode.
 *
 * Activated ONLY via `?demo=true` on the /home route, and ONLY on dev/preview
 * builds (import.meta.env.DEV). Never reachable in a production bundle: the
 * `isDemoModeEnabled()` guard returns false and all overrides are skipped.
 *
 * Demo mode injects mock data into the UI layer for visual QA. It does NOT
 * write to the database and is not exposed via any UI toggle. To disable,
 * simply remove `?demo=true` from the URL.
 *
 * If this file is ever removed, delete the small import + effect block in
 * `src/routes/home.tsx` (search for "home-demo" and "isDemo").
 */

/**
 * True only on dev/preview builds AND when demo mode is requested via URL.
 * Accepts either `?demo=true` (query) or `#demo` (hash). A service worker on
 * preview strips unknown query params, so hash works most reliably. Once
 * detected, the flag is cached in sessionStorage so client-side navs keep it.
 */
export function isDemoModeEnabled(): boolean {
  if (typeof window === "undefined") return false;
  if (!import.meta.env.DEV) return false;
  try {
    const params = new URLSearchParams(window.location.search);
    const inQuery = params.get("demo") === "true";
    const inHash = /(^|[#&])demo(=true)?(&|$)/.test(window.location.hash || "");
    if (inQuery || inHash) {
      try { window.sessionStorage.setItem("dsm-home-demo", "1"); } catch {}
      return true;
    }
    return window.sessionStorage.getItem("dsm-home-demo") === "1";
  } catch {
    return false;
  }
}


function ymdLondon(d: Date): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

/**
 * Returns a full override bundle for HomePage state. Called by the effect
 * in home.tsx when demo mode is active.
 */
export function getHomeDemoOverrides() {
  const now = new Date();
  const todayISO = ymdLondon(now);
  const tomorrowISO = ymdLondon(addDays(now, 1));
  const dayAfterISO = ymdLondon(addDays(now, 2));

  // Pupil profiles with assigned calendar colours.
  const pupilKieran = {
    id: "demo-p-kieran",
    name: "Kieran Walsh",
    first_name: "Kieran",
    phone: "+447700900001",
    address: "12 Ashfield Road",
    postcode: "M14 6AA",
    profile_image_url: null,
    photo_url: null,
    calendar_colour: "#A32D2D",
    prepaid_hours: 0,
  };
  const pupilAmelia = {
    id: "demo-p-amelia",
    name: "Amelia Clarke",
    first_name: "Amelia",
    phone: "+447700900002",
    address: "34 Beech Avenue",
    postcode: "M20 3RT",
    profile_image_url: null,
    photo_url: null,
    calendar_colour: "#185FA5",
    prepaid_hours: 0,
  };
  const pupilJordan = {
    id: "demo-p-jordan",
    name: "Jordan Reid",
    first_name: "Jordan",
    phone: "+447700900003",
    address: "8 Elm Grove",
    postcode: "M21 8FZ",
    profile_image_url: null,
    photo_url: null,
    calendar_colour: "#16A34A",
    prepaid_hours: 0,
  };

  // Compute a lesson time ~15 minutes from now (within the "In X min" window).
  const heroStart = new Date(now.getTime() + 15 * 60_000);
  const heroTime = `${String(heroStart.getHours()).padStart(2, "0")}:${String(heroStart.getMinutes()).padStart(2, "0")}:00`;

  const nextLesson: any = {
    id: "demo-l-1",
    lesson_date: todayISO,
    lesson_time: heroTime,
    duration_minutes: 60,
    status: "confirmed",
    pupil_id: pupilKieran.id,
    amount_due: 42,
    payment_status: "unpaid",
    notes: null,
    deleted_at: null,
    pupils: pupilKieran,
  };

  // Second lesson today, ~4 hours after the first — creates a visible free slot gap.
  const secondStart = new Date(heroStart.getTime() + 4 * 60 * 60_000);
  const secondTime = `${String(secondStart.getHours()).padStart(2, "0")}:${String(secondStart.getMinutes()).padStart(2, "0")}:00`;
  const secondLesson: any = {
    id: "demo-l-2",
    lesson_date: todayISO,
    lesson_time: secondTime,
    duration_minutes: 90,
    status: "confirmed",
    pupil_id: pupilAmelia.id,
    amount_due: 60,
    payment_status: "paid",
    notes: null,
    deleted_at: null,
    pupils: pupilAmelia,
  };

  // Completed lesson earlier today for the "Today's lessons" summary.
  const earlierStart = new Date(now.getTime() - 3 * 60 * 60_000);
  const earlierTime = `${String(earlierStart.getHours()).padStart(2, "0")}:${String(earlierStart.getMinutes()).padStart(2, "0")}:00`;
  const completedLesson: any = {
    id: "demo-l-0",
    lesson_date: todayISO,
    lesson_time: earlierTime,
    duration_minutes: 60,
    status: "completed",
    pupil_id: pupilJordan.id,
    amount_due: 42,
    payment_status: "paid",
    notes: "Roundabouts practice — good progress on lane discipline.",
    deleted_at: null,
    pupils: pupilJordan,
  };

  // Previous lesson (for hero-expanded "Last lesson" section).
  const prevLesson: any = {
    id: "demo-l-prev",
    lesson_date: ymdLondon(addDays(now, -3)),
    status: "completed",
    notes: "Worked on parallel parking. Confidence improving — needs another session on bay parking.",
  };

  // Tomorrow — two lessons.
  const tomorrowLesson1: any = {
    id: "demo-l-t1",
    lesson_date: tomorrowISO,
    lesson_time: "10:00:00",
    duration_minutes: 60,
    status: "confirmed",
    pupil_id: pupilAmelia.id,
    amount_due: 42,
    payment_status: "unpaid",
    notes: null,
    deleted_at: null,
    pupils: pupilAmelia,
  };
  const tomorrowLesson2: any = {
    id: "demo-l-t2",
    lesson_date: tomorrowISO,
    lesson_time: "14:30:00",
    duration_minutes: 90,
    status: "confirmed",
    pupil_id: pupilJordan.id,
    amount_due: 60,
    payment_status: "unpaid",
    notes: null,
    deleted_at: null,
    pupils: pupilJordan,
  };

  const dayAfterLesson: any = {
    id: "demo-l-d1",
    lesson_date: dayAfterISO,
    lesson_time: "11:00:00",
    duration_minutes: 60,
    status: "confirmed",
    pupil_id: pupilKieran.id,
    amount_due: 42,
    payment_status: "unpaid",
    notes: null,
    deleted_at: null,
    pupils: pupilKieran,
  };

  const allLessons: any[] = [
    completedLesson,
    nextLesson,
    secondLesson,
    tomorrowLesson1,
    tomorrowLesson2,
    dayAfterLesson,
  ];

  // Upcoming driving test within 7 days — drives the Needs Attention "tests" row (urgent).
  const testDateISO = ymdLondon(addDays(now, 3));
  const upcomingTests = [
    {
      id: "demo-test-1",
      name: "Kieran Walsh",
      test_date: testDateISO,
      test_time: "11:30:00",
      test_centre: "Manchester (Cheetham Hill)",
    },
  ];

  // Working hours so free-slot detection has bounds.
  const workingHours = {
    start_time: "08:00",
    end_time: "18:00",
    mon: true,
    tue: true,
    wed: true,
    thu: true,
    fri: true,
    sat: true,
    sun: false,
  };

  const aiSuggestions = [
    {
      title: "Kieran owes £788",
      body: "Outstanding balance across recent lessons. A quick reminder text usually clears it within 24 hours.",
      cta: "Remind",
      route: "/payments",
    },
  ];

  return {
    // Lessons
    allLessons,
    lessons: allLessons as any[],
    nextLesson,
    prevLesson,

    // Money
    outstanding: 788,
    outstandingBreakdown: [
      {
        pupilId: pupilKieran.id,
        name: "Kieran Walsh",
        firstName: "Kieran",
        phone: pupilKieran.phone,
        email: null,
        amount: 788,
        type: "Lessons" as const,
      },
    ],
    weekEarnings: 640,
    todayEarnings: 42,

    // Counts / pupils
    activePupilsCount: 24,

    // Needs Attention
    upcomingTests,
    swapRequests: [],
    recentCancellations: [
      { id: "demo-canc-1", pupil_first_name: "Sam" },
    ],
    rescheduleRequestsCount: 0,
    expiredCerts: [],
    expiringCerts: [],
    pendingSwapCount: 0,

    // Messages
    unreadMsgs: [
      {
        id: "demo-msg-1",
        pupil_id: pupilAmelia.id,
        body: "Can we swap Thursday to 3pm?",
        created_at: new Date(now.getTime() - 30 * 60_000).toISOString(),
        read_at: null,
        pupils: { name: pupilAmelia.name, first_name: pupilAmelia.first_name, profile_image_url: null },
      },
      {
        id: "demo-msg-2",
        pupil_id: pupilJordan.id,
        body: "Thanks for today!",
        created_at: new Date(now.getTime() - 90 * 60_000).toISOString(),
        read_at: null,
        pupils: { name: pupilJordan.name, first_name: pupilJordan.first_name, profile_image_url: null },
      },
    ],

    // Settings
    workingHours,

    // AI
    aiSuggestions,
  };
}

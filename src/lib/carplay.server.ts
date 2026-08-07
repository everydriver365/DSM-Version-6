import { createAuthenticatedSupabaseClient } from "./carplay-auth.server";
import { fetchLessonDriveTime, type LessonDriveTime } from "./lesson-drive-time.server";

const SUPABASE_URL = "https://bjpqxfrihwjcqprmoqfs.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJqcHF4ZnJpaHdqY3Fwcm1vcWZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0NzQ4MjEsImV4cCI6MjA5NzA1MDgyMX0.HKlgx3dxP3uxX9wMRRUnfb0IPwaBpFcut_iUgT5XFeo";

function toYmd(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function toHms(d: Date): string {
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}

function getLondonTimeParts(): { ymd: string; hms: string } {
  const now = new Date();
  const london = new Date(now.toLocaleString("en-US", { timeZone: "Europe/London" }));
  return { ymd: toYmd(london), hms: toHms(london) };
}

export type CarPlayPupil = {
  id: string;
  name: string;
  firstName: string | null;
  phone: string | null;
  postcode: string | null;
  address: string | null;
  profileImageUrl: string | null;
};

export type CarPlayLesson = {
  id: string;
  lessonDate: string;
  lessonTime: string;
  durationMinutes: number | null;
  status: string;
  pupil: CarPlayPupil | null;
  notes: string | null;
  pickupLocation: string | null;
  paymentStatus: string | null;
  amountDue: number | null;
  paidAmount: number | null;
  isTestDay: boolean;
  testCentre: string | null;
  testTime: string | null;
};

export type CarPlayDashboard = {
  userId: string;
  generatedAt: string;
  today: {
    ymd: string;
    currentTime: string;
    totalLessons: number;
    completedLessons: number;
    remainingLessons: number;
    lessons: CarPlayLesson[];
  };
  nextLesson: (CarPlayLesson & {
    driveTime: LessonDriveTime | null;
  }) | null;
  counts: {
    unreadMessages: number;
    outstandingPayments: number;
    unreadNotifications: number;
    upcomingTests: number;
  };
};

export async function getCarPlayDashboard(accessToken: string): Promise<CarPlayDashboard | null> {
  const supabase = createAuthenticatedSupabaseClient(accessToken);
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData?.user) {
    return null;
  }
  const userId = userData.user.id;

  const { ymd: todayYmd, hms: nowHms } = getLondonTimeParts();
  const yesterday = new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/London" }));
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayYmd = toYmd(yesterday);

  // Active lessons for today (not cancelled, not deleted, pupil not deleted)
  const { data: lessonsRaw, error: lessonsError } = await supabase
    .from("lessons")
    .select(
      "id, lesson_date, lesson_time, duration_minutes, status, pupil_id, notes, payment_status, paid_amount, eol_completed, amount_due, pickup_location, pupils(id, name, first_name, phone, postcode, address, profile_image_url, photo_url, deleted_at)"
    )
    .eq("instructor_id", userId)
    .is("deleted_at", null)
    .neq("status", "cancelled")
    .gte("lesson_date", yesterdayYmd)
    .lte("lesson_date", todayYmd)
    .order("lesson_date", { ascending: true })
    .order("lesson_time", { ascending: true });

  if (lessonsError) {
    console.error("[carplay] dashboard lessons error", lessonsError);
  }

  const allLessons = (lessonsRaw ?? []).filter((l: any) => !l.pupils || l.pupils.deleted_at == null);
  const todayLessons = allLessons.filter((l: any) => l.lesson_date === todayYmd);

  const mappedLessons: CarPlayLesson[] = todayLessons.map((l: any) => mapLessonRow(l));
  const completedLessons = mappedLessons.filter((l) => l.status === "completed").length;
  const remainingLessons = mappedLessons.filter((l) => !["completed", "cancelled"].includes(l.status)).length;

  // Next lesson: any future non-cancelled/non-completed lesson
  const { data: nextRows, error: nextErr } = await supabase
    .from("lessons")
    .select(
      "id, lesson_date, lesson_time, duration_minutes, status, pupil_id, notes, payment_status, paid_amount, eol_completed, amount_due, pickup_location, pupils!inner(id, name, first_name, phone, postcode, address, profile_image_url, photo_url, deleted_at)"
    )
    .eq("instructor_id", userId)
    .is("deleted_at", null)
    .is("pupils.deleted_at", null)
    .neq("status", "cancelled")
    .neq("status", "completed")
    .gte("lesson_date", todayYmd)
    .order("lesson_date", { ascending: true })
    .order("lesson_time", { ascending: true })
    .limit(5);
  if (nextErr) {
    console.error("[carplay] dashboard next lesson error", nextErr);
  }

  const nextLessonRow = (nextRows ?? []).find((l: any) => {
    if (l.lesson_date > todayYmd) return true;
    const lt = (l.lesson_time ?? "00:00:00").slice(0, 8);
    const lessonTime = lt.length === 5 ? `${lt}:00` : lt;
    return lessonTime > nowHms;
  });

  let nextLesson: CarPlayDashboard["nextLesson"] = null;
  if (nextLessonRow) {
    const lesson = mapLessonRow(nextLessonRow);
    const destination = deriveDestination(lesson);
    const driveTime = await fetchLessonDriveTime({
      destination,
      lovableKey: process.env.LOVABLE_API_KEY,
      googleMapsKey: process.env.GOOGLE_MAPS_KEY,
    });
    nextLesson = { ...lesson, driveTime };
  }

  // Count unread instructor messages
  const { count: unreadMessages, error: msgErr } = await supabase
    .from("instructor_messages")
    .select("id", { count: "exact", head: true })
    .eq("recipient_id", userId)
    .eq("read", false)
    .is("deleted_at", null);
  if (msgErr) console.error("[carplay] unread messages error", msgErr);

  // Outstanding payments
  const { count: outstandingPayments, error: payErr } = await supabase
    .from("lessons")
    .select("id", { count: "exact", head: true })
    .eq("instructor_id", userId)
    .eq("payment_status", "unpaid")
    .neq("status", "cancelled")
    .gt("amount_due", 0)
    .is("deleted_at", null);
  if (payErr) console.error("[carplay] outstanding payments error", payErr);

  // Unread notifications
  const { count: unreadNotifications, error: notifErr } = await supabase
    .from("instructor_notifications")
    .select("id", { count: "exact", head: true })
    .eq("instructor_id", userId)
    .eq("read", false)
    .is("deleted_at", null);
  if (notifErr) console.error("[carplay] unread notifications error", notifErr);

  // Upcoming tests (today onwards) — stored on pupils table
  const { count: upcomingTests, error: testErr } = await supabase
    .from("pupils")
    .select("id", { count: "exact", head: true })
    .eq("instructor_id", userId)
    .not("test_date", "is", null)
    .gte("test_date", todayYmd);
  if (testErr) console.error("[carplay] upcoming tests error", testErr);


  return {
    userId,
    generatedAt: new Date().toISOString(),
    today: {
      ymd: todayYmd,
      currentTime: nowHms,
      totalLessons: mappedLessons.length,
      completedLessons,
      remainingLessons,
      lessons: mappedLessons,
    },
    nextLesson,
    counts: {
      unreadMessages: unreadMessages ?? 0,
      outstandingPayments: outstandingPayments ?? 0,
      unreadNotifications: unreadNotifications ?? 0,
      upcomingTests: upcomingTests ?? 0,
    },
  };
}

export async function getCarPlayCurrentLesson(accessToken: string): Promise<CarPlayLesson | null> {
  const supabase = createAuthenticatedSupabaseClient(accessToken);
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData?.user) {
    return null;
  }
  const userId = userData.user.id;
  const { ymd: todayYmd, hms: nowHms } = getLondonTimeParts();

  const { data, error } = await supabase
    .from("lessons")
    .select(
      "id, lesson_date, lesson_time, duration_minutes, status, pupil_id, notes, payment_status, paid_amount, eol_completed, amount_due, pickup_location, pupils!inner(id, name, first_name, phone, postcode, address, profile_image_url, photo_url, deleted_at)"
    )
    .eq("instructor_id", userId)
    .is("deleted_at", null)
    .is("pupils.deleted_at", null)
    .eq("lesson_date", todayYmd)
    .neq("status", "cancelled")
    .neq("status", "completed")
    .order("lesson_time", { ascending: true });

  if (error || !data || data.length === 0) {
    return null;
  }

  // Pick the lesson whose time window contains the current time, or the next upcoming one
  const nowMinutes = hmsToMinutes(nowHms);
  const inProgress = (data as any[]).find((l) => {
    if (l.status === "in_progress") return true;
    const start = hmsToMinutes((l.lesson_time ?? "00:00:00").slice(0, 8));
    const duration = l.duration_minutes ?? 60;
    return nowMinutes >= start && nowMinutes <= start + duration;
  });

  const current = inProgress ?? (data as any[])[0];
  return mapLessonRow(current);
}

export async function getCarPlayDirectionsForLesson(
  accessToken: string,
  lessonId: string,
  originLat?: number,
  originLon?: number,
): Promise<LessonDriveTime | null> {
  const supabase = createAuthenticatedSupabaseClient(accessToken);
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData?.user) {
    return null;
  }
  const userId = userData.user.id;

  const { data, error } = await supabase
    .from("lessons")
    .select(
      "id, lesson_date, lesson_time, duration_minutes, status, pupil_id, notes, payment_status, paid_amount, eol_completed, amount_due, pickup_location, pupils!inner(id, name, first_name, phone, postcode, address, profile_image_url, photo_url, deleted_at)"
    )
    .eq("instructor_id", userId)
    .eq("id", lessonId)
    .is("deleted_at", null)
    .is("pupils.deleted_at", null)
    .single();

  if (error || !data) {
    return null;
  }

  const lesson = mapLessonRow(data as any);
  const destination = deriveDestination(lesson);
  return fetchLessonDriveTime({
    originLat,
    originLon,
    destination,
    lovableKey: process.env.LOVABLE_API_KEY,
    googleMapsKey: process.env.GOOGLE_MAPS_KEY,
  });
}

function mapLessonRow(l: any): CarPlayLesson {
  const rawNotes = (l.notes as string | null) ?? "";
  const isTestDay = rawNotes.trim().toLowerCase().startsWith("test day:");
  const testCentre = isTestDay ? extractTestCentre(rawNotes) : null;
  const testTime = isTestDay ? extractTestTime(rawNotes) : null;

  const pupil = l.pupils
    ? {
        id: l.pupils.id as string,
        name: l.pupils.name as string,
        firstName: (l.pupils.first_name as string | null) ?? null,
        phone: (l.pupils.phone as string | null) ?? null,
        postcode: (l.pupils.postcode as string | null) ?? null,
        address: (l.pupils.address as string | null) ?? null,
        profileImageUrl: (l.pupils.profile_image_url as string | null) ?? (l.pupils.photo_url as string | null) ?? null,
      }
    : null;

  return {
    id: l.id as string,
    lessonDate: l.lesson_date as string,
    lessonTime: (l.lesson_time as string | null)?.slice(0, 8) ?? "00:00:00",
    durationMinutes: l.duration_minutes as number | null,
    status: l.status as string,
    pupil,
    notes: rawNotes,
    pickupLocation: (l.pickup_location as string | null) ?? null,
    paymentStatus: (l.payment_status as string | null) ?? null,
    amountDue: (l.amount_due as number | null) ?? null,
    paidAmount: (l.paid_amount as number | null) ?? null,
    isTestDay,
    testCentre,
    testTime,
  };
}

function deriveDestination(lesson: CarPlayLesson): string {
  if (lesson.isTestDay) {
    return lesson.testCentre || lesson.pickupLocation || lesson.pupil?.postcode || lesson.pupil?.address || "";
  }
  return lesson.pickupLocation || lesson.pupil?.postcode || lesson.pupil?.address || "";
}

function extractTestCentre(notes: string): string | null {
  const match = notes.match(/Test Centre:\s*([^\n]+)/i);
  return match ? match[1].trim() : null;
}

function extractTestTime(notes: string): string | null {
  const match = notes.match(/Test Time:\s*([^\n]+)/i) || notes.match(/Time:\s*([^\n]+)/i);
  return match ? match[1].trim() : null;
}

function hmsToMinutes(hms: string): number {
  const [h, m, s] = hms.split(":").map((n) => Number(n) || 0);
  return h * 60 + m + s / 60;
}

export type { LessonDriveTime };

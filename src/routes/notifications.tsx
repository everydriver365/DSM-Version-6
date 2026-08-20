import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { type ReactNode, useEffect, useRef, useState } from "react";
import DSMSkeleton from "@/components/dsm/DSMSkeleton";
import DSMTopSheet from "@/components/dsm/DSMTopSheet";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { IconBell, IconCalendar, IconCalendarOff, IconCalendarPlus, IconChecks, IconChevronRight, IconCircleX, IconClock, IconCurrencyPound, IconExternalLink, IconHome, IconInbox, IconMail, IconMapPin, IconMessage, IconNavigation, IconPhone, IconPlayerPlay, IconRefresh, IconSend, IconTrash, IconUser, IconUsers, IconVideo, IconX } from "@tabler/icons-react";
import { toast } from "sonner";
import { tapLight, hapticWarning } from "@/lib/haptics";
import { supabase } from "../lib/supabaseClient";

import { EmptyState } from "@/components/dsm/EmptyState";

export const Route = createFileRoute("/notifications")({
  head: () => ({
    meta: [{ title: "Notifications — DSM by EveryDriver" }],
  }),
  component: NotificationsPage,
});

const POPPINS = { fontFamily: "Poppins, sans-serif" } as const;

interface Notification {
  id: string;
  instructor_id: string;
  title: string;
  body: string | null;
  type: string | null;
  read: boolean;
  created_at: string;
  reference_id: string | null;
  reference_type: string | null;
}

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function sameDay(a: Date, b: Date) {
  return startOfDay(a).getTime() === startOfDay(b).getTime();
}
function dateGroupLabel(d: Date, today: Date, yesterday: Date) {
  if (sameDay(d, today)) return "TODAY";
  if (sameDay(d, yesterday)) return "YESTERDAY";
  return d
    .toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })
    .toUpperCase();
}
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}
function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
}
function timeAgo(iso: string) {
  const now = new Date().getTime();
  const then = new Date(iso).getTime();
  const diffMs = now - then;
  const seconds = Math.floor(diffMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (seconds < 60) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return formatDate(iso);
}
function formatTime12hr(timeStr: string | null | undefined): string {
  if (!timeStr) return "";
  const clean = String(timeStr).trim();
  const d = clean.includes("T") ? new Date(clean) : new Date(`2000-01-01T${clean}`);
  if (isNaN(d.getTime())) return clean;
  return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: true });

}

function typeIcon(type: string | null) {
  switch (type) {
    case "lesson":
      return { bg: "#1877D6", node: <IconCalendar size={18} color="#FFFFFF" /> };
    case "payment":
      return { bg: "#1877D6", node: <IconCurrencyPound stroke={1.5} size={18} color="#FFFFFF" /> };
    case "pupil":
      return { bg: "#1877D6", node: <IconUsers stroke={1.5} size={18} color="#FFFFFF" /> };
    case "lesson_cancelled_by_pupil":
      return { bg: "#CC2229", node: <IconCircleX stroke={1.5} size={18} color="#FFFFFF" /> };
    case "reschedule_request":
      return { bg: "#D97706", node: <IconRefresh stroke={1.5} size={18} color="#FFFFFF" /> };
    default:
      return { bg: "#6B7280", node: <IconBell stroke={1.5} size={18} color="#FFFFFF" /> };
  }
}

function typeTitle(type: string | null, fallback: string) {
  if (type === "lesson_cancelled_by_pupil") return "Lesson cancelled by pupil";
  if (type === "reschedule_request") return "Reschedule request";
  return fallback;
}

function extractNameFromTitle(title?: string | null): string | null {
  if (!title) return null;
  const m = title.match(/(?:new\s+)?message\s+from\s+(.+)/i);
  return m ? m[1].trim() : null;
}


function getNotificationAction(
  notif: any
): {
  directNav?: string;
  options?: { label: string; route: string; icon: string }[];
  isMessage?: boolean;
  isOverduePayment?: boolean;
  isLessonStarting?: boolean;
  threadId?: string | null;
  senderName?: string | null;
  messagePreview?: string | null;
  isCancellation?: boolean;
  pupilId?: string | null;
  lessonId?: string | null;
  pupilName?: string | null;
  pupilPhone?: string | null;
  pupilEmail?: string | null;
  cancellationReason?: string | null;
  lessonDate?: string | null;
  lessonTime?: string | null;
  pickupLocation?: string | null;
  minutesUntil?: number | null;
  isDSMLive?: boolean;

  sessionId?: string | null;
  sessionTitle?: string | null;
  sessionUrl?: string | null;
  startTime?: string | null;
  isLiveNow?: boolean;
  isDrivingTest?: boolean;
  testCentre?: string | null;
  testDate?: string | null;
  testTime?: string | null;
  testResult?: string | null;
  isToday?: boolean;
  isEnquiry?: boolean;
  enquiryId?: string | null;
  enquirerName?: string | null;
  enquirerPhone?: string | null;
  enquirerEmail?: string | null;
  enquirerPostcode?: string | null;
  transmission?: string | null;
  message?: string | null;
  receivedAt?: string | null;
  isJobOffer?: boolean;
  amountOwed?: string | number | null;
  lessonCount?: number | null;
  jobId?: string | null;
  jobTitle?: string | null;
  area?: string | null;
  duration?: string | number | null;
  rate?: string | number | null;
  description?: string | null;
  postedBy?: string | null;
  expiresAt?: string | null;
  isGoneQuiet?: boolean;
  daysSinceLesson?: number | null;
  lastLessonDate?: string | null;
} {
  const type = notif.type ?? "";
  const title = String(notif.title ?? "");
  const body = String(notif.body ?? "");
  const refId = notif.reference_id ?? null;
  const refType = notif.reference_type ?? null;

  // Lesson starting soon — "Sarah's lesson starts at 14:30 — tap to start tracking"
  if (type === "tracking") {
    return {
      isLessonStarting: true,
      lessonId: refType === "lesson" ? refId : null,
      pupilId: null,
      pupilName: body.split("'s")[0]?.trim() || null,
      pupilPhone: null,
      lessonTime: body.match(/\d{1,2}:\d{2}/)?.[0] || null,
      pickupLocation: null,
      minutesUntil: null,
      options: [],
    };
  }

  // Overdue payment — "Luke Shaw owes £40.00 — lesson was on 2026-07-02"
  if (type === "overdue_payment") {
    return {
      isOverduePayment: true,
      lessonId: refType === "lesson" ? refId : null,
      pupilName: body.split(" owes")[0]?.trim() || null,
      amountOwed: body.match(/£[\d.]+/)?.[0]?.replace("£", "") || null,
      pupilPhone: null,
      pupilEmail: null,
      pupilId: null,
      lessonCount: null,
      options: [],
    };
  }

  // Message — "Message from Richard Chapman"
  if (type === "instructor_dm") {
    return {
      isMessage: true,
      threadId: refType === "instructor_conversation" ? refId : null,
      senderName: title.replace("Message from ", "").trim() || null,
      messagePreview: body || null,
      options: [],
    };
  }

  // Lesson cancelled — "Aimee Colliss cancelled their lesson on 17 Aug"
  if (type === "lesson_cancelled") {
    return {
      isCancellation: true,
      lessonId: refType === "lesson" ? refId : null,
      pupilId: null,
      pupilName: body.split(" cancelled")[0]?.trim() || null,
      pupilPhone: null,
      cancellationReason: null,
      lessonDate: body.match(/\d{1,2}\s\w+/)?.[0] || null,
      lessonTime: null,
      options: [],
    };
  }

  // DSM Live — "The Waiting Room starts in 30 minutes"
  if (type === "live_starting_soon") {
    return {
      isDSMLive: true,
      sessionId: refType === "dsm_live_session" ? refId : null,
      sessionTitle: body.split(" starts")[0]?.trim() || "DSM Live",
      sessionUrl: null,
      isLiveNow: false,
      startTime: null,
      options: [],
    };
  }

  // Test tomorrow — "Aimee Colliss has their test tomorrow at 14:10:00 at Southampton Maybush"
  if (type === "test_tomorrow") {
    return {
      isDrivingTest: true,
      pupilId: refType === "pupil" ? refId : null,
      pupilName: body.split(" has their")[0]?.trim() || null,
      testCentre: body.split(" at ").slice(-1)[0]?.trim() || null,
      testTime: body.match(/\d{1,2}:\d{2}/)?.[0] || null,
      testDate: "Tomorrow",
      testResult: null,
      isToday: false,
      pupilPhone: null,
      options: [],
    };
  }

  // Pupil gone quiet — "Sabrina Evans hasn't had a lesson in 30 days"
  if (type === "pupil_churn") {
    const pupilId = refType === "pupil" ? refId : null;
    return {
      isGoneQuiet: true,
      pupilId,
      pupilName: body.split("hasn't")[0]?.trim() || null,
      daysSinceLesson: Number(body.match(/\d+/)?.[0]) || null,
      lastLessonDate: null,
      pupilPhone: null,
      options: pupilId
        ? [{ label: "View pupil", route: `/pupils/${pupilId}`, icon: "user" }]
        : [{ label: "Go to Pupils", route: "/pupils", icon: "user" }],
    };
  }

  // Enquiry — "New enquiry from Sarah Johnson"
  if (type === "new_enquiry" || type === "enquiry") {
    return {
      isEnquiry: true,
      enquiryId: refType === "enquiry" ? refId : null,
      enquirerName: title.replace("New enquiry from ", "").replace("Enquiry from ", "") || null,
      enquirerPhone: null,
      enquirerEmail: null,
      enquirerPostcode: null,
      transmission: null,
      message: body || null,
      receivedAt: notif.created_at,
      options: [],
    };
  }

  // Job offer — "New job offer" or "Job offer: Manual lessons in SO30"
  if (type === "job_offer" || type === "new_job") {
    return {
      isJobOffer: true,
      jobId: refType === "job_offer" || refType === "instructor_job" ? refId : null,
      jobTitle: title.replace("New job offer: ", "").replace("New job offer", "Job offer") || "Job offer",
      area: null,
      transmission: null,
      lessonDate: null,
      lessonTime: null,
      duration: null,
      rate: null,
      description: body || null,
      postedBy: null,
      expiresAt: null,
      options: [],
    };
  }

  return {
    options: [
      { label: "Go to Schedule", route: "/schedule", icon: "calendar" },
      { label: "Go to Dashboard", route: "/", icon: "home" },
    ],
  };
}

function NotificationsPage() {
  const [reloadKey, setReloadKey] = useState(0);
  const navigate = useNavigate();

  const [userId, setUserId] = useState<string | null>(null);
  const [items, setItems] = useState<Notification[] | null>(null);
  const [actionSheet, setActionSheet] = useState<{
    notif: any;
    notifType?: string | null;
    options: { label: string; route: string; icon: string }[];
    isMessage?: boolean;
    isOverduePayment?: boolean;
    isLessonStarting?: boolean;
    threadId?: string | null;
    senderName?: string | null;
    messagePreview?: string | null;
    isCancellation?: boolean;
    pupilId?: string | null;
    lessonId?: string | null;
    pupilName?: string | null;
    pupilPhone?: string | null;
    pupilEmail?: string | null;
    cancellationReason?: string | null;
    lessonDate?: string | null;
    lessonTime?: string | null;
    pickupLocation?: string | null;
    minutesUntil?: number | null;
    isDSMLive?: boolean;

    sessionId?: string | null;
    sessionTitle?: string | null;
    sessionUrl?: string | null;
    startTime?: string | null;
    isLiveNow?: boolean;
    isDrivingTest?: boolean;
    testCentre?: string | null;
    testDate?: string | null;
    testTime?: string | null;
    testResult?: string | null;
    isToday?: boolean;
    isEnquiry?: boolean;
    enquiryId?: string | null;
    enquirerName?: string | null;
    enquirerPhone?: string | null;
    enquirerEmail?: string | null;
    enquirerPostcode?: string | null;
    transmission?: string | null;
    message?: string | null;
    receivedAt?: string | null;
    isJobOffer?: boolean;
    amountOwed?: string | number | null;
    lessonCount?: number | null;
    jobId?: string | null;
    jobTitle?: string | null;
    area?: string | null;
    duration?: string | number | null;
    rate?: string | number | null;
    description?: string | null;
    postedBy?: string | null;
    expiresAt?: string | null;
  } | null>(null);

  const [quickReply, setQuickReply] = useState("");
  const [sendingReply, setSendingReply] = useState(false);
  const [replyFocused, setReplyFocused] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const replyInputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (actionSheet?.isMessage) {
      const timer = setTimeout(() => {
        replyInputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [actionSheet?.isMessage]);

  useEffect(() => {
    const onFocus = () => {
      setTimeout(() => {
        if (window.visualViewport) {
          const keyboardH = window.innerHeight - window.visualViewport.height;
          setKeyboardHeight(Math.max(0, keyboardH));
        } else {
          setKeyboardHeight(320);
        }
      }, 300);
    };
    const onBlur = () => {
      setTimeout(() => {
        setKeyboardHeight(0);
      }, 100);
    };
    window.addEventListener("focusin", onFocus);
    window.addEventListener("focusout", onBlur);
    return () => {
      window.removeEventListener("focusin", onFocus);
      window.removeEventListener("focusout", onBlur);
    };
  }, []);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      const uid = data.user?.id ?? null;
      setUserId(uid);
      if (!uid) return;
      const { data: rows, error } = await supabase
        .from("instructor_notifications")
        .select("id, instructor_id, title, body, type, read, created_at, reference_id, reference_type")
        .eq("instructor_id", uid)
        .order("created_at", { ascending: false });
      if (error) console.error("[notifications] fetch error", error);
      setItems((rows ?? []) as Notification[]);
    })();
  }, [reloadKey]);

  const { pullToRefreshProps } = usePullToRefresh({
    onRefresh: async () => { setReloadKey((k) => k + 1); },
  });

  async function markAsRead(notifId: string) {
    setItems((prev) => (prev ?? []).map((n) => (n.id === notifId ? { ...n, read: true } : n)));
    const { error } = await supabase
      .from("instructor_notifications")
      .update({ read: true })
      .eq("id", notifId);
    if (error) console.error("[notifications] mark read error", error);
    window.dispatchEvent(new Event("dsm-notifications-updated"));
  }

  async function handleNotificationTap(notif: any) {
    tapLight();
    if (!notif.read) {
      await markAsRead(notif.id);
    }
    const action: any = getNotificationAction(notif);

    if (notif.reference_type === "lesson" && notif.reference_id) {
      const { data: lesson } = await supabase
        .from("lessons")
        .select("id, pupil_id, pickup_location, lesson_date, lesson_time, pupils ( id, name, phone, email )")
        .eq("id", notif.reference_id)
        .single();
      const l = lesson as any;
      if (l) {
        const p = Array.isArray(l.pupils) ? l.pupils[0] : l.pupils;
        if (action.isLessonStarting) {
          action.pupilId = l.pupil_id;
          action.pupilName = p?.name ?? action.pupilName;
          action.pupilPhone = p?.phone ?? null;
          action.pickupLocation = l.pickup_location ?? null;
          action.lessonTime = action.lessonTime ?? l.lesson_time ?? null;
        }
        if (action.isCancellation) {
          action.pupilId = l.pupil_id;
          action.pupilName = p?.name ?? action.pupilName;
          action.pupilPhone = p?.phone ?? null;
        }
        if (action.isOverduePayment) {
          action.pupilId = l.pupil_id;
          action.pupilName = p?.name ?? action.pupilName;
          action.pupilPhone = p?.phone ?? null;
          action.pupilEmail = p?.email ?? null;
        }
      }
    }

    if (notif.reference_type === "pupil" && notif.reference_id) {
      const { data: pupil } = await supabase
        .from("pupils")
        .select("id, name, phone, email")
        .eq("id", notif.reference_id)
        .single();
      const p = pupil as any;
      if (p) {
        action.pupilId = p.id;
        action.pupilName = p.name ?? action.pupilName;
        action.pupilPhone = p.phone ?? null;
        action.pupilEmail = p.email ?? null;
      }
    }

    if (notif.reference_type === "enquiry" && notif.reference_id) {
      const { data: enquiry } = await supabase
        .from("instructor_enquiries")
        .select("*")
        .eq("id", notif.reference_id)
        .single();
      if (enquiry) {
        action.enquiryId = enquiry.id;
        action.enquirerName = enquiry.name ?? action.enquirerName;
        action.enquirerPhone = enquiry.phone ?? null;
        action.enquirerEmail = enquiry.email ?? null;
        action.enquirerPostcode = enquiry.postcode ?? null;
        action.transmission = enquiry.transmission ?? null;
        action.message = enquiry.message ?? enquiry.notes ?? action.message;
      }
    }

    if (
      (notif.reference_type === "job_offer" || notif.reference_type === "instructor_job") &&
      notif.reference_id
    ) {
      const { data: job } = await supabase
        .from("instructor_jobs")
        .select("*")
        .eq("id", notif.reference_id)
        .single();
      if (job) {
        action.jobId = job.id;
        action.jobTitle = job.title ?? action.jobTitle;
        action.area = job.area ?? job.postcode ?? null;
        action.transmission = job.transmission ?? job.car_type ?? null;
        action.lessonDate = job.lesson_date ?? job.date ?? null;
        action.lessonTime = job.lesson_time ?? job.time ?? null;
        action.duration = job.duration ?? job.hours ?? null;
        action.rate = job.rate ?? job.hourly_rate ?? null;
        action.description = job.description ?? job.notes ?? null;
        action.postedBy = job.posted_by ?? job.instructor_name ?? null;
        action.expiresAt = job.expires_at ?? null;
      }
    }

    if (action.directNav) {
      const direct = action.directNav as string;
      if (direct.startsWith("/lessons/") && direct !== "/lessons") {
        navigate({ to: "/lessons/$id", params: { id: direct.split("/")[2] } });
      } else if (direct.startsWith("/pupils/") && direct !== "/pupils") {
        navigate({ to: "/pupils/$id", params: { id: direct.split("/")[2] } });
      } else {
        navigate({ to: direct as never });
      }
      return;
    }

    if (action.isOverduePayment) hapticWarning();
    setActionSheet({ notif, notifType: notif.type, options: action.options ?? [], ...action });
  }



  async function markAllRead() {
    if (!userId) return;
    setItems((prev) => (prev ?? []).map((n) => ({ ...n, read: true })));
    const { error } = await supabase
      .from("instructor_notifications")
      .update({ read: true })
      .eq("instructor_id", userId)
      .eq("read", false);
    if (error) {
      console.error("[notifications] mark all read error", error);
      toast.error("Failed to mark all as read");
    } else {
      toast.success("All marked as read");
    }
    window.dispatchEvent(new Event("dsm-notifications-updated"));
  }

  async function deleteOne(id: string) {
    setItems((prev) => (prev ?? []).filter((n) => n.id !== id));
    const { error } = await supabase
      .from("instructor_notifications")
      .delete()
      .eq("id", id);
    if (error) {
      console.error("[notifications] delete error", error);
      toast.error("Failed to remove notification");
    } else {
      toast("Notification removed");
    }
    window.dispatchEvent(new Event("dsm-notifications-updated"));
  }

  async function clearAllRead() {
    if (!userId) return;
    setItems((prev) => (prev ?? []).filter((n) => !n.read));
    const { error } = await supabase
      .from("instructor_notifications")
      .delete()
      .eq("instructor_id", userId)
      .eq("read", true);
    if (error) {
      console.error("[notifications] clear read error", error);
      toast.error("Failed to clear read notifications");
    } else {
      toast.success("Read notifications cleared");
    }
    window.dispatchEvent(new Event("dsm-notifications-updated"));
  }

  async function sendQuickReply() {
    if (!quickReply.trim() || !actionSheet) return;
    setSendingReply(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const threadId =
        actionSheet.notif?.metadata?.thread_id ??
        actionSheet.notif?.metadata?.conversation_id ??
        actionSheet.notif?.reference_id;

      if (!threadId) {
        // No thread ID — navigate to messages instead
        navigate({ to: "/messages" as never });
        setActionSheet(null);
        setQuickReply("");
        return;
      }

      const type = actionSheet.notifType ?? actionSheet.notif?.type ?? "";
      const text = quickReply.trim();

      if (type === "instructor_dm") {
        // Fetch conversation to know the recipient
        const { data: conv, error: convErr } = await supabase
          .from("instructor_conversations")
          .select("instructor_a_id, instructor_b_id")
          .eq("id", threadId)
          .single();

        if (convErr || !conv) {
          throw new Error("Could not load conversation");
        }

        const otherId =
          conv.instructor_a_id === user.id
            ? conv.instructor_b_id
            : conv.instructor_a_id;

        const { error } = await supabase.from("instructor_messages").insert({
          conversation_id: threadId,
          from_instructor_id: user.id,
          to_instructor_id: otherId,
          body: text,
        });

        if (error) throw error;
      } else if (type === "pupil_message") {
        const { error } = await supabase.from("chat_messages").insert({
          instructor_id: user.id,
          pupil_id: threadId,
          sender_type: "instructor",
          sender_id: user.id,
          body: text,
        });

        if (error) throw error;
      } else {
        // Fallback legacy message type — assume chat_messages
        const { error } = await supabase.from("chat_messages").insert({
          instructor_id: user.id,
          pupil_id: threadId,
          sender_type: "instructor",
          sender_id: user.id,
          body: text,
        });

        if (error) throw error;
      }

      toast.success("Reply sent ✓");
      setQuickReply("");
      setActionSheet(null);
    } catch (e: any) {
      toast.error("Could not send reply");
    } finally {
      setSendingReply(false);
    }
  }

  const today = startOfDay(new Date());
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  // Group preserving order
  const groups: { label: string; items: Notification[] }[] = [];
  (items ?? []).forEach((n) => {
    const label = dateGroupLabel(new Date(n.created_at), today, yesterday);
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.items.push(n);
    else groups.push({ label, items: [n] });
  });

  const hasAnyUnread = (items ?? []).some((n) => !n.read);

  return (
    <DSMTopSheet title="Notifications" onBack={() => navigate({ to: "/home" as never })}>
      <div {...pullToRefreshProps} style={{ minHeight: "100%" }}>

      {/* Action bar */}
      <div
        className="flex items-center justify-end gap-2"
        style={{ background: "#FFFFFF", padding: "8px 16px", borderBottom: "1px solid #EEF2F7" }}
      >
        <button
          type="button"
          onClick={clearAllRead}
          disabled={!(items ?? []).some((n) => n.read)}
          className="inline-flex items-center gap-1 text-[12px] font-medium px-2 py-1 rounded-lg disabled:opacity-50"
          style={{ color: "#6B7280", ...POPPINS }}
          aria-label="Clear read notifications"
        >
          <IconTrash stroke={1.5} size={14} color="#6B7280" />
          Clear read
        </button>
        <button
          type="button"
          onClick={markAllRead}
          disabled={!hasAnyUnread}
          className="inline-flex items-center gap-1 text-[12px] font-semibold px-2 py-1 rounded-lg disabled:opacity-50"
          style={{ color: "#1877D6", ...POPPINS }}
          aria-label="Mark all as read"
        >
          <IconChecks size={14} color="#1877D6" />
          Mark all read
        </button>
      </div>


      <div className="px-4">
        {items === null ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: "0 12px" }}>
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 12,
                  padding: "13px 16px",
                  background: "#FFFFFF",
                  borderRadius: 8,
                  boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
                }}
              >
                <DSMSkeleton width={36} height={36} borderRadius={18} />
                <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 8 }}>
                  <DSMSkeleton width="55%" height={14} borderRadius={6} />
                  <DSMSkeleton width="80%" height={12} borderRadius={6} />
                </div>
                <DSMSkeleton width={34} height={10} borderRadius={5} />
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            icon={<IconBell size={32} color="#9CA3AF" stroke={1.5} />}
            title="All caught up"
            subtitle="No notifications yet"
          />
        ) : (
          groups.map((g) => (
            <div key={g.label} style={{ marginTop: 18 }}>
              <div
                style={{
                  ...POPPINS,
                  fontSize: 11,
                  fontWeight: 600,
                  color: "#9CA3AF",
                  textTransform: "uppercase",
                  letterSpacing: 0.3,
                  marginLeft: 16,
                  marginBottom: 8,
                }}
              >
                {g.label}
              </div>
              <div
                style={{
                  background: "#FFFFFF",
                  borderRadius: 8,
                  boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
                  overflow: "hidden",
                }}
              >
                {g.items.map((n, index) => {
                  const ic = typeIcon(n.type);
                  const isLast = index === g.items.length - 1;
                  return (
                    <div key={n.id}>
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => { tapLight(); void handleNotificationTap(n); }}
                        onTouchStart={(e) => {
                          e.currentTarget.style.transform = "scale(0.98)";
                          e.currentTarget.style.opacity = "0.9";
                        }}
                        onTouchEnd={(e) => {
                          e.currentTarget.style.transform = "scale(1)";
                          e.currentTarget.style.opacity = "1";
                        }}
                        className="w-full text-left cursor-pointer"
                        style={{
                          background: n.read ? "#FFFFFF" : "#F5F9FF",
                          padding: "13px 16px",
                          position: "relative",
                          transition: "transform 0.1s ease, opacity 0.1s ease",
                        }}
                      >
                        <div className="flex items-start gap-3">
                          {/* Unread indicator */}
                          <div
                            style={{
                              width: 7,
                              flexShrink: 0,
                              display: "flex",
                              justifyContent: "center",
                              marginTop: 6,
                            }}
                          >
                            {!n.read && (
                              <div
                                style={{
                                  width: 7,
                                  height: 7,
                                  borderRadius: "50%",
                                  background: "#1877D6",
                                }}
                              />
                            )}
                          </div>

                          {/* Icon */}
                          <div
                            className="flex items-center justify-center rounded-full shrink-0"
                            style={{ width: 36, height: 36, backgroundColor: ic.bg }}
                          >
                            {ic.node}
                          </div>

                          {/* Content */}
                          <div className="min-w-0 flex-1">
                            <div
                              className="text-[14px] font-semibold text-[#0B1F3A] truncate"
                              style={POPPINS}
                            >
                              {typeTitle(n.type, n.title)}
                            </div>
                            {n.body && (
                              <div
                                className="text-[13px] text-[#6B7280] mt-0.5"
                                style={POPPINS}
                              >
                                {n.body}
                              </div>
                            )}
                            <div
                              className="text-[11px] text-[#9CA3AF] mt-0.5"
                              style={POPPINS}
                            >
                              {formatTime(n.created_at)}
                            </div>
                            {n.type === "lesson_cancelled_by_pupil" && (
                              <div className="flex items-center gap-2 mt-2">
                                {n.reference_id && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      markAsRead(n.id);
                                      navigate({ to: "/lessons/$id", params: { id: n.reference_id! } });
                                    }}
                                    className="text-[12px] font-semibold"
                                    style={{ color: "#0B1F3A", background: "none", border: "none", padding: 0, cursor: "pointer", ...POPPINS }}
                                  >
                                    View lesson →
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    markAsRead(n.id);
                                    navigate({ to: "/gaps" });
                                  }}
                                  className="text-[12px] font-semibold text-white"
                                  style={{ background: "#D97706", border: "none", borderRadius: 8, padding: "6px 12px", cursor: "pointer", ...POPPINS }}
                                >
                                  Fill slot →
                                </button>
                              </div>
                            )}
                            {n.type === "reschedule_request" && (
                              <div className="flex items-center gap-2 mt-2">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    markAsRead(n.id);
                                    navigate({ to: "/messages" });
                                  }}
                                  className="text-[12px] font-semibold"
                                  style={{ color: "#0B1F3A", background: "none", border: "none", padding: 0, cursor: "pointer", ...POPPINS }}
                                >
                                  View message →
                                </button>
                                {n.reference_id && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      markAsRead(n.id);
                                      navigate({ to: "/lessons/reschedule/$id", params: { id: n.reference_id! } });
                                    }}
                                    className="text-[12px] font-semibold text-white"
                                    style={{ background: "#1877D6", border: "none", borderRadius: 8, padding: "6px 12px", cursor: "pointer", ...POPPINS }}
                                  >
                                    Reschedule →
                                  </button>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Chevron + delete */}
                          <div className="flex flex-col items-center gap-0.5 shrink-0" style={{ marginTop: 2 }}>
                            <button
                              type="button"
                              aria-label="Remove notification"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteOne(n.id);
                              }}
                              className="flex items-center justify-center p-1 rounded-lg hover:bg-black/5"
                            >
                              <IconX stroke={1.5} size={16} color="#9CA3AF" />
                            </button>
                            <IconChevronRight size={18} color="#9CA3AF" />
                          </div>
                        </div>
                      </div>

                      {/* Hairline divider — not on last */}
                      {!isLast && (
                        <div
                          style={{
                            height: 1,
                            background: "#E4E8EF",
                            marginLeft: 62,
                          }}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {actionSheet && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 300,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "flex-end",
          }}
          onClick={() => {
            setActionSheet(null);
            setQuickReply("");
          }}
        >
          <div
            style={{
              position: "relative",
              background: "#EEF2F7",
              borderRadius: "22px 22px 0 0",
              width: "100%",
              maxHeight: "90vh",
              overflowY: "auto",
              transition: "transform 0.3s ease",
              transform: keyboardHeight > 0 ? `translateY(-${keyboardHeight}px)` : "translateY(0)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ position: "relative", padding: "12px 16px 0" }}>
              <div style={{ width: 36, height: 5, borderRadius: 8, background: "#D1D1D6", margin: "0 auto" }} />
              <button
                type="button"
                aria-label="Close"
                onClick={() => {
                  setActionSheet(null);
                  setQuickReply("");
                }}
                style={{
                  position: "absolute",
                  right: 16,
                  top: 8,
                  width: 30,
                  height: 30,
                  borderRadius: "50%",
                  background: "#EEF2F7",
                  border: "1px solid #E4E8EF",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <IconX size={16} color="#6B7686" stroke={2} />
              </button>
            </div>
            {actionSheet.isMessage ? (
              <div
                style={{
                  margin: "16px 16px 8px",
                  background: "#fff",
                  borderRadius: 8,
                  border: "1px solid #E4E8EF",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    gap: 10,
                    alignItems: "center",
                    padding: "14px 16px",
                    borderBottom: "1px solid #E4E8EF",
                  }}
                >
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: "50%",
                      background: "#EDE9FE",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      fontSize: 14,
                      fontWeight: 700,
                      color: "#7C3AED",
                      ...POPPINS,
                    }}
                  >
                    {actionSheet.senderName?.[0] ?? "?"}
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 700,
                        color: "#0B1F3A",
                        ...POPPINS,
                      }}
                    >
                      {actionSheet.senderName ?? "Unknown sender"}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: "#9CA3AF",
                        marginTop: 2,
                        ...POPPINS,
                      }}
                    >
                      Sent you a message
                    </div>
                  </div>
                </div>
                {actionSheet.messagePreview && (
                  <div
                    style={{
                      padding: "12px 16px",
                      fontSize: 13,
                      color: "#6B7686",
                      lineHeight: 1.5,
                      fontStyle: "italic",
                      ...POPPINS,
                    }}
                  >
                    "{actionSheet.messagePreview}"
                  </div>
                )}
                <div
                  style={{
                    position: "sticky",
                    bottom: 0,
                    background: "#fff",
                    borderTop: "1px solid #E4E8EF",
                    padding: "12px 16px",
                    paddingBottom: "calc(12px + env(safe-area-inset-bottom, 0px))",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      gap: 10,
                      alignItems: "flex-end",
                    }}
                  >
                    <textarea
                      ref={replyInputRef}
                      placeholder="Quick reply..."
                      value={quickReply}
                      rows={1}
                      onChange={(e) => {
                        setQuickReply(e.target.value);
                        const el = e.target;
                        el.style.height = "auto";
                        el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
                      }}
                      onFocus={() => setReplyFocused(true)}
                      onBlur={() => setReplyFocused(false)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey && quickReply.trim() && !sendingReply) {
                          e.preventDefault();
                          sendQuickReply();
                        }
                      }}
                      disabled={sendingReply}
                      style={{
                        flex: 1,
                        minHeight: 44,
                        maxHeight: 120,
                        borderRadius: 22,
                        padding: "12px 16px",
                        fontSize: 15,
                        fontFamily: "Poppins, sans-serif",
                        background: "#fff",
                        border: "1px solid #E4E8EF",
                        outline: "none",
                        resize: "none",
                        lineHeight: 1.4,
                      }}
                    />
                    <button
                      type="button"
                      disabled={!quickReply.trim() || sendingReply}
                      onClick={sendQuickReply}
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: "50%",
                        flexShrink: 0,
                        background: quickReply.trim() ? "#1877D6" : "#E4E8EF",
                        border: "none",
                        cursor: quickReply.trim() && !sendingReply ? "pointer" : "default",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <IconSend
                        size={18}
                        color={quickReply.trim() ? "#fff" : "#9CA3AF"}
                        stroke={1.5}
                      />
                    </button>
                  </div>
                </div>
              </div>
            ) : actionSheet.isCancellation ? (
              <>
                <div
                  style={{
                    margin: "16px 16px 8px",
                    background: "#FEE2E2",
                    borderRadius: 8,
                    border: "1px solid #FECACA",
                    padding: "14px 16px",
                  }}
                >
                  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: "50%",
                        background: "#FEE2E2",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <IconCalendarOff size={18} color="#CC2229" stroke={1.5} />
                    </div>
                    <div>
                      <div
                        style={{
                          fontSize: 14,
                          fontWeight: 700,
                          color: "#CC2229",
                          ...POPPINS,
                        }}
                      >
                        Lesson cancelled
                      </div>
                      {actionSheet.lessonDate && actionSheet.lessonTime && (
                        <div
                          style={{
                            fontSize: 11,
                            color: "rgba(204, 34, 41, 0.7)",
                            marginTop: 2,
                            ...POPPINS,
                          }}
                        >
                          {formatDate(actionSheet.lessonDate)} at {actionSheet.lessonTime}
                        </div>
                      )}
                    </div>
                  </div>
                  {actionSheet.pupilName && (
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: "#0B1F3A",
                        marginTop: 10,
                        ...POPPINS,
                      }}
                    >
                      Cancelled by {actionSheet.pupilName}
                    </div>
                  )}
                  {actionSheet.cancellationReason ? (
                    <div
                      style={{
                        marginTop: 8,
                        background: "rgba(255,255,255,0.6)",
                        borderRadius: 8,
                        padding: "10px 12px",
                      }}
                    >
                      <div
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          color: "#CC2229",
                          marginBottom: 4,
                          ...POPPINS,
                        }}
                      >
                        Reason:
                      </div>
                      <div
                        style={{
                          fontSize: 13,
                          color: "#991B1B",
                          lineHeight: 1.5,
                          ...POPPINS,
                        }}
                      >
                        {actionSheet.cancellationReason}
                      </div>
                    </div>
                  ) : (
                    <div
                      style={{
                        fontSize: 13,
                        color: "rgba(204, 34, 41, 0.6)",
                        fontStyle: "italic",
                        marginTop: 8,
                        ...POPPINS,
                      }}
                    >
                      No reason provided
                    </div>
                  )}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: "#9CA3AF",
                    textTransform: "uppercase",
                    padding: "8px 16px 6px",
                    ...POPPINS,
                  }}
                >
                  WHAT WOULD YOU LIKE TO DO?
                </div>
                <div
                  style={{
                    margin: "0 16px",
                    background: "#fff",
                    borderRadius: 8,
                    border: "1px solid #E4E8EF",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      gap: 12,
                      alignItems: "center",
                      padding: "14px 16px",
                      borderBottom: "1px solid #E4E8EF",
                      cursor: "pointer",
                    }}
                    onClick={() => {
                      if (actionSheet.pupilPhone) {
                        window.open(
                          `sms:${actionSheet.pupilPhone}?body=${encodeURIComponent(
                            "Hi " +
                              (actionSheet.pupilName ?? "") +
                              ", sorry to hear you need to cancel. Would you like to reschedule?"
                          )}`,
                          "_blank"
                        );
                      } else {
                        toast.error("No phone number on record");
                      }
                      setActionSheet(null);
                      setQuickReply("");
                    }}
                  >
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: "50%",
                        background: "#DCFCE7",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <IconMessage size={18} color="#15803D" stroke={1.5} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          fontSize: 14,
                          fontWeight: 600,
                          color: "#0B1F3A",
                          ...POPPINS,
                        }}
                      >
                        Send a text
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          color: "#9CA3AF",
                          marginTop: 2,
                          ...POPPINS,
                        }}
                      >
                        Message {actionSheet.pupilName ?? "pupil"} about rescheduling
                      </div>
                    </div>
                    <IconChevronRight size={16} color="#C7D0DC" stroke={2} />
                  </div>
                  <div
                    style={{
                      display: "flex",
                      gap: 12,
                      alignItems: "center",
                      padding: "14px 16px",
                      borderBottom: "1px solid #E4E8EF",
                      cursor: "pointer",
                    }}
                    onClick={() => {
                      setActionSheet(null);
                      setQuickReply("");
                      navigate({
                        to: "/lessons/new" as never,
                        search: (actionSheet.pupilId
                          ? { pupilId: actionSheet.pupilId }
                          : undefined) as any,
                      });
                    }}
                  >
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: "50%",
                        background: "#EFF6FF",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <IconCalendarPlus size={18} color="#1877D6" stroke={1.5} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          fontSize: 14,
                          fontWeight: 600,
                          color: "#0B1F3A",
                          ...POPPINS,
                        }}
                      >
                        Reschedule lesson
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          color: "#9CA3AF",
                          marginTop: 2,
                          ...POPPINS,
                        }}
                      >
                        Book a new lesson for {actionSheet.pupilName ?? "this pupil"}
                      </div>
                    </div>
                    <IconChevronRight size={16} color="#C7D0DC" stroke={2} />
                  </div>
                  <div
                    style={{
                      display: "flex",
                      gap: 12,
                      alignItems: "center",
                      padding: "14px 16px",
                      cursor: "pointer",
                    }}
                    onClick={() => {
                      setActionSheet(null);
                      setQuickReply("");
                      if (actionSheet.pupilId) {
                        navigate({
                          to: `/pupils/${actionSheet.pupilId}` as never,
                        });
                      } else {
                        navigate({ to: "/pupils" as never });
                      }
                    }}
                  >
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: "50%",
                        background: "#EDE9FE",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <IconUser size={18} color="#7C3AED" stroke={1.5} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          fontSize: 14,
                          fontWeight: 600,
                          color: "#0B1F3A",
                          ...POPPINS,
                        }}
                      >
                        View pupil's lessons
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          color: "#9CA3AF",
                          marginTop: 2,
                          ...POPPINS,
                        }}
                      >
                        {actionSheet.pupilName ?? "Pupil"}'s lesson history
                      </div>
                    </div>
                    <IconChevronRight size={16} color="#C7D0DC" stroke={2} />
                  </div>
                </div>
                <button
                  type="button"
                  style={{
                    margin: "12px 16px 0",
                    width: "calc(100% - 32px)",
                    background: "#fff",
                    color: "#0B1F3A",
                    borderRadius: 8,
                    padding: 13,
                    fontSize: 14,
                    fontWeight: 700,
                    border: "1px solid #E4E8EF",
                    cursor: "pointer",
                    ...POPPINS,
                  }}
                  onClick={() => {
                    setActionSheet(null);
                    setQuickReply("");
                  }}
                >
                  Dismiss
                </button>
              </>
            ) : actionSheet.isDSMLive ? (
              <>
                <style>{`
                  @keyframes dsm-live-pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.4; }
                  }
                `}</style>
                <div
                  style={{
                    margin: "16px 16px 8px",
                    background: actionSheet.isLiveNow
                      ? "linear-gradient(135deg, #CC2229, #991B1B)"
                      : "linear-gradient(135deg, #14509E, #0B1F3A)",
                    borderRadius: 8,
                    padding: 16,
                    boxShadow: "0 4px 0 rgba(0,0,0,0.2)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    {actionSheet.isLiveNow ? (
                      <div
                        style={{
                          display: "flex",
                          gap: 6,
                          alignItems: "center",
                          background: "rgba(255,255,255,0.2)",
                          borderRadius: 8,
                          padding: "4px 10px",
                        }}
                      >
                        <span
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: "50%",
                            background: "#fff",
                            animation: "dsm-live-pulse 1.5s ease-in-out infinite",
                          }}
                        />
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 800,
                            color: "#fff",
                            ...POPPINS,
                          }}
                        >
                          LIVE NOW
                        </span>
                      </div>
                    ) : (
                      <div
                        style={{
                          background: "rgba(255,255,255,0.2)",
                          borderRadius: 8,
                          padding: "4px 10px",
                        }}
                      >
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 800,
                            color: "#fff",
                            ...POPPINS,
                          }}
                        >
                          DSM LIVE
                        </span>
                      </div>
                    )}
                  </div>
                  <div
                    style={{
                      fontSize: 18,
                      fontWeight: 800,
                      color: "#fff",
                      marginTop: 10,
                      letterSpacing: -0.3,
                      ...POPPINS,
                    }}
                  >
                    {actionSheet.sessionTitle}
                  </div>
                  {actionSheet.startTime && !actionSheet.isLiveNow && (
                    <div
                      style={{
                        display: "flex",
                        gap: 6,
                        alignItems: "center",
                        marginTop: 6,
                      }}
                    >
                      <IconClock size={13} color="rgba(255,255,255,0.7)" stroke={1.5} />
                      <span
                        style={{
                          fontSize: 12,
                          color: "rgba(255,255,255,0.7)",
                          ...POPPINS,
                        }}
                      >
                        {actionSheet.startTime}
                      </span>
                    </div>
                  )}
                  <button
                    type="button"
                    style={{
                      marginTop: 14,
                      width: "100%",
                      background: "#fff",
                      color: actionSheet.isLiveNow ? "#CC2229" : "#14509E",
                      borderRadius: 8,
                      padding: 12,
                      fontSize: 14,
                      fontWeight: 800,
                      border: "none",
                      cursor: "pointer",
                      fontFamily: "Poppins, sans-serif",
                      display: "flex",
                      gap: 8,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                    onClick={() => {
                      const url =
                        actionSheet.sessionUrl ??
                        (actionSheet.sessionId ? `/dsm-live/${actionSheet.sessionId}` : "/dsm-live");
                      if (actionSheet.sessionUrl) {
                        window.open(url, "_blank");
                      } else {
                        navigate({ to: url as never });
                      }
                      setActionSheet(null);
                    }}
                  >
                    <IconPlayerPlay
                      size={16}
                      color={actionSheet.isLiveNow ? "#CC2229" : "#14509E"}
                      stroke={2}
                    />
                    <span>{actionSheet.isLiveNow ? "Join now →" : "Join session →"}</span>
                  </button>
                </div>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: "#9CA3AF",
                    textTransform: "uppercase",
                    padding: "8px 16px 6px",
                    ...POPPINS,
                  }}
                >
                  MORE OPTIONS
                </div>
                <div
                  style={{
                    margin: "0 16px",
                    background: "#fff",
                    borderRadius: 8,
                    border: "1px solid #E4E8EF",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      gap: 12,
                      alignItems: "center",
                      padding: "14px 16px",
                      borderBottom: "1px solid #E4E8EF",
                      cursor: "pointer",
                    }}
                    onClick={() => {
                      setActionSheet(null);
                      setQuickReply("");
                      navigate({ to: "/dsm-live" as never });
                    }}
                  >
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: "50%",
                        background: actionSheet.isLiveNow ? "#FEE2E2" : "#EFF6FF",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <IconVideo
                        size={18}
                        color={actionSheet.isLiveNow ? "#CC2229" : "#1877D6"}
                        stroke={1.5}
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          fontSize: 14,
                          fontWeight: 600,
                          color: "#0B1F3A",
                          ...POPPINS,
                        }}
                      >
                        View all DSM Live
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          color: "#9CA3AF",
                          marginTop: 2,
                          ...POPPINS,
                        }}
                      >
                        Browse upcoming sessions and replays
                      </div>
                    </div>
                    <IconChevronRight size={16} color="#C7D0DC" stroke={2} />
                  </div>
                  <div
                    style={{
                      display: "flex",
                      gap: 12,
                      alignItems: "center",
                      padding: "14px 16px",
                      cursor: "pointer",
                    }}
                    onClick={() => {
                      if (actionSheet.sessionUrl) {
                        const calUrl = `https://www.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
                          actionSheet.sessionTitle ?? "DSM Live"
                        )}&details=${encodeURIComponent(
                          "Join at: " + (actionSheet.sessionUrl ?? "")
                        )}`;
                        window.open(calUrl, "_blank");
                      } else {
                        toast.info("No session URL available");
                      }
                      setActionSheet(null);
                    }}
                  >
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: "50%",
                        background: "#F0FDF4",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <IconCalendarPlus size={18} color="#15803D" stroke={1.5} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          fontSize: 14,
                          fontWeight: 600,
                          color: "#0B1F3A",
                          ...POPPINS,
                        }}
                      >
                        Add to Google Calendar
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          color: "#9CA3AF",
                          marginTop: 2,
                          ...POPPINS,
                        }}
                      >
                        Save this session to your calendar
                      </div>
                    </div>
                    <IconChevronRight size={16} color="#C7D0DC" stroke={2} />
                  </div>
                </div>
                <button
                  type="button"
                  style={{
                    margin: "12px 16px 0",
                    width: "calc(100% - 32px)",
                    background: "#fff",
                    color: "#0B1F3A",
                    borderRadius: 8,
                    padding: 13,
                    fontSize: 14,
                    fontWeight: 700,
                    border: "1px solid #E4E8EF",
                    cursor: "pointer",
                    ...POPPINS,
                  }}
                  onClick={() => {
                    setActionSheet(null);
                    setQuickReply("");
                  }}
                >
                  Dismiss
                </button>
              </>
            ) : actionSheet.isDrivingTest ? (
              <>
                <style>{`
                  @keyframes driving-test-pulse {
                    0%, 100% { opacity: 1; transform: scale(1); }
                    50% { opacity: 0.5; transform: scale(0.9); }
                  }
                `}</style>
                <div
                  style={{
                    margin: "16px 16px 8px",
                    borderRadius: 8,
                    overflow: "hidden",
                    background:
                      actionSheet.testResult === "pass"
                        ? "linear-gradient(135deg, #15803D, #166534)"
                        : actionSheet.testResult === "fail"
                          ? "linear-gradient(135deg, #6B7280, #4B5563)"
                          : actionSheet.isToday
                            ? "linear-gradient(135deg, #CC2229, #991B1B)"
                            : "linear-gradient(135deg, #14509E, #0B1F3A)",
                    boxShadow:
                      actionSheet.testResult === "pass"
                        ? "0 4px 0 #14532D"
                        : actionSheet.testResult === "fail"
                          ? "0 4px 0 #374151"
                          : actionSheet.isToday
                            ? "0 4px 0 #7F1D1D"
                            : "0 4px 0 #091628",
                    padding: 16,
                    ...POPPINS,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <div
                      style={{
                        background: "rgba(255,255,255,0.2)",
                        borderRadius: 8,
                        padding: "4px 10px",
                        fontSize: 10,
                        fontWeight: 800,
                        color: "#fff",
                        ...POPPINS,
                      }}
                    >
                      {actionSheet.testResult === "pass"
                        ? "🎉 TEST PASSED"
                        : actionSheet.testResult === "fail"
                          ? "TEST NOT PASSED"
                          : actionSheet.isToday
                            ? "🚗 TEST TODAY"
                            : "🚗 DRIVING TEST"}
                    </div>
                    {actionSheet.isToday && !actionSheet.testResult && (
                      <div
                        style={{
                          display: "flex",
                          gap: 6,
                          alignItems: "center",
                        }}
                      >
                        <span
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: "50%",
                            background: "#fff",
                            animation: "driving-test-pulse 1.4s ease-in-out infinite",
                          }}
                        />
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 800,
                            color: "#fff",
                            ...POPPINS,
                          }}
                        >
                          TODAY
                        </span>
                      </div>
                    )}
                  </div>
                  <div
                    style={{
                      fontSize: 20,
                      fontWeight: 800,
                      color: "#fff",
                      marginTop: 10,
                      letterSpacing: -0.3,
                      ...POPPINS,
                    }}
                  >
                    {actionSheet.pupilName ?? "Test"}
                  </div>
                  <div
                    style={{
                      marginTop: 12,
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 8,
                    }}
                  >
                    {actionSheet.testDate && (
                      <div
                        style={{
                          background: "rgba(255,255,255,0.15)",
                          borderRadius: 8,
                          padding: "10px 12px",
                        }}
                      >
                        <div
                          style={{
                            fontSize: 9,
                            fontWeight: 700,
                            color: "rgba(255,255,255,0.6)",
                            letterSpacing: "0.08em",
                            marginBottom: 4,
                            ...POPPINS,
                          }}
                        >
                          DATE
                        </div>
                        <div
                          style={{
                            fontSize: 13,
                            fontWeight: 700,
                            color: "#fff",
                            ...POPPINS,
                          }}
                        >
                          {formatDate(actionSheet.testDate)}
                        </div>
                      </div>
                    )}
                    {actionSheet.testTime && (
                      <div
                        style={{
                          background: "rgba(255,255,255,0.15)",
                          borderRadius: 8,
                          padding: "10px 12px",
                        }}
                      >
                        <div
                          style={{
                            fontSize: 9,
                            fontWeight: 700,
                            color: "rgba(255,255,255,0.6)",
                            letterSpacing: "0.08em",
                            marginBottom: 4,
                            ...POPPINS,
                          }}
                        >
                          TIME
                        </div>
                        <div
                          style={{
                            fontSize: 13,
                            fontWeight: 700,
                            color: "#fff",
                            ...POPPINS,
                          }}
                        >
                          {(() => {
                            const t = actionSheet.testTime;
                            if (!t) return "";
                            const d = t.includes("T") ? new Date(t) : new Date(`2000-01-01T${t}`);
                            return d.toLocaleTimeString("en-GB", {
                              hour: "2-digit",
                              minute: "2-digit",
                              hour12: true,
                            });
                          })()}
                        </div>
                      </div>
                    )}
                    {actionSheet.testCentre && (
                      <div
                        style={{
                          background: "rgba(255,255,255,0.15)",
                          borderRadius: 8,
                          padding: "10px 12px",
                          gridColumn: "span 2 / span 2",
                        }}
                      >
                        <div
                          style={{
                            fontSize: 9,
                            fontWeight: 700,
                            color: "rgba(255,255,255,0.6)",
                            letterSpacing: "0.08em",
                            marginBottom: 4,
                            ...POPPINS,
                          }}
                        >
                          TEST CENTRE
                        </div>
                        <div
                          style={{
                            fontSize: 13,
                            fontWeight: 700,
                            color: "#fff",
                            lineHeight: 1.4,
                            ...POPPINS,
                          }}
                        >
                          {actionSheet.testCentre}
                        </div>
                      </div>
                    )}
                    {actionSheet.testResult && (
                      <div
                        style={{
                          background: "rgba(255,255,255,0.15)",
                          borderRadius: 8,
                          padding: "10px 12px",
                          gridColumn: "span 2 / span 2",
                        }}
                      >
                        <div
                          style={{
                            fontSize: 9,
                            fontWeight: 700,
                            color: "rgba(255,255,255,0.6)",
                            letterSpacing: "0.08em",
                            marginBottom: 4,
                            ...POPPINS,
                          }}
                        >
                          RESULT
                        </div>
                        <div
                          style={{
                            fontSize: 15,
                            fontWeight: 800,
                            color: "#fff",
                            ...POPPINS,
                          }}
                        >
                          {actionSheet.testResult === "pass" ? "✓ PASSED" : "✗ Not passed"}
                        </div>
                      </div>
                    )}
                  </div>
                  {actionSheet.testCentre && actionSheet.isToday && !actionSheet.testResult && (
                    <button
                      type="button"
                      style={{
                        marginTop: 12,
                        width: "100%",
                        background: "rgba(255,255,255,0.2)",
                        borderRadius: 8,
                        padding: 11,
                        border: "none",
                        cursor: "pointer",
                        display: "flex",
                        gap: 8,
                        alignItems: "center",
                        justifyContent: "center",
                        ...POPPINS,
                      }}
                      onClick={() => {
                        const addr = encodeURIComponent(actionSheet.testCentre ?? "");
                        window.open(`maps://?daddr=${addr}&dirflg=d`, "_blank");
                      }}
                    >
                      <IconNavigation size={16} color="#fff" stroke={1.5} />
                      <span style={{ fontSize: 13, fontWeight: 700, color: "#fff", ...POPPINS }}>
                        Navigate to test centre
                      </span>
                    </button>
                  )}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: "#9CA3AF",
                    textTransform: "uppercase",
                    padding: "8px 16px 6px",
                    ...POPPINS,
                  }}
                >
                  OPTIONS
                </div>
                <div
                  style={{
                    margin: "0 16px",
                    background: "#fff",
                    borderRadius: 8,
                    border: "1px solid #E4E8EF",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      gap: 12,
                      alignItems: "center",
                      padding: "14px 16px",
                      borderBottom: "1px solid #E4E8EF",
                      cursor: "pointer",
                    }}
                    onClick={() => {
                      setActionSheet(null);
                      setQuickReply("");
                      if (actionSheet.pupilId) {
                        navigate({ to: `/pupils/${actionSheet.pupilId}` as never });
                      }
                    }}
                  >
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: "50%",
                        background: "#EDE9FE",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <IconUser size={18} color="#7C3AED" stroke={1.5} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          fontSize: 14,
                          fontWeight: 600,
                          color: "#0B1F3A",
                          ...POPPINS,
                        }}
                      >
                        View pupil profile
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          color: "#9CA3AF",
                          marginTop: 2,
                          ...POPPINS,
                        }}
                      >
                        {actionSheet.pupilName ?? "Pupil"}'s full profile and history
                      </div>
                    </div>
                    <IconChevronRight size={16} color="#C7D0DC" stroke={2} />
                  </div>
                  <div
                    style={{
                      display: "flex",
                      gap: 12,
                      alignItems: "center",
                      padding: "14px 16px",
                      borderBottom: "1px solid #E4E8EF",
                      cursor: "pointer",
                    }}
                    onClick={() => {
                      setActionSheet(null);
                      setQuickReply("");
                      navigate({ to: "/schedule" as never });
                    }}
                  >
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: "50%",
                        background: "#EFF6FF",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <IconCalendar size={18} color="#1877D6" stroke={1.5} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          fontSize: 14,
                          fontWeight: 600,
                          color: "#0B1F3A",
                          ...POPPINS,
                        }}
                      >
                        View on schedule
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          color: "#9CA3AF",
                          marginTop: 2,
                          ...POPPINS,
                        }}
                      >
                        See the test in your schedule
                      </div>
                    </div>
                    <IconChevronRight size={16} color="#C7D0DC" stroke={2} />
                  </div>
                  {actionSheet.isToday && actionSheet.pupilPhone && !actionSheet.testResult && (
                    <div
                      style={{
                        display: "flex",
                        gap: 12,
                        alignItems: "center",
                        padding: "14px 16px",
                        cursor: "pointer",
                      }}
                      onClick={() => {
                        if (actionSheet.pupilPhone) {
                          window.open(
                            `sms:${actionSheet.pupilPhone}?body=${encodeURIComponent(
                              `Hi ${actionSheet.pupilName ?? ""}! Just wanted to wish you the very best of luck on your driving test today. You've got this! 🚗✨`
                            )}`,
                            "_blank"
                          );
                        }
                        setActionSheet(null);
                        setQuickReply("");
                      }}
                    >
                      <div
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: "50%",
                          background: "#DCFCE7",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        <IconMessage size={18} color="#15803D" stroke={1.5} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div
                          style={{
                            fontSize: 14,
                            fontWeight: 600,
                            color: "#0B1F3A",
                            ...POPPINS,
                          }}
                        >
                          Send good luck text 🍀
                        </div>
                        <div
                          style={{
                            fontSize: 11,
                            color: "#9CA3AF",
                            marginTop: 2,
                            ...POPPINS,
                          }}
                        >
                          Wish {actionSheet.pupilName ?? "them"} luck on their test
                        </div>
                      </div>
                      <IconChevronRight size={16} color="#C7D0DC" stroke={2} />
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  style={{
                    margin: "12px 16px 0",
                    width: "calc(100% - 32px)",
                    background: "#fff",
                    color: "#0B1F3A",
                    borderRadius: 8,
                    padding: 13,
                    fontSize: 14,
                    fontWeight: 700,
                    border: "1px solid #E4E8EF",
                    cursor: "pointer",
                    ...POPPINS,
                  }}
                  onClick={() => {
                    setActionSheet(null);
                    setQuickReply("");
                  }}
                >
                  Dismiss
                </button>
              </>
            ) : actionSheet.isEnquiry ? (
              <>
                <div
                  style={{
                    margin: "16px 16px 8px",
                    background: "linear-gradient(135deg, #14509E, #0B1F3A)",
                    borderRadius: 8,
                    padding: 16,
                    boxShadow: "0 4px 0 #091628",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <div
                      style={{
                        background: "rgba(255,255,255,0.2)",
                        borderRadius: 8,
                        padding: "4px 10px",
                      }}
                    >
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 800,
                          color: "#fff",
                          ...POPPINS,
                        }}
                      >
                        🎉 NEW ENQUIRY
                      </span>
                    </div>
                    {actionSheet.receivedAt && (
                      <span
                        style={{
                          fontSize: 11,
                          color: "rgba(255,255,255,0.6)",
                          ...POPPINS,
                        }}
                      >
                        {timeAgo(actionSheet.receivedAt)}
                      </span>
                    )}
                  </div>
                  <div
                    style={{
                      fontSize: 22,
                      fontWeight: 800,
                      color: "#fff",
                      marginTop: 10,
                      letterSpacing: -0.3,
                      ...POPPINS,
                    }}
                  >
                    {actionSheet.enquirerName ?? "New enquiry"}
                  </div>
                  <div
                    style={{
                      marginTop: 12,
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 8,
                    }}
                  >
                    {actionSheet.enquirerPostcode && (
                      <div
                        style={{
                          background: "rgba(255,255,255,0.15)",
                          borderRadius: 8,
                          padding: "10px 12px",
                        }}
                      >
                        <div
                          style={{
                            fontSize: 9,
                            fontWeight: 700,
                            color: "rgba(255,255,255,0.6)",
                            letterSpacing: "0.08em",
                            marginBottom: 4,
                            ...POPPINS,
                          }}
                        >
                          AREA
                        </div>
                        <div
                          style={{
                            fontSize: 13,
                            fontWeight: 700,
                            color: "#fff",
                            ...POPPINS,
                          }}
                        >
                          {actionSheet.enquirerPostcode}
                        </div>
                      </div>
                    )}
                    {actionSheet.transmission && (
                      <div
                        style={{
                          background: "rgba(255,255,255,0.15)",
                          borderRadius: 8,
                          padding: "10px 12px",
                        }}
                      >
                        <div
                          style={{
                            fontSize: 9,
                            fontWeight: 700,
                            color: "rgba(255,255,255,0.6)",
                            letterSpacing: "0.08em",
                            marginBottom: 4,
                            ...POPPINS,
                          }}
                        >
                          TRANSMISSION
                        </div>
                        <div
                          style={{
                            fontSize: 13,
                            fontWeight: 700,
                            color: "#fff",
                            ...POPPINS,
                          }}
                        >
                          {actionSheet.transmission.charAt(0).toUpperCase() +
                            actionSheet.transmission.slice(1)}
                        </div>
                      </div>
                    )}
                    {actionSheet.enquirerPhone && (
                      <div
                        style={{
                          background: "rgba(255,255,255,0.15)",
                          borderRadius: 8,
                          padding: "10px 12px",
                        }}
                      >
                        <div
                          style={{
                            fontSize: 9,
                            fontWeight: 700,
                            color: "rgba(255,255,255,0.6)",
                            letterSpacing: "0.08em",
                            marginBottom: 4,
                            ...POPPINS,
                          }}
                        >
                          PHONE
                        </div>
                        <div
                          style={{
                            fontSize: 13,
                            fontWeight: 700,
                            color: "#fff",
                            ...POPPINS,
                          }}
                        >
                          {actionSheet.enquirerPhone}
                        </div>
                      </div>
                    )}
                    {actionSheet.enquirerEmail && (
                      <div
                        style={{
                          background: "rgba(255,255,255,0.15)",
                          borderRadius: 8,
                          padding: "10px 12px",
                          gridColumn: actionSheet.enquirerPhone ? undefined : "span 2 / span 2",
                        }}
                      >
                        <div
                          style={{
                            fontSize: 9,
                            fontWeight: 700,
                            color: "rgba(255,255,255,0.6)",
                            letterSpacing: "0.08em",
                            marginBottom: 4,
                            ...POPPINS,
                          }}
                        >
                          EMAIL
                        </div>
                        <div
                          style={{
                            fontSize:
                              actionSheet.enquirerEmail.length > 24 ? 11 : 13,
                            fontWeight: 700,
                            color: "#fff",
                            ...POPPINS,
                          }}
                        >
                          {actionSheet.enquirerEmail}
                        </div>
                      </div>
                    )}
                  </div>
                  {actionSheet.message && (
                    <div
                      style={{
                        marginTop: 10,
                        background: "rgba(255,255,255,0.12)",
                        borderRadius: 8,
                        padding: "10px 12px",
                      }}
                    >
                      <div
                        style={{
                          fontSize: 9,
                          fontWeight: 700,
                          color: "rgba(255,255,255,0.6)",
                          letterSpacing: "0.08em",
                          marginBottom: 4,
                          ...POPPINS,
                        }}
                      >
                        MESSAGE
                      </div>
                      <div
                        style={{
                          fontSize: 12,
                          color: "rgba(255,255,255,0.85)",
                          lineHeight: 1.5,
                          fontStyle: "italic",
                          ...POPPINS,
                        }}
                      >
                        {actionSheet.message}
                      </div>
                    </div>
                  )}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: "#9CA3AF",
                    textTransform: "uppercase",
                    padding: "8px 16px 6px",
                    ...POPPINS,
                  }}
                >
                  RESPOND
                </div>
                <div
                  style={{
                    margin: "0 16px",
                    background: "#fff",
                    borderRadius: 8,
                    border: "1px solid #E4E8EF",
                    overflow: "hidden",
                  }}
                >
                  {actionSheet.enquirerPhone && (
                    <div
                      style={{
                        display: "flex",
                        gap: 12,
                        alignItems: "center",
                        padding: "14px 16px",
                        borderBottom: "1px solid #E4E8EF",
                        cursor: "pointer",
                      }}
                      onClick={() => {
                        window.open(`tel:${actionSheet.enquirerPhone}`, "_blank");
                        setActionSheet(null);
                      }}
                    >
                      <div
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: "50%",
                          background: "#DCFCE7",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        <IconPhone size={18} color="#15803D" stroke={1.5} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div
                          style={{
                            fontSize: 14,
                            fontWeight: 600,
                            color: "#0B1F3A",
                            ...POPPINS,
                          }}
                        >
                          Call now 📞
                        </div>
                        <div
                          style={{
                            fontSize: 11,
                            color: "#9CA3AF",
                            marginTop: 2,
                            ...POPPINS,
                          }}
                        >
                          {actionSheet.enquirerPhone}
                        </div>
                      </div>
                      <IconChevronRight size={16} color="#C7D0DC" stroke={2} />
                    </div>
                  )}
                  {actionSheet.enquirerPhone && (
                    <div
                      style={{
                        display: "flex",
                        gap: 12,
                        alignItems: "center",
                        padding: "14px 16px",
                        borderBottom: "1px solid #E4E8EF",
                        cursor: "pointer",
                      }}
                      onClick={() => {
                        const name = actionSheet.enquirerName ?? "";
                        window.open(
                          `sms:${actionSheet.enquirerPhone}?body=${encodeURIComponent(
                            `Hi ${name}, thanks for your enquiry about driving lessons! I'd love to help. When would be a good time for a quick chat? 🚗`
                          )}`,
                          "_blank"
                        );
                        setActionSheet(null);
                      }}
                    >
                      <div
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: "50%",
                          background: "#EFF6FF",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        <IconMessage size={18} color="#1877D6" stroke={1.5} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div
                          style={{
                            fontSize: 14,
                            fontWeight: 600,
                            color: "#0B1F3A",
                            ...POPPINS,
                          }}
                        >
                          Send a text
                        </div>
                        <div
                          style={{
                            fontSize: 11,
                            color: "#9CA3AF",
                            marginTop: 2,
                            ...POPPINS,
                          }}
                        >
                          Reply to their enquiry
                        </div>
                      </div>
                      <IconChevronRight size={16} color="#C7D0DC" stroke={2} />
                    </div>
                  )}
                  <div
                    style={{
                      display: "flex",
                      gap: 12,
                      alignItems: "center",
                      padding: "14px 16px",
                      cursor: "pointer",
                    }}
                    onClick={() => {
                      setActionSheet(null);
                      navigate({ to: "/enquiries" as never });
                    }}
                  >
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: "50%",
                        background: "#FEF3C7",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <IconExternalLink size={18} color="#D68A1B" stroke={1.5} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          fontSize: 14,
                          fontWeight: 600,
                          color: "#0B1F3A",
                          ...POPPINS,
                        }}
                      >
                        More details →
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          color: "#9CA3AF",
                          marginTop: 2,
                          ...POPPINS,
                        }}
                      >
                        Open full enquiry record
                      </div>
                    </div>
                    <IconChevronRight size={16} color="#C7D0DC" stroke={2} />
                  </div>
                </div>
                <button
                  type="button"
                  style={{
                    margin: "12px 16px 0",
                    width: "calc(100% - 32px)",
                    background: "#fff",
                    color: "#0B1F3A",
                    borderRadius: 8,
                    padding: 13,
                    fontSize: 14,
                    fontWeight: 700,
                    border: "1px solid #E4E8EF",
                    cursor: "pointer",
                    ...POPPINS,
                  }}
                  onClick={() => {
                    setActionSheet(null);
                    setQuickReply("");
                  }}
                >
                  Cancel
                </button>
              </>
            ) : actionSheet.isJobOffer ? (
              <>
                <div
                  style={{
                    margin: "16px 16px 8px",
                    background: "#fff",
                    borderRadius: 8,
                    border: "1px solid #E4E8EF",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      height: 6,
                      background: "linear-gradient(90deg, #1877D6, #14509E)",
                    }}
                  />
                  <div style={{ padding: "14px 16px" }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: 10,
                      }}
                    >
                      <div
                        style={{
                          background: "#EFF6FF",
                          color: "#1877D6",
                          fontSize: 10,
                          fontWeight: 800,
                          borderRadius: 8,
                          padding: "3px 10px",
                          ...POPPINS,
                        }}
                      >
                        💼 JOB OFFER
                      </div>
                      {actionSheet.expiresAt && (
                        <div
                          style={{
                            fontSize: 11,
                            color: "#CC2229",
                            ...POPPINS,
                          }}
                        >
                          Expires {timeAgo(actionSheet.expiresAt)}
                        </div>
                      )}
                    </div>
                    <div
                      style={{
                        fontSize: 18,
                        fontWeight: 800,
                        color: "#0B1F3A",
                        letterSpacing: -0.3,
                        marginBottom: 12,
                        ...POPPINS,
                      }}
                    >
                      {actionSheet.jobTitle}
                    </div>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: 8,
                        marginBottom: 12,
                      }}
                    >
                      {actionSheet.area && (
                        <div
                          style={{
                            background: "#EEF2F7",
                            borderRadius: 8,
                            padding: "10px 12px",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 4,
                              fontSize: 9,
                              fontWeight: 700,
                              color: "#9CA3AF",
                              letterSpacing: 0.08,
                              textTransform: "uppercase",
                              marginBottom: 2,
                              ...POPPINS,
                            }}
                          >
                            <IconMapPin size={12} color="#9CA3AF" stroke={1.5} />
                            AREA
                          </div>
                          <div
                            style={{
                              fontSize: 13,
                              fontWeight: 700,
                              color: "#0B1F3A",
                              ...POPPINS,
                            }}
                          >
                            {actionSheet.area}
                          </div>
                        </div>
                      )}
                      {actionSheet.transmission && (
                        <div
                          style={{
                            background: "#EEF2F7",
                            borderRadius: 8,
                            padding: "10px 12px",
                          }}
                        >
                          <div
                            style={{
                              fontSize: 9,
                              fontWeight: 700,
                              color: "#9CA3AF",
                              letterSpacing: 0.08,
                              textTransform: "uppercase",
                              marginBottom: 2,
                              ...POPPINS,
                            }}
                          >
                            TRANSMISSION
                          </div>
                          <div
                            style={{
                              fontSize: 13,
                              fontWeight: 700,
                              color: "#0B1F3A",
                              ...POPPINS,
                            }}
                          >
                            {String(actionSheet.transmission).toUpperCase()}
                          </div>
                        </div>
                      )}
                      {actionSheet.lessonDate && (
                        <div
                          style={{
                            background: "#EEF2F7",
                            borderRadius: 8,
                            padding: "10px 12px",
                          }}
                        >
                          <div
                            style={{
                              fontSize: 9,
                              fontWeight: 700,
                              color: "#9CA3AF",
                              letterSpacing: 0.08,
                              textTransform: "uppercase",
                              marginBottom: 2,
                              ...POPPINS,
                            }}
                          >
                            DATE
                          </div>
                          <div
                            style={{
                              fontSize: 13,
                              fontWeight: 700,
                              color: "#0B1F3A",
                              ...POPPINS,
                            }}
                          >
                            {formatDate(actionSheet.lessonDate)}
                          </div>
                        </div>
                      )}
                      {actionSheet.lessonTime && (
                        <div
                          style={{
                            background: "#EEF2F7",
                            borderRadius: 8,
                            padding: "10px 12px",
                          }}
                        >
                          <div
                            style={{
                              fontSize: 9,
                              fontWeight: 700,
                              color: "#9CA3AF",
                              letterSpacing: 0.08,
                              textTransform: "uppercase",
                              marginBottom: 2,
                              ...POPPINS,
                            }}
                          >
                            TIME
                          </div>
                          <div
                            style={{
                              fontSize: 13,
                              fontWeight: 700,
                              color: "#0B1F3A",
                              ...POPPINS,
                            }}
                          >
                            {actionSheet.lessonTime}
                          </div>
                        </div>
                      )}
                      {actionSheet.duration && (
                        <div
                          style={{
                            background: "#EEF2F7",
                            borderRadius: 8,
                            padding: "10px 12px",
                          }}
                        >
                          <div
                            style={{
                              fontSize: 9,
                              fontWeight: 700,
                              color: "#9CA3AF",
                              letterSpacing: 0.08,
                              textTransform: "uppercase",
                              marginBottom: 2,
                              ...POPPINS,
                            }}
                          >
                            DURATION
                          </div>
                          <div
                            style={{
                              fontSize: 13,
                              fontWeight: 700,
                              color: "#0B1F3A",
                              ...POPPINS,
                            }}
                          >
                            {typeof actionSheet.duration === "number"
                              ? `${actionSheet.duration} hrs`
                              : actionSheet.duration}
                          </div>
                        </div>
                      )}
                      {actionSheet.rate && (
                        <div
                          style={{
                            background: "#F0FDF4",
                            border: "1px solid #DCFCE7",
                            borderRadius: 8,
                            padding: "10px 12px",
                          }}
                        >
                          <div
                            style={{
                              fontSize: 9,
                              fontWeight: 700,
                              color: "#15803D",
                              letterSpacing: 0.08,
                              textTransform: "uppercase",
                              marginBottom: 2,
                              ...POPPINS,
                            }}
                          >
                            RATE
                          </div>
                          <div
                            style={{
                              fontSize: 13,
                              fontWeight: 700,
                              color: "#15803D",
                              ...POPPINS,
                            }}
                          >
                            £{actionSheet.rate}/hr
                          </div>
                        </div>
                      )}
                    </div>
                    {actionSheet.description && (
                      <div
                        style={{
                          background: "#F8FAFC",
                          borderRadius: 8,
                          padding: "10px 12px",
                          marginBottom: 8,
                        }}
                      >
                        <div
                          style={{
                            fontSize: 9,
                            fontWeight: 700,
                            color: "#9CA3AF",
                            letterSpacing: 0.08,
                            textTransform: "uppercase",
                            marginBottom: 4,
                            ...POPPINS,
                          }}
                        >
                          DETAILS
                        </div>
                        <div
                          style={{
                            fontSize: 12,
                            color: "#6B7686",
                            lineHeight: 1.5,
                            ...POPPINS,
                          }}
                        >
                          {actionSheet.description}
                        </div>
                      </div>
                    )}
                    {actionSheet.postedBy && (
                      <div
                        style={{
                          fontSize: 11,
                          color: "#9CA3AF",
                          marginBottom: 4,
                          ...POPPINS,
                        }}
                      >
                        Posted by {actionSheet.postedBy}
                      </div>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  style={{
                    margin: "12px 16px 0",
                    width: "calc(100% - 32px)",
                    background: "#15803D",
                    color: "#fff",
                    borderRadius: 20,
                    padding: 13,
                    fontSize: 14,
                    fontWeight: 700,
                    border: "none",
                    cursor: "pointer",
                    ...POPPINS,
                    boxShadow: "0 3px 0 #14532D",
                  }}
                  onClick={async () => {
                    if (actionSheet.jobId) {
                      await supabase
                        .from("instructor_jobs")
                        .update({ status: "accepted" })
                        .eq("id", actionSheet.jobId);
                    }
                    toast.success("Job accepted! ✓");
                    setActionSheet(null);
                    setQuickReply("");
                    navigate({ to: "/jobs" as never });
                  }}
                >
                  Accept job ✓
                </button>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: "#9CA3AF",
                    textTransform: "uppercase",
                    padding: "8px 16px 6px",
                    ...POPPINS,
                  }}
                >
                  RESPOND
                </div>
                <div
                  style={{
                    margin: "0 16px",
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 8,
                  }}
                >
                  <button
                    type="button"
                    style={{
                      background: "#fff",
                      border: "1px solid #E4E8EF",
                      borderRadius: 8,
                      padding: 13,
                      fontSize: 14,
                      fontWeight: 700,
                      color: "#CC2229",
                      cursor: "pointer",
                      ...POPPINS,
                    }}
                    onClick={async () => {
                      if (actionSheet.jobId) {
                        await supabase
                          .from("job_offers")
                          .update({ status: "declined" })
                          .eq("id", actionSheet.jobId);
                      }
                      toast.info("Job declined");
                      setActionSheet(null);
                      setQuickReply("");
                    }}
                  >
                    Decline
                  </button>
                  <button
                    type="button"
                    style={{
                      background: "#1877D6",
                      border: "none",
                      borderRadius: 8,
                      padding: 13,
                      fontSize: 14,
                      fontWeight: 700,
                      color: "#fff",
                      cursor: "pointer",
                      boxShadow: "0 3px 0 #0F52A8",
                      ...POPPINS,
                    }}
                    onClick={() => {
                      setActionSheet(null);
                      setQuickReply("");
                      navigate({ to: "/jobs" as never });
                    }}
                  >
                    View full details →
                  </button>
                </div>
                <div
                  style={{
                    textAlign: "center",
                    marginTop: 10,
                    fontSize: 12,
                    color: "#9CA3AF",
                    cursor: "pointer",
                    ...POPPINS,
                  }}
                  onClick={() => {
                    setActionSheet(null);
                    setQuickReply("");
                  }}
                >
                  Dismiss
                </div>
              </>
            ) : actionSheet.isOverduePayment ? (
              <>
                {/* Overdue payment header card */}
                <div
                  style={{
                    margin: "16px 16px 8px",
                    background: "#fff",
                    borderRadius: 16,
                    border: "1px solid #E4E8EF",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      height: 6,
                      background: "linear-gradient(90deg, #F59E0B, #D68A1B)",
                    }}
                  />
                  <div style={{ padding: "14px 16px" }}>
                    <div
                      style={{
                        display: "flex",
                        gap: 10,
                        alignItems: "center",
                        marginBottom: 12,
                      }}
                    >
                      <div
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: "50%",
                          background: "#FEF3C7",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 18,
                          fontWeight: 700,
                          color: "#92400E",
                          ...POPPINS,
                        }}
                      >
                        {actionSheet.pupilName?.[0] ?? "£"}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div
                          style={{
                            fontSize: 16,
                            fontWeight: 800,
                            color: "#0B1F3A",
                            ...POPPINS,
                          }}
                        >
                          {actionSheet.pupilName ?? "Pupil"}
                        </div>
                        <div
                          style={{
                            fontSize: 11,
                            color: "#9CA3AF",
                            marginTop: 2,
                            ...POPPINS,
                          }}
                        >
                          Outstanding balance
                        </div>
                      </div>
                    </div>
                    <div
                      style={{
                        background: "#FEF3C7",
                        borderRadius: 12,
                        padding: "14px 16px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: 10,
                      }}
                    >
                      <div>
                        <div
                          style={{
                            fontSize: 11,
                            fontWeight: 600,
                            color: "#92400E",
                            textTransform: "uppercase",
                            letterSpacing: "0.08em",
                            ...POPPINS,
                          }}
                        >
                          Amount owed
                        </div>
                        {actionSheet.lessonCount && (
                          <div
                            style={{
                              fontSize: 11,
                              color: "rgba(146, 64, 14, 0.7)",
                              marginTop: 2,
                              ...POPPINS,
                            }}
                          >
                            {actionSheet.lessonCount} unpaid lesson
                            {actionSheet.lessonCount > 1 ? "s" : ""}
                          </div>
                        )}
                      </div>
                      <div
                        style={{
                          fontSize: 26,
                          fontWeight: 800,
                          color: "#92400E",
                          ...POPPINS,
                        }}
                      >
                        £{Number(actionSheet.amountOwed || 0).toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: "#9CA3AF",
                    textTransform: "uppercase",
                    padding: "8px 16px 6px",
                    ...POPPINS,
                  }}
                >
                  WHAT WOULD YOU LIKE TO DO?
                </div>
                <div
                  style={{
                    margin: "0 16px",
                    background: "#fff",
                    borderRadius: 16,
                    border: "1px solid #E4E8EF",
                    overflow: "hidden",
                  }}
                >
                  {/* Take a payment */}
                  <div
                    style={{
                      display: "flex",
                      gap: 12,
                      alignItems: "center",
                      padding: "14px 16px",
                      borderBottom: "1px solid #E4E8EF",
                      cursor: "pointer",
                    }}
                    onClick={() => {
                      setActionSheet(null);
                      if (actionSheet.pupilId) {
                        navigate({ to: `/pupils/${actionSheet.pupilId}` as never });
                      } else {
                        navigate({ to: "/payments" as never });
                      }
                    }}
                  >
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: "50%",
                        background: "#DCFCE7",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <IconCurrencyPound size={18} color="#15803D" stroke={1.5} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          fontSize: 14,
                          fontWeight: 600,
                          color: "#0B1F3A",
                          ...POPPINS,
                        }}
                      >
                        Take a payment 💳
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          color: "#9CA3AF",
                          marginTop: 2,
                          ...POPPINS,
                        }}
                      >
                        Record payment from {actionSheet.pupilName ?? "pupil"}
                      </div>
                    </div>
                    <IconChevronRight size={16} color="#C7D0DC" stroke={2} />
                  </div>
                  {/* Send text reminder */}
                  <div
                    style={{
                      display: "flex",
                      gap: 12,
                      alignItems: "center",
                      padding: "14px 16px",
                      borderBottom: "1px solid #E4E8EF",
                      cursor: "pointer",
                    }}
                    onClick={() => {
                      if (!actionSheet.pupilPhone) {
                        toast.error("No phone number on record");
                        return;
                      }
                      const name = actionSheet.pupilName ?? "";
                      const amount = actionSheet.amountOwed
                        ? `£${Number(actionSheet.amountOwed).toFixed(2)}`
                        : "an outstanding balance";
                      window.open(
                        `sms:${actionSheet.pupilPhone}?body=${encodeURIComponent(
                          `Hi ${name}, just a friendly reminder that you have ${amount} outstanding for your driving lessons. Please arrange payment at your earliest convenience. Thanks!`
                        )}`,
                        "_blank"
                      );
                      setActionSheet(null);
                    }}
                  >
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: "50%",
                        background: "#EFF6FF",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <IconMessage size={18} color="#1877D6" stroke={1.5} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          fontSize: 14,
                          fontWeight: 600,
                          color: "#0B1F3A",
                          ...POPPINS,
                        }}
                      >
                        Send text reminder 💬
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          color: "#9CA3AF",
                          marginTop: 2,
                          ...POPPINS,
                        }}
                      >
                        SMS {actionSheet.pupilName ?? "pupil"} about payment
                      </div>
                    </div>
                    <IconChevronRight size={16} color="#C7D0DC" stroke={2} />
                  </div>
                  {/* Send email reminder */}
                  <div
                    style={{
                      display: "flex",
                      gap: 12,
                      alignItems: "center",
                      padding: "14px 16px",
                      borderBottom: "1px solid #E4E8EF",
                      cursor: "pointer",
                    }}
                    onClick={() => {
                      if (!actionSheet.pupilEmail) {
                        toast.error("No email address on record");
                        return;
                      }
                      const name = actionSheet.pupilName ?? "";
                      const amount = actionSheet.amountOwed
                        ? `£${Number(actionSheet.amountOwed).toFixed(2)}`
                        : "an outstanding balance";
                      window.open(
                        `mailto:${actionSheet.pupilEmail}?subject=${encodeURIComponent(
                          "Driving lesson payment reminder"
                        )}&body=${encodeURIComponent(
                          `Hi ${name},\n\nThis is a friendly reminder that you have ${amount} outstanding for your driving lessons.\n\nPlease arrange payment at your earliest convenience.\n\nThank you!\n\nKind regards`
                        )}`,
                        "_blank"
                      );
                      setActionSheet(null);
                    }}
                  >
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: "50%",
                        background: "#EDE9FE",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <IconMail size={18} color="#7C3AED" stroke={1.5} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          fontSize: 14,
                          fontWeight: 600,
                          color: "#0B1F3A",
                          ...POPPINS,
                        }}
                      >
                        Send email reminder 📧
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          color: actionSheet.pupilEmail ? "#9CA3AF" : "#CC2229",
                          marginTop: 2,
                          ...POPPINS,
                        }}
                      >
                        {actionSheet.pupilEmail ?? "No email on record"}
                      </div>
                    </div>
                    <IconChevronRight size={16} color="#C7D0DC" stroke={2} />
                  </div>
                  {/* View pupil record */}
                  <div
                    style={{
                      display: "flex",
                      gap: 12,
                      alignItems: "center",
                      padding: "14px 16px",
                      cursor: "pointer",
                    }}
                    onClick={() => {
                      setActionSheet(null);
                      if (actionSheet.pupilId) {
                        navigate({ to: `/pupils/${actionSheet.pupilId}` as never });
                      } else {
                        navigate({ to: "/pupils" as never });
                      }
                    }}
                  >
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: "50%",
                        background: "#FEF3C7",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <IconUser size={18} color="#D68A1B" stroke={1.5} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          fontSize: 14,
                          fontWeight: 600,
                          color: "#0B1F3A",
                          ...POPPINS,
                        }}
                      >
                        View pupil record
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          color: "#9CA3AF",
                          marginTop: 2,
                          ...POPPINS,
                        }}
                      >
                        See full payment history
                      </div>
                    </div>
                    <IconChevronRight size={16} color="#C7D0DC" stroke={2} />
                  </div>
                </div>
                <div
                  style={{
                    textAlign: "center",
                    marginTop: 10,
                    fontSize: 12,
                    color: "#9CA3AF",
                    cursor: "pointer",
                    ...POPPINS,
                  }}
                  onClick={() => {
                    setActionSheet(null);
                    setQuickReply("");
                  }}
                >
                  Dismiss
                </div>
              </>
            ) : actionSheet.isLessonStarting ? (
              <>
                {/* Lesson starting header card */}
                <div
                  style={{
                    margin: "16px 16px 8px",
                    background: "linear-gradient(135deg, #14509E, #0B1F3A)",
                    borderRadius: 16,
                    padding: 16,
                    boxShadow: "0 4px 0 #091628",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <div
                      style={{
                        background: "rgba(255,255,255,0.2)",
                        borderRadius: 20,
                        padding: "4px 10px",
                        fontSize: 10,
                        fontWeight: 800,
                        color: "#fff",
                        ...POPPINS,
                      }}
                    >
                      {typeof actionSheet.minutesUntil === "number" && actionSheet.minutesUntil <= 10
                        ? "🔔 STARTING SOON"
                        : "📅 UPCOMING LESSON"}
                    </div>
                    {actionSheet.lessonTime && (
                      <span
                        style={{
                          fontSize: 11,
                          color: "rgba(255,255,255,0.6)",
                          ...POPPINS,
                        }}
                      >
                        {formatTime12hr(actionSheet.lessonTime)}
                      </span>
                    )}
                  </div>
                  <div
                    style={{
                      fontSize: 22,
                      fontWeight: 800,
                      color: "#fff",
                      marginTop: 10,
                      letterSpacing: -0.3,
                      ...POPPINS,
                    }}
                  >
                    {actionSheet.pupilName ?? "Next lesson"}
                  </div>
                  {typeof actionSheet.minutesUntil === "number" && (
                    <div
                      style={{
                        marginTop: 6,
                        display: "flex",
                        gap: 6,
                        alignItems: "center",
                      }}
                    >
                      <IconClock size={13} color="rgba(255,255,255,0.7)" stroke={1.5} />
                      <span
                        style={{
                          fontSize: 12,
                          color: "rgba(255,255,255,0.8)",
                          ...POPPINS,
                        }}
                      >
                        Starting in {actionSheet.minutesUntil} minutes
                      </span>
                    </div>
                  )}
                  {actionSheet.pickupLocation && (
                    <div
                      style={{
                        marginTop: 8,
                        background: "rgba(255,255,255,0.12)",
                        borderRadius: 10,
                        padding: "10px 12px",
                        display: "flex",
                        gap: 8,
                        alignItems: "flex-start",
                      }}
                    >
                      <IconMapPin
                        size={14}
                        color="rgba(255,255,255,0.7)"
                        stroke={1.5}
                        style={{ flexShrink: 0, marginTop: 1 }}
                      />
                      <div>
                        <div
                          style={{
                            fontSize: 9,
                            fontWeight: 700,
                            color: "rgba(255,255,255,0.5)",
                            letterSpacing: "0.08em",
                            marginBottom: 3,
                            ...POPPINS,
                          }}
                        >
                          PICKUP LOCATION
                        </div>
                        <div
                          style={{
                            fontSize: 13,
                            fontWeight: 600,
                            color: "#fff",
                            lineHeight: 1.4,
                            ...POPPINS,
                          }}
                        >
                          {actionSheet.pickupLocation}
                        </div>
                      </div>
                    </div>
                  )}
                  {actionSheet.pickupLocation && (
                    <button
                      type="button"
                      style={{
                        marginTop: 12,
                        width: "100%",
                        background: "rgba(255,255,255,0.2)",
                        borderRadius: 20,
                        padding: 11,
                        border: "none",
                        cursor: "pointer",
                        display: "flex",
                        gap: 8,
                        alignItems: "center",
                        justifyContent: "center",
                        fontFamily: "Poppins, sans-serif",
                      }}
                      onClick={() => {
                        const addr = encodeURIComponent(actionSheet.pickupLocation ?? "");
                        window.open(`maps://?daddr=${addr}&dirflg=d`, "_blank");
                      }}
                    >
                      <IconNavigation size={16} color="#fff" stroke={1.5} />
                      <span style={{ fontSize: 13, fontWeight: 700, color: "#fff", ...POPPINS }}>
                        Navigate to pickup
                      </span>
                    </button>
                  )}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: "#9CA3AF",
                    textTransform: "uppercase",
                    padding: "8px 16px 6px",
                    ...POPPINS,
                  }}
                >
                  Quick actions
                </div>
                <div
                  style={{
                    margin: "0 16px",
                    background: "#fff",
                    borderRadius: 16,
                    border: "1px solid #E4E8EF",
                    overflow: "hidden",
                  }}
                >
                  {/* Call pupil */}
                  <div
                    style={{
                      display: "flex",
                      gap: 12,
                      alignItems: "center",
                      padding: "14px 16px",
                      borderBottom: "1px solid #E4E8EF",
                      cursor: "pointer",
                    }}
                    onClick={() => {
                      if (!actionSheet.pupilPhone) {
                        toast.error("No phone number on record");
                        return;
                      }
                      window.open(`tel:${actionSheet.pupilPhone}`, "_blank");
                      setActionSheet(null);
                    }}
                  >
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: "50%",
                        background: "#DCFCE7",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <IconPhone size={18} color="#15803D" stroke={1.5} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          fontSize: 14,
                          fontWeight: 600,
                          color: "#0B1F3A",
                          ...POPPINS,
                        }}
                      >
                        Call {actionSheet.pupilName ?? "pupil"} 📞
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          color: "#9CA3AF",
                          marginTop: 2,
                          ...POPPINS,
                        }}
                      >
                        {actionSheet.pupilPhone ?? "No number on record"}
                      </div>
                    </div>
                    <IconChevronRight size={16} color="#C7D0DC" stroke={2} />
                  </div>
                  {/* Send text */}
                  <div
                    style={{
                      display: "flex",
                      gap: 12,
                      alignItems: "center",
                      padding: "14px 16px",
                      borderBottom: "1px solid #E4E8EF",
                      cursor: "pointer",
                    }}
                    onClick={() => {
                      if (!actionSheet.pupilPhone) {
                        toast.error("No phone number on record");
                        return;
                      }
                      window.open(
                        `sms:${actionSheet.pupilPhone}?body=${encodeURIComponent(
                          `Hi ${actionSheet.pupilName ?? ""}! Just a reminder ` +
                            `your driving lesson is ` +
                            (actionSheet.minutesUntil
                              ? `in ${actionSheet.minutesUntil} minutes. `
                              : "coming up soon. ") +
                            `See you shortly! 🚗`
                        )}`,
                        "_blank"
                      );
                      setActionSheet(null);
                    }}
                  >
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: "50%",
                        background: "#EFF6FF",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <IconMessage size={18} color="#1877D6" stroke={1.5} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          fontSize: 14,
                          fontWeight: 600,
                          color: "#0B1F3A",
                          ...POPPINS,
                        }}
                      >
                        Send reminder text 💬
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          color: "#9CA3AF",
                          marginTop: 2,
                          ...POPPINS,
                        }}
                      >
                        Let {actionSheet.pupilName ?? "them"} know you're on your way
                      </div>
                    </div>
                    <IconChevronRight size={16} color="#C7D0DC" stroke={2} />
                  </div>
                  {/* View lesson */}
                  <div
                    style={{
                      display: "flex",
                      gap: 12,
                      alignItems: "center",
                      padding: "14px 16px",
                      cursor: "pointer",
                    }}
                    onClick={() => {
                      setActionSheet(null);
                      if (actionSheet.lessonId) {
                        navigate({ to: `/lessons/${actionSheet.lessonId}` as never });
                      } else {
                        navigate({ to: "/schedule" as never });
                      }
                    }}
                  >
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: "50%",
                        background: "#EDE9FE",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <IconCalendar size={18} color="#7C3AED" stroke={1.5} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          fontSize: 14,
                          fontWeight: 600,
                          color: "#0B1F3A",
                          ...POPPINS,
                        }}
                      >
                        View lesson details
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          color: "#9CA3AF",
                          marginTop: 2,
                          ...POPPINS,
                        }}
                      >
                        See full lesson information
                      </div>
                    </div>
                    <IconChevronRight size={16} color="#C7D0DC" stroke={2} />
                  </div>
                </div>
                <button
                  type="button"
                  style={{
                    margin: "12px 16px 0",
                    width: "calc(100% - 32px)",
                    background: "#fff",
                    color: "#0B1F3A",
                    borderRadius: 20,
                    padding: 13,
                    fontSize: 14,
                    fontWeight: 700,
                    border: "1px solid #E4E8EF",
                    cursor: "pointer",
                    ...POPPINS,
                  }}
                  onClick={() => {
                    setActionSheet(null);
                    setQuickReply("");
                  }}
                >
                  Dismiss
                </button>
              </>
            ) : (

              <>
                <div
                  style={{
                    margin: "16px 16px 8px",
                    background: "#fff",
                    borderRadius: 8,
                    border: "1px solid #E4E8EF",
                    padding: "14px 16px",
                  }}
                >
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 700,
                      color: "#0B1F3A",
                      ...POPPINS,
                    }}
                  >
                    {typeTitle(actionSheet.notif.type, actionSheet.notif.title)}
                  </div>
                  {actionSheet.notif.body && (
                    <div
                      style={{
                        fontSize: 12,
                        color: "#6B7686",
                        marginTop: 4,
                        ...POPPINS,
                      }}
                    >
                      {actionSheet.notif.body}
                    </div>
                  )}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: "#9CA3AF",
                    textTransform: "uppercase",
                    padding: "8px 16px 6px",
                    ...POPPINS,
                  }}
                >
                  GO TO
                </div>
                <div
                  style={{
                    margin: "0 16px",
                    background: "#fff",
                    borderRadius: 8,
                    border: "1px solid #E4E8EF",
                    overflow: "hidden",
                  }}
                >
                  {actionSheet.options.map((option, idx) => {
                    const isLast = idx === actionSheet.options.length - 1;
                    let iconNode: ReactNode;
                    let iconBg: string;
                    switch (option.icon) {
                      case "reply":
                        iconNode = <IconSend size={20} color="#1877D6" />;
                        iconBg = "#EFF6FF";
                        break;
                      case "calendar":
                        iconNode = <IconCalendar size={20} color="#1877D6" />;
                        iconBg = "#EFF6FF";
                        break;
                      case "message":
                        iconNode = <IconMessage size={20} color="#7C3AED" />;
                        iconBg = "#EDE9FE";
                        break;
                      case "home":
                        iconNode = <IconHome size={20} color="#15803D" />;
                        iconBg = "#DCFCE7";
                        break;
                      case "pupils":
                        iconNode = <IconUsers size={20} color="#1877D6" />;
                        iconBg = "#EFF6FF";
                        break;
                      case "payments":
                        iconNode = <IconCurrencyPound size={20} color="#D68A1B" />;
                        iconBg = "#FEF3C7";
                        break;
                      case "enquiries":
                        iconNode = <IconInbox size={20} color="#CC2229" />;
                        iconBg = "#FEE2E2";
                        break;
                      default:
                        iconNode = <IconBell size={20} color="#6B7280" />;
                        iconBg = "#F3F4F6";
                    }
                    return (
                      <div
                        key={option.route}
                        style={{
                          display: "flex",
                          gap: 12,
                          alignItems: "center",
                          padding: "14px 16px",
                          borderBottom: isLast ? undefined : "1px solid #E4E8EF",
                          cursor: "pointer",
                        }}
                        onClick={() => {
                          setActionSheet(null);
                          setQuickReply("");
                          navigate({ to: option.route as never });
                        }}
                      >
                        <div
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: "50%",
                            background: iconBg,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                          }}
                        >
                          {iconNode}
                        </div>
                        <div
                          style={{
                            fontSize: 14,
                            fontWeight: 600,
                            color: "#0B1F3A",
                            flex: 1,
                            ...POPPINS,
                          }}
                        >
                          {option.label}
                        </div>
                        <IconChevronRight size={16} color="#C7D0DC" stroke={2} />
                      </div>
                    );
                  })}
                </div>
                <button
                  type="button"
                  style={{
                    margin: "12px 16px 0",
                    width: "calc(100% - 32px)",
                    background: "#fff",
                    color: "#0B1F3A",
                    borderRadius: 8,
                    padding: 13,
                    fontSize: 14,
                    fontWeight: 700,
                    border: "1px solid #E4E8EF",
                    cursor: "pointer",
                    ...POPPINS,
                  }}
                  onClick={() => {
                    setActionSheet(null);
                    setQuickReply("");
                  }}
                >
                  Cancel
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
    </DSMTopSheet>
  );
}

import { SkeletonCard } from "@/components/dsm/LoadingSpinner";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { IconChevronRight, IconDotsVertical, IconPlus, IconSearch, IconUsers, IconX } from "@tabler/icons-react";
import { Megaphone, ArrowUpDown } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "../lib/supabaseClient";
import { getPupilBalance } from "@/lib/payments";
import { EmptyState } from "../components/dsm/EmptyState";
import { PageLayout } from "@/components/PageLayout";
import { QuickActionsMenu } from "@/components/dsm/QuickActionsMenu";
import { UnifiedPaymentSheet } from "@/components/payments/UnifiedPaymentSheet";
import { AddLessonSheet } from "@/components/lessons/AddLessonSheet";
import { ConfirmDialog } from "@/components/ConfirmDialog";

import { PupilAvatar, pupilColour } from "@/components/PupilAvatar";
import InstructorTopBar from "@/components/dsm/InstructorTopBar";

export const Route = createFileRoute("/pupils/")({
  head: () => ({
    meta: [
      { title: "Pupils — DSM by EveryDriver" },
      { name: "description", content: "Manage your pupils and their lesson history." },
    ],
  }),
  component: PupilsIndexPage,
});

const POPPINS = { fontFamily: "Poppins, sans-serif" } as const;

interface Pupil {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  lesson_count: number | null;
  account_balance: number | null;
  prepaid_hours: number | null;
  ni_amount_total: number | null;
  ni_amount_paid: number | null;
  lead_source: string | null;
  status: string | null;
  pricing_type: string | null;
  test_date: string | null;
  profile_image_url: string | null;
  calendar_colour: string | null;
}


type StatusKey = "active" | "passed" | "archived";

function displayName(n: string | null | undefined) {
  return (n ?? "").replace(/\s*\.\s*$/, "").trim();
}
// NOTE: DB cleanup SQL (run manually — Lovable Cloud DB tools not available in this session):
//   update pupils set name = trim(trailing '.' from trim(name)) where name like '%.';

function statusBadgeColor(status: StatusKey) {
  if (status === "active") return "#1877D6";
  if (status === "passed") return "#1877D6";
  if (status === "archived") return "#9CA3AF";
  return "#6B7280";
}

function accentColor(status: StatusKey) {
  if (status === "active") return "#1877D6";
  if (status === "passed") return "#1877D6";
  if (status === "archived") return "#9CA3AF";
  return "#9CA3AF";
}

const PILL_BASE = {
  fontSize: 9.5,
  fontWeight: 700,
  borderRadius: 20,
  padding: "3px 8px",
  fontFamily: "Poppins, sans-serif",
  whiteSpace: "nowrap" as const,
};

function pricingPill(pricingType: string | null | undefined, prepaidHours: number) {
  const t = (pricingType ?? "standard").toLowerCase();
  if (t === "block") {
    return { label: `Block · ${prepaidHours} hrs`, bg: "#E6F1FB", fg: "#1877D6" };
  }
  if (t === "national_intensives" || t === "national intensives" || t === "ni") {
    return { label: "NI", bg: "#DDEFE1", fg: "#15803D" };
  }
  if (t === "custom") {
    return { label: "Custom", bg: "#F1F5F9", fg: "#6B7686" };
  }
  return { label: "Standard", bg: "#F1F5F9", fg: "#6B7686" };
}

function formatShortDate(dateString: string) {
  const d = new Date(dateString);
  if (Number.isNaN(d.getTime())) return dateString;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function daysUntil(dateString: string) {
  const [y, m, d] = dateString.slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return Infinity;
  const target = new Date(y, m - 1, d);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

const SORT_LABELS: Record<"name" | "balance" | "next_lesson", string> = {
  name: "Name",
  balance: "Balance",
  next_lesson: "Next lesson",
};

function formatRelativeDate(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  const days = Math.floor(seconds / 86400);
  if (days < 1) return "today";
  if (days === 1) return "yesterday";
  if (days < 7) return `${days} days ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 4) return `${weeks} week${weeks === 1 ? "" : "s"} ago`;
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function PupilsIndexPage() {
  const [pupils, setPupils] = useState<Pupil[] | null>(null);
  const [lessonCountMap, setLessonCountMap] = useState<Record<string, number>>({});
  const [balanceMap, setBalanceMap] = useState<Record<string, number>>({});
  const [hoursMap, setHoursMap] = useState<Record<string, number>>({});
  const [lastPaymentMap, setLastPaymentMap] = useState<Record<string, { amount: number; method: string; date: string }>>({});
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [unifiedPayOpen, setUnifiedPayOpen] = useState(false);
  const [unifiedPayPupilId, setUnifiedPayPupilId] = useState<string | undefined>();
  const [addLessonOpen, setAddLessonOpen] = useState(false);
  const [addLessonPupilId, setAddLessonPupilId] = useState<string | undefined>();
  const [archiveTarget, setArchiveTarget] = useState<{ id: string; name: string } | null>(null);
  const [unreadMap, setUnreadMap] = useState<Record<string, number>>({});
  const [nextLessonMap, setNextLessonMap] = useState<Record<string, string>>({});
  const [testDateMap, setTestDateMap] = useState<Record<string, string>>({});
  const [sortBy, setSortBy] = useState<"name" | "balance" | "next_lesson">("name");
  const navigate = useNavigate();

  // Refresh balances/owing badges whenever a payment is recorded anywhere.
  useEffect(() => {
    const onPaymentRecorded = () => setReloadKey((k) => k + 1);
    window.addEventListener("dsm-payment-recorded", onPaymentRecorded);
    return () => window.removeEventListener("dsm-payment-recorded", onPaymentRecorded);
  }, []);



  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  // Lightweight refreshers so realtime events don't re-trigger the full skeleton load.
  const refreshUnread = useCallback(async (uid: string) => {
    try {
      const { data: unreads } = await supabase
        .from("chat_messages")
        .select("pupil_id")
        .eq("instructor_id", uid)
        .eq("sender_type", "pupil")
        .is("read_at", null)
        .is("deleted_at", null);
      const uMap: Record<string, number> = {};
      (unreads ?? []).forEach((r: any) => {
        if (!r.pupil_id) return;
        uMap[r.pupil_id] = (uMap[r.pupil_id] ?? 0) + 1;
      });
      setUnreadMap(uMap);
    } catch (e) {
      console.error("[pupils] unread refresh crashed", e);
    }
  }, []);

  const refreshNextLessons = useCallback(async (uid: string) => {
    try {
      const { data: nextLessons } = await supabase
        .from("lessons")
        .select("pupil_id, lesson_date")
        .eq("instructor_id", uid)
        .gte("lesson_date", new Date().toISOString().slice(0, 10))
        .in("status", ["confirmed", "pending"])
        .is("deleted_at", null)
        .order("lesson_date", { ascending: true });
      const nlMap: Record<string, string> = {};
      (nextLessons ?? []).forEach((l: any) => {
        if (!l.pupil_id) return;
        if (!nlMap[l.pupil_id]) nlMap[l.pupil_id] = l.lesson_date;
      });
      setNextLessonMap(nlMap);
    } catch (e) {
      console.error("[pupils] next lesson refresh crashed", e);
    }
  }, []);

  const refreshTestDates = useCallback(async (uid: string) => {
    try {
      const { data } = await supabase
        .from("pupils")
        .select("id, test_date")
        .eq("instructor_id", uid);
      const tdMap: Record<string, string> = {};
      (data ?? []).forEach((p: any) => {
        if (p.test_date) tdMap[p.id] = p.test_date as string;
      });
      setTestDateMap(tdMap);
    } catch (e) {
      console.error("[pupils] test date refresh crashed", e);
    }
  }, []);

  const markMessagesRead = useCallback(async (pupilId: string, name: string) => {
    const { data: auth } = await supabase.auth.getUser();
    const uid = auth?.user?.id;
    if (!uid) return;
    // Optimistic: clear the dot immediately.
    setUnreadMap((m) => {
      const next = { ...m };
      delete next[pupilId];
      return next;
    });
    const { error } = await supabase
      .from("chat_messages")
      .update({ read_at: new Date().toISOString() })
      .eq("instructor_id", uid)
      .eq("pupil_id", pupilId)
      .eq("sender_type", "pupil")
      .is("read_at", null)
      .is("deleted_at", null);
    if (error) {
      console.error("[pupils] mark read failed", error);
      toast.error("Couldn't mark messages as read");
      refreshUnread(uid);
      return;
    }
    toast.success(`${name}'s messages marked as read`);
    window.dispatchEvent(new Event("dsm-messages-read"));
  }, [refreshUnread]);



  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    const uid = userId;
    const channelName = `pupils-index-realtime-${uid}`;
    console.log('[realtime] pupils.index subscribing:', channelName);
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'lessons',
        filter: `instructor_id=eq.${uid}`,
      }, () => {
        if (cancelled) return;
        refreshNextLessons(uid);
        setReloadKey((k) => k + 1);
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'lesson_history',
        filter: `instructor_id=eq.${uid}`,
      }, () => {
        if (cancelled) return;
        setReloadKey((k) => k + 1);
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'chat_messages',
        filter: `instructor_id=eq.${uid}`,
      }, () => {
        if (cancelled) return;
        refreshUnread(uid);
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'pupils',
        filter: `instructor_id=eq.${uid}`,
      }, () => {
        if (cancelled) return;
        refreshTestDates(uid);
        setReloadKey((k) => k + 1);
      })
      .subscribe((status, err) => {
        console.log('[realtime] pupils.index channel status:', status, err ?? '');
      });

    // Safety net: refresh when the tab regains focus and on the app-wide read event.
    const onFocus = () => {
      if (cancelled) return;
      refreshUnread(uid);
      refreshNextLessons(uid);
    };
    const onRead = () => { if (!cancelled) refreshUnread(uid); };
    window.addEventListener("focus", onFocus);
    window.addEventListener("dsm-messages-read", onRead as EventListener);
    window.addEventListener("dsm-message-received", onRead as EventListener);

    return () => {
      cancelled = true;
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("dsm-messages-read", onRead as EventListener);
      window.removeEventListener("dsm-message-received", onRead as EventListener);
      console.log('[realtime] pupils.index unsubscribing:', channelName);
      try {
        supabase.removeChannel(channel);
      } catch (e) {
        console.warn('[realtime] pupils.index removeChannel failed:', e);
      }
    };
  }, [userId, refreshUnread, refreshNextLessons, refreshTestDates]);

  useEffect(() => {
    (async () => {
      const { data: auth, error: authErr } = await supabase.auth.getUser();
      if (authErr) console.error("[pupils] auth error", authErr);
      const uid = auth?.user?.id;
      if (!uid) {
        console.warn("[pupils] no authenticated user");
        setPupils([]);
        return;
      }
      let q = supabase
        .from("pupils")
        .select("id, name, first_name, last_name, phone, email, lesson_count, account_balance, prepaid_hours, ni_amount_total, ni_amount_paid, lead_source, status, pricing_type, test_date, deleted_at, postcode, custom_rate, custom_rate_90, custom_rate_120, profile_image_url, photo_url, calendar_colour")
        .eq("instructor_id", uid)
        .is("deleted_at", null)
        .or("status.is.null,and(status.neq.inactive,status.neq.passed,status.neq.cancelled)")
        .order("name", { ascending: true, nullsFirst: false });

      const { data, error } = await q;
      if (error) console.error("[pupils] fetch error", error);
      console.log("[pupils] fetch result:", data, error);
      const rows = (data ?? []) as Array<Pupil & { first_name?: string | null; last_name?: string | null; deleted_at?: string | null; photo_url?: string | null }>;
      const normalized: Pupil[] = rows.map((p) => ({
        ...p,
        profile_image_url: p.profile_image_url ?? p.photo_url ?? null,
        name:
          p.name && p.name.trim()
            ? p.name
            : `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim() || "Unnamed",
      }));

      setPupils(normalized);
      console.log("[pupils] first pupil prepaid_hours:", normalized[0]?.prepaid_hours, normalized[0]?.name);
      const joseph = normalized.find((p) => /joseph/i.test(p.name) && /thorne/i.test(p.name));
      console.log("[pupils] Joseph Thorne row:", joseph);
      // Test dates straight off the pupil rows
      const tdMap: Record<string, string> = {};
      normalized.forEach((p) => {
        if (p.test_date) tdMap[p.id] = p.test_date as string;
      });
      setTestDateMap(tdMap);

      const pupilIds = normalized.map((p) => p.id);
      if (pupilIds.length === 0) {
        setLessonCountMap({});
        setBalanceMap({});
        setHoursMap({});
        setUnreadMap({});
        setNextLessonMap({});
        return;
      }

      try {
        const { data: unreads } = await supabase
          .from("chat_messages")
          .select("pupil_id")
          .eq("instructor_id", uid)
          .eq("sender_type", "pupil")
          .is("read_at", null)
          .is("deleted_at", null);
        const uMap: Record<string, number> = {};
        (unreads ?? []).forEach((r: any) => {
          if (!r.pupil_id) return;
          uMap[r.pupil_id] = (uMap[r.pupil_id] ?? 0) + 1;
        });
        setUnreadMap(uMap);
      } catch (e) {
        console.error("[pupils] unread fetch crashed", e);
        setUnreadMap({});
      }

      try {
        const { data: nextLessons } = await supabase
          .from("lessons")
          .select("pupil_id, lesson_date")
          .eq("instructor_id", uid)
          .gte("lesson_date", new Date().toISOString().slice(0, 10))
          .in("status", ["confirmed", "pending"])
          .is("deleted_at", null)
          .order("lesson_date", { ascending: true });
        const nlMap: Record<string, string> = {};
        (nextLessons ?? []).forEach((l: any) => {
          if (!l.pupil_id) return;
          if (!nlMap[l.pupil_id]) nlMap[l.pupil_id] = l.lesson_date;
        });
        setNextLessonMap(nlMap);
      } catch (e) {
        console.error("[pupils] next lesson fetch crashed", e);
        setNextLessonMap({});
      }


      try {
        const { data: lessonRows, error: lcErr } = await supabase
          .from("lessons")
          .select("pupil_id")
          .in("pupil_id", pupilIds)
          .in("status", ["confirmed", "completed"])
          .is("deleted_at", null);
        if (lcErr) console.error("[pupils] lesson count error", lcErr);
        const map = ((lessonRows ?? []) as { pupil_id: string }[]).reduce(
          (acc, r) => {
            acc[r.pupil_id] = (acc[r.pupil_id] || 0) + 1;
            return acc;
          },
          {} as Record<string, number>,
        );
        console.log("[pupils] lesson count map:", map);
        setLessonCountMap(map);
      } catch (e) {
        console.error("[pupils] lesson count crashed", e);
        setLessonCountMap({});
      }

      try {
        // Canonical per-pupil balance (handles block/NI packages and credit).
        const balances = await Promise.all(
          normalized.map(async (p) => {
            const bal = await getPupilBalance(p.id);
            return { id: p.id, outstanding: bal.outstanding };
          }),
        );
        const bMap = Object.fromEntries(
          balances.map((b) => [b.id, b.outstanding]),
        ) as Record<string, number>;
        setBalanceMap(bMap);
      } catch (e) {
        console.error("[pupils] balance fetch crashed", e);
        setBalanceMap({});
      }

      try {
        const { data: hourRows, error: hErr } = await supabase
          .from("lessons")
          .select("pupil_id, duration_minutes")
          .eq("instructor_id", uid)
          .is("deleted_at", null);
        if (hErr) console.error("[pupils] hours error", hErr);
        const hMap = ((hourRows ?? []) as { pupil_id: string; duration_minutes: number | null }[]).reduce(
          (acc, row) => {
            if (!row.pupil_id) return acc;
            acc[row.pupil_id] = (acc[row.pupil_id] || 0) + (Number(row.duration_minutes) || 0) / 60;
            return acc;
          },
          {} as Record<string, number>,
        );
      setHoursMap(hMap);
    } catch (e) {
      console.error("[pupils] hours fetch crashed", e);
      setHoursMap({});
    }

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (token && pupilIds.length > 0) {
        const pupilIdList = pupilIds.join(",");
        const SUPABASE_URL = (supabase as any).supabaseUrl;
        const SUPABASE_ANON_KEY = (supabase as any).supabaseKey;
        const histRes = await fetch(
          `${SUPABASE_URL}/rest/v1/lesson_history?pupil_id=in.(${pupilIdList})&payment_status=eq.paid&deleted_at=is.null&order=created_at.desc&select=pupil_id,lesson_cost,payment_method,created_at`,
          { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${token}` } },
        );
        const histData = await histRes.json();
        const map: Record<string, { amount: number; method: string; date: string }> = {};
        for (const row of histData || []) {
          if (!map[row.pupil_id]) {
            map[row.pupil_id] = {
              amount: Number(row.lesson_cost),
              method: row.payment_method,
              date: row.created_at,
            };
          }
        }
        setLastPaymentMap(map);
      }
    } catch (e) {
      console.error("[pupils] recent payments fetch crashed", e);
      setLastPaymentMap({});
    }
  })();
  }, [reloadKey]);




  const filtered = useMemo(() => {
    if (!pupils) return null;
    const q = query.trim().toLowerCase();
    const base = pupils.filter((p) => {
      if (q && !p.name.toLowerCase().includes(q)) return false;
      return true;
    });

    const withIndex = base.map((p, i) => ({ p, i }));


    withIndex.sort((a, b) => {
      // Unread messages always float to the top.
      const ua = (unreadMap[a.p.id] ?? 0) > 0 ? 1 : 0;
      const ub = (unreadMap[b.p.id] ?? 0) > 0 ? 1 : 0;
      if (ua !== ub) return ub - ua;

      if (sortBy === "balance") {
        const diff = (balanceMap[b.p.id] || 0) - (balanceMap[a.p.id] || 0);
        if (diff !== 0) return diff;
        return a.i - b.i;
      }
      if (sortBy === "next_lesson") {
        const na = nextLessonMap[a.p.id];
        const nb = nextLessonMap[b.p.id];
        if (na && nb) {
          if (na !== nb) return na < nb ? -1 : 1;
          return a.i - b.i;
        }
        if (na) return -1;
        if (nb) return 1;
        return a.i - b.i;
      }
      // name
      const cmp = displayName(a.p.name).localeCompare(displayName(b.p.name), "en-GB", {
        sensitivity: "base",
      });
      return cmp !== 0 ? cmp : a.i - b.i;
    });

    return withIndex.map((x) => x.p);
  }, [pupils, query, unreadMap, sortBy, balanceMap, nextLessonMap]);

  // Visual grouping only — derived from the same data already fetched.
  const needsAttention = (filtered ?? []).filter((p: any) => (balanceMap[p.id] || 0) > 0);
  const activePupils = (filtered ?? []).filter((p: any) => !((balanceMap[p.id] || 0) > 0));


  const renderRow = (p: any, idx: number, total: number) => {
    const balanceOwed = balanceMap[p.id] || 0;
    const lessons = lessonCountMap[p.id] || 0;
    const prepaid = Number(p.prepaid_hours) || 0;
    const lp = lastPaymentMap[p.id];
    const unread = unreadMap[p.id] ?? 0;
    const pricing = pricingPill(p.pricing_type, prepaid);
    const testDate = testDateMap[p.id];
    const testDays = testDate ? daysUntil(testDate) : null;
    const testSoon = testDays !== null && testDays >= 0 && testDays <= 7;
    const nextLesson = nextLessonMap[p.id];
    const hasBalance = balanceOwed > 0;

    return (
      <div
        key={p.id}
        role="button"
        tabIndex={0}
        onClick={() => navigate({ to: "/pupils/$id", params: { id: p.id } })}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            navigate({ to: "/pupils/$id", params: { id: p.id } });
          }
        }}
        onContextMenu={(e) => e.preventDefault()}
        className="block cursor-pointer select-none"
        style={{
          background: "transparent",
          padding: "13px 16px",
          WebkitTouchCallout: "none",
        }}
      >
        <div className="flex items-center" style={{ gap: 12 }}>
          <div style={{ position: "relative", flexShrink: 0 }}>
            <PupilAvatar pupil={p} size={44} />
            {unread > 0 && (
              <span
                aria-label={`${unread} unread messages`}
                style={{
                  position: "absolute",
                  top: 0,
                  right: 0,
                  width: 11,
                  height: 11,
                  borderRadius: "50%",
                  background: "#CC2229",
                  border: "2px solid #fff",
                }}
              />
            )}
          </div>

          <div className="min-w-0 flex-1 flex flex-col">
            <div
              className="truncate"
              style={{ fontSize: 16, fontWeight: 600, color: "#0B1F3A", ...POPPINS }}
            >
              {displayName(p.name)}
            </div>
            <div className="flex flex-wrap items-center" style={{ gap: 6, marginTop: 4 }}>
              {hasBalance ? (
                <span style={{ ...PILL_BASE, backgroundColor: "#FCEBEB", color: "#CC2229" }}>
                  £{balanceOwed.toFixed(2)} owed
                </span>
              ) : (
                <span style={{ ...PILL_BASE, backgroundColor: "#DDEFE1", color: "#15803D" }}>
                  All paid
                </span>
              )}
              {testSoon && testDate && (
                <span style={{ ...PILL_BASE, backgroundColor: "#FEF3C7", color: "#92400E" }}>
                  🎯 Test {formatShortDate(testDate)}
                </span>
              )}
              <span style={{ ...PILL_BASE, backgroundColor: pricing.bg, color: pricing.fg }}>
                {pricing.label}
              </span>
            </div>
            {(lp || nextLesson) && (
              <div style={{ fontSize: 11, color: "#B0BAC9", marginTop: 3, ...POPPINS }}>
                {lp
                  ? `Last seen: ${formatRelativeDate(lp.date)}`
                  : `Next: ${formatShortDate(nextLesson)}`}
              </div>
            )}
          </div>

          <div className="flex flex-col items-end shrink-0" style={{ gap: 4 }}>
            <span
              style={{
                fontSize: 13,
                fontWeight: 500,
                color: lessons > 0 ? "#8A94A6" : "#B0BAC9",
                ...POPPINS,
              }}
            >
              {lessons} {lessons === 1 ? "lesson" : "lessons"}
            </span>
            <QuickActionsMenu
              items={[
                { label: "View pupil details", onClick: () => navigate({ to: "/pupils/$id", params: { id: p.id } }) },
                { label: "Send message", onClick: () => navigate({ to: "/messages/$pupilId", params: { pupilId: p.id } }) },
                ...(unread > 0
                  ? [{ label: `Mark ${unread} message${unread === 1 ? "" : "s"} as read`, onClick: () => markMessagesRead(p.id, displayName(p.name)) }]
                  : []),
                ...(p.phone
                  ? [{ label: "Call pupil", onClick: () => { window.location.href = `tel:${p.phone}`; } }]
                  : []),
                { label: "Take payment", onClick: () => { setUnifiedPayPupilId(p.id); setUnifiedPayOpen(true); } },
                { label: "Book a lesson", onClick: () => { setAddLessonPupilId(p.id); setAddLessonOpen(true); } },
                { label: "View profile", onClick: () => navigate({ to: "/pupils/$id", params: { id: p.id } }) },
                { label: "Archive", destructive: true, onClick: () => setArchiveTarget({ id: p.id, name: displayName(p.name) }) },
              ]}

              trigger={({ onClick }) => (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onClick();
                  }}
                  aria-label={`Quick actions for ${displayName(p.name)}`}
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    background: "#F8F9FB",
                    border: "0.5px solid #E5E7EB",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    padding: 0,
                  }}
                >
                  <IconDotsVertical stroke={1.5} size={14} color="#6B7280" />
                </button>
              )}
            />
          </div>
        </div>
      </div>
    );
  };


  return (
    <PageLayout className="pb-24 pb-safe relative" style={POPPINS}>
      <InstructorTopBar
        firstName=""
        pageTitle="Pupils"
        onBack={() => navigate({ to: "/home" as never })}
        onBell={() => navigate({ to: "/notifications" as never })}
        onPhone={() => navigate({ to: "/enquiries" as never })}
        onLiveTrack={() => navigate({ to: "/live" as never })}
        onMenu={() => navigate({ to: "/more" as never })}
        onMicPress={() => toast.info("Voice commands coming soon!")}
      />
      <div style={{ height: "calc(60px + env(safe-area-inset-top, 0px))" }} />



      {/* Count + actions */}
      <div
        style={{
          margin: "16px 16px 12px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span style={{ fontSize: 16, fontWeight: 600, color: "#0B1F3A", ...POPPINS }}>
          {filtered === null ? "" : `${filtered.length} ${filtered.length === 1 ? "pupil" : "pupils"}`}
        </span>
        <div className="flex items-center" style={{ gap: 8 }}>
          <Link
            to="/broadcast"
            aria-label="Message all pupils"
            className="inline-flex items-center gap-1.5"
            style={{
              padding: "6px 12px",
              borderRadius: 20,
              backgroundColor: "#F3F8FF",
              border: "1px solid #EEF2F7",
            }}
          >
            <Megaphone size={14} color="#1877D6" />
            <span style={{ fontSize: 12, fontWeight: 600, color: "#1877D6", ...POPPINS }}>Message all</span>
          </Link>
          <button
            type="button"
            aria-label={searchOpen ? "Close search" : "Open search"}
            onClick={() => {
              setSearchOpen((v) => {
                const next = !v;
                if (!next) setQuery("");
                return next;
              });
            }}
            className="flex items-center justify-center"
            style={{
              width: 32,
              height: 32,
              borderRadius: "50%",
              backgroundColor: "#F3F8FF",
              border: "1px solid #EEF2F7",
            }}
          >
            {searchOpen ? (
              <IconX stroke={1.5} size={16} color="#1877D6" />
            ) : (
              <IconSearch stroke={1.5} size={16} color="#1877D6" />
            )}
          </button>
          <button
            type="button"
            onClick={() =>
              setSortBy((s) => (s === "name" ? "balance" : s === "balance" ? "next_lesson" : "name"))
            }
            aria-label={`Sort by ${SORT_LABELS[sortBy]}. Tap to change.`}
            title={`Sort by ${SORT_LABELS[sortBy]}`}
            className="flex items-center justify-center"
            style={{
              width: 32,
              height: 32,
              borderRadius: "50%",
              backgroundColor: "#F3F8FF",
              border: "1px solid #EEF2F7",
            }}
          >
            <ArrowUpDown size={16} color="#1877D6" />
          </button>
        </div>
      </div>

      {/* IconSearch input */}
      {searchOpen && (
        <div
          style={{
            margin: '12px 16px',
            background: '#fff',
            borderRadius: 16,
            boxShadow: '0 1px 3px rgba(11,31,58,0.06)',
            padding: '10px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <IconSearch stroke={1.5} size={16} color="#9CA3AF" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search pupils..."
            style={{
              flex: 1,
              border: 'none',
              outline: 'none',
              fontSize: 15,
              color: '#0B1F3A',
              fontFamily: 'Poppins, sans-serif',
              background: 'transparent',
            }}
          />
        </div>
      )}



      {/* List */}
      <div>
        {filtered === null ? (
          <SkeletonCard rows={5} />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={IconUsers}
            title="No active pupils"
            description="Add your first pupil to start tracking lessons."
            action={
              <Link
                to="/pupils/new"
                className="inline-flex items-center gap-1.5 h-10 px-4 rounded-[10px] text-[13px] font-semibold text-white"
                style={{ backgroundColor: "#1877D6", fontFamily: "Poppins, sans-serif" }}
              >
                <IconPlus stroke={1.5} size={16} /> Add pupil
              </Link>
            }
          />
        ) : (
          <>
            {needsAttention.length > 0 && (
              <>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: '#FF3B30',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    padding: '16px 16px 6px',
                    fontFamily: 'Poppins, sans-serif',
                  }}
                >
                  Needs Attention
                </div>
                <div style={{ margin: '0 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {needsAttention.map((p, index) => (
                    <div
                      key={p.id}
                      style={{
                        background: '#fff',
                        borderRadius: 16,
                        padding: 14,
                        boxShadow: '0 3px 0 #F7C9C6, 0 8px 18px rgba(255,59,48,0.1)',
                        border: '1.5px solid #FDEDEC',
                      }}
                    >
                      {renderRow(p, index, needsAttention.length)}
                    </div>
                  ))}
                </div>
              </>
            )}
            <div
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: '#8A8A8E',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                padding: '16px 16px 6px',
                fontFamily: 'Poppins, sans-serif',
              }}
            >
              Active · {activePupils.length}
            </div>
            <div style={{ margin: '0 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {activePupils.map((p) => (
                <div
                  key={p.id}
                  style={{
                    background: '#fff',
                    borderRadius: 16,
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                    overflow: 'hidden',
                  }}
                >
                  {renderRow(p, 0, activePupils.length)}
                </div>
              ))}
            </div>
          </>
        )}
      </div>



      <style>{`
        @keyframes skeleton-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        .skeleton-pulse {
          animation: skeleton-pulse 1.5s ease-in-out infinite;
        }
      `}</style>

      {/* FAB */}
      <Link
        to="/pupils/new"
        aria-label="Add pupil"
        className="fixed z-50 flex items-center justify-center rounded-full"
        style={{
          width: 52,
          height: 52,
          backgroundColor: "#1877D6",
          color: "#FFFFFF",
          right: 16,
          bottom: "calc(env(safe-area-inset-bottom, 0px) + 80px)",
        }}
      >
        <IconPlus stroke={1.5} size={24} color="#FFFFFF" />
      </Link>

      <UnifiedPaymentSheet
        open={unifiedPayOpen}
        onClose={() => { setUnifiedPayOpen(false); setUnifiedPayPupilId(undefined); }}
        onSaved={() => setReloadKey((k) => k + 1)}
        initialPupilId={unifiedPayPupilId}
      />

      <AddLessonSheet
        open={addLessonOpen}
        onClose={() => { setAddLessonOpen(false); setAddLessonPupilId(undefined); }}
        onSaved={() => { setAddLessonOpen(false); setAddLessonPupilId(undefined); setReloadKey((k) => k + 1); }}
        initialPupilId={addLessonPupilId}
      />

      <ConfirmDialog
        open={archiveTarget !== null}
        title={`Archive ${archiveTarget?.name ?? ""}?`}
        message="They'll be moved to the Archived tab. You can still view their history."
        confirmLabel="Archive"
        onCancel={() => setArchiveTarget(null)}
        onConfirm={async () => {
          const target = archiveTarget;
          setArchiveTarget(null);
          if (!target) return;
          const { error } = await supabase
            .from("pupils")
            .update({ status: "archived" })
            .eq("id", target.id);
          if (error) {
            toast.error("Couldn't archive pupil");
            return;
          }
          toast.success(`${target.name} archived`);
          setReloadKey((k) => k + 1);
        }}
      />

    </PageLayout>
  );
}

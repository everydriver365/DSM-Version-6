import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Briefcase, MessageSquare, Mail, CalendarCheck, CalendarX } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { WhatsNewSheet } from "@/components/dsm/WhatsNewSheet";
import { DailyCatchUpSheet } from "@/components/dsm/DailyCatchUpSheet";
import {
  APP_VERSION,
  WHATS_NEW_BY_VERSION,
  getLastSeenVersion,
  isNewerVersion,
  setLastSeenVersion,
  type WhatsNewItem,
} from "@/lib/whatsNew";

const BLUE = "#1877D6";

type Row = {
  key: string;
  icon: React.ReactNode;
  tint: string;
  count: number;
  label: string;
  to: string;
};

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
const catchUpStorageKey = (uid: string) => `dsm.dailyCatchUp.lastShown.${uid}`;

async function buildCatchUpRows(uid: string, since: Date): Promise<Row[]> {
  const sinceIso = since.toISOString();
  const rows: Row[] = [];
  const [jobs, enquiries, messages, lessonsNew, lessonsCanc] = await Promise.all([
    supabase.from("job_offers").select("id", { count: "exact", head: true }).eq("status", "open").gte("created_at", sinceIso),
    supabase.from("enquiries").select("id", { count: "exact", head: true }).eq("instructor_id", uid).gte("created_at", sinceIso),
    supabase.from("chat_messages").select("id", { count: "exact", head: true }).eq("instructor_id", uid).eq("sender_type", "pupil").is("read_at", null).gte("created_at", sinceIso),
    supabase.from("lessons").select("id", { count: "exact", head: true }).eq("instructor_id", uid).neq("status", "cancelled").gte("created_at", sinceIso),
    supabase.from("lessons").select("id", { count: "exact", head: true }).eq("instructor_id", uid).eq("status", "cancelled").gte("updated_at", sinceIso),
  ]).catch(() => [] as any);

  const push = (
    count: number | null | undefined,
    key: string,
    labelSingular: string,
    labelPlural: string,
    icon: React.ReactNode,
    tint: string,
    to: string,
  ) => {
    const n = count ?? 0;
    if (n <= 0) return;
    rows.push({ key, count: n, label: n === 1 ? labelSingular : labelPlural, icon, tint, to });
  };

  push(jobs?.count, "jobs", "new job", "new jobs", <Briefcase size={18} color="#B5661E" />, "#FBEFDF", "/jobs");
  push(enquiries?.count, "enquiries", "new enquiry", "new enquiries", <Mail size={18} color={BLUE} />, "#E5EFFA", "/enquiries");
  push(messages?.count, "messages", "new message", "new messages", <MessageSquare size={18} color={BLUE} />, "#E5EFFA", "/messages");
  push(lessonsNew?.count, "bookings", "new booking", "new bookings", <CalendarCheck size={18} color="#1B7F3B" />, "#E7F5EE", "/schedule");
  push(lessonsCanc?.count, "cancellations", "cancellation", "cancellations", <CalendarX size={18} color="#CC2229" />, "#FBE6E7", "/schedule");
  return rows;
}

type Active = "none" | "whatsNew" | "catchUp";

/**
 * Single-sheet queue. Evaluates "What's new" and "Daily catch-up" once per
 * mount. If both are due, shows "What's new" first; only after it is dismissed
 * via "Got it" or backdrop does "Daily catch-up" show (after ~300ms). "Show me
 * later" on "What's new" skips catch-up for this session.
 *
 * A single `active` state guarantees only one sheet is ever mounted.
 */
export function SheetQueueController({ userId }: { userId: string | null }) {
  const navigate = useNavigate();
  const [active, setActive] = useState<Active>("none");
  const [whatsNewItems, setWhatsNewItems] = useState<WhatsNewItem[]>([]);
  const [catchUpRows, setCatchUpRows] = useState<Row[]>([]);
  const [catchUpReady, setCatchUpReady] = useState(false);
  const [whatsNewResolved, setWhatsNewResolved] = useState<"pending" | "dismissed" | "later" | "none">(
    "pending",
  );

  // Evaluate both conditions once.
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    // --- What's new evaluation (sync) ---
    const last = getLastSeenVersion(userId);
    let wnDue = false;
    if (isNewerVersion(APP_VERSION, last)) {
      const items = WHATS_NEW_BY_VERSION[APP_VERSION] ?? [];
      if (items.length === 0) {
        setLastSeenVersion(userId, APP_VERSION);
      } else {
        wnDue = true;
        setWhatsNewItems(items);
      }
    }
    if (!wnDue) setWhatsNewResolved("none");

    // --- Daily catch-up evaluation (async) ---
    (async () => {
      const key = catchUpStorageKey(userId);
      let lastShown: string | null = null;
      try {
        lastShown = localStorage.getItem(key);
      } catch {}
      const today = todayKey();
      if (lastShown === today) {
        if (!cancelled) setCatchUpReady(true); // ready but empty
        return;
      }
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const built = await buildCatchUpRows(userId, since);
      if (cancelled) return;
      try {
        localStorage.setItem(key, today);
      } catch {}
      setCatchUpRows(built);
      setCatchUpReady(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  // Decide which (if any) sheet is active.
  useEffect(() => {
    if (!userId) return;
    if (active !== "none") return;

    // What's new takes priority while unresolved.
    if (whatsNewResolved === "pending" && whatsNewItems.length > 0) {
      setActive("whatsNew");
      return;
    }
    // "later" blocks catch-up for this session.
    if (whatsNewResolved === "later") return;
    // Only consider catch-up once What's new is out of the way and rows are ready.
    if (
      (whatsNewResolved === "dismissed" || whatsNewResolved === "none") &&
      catchUpReady &&
      catchUpRows.length > 0
    ) {
      setActive("catchUp");
    }
  }, [userId, active, whatsNewResolved, whatsNewItems.length, catchUpReady, catchUpRows.length]);

  if (!userId) return null;

  if (active === "whatsNew") {
    const resolve = (mode: "dismissed" | "later") => {
      if (mode === "dismissed") setLastSeenVersion(userId, APP_VERSION);
      // Unmount What's new first. Wait two animation frames so React has
      // fully committed the unmount (backdrop + sheet removed from the DOM)
      // before we allow the next sheet in the queue to mount. WhatsNewSheet
      // has no exit animation, so no fixed timeout is needed — this is
      // deterministic rather than a 300ms guess.
      setActive("none");
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setWhatsNewResolved(mode));
      });
    };
    return (
      <WhatsNewSheet
        items={whatsNewItems}
        onDismiss={() => resolve("dismissed")}
        onLater={() => resolve("later")}
      />
    );
  }

  if (active === "catchUp") {
    const total = catchUpRows.reduce((s, r) => s + r.count, 0);
    const title =
      total === 1 ? "1 thing needs your attention" : `${total} things need your attention`;
    return (
      <DailyCatchUpSheet
        rows={catchUpRows}
        title={title}
        onDismiss={() => setActive("none")}
        onRowClick={(to) => {
          setActive("none");
          navigate({ to });
        }}
      />
    );
  }

  return null;
}

import { Link, useRouterState } from "@tanstack/react-router";
import { tokens } from "@/lib/tokens";
import { useCallback, useEffect, useState, type ComponentType, type ReactNode } from "react";
import {
  IconHome,
  IconHomeFilled,
  IconCalendar,
  IconCalendarFilled,
  IconUsers,
  IconMessageCircle,
  IconDots,
} from "@tabler/icons-react";
import { supabase } from "@/lib/supabaseClient";
import { tapLight } from "@/lib/haptics";

/**
 * Unread pupil replies count. Kept inside BottomNav so every screen gets the
 * badge without prop drilling. Refreshes on route change, on a 60s interval,
 * and when a screen broadcasts `dsm-messages-read` after marking messages read.
 */
function useUnreadMessages(): number {
  const [count, setCount] = useState(0);
  const [uid, setUid] = useState<string | null>(null);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  // Resolve the signed-in user once, and follow auth changes.
  useEffect(() => {
    let cancelled = false;
    supabase.auth.getSession().then(({ data }) => {
      if (!cancelled) setUid(data.session?.user?.id ?? null);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUid(session?.user?.id ?? null);
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  // Shared loader: pupil unread (conversations) + local chat unread.
  const load = useCallback(async () => {
    if (!uid) {
      setCount(0);
      return;
    }

    const { data: convos } = await supabase
      .from("conversations")
      .select("unread_count")
      .eq("instructor_id", uid);

    const pupilUnread = (convos ?? []).reduce(
      (s, c) => s + (c.unread_count ?? 0),
      0
    );

    const { data: subs } = await supabase
      .from("chat_room_subscriptions")
      .select("room_id, last_read_at")
      .eq("instructor_id", uid);

    let chatUnread = 0;
    for (const sub of subs ?? []) {
      const { count: c } = await supabase
        .from("local_chat_messages")
        .select("id", { count: "exact", head: true })
        .eq("room_id", sub.room_id)
        .neq("instructor_id", uid)
        .gt("created_at", sub.last_read_at ?? "1970-01-01")
        .is("deleted_at", null);
      chatUnread += c ?? 0;
    }

    const { count: dmUnread } = await supabase
      .from("instructor_messages")
      .select("id", { count: "exact", head: true })
      .eq("to_instructor_id", uid)
      .is("read_at", null)
      .is("deleted_at", null);

    const { count: enquiryReplies } = await supabase
      .from("enquiry_activities")
      .select("id", { count: "exact", head: true })
      .eq("instructor_id", uid)
      .eq("type", "sms_reply")
      .gt(
        "created_at",
        new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
      );

    setCount(
      pupilUnread + chatUnread + (dmUnread ?? 0) + (enquiryReplies ?? 0)
    );
  }, [uid]);

  // Effect A — once per user: realtime subscription + 60s safety-net poll.
  useEffect(() => {
    if (!uid) {
      setCount(0);
      return;
    }

    load();

    const interval = window.setInterval(() => { load(); }, 60000);
    // `dsm-messages-read` may carry `{ delta }` — the number of messages the
    // open conversation just marked read. Applying it optimistically drops the
    // badge instantly; the reloads below reconcile with the database.
    const onPing = (e: Event) => {
      const delta = (e as CustomEvent<{ delta?: number }>).detail?.delta;
      if (typeof delta === "number" && delta > 0) {
        setCount((c) => Math.max(0, c - delta));
      }
      load();
      setTimeout(() => { load(); }, 500);
      setTimeout(() => { load(); }, 1500);
    };
    window.addEventListener("dsm-message-received", onPing);
    window.addEventListener("dsm-messages-read", onPing);
    // The inbox recounts instructor DMs on its own realtime feed; mirror that
    // into the badge so it updates without waiting for the 60s poll.
    window.addEventListener("dsm-instructor-dm-unread", onPing);

    const channel = supabase
      .channel(`unread-badge-${uid}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "chat_messages",
        filter: `instructor_id=eq.${uid}`,
      }, () => { load(); })
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "chat_messages",
        filter: `instructor_id=eq.${uid}`,
      }, () => { load(); })
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "conversations",
        filter: `instructor_id=eq.${uid}`,
      }, () => { load(); })
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "conversations",
        filter: `instructor_id=eq.${uid}`,
      }, () => { load(); })
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "local_chat_messages",
      }, () => { load(); })
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "local_chat_messages",
      }, () => { load(); })
      // Local-chat read state lives in the subscription row's last_read_at.
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "chat_room_subscriptions",
        filter: `instructor_id=eq.${uid}`,
      }, () => { load(); })
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "instructor_messages",
        filter: `to_instructor_id=eq.${uid}`,
      }, () => { load(); })
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "enquiry_activities",
        filter: `instructor_id=eq.${uid}`,
      }, () => { load(); })
      .subscribe();



    return () => {
      window.clearInterval(interval);
      window.removeEventListener("dsm-message-received", onPing);
      window.removeEventListener("dsm-messages-read", onPing);
      window.removeEventListener("dsm-instructor-dm-unread", onPing);
      supabase.removeChannel(channel);
    };
  }, [uid, load]);

  // Effect B — refresh on route change only. No subscription, no cleanup.
  useEffect(() => {
    if (!uid) return;
    load();
  }, [pathname]);

  return count;
}

const ACTIVE = "#1877D6";
const INACTIVE = "#9AA5B5";
const POPPINS = { fontFamily: "Poppins, sans-serif" };

function UnreadBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span
      aria-label={`${count} unread messages`}
      className="absolute flex items-center justify-center"
      style={{
        top: -4,
        right: -4,
        minWidth: 16,
        height: 16,
        padding: "0 4px",
        borderRadius: 12,
        background: tokens.red,
        color: tokens.white,
        fontSize: 9,
        fontWeight: tokens.fontWeight.bold,
        lineHeight: 1,
        border: "2px solid #FFFFFF",
        ...POPPINS,
      }}
    >
      {count > 9 ? "9+" : count}
    </span>
  );
}

export type NavKey = "home" | "schedule" | "pupils" | "messages" | "more" | "settings" | "payments";

export interface BottomNavItem {
  key: string;
  label: string;
  Icon: ComponentType<{ size?: number; color?: string; stroke?: number }>;
  to?: string;
  onClick?: () => void;
  /** Optional workspace index (0-7) this tab maps to. Enables event-driven active state. */
  ws?: number;
}

interface Props {
  active?: NavKey;
  items?: BottomNavItem[];
  activeIndex?: number;
  activeColor?: string;
  inactiveColor?: string;
  /** Current workspace index (0-7). Highlights the tab whose ws matches. */
  activeWs?: number;
  /** Called when a tab with a `ws` mapping is tapped. */
  onSelectWs?: (index: number) => void;
}

const defaultItems: {
  key: NavKey;
  to: string;
  label: string;
  Icon: ComponentType<{ size?: number; color?: string; stroke?: number }>;
  onClick?: () => void;
}[] = [
  { key: "home", to: "/home", label: "Home", Icon: IconHome },
  { key: "schedule", to: "/schedule", label: "Schedule", Icon: IconCalendar },
  { key: "pupils", to: "/pupils", label: "Pupils", Icon: IconUsers },
  { key: "messages", to: "/messages", label: "Messages", Icon: IconMessageCircle },
  { key: "more", to: "/more", label: "More", Icon: IconDots },
];

function TabIcon({
  Icon,
  size = 22,
  color,
  stroke = 1.8,
}: {
  Icon: ComponentType<{ size?: number; color?: string; stroke?: number }>;
  size?: number;
  color: string;
  stroke?: number;
}) {
  return <Icon size={size} color={color} stroke={stroke} />;
}

function ActiveIcon({
  keyName,
  color,
  size = 22,
  stroke = 1.8,
}: {
  keyName: string;
  color: string;
  size?: number;
  stroke?: number;
}) {
  if (keyName === "home") {
    return <IconHomeFilled size={size} color={color} stroke={stroke} />;
  }
  if (keyName === "schedule") {
    return <IconCalendarFilled size={size} color={color} stroke={stroke} />;
  }
  return null;
}

export function BottomNav({
  active,
  items,
  activeIndex,
  activeColor = ACTIVE,
  inactiveColor = INACTIVE,
  activeWs,
  onSelectWs,
}: Props) {
  const useCustom = Array.isArray(items) && items.length > 0;
  // Track workspace changes broadcast by the home carousel so BottomNav stays
  // in sync without prop drilling (see home.tsx `dsm-workspace-change` event).
  const [listenerWs, setListenerWs] = useState<number | undefined>(activeWs);
  useEffect(() => { if (typeof activeWs === 'number') setListenerWs(activeWs); }, [activeWs]);
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ index: number }>).detail;
      if (detail && typeof detail.index === 'number') setListenerWs(detail.index);
    };
    window.addEventListener('dsm-workspace-change', handler as EventListener);
    return () => window.removeEventListener('dsm-workspace-change', handler as EventListener);
  }, []);
  const currentWs = listenerWs;
  const unreadMessages = useUnreadMessages();

  const renderIcon = (
    icon: ComponentType<{ size?: number; color?: string; stroke?: number }>,
    keyName: string,
    isActive: boolean,
    color: string
  ) => {
    const filled = ActiveIcon({ keyName, color, size: 22, stroke: 1.8 });
    if (filled && isActive) return filled;
    return <TabIcon Icon={icon} size={22} color={color} stroke={1.8} />;
  };

  const renderCustomItems = (list: BottomNavItem[], offset: number) =>
    list.map((it, i) => {
      const realIndex = offset + i;
      const wsMatch = typeof it.ws === 'number' && it.ws === currentWs;
      const isActive = wsMatch || (typeof it.ws !== 'number' && realIndex === activeIndex);
      const color = isActive ? activeColor : inactiveColor;
      const handleClick = () => {
        tapLight();
        if (typeof it.ws === 'number' && onSelectWs) onSelectWs(it.ws);
        it.onClick?.();
      };
      const showBadge = it.key === "messages" || it.to === "/messages";
      const inner: ReactNode = (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 2,
            padding: "4px 10px",
            borderRadius: 999,
            background: isActive ? "#E6F1FB" : "transparent",
          }}
        >
          <div style={{ position: "relative", display: "inline-flex" }}>
            {renderIcon(it.Icon, it.key, isActive, color)}
            {showBadge && <UnreadBadge count={unreadMessages} />}
          </div>
          <span
            style={{
              ...POPPINS,
              fontSize: tokens.fontSize.sm,
              fontWeight: isActive ? 600 : 400,
              color,
              lineHeight: 1,
              whiteSpace: "nowrap",
            }}
          >
            {it.label}
          </span>
        </div>
      );
      const cls = "flex flex-col items-center justify-center select-none relative";
      if (it.to && !it.onClick && typeof it.ws !== 'number') {
        return (
          <Link key={it.key} to={it.to} className={cls} style={{ color }} onClick={() => tapLight()}>
            {inner}
          </Link>
        );
      }
      return (
        <button
          key={it.key}
          type="button"
          onClick={handleClick}
          className={cls}
          style={{ color, background: "none", border: "none", padding: 0, cursor: "pointer" }}
        >
          {inner}
        </button>
      );
    });

  const renderDefaultItems = (list: typeof defaultItems, offset: number) =>
    list.map(({ key, to, label, Icon, onClick }, i) => {
      let isActive = false;
      if (key === "home") isActive = active === "home" && (currentWs ?? 0) === 0;
      else if (key === "schedule") isActive = active === "schedule";
      else if (key === "pupils") isActive = active === "pupils";
      else if (key === "messages") isActive = active === "messages";
      else if (key === "more") isActive = active === "more";
      const color = isActive ? activeColor : inactiveColor;
      const inner: ReactNode = (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 2,
            padding: "4px 10px",
            borderRadius: 999,
            background: isActive ? "#E6F1FB" : "transparent",
          }}
        >
          <div style={{ position: "relative", display: "inline-flex" }}>
            {renderIcon(Icon, key, isActive, color)}
            {key === "messages" && <UnreadBadge count={unreadMessages} />}
          </div>
          <span
            style={{
              ...POPPINS,
              fontSize: tokens.fontSize.sm,
              fontWeight: isActive ? 600 : 400,
              color,
              lineHeight: 1,
              whiteSpace: "nowrap",
            }}
          >
            {label}
          </span>
        </div>
      );
      const cls = "flex flex-col items-center justify-center select-none relative";
      if (to) {
        return (
          <Link key={key} to={to} className={cls} style={{ color }} onClick={() => tapLight()}>
            {inner}
          </Link>
        );
      }
      return (
        <button
          key={key}
          type="button"
          onClick={() => { tapLight(); onClick?.(); }}
          className={cls}
          style={{ color, background: "none", border: "none", padding: 0, cursor: "pointer" }}
        >
          {inner}
        </button>
      );
    });

  return (
    <nav
      className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] z-50 bg-white flex items-center justify-around"
      style={{
        fontFamily: "Poppins, sans-serif",
        borderRadius: "16px 16px 0 0",
        boxShadow: "0 -4px 24px rgba(15,32,68,0.08)",
        paddingTop: 8,
        paddingBottom: "max(env(safe-area-inset-bottom), 8px)",
      }}
    >
      {useCustom ? renderCustomItems(items!, 0) : renderDefaultItems(defaultItems, 0)}
    </nav>
  );
}

export default BottomNav;

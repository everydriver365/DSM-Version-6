import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useState, type ComponentType, type ReactNode } from "react";
import { Home, CalendarDays, Users, MessageCircle, LayoutGrid } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

/**
 * Unread pupil replies count. Kept inside BottomNav so every screen gets the
 * badge without prop drilling. Refreshes on route change, on a 60s interval,
 * and when a screen broadcasts `dsm-messages-read` after marking messages read.
 */
function useUnreadPupilMessages(): number {
  const [count, setCount] = useState(0);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const { data: sessionRes } = await supabase.auth.getSession();
      const uid = sessionRes.session?.user?.id;
      if (!uid) {
        if (!cancelled) setCount(0);
        return;
      }
      const { count: c, error } = await supabase
        .from("chat_messages")
        .select("id", { count: "exact", head: true })
        .eq("instructor_id", uid)
        .eq("sender_type", "pupil")
        .is("read_at", null)
        .is("deleted_at", null);
      if (!cancelled && !error) setCount(c ?? 0);
    };

    load();
    const interval = window.setInterval(load, 60000);
    const onRead = () => load();
    window.addEventListener("dsm-messages-read", onRead);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
      window.removeEventListener("dsm-messages-read", onRead);
    };
  }, [pathname]);

  return count;
}

function UnreadBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span
      aria-label={`${count} unread messages`}
      className="absolute flex items-center justify-center"
      style={{
        top: 4,
        left: "calc(50% + 6px)",
        minWidth: 16,
        height: 16,
        padding: "0 4px",
        borderRadius: 999,
        background: "#CC2229",
        color: "#FFFFFF",
        fontSize: 9,
        fontWeight: 700,
        lineHeight: 1,
        border: "1.5px solid #FFFFFF",
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
  Icon: ComponentType<{ size?: number; color?: string }>;
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
  Icon: ComponentType<{ size?: number; color?: string }>;
  onClick?: () => void;
}[] = [
  { key: "home", to: "/home", label: "Home", Icon: Home },
  { key: "schedule", to: "/schedule", label: "Schedule", Icon: CalendarDays },
  { key: "pupils", to: "/pupils", label: "Pupils", Icon: Users },
  { key: "messages", to: "/messages", label: "Messages", Icon: MessageCircle },
  { key: "more", to: "/more", label: "More", Icon: LayoutGrid },
];

export function BottomNav({ active, items, activeIndex, activeColor = "#185FA5", inactiveColor = "#8A93A3", activeWs, onSelectWs }: Props) {
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
  const unreadMessages = useUnreadPupilMessages();

  const renderCustomItems = (list: BottomNavItem[], offset: number) =>
    list.map((it, i) => {
      const realIndex = offset + i;
      const wsMatch = typeof it.ws === 'number' && it.ws === currentWs;
      const isActive = wsMatch || (typeof it.ws !== 'number' && realIndex === activeIndex);
      const color = isActive ? activeColor : inactiveColor;
      const handleClick = () => {
        if (typeof it.ws === 'number' && onSelectWs) onSelectWs(it.ws);
        it.onClick?.();
      };
      const showBadge = it.key === "messages" || it.to === "/messages";
      const inner: ReactNode = (
        <>
          {isActive && (
            <span
              aria-hidden
              className="absolute top-0 left-1/2 -translate-x-1/2 h-[3px] w-8 rounded-b-full"
              style={{ backgroundColor: activeColor }}
            />
          )}
          <it.Icon size={22} color={color} />
          {showBadge && <UnreadBadge count={unreadMessages} />}
          <span className="text-[9px] whitespace-nowrap" style={{ color }}>{it.label}</span>
        </>
      );
      const cls = "flex flex-col items-center justify-center gap-1 select-none relative";
      if (it.to && !it.onClick && typeof it.ws !== 'number') {
        return (
          <Link key={it.key} to={it.to} className={cls} style={{ color }}>
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
      const labelClass = `text-[9px] whitespace-nowrap mt-[1px] ${isActive ? "font-semibold" : "font-medium"}`;
      const inner: ReactNode = (
        <>
          {isActive && (
            <span
              aria-hidden
              className="absolute top-0 left-1/2 -translate-x-1/2 h-[3px] w-8 rounded-b-full"
              style={{ backgroundColor: activeColor }}
            />
          )}
          <Icon size={22} color={color} />
          {key === "messages" && <UnreadBadge count={unreadMessages} />}
          <span className={labelClass} style={{ color }}>
            {label}
          </span>
        </>
      );
      const cls = "flex flex-col items-center justify-center gap-1 select-none relative";
      if (to) {
        return (
          <Link key={key} to={to} className={cls} style={{ color }}>
            {inner}
          </Link>
        );
      }
      return (
        <button
          key={key}
          type="button"
          onClick={onClick}
          className={cls}
          style={{ color, background: "none", border: "none", padding: 0, cursor: "pointer" }}
        >
          {inner}
        </button>
      );
    });

  return (
    <nav
      className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] h-16 bg-white flex items-center justify-around z-50 pb-safe"
      style={{
        fontFamily: "Inter, sans-serif",
        borderRadius: "20px 20px 0 0",
        boxShadow: "0 -2px 12px rgba(0,0,0,0.08)",
      }}
    >
      {useCustom ? renderCustomItems(items!, 0) : renderDefaultItems(defaultItems, 0)}
    </nav>
  );
}

export default BottomNav;

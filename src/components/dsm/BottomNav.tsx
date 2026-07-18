import { Link } from "@tanstack/react-router";
import { useEffect, useState, type ComponentType, type ReactNode } from "react";
import { Home, CalendarDays, Users, MessageCircle, LayoutGrid, Mic } from "lucide-react";

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
  /** Called when the raised microphone button is pressed. */
  onMicPress?: () => void;
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

export function BottomNav({ active, items, activeIndex, activeColor = "#185FA5", inactiveColor = "#8A93A3", activeWs, onSelectWs, onMicPress }: Props) {
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

  const micSlot = (
    <button
      key="mic"
      type="button"
      onClick={onMicPress}
      className="flex-1 flex flex-col items-center justify-center relative select-none"
      style={{ background: "none", border: "none", padding: 0, cursor: "pointer" }}
    >
      <span
        aria-label="Voice commands"
        className="flex items-center justify-center rounded-full"
        style={{
          width: 56,
          height: 56,
          backgroundColor: "#0B1F3A",
          border: "4px solid #FFFFFF",
          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.18)",
          marginTop: -20,
        }}
      >
        <Mic size={24} color="#FFFFFF" />
      </span>
    </button>
  );

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
          <span className="text-[9px] whitespace-nowrap" style={{ color }}>{it.label}</span>
        </>
      );
      const cls = "flex-1 flex flex-col items-center justify-center gap-1 select-none relative";
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
      else if (key === "pupils") isActive = active === "pupils" || active?.startsWith("pupils") || false;
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
          <span className={labelClass} style={{ color }}>
            {label}
          </span>
        </>
      );
      const cls = "flex-1 flex flex-col items-center justify-center gap-1 select-none relative";
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
      className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] h-16 bg-white flex items-stretch z-50 pb-safe"
      style={{
        borderTopWidth: "0.5px",
        borderTopStyle: "solid",
        borderTopColor: "#EEF2F7",
        fontFamily: "Inter, sans-serif",
      }}
    >
      {useCustom ? (
        <>
          {renderCustomItems(items!.slice(0, 2), 0)}
          {micSlot}
          {renderCustomItems(items!.slice(2), 3)}
        </>
      ) : (
        <>
          {renderDefaultItems(defaultItems.slice(0, 2), 0)}
          {micSlot}
          {renderDefaultItems(defaultItems.slice(2), 3)}
        </>
      )}
    </nav>
  );
}

export default BottomNav;

import { Link } from "@tanstack/react-router";
import { useEffect, useState, type ComponentType, type ReactNode } from "react";
import { Home, CalendarDays, Users, MessageSquare, Grid } from "lucide-react";

export type NavKey = "home" | "schedule" | "pupils" | "messages" | "more";

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
  to: string | null;
  label: string;
  Icon: ComponentType<{ size?: number; color?: string }>;
  onClick?: () => void;
}[] = [
  { key: "home", to: "/home", label: "Home", Icon: Home },
  { key: "schedule", to: "/schedule", label: "Schedule", Icon: CalendarDays },
  { key: "pupils", to: "/pupils", label: "Pupils", Icon: Users },
  { key: "messages", to: "/messages", label: "Messages", Icon: MessageSquare },
  {
    key: "more",
    to: null,
    label: "More",
    Icon: Grid,
    onClick: () => {
      window.dispatchEvent(new CustomEvent("dsm-workspace-change", { detail: { index: 7 } }));
    },
  },
];

export function BottomNav({ active, items, activeIndex, activeColor = "#0F2044", inactiveColor = "#9CA3AF", activeWs, onSelectWs }: Props) {
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
      {useCustom
        ? items!.map((it, i) => {
            const wsMatch = typeof it.ws === 'number' && it.ws === currentWs;
            const isActive = wsMatch || (typeof it.ws !== 'number' && i === activeIndex);
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
                <span className="text-[10px] whitespace-nowrap" style={{ color }}>{it.label}</span>
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
          })
        : defaultItems.map(({ key, to, label, Icon }) => {
            const isActive = key === active;
            const color = isActive ? activeColor : inactiveColor;
            return (
              <Link
                key={key}
                to={to}
                className="flex-1 flex flex-col items-center justify-center gap-1 select-none relative"
                style={{ color }}
              >
                {isActive && (
                  <span
                    aria-hidden
                    className="absolute top-0 left-1/2 -translate-x-1/2 h-[3px] w-8 rounded-b-full"
                    style={{ backgroundColor: activeColor }}
                  />
                )}
                <Icon size={22} color={color} />
                <span className="text-[10px] whitespace-nowrap" style={{ color }}>
                  {label}
                </span>
              </Link>
            );
          })}
    </nav>
  );
}

export default BottomNav;


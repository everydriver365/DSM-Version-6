import { Link } from "@tanstack/react-router";
import type { ComponentType, ReactNode } from "react";
import {
  HomeIcon,
  PupilsIcon,
  ScheduleIcon,
  MessagesIcon,
  PaymentsIcon,
  SettingsIcon,
} from "@/components/icons/DrivingIcons";

export type NavKey = "home" | "pupils" | "schedule" | "messages" | "payments" | "settings";

export interface BottomNavItem {
  key: string;
  label: string;
  Icon: ComponentType<{ size?: number; color?: string }>;
  to?: string;
  onClick?: () => void;
}

interface Props {
  active?: NavKey;
  items?: BottomNavItem[];
  activeIndex?: number;
  activeColor?: string;
  inactiveColor?: string;
}

const defaultItems: { key: NavKey; to: string; label: string; Icon: ComponentType<{ size?: number; color?: string }> }[] = [
  { key: "home", to: "/home", label: "Home", Icon: HomeIcon },
  { key: "pupils", to: "/pupils", label: "Pupils", Icon: PupilsIcon },
  { key: "schedule", to: "/schedule", label: "Schedule", Icon: ScheduleIcon },
  { key: "messages", to: "/messages", label: "Messages", Icon: MessagesIcon },
  { key: "payments", to: "/payments", label: "Payments", Icon: PaymentsIcon },
  { key: "settings", to: "/settings", label: "Settings", Icon: SettingsIcon },
];

export function BottomNav({ active, items, activeIndex, activeColor = "#1877D6", inactiveColor = "#6B7280" }: Props) {
  const useCustom = Array.isArray(items) && items.length > 0;
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
            const isActive = i === activeIndex;
            const color = isActive ? activeColor : inactiveColor;
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
            if (it.to && !it.onClick) {
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
                onClick={it.onClick}
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


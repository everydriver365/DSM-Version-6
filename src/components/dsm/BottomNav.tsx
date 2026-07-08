import { Link } from "@tanstack/react-router";
import type { ComponentType } from "react";
import {
  HomeIcon,
  PupilsIcon,
  ScheduleIcon,
  MessagesIcon,
  PaymentsIcon,
  SettingsIcon,
} from "@/components/icons/DrivingIcons";

export type NavKey = "home" | "pupils" | "schedule" | "messages" | "payments" | "settings";

interface Props {
  active?: NavKey;
}

const items: { key: NavKey; to: string; label: string; Icon: ComponentType<{ size?: number; color?: string }> }[] = [
  { key: "home", to: "/home", label: "Home", Icon: HomeIcon },
  { key: "pupils", to: "/pupils", label: "Pupils", Icon: PupilsIcon },
  { key: "schedule", to: "/schedule", label: "Schedule", Icon: ScheduleIcon },
  { key: "messages", to: "/messages", label: "Messages", Icon: MessagesIcon },
  { key: "payments", to: "/payments", label: "Payments", Icon: PaymentsIcon },
  { key: "settings", to: "/settings", label: "Settings", Icon: SettingsIcon },
];




export function BottomNav({ active }: Props) {
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
      {items.map(({ key, to, label, Icon }) => {
        const isActive = key === active;
        const color = isActive ? "#1877D6" : "#6B7280";
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
                style={{ backgroundColor: "#1877D6" }}
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

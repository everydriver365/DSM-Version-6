import { Link } from "@tanstack/react-router";
import { Home, Users, Calendar, MessageSquare, Settings } from "lucide-react";

export type NavKey = "home" | "pupils" | "schedule" | "messages" | "settings";

interface Props {
  active?: NavKey;
}

const items: { key: NavKey; to: string; label: string; Icon: typeof Home }[] = [
  { key: "home", to: "/home", label: "Home", Icon: Home },
  { key: "pupils", to: "/pupils", label: "Pupils", Icon: Users },
  { key: "schedule", to: "/schedule", label: "Schedule", Icon: Calendar },
  { key: "messages", to: "/messages", label: "Messages", Icon: MessageSquare },
  { key: "settings", to: "/settings", label: "Settings", Icon: Settings },
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
        const color = isActive ? "#0B7DDA" : "#6B7280";
        return (
          <Link
            key={key}
            to={to}
            className="flex-1 flex flex-col items-center justify-center gap-1 select-none"
            style={{ color }}
          >
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

import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Home, Users, Calendar, MessageSquare, Bell, Settings } from "lucide-react";
import { supabase } from "../../lib/supabaseClient";

export type NavKey = "home" | "pupils" | "schedule" | "messages" | "notifications" | "settings";

interface Props {
  active?: NavKey;
}

const items: { key: NavKey; to: string; label: string; Icon: typeof Home }[] = [
  { key: "home", to: "/home", label: "Home", Icon: Home },
  { key: "pupils", to: "/pupils", label: "Pupils", Icon: Users },
  { key: "schedule", to: "/schedule", label: "Schedule", Icon: Calendar },
  { key: "messages", to: "/messages", label: "Messages", Icon: MessageSquare },
  { key: "notifications", to: "/notifications", label: "Alerts", Icon: Bell },
  { key: "settings", to: "/settings", label: "Settings", Icon: Settings },
];

export function BottomNav({ active }: Props) {
  const [unread, setUnread] = useState<number>(0);

  useEffect(() => {
    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    async function load(uid: string) {
      const { count } = await supabase
        .from("instructor_notifications")
        .select("id", { count: "exact", head: true })
        .eq("instructor_id", uid)
        .eq("read", false);
      if (!cancelled) setUnread(count ?? 0);
    }

    (async () => {
      const { data } = await supabase.auth.getUser();
      const uid = data.user?.id;
      if (!uid || cancelled) return;
      await load(uid);
      channel = supabase
        .channel(`bn-notifs-${uid}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "instructor_notifications", filter: `instructor_id=eq.${uid}` },
          () => load(uid),
        )
        .subscribe();
    })();

    const onVis = () => {
      if (document.visibilityState === "visible") {
        supabase.auth.getUser().then(({ data }) => {
          const uid = data.user?.id;
          if (uid) load(uid);
        });
      }
    };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVis);
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  return (
    <nav
      className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] h-16 bg-white flex items-stretch z-50 pb-safe"
      style={{
        borderTopWidth: "0.5px",
        borderTopStyle: "solid",
        borderTopColor: "#E2E6ED",
        fontFamily: "Poppins, sans-serif",
      }}
    >
      {items.map(({ key, to, label, Icon }) => {
        const isActive = key === active;
        const color = isActive ? "#1A52A0" : "#6B7280";
        const showBadge = key === "notifications" && unread > 0;
        return (
          <Link
            key={key}
            to={to}
            className="flex-1 flex flex-col items-center justify-center gap-1 select-none"
            style={{ color }}
          >
            <span className="relative inline-flex">
              <Icon size={22} color={color} />
              {showBadge && (
                <span
                  className="absolute -top-1.5 -right-2 min-w-[16px] h-[16px] px-1 rounded-full flex items-center justify-center text-white text-[10px] font-semibold"
                  style={{ backgroundColor: "#DC2626", lineHeight: 1 }}
                  aria-label={`${unread} unread notifications`}
                >
                  {unread > 99 ? "99+" : unread}
                </span>
              )}
            </span>
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

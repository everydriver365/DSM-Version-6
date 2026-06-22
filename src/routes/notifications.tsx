import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Bell,
  Calendar as CalendarIcon,
  PoundSterling,
  Users,
} from "lucide-react";
import { SectionHeader } from "../components/dsm/SectionHeader";
import { supabase } from "../lib/supabaseClient";

export const Route = createFileRoute("/notifications")({
  head: () => ({
    meta: [{ title: "Notifications — DSM by EveryDriver" }],
  }),
  component: NotificationsPage,
});

const POPPINS = { fontFamily: "Poppins, sans-serif" } as const;

interface Notification {
  id: string;
  instructor_id: string;
  title: string;
  body: string | null;
  type: string | null;
  read: boolean;
  created_at: string;
  reference_id: string | null;
  reference_type: string | null;
}

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function sameDay(a: Date, b: Date) {
  return startOfDay(a).getTime() === startOfDay(b).getTime();
}
function dateGroupLabel(d: Date, today: Date, yesterday: Date) {
  if (sameDay(d, today)) return "TODAY";
  if (sameDay(d, yesterday)) return "YESTERDAY";
  return d
    .toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })
    .toUpperCase();
}
function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
}
function typeIcon(type: string | null) {
  switch (type) {
    case "lesson":
      return { bg: "#1A52A0", node: <CalendarIcon size={18} color="#FFFFFF" /> };
    case "payment":
      return { bg: "#16A34A", node: <PoundSterling size={18} color="#FFFFFF" /> };
    case "pupil":
      return { bg: "#F59E0B", node: <Users size={18} color="#FFFFFF" /> };
    default:
      return { bg: "#6B7280", node: <Bell size={18} color="#FFFFFF" /> };
  }
}

function NotificationsPage() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [items, setItems] = useState<Notification[] | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      const uid = data.user?.id ?? null;
      setUserId(uid);
      if (!uid) return;
      const { data: rows, error } = await supabase
        .from("instructor_notifications")
        .select("id, instructor_id, title, body, type, read, created_at, reference_id, reference_type")
        .eq("instructor_id", uid)
        .order("created_at", { ascending: false });
      if (error) console.error("[notifications] fetch error", error);
      setItems((rows ?? []) as Notification[]);
    })();
  }, []);

  async function markRead(id: string) {
    setItems((prev) => (prev ?? []).map((n) => (n.id === id ? { ...n, read: true } : n)));
    const { error } = await supabase
      .from("instructor_notifications")
      .update({ read: true })
      .eq("id", id);
    if (error) console.error("[notifications] mark read error", error);
  }

  async function markAllRead() {
    if (!userId) return;
    setItems((prev) => (prev ?? []).map((n) => ({ ...n, read: true })));
    const { error } = await supabase
      .from("instructor_notifications")
      .update({ read: true })
      .eq("instructor_id", userId)
      .eq("read", false);
    if (error) console.error("[notifications] mark all read error", error);
  }

  const today = startOfDay(new Date());
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  // Group preserving order
  const groups: { label: string; items: Notification[] }[] = [];
  (items ?? []).forEach((n) => {
    const label = dateGroupLabel(new Date(n.created_at), today, yesterday);
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.items.push(n);
    else groups.push({ label, items: [n] });
  });

  const hasAnyUnread = (items ?? []).some((n) => !n.read);

  return (
    <div className="min-h-screen bg-white pb-8" style={POPPINS}>
      {/* Top bar */}
      <div
        className="sticky top-0 z-40 flex items-center justify-between px-2"
        style={{ height: 52, backgroundColor: "#072b47" }}
      >
        <button
          type="button"
          aria-label="Back"
          onClick={() => navigate({ to: "/home" })}
          className="flex items-center justify-center"
          style={{ width: 40, height: 40 }}
        >
          <ArrowLeft size={22} color="#FFFFFF" />
        </button>
        <div
          className="flex-1 text-center text-[15px] font-semibold text-white"
          style={POPPINS}
        >
          Notifications
        </div>
        <button
          type="button"
          onClick={markAllRead}
          disabled={!hasAnyUnread}
          className="text-[12px] font-medium px-2 disabled:opacity-50"
          style={{ color: "#FFFFFF", ...POPPINS, minWidth: 80 }}
        >
          Mark all read
        </button>
      </div>

      <div className="px-4">
        {items === null ? null : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-2">
            <Bell size={32} color="#6B7280" />
            <p className="text-[14px] text-[#6B7280]" style={POPPINS}>
              No notifications
            </p>
          </div>
        ) : (
          groups.map((g) => (
            <div key={g.label}>
              <SectionHeader>{g.label}</SectionHeader>
              <div className="flex flex-col gap-2">
                {g.items.map((n) => {
                  const ic = typeIcon(n.type);
                  return (
                    <button
                      key={n.id}
                      type="button"
                      onClick={() => {
                        markRead(n.id);
                        if (n.type === "booking") {
                          if (n.reference_id) {
                            navigate({ to: "/courses/$id", params: { id: n.reference_id } });
                          } else {
                            navigate({ to: "/courses" });
                          }
                        } else if (n.type === "enquiry") {
                          navigate({ to: "/enquiries" });
                        } else if (n.type === "message") {
                          navigate({ to: "/messages" });
                        } else if (n.type === "tracking") {
                          navigate({ to: "/live" });
                        }
                      }}
                      className="w-full text-left rounded-xl overflow-hidden"
                      style={{
                        backgroundColor: n.read ? "#F8F9FB" : "#EEF4FB",
                        borderWidth: "0.5px",
                        borderStyle: "solid",
                        borderColor: "#E2E6ED",
                        borderLeftWidth: n.read ? "0.5px" : "3px",
                        borderLeftColor: n.read ? "#E2E6ED" : "#1A52A0",
                      }}
                    >
                      <div className="flex items-start gap-3 p-3">
                        <div
                          className="flex items-center justify-center rounded-full shrink-0"
                          style={{ width: 36, height: 36, backgroundColor: ic.bg }}
                        >
                          {ic.node}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div
                            className="text-[14px] font-semibold text-[#0F2044] truncate"
                            style={POPPINS}
                          >
                            {n.title}
                          </div>
                          {n.body && (
                            <div
                              className="text-[13px] text-[#6B7280] mt-0.5"
                              style={POPPINS}
                            >
                              {n.body}
                            </div>
                          )}
                        </div>
                        <div
                          className="text-[11px] text-[#6B7280] shrink-0"
                          style={POPPINS}
                        >
                          {formatTime(n.created_at)}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Bell,
  Calendar as CalendarIcon,
  CheckCheck,
  PoundSterling,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";
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
    if (error) {
      console.error("[notifications] mark all read error", error);
      toast.error("Failed to mark all as read");
    } else {
      toast.success("All marked as read");
    }
  }

  async function deleteOne(id: string) {
    setItems((prev) => (prev ?? []).filter((n) => n.id !== id));
    const { error } = await supabase
      .from("instructor_notifications")
      .delete()
      .eq("id", id);
    if (error) {
      console.error("[notifications] delete error", error);
      toast.error("Failed to remove notification");
    } else {
      toast("Notification removed");
    }
  }

  async function clearAllRead() {
    if (!userId) return;
    setItems((prev) => (prev ?? []).filter((n) => !n.read));
    const { error } = await supabase
      .from("instructor_notifications")
      .delete()
      .eq("instructor_id", userId)
      .eq("read", true);
    if (error) {
      console.error("[notifications] clear read error", error);
      toast.error("Failed to clear read notifications");
    } else {
      toast.success("Read notifications cleared");
    }
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
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={clearAllRead}
            disabled={!(items ?? []).some((n) => n.read)}
            className="flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded disabled:opacity-50"
            style={{ color: "#FFFFFF", ...POPPINS }}
            aria-label="Clear read notifications"
          >
            <Trash2 size={14} color="#FFFFFF" />
            Clear read
          </button>
          <button
            type="button"
            onClick={markAllRead}
            disabled={!hasAnyUnread}
            className="flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded disabled:opacity-50"
            style={{ color: "#FFFFFF", ...POPPINS }}
            aria-label="Mark all as read"
          >
            <CheckCheck size={14} color="#FFFFFF" />
            Mark all read
          </button>
        </div>
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
                    <div
                      key={n.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => {
                        markRead(n.id);
                        if (n.type === "booking" || n.reference_type === "course_booking") {
                          navigate({ to: "/schedule" });
                        } else if (n.type === "enquiry") {
                          navigate({ to: "/enquiries" });
                        } else if (n.type === "message") {
                          navigate({ to: "/messages" });
                        } else if (n.type === "tracking") {
                          navigate({ to: "/live" });
                        } else if (n.type === "quote_accepted") {
                          navigate({ to: "/quotes" });
                        }
                      }}
                      className="w-full text-left rounded-xl overflow-hidden cursor-pointer"
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
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <div
                            className="text-[11px] text-[#6B7280]"
                            style={POPPINS}
                          >
                            {formatTime(n.created_at)}
                          </div>
                          <button
                            type="button"
                            aria-label="Remove notification"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteOne(n.id);
                            }}
                            className="flex items-center justify-center -mr-1 -mb-1 p-1 rounded hover:bg-black/5"
                          >
                            <X size={16} color="#9CA3AF" />
                          </button>
                        </div>
                      </div>
                    </div>
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

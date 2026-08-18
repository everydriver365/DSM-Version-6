import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { type ReactNode, useEffect, useState } from "react";
import InstructorTopBar from "@/components/dsm/InstructorTopBar";
import { IconBell, IconCalendar, IconChecks, IconChevronRight, IconCircleX, IconCurrencyPound, IconHome, IconInbox, IconMessage, IconRefresh, IconSend, IconTrash, IconUsers, IconX } from "@tabler/icons-react";
import { toast } from "sonner";
import { supabase } from "../lib/supabaseClient";
import { PageLayout } from "@/components/PageLayout";
import { EmptyState } from "@/components/dsm/EmptyState";

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
      return { bg: "#1877D6", node: <IconCalendar size={18} color="#FFFFFF" /> };
    case "payment":
      return { bg: "#1877D6", node: <IconCurrencyPound stroke={1.5} size={18} color="#FFFFFF" /> };
    case "pupil":
      return { bg: "#1877D6", node: <IconUsers stroke={1.5} size={18} color="#FFFFFF" /> };
    case "lesson_cancelled_by_pupil":
      return { bg: "#CC2229", node: <IconCircleX stroke={1.5} size={18} color="#FFFFFF" /> };
    case "reschedule_request":
      return { bg: "#D97706", node: <IconRefresh stroke={1.5} size={18} color="#FFFFFF" /> };
    default:
      return { bg: "#6B7280", node: <IconBell stroke={1.5} size={18} color="#FFFFFF" /> };
  }
}

function typeTitle(type: string | null, fallback: string) {
  if (type === "lesson_cancelled_by_pupil") return "Lesson cancelled by pupil";
  if (type === "reschedule_request") return "Reschedule request";
  return fallback;
}

function getNotificationAction(
  notif: any
): {
  directNav?: string;
  options?: { label: string; route: string; icon: string }[];
  isMessage?: boolean;
  threadId?: string | null;
  senderName?: string | null;
  messagePreview?: string | null;
} {
  const type = notif.type ?? "";
  const meta = notif.metadata ?? {};

  // Message notifications show a richer bottom sheet with a quick reply option
  if (type === "message" || type === "new_message" || type === "message_received") {
    return {
      isMessage: true,
      threadId: meta.thread_id ?? meta.conversation_id ?? null,
      senderName: meta.sender_name ?? meta.from ?? null,
      messagePreview: meta.preview ?? meta.body ?? null,
      options: [
        {
          label: "Reply to message",
          route: meta.thread_id ? `/messages/${meta.thread_id}` : "/messages",
          icon: "reply",
        },
        {
          label: "Go to Messages",
          route: "/messages",
          icon: "message",
        },
      ],
    };
  }

  if (type === "enquiry" || type === "new_enquiry") {
    return { directNav: "/enquiries" };
  }

  if (type === "payment" || type === "payment_received" || type === "payment_overdue") {
    return { directNav: "/payments" };
  }

  if (type === "lesson" || type === "lesson_reminder" || type === "lesson_cancelled") {
    const lessonId = meta.lesson_id ?? notif.reference_id;
    if (lessonId) {
      return { directNav: `/lessons/${lessonId}` };
    }
    return { directNav: "/schedule" };
  }

  if (type === "pupil" || type === "new_pupil") {
    const pupilId = meta.pupil_id ?? notif.reference_id;
    if (pupilId) {
      return { directNav: `/pupils/${pupilId}` };
    }
    return { directNav: "/pupils" };
  }

  if (type === "calendar" || type === "calendar_sync") {
    return { directNav: "/calendarsync" };
  }

  if (type === "subscription" || type === "billing") {
    return { directNav: "/subscription" };
  }

  if (type === "managed_enquiry" || type === "cancellation_request") {
    return { directNav: "/more" };
  }

  if (type === "google_calendar" || type === "calendar_connected") {
    return { directNav: "/calendarsync" };
  }

  // Bottom sheet with options for anything else
  return {
    options: [
      { label: "Go to Schedule", route: "/schedule", icon: "calendar" },
      { label: "Go to Messages", route: "/messages", icon: "message" },
      { label: "Go to Dashboard", route: "/home", icon: "home" },
    ],
  };
}

function NotificationsPage() {
  const navigate = useNavigate();

  const [userId, setUserId] = useState<string | null>(null);
  const [items, setItems] = useState<Notification[] | null>(null);
  const [actionSheet, setActionSheet] = useState<{
    notif: any;
    options: { label: string; route: string; icon: string }[];
    isMessage?: boolean;
    threadId?: string | null;
    senderName?: string | null;
    messagePreview?: string | null;
  } | null>(null);

  const [quickReply, setQuickReply] = useState("");
  const [sendingReply, setSendingReply] = useState(false);

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

  async function markAsRead(notifId: string) {
    setItems((prev) => (prev ?? []).map((n) => (n.id === notifId ? { ...n, read: true } : n)));
    const { error } = await supabase
      .from("instructor_notifications")
      .update({ read: true })
      .eq("id", notifId);
    if (error) console.error("[notifications] mark read error", error);
    window.dispatchEvent(new Event("dsm-notifications-updated"));
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
    window.dispatchEvent(new Event("dsm-notifications-updated"));
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
    window.dispatchEvent(new Event("dsm-notifications-updated"));
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
    window.dispatchEvent(new Event("dsm-notifications-updated"));
  }

  async function sendQuickReply() {
    if (!quickReply.trim() || !actionSheet) return;
    setSendingReply(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const threadId =
        actionSheet.notif?.metadata?.thread_id ??
        actionSheet.notif?.metadata?.conversation_id;

      if (!threadId) {
        // No thread ID — navigate to messages instead
        navigate({ to: "/messages" as never });
        setActionSheet(null);
        setQuickReply("");
        return;
      }

      // Insert message into thread
      const { error } = await supabase
        .from("messages")
        .insert({
          conversation_id: threadId,
          sender_id: user.id,
          content: quickReply.trim(),
          created_at: new Date().toISOString(),
        });

      if (error) throw error;

      toast.success("Reply sent ✓");
      setQuickReply("");
      setActionSheet(null);
    } catch (e: any) {
      toast.error("Could not send reply");
    } finally {
      setSendingReply(false);
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
    <PageLayout className="pb-8" style={POPPINS}>
      <InstructorTopBar
        firstName=""
        pageTitle="Notifications"
        onBack={() => navigate({ to: "/home" as never })}
        onBell={() => navigate({ to: "/notifications" as never })}
        onPhone={() => navigate({ to: "/enquiries" as never })}
        onLiveTrack={() => navigate({ to: "/live" as never })}
        onMenu={() => navigate({ to: "/more" as never })}
        onMicPress={() => toast.info("Voice commands coming soon!")}
      />
      <div style={{ height: "calc(60px + env(safe-area-inset-top, 0px))" }} />

      {/* Action bar */}
      <div
        className="flex items-center justify-end gap-2"
        style={{ background: "#FFFFFF", padding: "8px 16px", borderBottom: "1px solid #EEF2F7" }}
      >
        <button
          type="button"
          onClick={clearAllRead}
          disabled={!(items ?? []).some((n) => n.read)}
          className="inline-flex items-center gap-1 text-[12px] font-medium px-2 py-1 rounded disabled:opacity-50"
          style={{ color: "#6B7280", ...POPPINS }}
          aria-label="Clear read notifications"
        >
          <IconTrash stroke={1.5} size={14} color="#6B7280" />
          Clear read
        </button>
        <button
          type="button"
          onClick={markAllRead}
          disabled={!hasAnyUnread}
          className="inline-flex items-center gap-1 text-[12px] font-semibold px-2 py-1 rounded disabled:opacity-50"
          style={{ color: "#1877D6", ...POPPINS }}
          aria-label="Mark all as read"
        >
          <IconChecks size={14} color="#1877D6" />
          Mark all read
        </button>
      </div>


      <div className="px-4">
        {items === null ? null : items.length === 0 ? (
          <EmptyState
            icon={<IconBell size={32} color="#9CA3AF" stroke={1.5} />}
            title="All caught up"
            subtitle="No notifications yet"
          />
        ) : (
          groups.map((g) => (
            <div key={g.label} style={{ marginTop: 18 }}>
              <div
                style={{
                  ...POPPINS,
                  fontSize: 11,
                  fontWeight: 600,
                  color: "#9CA3AF",
                  textTransform: "uppercase",
                  letterSpacing: 0.3,
                  marginLeft: 16,
                  marginBottom: 8,
                }}
              >
                {g.label}
              </div>
              <div
                style={{
                  background: "#FFFFFF",
                  borderRadius: 16,
                  boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
                  overflow: "hidden",
                }}
              >
                {g.items.map((n, index) => {
                  const ic = typeIcon(n.type);
                  const isLast = index === g.items.length - 1;
                  return (
                    <div key={n.id}>
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={async () => {
                          if (!n.read) {
                            await markAsRead(n.id);
                          }
                          const action = getNotificationAction(n);
                          if (action.directNav) {
                            const direct = action.directNav;
                            if (direct.startsWith("/lessons/") && direct !== "/lessons") {
                              navigate({ to: "/lessons/$id", params: { id: direct.split("/")[2] } });
                            } else if (direct.startsWith("/pupils/") && direct !== "/pupils") {
                              navigate({ to: "/pupils/$id", params: { id: direct.split("/")[2] } });
                            } else {
                              navigate({ to: direct as never });
                            }
                            return;
                          }
                          if (action.options) {
                            setActionSheet({
                              notif: n,
                              options: action.options,
                              isMessage: action.isMessage,
                              threadId: action.threadId,
                              senderName: action.senderName,
                              messagePreview: action.messagePreview,
                            });
                          }
                        }}
                        className="w-full text-left cursor-pointer"
                        style={{
                          background: n.read ? "#FFFFFF" : "#F5F9FF",
                          padding: "13px 16px",
                          position: "relative",
                        }}
                      >
                        <div className="flex items-start gap-3">
                          {/* Unread indicator */}
                          <div
                            style={{
                              width: 7,
                              flexShrink: 0,
                              display: "flex",
                              justifyContent: "center",
                              marginTop: 6,
                            }}
                          >
                            {!n.read && (
                              <div
                                style={{
                                  width: 7,
                                  height: 7,
                                  borderRadius: "50%",
                                  background: "#1877D6",
                                }}
                              />
                            )}
                          </div>

                          {/* Icon */}
                          <div
                            className="flex items-center justify-center rounded-full shrink-0"
                            style={{ width: 36, height: 36, backgroundColor: ic.bg }}
                          >
                            {ic.node}
                          </div>

                          {/* Content */}
                          <div className="min-w-0 flex-1">
                            <div
                              className="text-[14px] font-semibold text-[#0B1F3A] truncate"
                              style={POPPINS}
                            >
                              {typeTitle(n.type, n.title)}
                            </div>
                            {n.body && (
                              <div
                                className="text-[13px] text-[#6B7280] mt-0.5"
                                style={POPPINS}
                              >
                                {n.body}
                              </div>
                            )}
                            <div
                              className="text-[11px] text-[#9CA3AF] mt-0.5"
                              style={POPPINS}
                            >
                              {formatTime(n.created_at)}
                            </div>
                            {n.type === "lesson_cancelled_by_pupil" && (
                              <div className="flex items-center gap-2 mt-2">
                                {n.reference_id && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      markAsRead(n.id);
                                      navigate({ to: "/lessons/$id", params: { id: n.reference_id! } });
                                    }}
                                    className="text-[12px] font-semibold"
                                    style={{ color: "#0B1F3A", background: "none", border: "none", padding: 0, cursor: "pointer", ...POPPINS }}
                                  >
                                    View lesson →
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    markAsRead(n.id);
                                    navigate({ to: "/gaps" });
                                  }}
                                  className="text-[12px] font-semibold text-white"
                                  style={{ background: "#D97706", border: "none", borderRadius: 8, padding: "6px 12px", cursor: "pointer", ...POPPINS }}
                                >
                                  Fill slot →
                                </button>
                              </div>
                            )}
                            {n.type === "reschedule_request" && (
                              <div className="flex items-center gap-2 mt-2">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    markAsRead(n.id);
                                    navigate({ to: "/messages" });
                                  }}
                                  className="text-[12px] font-semibold"
                                  style={{ color: "#0B1F3A", background: "none", border: "none", padding: 0, cursor: "pointer", ...POPPINS }}
                                >
                                  View message →
                                </button>
                                {n.reference_id && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      markAsRead(n.id);
                                      navigate({ to: "/lessons/reschedule/$id", params: { id: n.reference_id! } });
                                    }}
                                    className="text-[12px] font-semibold text-white"
                                    style={{ background: "#1877D6", border: "none", borderRadius: 8, padding: "6px 12px", cursor: "pointer", ...POPPINS }}
                                  >
                                    Reschedule →
                                  </button>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Chevron + delete */}
                          <div className="flex flex-col items-center gap-0.5 shrink-0" style={{ marginTop: 2 }}>
                            <button
                              type="button"
                              aria-label="Remove notification"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteOne(n.id);
                              }}
                              className="flex items-center justify-center p-1 rounded hover:bg-black/5"
                            >
                              <IconX stroke={1.5} size={16} color="#9CA3AF" />
                            </button>
                            <IconChevronRight size={18} color="#9CA3AF" />
                          </div>
                        </div>
                      </div>

                      {/* Hairline divider — not on last */}
                      {!isLast && (
                        <div
                          style={{
                            height: 1,
                            background: "#E4E8EF",
                            marginLeft: 62,
                          }}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {actionSheet && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 300,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "flex-end",
          }}
          onClick={() => {
            setActionSheet(null);
            setQuickReply("");
          }}
        >
          <div
            style={{
              background: "#EEF2F7",
              borderRadius: "22px 22px 0 0",
              padding: "0 0 32px",
              width: "100%",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                width: 36,
                height: 5,
                background: "#D1D1D6",
                borderRadius: 3,
                margin: "12px auto 0",
              }}
            />
            {actionSheet.isMessage ? (
              <div
                style={{
                  margin: "16px 16px 8px",
                  background: "#fff",
                  borderRadius: 16,
                  border: "1px solid #E4E8EF",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    gap: 10,
                    alignItems: "center",
                    padding: "14px 16px",
                    borderBottom: "1px solid #E4E8EF",
                  }}
                >
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: "50%",
                      background: "#EDE9FE",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      fontSize: 14,
                      fontWeight: 700,
                      color: "#7C3AED",
                      ...POPPINS,
                    }}
                  >
                    {actionSheet.senderName?.[0] ?? "?"}
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 700,
                        color: "#0B1F3A",
                        ...POPPINS,
                      }}
                    >
                      {actionSheet.senderName ?? "Unknown sender"}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: "#9CA3AF",
                        marginTop: 2,
                        ...POPPINS,
                      }}
                    >
                      Sent you a message
                    </div>
                  </div>
                </div>
                {actionSheet.messagePreview && (
                  <div
                    style={{
                      padding: "12px 16px",
                      fontSize: 13,
                      color: "#6B7686",
                      lineHeight: 1.5,
                      fontStyle: "italic",
                      ...POPPINS,
                    }}
                  >
                    "{actionSheet.messagePreview}"
                  </div>
                )}
                <div
                  style={{
                    padding: "12px 16px",
                    borderTop: "1px solid #E4E8EF",
                    display: "flex",
                    gap: 8,
                    alignItems: "center",
                  }}
                >
                  <input
                    placeholder="Quick reply..."
                    value={quickReply}
                    onChange={(e) => setQuickReply(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && quickReply.trim() && !sendingReply) {
                        sendQuickReply();
                      }
                    }}
                    disabled={sendingReply}
                    style={{
                      flex: 1,
                      background: "#EEF2F7",
                      border: "none",
                      borderRadius: 20,
                      padding: "8px 14px",
                      fontSize: 13,
                      fontFamily: "Poppins, sans-serif",
                      outline: "none",
                    }}
                  />
                  <button
                    type="button"
                    disabled={!quickReply.trim() || sendingReply}
                    onClick={sendQuickReply}
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: "50%",
                      background: quickReply.trim() ? "#1877D6" : "#E4E8EF",
                      border: "none",
                      cursor: quickReply.trim() && !sendingReply ? "pointer" : "default",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <IconSend
                      size={16}
                      color={quickReply.trim() ? "#fff" : "#9CA3AF"}
                      stroke={1.5}
                    />
                  </button>
                </div>
              </div>
            ) : (
              <div
                style={{
                  margin: "16px 16px 8px",
                  background: "#fff",
                  borderRadius: 16,
                  border: "1px solid #E4E8EF",
                  padding: "14px 16px",
                }}
              >
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 700,
                    color: "#0B1F3A",
                    ...POPPINS,
                  }}
                >
                  {typeTitle(actionSheet.notif.type, actionSheet.notif.title)}
                </div>
                {actionSheet.notif.body && (
                  <div
                    style={{
                      fontSize: 12,
                      color: "#6B7686",
                      marginTop: 4,
                      ...POPPINS,
                    }}
                  >
                    {actionSheet.notif.body}
                  </div>
                )}
              </div>
            )}
            <div
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: "#9CA3AF",
                textTransform: "uppercase",
                padding: "8px 16px 6px",
                ...POPPINS,
              }}
            >
              GO TO
            </div>
            <div
              style={{
                margin: "0 16px",
                background: "#fff",
                borderRadius: 16,
                border: "1px solid #E4E8EF",
                overflow: "hidden",
              }}
            >
              {actionSheet.options.map((option, idx) => {
                const isLast = idx === actionSheet.options.length - 1;
                let iconNode: ReactNode;
                let iconBg: string;
                switch (option.icon) {
                  case "reply":
                    iconNode = <IconSend size={20} color="#1877D6" />;
                    iconBg = "#EFF6FF";
                    break;
                  case "calendar":
                    iconNode = <IconCalendar size={20} color="#1877D6" />;
                    iconBg = "#EFF6FF";
                    break;
                  case "message":
                    iconNode = <IconMessage size={20} color="#7C3AED" />;
                    iconBg = "#EDE9FE";
                    break;
                  case "home":
                    iconNode = <IconHome size={20} color="#15803D" />;
                    iconBg = "#DCFCE7";
                    break;
                  case "pupils":
                    iconNode = <IconUsers size={20} color="#1877D6" />;
                    iconBg = "#EFF6FF";
                    break;
                  case "payments":
                    iconNode = <IconCurrencyPound size={20} color="#D68A1B" />;
                    iconBg = "#FEF3C7";
                    break;
                  case "enquiries":
                    iconNode = <IconInbox size={20} color="#CC2229" />;
                    iconBg = "#FEE2E2";
                    break;
                  default:
                    iconNode = <IconBell size={20} color="#6B7280" />;
                    iconBg = "#F3F4F6";
                }
                return (
                  <div
                    key={option.route}
                    style={{
                      display: "flex",
                      gap: 12,
                      alignItems: "center",
                      padding: "14px 16px",
                      borderBottom: isLast ? undefined : "1px solid #E4E8EF",
                      cursor: "pointer",
                    }}
                    onClick={() => {
                      setActionSheet(null);
                      setQuickReply("");
                      navigate({ to: option.route as never });
                    }}
                  >
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: "50%",
                        background: iconBg,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      {iconNode}
                    </div>
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 600,
                        color: "#0B1F3A",
                        flex: 1,
                        ...POPPINS,
                      }}
                    >
                      {option.label}
                    </div>
                    <IconChevronRight size={16} color="#C7D0DC" stroke={2} />
                  </div>
                );
              })}
            </div>
            <button
              type="button"
              style={{
                margin: "12px 16px 0",
                width: "calc(100% - 32px)",
                background: "#fff",
                color: "#0B1F3A",
                borderRadius: 20,
                padding: 13,
                fontSize: 14,
                fontWeight: 700,
                border: "1px solid #E4E8EF",
                cursor: "pointer",
                ...POPPINS,
              }}
              onClick={() => {
                setActionSheet(null);
                setQuickReply("");
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </PageLayout>
  );
}

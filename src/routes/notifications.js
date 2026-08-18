import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import InstructorTopBar from "@/components/dsm/InstructorTopBar";
import { IconBell, IconCalendar, IconCalendarOff, IconCalendarPlus, IconChecks, IconChevronRight, IconCircleX, IconClock, IconCurrencyPound, IconHome, IconInbox, IconMessage, IconPlayerPlay, IconRefresh, IconSend, IconTrash, IconUser, IconUsers, IconVideo, IconX } from "@tabler/icons-react";
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
const POPPINS = { fontFamily: "Poppins, sans-serif" };
function startOfDay(d) {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
}
function sameDay(a, b) {
    return startOfDay(a).getTime() === startOfDay(b).getTime();
}
function dateGroupLabel(d, today, yesterday) {
    if (sameDay(d, today))
        return "TODAY";
    if (sameDay(d, yesterday))
        return "YESTERDAY";
    return d
        .toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })
        .toUpperCase();
}
function formatDate(iso) {
    return new Date(iso).toLocaleDateString("en-GB", {
        weekday: "short",
        day: "numeric",
        month: "short",
    });
}
function formatTime(iso) {
    return new Date(iso).toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
    });
}
function typeIcon(type) {
    switch (type) {
        case "lesson":
            return { bg: "#1877D6", node: <IconCalendar size={18} color="#FFFFFF"/> };
        case "payment":
            return { bg: "#1877D6", node: <IconCurrencyPound stroke={1.5} size={18} color="#FFFFFF"/> };
        case "pupil":
            return { bg: "#1877D6", node: <IconUsers stroke={1.5} size={18} color="#FFFFFF"/> };
        case "lesson_cancelled_by_pupil":
            return { bg: "#CC2229", node: <IconCircleX stroke={1.5} size={18} color="#FFFFFF"/> };
        case "reschedule_request":
            return { bg: "#D97706", node: <IconRefresh stroke={1.5} size={18} color="#FFFFFF"/> };
        default:
            return { bg: "#6B7280", node: <IconBell stroke={1.5} size={18} color="#FFFFFF"/> };
    }
}
function typeTitle(type, fallback) {
    if (type === "lesson_cancelled_by_pupil")
        return "Lesson cancelled by pupil";
    if (type === "reschedule_request")
        return "Reschedule request";
    return fallback;
}
function extractNameFromTitle(title) {
    if (!title)
        return null;
    const m = title.match(/(?:new\s+)?message\s+from\s+(.+)/i);
    return m ? m[1].trim() : null;
}
function getNotificationAction(notif) {
    const type = notif.type ?? "";
    const meta = notif.metadata ?? {};
    // Message notifications show a richer bottom sheet with a quick reply option.
    // Pupil messages use type "pupil_message" and reference_id is the pupil_id.
    // Instructor DMs use type "instructor_dm" and reference_id is the conversation_id.
    if (type === "message" ||
        type === "new_message" ||
        type === "message_received" ||
        type === "pupil_message" ||
        type === "instructor_dm") {
        const threadId = meta.thread_id ?? meta.conversation_id ?? notif.reference_id ?? null;
        const senderName = meta.sender_name ?? meta.from ?? extractNameFromTitle(notif.title) ?? null;
        const messagePreview = meta.preview ?? meta.body ?? notif.body ?? null;
        const isInstructorDm = type === "instructor_dm";
        const isPupilMessage = type === "pupil_message";
        const replyRoute = isInstructorDm && threadId
            ? `/messages/instructor/${threadId}`
            : isPupilMessage && threadId
                ? `/messages/${threadId}`
                : threadId
                    ? `/messages/${threadId}`
                    : "/messages";
        return {
            isMessage: true,
            threadId,
            senderName,
            messagePreview,
            options: [
                { label: "Reply to message", route: replyRoute, icon: "reply" },
                { label: "Go to Messages", route: "/messages", icon: "message" },
            ],
        };
    }
    if (type === "enquiry" || type === "new_enquiry") {
        return { directNav: "/enquiries" };
    }
    if (type === "payment" || type === "payment_received" || type === "payment_overdue") {
        return { directNav: "/payments" };
    }
    if (type === "lesson_cancelled" || type === "cancellation") {
        return {
            isCancellation: true,
            pupilId: meta.pupil_id ?? null,
            lessonId: meta.lesson_id ?? null,
            pupilName: meta.pupil_name ?? meta.pupil ?? null,
            pupilPhone: meta.pupil_phone ?? meta.phone ?? null,
            cancellationReason: meta.cancellation_reason ?? meta.reason ?? null,
            lessonDate: meta.lesson_date ?? null,
            lessonTime: meta.lesson_time ?? null,
            options: [],
        };
    }
    if (type === "lesson" || type === "lesson_reminder") {
        if (meta.lesson_id) {
            return { directNav: `/lessons/${meta.lesson_id}` };
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
    if (type === "dsm_live" || type === "live_session" || type === "live_starting" || type === "live_now" || type === "webinar" || type === "podcast") {
        return {
            isDSMLive: true,
            sessionId: meta.session_id ?? meta.live_id ?? null,
            sessionTitle: meta.title ?? meta.session_title ?? "DSM Live",
            sessionUrl: meta.url ?? meta.join_url ?? null,
            startTime: meta.start_time ?? meta.time ?? null,
            isLiveNow: type === "live_now" || meta.live_now === true || meta.status === "live",
            options: [],
        };
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
    const [userId, setUserId] = useState(null);
    const [items, setItems] = useState(null);
    const [actionSheet, setActionSheet] = useState(null);
    const [quickReply, setQuickReply] = useState("");
    const [sendingReply, setSendingReply] = useState(false);
    useEffect(() => {
        (async () => {
            const { data } = await supabase.auth.getUser();
            const uid = data.user?.id ?? null;
            setUserId(uid);
            if (!uid)
                return;
            const { data: rows, error } = await supabase
                .from("instructor_notifications")
                .select("id, instructor_id, title, body, type, read, created_at, reference_id, reference_type")
                .eq("instructor_id", uid)
                .order("created_at", { ascending: false });
            if (error)
                console.error("[notifications] fetch error", error);
            setItems((rows ?? []));
        })();
    }, []);
    async function markAsRead(notifId) {
        setItems((prev) => (prev ?? []).map((n) => (n.id === notifId ? { ...n, read: true } : n)));
        const { error } = await supabase
            .from("instructor_notifications")
            .update({ read: true })
            .eq("id", notifId);
        if (error)
            console.error("[notifications] mark read error", error);
        window.dispatchEvent(new Event("dsm-notifications-updated"));
    }
    async function markAllRead() {
        if (!userId)
            return;
        setItems((prev) => (prev ?? []).map((n) => ({ ...n, read: true })));
        const { error } = await supabase
            .from("instructor_notifications")
            .update({ read: true })
            .eq("instructor_id", userId)
            .eq("read", false);
        if (error) {
            console.error("[notifications] mark all read error", error);
            toast.error("Failed to mark all as read");
        }
        else {
            toast.success("All marked as read");
        }
        window.dispatchEvent(new Event("dsm-notifications-updated"));
    }
    async function deleteOne(id) {
        setItems((prev) => (prev ?? []).filter((n) => n.id !== id));
        const { error } = await supabase
            .from("instructor_notifications")
            .delete()
            .eq("id", id);
        if (error) {
            console.error("[notifications] delete error", error);
            toast.error("Failed to remove notification");
        }
        else {
            toast("Notification removed");
        }
        window.dispatchEvent(new Event("dsm-notifications-updated"));
    }
    async function clearAllRead() {
        if (!userId)
            return;
        setItems((prev) => (prev ?? []).filter((n) => !n.read));
        const { error } = await supabase
            .from("instructor_notifications")
            .delete()
            .eq("instructor_id", userId)
            .eq("read", true);
        if (error) {
            console.error("[notifications] clear read error", error);
            toast.error("Failed to clear read notifications");
        }
        else {
            toast.success("Read notifications cleared");
        }
        window.dispatchEvent(new Event("dsm-notifications-updated"));
    }
    async function sendQuickReply() {
        if (!quickReply.trim() || !actionSheet)
            return;
        setSendingReply(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user)
                return;
            const threadId = actionSheet.notif?.metadata?.thread_id ??
                actionSheet.notif?.metadata?.conversation_id ??
                actionSheet.notif?.reference_id;
            if (!threadId) {
                // No thread ID — navigate to messages instead
                navigate({ to: "/messages" });
                setActionSheet(null);
                setQuickReply("");
                return;
            }
            const type = actionSheet.notifType ?? actionSheet.notif?.type ?? "";
            const text = quickReply.trim();
            if (type === "instructor_dm") {
                // Fetch conversation to know the recipient
                const { data: conv, error: convErr } = await supabase
                    .from("instructor_conversations")
                    .select("instructor_a_id, instructor_b_id")
                    .eq("id", threadId)
                    .single();
                if (convErr || !conv) {
                    throw new Error("Could not load conversation");
                }
                const otherId = conv.instructor_a_id === user.id
                    ? conv.instructor_b_id
                    : conv.instructor_a_id;
                const { error } = await supabase.from("instructor_messages").insert({
                    conversation_id: threadId,
                    from_instructor_id: user.id,
                    to_instructor_id: otherId,
                    body: text,
                });
                if (error)
                    throw error;
            }
            else if (type === "pupil_message") {
                const { error } = await supabase.from("chat_messages").insert({
                    instructor_id: user.id,
                    pupil_id: threadId,
                    sender_type: "instructor",
                    sender_id: user.id,
                    body: text,
                });
                if (error)
                    throw error;
            }
            else {
                // Fallback legacy message type — assume chat_messages
                const { error } = await supabase.from("chat_messages").insert({
                    instructor_id: user.id,
                    pupil_id: threadId,
                    sender_type: "instructor",
                    sender_id: user.id,
                    body: text,
                });
                if (error)
                    throw error;
            }
            toast.success("Reply sent ✓");
            setQuickReply("");
            setActionSheet(null);
        }
        catch (e) {
            toast.error("Could not send reply");
        }
        finally {
            setSendingReply(false);
        }
    }
    const today = startOfDay(new Date());
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    // Group preserving order
    const groups = [];
    (items ?? []).forEach((n) => {
        const label = dateGroupLabel(new Date(n.created_at), today, yesterday);
        const last = groups[groups.length - 1];
        if (last && last.label === label)
            last.items.push(n);
        else
            groups.push({ label, items: [n] });
    });
    const hasAnyUnread = (items ?? []).some((n) => !n.read);
    return (<PageLayout className="pb-8" style={POPPINS}>
      <InstructorTopBar firstName="" pageTitle="Notifications" onBack={() => navigate({ to: "/home" })} onBell={() => navigate({ to: "/notifications" })} onPhone={() => navigate({ to: "/enquiries" })} onLiveTrack={() => navigate({ to: "/live" })} onMenu={() => navigate({ to: "/more" })} onMicPress={() => toast.info("Voice commands coming soon!")}/>
      <div style={{ height: "calc(60px + env(safe-area-inset-top, 0px))" }}/>

      {/* Action bar */}
      <div className="flex items-center justify-end gap-2" style={{ background: "#FFFFFF", padding: "8px 16px", borderBottom: "1px solid #EEF2F7" }}>
        <button type="button" onClick={clearAllRead} disabled={!(items ?? []).some((n) => n.read)} className="inline-flex items-center gap-1 text-[12px] font-medium px-2 py-1 rounded disabled:opacity-50" style={{ color: "#6B7280", ...POPPINS }} aria-label="Clear read notifications">
          <IconTrash stroke={1.5} size={14} color="#6B7280"/>
          Clear read
        </button>
        <button type="button" onClick={markAllRead} disabled={!hasAnyUnread} className="inline-flex items-center gap-1 text-[12px] font-semibold px-2 py-1 rounded disabled:opacity-50" style={{ color: "#1877D6", ...POPPINS }} aria-label="Mark all as read">
          <IconChecks size={14} color="#1877D6"/>
          Mark all read
        </button>
      </div>


      <div className="px-4">
        {items === null ? null : items.length === 0 ? (<EmptyState icon={<IconBell size={32} color="#9CA3AF" stroke={1.5}/>} title="All caught up" subtitle="No notifications yet"/>) : (groups.map((g) => (<div key={g.label} style={{ marginTop: 18 }}>
              <div style={{
                ...POPPINS,
                fontSize: 11,
                fontWeight: 600,
                color: "#9CA3AF",
                textTransform: "uppercase",
                letterSpacing: 0.3,
                marginLeft: 16,
                marginBottom: 8,
            }}>
                {g.label}
              </div>
              <div style={{
                background: "#FFFFFF",
                borderRadius: 16,
                boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
                overflow: "hidden",
            }}>
                {g.items.map((n, index) => {
                const ic = typeIcon(n.type);
                const isLast = index === g.items.length - 1;
                return (<div key={n.id}>
                      <div role="button" tabIndex={0} onClick={async () => {
                        if (!n.read) {
                            await markAsRead(n.id);
                        }
                        const action = getNotificationAction(n);
                        if (action.directNav) {
                            const direct = action.directNav;
                            if (direct.startsWith("/lessons/") && direct !== "/lessons") {
                                navigate({ to: "/lessons/$id", params: { id: direct.split("/")[2] } });
                            }
                            else if (direct.startsWith("/pupils/") && direct !== "/pupils") {
                                navigate({ to: "/pupils/$id", params: { id: direct.split("/")[2] } });
                            }
                            else {
                                navigate({ to: direct });
                            }
                            return;
                        }
                        if (action.options) {
                            setActionSheet({
                                notif: n,
                                notifType: n.type,
                                options: action.options,
                                isMessage: action.isMessage,
                                threadId: action.threadId,
                                senderName: action.senderName,
                                messagePreview: action.messagePreview,
                                isCancellation: action.isCancellation,
                                pupilId: action.pupilId,
                                lessonId: action.lessonId,
                                pupilName: action.pupilName,
                                pupilPhone: action.pupilPhone,
                                cancellationReason: action.cancellationReason,
                                lessonDate: action.lessonDate,
                                lessonTime: action.lessonTime,
                                isDSMLive: action.isDSMLive,
                                sessionId: action.sessionId,
                                sessionTitle: action.sessionTitle,
                                sessionUrl: action.sessionUrl,
                                startTime: action.startTime,
                                isLiveNow: action.isLiveNow,
                            });
                        }
                    }} className="w-full text-left cursor-pointer" style={{
                        background: n.read ? "#FFFFFF" : "#F5F9FF",
                        padding: "13px 16px",
                        position: "relative",
                    }}>
                        <div className="flex items-start gap-3">
                          {/* Unread indicator */}
                          <div style={{
                        width: 7,
                        flexShrink: 0,
                        display: "flex",
                        justifyContent: "center",
                        marginTop: 6,
                    }}>
                            {!n.read && (<div style={{
                            width: 7,
                            height: 7,
                            borderRadius: "50%",
                            background: "#1877D6",
                        }}/>)}
                          </div>

                          {/* Icon */}
                          <div className="flex items-center justify-center rounded-full shrink-0" style={{ width: 36, height: 36, backgroundColor: ic.bg }}>
                            {ic.node}
                          </div>

                          {/* Content */}
                          <div className="min-w-0 flex-1">
                            <div className="text-[14px] font-semibold text-[#0B1F3A] truncate" style={POPPINS}>
                              {typeTitle(n.type, n.title)}
                            </div>
                            {n.body && (<div className="text-[13px] text-[#6B7280] mt-0.5" style={POPPINS}>
                                {n.body}
                              </div>)}
                            <div className="text-[11px] text-[#9CA3AF] mt-0.5" style={POPPINS}>
                              {formatTime(n.created_at)}
                            </div>
                            {n.type === "lesson_cancelled_by_pupil" && (<div className="flex items-center gap-2 mt-2">
                                {n.reference_id && (<button type="button" onClick={(e) => {
                                e.stopPropagation();
                                markAsRead(n.id);
                                navigate({ to: "/lessons/$id", params: { id: n.reference_id } });
                            }} className="text-[12px] font-semibold" style={{ color: "#0B1F3A", background: "none", border: "none", padding: 0, cursor: "pointer", ...POPPINS }}>
                                    View lesson →
                                  </button>)}
                                <button type="button" onClick={(e) => {
                            e.stopPropagation();
                            markAsRead(n.id);
                            navigate({ to: "/gaps" });
                        }} className="text-[12px] font-semibold text-white" style={{ background: "#D97706", border: "none", borderRadius: 8, padding: "6px 12px", cursor: "pointer", ...POPPINS }}>
                                  Fill slot →
                                </button>
                              </div>)}
                            {n.type === "reschedule_request" && (<div className="flex items-center gap-2 mt-2">
                                <button type="button" onClick={(e) => {
                            e.stopPropagation();
                            markAsRead(n.id);
                            navigate({ to: "/messages" });
                        }} className="text-[12px] font-semibold" style={{ color: "#0B1F3A", background: "none", border: "none", padding: 0, cursor: "pointer", ...POPPINS }}>
                                  View message →
                                </button>
                                {n.reference_id && (<button type="button" onClick={(e) => {
                                e.stopPropagation();
                                markAsRead(n.id);
                                navigate({ to: "/lessons/reschedule/$id", params: { id: n.reference_id } });
                            }} className="text-[12px] font-semibold text-white" style={{ background: "#1877D6", border: "none", borderRadius: 8, padding: "6px 12px", cursor: "pointer", ...POPPINS }}>
                                    Reschedule →
                                  </button>)}
                              </div>)}
                          </div>

                          {/* Chevron + delete */}
                          <div className="flex flex-col items-center gap-0.5 shrink-0" style={{ marginTop: 2 }}>
                            <button type="button" aria-label="Remove notification" onClick={(e) => {
                        e.stopPropagation();
                        deleteOne(n.id);
                    }} className="flex items-center justify-center p-1 rounded hover:bg-black/5">
                              <IconX stroke={1.5} size={16} color="#9CA3AF"/>
                            </button>
                            <IconChevronRight size={18} color="#9CA3AF"/>
                          </div>
                        </div>
                      </div>

                      {/* Hairline divider — not on last */}
                      {!isLast && (<div style={{
                            height: 1,
                            background: "#E4E8EF",
                            marginLeft: 62,
                        }}/>)}
                    </div>);
            })}
              </div>
            </div>)))}
      </div>

      {actionSheet && (<div style={{
                position: "fixed",
                inset: 0,
                zIndex: 300,
                background: "rgba(0,0,0,0.5)",
                display: "flex",
                alignItems: "flex-end",
            }} onClick={() => {
                setActionSheet(null);
                setQuickReply("");
            }}>
          <div style={{
                background: "#EEF2F7",
                borderRadius: "22px 22px 0 0",
                padding: "0 0 32px",
                width: "100%",
            }} onClick={(e) => e.stopPropagation()}>
            <div style={{
                width: 36,
                height: 5,
                background: "#D1D1D6",
                borderRadius: 3,
                margin: "12px auto 0",
            }}/>
            {actionSheet.isMessage ? (<div style={{
                    margin: "16px 16px 8px",
                    background: "#fff",
                    borderRadius: 16,
                    border: "1px solid #E4E8EF",
                    overflow: "hidden",
                }}>
                <div style={{
                    display: "flex",
                    gap: 10,
                    alignItems: "center",
                    padding: "14px 16px",
                    borderBottom: "1px solid #E4E8EF",
                }}>
                  <div style={{
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
                }}>
                    {actionSheet.senderName?.[0] ?? "?"}
                  </div>
                  <div>
                    <div style={{
                    fontSize: 14,
                    fontWeight: 700,
                    color: "#0B1F3A",
                    ...POPPINS,
                }}>
                      {actionSheet.senderName ?? "Unknown sender"}
                    </div>
                    <div style={{
                    fontSize: 11,
                    color: "#9CA3AF",
                    marginTop: 2,
                    ...POPPINS,
                }}>
                      Sent you a message
                    </div>
                  </div>
                </div>
                {actionSheet.messagePreview && (<div style={{
                        padding: "12px 16px",
                        fontSize: 13,
                        color: "#6B7686",
                        lineHeight: 1.5,
                        fontStyle: "italic",
                        ...POPPINS,
                    }}>
                    "{actionSheet.messagePreview}"
                  </div>)}
                <div style={{
                    padding: "12px 16px",
                    borderTop: "1px solid #E4E8EF",
                    display: "flex",
                    gap: 8,
                    alignItems: "center",
                }}>
                  <input placeholder="Quick reply..." value={quickReply} onChange={(e) => setQuickReply(e.target.value)} onKeyDown={(e) => {
                    if (e.key === "Enter" && quickReply.trim() && !sendingReply) {
                        sendQuickReply();
                    }
                }} disabled={sendingReply} style={{
                    flex: 1,
                    background: "#EEF2F7",
                    border: "none",
                    borderRadius: 20,
                    padding: "8px 14px",
                    fontSize: 13,
                    fontFamily: "Poppins, sans-serif",
                    outline: "none",
                }}/>
                  <button type="button" disabled={!quickReply.trim() || sendingReply} onClick={sendQuickReply} style={{
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
                }}>
                    <IconSend size={16} color={quickReply.trim() ? "#fff" : "#9CA3AF"} stroke={1.5}/>
                  </button>
                </div>
              </div>) : actionSheet.isCancellation ? (<>
                <div style={{
                    margin: "16px 16px 8px",
                    background: "#FEE2E2",
                    borderRadius: 16,
                    border: "1px solid #FECACA",
                    padding: "14px 16px",
                }}>
                  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <div style={{
                    width: 36,
                    height: 36,
                    borderRadius: "50%",
                    background: "#FEE2E2",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                }}>
                      <IconCalendarOff size={18} color="#CC2229" stroke={1.5}/>
                    </div>
                    <div>
                      <div style={{
                    fontSize: 14,
                    fontWeight: 700,
                    color: "#CC2229",
                    ...POPPINS,
                }}>
                        Lesson cancelled
                      </div>
                      {actionSheet.lessonDate && actionSheet.lessonTime && (<div style={{
                        fontSize: 11,
                        color: "rgba(204, 34, 41, 0.7)",
                        marginTop: 2,
                        ...POPPINS,
                    }}>
                          {formatDate(actionSheet.lessonDate)} at {actionSheet.lessonTime}
                        </div>)}
                    </div>
                  </div>
                  {actionSheet.pupilName && (<div style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: "#0B1F3A",
                        marginTop: 10,
                        ...POPPINS,
                    }}>
                      Cancelled by {actionSheet.pupilName}
                    </div>)}
                  {actionSheet.cancellationReason ? (<div style={{
                        marginTop: 8,
                        background: "rgba(255,255,255,0.6)",
                        borderRadius: 10,
                        padding: "10px 12px",
                    }}>
                      <div style={{
                        fontSize: 11,
                        fontWeight: 600,
                        color: "#CC2229",
                        marginBottom: 4,
                        ...POPPINS,
                    }}>
                        Reason:
                      </div>
                      <div style={{
                        fontSize: 13,
                        color: "#991B1B",
                        lineHeight: 1.5,
                        ...POPPINS,
                    }}>
                        {actionSheet.cancellationReason}
                      </div>
                    </div>) : (<div style={{
                        fontSize: 13,
                        color: "rgba(204, 34, 41, 0.6)",
                        fontStyle: "italic",
                        marginTop: 8,
                        ...POPPINS,
                    }}>
                      No reason provided
                    </div>)}
                </div>
                <div style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: "#9CA3AF",
                    textTransform: "uppercase",
                    padding: "8px 16px 6px",
                    ...POPPINS,
                }}>
                  WHAT WOULD YOU LIKE TO DO?
                </div>
                <div style={{
                    margin: "0 16px",
                    background: "#fff",
                    borderRadius: 16,
                    border: "1px solid #E4E8EF",
                    overflow: "hidden",
                }}>
                  <div style={{
                    display: "flex",
                    gap: 12,
                    alignItems: "center",
                    padding: "14px 16px",
                    borderBottom: "1px solid #E4E8EF",
                    cursor: "pointer",
                }} onClick={() => {
                    if (actionSheet.pupilPhone) {
                        window.open(`sms:${actionSheet.pupilPhone}?body=${encodeURIComponent("Hi " +
                            (actionSheet.pupilName ?? "") +
                            ", sorry to hear you need to cancel. Would you like to reschedule?")}`, "_blank");
                    }
                    else {
                        toast.error("No phone number on record");
                    }
                    setActionSheet(null);
                    setQuickReply("");
                }}>
                    <div style={{
                    width: 36,
                    height: 36,
                    borderRadius: "50%",
                    background: "#DCFCE7",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                }}>
                      <IconMessage size={18} color="#15803D" stroke={1.5}/>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: "#0B1F3A",
                    ...POPPINS,
                }}>
                        Send a text
                      </div>
                      <div style={{
                    fontSize: 11,
                    color: "#9CA3AF",
                    marginTop: 2,
                    ...POPPINS,
                }}>
                        Message {actionSheet.pupilName ?? "pupil"} about rescheduling
                      </div>
                    </div>
                    <IconChevronRight size={16} color="#C7D0DC" stroke={2}/>
                  </div>
                  <div style={{
                    display: "flex",
                    gap: 12,
                    alignItems: "center",
                    padding: "14px 16px",
                    borderBottom: "1px solid #E4E8EF",
                    cursor: "pointer",
                }} onClick={() => {
                    setActionSheet(null);
                    setQuickReply("");
                    navigate({
                        to: "/lessons/new",
                        search: (actionSheet.pupilId
                            ? { pupilId: actionSheet.pupilId }
                            : undefined),
                    });
                }}>
                    <div style={{
                    width: 36,
                    height: 36,
                    borderRadius: "50%",
                    background: "#EFF6FF",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                }}>
                      <IconCalendarPlus size={18} color="#1877D6" stroke={1.5}/>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: "#0B1F3A",
                    ...POPPINS,
                }}>
                        Reschedule lesson
                      </div>
                      <div style={{
                    fontSize: 11,
                    color: "#9CA3AF",
                    marginTop: 2,
                    ...POPPINS,
                }}>
                        Book a new lesson for {actionSheet.pupilName ?? "this pupil"}
                      </div>
                    </div>
                    <IconChevronRight size={16} color="#C7D0DC" stroke={2}/>
                  </div>
                  <div style={{
                    display: "flex",
                    gap: 12,
                    alignItems: "center",
                    padding: "14px 16px",
                    cursor: "pointer",
                }} onClick={() => {
                    setActionSheet(null);
                    setQuickReply("");
                    if (actionSheet.pupilId) {
                        navigate({
                            to: `/pupils/${actionSheet.pupilId}`,
                        });
                    }
                    else {
                        navigate({ to: "/pupils" });
                    }
                }}>
                    <div style={{
                    width: 36,
                    height: 36,
                    borderRadius: "50%",
                    background: "#EDE9FE",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                }}>
                      <IconUser size={18} color="#7C3AED" stroke={1.5}/>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: "#0B1F3A",
                    ...POPPINS,
                }}>
                        View pupil's lessons
                      </div>
                      <div style={{
                    fontSize: 11,
                    color: "#9CA3AF",
                    marginTop: 2,
                    ...POPPINS,
                }}>
                        {actionSheet.pupilName ?? "Pupil"}'s lesson history
                      </div>
                    </div>
                    <IconChevronRight size={16} color="#C7D0DC" stroke={2}/>
                  </div>
                </div>
                <button type="button" style={{
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
                }} onClick={() => {
                    setActionSheet(null);
                    setQuickReply("");
                }}>
                  Dismiss
                </button>
              </>) : actionSheet.isDSMLive ? (<>
                <style>{`
                  @keyframes dsm-live-pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.4; }
                  }
                `}</style>
                <div style={{
                    margin: "16px 16px 8px",
                    background: actionSheet.isLiveNow
                        ? "linear-gradient(135deg, #CC2229, #991B1B)"
                        : "linear-gradient(135deg, #14509E, #0B1F3A)",
                    borderRadius: 16,
                    padding: 16,
                    boxShadow: "0 4px 0 rgba(0,0,0,0.2)",
                }}>
                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                }}>
                    {actionSheet.isLiveNow ? (<div style={{
                        display: "flex",
                        gap: 6,
                        alignItems: "center",
                        background: "rgba(255,255,255,0.2)",
                        borderRadius: 20,
                        padding: "4px 10px",
                    }}>
                        <span style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: "#fff",
                        animation: "dsm-live-pulse 1.5s ease-in-out infinite",
                    }}/>
                        <span style={{
                        fontSize: 10,
                        fontWeight: 800,
                        color: "#fff",
                        ...POPPINS,
                    }}>
                          LIVE NOW
                        </span>
                      </div>) : (<div style={{
                        background: "rgba(255,255,255,0.2)",
                        borderRadius: 20,
                        padding: "4px 10px",
                    }}>
                        <span style={{
                        fontSize: 10,
                        fontWeight: 800,
                        color: "#fff",
                        ...POPPINS,
                    }}>
                          DSM LIVE
                        </span>
                      </div>)}
                  </div>
                  <div style={{
                    fontSize: 18,
                    fontWeight: 800,
                    color: "#fff",
                    marginTop: 10,
                    letterSpacing: -0.3,
                    ...POPPINS,
                }}>
                    {actionSheet.sessionTitle}
                  </div>
                  {actionSheet.startTime && !actionSheet.isLiveNow && (<div style={{
                        display: "flex",
                        gap: 6,
                        alignItems: "center",
                        marginTop: 6,
                    }}>
                      <IconClock size={13} color="rgba(255,255,255,0.7)" stroke={1.5}/>
                      <span style={{
                        fontSize: 12,
                        color: "rgba(255,255,255,0.7)",
                        ...POPPINS,
                    }}>
                        {actionSheet.startTime}
                      </span>
                    </div>)}
                  <button type="button" style={{
                    marginTop: 14,
                    width: "100%",
                    background: "#fff",
                    color: actionSheet.isLiveNow ? "#CC2229" : "#14509E",
                    borderRadius: 20,
                    padding: 12,
                    fontSize: 14,
                    fontWeight: 800,
                    border: "none",
                    cursor: "pointer",
                    fontFamily: "Poppins, sans-serif",
                    display: "flex",
                    gap: 8,
                    alignItems: "center",
                    justifyContent: "center",
                }} onClick={() => {
                    const url = actionSheet.sessionUrl ??
                        (actionSheet.sessionId ? `/dsm-live/${actionSheet.sessionId}` : "/dsm-live");
                    if (actionSheet.sessionUrl) {
                        window.open(url, "_blank");
                    }
                    else {
                        navigate({ to: url });
                    }
                    setActionSheet(null);
                }}>
                    <IconPlayerPlay size={16} color={actionSheet.isLiveNow ? "#CC2229" : "#14509E"} stroke={2}/>
                    <span>{actionSheet.isLiveNow ? "Join now →" : "Join session →"}</span>
                  </button>
                </div>
                <div style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: "#9CA3AF",
                    textTransform: "uppercase",
                    padding: "8px 16px 6px",
                    ...POPPINS,
                }}>
                  MORE OPTIONS
                </div>
                <div style={{
                    margin: "0 16px",
                    background: "#fff",
                    borderRadius: 16,
                    border: "1px solid #E4E8EF",
                    overflow: "hidden",
                }}>
                  <div style={{
                    display: "flex",
                    gap: 12,
                    alignItems: "center",
                    padding: "14px 16px",
                    borderBottom: "1px solid #E4E8EF",
                    cursor: "pointer",
                }} onClick={() => {
                    setActionSheet(null);
                    setQuickReply("");
                    navigate({ to: "/dsm-live" });
                }}>
                    <div style={{
                    width: 36,
                    height: 36,
                    borderRadius: "50%",
                    background: actionSheet.isLiveNow ? "#FEE2E2" : "#EFF6FF",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                }}>
                      <IconVideo size={18} color={actionSheet.isLiveNow ? "#CC2229" : "#1877D6"} stroke={1.5}/>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: "#0B1F3A",
                    ...POPPINS,
                }}>
                        View all DSM Live
                      </div>
                      <div style={{
                    fontSize: 11,
                    color: "#9CA3AF",
                    marginTop: 2,
                    ...POPPINS,
                }}>
                        Browse upcoming sessions and replays
                      </div>
                    </div>
                    <IconChevronRight size={16} color="#C7D0DC" stroke={2}/>
                  </div>
                  <div style={{
                    display: "flex",
                    gap: 12,
                    alignItems: "center",
                    padding: "14px 16px",
                    cursor: "pointer",
                }} onClick={() => {
                    if (actionSheet.sessionUrl) {
                        const calUrl = `https://www.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(actionSheet.sessionTitle ?? "DSM Live")}&details=${encodeURIComponent("Join at: " + (actionSheet.sessionUrl ?? ""))}`;
                        window.open(calUrl, "_blank");
                    }
                    else {
                        toast.info("No session URL available");
                    }
                    setActionSheet(null);
                }}>
                    <div style={{
                    width: 36,
                    height: 36,
                    borderRadius: "50%",
                    background: "#F0FDF4",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                }}>
                      <IconCalendarPlus size={18} color="#15803D" stroke={1.5}/>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: "#0B1F3A",
                    ...POPPINS,
                }}>
                        Add to Google Calendar
                      </div>
                      <div style={{
                    fontSize: 11,
                    color: "#9CA3AF",
                    marginTop: 2,
                    ...POPPINS,
                }}>
                        Save this session to your calendar
                      </div>
                    </div>
                    <IconChevronRight size={16} color="#C7D0DC" stroke={2}/>
                  </div>
                </div>
                <button type="button" style={{
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
                }} onClick={() => {
                    setActionSheet(null);
                    setQuickReply("");
                }}>
                  Dismiss
                </button>
              </>) : (<>
                <div style={{
                    margin: "16px 16px 8px",
                    background: "#fff",
                    borderRadius: 16,
                    border: "1px solid #E4E8EF",
                    padding: "14px 16px",
                }}>
                  <div style={{
                    fontSize: 14,
                    fontWeight: 700,
                    color: "#0B1F3A",
                    ...POPPINS,
                }}>
                    {typeTitle(actionSheet.notif.type, actionSheet.notif.title)}
                  </div>
                  {actionSheet.notif.body && (<div style={{
                        fontSize: 12,
                        color: "#6B7686",
                        marginTop: 4,
                        ...POPPINS,
                    }}>
                      {actionSheet.notif.body}
                    </div>)}
                </div>
                <div style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: "#9CA3AF",
                    textTransform: "uppercase",
                    padding: "8px 16px 6px",
                    ...POPPINS,
                }}>
                  GO TO
                </div>
                <div style={{
                    margin: "0 16px",
                    background: "#fff",
                    borderRadius: 16,
                    border: "1px solid #E4E8EF",
                    overflow: "hidden",
                }}>
                  {actionSheet.options.map((option, idx) => {
                    const isLast = idx === actionSheet.options.length - 1;
                    let iconNode;
                    let iconBg;
                    switch (option.icon) {
                        case "reply":
                            iconNode = <IconSend size={20} color="#1877D6"/>;
                            iconBg = "#EFF6FF";
                            break;
                        case "calendar":
                            iconNode = <IconCalendar size={20} color="#1877D6"/>;
                            iconBg = "#EFF6FF";
                            break;
                        case "message":
                            iconNode = <IconMessage size={20} color="#7C3AED"/>;
                            iconBg = "#EDE9FE";
                            break;
                        case "home":
                            iconNode = <IconHome size={20} color="#15803D"/>;
                            iconBg = "#DCFCE7";
                            break;
                        case "pupils":
                            iconNode = <IconUsers size={20} color="#1877D6"/>;
                            iconBg = "#EFF6FF";
                            break;
                        case "payments":
                            iconNode = <IconCurrencyPound size={20} color="#D68A1B"/>;
                            iconBg = "#FEF3C7";
                            break;
                        case "enquiries":
                            iconNode = <IconInbox size={20} color="#CC2229"/>;
                            iconBg = "#FEE2E2";
                            break;
                        default:
                            iconNode = <IconBell size={20} color="#6B7280"/>;
                            iconBg = "#F3F4F6";
                    }
                    return (<div key={option.route} style={{
                            display: "flex",
                            gap: 12,
                            alignItems: "center",
                            padding: "14px 16px",
                            borderBottom: isLast ? undefined : "1px solid #E4E8EF",
                            cursor: "pointer",
                        }} onClick={() => {
                            setActionSheet(null);
                            setQuickReply("");
                            navigate({ to: option.route });
                        }}>
                        <div style={{
                            width: 36,
                            height: 36,
                            borderRadius: "50%",
                            background: iconBg,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                        }}>
                          {iconNode}
                        </div>
                        <div style={{
                            fontSize: 14,
                            fontWeight: 600,
                            color: "#0B1F3A",
                            flex: 1,
                            ...POPPINS,
                        }}>
                          {option.label}
                        </div>
                        <IconChevronRight size={16} color="#C7D0DC" stroke={2}/>
                      </div>);
                })}
                </div>
                <button type="button" style={{
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
                }} onClick={() => {
                    setActionSheet(null);
                    setQuickReply("");
                }}>
                  Cancel
                </button>
              </>)}
          </div>
        </div>)}
    </PageLayout>);
}

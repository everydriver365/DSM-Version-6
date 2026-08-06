import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  IconChevronLeft,
  IconSend,
  IconPaperclip,
} from "@tabler/icons-react";
import { supabase } from "../lib/supabaseClient";

export const Route = createFileRoute("/messages/instructor/$conversationId")({
  head: () => ({
    meta: [
      { title: "Instructor chat — DSM by EveryDriver" },
      {
        name: "description",
        content:
          "Private one-to-one messaging between driving instructors on DSM by EveryDriver.",
      },
      { property: "og:title", content: "Instructor chat — DSM by EveryDriver" },
      {
        property: "og:description",
        content:
          "Private one-to-one messaging between driving instructors on DSM by EveryDriver.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: InstructorDMThread,
});

const POPPINS = { fontFamily: "Poppins, Inter, sans-serif" } as const;
const NAVY = "#0B1F3A";
const BLUE = "#1877D6";
const BORDER = "#E4E8EF";
const GREY = "#6B7686";
const MUTED = "#9CA3AF";

interface InstructorLite {
  id: string;
  name: string | null;
  profile_image_url: string | null;
}

interface Conversation {
  id: string;
  instructor_a_id: string;
  instructor_b_id: string;
  instructor_a: InstructorLite | null;
  instructor_b: InstructorLite | null;
}

interface DMMessage {
  id: string;
  conversation_id: string;
  from_instructor_id: string;
  to_instructor_id: string;
  body: string | null;
  created_at: string;
  read_at: string | null;
}

function initials(name?: string | null) {
  if (!name) return "?";
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

function firstName(name?: string | null) {
  return (name ?? "").trim().split(/\s+/)[0] || "them";
}

function timeLabel(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

function dayKey(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function dayLabel(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const yest = new Date();
  yest.setDate(today.getDate() - 1);
  if (dayKey(iso) === dayKey(today.toISOString())) return "TODAY";
  if (dayKey(iso) === dayKey(yest.toISOString())) return "YESTERDAY";
  return d
    .toLocaleDateString("en-GB", {
      weekday: "short",
      day: "numeric",
      month: "short",
    })
    .toUpperCase();
}

function Avatar({
  person,
  bg,
}: {
  person: InstructorLite | null;
  bg: string;
}) {
  if (person?.profile_image_url) {
    return (
      <img
        src={person.profile_image_url}
        alt={person.name ?? "Instructor"}
        style={{
          width: 28,
          height: 28,
          borderRadius: "50%",
          objectFit: "cover",
          flexShrink: 0,
        }}
      />
    );
  }
  return (
    <div
      style={{
        width: 28,
        height: 28,
        borderRadius: "50%",
        background: bg,
        color: "#FFFFFF",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 11,
        fontWeight: 600,
        flexShrink: 0,
        ...POPPINS,
      }}
    >
      {initials(person?.name)}
    </div>
  );
}

/**
 * Mark every unread DM addressed to me in this conversation as read.
 * The direct UPDATE can silently affect 0 rows if row-level security only
 * allows the sender to update the row, so we verify how many rows came back
 * and fall back to the security-definer RPC when nothing was updated.
 */
async function markConversationRead(conversationId: string, userId: string) {
  const { data, error } = await supabase
    .from("instructor_messages")
    .update({ read_at: new Date().toISOString() })
    .eq("conversation_id", conversationId)
    .eq("to_instructor_id", userId)
    .is("read_at", null)
    .select("id");

  if (!error && (data?.length ?? 0) > 0) return data?.length ?? 0;

  const { error: rpcError } = await supabase.rpc(
    "mark_instructor_messages_read" as never,
    { _conversation_id: conversationId } as never,
  );
  if (rpcError && error) {
    console.warn("[dm] could not mark messages read", error.message, rpcError.message);
    return 0;
  }
  return data?.length ?? 0;
}

/**
 * Tell the bottom nav / home badge that messages were read. `delta` lets the
 * badge drop immediately; the repeats reconcile once the write has committed.
 */
function broadcastRead(delta: number) {
  const fire = (withDelta: boolean) =>
    window.dispatchEvent(
      new CustomEvent("dsm-messages-read", {
        detail: withDelta ? { delta } : undefined,
      }),
    );
  fire(true);
  setTimeout(() => fire(false), 300);
  setTimeout(() => fire(false), 1500);
}



function InstructorDMThread() {
  const { conversationId } = Route.useParams();
  const navigate = useNavigate();


  const [userId, setUserId] = useState<string | null>(null);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<DMMessage[]>([]);
  const [otherInstructor, setOtherInstructor] = useState<InstructorLite | null>(
    null,
  );
  const [me, setMe] = useState<InstructorLite | null>(null);
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  // Hide the global bottom nav while this chat thread is open, restore on unmount.
  useEffect(() => {
    const nav = (document.querySelector("[data-bottom-nav]") ??
      document.querySelector("nav")) as HTMLElement | null;
    if (nav) nav.style.display = "none";
    return () => {
      if (nav) nav.style.display = "";
    };
  }, []);


  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!cancelled) setUserId(data.user?.id ?? null);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!conversationId || !userId) return;
    let cancelled = false;

    (async () => {
      setLoading(true);

      const { data: conv } = await supabase
        .from("instructor_conversations")
        .select(
          `id, instructor_a_id, instructor_b_id,
           instructor_a:instructors!instructor_a_id(id, name, profile_image_url),
           instructor_b:instructors!instructor_b_id(id, name, profile_image_url)`,
        )
        .eq("id", conversationId)
        .single();

      if (!cancelled && conv) {
        const c = conv as unknown as Conversation;
        setConversation(c);
        setOtherInstructor(
          c.instructor_a_id === userId ? c.instructor_b : c.instructor_a,
        );
        setMe(c.instructor_a_id === userId ? c.instructor_a : c.instructor_b);
      }

      const { data: msgs } = await supabase
        .from("instructor_messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .is("deleted_at", null)
        .order("created_at", { ascending: true });

      if (!cancelled) {
        setMessages((msgs ?? []) as unknown as DMMessage[]);
        setLoading(false);
      }

      const marked = await markConversationRead(conversationId, userId);
      broadcastRead(marked);
    })();

    const channel = supabase
      .channel(`dm-${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "instructor_messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const row = payload.new as unknown as DMMessage;
          setMessages((prev) =>
            prev.some((m) => m.id === row.id) ? prev : [...prev, row],
          );
          // Thread is open, so an inbound message is read on arrival — mark it
          // and drop the badge straight away instead of letting it flash.
          if (row.from_instructor_id !== userId) {
            void markConversationRead(conversationId, userId).then((n) =>
              broadcastRead(n),
            );
          }



        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [conversationId, userId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage() {
    if (!body.trim() || !conversation || !userId || sending) return;
    setSending(true);
    const text = body.trim();
    setBody("");

    const otherId =
      conversation.instructor_a_id === userId
        ? conversation.instructor_b_id
        : conversation.instructor_a_id;

    await supabase.from("instructor_messages").insert({
      conversation_id: conversationId,
      from_instructor_id: userId,
      to_instructor_id: otherId,
      body: text,
    } as never);

    await supabase
      .from("instructor_conversations")
      .update({
        last_message: text,
        last_message_at: new Date().toISOString(),
      } as never)
      .eq("id", conversationId);

    setSending(false);
  }

  const other = firstName(otherInstructor?.name);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#FFFFFF",
        display: "flex",
        flexDirection: "column",
        ...POPPINS,
      }}
    >
      {/* HEADER */}
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 20,
          background: NAVY,
          paddingTop: "env(safe-area-inset-top, 0px)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "12px 14px",
          }}
        >
          <button
            type="button"
            aria-label="Back to messages"
            onClick={() => navigate({ to: "/messages" as never, replace: true })}
            style={{
              background: "none",
              border: 0,
              padding: 0,
              display: "flex",
              cursor: "pointer",
              flexShrink: 0,
            }}
          >
            <IconChevronLeft size={20} color="#C7D0DE" />
          </button>
          <div style={{ flex: 1, minWidth: 0, textAlign: "center" }}>
            <div
              style={{
                fontSize: 15,
                fontWeight: 600,
                color: "#FFFFFF",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {otherInstructor?.name ?? "Instructor"}
            </div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.6)" }}>
              DSM Instructor
            </div>
          </div>
          <div style={{ width: 20, flexShrink: 0 }} />
        </div>
      </div>

      {/* MESSAGE LIST */}
      <div style={{ flex: 1, padding: "16px 16px 80px" }}>
        {loading ? (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              padding: "80px 0",
            }}
          >
            <div
              style={{
                width: 24,
                height: 24,
                borderRadius: "50%",
                border: `2px solid ${BORDER}`,
                borderTopColor: BLUE,
                animation: "dsmspin 0.8s linear infinite",
              }}
            />
            <style>{`@keyframes dsmspin { to { transform: rotate(360deg); } }`}</style>
          </div>
        ) : messages.length === 0 ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 8,
              padding: "70px 24px",
              textAlign: "center",
            }}
          >
            <Avatar person={otherInstructor} bg={BLUE} />
            <div style={{ fontSize: 13, color: GREY }}>
              Start a conversation with{" "}
              {otherInstructor?.name ?? "this instructor"}
            </div>
            <div style={{ fontSize: 12, color: MUTED }}>Say hello 👋</div>
          </div>
        ) : (
          messages.map((m, i) => {
            const mine = m.from_instructor_id === userId;
            const prev = messages[i - 1];
            const showDay =
              !prev || dayKey(prev.created_at) !== dayKey(m.created_at);
            return (
              <div key={m.id}>
                {showDay && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      margin: "14px 0 12px",
                    }}
                  >
                    <div style={{ flex: 1, height: 0.5, background: BORDER }} />
                    <div
                      style={{
                        fontSize: 10,
                        fontWeight: 600,
                        color: MUTED,
                        letterSpacing: 0.4,
                      }}
                    >
                      {dayLabel(m.created_at)}
                    </div>
                    <div style={{ flex: 1, height: 0.5, background: BORDER }} />
                  </div>
                )}
                <div
                  style={{
                    display: "flex",
                    flexDirection: mine ? "row-reverse" : "row",
                    alignItems: "flex-end",
                    gap: 8,
                    marginBottom: 10,
                  }}
                >
                  <Avatar person={mine ? me : otherInstructor} bg={mine ? BLUE : NAVY} />
                  <div style={{ maxWidth: "75%" }}>
                    {!mine && (
                      <div
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          color: GREY,
                          marginBottom: 3,
                        }}
                      >
                        {firstName(otherInstructor?.name)}
                      </div>
                    )}
                    <div
                      style={{
                        background: mine ? BLUE : "#EEF2F7",
                        borderRadius: mine
                          ? "16px 4px 16px 16px"
                          : "4px 16px 16px 16px",
                        padding: "9px 12px",
                      }}
                    >
                      <div
                        style={{
                          fontSize: 13,
                          color: mine ? "#FFFFFF" : NAVY,
                          whiteSpace: "pre-wrap",
                          wordBreak: "break-word",
                        }}
                      >
                        {m.body}
                      </div>
                      <div
                        style={{
                          fontSize: 10,
                          marginTop: 3,
                          textAlign: mine ? "right" : "left",
                          color: mine ? "rgba(255,255,255,0.6)" : MUTED,
                        }}
                      >
                        {timeLabel(m.created_at)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* COMPOSER */}
      <div
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          bottom: 0,
          background: "#FFFFFF",
          borderTop: `0.5px solid ${BORDER}`,
          padding: "10px 16px",
          paddingBottom: "calc(10px + env(safe-area-inset-bottom, 0px))",
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <button
          type="button"
          aria-label="Attach file"
          style={{
            width: 28,
            height: 28,
            borderRadius: "50%",
            background: "#F1F5F9",
            border: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            cursor: "pointer",
          }}
        >
          <IconPaperclip size={14} color={GREY} />
        </button>

        <textarea
          rows={1}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void sendMessage();
            }
          }}
          placeholder={`Message ${other}...`}
          style={{
            flex: 1,
            background: "#EEF2F7",
            border: 0,
            outline: "none",
            borderRadius: 22,
            padding: "10px 14px",
            fontSize: 13,
            color: NAVY,
            resize: "none",
            maxHeight: 100,
            ...POPPINS,
          }}
        />

        <button
          type="button"
          aria-label="Send message"
          disabled={!body.trim() || sending}
          onClick={() => void sendMessage()}
          style={{
            width: 32,
            height: 32,
            borderRadius: "50%",
            background: body.trim() ? BLUE : BORDER,
            border: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            cursor: body.trim() && !sending ? "pointer" : "default",
          }}
        >
          <IconSend size={15} color="#FFFFFF" />
        </button>
      </div>
    </div>
  );
}

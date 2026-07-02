import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Phone, Send } from "lucide-react";
import { supabase } from "../lib/supabaseClient";

export const Route = createFileRoute("/messages/$id")({
  head: () => ({
    meta: [{ title: "Conversation — DSM by EveryDriver" }],
  }),
  component: ThreadPage,
});

const POPPINS = { fontFamily: "Inter, sans-serif" } as const;

interface Message {
  id: string;
  conversation_id: string;
  sender_type: string;
  body: string;
  created_at: string;
}

interface Conversation {
  id: string;
  pupil_id: string;
  pupils: { id: string; name: string; phone: string | null } | null;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function ThreadPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [conv, setConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const scrollerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      const { data: c, error: cErr } = await supabase
        .from("conversations")
        .select("id, pupil_id, pupils(id, name, phone)")
        .eq("id", id)
        .maybeSingle();
      if (cErr) console.error("[thread] conv fetch error", cErr);
      setConv((c as unknown as Conversation) ?? null);

      const { data: m, error: mErr } = await supabase
        .from("messages")
        .select("id, conversation_id, sender_type, body, created_at")
        .eq("conversation_id", id)
        .order("created_at", { ascending: true });
      if (mErr) console.error("[thread] messages fetch error", mErr);
      setMessages((m ?? []) as Message[]);

      // Mark conversation as read
      await supabase
        .from("conversations")
        .update({ unread_count: 0 })
        .eq("id", id);
    })();
  }, [id]);

  useEffect(() => {
    const el = scrollerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  async function send() {
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);

    const now = new Date().toISOString();
    const optimistic: Message = {
      id: `tmp-${Date.now()}`,
      conversation_id: id,
      sender_type: "instructor",
      body,
      created_at: now,
    };
    setMessages((prev) => [...prev, optimistic]);
    setDraft("");

    const { data: inserted, error } = await supabase
      .from("messages")
      .insert({ conversation_id: id, sender_type: "instructor", body })
      .select("id, conversation_id, sender_type, body, created_at")
      .single();

    if (error) {
      console.error("[thread] send error", error);
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
      setDraft(body);
      setSending(false);
      return;
    }

    setMessages((prev) =>
      prev.map((m) => (m.id === optimistic.id ? (inserted as Message) : m)),
    );

    await supabase
      .from("conversations")
      .update({ last_message: body, last_message_at: now })
      .eq("id", id);

    setSending(false);
  }

  const pupilName = conv?.pupils?.name ?? "";
  const phone = conv?.pupils?.phone ?? "";

  return (
    <div className="min-h-screen bg-white flex flex-col" style={POPPINS}>
      {/* Top bar */}
      <div
        className="sticky top-0 z-40 flex items-center justify-between px-2"
        style={{ height: 52, backgroundColor: "#072b47" }}
      >
        <button
          type="button"
          aria-label="Back"
          onClick={() => navigate({ to: "/messages" })}
          className="flex items-center justify-center"
          style={{ width: 40, height: 40 }}
        >
          <ArrowLeft size={22} color="#FFFFFF" />
        </button>
        <div
          className="flex-1 text-center text-[15px] font-semibold text-white truncate px-2"
          style={POPPINS}
        >
          {pupilName}
        </div>
        <a
          href={phone ? `tel:${phone}` : undefined}
          aria-label="Call"
          className="flex items-center justify-center"
          style={{ width: 40, height: 40 }}
        >
          <Phone size={18} color="#FFFFFF" />
        </a>
      </div>

      {/* Messages */}
      <div
        ref={scrollerRef}
        className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-2"
        style={{ paddingBottom: 88 }}
      >
        {messages.map((m) => {
          const mine = m.sender_type === "instructor";
          return (
            <div
              key={m.id}
              className="flex flex-col"
              style={{ alignItems: mine ? "flex-end" : "flex-start" }}
            >
              <div
                className="max-w-[78%] px-3 py-2 text-[14px]"
                style={{
                  backgroundColor: mine ? "#1A4A6E" : "#F3F4F6",
                  color: mine ? "#FFFFFF" : "#1A1A2E",
                  borderRadius: mine ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                  ...POPPINS,
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                }}
              >
                {m.body}
              </div>
              <div className="text-[10px] text-[#6B7280] mt-1" style={POPPINS}>
                {formatTime(m.created_at)}
              </div>
            </div>
          );
        })}
      </div>

      {/* Input bar */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
        className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-white px-3 py-2 pb-safe flex items-end gap-2"
        style={{
          borderTopWidth: "0.5px",
          borderTopStyle: "solid",
          borderTopColor: "#EEF2F7",
        }}
      >
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          rows={1}
          placeholder="Message"
          className="flex-1 rounded-2xl px-3 py-2 text-[14px] text-[#1A1A2E] bg-white focus:border-[#1A4A6E] focus:outline-none"
          style={{
            ...POPPINS,
            borderWidth: "0.5px",
            borderStyle: "solid",
            borderColor: "#EEF2F7",
            maxHeight: 120,
            resize: "none",
          }}
        />
        <button
          type="submit"
          aria-label="Send"
          disabled={!draft.trim() || sending}
          className="flex items-center justify-center rounded-full shrink-0 disabled:opacity-50"
          style={{
            width: 40,
            height: 40,
            backgroundColor: "#1A4A6E",
            color: "#FFFFFF",
            border: "none",
          }}
        >
          <Send size={18} color="#FFFFFF" />
        </button>
      </form>
    </div>
  );
}

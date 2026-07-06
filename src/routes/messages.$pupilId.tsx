import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Phone, Send, AlertTriangle } from "lucide-react";
import { supabase } from "../lib/supabaseClient";

export const Route = createFileRoute("/messages/$pupilId")({
  head: () => ({
    meta: [{ title: "Message pupil — DSM by EveryDriver" }],
  }),
  component: PupilThreadPage,
});

const POPPINS = { fontFamily: "Inter, sans-serif" } as const;

interface Pupil {
  id: string;
  name: string | null;
  first_name: string | null;
  phone: string | null;
  profile_image_url: string | null;
  auth_user_id: string | null;
}

interface ChatMessage {
  id: string;
  pupil_id: string;
  instructor_id: string;
  sender_type: "instructor" | "pupil" | string;
  sender_id: string | null;
  body: string;
  created_at: string;
  read_at: string | null;
  deleted_at: string | null;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function PupilThreadPage() {
  const { pupilId } = Route.useParams();
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [pupil, setPupil] = useState<Pupil | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messageText, setMessageText] = useState("");
  const [sending, setSending] = useState(false);
  const scrollerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;

    (async () => {
      const { data: userRes } = await supabase.auth.getUser();
      const uid = userRes.user?.id ?? null;
      setUserId(uid);
      if (!uid) return;

      const { data: p, error: pErr } = await supabase
        .from("pupils")
        .select("id, name, first_name, phone, profile_image_url, auth_user_id")
        .eq("id", pupilId)
        .maybeSingle();
      if (pErr) console.error("[pupil-thread] pupil fetch error", pErr);
      setPupil((p as unknown as Pupil) ?? null);

      const SUPABASE_URL = "https://bjpqxfrihwjcqprmoqfs.supabase.co";
      const SUPABASE_ANON_KEY =
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJqcHF4ZnJpaHdqY3Fwcm1vcWZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0NzQ4MjEsImV4cCI6MjA5NzA1MDgyMX0.HKlgx3dxP3uxX9wMRRUnfb0IPwaBpFcut_iUgT5XFeo";
      const { data: sessionRes } = await supabase.auth.getSession();
      const token = sessionRes.session?.access_token;
      console.log("[dsm-messages] fetching for pupil:", pupilId, "instructor:", uid);
      const url = `${SUPABASE_URL}/rest/v1/chat_messages?pupil_id=eq.${pupilId}&instructor_id=eq.${uid}&deleted_at=is.null&order=created_at.asc&select=id,pupil_id,instructor_id,sender_type,sender_id,body,created_at,read_at,deleted_at`;
      console.log("[dsm-messages] fetch URL:", url);
      const res = await fetch(url, {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${token ?? ""}`,
        },
      });
      let m: ChatMessage[] = [];
      try {
        const data = await res.json();
        console.log("[dsm-messages] result:", res.status, data);
        if (res.ok && Array.isArray(data)) m = data as ChatMessage[];
        else if (!res.ok) console.error("[pupil-thread] messages fetch error", data);
      } catch (e) {
        console.error("[pupil-thread] messages parse error", e);
      }
      setMessages(m);

      // Mark inbound messages read
      await supabase
        .from("chat_messages")
        .update({ read_at: new Date().toISOString() })
        .eq("pupil_id", pupilId)
        .eq("instructor_id", uid)
        .eq("sender_type", "pupil")
        .is("read_at", null);

      channel = supabase
        .channel(`chat:${uid}:${pupilId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "chat_messages",
            filter: `pupil_id=eq.${pupilId}`,
          },
          (payload) => {
            const row = payload.new as ChatMessage;
            if (row.instructor_id !== uid) return;
            setMessages((prev) =>
              prev.some((x) => x.id === row.id) ? prev : [...prev, row],
            );
          },
        )
        .subscribe();
    })();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [pupilId]);

  useEffect(() => {
    const el = scrollerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  async function handleSend() {
    const body = messageText.trim();
    if (!body || sending || !userId) return;
    setSending(true);

    console.log("[dsm-messages] sending:", { body, pupilId, instructorId: userId });

    const now = new Date().toISOString();
    const optimistic: ChatMessage = {
      id: `tmp-${Date.now()}`,
      pupil_id: pupilId,
      instructor_id: userId,
      sender_type: "instructor",
      sender_id: userId,
      body,
      created_at: now,
      read_at: null,
      deleted_at: null,
    };
    setMessages((prev) => [...prev, optimistic]);
    setMessageText("");

    const SUPABASE_URL = "https://bjpqxfrihwjcqprmoqfs.supabase.co";
    const SUPABASE_ANON_KEY =
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJqcHF4ZnJpaHdqY3Fwcm1vcWZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0NzQ4MjEsImV4cCI6MjA5NzA1MDgyMX0.HKlgx3dxP3uxX9wMRRUnfb0IPwaBpFcut_iUgT5XFeo";
    const { data: sessionRes } = await supabase.auth.getSession();
    const token = sessionRes.session?.access_token;

    let res: Response;
    let inserted: ChatMessage | null = null;
    try {
      res = await fetch(`${SUPABASE_URL}/rest/v1/chat_messages`, {
        method: "POST",
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${token ?? ""}`,
          "Content-Type": "application/json",
          Prefer: "return=representation",
        },
        body: JSON.stringify({
          instructor_id: userId,
          pupil_id: pupilId,
          sender_type: "instructor",
          sender_id: userId,
          body,
        }),
      });
      const data = await res.json().catch(() => null);
      console.log("[dsm-messages] send result:", res.status, data);
      if (res.ok && Array.isArray(data) && data.length > 0) {
        inserted = data[0] as ChatMessage;
      } else if (!res.ok) {
        throw new Error(`send failed: ${res.status}`);
      }
    } catch (err) {
      console.error("[pupil-thread] send error", err);
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
      setMessageText(body);
      setSending(false);
      return;
    }

    if (inserted) {
      const finalRow = inserted;
      setMessages((prev) => prev.map((m) => (m.id === optimistic.id ? finalRow : m)));
    }
    setSending(false);
  }

  const pupilName = pupil?.name ?? pupil?.first_name ?? "Pupil";
  const phone = pupil?.phone ?? "";
  const noAccount = !!pupil && !pupil.auth_user_id;

  function sendInvite() {
    if (!phone) {
      alert("No phone number on file for this pupil.");
      return;
    }
    const msg = encodeURIComponent(
      `Hi ${pupil?.first_name ?? ""}, join EveryDriver to message me and manage your lessons: https://everydriver.app`,
    );
    window.location.href = `sms:${phone}?&body=${msg}`;
  }

  return (
    <div className="min-h-screen bg-white flex flex-col" style={POPPINS}>
      {/* Top bar */}
      <div
        className="sticky top-0 z-40 flex items-center justify-between px-2"
        style={{ height: 52, backgroundColor: "#0F2044" }}
      >
        <button
          type="button"
          aria-label="Back"
          onClick={() => navigate({ to: "/pupils/$id", params: { id: pupilId } })}
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
          style={{ width: 40, height: 40, opacity: phone ? 1 : 0.4 }}
        >
          <Phone size={18} color="#FFFFFF" />
        </a>
      </div>

      {noAccount && (
        <div
          className="mx-3 mt-3 rounded-xl p-3 flex items-start gap-3"
          style={{
            backgroundColor: "#FEF3C7",
            borderWidth: "1px",
            borderStyle: "solid",
            borderColor: "#FCD34D",
          }}
        >
          <AlertTriangle size={18} color="#B45309" style={{ marginTop: 2, flexShrink: 0 }} />
          <div className="flex-1 min-w-0">
            <div className="text-[13px] text-[#78350F] leading-snug" style={POPPINS}>
              This pupil hasn't set up their EveryDriver account yet. Messages won't be delivered until they do.
            </div>
            <button
              type="button"
              onClick={sendInvite}
              className="mt-2 text-[13px] font-semibold"
              style={{ color: "#B45309", ...POPPINS }}
            >
              Send invite →
            </button>
          </div>
        </div>
      )}

      {/* Messages */}
      <div
        ref={scrollerRef}
        className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-2"
        style={{ paddingBottom: 120 }}
      >
        {messages.length === 0 ? (
          <div className="flex-1 flex items-center justify-center py-12">
            <div className="text-[13px] text-[#6B7280]" style={POPPINS}>
              No messages yet. Say hello 👋
            </div>
          </div>
        ) : (
          messages.map((m) => {
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
                    backgroundColor: mine ? "#0F2044" : "#FFFFFF",
                    color: mine ? "#FFFFFF" : "#0B1F3A",
                    borderRadius: mine ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                    borderWidth: mine ? 0 : 1,
                    borderStyle: "solid",
                    borderColor: "#E2E6ED",
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
          })
        )}
      </div>

      {/* Input bar */}
<div style={{
  position: 'fixed',
  bottom: 64,
  left: 0,
  right: 0,
  zIndex: 50,
  background: 'white',
  borderTop: '0.5px solid #E2E6ED',
  padding: '10px 16px',
  display: 'flex',
  gap: 8,
  alignItems: 'flex-end',
  maxWidth: 480,
  margin: '0 auto',
}}>
  <textarea
    value={messageText}
    onChange={e => setMessageText(e.target.value)}
    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
    placeholder="Message..."
    rows={1}
    style={{
      flex: 1,
      background: '#F7FAFC',
      border: '0.5px solid #E2E6ED',
      borderRadius: 20,
      padding: '10px 16px',
      fontSize: 14,
      fontFamily: 'Poppins, sans-serif',
      resize: 'none',
      outline: 'none',
      maxHeight: 120,
      overflowY: 'auto',
    }}
  />
  <button
    type="button"
    onClick={handleSend}
    disabled={!messageText.trim()}
    style={{
      width: 40,
      height: 40,
      borderRadius: '50%',
      background: messageText.trim() ? '#0F2044' : '#E2E6ED',
      border: 'none',
      cursor: messageText.trim() ? 'pointer' : 'default',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    }}
  >
    <Send size={16} color="white" />
  </button>
</div>
    </div>
  );
}
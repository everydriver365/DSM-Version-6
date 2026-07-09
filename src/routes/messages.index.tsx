import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, MessageCircle, Search, Edit3 } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import BottomNav from "../components/dsm/BottomNav";


export const Route = createFileRoute("/messages/")({
  head: () => ({
    meta: [
      { title: "Messages — DSM by EveryDriver" },
      { name: "description", content: "All your pupil conversations in one place." },
    ],
  }),
  component: MessagesIndexPage,
});

const SUPABASE_URL = "https://bjpqxfrihwjcqprmoqfs.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJqcHF4ZnJpaHdqY3Fwcm1vcWZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0NzQ4MjEsImV4cCI6MjA5NzA1MDgyMX0.HKlgx3dxP3uxX9wMRRUnfb0IPwaBpFcut_iUgT5XFeo";

const FONT = { fontFamily: "Inter, sans-serif" } as const;

const AVATAR_PALETTE = ["#185FA5", "#6B4FD6", "#3B6D11", "#C4501E", "#0C8577", "#A32D2D", "#854F0B", "#185F8A"];
function avatarColor(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return AVATAR_PALETTE[h % AVATAR_PALETTE.length];
}

interface Pupil {
  id: string;
  name: string | null;
  first_name: string | null;
  profile_image_url: string | null;
  phone: string | null;
}

interface Conversation {
  pupil_id: string;
  body: string;
  created_at: string;
  sender_type: string;
  read_at: string | null;
  pupil?: Pupil;
}

function timeAgo(iso: string) {
  const d = new Date(iso).getTime();
  const diff = Date.now() - d;
  const min = Math.floor(diff / 60000);
  if (min < 1) return "now";
  if (min < 60) return `${min}m ago`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w ago`;
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}

function initials(p?: Pupil) {
  const n = (p?.name || p?.first_name || "?").trim();
  const parts = n.split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}

function MessagesIndexPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [convos, setConvos] = useState<Conversation[]>([]);
  const [query, setQuery] = useState("");

  useEffect(() => {
    (async () => {
      const { data: sessionRes } = await supabase.auth.getSession();
      const token = sessionRes.session?.access_token;
      const uid = sessionRes.session?.user?.id;
      if (!uid || !token) {
        setLoading(false);
        return;
      }

      const msgUrl = `${SUPABASE_URL}/rest/v1/chat_messages?instructor_id=eq.${uid}&deleted_at=is.null&select=pupil_id,body,created_at,sender_type,read_at&order=created_at.desc`;
      const msgRes = await fetch(msgUrl, {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${token}`,
        },
      });
      const messages: Conversation[] = msgRes.ok ? await msgRes.json() : [];

      const seen = new Set<string>();
      const latest: Conversation[] = [];
      for (const m of messages) {
        if (seen.has(m.pupil_id)) continue;
        seen.add(m.pupil_id);
        latest.push(m);
      }

      if (latest.length === 0) {
        setConvos([]);
        setLoading(false);
        return;
      }

      const ids = latest.map((m) => m.pupil_id).join(",");
      const pupilRes = await fetch(
        `${SUPABASE_URL}/rest/v1/pupils?id=in.(${ids})&select=id,name,first_name,profile_image_url,phone`,
        {
          headers: {
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${token}`,
          },
        },
      );
      const pupils: Pupil[] = pupilRes.ok ? await pupilRes.json() : [];
      const pupilMap = new Map(pupils.map((p) => [p.id, p]));

      setConvos(latest.map((c) => ({ ...c, pupil: pupilMap.get(c.pupil_id) })));
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return convos;
    return convos.filter((c) => {
      const name = (c.pupil?.name || c.pupil?.first_name || "").toLowerCase();
      return name.includes(q) || (c.body || "").toLowerCase().includes(q);
    });
  }, [convos, query]);

  return (
    <div style={{ ...FONT, minHeight: "100vh", background: "#F5F7FA", paddingBottom: 80 }}>
      {/* Header */}
      <div
        style={{
          background: "#0F2044",
          color: "#FFFFFF",
          padding: "16px 18px 18px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          position: "sticky",
          top: 0,
          zIndex: 10,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button
            onClick={() => navigate({ to: "/home" })}
            style={{ background: "transparent", border: 0, color: "#FFFFFF", padding: 0, cursor: "pointer", display: "flex" }}
            aria-label="Back"
          >
            <ArrowLeft size={20} color="#FFFFFF" />
          </button>
          <h1 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>Messages</h1>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button
            type="button"
            aria-label="Search messages"
            onClick={() => {
              const el = document.getElementById("messages-search-input") as HTMLInputElement | null;
              el?.focus();
            }}
            style={{
              width: 34,
              height: 34,
              borderRadius: 10,
              background: "rgba(255,255,255,0.1)",
              border: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
          >
            <Search size={17} color="#FFFFFF" />
          </button>
          <button
            type="button"
            aria-label="New message"
            onClick={() => navigate({ to: "/broadcast" })}
            style={{
              width: 34,
              height: 34,
              borderRadius: 10,
              background: "rgba(255,255,255,0.1)",
              border: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
          >
            <Edit3 size={17} color="#FFFFFF" />
          </button>
        </div>
      </div>

      {/* Search bar */}
      <div style={{ padding: "16px 16px 0" }}>
        <div
          style={{
            background: "#FFFFFF",
            borderRadius: 12,
            padding: "9px 12px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 16,
          }}
        >
          <Search size={15} color="#B0BAC9" />
          <input
            id="messages-search-input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search messages..."
            style={{
              fontSize: 13,
              border: 0,
              background: "transparent",
              outline: "none",
              flex: 1,
              width: "100%",
              ...FONT,
              color: "#12142B",
            }}
          />
        </div>
      </div>

      {/* Conversation list */}
      <div
        style={{
          margin: "0 16px",
          background: "#FFFFFF",
          borderRadius: 14,
          overflow: "hidden",
          boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
        }}
      >
        {loading ? (
          <div style={{ padding: 24, textAlign: "center", color: "#B0BAC9", fontSize: 13 }}>Loading…</div>
        ) : filtered.length === 0 ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: "56px 24px",
              gap: 6,
            }}
          >
            <MessageCircle size={40} color="#D0D5DD" />
            <div style={{ fontSize: 14, color: "#B0BAC9" }}>No messages yet</div>
            <div style={{ fontSize: 12, color: "#D0D5DD", textAlign: "center" }}>
              Start a conversation from a pupil's profile
            </div>
          </div>
        ) : (
          filtered.map((c, idx) => {
            const unread = c.sender_type === "pupil" && !c.read_at;
            const name = c.pupil?.name || c.pupil?.first_name || "Pupil";
            const bg = avatarColor(c.pupil_id);
            return (
              <div
                key={c.pupil_id}
                onClick={() => navigate({ to: "/messages/$pupilId", params: { pupilId: c.pupil_id } })}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "14px 16px",
                  borderBottom: idx < filtered.length - 1 ? "0.5px solid #EEF2F7" : "none",
                  cursor: "pointer",
                  background: "#FFFFFF",
                }}
              >
                <div style={{ position: "relative", flexShrink: 0 }}>
                  {c.pupil?.profile_image_url ? (
                    <img
                      src={c.pupil.profile_image_url}
                      alt={name}
                      style={{ width: 44, height: 44, borderRadius: "50%", objectFit: "cover" }}
                    />
                  ) : (
                    <div
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: "50%",
                        background: bg,
                        color: "#FFFFFF",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 15,
                        fontWeight: 600,
                      }}
                    >
                      {initials(c.pupil)}
                    </div>
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 3,
                      gap: 8,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 15,
                        fontWeight: unread ? 600 : 500,
                        color: "#12142B",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        minWidth: 0,
                        flex: 1,
                      }}
                    >
                      {name}
                    </div>
                    <span style={{ fontSize: 11, color: "#B0BAC9", flexShrink: 0 }}>
                      {timeAgo(c.created_at)}
                    </span>
                  </div>
                  <div
                    style={{
                      fontSize: 13,
                      color: unread ? "#8A94A6" : "#B0BAC9",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {c.sender_type === "instructor" ? "You: " : ""}
                    {c.body}
                  </div>
                </div>
                {unread && (
                  <span
                    aria-label="unread"
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: "#185FA5",
                      flexShrink: 0,
                    }}
                  />
                )}
              </div>
            );
          })
        )}
      </div>

      <BottomNav active="messages" />
    </div>
  );
}

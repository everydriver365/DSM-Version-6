import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, MessageSquare } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import BottomNav from "../components/dsm/BottomNav";
import WorkspaceDots from "../components/dsm/WorkspaceDots";


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
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h`;
  const days = Math.floor(h / 24);
  if (days < 7) return `${days}d`;
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

      // Group by pupil_id -> most recent (list is already desc)
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

  return (
    <div style={{ ...FONT, minHeight: "100vh", background: "#FFFFFF", paddingBottom: 80 }}>
      {/* Top bar */}
      <div
        style={{
          background: "#0F2044",
          color: "#FFFFFF",
          padding: "14px 16px",
          display: "flex",
          alignItems: "center",
          gap: 12,
          position: "sticky",
          top: 0,
          zIndex: 10,
        }}
      >
        <button
          onClick={() => navigate({ to: "/home" })}
          style={{ background: "transparent", border: 0, color: "#FFFFFF", padding: 4, cursor: "pointer" }}
          aria-label="Back"
        >
          <ArrowLeft size={22} />
        </button>
        <h1 style={{ fontSize: 17, fontWeight: 600, margin: 0 }}>Messages</h1>
      </div>

      {loading ? (
        <div style={{ padding: 24, textAlign: "center", color: "#6B7280", fontSize: 13 }}>Loading…</div>
      ) : convos.length === 0 ? (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "80px 24px",
            gap: 8,
          }}
        >
          <MessageSquare size={40} color="#9CA3AF" />
          <div style={{ fontSize: 15, fontWeight: 600, color: "#0F2044" }}>No messages yet</div>
          <div style={{ fontSize: 13, color: "#6B7280", textAlign: "center" }}>
            Messages from pupils will appear here
          </div>
        </div>
      ) : (
        <div>
          {convos.map((c) => {
            const unread = c.sender_type === "pupil" && !c.read_at;
            const name = c.pupil?.name || c.pupil?.first_name || "Pupil";
            return (
              <div
                key={c.pupil_id}
                onClick={() => navigate({ to: "/messages/$pupilId", params: { pupilId: c.pupil_id } })}
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "14px 16px",
                  borderBottom: "0.5px solid #F3F4F6",
                  cursor: "pointer",
                  background: "#FFFFFF",
                }}
              >
                {c.pupil?.profile_image_url ? (
                  <img
                    src={c.pupil.profile_image_url}
                    alt={name}
                    style={{ width: 44, height: 44, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
                  />
                ) : (
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: "50%",
                      background: "#1A52A0",
                      color: "#FFFFFF",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 14,
                      fontWeight: 600,
                      flexShrink: 0,
                    }}
                  >
                    {initials(c.pupil)}
                  </div>
                )}
                <div style={{ paddingLeft: 12, flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 700,
                      color: "#0F2044",
                      marginBottom: 2,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {name}
                  </div>
                  <div
                    style={{
                      fontSize: 13,
                      color: unread ? "#0F2044" : "#6B7280",
                      fontWeight: unread ? 600 : 400,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {c.sender_type === "instructor" ? "You: " : ""}
                    {c.body}
                  </div>
                </div>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-end",
                    gap: 6,
                    paddingLeft: 8,
                    flexShrink: 0,
                  }}
                >
                  <span style={{ fontSize: 12, color: "#9CA3AF" }}>{timeAgo(c.created_at)}</span>
                  {unread && (
                    <span
                      aria-label="unread"
                      style={{ width: 8, height: 8, borderRadius: "50%", background: "#CC2229" }}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <BottomNav active="messages" />
    </div>
  );
}
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, MessageCircle, Search, Edit3, Send, Flag, X, Briefcase } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "../lib/supabaseClient";
import BottomNav from "../components/dsm/BottomNav";
import { PageLayout } from "@/components/PageLayout";
import { useAdminGate } from "./admin";



export const Route = createFileRoute("/messages/")({
  validateSearch: (search: Record<string, unknown>) => ({
    jobOfferId: typeof search.jobOfferId === "string" ? search.jobOfferId : undefined,
  }),
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

const AVATAR_PALETTE = ["#1877D6", "#6B4FD6", "#3B6D11", "#C4501E", "#0C8577", "#CC2229", "#854F0B", "#185F8A"];
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

interface LocalChatRoom {
  id: string;
  area_name: string;
  outcode: string;
  instructor_count: number | null;
}

interface LocalMessage {
  id: string;
  room_id: string;
  instructor_id: string;
  message: string;
  created_at: string;
  is_flagged?: boolean | null;
  instructors?: { name: string | null; profile_image_url: string | null } | null;
}

interface JobMessage {
  id: string;
  job_offer_id: string;
  sender_type: string;
  sender_id: string | null;
  message: string;
  created_at: string;
  read_by_admin?: boolean | null;
}

interface JobThreadRow {
  job_offer_id: string;
  pupil_name: string | null;
  postcode_area: string | null;
  last_message: string;
  last_created_at: string;
  last_sender_type: string;
  last_sender_id: string | null;
  last_sender_instructor_name: string | null;
  unread: boolean;
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

function nameInitials(name?: string | null) {
  const n = (name || "?").trim();
  const parts = n.split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}

function firstName(name?: string | null) {
  return (name || "").trim().split(/\s+/)[0] || "Someone";
}

function formatDateSeparator(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return "Today";
  const y = new Date(now);
  y.setDate(now.getDate() - 1);
  if (d.toDateString() === y.toDateString()) return "Yesterday";
  return d.toLocaleDateString("en-GB", { weekday: "short", day: "2-digit", month: "short" });
}

function MessagesIndexPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"pupils" | "local" | "admin">("pupils");
  const adminStatus = useAdminGate();
  const isAdmin = adminStatus === "allowed";
  const [adminThreads, setAdminThreads] = useState<JobThreadRow[]>([]);
  const [adminLoading, setAdminLoading] = useState(false);
  const [openThreadJobId, setOpenThreadJobId] = useState<string | null>(null);
  const [adminQuery, setAdminQuery] = useState("");

  const [loading, setLoading] = useState(true);
  const [convos, setConvos] = useState<Conversation[]>([]);
  const [query, setQuery] = useState("");

  // Local chat state
  const [userId, setUserId] = useState<string | null>(null);
  const [myName, setMyName] = useState<string | null>(null);
  const [areaName, setAreaName] = useState<string>("Your area");
  const [room, setRoom] = useState<LocalChatRoom | null>(null);
  const [localMessages, setLocalMessages] = useState<LocalMessage[]>([]);
  const [localLoading, setLocalLoading] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [lastSeen, setLastSeen] = useState<number>(0);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const scrollBoxRef = useRef<HTMLDivElement | null>(null);

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

  // Fetch user id + instructor once for local chat
  useEffect(() => {
    (async () => {
      const { data: sessionRes } = await supabase.auth.getSession();
      const uid = sessionRes.session?.user?.id;
      if (!uid) return;
      setUserId(uid);
      const { data: instructor } = await supabase
        .from("instructors")
        .select("home_postcode, city, name")
        .eq("id", uid)
        .single();
      const outcode = instructor?.home_postcode?.substring(0, 4)?.trim().toUpperCase();
      const area = instructor?.city || outcode || "Your area";
      setAreaName(area);
      setMyName(instructor?.name ?? null);
      if (!outcode) return;

      let { data: existing } = await supabase
        .from("local_chat_rooms")
        .select("*")
        .eq("outcode", outcode)
        .maybeSingle();
      let currentRoom = existing as LocalChatRoom | null;
      if (!currentRoom) {
        const { data: newRoom } = await supabase
          .from("local_chat_rooms")
          .insert({ area_name: area, outcode, instructor_count: 1 })
          .select()
          .single();
        currentRoom = newRoom as LocalChatRoom;
      }
      if (!currentRoom) return;
      setRoom(currentRoom);

      const seenKey = `local_chat_last_seen_${currentRoom.id}`;
      const stored = localStorage.getItem(seenKey);
      setLastSeen(stored ? parseInt(stored, 10) : 0);
    })();
  }, []);

  // Fetch messages + realtime once we have a room
  useEffect(() => {
    if (!room) return;
    let cancelled = false;
    setLocalLoading(true);
    (async () => {
      const { data } = await supabase
        .from("local_chat_messages")
        .select("*, instructors(name, profile_image_url)")
        .eq("room_id", room.id)
        .is("deleted_at", null)
        .order("created_at", { ascending: true })
        .limit(100);
      if (!cancelled) {
        setLocalMessages((data as LocalMessage[]) || []);
        setLocalLoading(false);
      }
    })();

    const channel = supabase
      .channel(`local_chat_${room.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "local_chat_messages", filter: `room_id=eq.${room.id}` },
        async (payload) => {
          const row = payload.new as LocalMessage;
          // fetch instructor info for the new message
          const { data: instructor } = await supabase
            .from("instructors")
            .select("name, profile_image_url")
            .eq("id", row.instructor_id)
            .maybeSingle();
          setLocalMessages((prev) => {
            if (prev.some((m) => m.id === row.id)) return prev;
            return [...prev, { ...row, instructors: instructor ?? null }];
          });
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [room]);

  // Auto-scroll to bottom when messages change and local tab active
  useEffect(() => {
    if (activeTab !== "local") return;
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [localMessages, activeTab]);

  // Mark as seen when switching to local tab
  useEffect(() => {
    if (activeTab !== "local" || !room) return;
    const now = Date.now();
    localStorage.setItem(`local_chat_last_seen_${room.id}`, String(now));
    setLastSeen(now);
  }, [activeTab, room, localMessages.length]);

  // Load admin job-thread inbox
  const loadAdminThreads = async () => {
    setAdminLoading(true);
    const { data: msgs, error } = await supabase
      .from("job_offer_messages")
      .select("id, job_offer_id, sender_type, sender_id, message, created_at, read_by_admin")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) {
      setAdminLoading(false);
      return;
    }
    const grouped = new Map<string, JobThreadRow>();
    for (const m of (msgs || []) as JobMessage[]) {
      if (grouped.has(m.job_offer_id)) continue;
      grouped.set(m.job_offer_id, {
        job_offer_id: m.job_offer_id,
        pupil_name: null,
        postcode_area: null,
        last_message: m.message,
        last_created_at: m.created_at,
        last_sender_type: m.sender_type,
        last_sender_id: m.sender_id,
        last_sender_instructor_name: null,
        unread: m.sender_type === "instructor" && !m.read_by_admin,
      });
    }
    const ids = Array.from(grouped.keys());
    if (ids.length) {
      const { data: jobs } = await supabase
        .from("job_offers")
        .select("id, pupil_name, postcode_area")
        .in("id", ids);
      for (const j of (jobs || []) as { id: string; pupil_name: string | null; postcode_area: string | null }[]) {
        const row = grouped.get(j.id);
        if (row) {
          row.pupil_name = j.pupil_name;
          row.postcode_area = j.postcode_area;
        }
      }
      const instructorIds = Array.from(
        new Set(
          Array.from(grouped.values())
            .filter((r) => r.last_sender_type === "instructor" && r.last_sender_id)
            .map((r) => r.last_sender_id as string),
        ),
      );
      if (instructorIds.length) {
        const { data: instructors } = await supabase
          .from("instructors")
          .select("id, name")
          .in("id", instructorIds);
        const iMap = new Map(
          ((instructors || []) as { id: string; name: string | null }[]).map((i) => [i.id, i.name]),
        );
        for (const row of grouped.values()) {
          if (row.last_sender_id) {
            row.last_sender_instructor_name = iMap.get(row.last_sender_id) ?? null;
          }
        }
      }
    }
    const list = Array.from(grouped.values()).sort(
      (a, b) => new Date(b.last_created_at).getTime() - new Date(a.last_created_at).getTime(),
    );
    setAdminThreads(list);
    setAdminLoading(false);
  };

  useEffect(() => {
    if (activeTab !== "admin" || !isAdmin) return;
    loadAdminThreads();
  }, [activeTab, isAdmin]);

  // Admin-only realtime toast for new instructor messages on job offers
  useEffect(() => {
    if (!isAdmin) return;
    const channel = supabase
      .channel("admin_job_offer_messages")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "job_offer_messages", filter: "sender_type=eq.instructor" },
        async (payload) => {
          const row = payload.new as { job_offer_id: string; sender_id: string | null };
          const [{ data: job }, { data: instructor }] = await Promise.all([
            supabase
              .from("job_offers")
              .select("pupil_name")
              .eq("id", row.job_offer_id)
              .maybeSingle(),
            row.sender_id
              ? supabase
                  .from("instructors")
                  .select("name")
                  .eq("id", row.sender_id)
                  .maybeSingle()
              : Promise.resolve({ data: null }),
          ]);
          const pupilName = (job as { pupil_name: string | null } | null)?.pupil_name ?? "pupil";
          const instructorName =
            (instructor as { name: string | null } | null)?.name ?? "Instructor";
          toast(`New message from ${instructorName} re: ${pupilName}`);
          loadAdminThreads();
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAdmin]);

  const filteredAdmin = useMemo(() => {
    const q = adminQuery.trim().toLowerCase();
    if (!q) return adminThreads;
    return adminThreads.filter(
      (t) =>
        (t.pupil_name || "").toLowerCase().includes(q) ||
        t.last_message.toLowerCase().includes(q),
    );
  }, [adminThreads, adminQuery]);

  const unreadAdmin = useMemo(
    () => adminThreads.filter((t) => t.unread).length,
    [adminThreads],
  );


  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return convos;
    return convos.filter((c) => {
      const name = (c.pupil?.name || c.pupil?.first_name || "").toLowerCase();
      return name.includes(q) || (c.body || "").toLowerCase().includes(q);
    });
  }, [convos, query]);

  const unreadLocal = useMemo(() => {
    if (!userId) return 0;
    return localMessages.filter(
      (m) => m.instructor_id !== userId && new Date(m.created_at).getTime() > lastSeen,
    ).length;
  }, [localMessages, lastSeen, userId]);

  async function sendLocalMessage() {
    if (!room || !userId) return;
    const text = newMessage.trim();
    if (!text) return;
    setNewMessage("");
    const { error } = await supabase.from("local_chat_messages").insert({
      room_id: room.id,
      instructor_id: userId,
      message: text,
    });
    if (error) {
      toast.error("Failed to send: " + error.message);
      setNewMessage(text);
      return;
    }
    requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    });
  }

  async function flagMessage(id: string) {
    const { error } = await supabase
      .from("local_chat_messages")
      .update({ is_flagged: true })
      .eq("id", id);
    if (error) {
      toast.error("Could not flag message");
      return;
    }
    toast.info("Flagged for review");
  }

  return (
    <PageLayout style={{ ...FONT, paddingBottom: 80 }}>
      {/* Header */}
      <div
        style={{
          background: "#0B1F3A",
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

      {/* Tab switcher */}
      <div
        style={{
          background: "#FFFFFF",
          borderBottom: "0.5px solid #E2E6ED",
          display: "flex",
          position: "sticky",
          top: 60,
          zIndex: 9,
        }}
      >
        {((["pupils", "local", ...(isAdmin ? ["admin"] : [])] as const) as ("pupils" | "local" | "admin")[]).map((tab) => {
          const active = activeTab === tab;
          const label = tab === "pupils" ? "Pupils" : tab === "local" ? "Local chat" : "Admin";
          const badge =
            tab === "local" ? unreadLocal : tab === "admin" ? unreadAdmin : 0;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                flex: 1,
                padding: 12,
                textAlign: "center",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                background: "transparent",
                border: 0,
                borderBottom: active ? "2px solid #0B1F3A" : "2px solid transparent",
                color: active ? "#0B1F3A" : "#8A93A3",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 4,
                ...FONT,
              }}
            >
              {label}
              {badge > 0 && (
                <span
                  style={{
                    background: "#CC2229",
                    color: "#FFFFFF",
                    fontSize: 10,
                    fontWeight: 700,
                    padding: "2px 6px",
                    borderRadius: 999,
                    marginLeft: 4,
                    lineHeight: 1,
                  }}
                >
                  {badge}
                </span>
              )}
            </button>
          );
        })}

      </div>

      {activeTab === "pupils" ? (
        <>
          {/* Search bar */}
          <div style={{ padding: "16px 16px 0" }}>
            <div
              style={{
                background: "#FFFFFF",
                borderRadius: 12,
                padding: "12px 16px",
                boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginBottom: 16,
              }}
            >
              <Search size={18} color="#8A93A3" />
              <input
                id="messages-search-input"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search messages"
                style={{
                  fontSize: 14,
                  border: 0,
                  background: "transparent",
                  outline: "none",
                  flex: 1,
                  width: "100%",
                  ...FONT,
                  color: "#0B1F3A",
                }}
              />
            </div>
          </div>

          {/* Conversation list */}
          <div style={{ padding: "0 16px" }}>
            {loading ? (
              <div
                style={{
                  background: "#FFFFFF",
                  borderRadius: 14,
                  boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
                  padding: 24,
                  textAlign: "center",
                  color: "#8A93A3",
                  fontSize: 13,
                }}
              >
                Loading…
              </div>
            ) : filtered.length === 0 ? (
              <div
                style={{
                  background: "#FFFFFF",
                  borderRadius: 14,
                  boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "56px 24px",
                  gap: 6,
                }}
              >
                <MessageCircle size={40} color="#D0D5DD" />
                <div style={{ fontSize: 14, color: "#8A93A3" }}>No messages yet</div>
                <div style={{ fontSize: 12, color: "#B0BAC9", textAlign: "center" }}>
                  Start a conversation from a pupil's profile
                </div>
              </div>
            ) : (
              filtered.map((c) => {
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
                      cursor: "pointer",
                      background: "#FFFFFF",
                      borderRadius: 14,
                      boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
                      marginBottom: 10,
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
                            fontSize: 16,
                            fontWeight: 500,
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
                            fontWeight: 500,
                            color: "#0B1F3A",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            minWidth: 0,
                            flex: 1,
                          }}
                        >
                          {name}
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                          <span style={{ fontSize: 12, color: "#8A93A3" }}>
                            {timeAgo(c.created_at)}
                          </span>
                          {unread && (
                            <span
                              aria-label="unread"
                              style={{
                                width: 8,
                                height: 8,
                                borderRadius: "50%",
                                background: "#1877D6",
                              }}
                            />
                          )}
                        </div>
                      </div>
                      <div
                        style={{
                          fontSize: 13,
                          color: unread ? "#0B1F3A" : "#5A6270",
                          fontWeight: unread ? 500 : 400,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {c.sender_type === "instructor" ? "You: " : ""}
                        {c.body}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </>
      ) : activeTab === "local" ? (
        <LocalChatView
          areaName={areaName}
          room={room}
          messages={localMessages}
          loading={localLoading}
          userId={userId}
          myName={myName}
          newMessage={newMessage}
          setNewMessage={setNewMessage}
          onSend={sendLocalMessage}
          onFlag={flagMessage}
          messagesEndRef={messagesEndRef}
          scrollBoxRef={scrollBoxRef}
        />
      ) : (
        <AdminJobInbox
          threads={filteredAdmin}
          loading={adminLoading}
          query={adminQuery}
          setQuery={setAdminQuery}
          onOpen={async (id) => {
            await supabase
              .from("job_offer_messages")
              .update({ read_by_admin: true })
              .eq("job_offer_id", id)
              .eq("sender_type", "instructor")
              .eq("read_by_admin", false);
            setAdminThreads((prev) =>
              prev.map((t) => (t.job_offer_id === id ? { ...t, unread: false } : t)),
            );
            setOpenThreadJobId(id);
          }}
        />
      )}

      {openThreadJobId && (
        <AdminJobThreadSheet
          jobId={openThreadJobId}
          uid={userId}
          onClose={() => {
            setOpenThreadJobId(null);
            loadAdminThreads();
          }}
        />
      )}

      <BottomNav active="messages" />

    </PageLayout>
  );
}

function LocalChatView(props: {
  areaName: string;
  room: LocalChatRoom | null;
  messages: LocalMessage[];
  loading: boolean;
  userId: string | null;
  myName: string | null;
  newMessage: string;
  setNewMessage: (v: string) => void;
  onSend: () => void;
  onFlag: (id: string) => void;
  messagesEndRef: React.MutableRefObject<HTMLDivElement | null>;
  scrollBoxRef: React.MutableRefObject<HTMLDivElement | null>;
}) {
  const {
    areaName,
    room,
    messages,
    loading,
    userId,
    myName,
    newMessage,
    setNewMessage,
    onSend,
    onFlag,
    messagesEndRef,
    scrollBoxRef,
  } = props;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 60px - 45px - 64px)" }}>
      {/* Room header */}
      <div
        style={{
          background: "#F7FAFC",
          padding: "10px 16px",
          borderBottom: "0.5px solid #E2E6ED",
        }}
      >
        <div style={{ fontSize: 13, fontWeight: 600, color: "#0B1F3A" }}>{areaName} ADIs</div>
        <div style={{ fontSize: 11, color: "#9CA3AF" }}>
          {room?.instructor_count ?? 1} members
        </div>
      </div>

      {/* Messages list */}
      <div
        ref={scrollBoxRef}
        style={{
          flex: 1,
          overflowY: "auto",
          padding: 16,
          display: "flex",
          flexDirection: "column",
          gap: 4,
          background: "#FFFFFF",
        }}
      >
        {loading ? (
          <div style={{ padding: 40, textAlign: "center", color: "#9CA3AF", fontSize: 13 }}>Loading…</div>
        ) : messages.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center" }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#6B7280" }}>
              Be the first to chat in {areaName}!
            </div>
            <div style={{ fontSize: 12, color: "#9CA3AF", marginTop: 4 }}>
              Connect with local ADIs, share tips
            </div>
          </div>
        ) : (
          messages.map((msg, i) => {
            const mine = msg.instructor_id === userId;
            const prev = messages[i - 1];
            const showDate =
              !prev || new Date(prev.created_at).toDateString() !== new Date(msg.created_at).toDateString();
            const time = new Date(msg.created_at).toLocaleTimeString("en-GB", {
              hour: "2-digit",
              minute: "2-digit",
            });
            return (
              <div key={msg.id} style={{ display: "flex", flexDirection: "column" }}>
                {showDate && (
                  <div
                    style={{
                      fontSize: 11,
                      color: "#9CA3AF",
                      textAlign: "center",
                      padding: "8px 0",
                    }}
                  >
                    {formatDateSeparator(msg.created_at)}
                  </div>
                )}
                {mine ? (
                  <div style={{ display: "flex", justifyContent: "flex-end" }}>
                    <div style={{ maxWidth: "75%" }}>
                      <div
                        style={{
                          background: "#0B1F3A",
                          color: "#FFFFFF",
                          borderRadius: "16px 16px 4px 16px",
                          padding: "10px 14px",
                          fontSize: 13,
                          lineHeight: 1.35,
                          wordBreak: "break-word",
                        }}
                      >
                        {msg.message}
                      </div>
                      <div style={{ fontSize: 10, color: "#9CA3AF", textAlign: "right", marginTop: 2 }}>{time}</div>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: "flex", justifyContent: "flex-start", gap: 8 }}>
                    {msg.instructors?.profile_image_url ? (
                      <img
                        src={msg.instructors.profile_image_url}
                        alt={msg.instructors?.name ?? "ADI"}
                        style={{ width: 32, height: 32, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
                      />
                    ) : (
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: "50%",
                          background: "#1A52A0",
                          color: "#FFFFFF",
                          fontWeight: 700,
                          fontSize: 12,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        {nameInitials(msg.instructors?.name)}
                      </div>
                    )}
                    <div style={{ maxWidth: "75%" }}>
                      <div style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 600, marginBottom: 2 }}>
                        {firstName(msg.instructors?.name)}
                      </div>
                      <div
                        style={{
                          background: "#FFFFFF",
                          border: "0.5px solid #E2E6ED",
                          borderRadius: "4px 16px 16px 16px",
                          padding: "10px 14px",
                          fontSize: 13,
                          lineHeight: 1.35,
                          color: "#0B1F3A",
                          wordBreak: "break-word",
                        }}
                      >
                        {msg.message}
                      </div>
                      <div style={{ display: "flex", gap: 8, marginTop: 2, alignItems: "center" }}>
                        <span style={{ fontSize: 10, color: "#9CA3AF" }}>{time}</span>
                        <button
                          type="button"
                          aria-label="Flag message"
                          onClick={() => onFlag(msg.id)}
                          style={{
                            background: "transparent",
                            border: 0,
                            padding: 0,
                            cursor: "pointer",
                            display: "flex",
                          }}
                        >
                          <Flag size={11} color="#D1D5DB" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div
        style={{
          background: "#FFFFFF",
          borderTop: "0.5px solid #E2E6ED",
          padding: "12px 16px",
          paddingBottom: "calc(12px + env(safe-area-inset-bottom, 0px))",
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: "50%",
            background: "#1A52A0",
            color: "#FFFFFF",
            fontWeight: 700,
            fontSize: 11,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          {nameInitials(myName)}
        </div>
        <input
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              onSend();
            }
          }}
          placeholder={`Message ${areaName} ADIs...`}
          style={{
            flex: 1,
            background: "#F7FAFC",
            border: "0.5px solid #E2E6ED",
            borderRadius: 20,
            padding: "10px 14px",
            fontSize: 13,
            outline: "none",
            color: "#0B1F3A",
            ...FONT,
          }}
        />
        <button
          type="button"
          aria-label="Send"
          disabled={!newMessage.trim() || !room}
          onClick={onSend}
          style={{
            background: newMessage.trim() ? "#0B1F3A" : "#B0BAC9",
            color: "#FFFFFF",
            border: 0,
            width: 36,
            height: 36,
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: newMessage.trim() ? "pointer" : "not-allowed",
            flexShrink: 0,
          }}
        >
          <Send size={16} color="#FFFFFF" />
        </button>
      </div>
    </div>
  );
}

function AdminJobInbox(props: {
  threads: JobThreadRow[];
  loading: boolean;
  query: string;
  setQuery: (v: string) => void;
  onOpen: (jobId: string) => void;
}) {
  const { threads, loading, query, setQuery, onOpen } = props;
  return (
    <>
      <div style={{ padding: "16px 16px 0" }}>
        <div
          style={{
            background: "#FFFFFF",
            borderRadius: 12,
            padding: "12px 16px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginBottom: 16,
          }}
        >
          <Search size={18} color="#8A93A3" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search job threads"
            style={{
              fontSize: 14,
              border: 0,
              background: "transparent",
              outline: "none",
              flex: 1,
              width: "100%",
              ...FONT,
              color: "#0B1F3A",
            }}
          />
        </div>
      </div>
      <div style={{ padding: "0 16px" }}>
        {loading ? (
          <div
            style={{
              background: "#FFFFFF",
              borderRadius: 14,
              boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
              padding: 24,
              textAlign: "center",
              color: "#8A93A3",
              fontSize: 13,
            }}
          >
            Loading…
          </div>
        ) : threads.length === 0 ? (
          <div
            style={{
              background: "#FFFFFF",
              borderRadius: 14,
              boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: "56px 24px",
              gap: 6,
            }}
          >
            <Briefcase size={40} color="#D0D5DD" />
            <div style={{ fontSize: 14, color: "#8A93A3" }}>No job conversations</div>
          </div>
        ) : (
          threads.map((t) => {
            const instructorName = t.last_sender_instructor_name || "Instructor";
            const pupil = t.pupil_name || "Job enquiry";
            const area = t.postcode_area || "";
            return (
              <div
                key={t.job_offer_id}
                onClick={() => onOpen(t.job_offer_id)}
                style={{
                  padding: "14px 16px",
                  cursor: "pointer",
                  background: "#FFFFFF",
                  borderRadius: 14,
                  boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
                  marginBottom: 10,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 8,
                    marginBottom: 6,
                  }}
                >
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 600,
                      color: "#0B1F3A",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      minWidth: 0,
                      flex: 1,
                    }}
                  >
                    {instructorName}{" "}
                    <span style={{ fontWeight: 400, color: "#8A93A3", fontSize: 12 }}>
                      (instructor)
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                    <span style={{ fontSize: 12, color: "#8A93A3" }}>
                      {timeAgo(t.last_created_at)}
                    </span>
                    {t.unread && (
                      <span
                        aria-label="unread"
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          background: "#CC2229",
                        }}
                      />
                    )}
                  </div>
                </div>
                <div style={{ marginBottom: 6 }}>
                  <span
                    style={{
                      display: "inline-block",
                      background: "#E6F0FB",
                      color: "#1877D6",
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: 0.4,
                      padding: "2px 8px",
                      borderRadius: 999,
                      textTransform: "uppercase",
                    }}
                  >
                    Job offer
                  </span>
                </div>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 500,
                    color: "#0B1F3A",
                    marginBottom: 3,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  Re: {pupil}
                  {area ? ` · ${area}` : ""}
                </div>
                <div
                  style={{
                    fontSize: 13,
                    color: t.unread ? "#0B1F3A" : "#5A6270",
                    fontWeight: t.unread ? 500 : 400,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {t.last_sender_type === "admin" ? "You: " : ""}
                  {t.last_message}
                </div>
              </div>
            );
          })
        )}
      </div>
    </>
  );
}

function AdminJobThreadSheet({
  jobId,
  uid,
  onClose,
}: {
  jobId: string;
  uid: string | null;
  onClose: () => void;
}) {
  const [messages, setMessages] = useState<JobMessage[] | null>(null);
  const [jobLabel, setJobLabel] = useState<string>("");
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const loadMessages = async () => {
    const { data } = await supabase
      .from("job_offer_messages")
      .select("*")
      .eq("job_offer_id", jobId)
      .order("created_at", { ascending: true });
    setMessages((data ?? []) as JobMessage[]);
    setTimeout(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
    }, 50);
  };

  useEffect(() => {
    (async () => {
      const { data: job } = await supabase
        .from("job_offers")
        .select("pupil_name, postcode_area, status")
        .eq("id", jobId)
        .maybeSingle();
      if (job) {
        setJobLabel(
          [job.pupil_name || "Job enquiry", job.postcode_area, job.status]
            .filter(Boolean)
            .join(" · "),
        );
      }
      await loadMessages();
      // Mark instructor-sent messages as read by admin
      await supabase
        .from("job_offer_messages")
        .update({ read_by_admin: true })
        .eq("job_offer_id", jobId)
        .eq("sender_type", "instructor")
        .eq("read_by_admin", false);
    })();
  }, [jobId]);

  const send = async () => {
    const text = draft.trim();
    if (!text || !uid || sending) return;
    setSending(true);
    const { error } = await supabase.from("job_offer_messages").insert({
      job_offer_id: jobId,
      sender_type: "admin",
      sender_id: uid,
      message: text,
      read_by_admin: true,
    });
    setSending(false);
    if (error) {
      toast.error("Message failed to send");
      return;
    }
    setDraft("");
    loadMessages();
  };

  const fmtTime = (iso: string) =>
    new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.4)",
        zIndex: 100,
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end",
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#F3F8FF",
          borderTopLeftRadius: 16,
          borderTopRightRadius: 16,
          maxHeight: "85vh",
          display: "flex",
          flexDirection: "column",
          ...FONT,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            padding: "14px 16px",
            borderBottom: "1px solid #E5E7EB",
            background: "#fff",
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#0B1F3A" }}>Job thread</div>
            <div style={{ fontSize: 11, color: "#8A93A3" }}>{jobLabel || "…"}</div>
          </div>
          <button
            onClick={onClose}
            style={{ padding: 6, background: "transparent", border: "none", cursor: "pointer" }}
            aria-label="Close"
          >
            <X size={20} color="#8A93A3" />
          </button>
        </div>
        <div
          ref={scrollRef}
          style={{
            flex: 1,
            overflowY: "auto",
            padding: 16,
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          {messages === null ? (
            <div style={{ color: "#8A93A3", fontSize: 13, textAlign: "center", padding: 20 }}>
              Loading…
            </div>
          ) : messages.length === 0 ? (
            <div style={{ color: "#8A93A3", fontSize: 13, textAlign: "center", padding: 20 }}>
              No messages yet.
            </div>
          ) : (
            messages.map((m) => {
              const mine = m.sender_type === "admin";
              const bg = mine ? "#1877D6" : m.sender_type === "instructor" ? "#fff" : "#FEF3C7";
              const color = mine ? "#fff" : "#0B1F3A";
              return (
                <div
                  key={m.id}
                  style={{ display: "flex", justifyContent: mine ? "flex-end" : "flex-start" }}
                >
                  <div
                    style={{
                      maxWidth: "78%",
                      background: bg,
                      color,
                      borderRadius: 14,
                      padding: "8px 12px",
                      fontSize: 14,
                      boxShadow: mine ? "none" : "0 1px 2px rgba(0,0,0,0.05)",
                    }}
                  >
                    <div
                      style={{
                        fontSize: 10,
                        opacity: 0.7,
                        marginBottom: 2,
                        textTransform: "uppercase",
                        letterSpacing: 0.3,
                      }}
                    >
                      {m.sender_type}
                    </div>
                    <div style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{m.message}</div>
                    <div style={{ fontSize: 10, opacity: 0.7, marginTop: 2, textAlign: "right" }}>
                      {fmtTime(m.created_at)}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
        <div
          style={{
            display: "flex",
            gap: 8,
            padding: 12,
            borderTop: "1px solid #E5E7EB",
            background: "#fff",
            paddingBottom: "calc(12px + env(safe-area-inset-bottom, 0px))",
          }}
        >
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") send();
            }}
            placeholder="Reply as admin…"
            style={{
              flex: 1,
              background: "#F3F4F6",
              border: "none",
              borderRadius: 20,
              padding: "10px 14px",
              fontSize: 16,
              outline: "none",
              ...FONT,
            }}
          />
          <button
            onClick={send}
            disabled={!draft.trim() || sending}
            style={{
              background: "#1877D6",
              color: "#fff",
              border: "none",
              borderRadius: 20,
              width: 40,
              height: 40,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: draft.trim() ? "pointer" : "not-allowed",
              opacity: draft.trim() ? 1 : 0.5,
            }}
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}


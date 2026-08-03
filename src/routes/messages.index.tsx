import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MessageCircle, Search, Send, Flag, X } from "lucide-react";
import {
  IconSearch,
  IconPinFilled,
  IconPin,
  IconSpeakerphone,
  IconPlus,
  IconChevronRight,
  IconChevronLeft,
  IconBellOff,
  IconBell,
  IconChecks,
} from "@tabler/icons-react";
import { toast } from "sonner";
import { supabase } from "../lib/supabaseClient";
import { PageLayout } from "@/components/PageLayout";
import InstructorTopBar from "@/components/dsm/InstructorTopBar";
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

const FONT = { fontFamily: "Poppins, Inter, sans-serif" } as const;

const NAVY = "#0B1F3A";
const BLUE = "#1877D6";
const RED = "#CC2229";
const GREY = "#6B7686";
const BORDER = "#E4E8EF";
const CANVAS = "#EEF2F7";

const PIN_KEY = "dsm_msg_pinned";
const MUTE_KEY = "dsm_msg_muted";

function readKeySet(key: string): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(key);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}
function writeKeySet(key: string, s: Set<string>) {
  try {
    localStorage.setItem(key, JSON.stringify(Array.from(s)));
  } catch {
    /* ignore */
  }
}

/** Today -> "14:32", this week -> "Mon", older -> "28 Jul" */
function formatStamp(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  if (d.toDateString() === now.toDateString())
    return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  const diffDays = (now.getTime() - d.getTime()) / 86400000;
  if (diffDays < 7) return d.toLocaleDateString("en-GB", { weekday: "short" });
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

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
  is_opt_in?: boolean | null;
}

/** "SO30 2XX" / "so302xx" -> "SO30" */
function normaliseOutcode(pc?: string | null): string | null {
  if (!pc) return null;
  const clean = pc.replace(/\s+/g, "").toUpperCase();
  if (clean.length < 3) return null;
  return clean.slice(0, clean.length - 3) || null;
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
  const { jobOfferId: jobOfferIdParam } = Route.useSearch();
  const [filter, setFilter] = useState<"all" | "pupils" | "local" | "admin">("all");
  const [view, setView] = useState<"inbox" | "chat" | "rooms">("inbox");
  const [showSearch, setShowSearch] = useState(false);
  const adminStatus = useAdminGate();
  const isAdmin = adminStatus === "allowed";
  useEffect(() => {
    if (!jobOfferIdParam || !isAdmin) return;
    setFilter("admin");
    setOpenThreadJobId(jobOfferIdParam);
    supabase
      .from("job_offer_messages")
      .update({ read_by_admin: true })
      .eq("job_offer_id", jobOfferIdParam)
      .eq("sender_type", "instructor")
      .eq("read_by_admin", false)
      .then(() => {});
    navigate({ to: "/messages", search: {}, replace: true });
  }, [jobOfferIdParam, isAdmin]);
  const [adminThreads, setAdminThreads] = useState<JobThreadRow[]>([]);
  const [adminLoading, setAdminLoading] = useState(false);
  const [openThreadJobId, setOpenThreadJobId] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [convos, setConvos] = useState<Conversation[]>([]);
  const [query, setQuery] = useState("");

  // Local chat state
  const [userId, setUserId] = useState<string | null>(null);
  const [myName, setMyName] = useState<string | null>(null);
  const [areaName, setAreaName] = useState<string>("Your area");
  const [room, setRoom] = useState<LocalChatRoom | null>(null);
  const [myRooms, setMyRooms] = useState<LocalChatRoom[]>([]);
  const [joinedRoomIds, setJoinedRoomIds] = useState<Set<string>>(new Set());
  const [homeOutcode, setHomeOutcode] = useState<string | null>(null);
  const [localMessages, setLocalMessages] = useState<LocalMessage[]>([]);
  const [localLoading, setLocalLoading] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [lastSeen, setLastSeen] = useState<number>(0);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const scrollBoxRef = useRef<HTMLDivElement | null>(null);

  const loadConvos = useCallback(async () => {
    {
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
    }
  }, []);

  useEffect(() => {
    void loadConvos();
  }, [loadConvos]);

  // Keep the inbox fresh when a message is sent from Home, a pupil page or Schedule
  useEffect(() => {
    let uid: string | null = null;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let cancelled = false;

    (async () => {
      const { data: sessionRes } = await supabase.auth.getSession();
      uid = sessionRes.session?.user?.id ?? null;
      if (!uid || cancelled) return;
      channel = supabase
        .channel(`inbox_chat_messages_${uid}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "chat_messages",
            filter: `instructor_id=eq.${uid}`,
          },
          (payload) => {
            if (payload.eventType === "INSERT") {
              const row = payload.new as { sender_type?: string | null };
              if (row?.sender_type === "pupil") {
                window.dispatchEvent(
                  new CustomEvent("dsm-message-received", {
                    detail: { type: "pupil", unreadCount: 1 },
                  }),
                );
              }
            }
            void loadConvos();
          },
        )
        .subscribe();
    })();

    function onVisible() {
      if (document.visibilityState === "visible") void loadConvos();
    }
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
      if (channel) supabase.removeChannel(channel);
    };
  }, [loadConvos]);

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
      const outcode = normaliseOutcode(instructor?.home_postcode);
      const area = instructor?.city || outcode || "Your area";
      setAreaName(area);
      setMyName(instructor?.name ?? null);
      setHomeOutcode(outcode ?? null);
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

  // Load joined local rooms for the room switcher
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    (async () => {
      const { data: rooms } = await supabase
        .from("local_chat_rooms")
        .select("id, outcode, area_name, instructor_count, is_opt_in")
        .neq("outcode", "UK");
      if (cancelled) return;
      const { data: subs } = await supabase
        .from("chat_room_subscriptions")
        .select("room_id")
        .eq("instructor_id", userId);
      if (cancelled) return;
      const subIds = new Set(((subs ?? []) as { room_id: string }[]).map((s) => s.room_id));
      const all = (rooms ?? []) as LocalChatRoom[];
      // Hide private (invite-only) rooms the user hasn't joined
      setMyRooms(all.filter((r) => !r.is_opt_in || subIds.has(r.id)));
      setJoinedRoomIds(subIds);
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, homeOutcode]);

  // Pin / mute preferences (localStorage)
  const [pinned, setPinned] = useState<Set<string>>(new Set());
  const [muted, setMuted] = useState<Set<string>>(new Set());
  useEffect(() => {
    setPinned(readKeySet(PIN_KEY));
    setMuted(readKeySet(MUTE_KEY));
  }, []);

  // Latest message preview + unread count for each joined room
  const [roomPreviews, setRoomPreviews] = useState<
    Record<string, { body: string; sender: string; created_at: string; unread: number }>
  >({});

  const joinedRooms = useMemo(
    () => myRooms.filter((r) => joinedRoomIds.has(r.id) || r.outcode === homeOutcode),
    [myRooms, joinedRoomIds, homeOutcode],
  );

  useEffect(() => {
    const ids = joinedRooms.map((r) => r.id);
    if (ids.length === 0) {
      setRoomPreviews({});
      return;
    }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("local_chat_messages")
        .select("id, room_id, instructor_id, message, created_at, instructors(name)")
        .in("room_id", ids)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(300);
      if (cancelled) return;
      const map: Record<
        string,
        { body: string; sender: string; created_at: string; unread: number }
      > = {};
      for (const raw of (data ?? []) as unknown[]) {
        const m = raw as {
          room_id: string;
          instructor_id: string;
          message: string;
          created_at: string;
          instructors?: { name: string | null } | null;
        };
        if (!map[m.room_id]) {
          map[m.room_id] = {
            body: m.message,
            sender: m.instructor_id === userId ? "You" : firstName(m.instructors?.name),
            created_at: m.created_at,
            unread: 0,
          };
        }
        const seen = Number(localStorage.getItem(`local_chat_last_seen_${m.room_id}`) || 0);
        if (m.instructor_id !== userId && new Date(m.created_at).getTime() > seen) {
          map[m.room_id].unread += 1;
        }
      }
      setRoomPreviews(map);
    })();
    return () => {
      cancelled = true;
    };
  }, [joinedRooms, userId, localMessages.length]);



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
            window.dispatchEvent(
              new CustomEvent("dsm-message-received", {
                detail: { type: "local", unreadCount: 1 },
              }),
            );
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

  // Auto-scroll to bottom when messages change and the chat view is open
  useEffect(() => {
    if (view !== "chat") return;
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [localMessages, view]);

  // Mark as seen when the chat view is open
  useEffect(() => {
    if (view !== "chat" || !room) return;
    const now = Date.now();
    localStorage.setItem(`local_chat_last_seen_${room.id}`, String(now));
    setLastSeen(now);
    setRoomPreviews((prev) =>
      prev[room.id] ? { ...prev, [room.id]: { ...prev[room.id], unread: 0 } } : prev,
    );
  }, [view, room, localMessages.length]);

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
    if (!isAdmin) return;
    loadAdminThreads();
  }, [isAdmin]);

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
          window.dispatchEvent(
            new CustomEvent("dsm-message-received", {
              detail: { type: "admin", unreadCount: 1 },
            }),
          );
          loadAdminThreads();
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAdmin]);




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

  async function markRoomRead(roomId: string) {
    const now = Date.now();
    localStorage.setItem(`local_chat_last_seen_${roomId}`, String(now));
    if (room?.id === roomId) setLastSeen(now);
    setRoomPreviews((prev) =>
      prev[roomId] ? { ...prev, [roomId]: { ...prev[roomId], unread: 0 } } : prev,
    );
  }

  async function markPupilRead(pupilId: string) {
    const { data: sessionRes } = await supabase.auth.getSession();
    const uid = sessionRes.session?.user?.id;
    if (!uid) return;
    const now = new Date().toISOString();
    await supabase
      .from("chat_messages")
      .update({ read_at: now })
      .eq("instructor_id", uid)
      .eq("pupil_id", pupilId)
      .eq("sender_type", "pupil")
      .is("read_at", null);
    setConvos((prev) =>
      prev.map((c) => (c.pupil_id === pupilId && !c.read_at ? { ...c, read_at: now } : c)),
    );
    window.dispatchEvent(new CustomEvent("dsm-messages-read"));
  }

  async function markAdminRead(jobId: string) {
    await supabase
      .from("job_offer_messages")
      .update({ read_by_admin: true })
      .eq("job_offer_id", jobId)
      .eq("sender_type", "instructor")
      .eq("read_by_admin", false);
    setAdminThreads((prev) =>
      prev.map((t) => (t.job_offer_id === jobId ? { ...t, unread: false } : t)),
    );
  }

  function openRoom(r: LocalChatRoom) {
    setRoom(r);
    setAreaName(r.area_name || r.outcode);
    setView("chat");
  }

  const items: InboxItem[] = useMemo(() => {
    const list: InboxItem[] = [];

    for (const c of convos) {
      const name = c.pupil?.name || c.pupil?.first_name || "Pupil";
      list.push({
        key: `pupil:${c.pupil_id}`,
        kind: "pupil",
        name,
        preview: `${c.sender_type === "instructor" ? "You: " : ""}${c.body ?? ""}`,
        ts: c.created_at,
        unread: c.sender_type === "pupil" && !c.read_at ? 1 : 0,
        photo: c.pupil?.profile_image_url ?? null,
        initials: initials(c.pupil),
        bg: avatarColor(c.pupil_id),
        open: () => navigate({ to: "/messages/$pupilId", params: { pupilId: c.pupil_id } }),
        markRead: () => void markPupilRead(c.pupil_id),
      });
    }

    for (const r of joinedRooms) {
      const p = roomPreviews[r.id];
      const label = `${r.area_name || r.outcode} ADIs`;
      const unread = room?.id === r.id && view === "chat" ? 0 : (p?.unread ?? 0);
      list.push({
        key: `local:${r.id}`,
        kind: "local",
        name: label,
        preview: p ? `${p.sender}: ${p.body}` : "No messages yet",
        ts: p?.created_at ?? new Date(0).toISOString(),
        unread,
        initials: nameInitials(r.area_name || r.outcode),
        bg: NAVY,
        open: () => openRoom(r),
        markRead: () => void markRoomRead(r.id),
      });
    }

    if (isAdmin) {
      for (const t of adminThreads) {
        list.push({
          key: `admin:${t.job_offer_id}`,
          kind: "admin",
          name: `${t.last_sender_instructor_name || "Instructor"} · ${t.pupil_name || "Job enquiry"}`,
          preview: `${t.last_sender_type === "admin" ? "You: " : ""}${t.last_message}`,
          ts: t.last_created_at,
          unread: t.unread ? 1 : 0,
          initials: "",
          bg: RED,
          system: true,
          open: () => {
            void markAdminRead(t.job_offer_id);
            setOpenThreadJobId(t.job_offer_id);
          },
          markRead: () => void markAdminRead(t.job_offer_id),
        });
      }
    }

    return list;
  }, [convos, joinedRooms, roomPreviews, adminThreads, isAdmin, room, view, navigate]);

  const visibleItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items
      .filter((i) => (filter === "all" ? true : i.kind === filter.replace(/s$/, "") || i.kind === filter))
      .filter((i) => !q || i.name.toLowerCase().includes(q) || i.preview.toLowerCase().includes(q))
      .sort((a, b) => {
        const pa = pinned.has(a.key) ? 1 : 0;
        const pb = pinned.has(b.key) ? 1 : 0;
        if (pa !== pb) return pb - pa;
        return new Date(b.ts).getTime() - new Date(a.ts).getTime();
      });
  }, [items, filter, query, pinned]);

  const [menuItem, setMenuItem] = useState<InboxItem | null>(null);

  function togglePin(key: string) {
    setPinned((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      writeKeySet(PIN_KEY, next);
      return next;
    });
  }
  function toggleMute(key: string) {
    setMuted((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      writeKeySet(MUTE_KEY, next);
      return next;
    });
  }

  async function joinRoom(r: LocalChatRoom) {
    if (!userId) return;
    const { error } = await supabase
      .from("chat_room_subscriptions")
      .insert({ room_id: r.id, instructor_id: userId });
    if (error) {
      toast.error("Could not join room");
      return;
    }
    setJoinedRoomIds((prev) => new Set(prev).add(r.id));
    toast.success("Joined " + (r.area_name || r.outcode));
  }

  return (
    <PageLayout style={{ ...FONT, background: "#FFFFFF", paddingBottom: 24 }}>
      <InstructorTopBar
        firstName={myName ?? ""}
        pageTitle="Messages"
        onBack={() => navigate({ to: "/home" as never })}
        onBell={() => navigate({ to: "/notifications" as never })}
        onPhone={() => navigate({ to: "/enquiries" as never })}
        onLiveTrack={() => navigate({ to: "/live" as never })}
        onMenu={() => navigate({ to: "/more" as never })}
        onMicPress={() => toast.info("Voice commands coming soon!")}
      />
      <div style={{ height: "calc(60px + env(safe-area-inset-top, 0px))" }} />

      {view === "chat" ? (
        <LocalChatView
          areaName={areaName}
          room={room}
          myRooms={myRooms}
          joinedRoomIds={joinedRoomIds}
          homeOutcode={homeOutcode}
          onBack={() => setView("inbox")}
          onSelectRoom={(r) => {
            setRoom(r);
            setAreaName(r.area_name || r.outcode);
          }}
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
      ) : view === "rooms" ? (
        <RoomBrowser
          rooms={myRooms}
          joinedRoomIds={joinedRoomIds}
          homeOutcode={homeOutcode}
          onBack={() => setView("inbox")}
          onOpen={openRoom}
          onJoin={joinRoom}
        />
      ) : (
        <>
          {/* Header */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "12px 16px 8px",
            }}
          >
            <div style={{ fontSize: 20, fontWeight: 500, color: NAVY }}>Messages</div>
            <button
              type="button"
              aria-label="Search messages"
              onClick={() => setShowSearch((v) => !v)}
              style={{ background: "none", border: 0, padding: 4, cursor: "pointer", display: "flex" }}
            >
              <IconSearch size={20} color={showSearch ? BLUE : GREY} stroke={1.8} />
            </button>
          </div>

          {showSearch && (
            <div style={{ padding: "0 16px 8px" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  background: CANVAS,
                  borderRadius: 10,
                  padding: "9px 12px",
                }}
              >
                <IconSearch size={17} color={GREY} stroke={1.8} />
                <input
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search messages"
                  style={{
                    flex: 1,
                    border: 0,
                    outline: "none",
                    background: "transparent",
                    fontSize: 14,
                    color: NAVY,
                    ...FONT,
                  }}
                />
                {query && (
                  <button
                    type="button"
                    aria-label="Clear search"
                    onClick={() => setQuery("")}
                    style={{ background: "none", border: 0, padding: 0, cursor: "pointer", display: "flex" }}
                  >
                    <X size={15} color={GREY} />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Filter chips */}
          <div
            style={{
              display: "flex",
              gap: 8,
              padding: "4px 16px 12px",
              overflowX: "auto",
              scrollbarWidth: "none",
            }}
          >
            {(["all", "pupils", "local", ...(isAdmin ? (["admin"] as const) : [])] as const).map(
              (f) => {
                const active = filter === f;
                const label = f === "all" ? "All" : f === "pupils" ? "Pupils" : f === "local" ? "Local" : "Admin";
                return (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setFilter(f)}
                    style={{
                      flexShrink: 0,
                      background: active ? NAVY : "#FFFFFF",
                      color: active ? "#FFFFFF" : NAVY,
                      border: active ? "0.5px solid " + NAVY : `0.5px solid ${BORDER}`,
                      borderRadius: 20,
                      padding: "5px 14px",
                      fontSize: 12,
                      fontWeight: 500,
                      cursor: "pointer",
                      ...FONT,
                    }}
                  >
                    {label}
                  </button>
                );
              },
            )}
          </div>

          {filter === "local" && (
            <div style={{ padding: "0 16px 12px" }}>
              <button
                type="button"
                onClick={() => setView("rooms")}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  background: "#FFFFFF",
                  border: `0.5px solid ${BORDER}`,
                  borderRadius: 20,
                  padding: "7px 14px",
                  fontSize: 13,
                  fontWeight: 500,
                  color: NAVY,
                  cursor: "pointer",
                  ...FONT,
                }}
              >
                <IconSearch size={16} color={BLUE} stroke={1.8} />
                Find rooms
              </button>
            </div>
          )}

          {/* Unified list */}
          <div>
            {loading && items.length === 0 ? (
              <div style={{ padding: 32, textAlign: "center", color: GREY, fontSize: 13 }}>Loading…</div>
            ) : visibleItems.length === 0 ? (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 6,
                  padding: "56px 24px",
                }}
              >
                <MessageCircle size={40} color="#D0D5DD" />
                <div style={{ fontSize: 14, color: GREY }}>No conversations</div>
              </div>
            ) : (
              visibleItems.map((item) => (
                <InboxRow
                  key={item.key}
                  item={item}
                  pinned={pinned.has(item.key)}
                  muted={muted.has(item.key)}
                  onLongPress={() => setMenuItem(item)}
                />
              ))
            )}
          </div>
        </>
      )}

      {menuItem && (
        <div
          onClick={() => setMenuItem(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(11,31,58,0.35)",
            zIndex: 120,
            display: "flex",
            alignItems: "flex-end",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#FFFFFF",
              width: "100%",
              borderTopLeftRadius: 16,
              borderTopRightRadius: 16,
              padding: "8px 0 calc(8px + env(safe-area-inset-bottom, 0px))",
              ...FONT,
            }}
          >
            <div
              style={{
                padding: "10px 20px",
                fontSize: 13,
                color: GREY,
                borderBottom: `0.5px solid ${BORDER}`,
              }}
            >
              {menuItem.name}
            </div>
            {(
              [
                {
                  label: pinned.has(menuItem.key) ? "Unpin" : "Pin",
                  icon: pinned.has(menuItem.key) ? IconPin : IconPinFilled,
                  run: () => togglePin(menuItem.key),
                },
                {
                  label: muted.has(menuItem.key) ? "Unmute notifications" : "Mute notifications",
                  icon: muted.has(menuItem.key) ? IconBell : IconBellOff,
                  run: () => toggleMute(menuItem.key),
                },
                { label: "Mark as read", icon: IconChecks, run: () => menuItem.markRead() },
              ] as { label: string; icon: typeof IconPin; run: () => void }[]
            ).map((a) => (
              <button
                key={a.label}
                type="button"
                onClick={() => {
                  a.run();
                  setMenuItem(null);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  width: "100%",
                  background: "none",
                  border: 0,
                  padding: "14px 20px",
                  fontSize: 15,
                  color: NAVY,
                  cursor: "pointer",
                  textAlign: "left",
                  ...FONT,
                }}
              >
                <a.icon size={19} color={NAVY} stroke={1.8} />
                {a.label}
              </button>
            ))}
          </div>
        </div>
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
    </PageLayout>
  );
}

interface InboxItem {
  key: string;
  kind: "pupil" | "local" | "admin";
  name: string;
  preview: string;
  ts: string;
  unread: number;
  photo?: string | null;
  initials: string;
  bg: string;
  system?: boolean;
  open: () => void;
  markRead: () => void;
}

function InboxRow({
  item,
  pinned,
  muted,
  onLongPress,
}: {
  item: InboxItem;
  pinned: boolean;
  muted: boolean;
  onLongPress: () => void;
}) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressed = useRef(false);

  const start = () => {
    longPressed.current = false;
    timer.current = setTimeout(() => {
      longPressed.current = true;
      onLongPress();
    }, 450);
  };
  const clear = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };

  const unread = item.unread > 0;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => {
        if (longPressed.current) return;
        item.open();
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        onLongPress();
      }}
      onTouchStart={start}
      onTouchEnd={clear}
      onTouchMove={clear}
      onMouseDown={start}
      onMouseUp={clear}
      onMouseLeave={clear}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "11px 16px",
        minHeight: 72,
        borderBottom: `0.5px solid ${BORDER}`,
        background: "#FFFFFF",
        cursor: "pointer",
        WebkitTapHighlightColor: "transparent",
      }}
    >
      {/* Avatar */}
      <div style={{ position: "relative", width: 52, height: 52, flexShrink: 0 }}>
        {item.photo ? (
          <img
            src={item.photo}
            alt={item.name}
            style={{ width: 52, height: 52, borderRadius: "50%", objectFit: "cover" }}
          />
        ) : (
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: "50%",
              background: item.bg,
              color: "#FFFFFF",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 18,
              fontWeight: 500,
            }}
          >
            {item.system ? (
              <IconSpeakerphone size={24} color="#FFFFFF" stroke={1.8} />
            ) : (
              item.initials
            )}
          </div>
        )}
        {pinned && (
          <span
            style={{
              position: "absolute",
              top: -2,
              left: -2,
              width: 16,
              height: 16,
              borderRadius: "50%",
              background: "#FFFFFF",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <IconPinFilled size={11} color="#BA7517" />
          </span>
        )}
        {unread && (
          <span
            style={{
              position: "absolute",
              bottom: -2,
              right: -2,
              minWidth: 18,
              height: 18,
              padding: "0 5px",
              borderRadius: 9,
              background: RED,
              color: "#FFFFFF",
              border: "2px solid #FFFFFF",
              fontSize: 11,
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              lineHeight: 1,
            }}
          >
            {item.unread > 99 ? "99+" : item.unread}
          </span>
        )}
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 17,
            fontWeight: 500,
            color: NAVY,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {item.name}
        </div>
        <div
          style={{
            fontSize: 14,
            fontWeight: unread ? 500 : 400,
            color: unread ? NAVY : GREY,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            marginTop: 2,
          }}
        >
          {item.preview}
        </div>
      </div>

      {/* Timestamp */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
        {muted && <IconBellOff size={14} color={GREY} stroke={1.8} />}
        <span style={{ fontSize: 13, color: GREY }}>
          {item.ts && new Date(item.ts).getTime() > 0 ? formatStamp(item.ts) : ""}
        </span>
      </div>
    </div>
  );
}

function RoomBrowser({
  rooms,
  joinedRoomIds,
  homeOutcode,
  onBack,
  onOpen,
  onJoin,
}: {
  rooms: LocalChatRoom[];
  joinedRoomIds: Set<string>;
  homeOutcode: string | null;
  onBack: () => void;
  onOpen: (r: LocalChatRoom) => void;
  onJoin: (r: LocalChatRoom) => void;
}) {
  const [q, setQ] = useState("");

  const { mine, available } = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const match = (r: LocalChatRoom) =>
      !needle ||
      (r.area_name || "").toLowerCase().includes(needle) ||
      (r.outcode || "").toLowerCase().includes(needle);
    const visible = rooms.filter(match);
    return {
      mine: visible.filter((r) => joinedRoomIds.has(r.id) || r.outcode === homeOutcode),
      available: visible.filter(
        (r) => !joinedRoomIds.has(r.id) && r.outcode !== homeOutcode && !r.is_opt_in,
      ),
    };
  }, [rooms, q, joinedRoomIds, homeOutcode]);

  const RoomRow = ({ r, join }: { r: LocalChatRoom; join: boolean }) => (
    <div
      onClick={() => (join ? onJoin(r) : onOpen(r))}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "11px 16px",
        borderBottom: `0.5px solid ${BORDER}`,
        cursor: "pointer",
        background: "#FFFFFF",
      }}
    >
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: "50%",
          background: NAVY,
          color: "#FFFFFF",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 18,
          fontWeight: 500,
          flexShrink: 0,
        }}
      >
        {nameInitials(r.area_name || r.outcode)}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 17,
            fontWeight: 500,
            color: NAVY,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {r.area_name || r.outcode}
        </div>
        <div style={{ fontSize: 14, color: GREY, marginTop: 2 }}>
          {r.instructor_count ?? 1} member{(r.instructor_count ?? 1) === 1 ? "" : "s"} · {r.outcode}
        </div>
      </div>
      {join ? (
        <button
          type="button"
          aria-label={`Join ${r.area_name || r.outcode}`}
          onClick={(e) => {
            e.stopPropagation();
            onJoin(r);
          }}
          style={{
            width: 32,
            height: 32,
            borderRadius: "50%",
            background: BLUE,
            border: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            flexShrink: 0,
          }}
        >
          <IconPlus size={18} color="#FFFFFF" stroke={2} />
        </button>
      ) : (
        <IconChevronRight size={20} color={GREY} stroke={1.8} />
      )}
    </div>
  );

  return (
    <div style={{ background: "#FFFFFF", minHeight: "60vh" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 16px 4px" }}>
        <button
          type="button"
          aria-label="Back"
          onClick={onBack}
          style={{ background: "none", border: 0, padding: 0, cursor: "pointer", display: "flex" }}
        >
          <IconChevronLeft size={22} color={NAVY} stroke={1.8} />
        </button>
        <div style={{ fontSize: 22, fontWeight: 500, color: NAVY }}>Find rooms</div>
      </div>

      <div style={{ padding: "8px 16px 12px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: CANVAS,
            borderRadius: 10,
            padding: "10px 12px",
          }}
        >
          <IconSearch size={17} color={GREY} stroke={1.8} />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search area or room name"
            style={{
              flex: 1,
              border: 0,
              outline: "none",
              background: "transparent",
              fontSize: 14,
              color: NAVY,
              ...FONT,
            }}
          />
        </div>
      </div>

      {([
        ["Your rooms", mine, false],
        ["Available rooms", available, true],
      ] as [string, LocalChatRoom[], boolean][]).map(([label, list, join]) => (
        <div key={label}>
          <div
            style={{
              padding: "12px 16px 6px",
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: 0.6,
              textTransform: "uppercase",
              color: GREY,
            }}
          >
            {label}
          </div>
          {list.length === 0 ? (
            <div style={{ padding: "8px 16px 12px", fontSize: 13, color: GREY }}>None</div>
          ) : (
            list.map((r) => <RoomRow key={r.id} r={r} join={join} />)
          )}
        </div>
      ))}
    </div>
  );
}

function LocalChatView(props: {
  areaName: string;
  room: LocalChatRoom | null;
  myRooms: LocalChatRoom[];
  joinedRoomIds: Set<string>;
  homeOutcode: string | null;
  onSelectRoom: (r: LocalChatRoom) => void;
  onBack: () => void;
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
    myRooms,
    joinedRoomIds,
    homeOutcode,
    onSelectRoom,
    onBack,
    messages: allMessages,
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

  const [roomSelectorOpen, setRoomSelectorOpen] = useState(false);
  const [roomSearch, setRoomSearch] = useState("");

  const messages = allMessages;
  const highlight = (text: string) => text;

  const { joined: joinedRooms, other: otherRooms } = useMemo(() => {
    const q = roomSearch.trim().toLowerCase();
    const match = (r: LocalChatRoom) =>
      !q ||
      (r.area_name || "").toLowerCase().includes(q) ||
      (r.outcode || "").toLowerCase().includes(q);
    const visible = myRooms.filter(match);
    return {
      joined: visible.filter((r) => joinedRoomIds.has(r.id) || r.outcode === homeOutcode),
      other: visible.filter((r) => !joinedRoomIds.has(r.id) && r.outcode !== homeOutcode),
    };
  }, [myRooms, roomSearch, joinedRoomIds, homeOutcode]);
  const totalRooms = joinedRooms.length + otherRooms.length;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 60px - 45px - 64px)" }}>
      {/* Room header */}
      <div
        style={{
          background: "#F7FAFC",
          padding: "10px 16px",
          borderBottom: "0.5px solid #E2E6ED",
          position: "relative",
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <button
          type="button"
          aria-label="Back to messages"
          onClick={onBack}
          style={{ background: "none", border: 0, padding: 0, cursor: "pointer", display: "flex" }}
        >
          <IconChevronLeft size={20} color={NAVY} stroke={1.8} />
        </button>
        <button
          type="button"
          onClick={() => setRoomSelectorOpen((v) => !v)}
          style={{
            flex: 1,
            minWidth: 0,
            textAlign: "left",
            background: "none",
            border: 0,
            padding: 0,
            cursor: "pointer",
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 600, color: "#0B1F3A" }}>{areaName} ADIs ▾</div>
          <div style={{ fontSize: 11, color: "#9CA3AF" }}>{room?.instructor_count ?? 1} members</div>
        </button>
        <button
          type="button"
          aria-label="Search rooms"
          onClick={() => setRoomSelectorOpen((v) => !v)}
          style={{ background: "none", border: 0, padding: 4, cursor: "pointer", display: "flex" }}
        >
          <Search size={18} color={roomSelectorOpen ? "#1877D6" : "#9CA3AF"} />
        </button>
        {roomSelectorOpen && (
          <div
            style={{
              position: "absolute",
              top: 48,
              left: 16,
              right: 16,
              zIndex: 41,
              background: "#FFFFFF",
              borderRadius: 12,
              border: "0.5px solid #E2E6ED",
              boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
              overflow: "hidden",
              maxHeight: 280,
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 12px",
                borderBottom: "0.5px solid #E2E6ED",
              }}
            >
              <Search size={15} color="#8A93A3" />
              <input
                value={roomSearch}
                onChange={(e) => setRoomSearch(e.target.value)}
                placeholder="Search rooms..."
                autoFocus
                style={{
                  flex: 1,
                  border: 0,
                  outline: "none",
                  fontSize: 13,
                  color: "#0B1F3A",
                  background: "transparent",
                  ...FONT,
                }}
              />
              {roomSearch && (
                <button
                  type="button"
                  aria-label="Clear room search"
                  onClick={() => setRoomSearch("")}
                  style={{ background: "none", border: 0, padding: 0, cursor: "pointer", display: "flex" }}
                >
                  <X size={14} color="#8A93A3" />
                </button>
              )}
            </div>
            <div style={{ overflowY: "auto" }}>
              {totalRooms === 0 ? (
                <div style={{ padding: "12px 14px", fontSize: 12, color: "#9CA3AF" }}>No rooms found</div>
              ) : (
                ([
                  ["Your rooms", joinedRooms],
                  ["All rooms", otherRooms],
                ] as [string, LocalChatRoom[]][]).map(([label, list]) =>
                  list.length === 0 ? null : (
                    <div key={label}>
                      <div
                        style={{
                          padding: "8px 14px 4px",
                          fontSize: 10,
                          fontWeight: 700,
                          letterSpacing: 0.6,
                          textTransform: "uppercase",
                          color: "#9CA3AF",
                          background: "#FAFBFC",
                        }}
                      >
                        {label}
                      </div>
                      {list.map((r) => (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() => {
                            onSelectRoom(r);
                            setRoomSelectorOpen(false);
                            setRoomSearch("");
                          }}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            width: "100%",
                            textAlign: "left",
                            padding: "10px 14px",
                            background: room?.id === r.id ? "#F2F7FF" : "#FFFFFF",
                            border: 0,
                            borderBottom: "0.5px solid #F0F2F6",
                            fontSize: 13,
                            color: "#0B1F3A",
                            cursor: "pointer",
                            ...FONT,
                          }}
                        >
                          <span
                            style={{
                              flex: 1,
                              minWidth: 0,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {r.area_name || r.outcode}
                            <span style={{ color: "#9CA3AF", fontSize: 11, marginLeft: 6 }}>{r.outcode}</span>
                          </span>
                          {r.is_opt_in && (
                            <span
                              style={{
                                background: "#F1F3F7",
                                color: "#6B7280",
                                fontSize: 10,
                                fontWeight: 700,
                                borderRadius: 999,
                                padding: "2px 8px",
                                flexShrink: 0,
                              }}
                            >
                              Private
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  ),
                )
              )}
            </div>

          </div>
        )}
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
                        {highlight(msg.message)}
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
                        {highlight(msg.message)}
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


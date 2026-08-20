import { createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import { tokens } from "@/lib/tokens";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import DSMSkeleton from "@/components/dsm/DSMSkeleton";
import {
  IconAdjustmentsHorizontal,
  IconArchive,
  IconBell,
  IconBellOff,
  IconChevronLeft,
  IconChevronRight,
  IconDots,
  IconEdit,
  IconFlag,
  IconMail,
  IconMessageCircle,
  IconPlus,
  IconSearch,
  IconSend,
  IconSpeakerphone,
  IconX,
} from "@tabler/icons-react";
import { toast } from "sonner";
import { tapLight, tapMedium } from "@/lib/haptics";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { supabase } from "../lib/supabaseClient";
import { PageLayout } from "@/components/PageLayout";
import { useAdminGate } from "./admin";
import { pupilColour } from "@/components/PupilAvatar";

export const Route = createFileRoute("/messages/")({
  validateSearch: (search: Record<string, unknown>): { jobOfferId?: string } => ({
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

const FONT = { fontFamily: "Poppins, sans-serif" } as const;

type Filter = "all" | "pupils" | "local" | "admin" | "instructors";

const NAVY = "#0B1F3A";
const BLUE = "#1877D6";
const RED = "#CC2229";
const GREY = "#6B7686";
const BORDER = "#E4E8EF";
const CANVAS = "#EEF2F7";

const ARCHIVE_KEY = "dsm_msg_archived";
const MUTE_KEY = "dsm_msg_muted";
const UNREAD_KEY = "dsm_msg_forced_unread";

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

// Shared deterministic pupil colour so the same pupil looks identical everywhere.
const avatarColor = (id: string) => pupilColour(id);

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
  image_url?: string | null;
  description?: string | null;
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
  const [filter, setFilter] = useState<Filter>("all");
  const [instructorDMs, setInstructorDMs] = useState<any[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
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
  const { pullToRefreshProps } = usePullToRefresh({ onRefresh: async () => loadConvos() });
  const [convos, setConvos] = useState<Conversation[]>([]);
  const [query, setQuery] = useState("");

  // Local chat state
  const [userId, setUserId] = useState<string | null>(null);
  const [myName, setMyName] = useState<string | null>(null);
  const [areaName, setAreaName] = useState<string>("Your area");
  const [room, setRoom] = useState<LocalChatRoom | null>(null);
  const [myRooms, setMyRooms] = useState<LocalChatRoom[]>([]);
  const [allRooms, setAllRooms] = useState<LocalChatRoom[]>([]);
  const [allPublicRooms, setAllPublicRooms] = useState<LocalChatRoom[]>([]);
  const [joinedCount, setJoinedCount] = useState(0);
  const [joinedRoomIds, setJoinedRoomIds] = useState<Set<string>>(new Set());
  const [homeOutcode, setHomeOutcode] = useState<string | null>(null);
  const [localMessages, setLocalMessages] = useState<LocalMessage[]>([]);
  const [localLoading, setLocalLoading] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [lastSeen, setLastSeen] = useState<number>(0);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const scrollBoxRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!userId) return;
    supabase
      .from("instructor_conversations")
      .select(
        "id, instructor_a_id, instructor_b_id, last_message, last_message_at, instructor_a:instructors!instructor_a_id(id, name, profile_image_url), instructor_b:instructors!instructor_b_id(id, name, profile_image_url)",
      )
      .or(`instructor_a_id.eq.${userId},instructor_b_id.eq.${userId}`)
      .order("last_message_at", { ascending: false })
      .then(({ data }) => {
        setInstructorDMs((data as any[]) ?? []);
      });
  }, [userId]);

  // Unread instructor DMs: instructor_messages addressed to me with no read_at.
  const [dmUnread, setDmUnread] = useState<Record<string, number>>({});
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    const load = async () => {
      const { data } = await supabase
        .from("instructor_messages")
        .select("conversation_id")
        .eq("to_instructor_id", userId)
        .is("read_at", null);
      if (cancelled) return;
      const map: Record<string, number> = {};
      for (const m of (data as any[]) ?? []) {
        const cid = m.conversation_id as string;
        map[cid] = (map[cid] ?? 0) + 1;
      }
      setDmUnread(map);
      // Let the bottom nav badge include instructor DMs in its total.
      window.dispatchEvent(
        new CustomEvent("dsm-instructor-dm-unread", {
          detail: { count: Object.values(map).reduce((a, b) => a + b, 0) },
        }),
      );
    };
    void load();
    const onPing = () => void load();
    window.addEventListener("dsm-messages-read", onPing);
    const ch = supabase
      .channel(`instructor-dm-unread-${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "instructor_messages" },
        () => void load(),
      )
      .subscribe();
    return () => {
      cancelled = true;
      window.removeEventListener("dsm-messages-read", onPing);
      void supabase.removeChannel(ch);
    };
  }, [userId]);

  useEffect(() => {
    if (!searchOpen) return;
    const q = searchQuery.trim();
    const t = setTimeout(
      () => {
        supabase
          .from("instructors")
          .select("id, name, profile_image_url, home_postcode")
          .neq("id", userId ?? "")
          .ilike("name", q.length >= 2 ? `%${q}%` : "%%")
          .order("name", { ascending: true })
          .limit(20)
          .then(({ data }) => setSearchResults((data as any[]) ?? []));
      },
      q.length >= 2 ? 300 : 0,
    );
    return () => clearTimeout(t);
  }, [searchQuery, searchOpen, userId]);

  async function startConversation(otherInstructorId: string) {
    tapLight();
    if (!userId) return;
    const { data: existing } = await supabase
      .from("instructor_conversations")
      .select("id")
      .or(
        `and(instructor_a_id.eq.${userId},instructor_b_id.eq.${otherInstructorId}),and(instructor_a_id.eq.${otherInstructorId},instructor_b_id.eq.${userId})`,
      )
      .maybeSingle();
    if (existing) {
      setSearchOpen(false);
      navigate({
        to: "/messages/instructor/$conversationId" as never,
        params: { conversationId: (existing as any).id } as never,
      });
      return;
    }
    const { data: created, error } = await supabase
      .from("instructor_conversations")
      .insert({ instructor_a_id: userId, instructor_b_id: otherInstructorId } as any)
      .select("id")
      .single();
    if (error || !created) {
      toast.error("Could not start conversation");
      return;
    }
    setSearchOpen(false);
    navigate({
      to: "/messages/instructor/$conversationId" as never,
      params: { conversationId: (created as any).id } as never,
    });
  }

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
        .select("id, outcode, area_name, instructor_count, is_opt_in, image_url, description")
        .is("deleted_at", null)
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
      // Only public rooms should appear in the discovery list
      setAllPublicRooms(all.filter((r) => !r.is_opt_in));
      setJoinedRoomIds(subIds);

      // Every public room (including brand-new admin rooms + national), for the room browser
      const { data: publicRooms } = await supabase
        .from("local_chat_rooms")
        .select("id, outcode, area_name, instructor_count, is_opt_in, image_url, description")
        .is("deleted_at", null)
        .or("is_opt_in.is.null,is_opt_in.eq.false")
        .order("instructor_count", { ascending: false });
      if (cancelled) return;
      setAllRooms((publicRooms ?? []) as LocalChatRoom[]);
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, homeOutcode, joinedCount]);

  // Archive / mute preferences (localStorage)
  const [archived, setArchived] = useState<Set<string>>(new Set());
  const [muted, setMuted] = useState<Set<string>>(new Set());
  // Rows the user explicitly toggled back to unread (persisted across reloads).
  const [forcedUnread, setForcedUnread] = useState<Set<string>>(new Set());
  useEffect(() => {
    setArchived(readKeySet(ARCHIVE_KEY));
    setMuted(readKeySet(MUTE_KEY));
    setForcedUnread(readKeySet(UNREAD_KEY));
  }, []);

  const setForced = useCallback((key: string, on: boolean) => {
    setForcedUnread((prev) => {
      const next = new Set(prev);
      if (on) next.add(key);
      else next.delete(key);
      writeKeySet(UNREAD_KEY, next);
      return next;
    });
  }, []);

  // Latest message preview + unread count for each joined room
  const [roomPreviews, setRoomPreviews] = useState<
    Record<string, { body: string; sender: string; created_at: string; unread: number }>
  >({});

  const joinedRooms = useMemo(
    () => myRooms.filter((r) => joinedRoomIds.has(r.id) || r.outcode === homeOutcode),
    [myRooms, joinedRoomIds, homeOutcode],
  );

  // Room browser list: every public room, plus joined private rooms
  const browseRooms = useMemo(() => {
    const byId = new Map<string, LocalChatRoom>();
    for (const r of allRooms) byId.set(r.id, r);
    for (const r of myRooms) if (!byId.has(r.id)) byId.set(r.id, r);
    return [...byId.values()];
  }, [allRooms, myRooms]);

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
        {
          event: "INSERT",
          schema: "public",
          table: "local_chat_messages",
          filter: `room_id=eq.${room.id}`,
        },
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
      for (const j of (jobs || []) as {
        id: string;
        pupil_name: string | null;
        postcode_area: string | null;
      }[]) {
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
        {
          event: "INSERT",
          schema: "public",
          table: "job_offer_messages",
          filter: "sender_type=eq.instructor",
        },
        async (payload) => {
          const row = payload.new as { job_offer_id: string; sender_id: string | null };
          const [{ data: job }, { data: instructor }] = await Promise.all([
            supabase
              .from("job_offers")
              .select("pupil_name")
              .eq("id", row.job_offer_id)
              .maybeSingle(),
            row.sender_id
              ? supabase.from("instructors").select("name").eq("id", row.sender_id).maybeSingle()
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
    tapMedium();
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
    setTimeout(() => {
      window.dispatchEvent(new Event("dsm-messages-read"));
    }, 300);
    setTimeout(() => {
      window.dispatchEvent(new Event("dsm-messages-read"));
    }, 1500);
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

  async function markInstructorDmRead(conversationId: string) {
    setDmUnread((prev) => (prev[conversationId] ? { ...prev, [conversationId]: 0 } : prev));
    if (!userId) return;
    await supabase
      .from("instructor_messages")
      .update({ read_at: new Date().toISOString() })
      .eq("conversation_id", conversationId)
      .eq("to_instructor_id", userId)
      .is("read_at", null);
    window.dispatchEvent(new Event("dsm-messages-read"));
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
      const label = r.area_name || r.outcode;
      const unread = room?.id === r.id && view === "chat" ? 0 : (p?.unread ?? 0);
      list.push({
        key: `local:${r.id}`,
        kind: "local",
        name: label,
        preview: p ? `${p.sender}: ${p.body}` : "No messages yet",
        ts: p?.created_at ?? new Date(0).toISOString(),
        unread,
        photo: r.image_url ?? null,
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

    for (const dm of instructorDMs) {
      const other = dm.instructor_a_id === userId ? dm.instructor_b : dm.instructor_a;
      if (!other) continue;
      list.push({
        key: `instructor:${dm.id}`,
        kind: "instructor",
        name: other.name ?? "Instructor",
        preview: dm.last_message ?? "New conversation",
        ts: dm.last_message_at ?? dm.created_at ?? new Date(0).toISOString(),
        unread: dmUnread[dm.id] ?? 0,
        photo: other.profile_image_url ?? null,
        initials: nameInitials(other.name ?? "Instructor"),
        bg: BLUE,
        badge: "DSM",
        open: () =>
          navigate({
            to: "/messages/instructor/$conversationId" as never,
            params: { conversationId: dm.id } as never,
          }),
        markRead: () => void markInstructorDmRead(dm.id),
      });
    }

    return list.map((i) => {
      const origMarkRead = i.markRead;
      return {
        ...i,
        unread: forcedUnread.has(i.key) ? Math.max(1, i.unread) : i.unread,
        open: () => {
          setForced(i.key, false);
          i.open();
        },
        markRead: () => {
          setForced(i.key, false);
          origMarkRead();
        },
      };
    });
  }, [
    forcedUnread,
    setForced,
    convos,
    joinedRooms,
    roomPreviews,
    adminThreads,
    isAdmin,
    room,
    view,
    navigate,
    instructorDMs,
    dmUnread,
    userId,
  ]);

  const visibleItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items
      .filter((i) => !archived.has(i.key))
      .filter((i) =>
        filter === "all" ? true : i.kind === filter.replace(/s$/, "") || i.kind === filter,
      )
      .filter((i) => !q || i.name.toLowerCase().includes(q) || i.preview.toLowerCase().includes(q))
      .sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime());
  }, [items, filter, query, archived]);

  const [menuItem, setMenuItem] = useState<InboxItem | null>(null);

  function toggleArchive(key: string) {
    setArchived((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      writeKeySet(ARCHIVE_KEY, next);
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

  function markUnread(item: InboxItem) {
    setForced(item.key, true);
    if (item.kind === "pupil") {
      const pupilId = item.key.split(":")[1];
      setConvos((prev) => prev.map((c) => (c.pupil_id === pupilId ? { ...c, read_at: null } : c)));
    } else if (item.kind === "local") {
      const roomId = item.key.split(":")[1];
      if (roomId) {
        localStorage.setItem(`local_chat_last_seen_${roomId}`, "0");
        setRoomPreviews((prev) => {
          if (!prev[roomId]) return prev;
          return { ...prev, [roomId]: { ...prev[roomId], unread: 1 } };
        });
      }
    } else if (item.kind === "admin") {
      const jobId = item.key.split(":")[1];
      setAdminThreads((prev) =>
        prev.map((t) => (t.job_offer_id === jobId ? { ...t, unread: true } : t)),
      );
    } else if (item.kind === "instructor") {
      const convoId = item.key.split(":")[1];
      if (convoId) setDmUnread((prev) => ({ ...prev, [convoId]: 1 }));
    }
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
    setJoinedCount((n) => n + 1);
    toast.success("Joined " + (r.area_name || r.outcode));
  }

  const router = useRouter();

  return (
    <PageLayout
      style={{
        ...FONT,
        position: "fixed",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
        background: NAVY,
        overflow: "hidden",
      }}
    >
      <header
        style={{
          height: "calc(max(env(safe-area-inset-top, 0px), 24px) + 86px)",
          flexShrink: 0,
          padding: "calc(max(env(safe-area-inset-top, 0px), 24px) + 13px) 22px 28px",
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          background: NAVY,
          boxSizing: "border-box",
        }}
      >
        <h1
          style={{
            margin: 0,
            color: tokens.white,
            fontFamily: "Sora, sans-serif",
            fontSize: tokens.fontSize.xxl,
            lineHeight: "40px",
            fontWeight: tokens.fontWeight.bold,
          }}
        >
          Messages
        </h1>
        <button
          type="button"
          aria-label="Notifications"
          onClick={() => navigate({ to: "/notifications" as never })}
          style={{
            width: 40,
            height: 40,
            borderRadius: "50%",
            border: 0,
            padding: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(255,255,255,0.1)",
            cursor: "pointer",
          }}
        >
          <IconBell size={20} color="#FFFFFF" stroke={1.8} />
        </button>
      </header>

      {view === "chat" ? (
        <div style={{ flex: 1, minHeight: 0, background: tokens.white }}>
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
        </div>
      ) : view === "rooms" ? (
        <div style={{ flex: 1, minHeight: 0, background: tokens.white }}>
          <RoomBrowser
            rooms={browseRooms}
            joinedRoomIds={joinedRoomIds}
            homeOutcode={homeOutcode}
            onBack={() => setView("inbox")}
            onOpen={openRoom}
            onJoin={joinRoom}
          />
        </div>
      ) : (
        <div
          {...pullToRefreshProps}
          style={{
            position: "relative",
            zIndex: 1,
            flex: 1,
            minHeight: 0,
            marginTop: -18,
            background: tokens.white,
            borderRadius: "28px 28px 0 0",
            overflowY: "auto",
            overflowX: "hidden",
            paddingTop: 12,
            paddingBottom: "calc(88px + env(safe-area-inset-bottom, 0px))",
          }}
        >
          {/* Segmented filter control + search */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "12px 16px",
              background: "transparent",
            }}
          >
            <div
              style={{
                display: "flex",
                flex: 1,
                background: CANVAS,
                borderRadius: 8,
                boxShadow: "0 3px 0 #E4E4E8",
                padding: 3,
                overflowX: "auto",
                scrollbarWidth: "none",
              }}
            >
              {(
                [
                  { key: "all", label: "All" },
                  { key: "pupils", label: "Pupils" },
                  { key: "local", label: "Local" },
                  { key: "admin", label: "Admin" },
                  { key: "instructors", label: "ADIs" },
                ] as const
              )
                .filter((f) => f.key !== "admin" || isAdmin)
                .map((f) => {
                  const active = filter === f.key;
                  return (
                    <button
                      key={f.key}
                      type="button"
                      onClick={() => setFilter(f.key as Filter)}
                      style={{
                        flex: 1,
                        flexShrink: 0,
                        textAlign: "center",
                        padding: "7px 12px",
                        fontSize: 12,
                        fontFamily: "Poppins, sans-serif",
                        cursor: "pointer",
                        border: "none",
                        outline: "none",
                        background: active ? "#0B1F3A" : "transparent",
                        color: active ? "#FFFFFF" : "#8A94A6",
                        borderRadius: active ? 8 : 0,
                        fontWeight: active ? 600 : 500,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {f.label}
                    </button>
                  );
                })}
            </div>
            <button
              type="button"
              aria-label="Search messages"
              onClick={() => setShowSearch((v) => !v)}
              style={{
                width: 32,
                height: 32,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                background: "none",
                border: 0,
                padding: 0,
                cursor: "pointer",
              }}
            >
              <IconSearch size={18} color="#6B7686" stroke={1.8} />
            </button>
            <button
              type="button"
              aria-label="New message"
              onClick={() => setSearchOpen(true)}
              style={{
                width: 28,
                height: 28,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                background: "#F1F5F9",
                border: 0,
                padding: 0,
                cursor: "pointer",
              }}
            >
              <IconEdit size={16} color={NAVY} stroke={1.8} />
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
                  borderRadius: 8,
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
                    fontSize: tokens.fontSize.md,
                    color: NAVY,
                    ...FONT,
                  }}
                />
                {query && (
                  <button
                    type="button"
                    aria-label="Clear search"
                    onClick={() => setQuery("")}
                    style={{
                      background: "none",
                      border: 0,
                      padding: 0,
                      cursor: "pointer",
                      display: "flex",
                    }}
                  >
                    <IconX stroke={1.5} size={15} color={GREY} />
                  </button>
                )}
              </div>
            </div>
          )}

          {filter === "local" && (
            <div style={{ padding: "0 16px 12px" }}>
              <button
                type="button"
                onClick={() => setView("rooms")}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  background: tokens.white,
                  border: `0.5px solid ${BORDER}`,
                  borderRadius: 8,
                  padding: "7px 14px",
                  fontSize: tokens.fontSize.base,
                  fontWeight: tokens.fontWeight.medium,
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
          <div style={{ padding: "0 16px" }}>
            {loading && items.length === 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: "0 0 12px" }}>
                {Array.from({ length: 5 }).map((_, i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "14px 16px",
                      background: tokens.white,
                      borderRadius: 8,
                      boxShadow: "0 4px 0 #E4E4E8",
                    }}
                  >
                    <DSMSkeleton width={44} height={44} borderRadius={22} />
                    <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 8 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                        <DSMSkeleton width="45%" height={14} borderRadius={6} />
                        <DSMSkeleton width={34} height={10} borderRadius={5} />
                      </div>
                      <DSMSkeleton width="80%" height={12} borderRadius={6} />
                      <DSMSkeleton width={44} height={20} borderRadius={10} />
                    </div>
                  </div>
                ))}
              </div>
            ) : visibleItems.length === 0 ? (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  textAlign: "center",
                  padding: "48px 24px",
                }}
              >
                <IconMessageCircle
                  size={48}
                  color="#D1D5DB"
                  stroke={1.5}
                  style={{ marginBottom: 12 }}
                />
                <div
                  style={{
                    fontSize: tokens.fontSize.lg,
                    fontWeight: tokens.fontWeight.semibold,
                    color: NAVY,
                    fontFamily: "Poppins, sans-serif",
                  }}
                >
                  No messages yet
                </div>
                <div
                  style={{
                    fontSize: tokens.fontSize.md,
                    color: "#8A94A6",
                    marginTop: 4,
                    lineHeight: 1.5,
                    maxWidth: 280,
                    fontFamily: "Poppins, sans-serif",
                  }}
                >
                  Messages from pupils and your local ADI community will appear here
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column" }}>
                {(() => {
                  const today: InboxItem[] = [];
                  const yesterday: InboxItem[] = [];
                  const earlier: InboxItem[] = [];
                  const now = new Date();
                  const yest = new Date(now);
                  yest.setDate(now.getDate() - 1);
                  for (const item of visibleItems) {
                    const d = new Date(item.ts);
                    if (d.toDateString() === now.toDateString()) today.push(item);
                    else if (d.toDateString() === yest.toDateString()) yesterday.push(item);
                    else earlier.push(item);
                  }
                  const sections = [
                    { label: "TODAY", items: today },
                    { label: "YESTERDAY", items: yesterday },
                    { label: "EARLIER", items: earlier },
                  ] as const;
                  return (
                    <>
                      {sections.map(
                        (s) =>
                          s.items.length > 0 && (
                            <div key={s.label}>
                              <div
                                style={{
                                  fontSize: tokens.fontSize.xs,
                                  fontWeight: tokens.fontWeight.semibold,
                                  textTransform: "uppercase",
                                  letterSpacing: "0.12em",
                                  color: "#8A94A6",
                                  margin: "16px 16px 8px",
                                  fontFamily: "Poppins, sans-serif",
                                }}
                              >
                                {s.label}
                              </div>
                              <div style={{ display: "flex", flexDirection: "column" }}>
                                {s.items.map((item) => (
                                  <InboxRow
                                    key={item.key}
                                    item={item}
                                    muted={muted.has(item.key)}
                                    onMenu={() => setMenuItem(item)}
                                  />
                                ))}
                              </div>
                            </div>
                          ),
                      )}
                    </>
                  );
                })()}
              </div>
            )}
          </div>
        </div>
      )}

      {menuItem && (
        <div
          onClick={() => setMenuItem(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.3)",
            zIndex: 120,
            display: "flex",
            alignItems: "flex-end",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: tokens.white,
              width: "100%",
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              padding: "8px 0 calc(8px + env(safe-area-inset-bottom, 0px))",
              fontFamily: "Poppins, sans-serif",
            }}
          >
            <div
              style={{
                width: 36,
                height: 4,
                borderRadius: 999,
                background: "#E5E7EB",
                margin: "8px auto 16px",
              }}
            />
            {(
              [
                {
                  label: "Archive",
                  icon: IconArchive,
                  color: "#5A6270",
                  run: () => toggleArchive(menuItem.key),
                },
                {
                  label: muted.has(menuItem.key) ? "Unmute notifications" : "Mute notifications",
                  icon: muted.has(menuItem.key) ? IconBell : IconBellOff,
                  color: "#5A6270",
                  run: () => toggleMute(menuItem.key),
                },
                {
                  label: "Mark as read",
                  icon: IconMail,
                  color: "#1C9950",
                  run: () => menuItem.markRead(),
                },
                {
                  label: "Mark as unread",
                  icon: IconMail,
                  color: tokens.blue,
                  bold: true,
                  run: () => markUnread(menuItem),
                },
              ] as {
                label: string;
                icon: typeof IconArchive;
                color: string;
                bold?: boolean;
                run: () => void;
              }[]
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
                  gap: 14,
                  width: "100%",
                  background: "none",
                  border: 0,
                  padding: "14px 20px",
                  fontSize: tokens.fontSize.md,
                  color: a.bold ? a.color : "#0B1F3A",
                  fontWeight: a.bold ? 600 : 500,
                  cursor: "pointer",
                  textAlign: "left",
                  borderBottom: "0.5px solid #F3F4F6",
                  fontFamily: "Poppins, sans-serif",
                }}
              >
                <a.icon size={20} color={a.color} stroke={1.8} />
                {a.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setMenuItem(null)}
              style={{
                display: "block",
                width: "100%",
                background: "none",
                border: 0,
                padding: "14px 20px",
                fontSize: tokens.fontSize.md,
                color: RED,
                fontWeight: tokens.fontWeight.semibold,
                cursor: "pointer",
                textAlign: "center",
                fontFamily: "Poppins, sans-serif",
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {searchOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: tokens.white,
            zIndex: 100,
            display: "flex",
            flexDirection: "column",
            paddingTop: "env(safe-area-inset-top, 0px)",
            ...FONT,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "14px 16px",
              borderBottom: `0.5px solid ${BORDER}`,
            }}
          >
            <div style={{ fontSize: tokens.fontSize.lg, fontWeight: tokens.fontWeight.semibold, color: NAVY }}>New message</div>
            <button
              type="button"
              aria-label="Close"
              onClick={() => {
                setSearchOpen(false);
                setSearchQuery("");
                setSearchResults([]);
              }}
              style={{
                background: "none",
                border: 0,
                padding: 0,
                cursor: "pointer",
                display: "flex",
              }}
            >
              <IconX stroke={1.5} size={20} color={GREY} />
            </button>
          </div>
          <div style={{ padding: "12px 16px" }}>
            <input
              autoFocus
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search instructors..."
              style={{
                width: "100%",
                boxSizing: "border-box",
                border: `1px solid ${BORDER}`,
                borderRadius: 8,
                outline: "none",
                padding: "10px 12px",
                fontSize: tokens.fontSize.md,
                color: NAVY,
                ...FONT,
              }}
            />
          </div>
          <div style={{ flex: 1, overflowY: "auto" }}>
            {searchResults.map((r) => (
              <div
                key={r.id}
                role="button"
                tabIndex={0}
                onClick={() => void startConversation(r.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "10px 16px",
                  borderBottom: `0.5px solid ${BORDER}`,
                  cursor: "pointer",
                }}
              >
                {r.profile_image_url ? (
                  <img
                    src={r.profile_image_url}
                    alt={r.name ?? "Instructor"}
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: "50%",
                      objectFit: "cover",
                      flexShrink: 0,
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: "50%",
                      background: BLUE,
                      color: tokens.white,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: tokens.fontSize.md,
                      fontWeight: tokens.fontWeight.semibold,
                      flexShrink: 0,
                    }}
                  >
                    {nameInitials(r.name ?? "Instructor")}
                  </div>
                )}
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: tokens.fontSize.md, fontWeight: tokens.fontWeight.semibold, color: NAVY }}>{r.name}</div>
                  {r.home_postcode && (
                    <div style={{ fontSize: 12, color: GREY, marginTop: 2 }}>{r.home_postcode}</div>
                  )}
                </div>
              </div>
            ))}
            {searchQuery.trim().length >= 2 && searchResults.length === 0 && (
              <div style={{ padding: "40px 24px", textAlign: "center", fontSize: tokens.fontSize.md, color: GREY }}>
                No instructors found
              </div>
            )}
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
  kind: "pupil" | "local" | "admin" | "instructor";
  badge?: string;
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
  muted,
  onMenu,
}: {
  item: InboxItem;
  muted: boolean;
  onMenu: () => void;
}) {
  const unread = item.unread > 0;

  const tag = (() => {
    switch (item.kind) {
      case "local":
        return { label: "Local", bg: "#EAF7EE", color: "#1C9950" };
      case "admin":
        return { label: "Admin", bg: "#EDEBFB", color: "#5B3FD9" };
      case "instructor":
        return { label: "DSM", bg: "#E7F0FD", color: tokens.blue };
      case "pupil":
      default:
        return { label: "Pupil", bg: "#E7F0FD", color: tokens.blue };
    }
  })();

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => { tapLight(); item.open(); }}
      onTouchStart={(e) => {
        e.currentTarget.style.transform = "scale(0.98)";
        e.currentTarget.style.opacity = "0.9";
      }}
      onTouchEnd={(e) => {
        e.currentTarget.style.transform = "scale(1)";
        e.currentTarget.style.opacity = "1";
      }}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "14px 16px",
        background: "#fff",
        borderRadius: 16,
        boxShadow: "0 1px 3px rgba(11,31,58,0.06)",
        marginBottom: 8,
        cursor: "pointer",
        borderLeft: unread ? "3px solid #1877D6" : "3px solid transparent",
        WebkitTapHighlightColor: "transparent",
        transition: "transform 0.1s ease, opacity 0.1s ease",
      }}
    >
      {/* Avatar */}
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: "50%",
          flexShrink: 0,
          overflow: "hidden",
          background: item.bg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: tokens.white,
          fontSize: tokens.fontSize.lg,
          fontWeight: tokens.fontWeight.bold,
        }}
      >
        {item.photo ? (
          <img
            src={item.photo}
            alt={item.name}
            style={{ width: 44, height: 44, objectFit: "cover" }}
          />
        ) : item.system ? (
          <IconSpeakerphone size={22} color="#FFFFFF" stroke={1.8} />
        ) : (
          item.initials
        )}
      </div>

      {/* Centre */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
            minWidth: 0,
          }}
        >
          <div
            style={{
              fontSize: tokens.fontSize.md,
              fontWeight: unread ? 700 : 500,
              color: NAVY,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              fontFamily: "Poppins, sans-serif",
            }}
          >
            {item.name}
          </div>
          <div
            style={{
              fontSize: tokens.fontSize.sm,
              fontWeight: unread ? 700 : 500,
              color: unread ? BLUE : "#8A94A6",
              flexShrink: 0,
              fontFamily: "Poppins, sans-serif",
            }}
          >
            {item.ts && new Date(item.ts).getTime() > 0 ? formatStamp(item.ts) : ""}
          </div>
        </div>
        <div
          style={{
            fontSize: tokens.fontSize.base,
            color: "#5A6270",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            fontFamily: "Poppins, sans-serif",
          }}
        >
          {item.preview}
        </div>
        <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
          <span
            style={{
              borderRadius: 8,
              fontSize: tokens.fontSize.xs,
              fontWeight: tokens.fontWeight.semibold,
              padding: "2px 8px",
              fontFamily: "Poppins, sans-serif",
              background: tag.bg,
              color: tag.color,
            }}
          >
            {tag.label}
          </span>
        </div>
      </div>

      {/* Right */}
      <div style={{ display: "flex", alignItems: "center", flexShrink: 0, gap: 8 }}>
        {unread && (
          <span
            style={{
              width: 7,
              height: 7,
              borderRadius: "50%",
              background: tokens.blue,
              flexShrink: 0,
            }}
          />
        )}
        <button
          type="button"
          aria-label="Message options"
          onClick={(e) => {
            e.stopPropagation();
            onMenu();
          }}
          style={{
            background: "none",
            border: 0,
            padding: 4,
            cursor: "pointer",
            display: "flex",
            flexShrink: 0,
          }}
        >
          <IconDots size={18} color="#8A94A6" stroke={1.8} />
        </button>
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

  const { mine, available, results, searching } = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const match = (r: LocalChatRoom) =>
      !needle ||
      (r.area_name || "").toLowerCase().includes(needle) ||
      (r.outcode || "").toLowerCase().includes(needle) ||
      (r.description || "").toLowerCase().includes(needle);
    // Hide invite-only rooms the user hasn't joined
    const visible = rooms.filter((r) => (!r.is_opt_in || joinedRoomIds.has(r.id)) && match(r));
    return {
      searching: needle.length > 0,
      results: visible,
      mine: visible.filter((r) => joinedRoomIds.has(r.id) || r.outcode === homeOutcode),
      available: visible.filter(
        (r) => !joinedRoomIds.has(r.id) && r.outcode !== homeOutcode && !r.is_opt_in,
      ),
    };
  }, [rooms, q, joinedRoomIds, homeOutcode]);

  const RoomRow = ({ r, join }: { r: LocalChatRoom; join: boolean }) => (
    <div
      onClick={() => { tapLight(); join ? onJoin(r) : onOpen(r); }}
      onTouchStart={(e) => {
        e.currentTarget.style.transform = "scale(0.98)";
        e.currentTarget.style.opacity = "0.9";
      }}
      onTouchEnd={(e) => {
        e.currentTarget.style.transform = "scale(1)";
        e.currentTarget.style.opacity = "1";
      }}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "14px 16px",
        cursor: "pointer",
        background: "#fff",
        borderRadius: 16,
        boxShadow: "0 1px 3px rgba(11,31,58,0.06)",
        marginBottom: 8,
        transition: "transform 0.1s ease, opacity 0.1s ease",
      }}
    >
      {r.image_url ? (
        <img
          src={r.image_url}
          alt={r.area_name || r.outcode}
          style={{ width: 56, height: 56, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
        />
      ) : (
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: "50%",
            background: NAVY,
            color: tokens.white,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: tokens.fontSize.xl,
            fontWeight: tokens.fontWeight.medium,
            flexShrink: 0,
          }}
        >
          {nameInitials(r.area_name || r.outcode)}
        </div>
      )}

      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: tokens.fontSize.lg,
            fontWeight: tokens.fontWeight.medium,
            color: NAVY,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {r.area_name || r.outcode}
        </div>
        <div
          style={{
            fontSize: tokens.fontSize.md,
            color: GREY,
            marginTop: 2,
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <span>
            {r.instructor_count ?? 1} member{(r.instructor_count ?? 1) === 1 ? "" : "s"} ·{" "}
            {r.outcode}
          </span>
          {joinedRoomIds.has(r.id) && (
            <span style={{ fontSize: tokens.fontSize.sm, fontWeight: tokens.fontWeight.semibold, color: BLUE }}>Joined</span>
          )}
          {r.is_opt_in && (
            <span style={{ fontSize: tokens.fontSize.sm, fontWeight: tokens.fontWeight.semibold, color: "#7C3AED" }}>Private</span>
          )}
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
    <div style={{ background: tokens.white, minHeight: "60vh" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 16px 4px" }}>
        <button
          type="button"
          aria-label="Back"
          onClick={onBack}
          style={{ background: "none", border: 0, padding: 0, cursor: "pointer", display: "flex" }}
        >
          <IconChevronLeft size={22} color={NAVY} stroke={1.8} />
        </button>
        <div style={{ fontSize: tokens.fontSize.xxl, fontWeight: tokens.fontWeight.medium, color: NAVY }}>Find rooms</div>
      </div>

      <div style={{ padding: "8px 16px 12px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: CANVAS,
            borderRadius: 8,
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
              fontSize: tokens.fontSize.md,
              color: NAVY,
              ...FONT,
            }}
          />
        </div>
      </div>

      {(searching
        ? ([["Results", results, null]] as [string, LocalChatRoom[], boolean | null][])
        : ([
            ["Your rooms", mine, false],
            ["Available rooms", available, true],
          ] as [string, LocalChatRoom[], boolean | null][])
      ).map(([label, list, join]) => (
        <div key={label}>
          <div
            style={{
              padding: "12px 16px 6px",
              fontSize: 12,
              fontWeight: tokens.fontWeight.semibold,
              letterSpacing: 0.6,
              textTransform: "uppercase",
              color: GREY,
            }}
          >
            {label}
          </div>
          {list.length === 0 ? (
            <div style={{ padding: "8px 16px 12px", fontSize: tokens.fontSize.base, color: GREY }}>
              {searching ? "No rooms match your search" : "None"}
            </div>
          ) : (
            list.map((r) => (
              <RoomRow key={r.id} r={r} join={join === null ? !joinedRoomIds.has(r.id) : join} />
            ))
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
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "calc(100vh - 60px - 45px - 64px)",
      }}
    >
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
          <div style={{ fontSize: tokens.fontSize.base, fontWeight: tokens.fontWeight.semibold, color: tokens.navy }}>{areaName} ▾</div>
          <div style={{ fontSize: tokens.fontSize.sm, color: tokens.textMuted }}>
            {room?.instructor_count ?? 1} members
          </div>
        </button>
        <button
          type="button"
          aria-label="Search rooms"
          onClick={() => setRoomSelectorOpen((v) => !v)}
          style={{ background: "none", border: 0, padding: 4, cursor: "pointer", display: "flex" }}
        >
          <IconSearch stroke={1.5} size={18} color={roomSelectorOpen ? "#1877D6" : "#9CA3AF"} />
        </button>
        {roomSelectorOpen && (
          <div
            style={{
              position: "absolute",
              top: 48,
              left: 16,
              right: 16,
              zIndex: 41,
              background: tokens.white,
              borderRadius: 8,
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
              <IconSearch stroke={1.5} size={15} color="#8A93A3" />
              <input
                value={roomSearch}
                onChange={(e) => setRoomSearch(e.target.value)}
                placeholder="Search rooms..."
                autoFocus
                style={{
                  flex: 1,
                  border: 0,
                  outline: "none",
                  fontSize: tokens.fontSize.base,
                  color: tokens.navy,
                  background: "transparent",
                  ...FONT,
                }}
              />
              {roomSearch && (
                <button
                  type="button"
                  aria-label="Clear room search"
                  onClick={() => setRoomSearch("")}
                  style={{
                    background: "none",
                    border: 0,
                    padding: 0,
                    cursor: "pointer",
                    display: "flex",
                  }}
                >
                  <IconX stroke={1.5} size={14} color="#8A93A3" />
                </button>
              )}
            </div>
            <div style={{ overflowY: "auto" }}>
              {totalRooms === 0 ? (
                <div style={{ padding: "12px 14px", fontSize: 12, color: tokens.textMuted }}>
                  No rooms found
                </div>
              ) : (
                (
                  [
                    ["Your rooms", joinedRooms],
                    ["All rooms", otherRooms],
                  ] as [string, LocalChatRoom[]][]
                ).map(([label, list]) =>
                  list.length === 0 ? null : (
                    <div key={label}>
                      <div
                        style={{
                          padding: "8px 14px 4px",
                          fontSize: tokens.fontSize.xs,
                          fontWeight: tokens.fontWeight.bold,
                          letterSpacing: 0.6,
                          textTransform: "uppercase",
                          color: tokens.textMuted,
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
                            fontSize: tokens.fontSize.base,
                            color: tokens.navy,
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
                            <span style={{ color: tokens.textMuted, fontSize: tokens.fontSize.sm, marginLeft: 6 }}>
                              {r.outcode}
                            </span>
                          </span>
                          {r.is_opt_in && (
                            <span
                              style={{
                                background: "#F1F3F7",
                                color: "#6B7280",
                                fontSize: tokens.fontSize.xs,
                                fontWeight: tokens.fontWeight.bold,
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
          background: tokens.white,
        }}
      >
        {loading ? (
          <div style={{ padding: 40, textAlign: "center", color: tokens.textMuted, fontSize: 13 }}>
            Loading…
          </div>
        ) : messages.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center" }}>
            <div style={{ fontSize: tokens.fontSize.md, fontWeight: tokens.fontWeight.semibold, color: "#6B7280" }}>
              Be the first to chat in {areaName}!
            </div>
            <div style={{ fontSize: 12, color: tokens.textMuted, marginTop: 4 }}>
              Connect with local instructors, share tips
            </div>
          </div>
        ) : (
          messages.map((msg, i) => {
            const mine = msg.instructor_id === userId;
            const prev = messages[i - 1];
            const showDate =
              !prev ||
              new Date(prev.created_at).toDateString() !== new Date(msg.created_at).toDateString();
            const time = new Date(msg.created_at).toLocaleTimeString("en-GB", {
              hour: "2-digit",
              minute: "2-digit",
            });
            return (
              <div key={msg.id} style={{ display: "flex", flexDirection: "column" }}>
                {showDate && (
                  <div
                    style={{
                      fontSize: tokens.fontSize.sm,
                      color: tokens.textMuted,
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
                          background: tokens.navy,
                          color: tokens.white,
                          borderRadius: "8px 8px 8px 8px",
                          padding: "10px 14px",
                          fontSize: tokens.fontSize.base,
                          lineHeight: 1.35,
                          wordBreak: "break-word",
                        }}
                      >
                        {highlight(msg.message)}
                      </div>
                      <div
                        style={{ fontSize: tokens.fontSize.xs, color: tokens.textMuted, textAlign: "right", marginTop: 2 }}
                      >
                        {time}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: "flex", justifyContent: "flex-start", gap: 8 }}>
                    {msg.instructors?.profile_image_url ? (
                      <img
                        src={msg.instructors.profile_image_url}
                        alt={msg.instructors?.name ?? "ADI"}
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: "50%",
                          objectFit: "cover",
                          flexShrink: 0,
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: "50%",
                          background: "#1A52A0",
                          color: tokens.white,
                          fontWeight: tokens.fontWeight.bold,
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
                      <div
                        style={{ fontSize: tokens.fontSize.xs, color: tokens.textMuted, fontWeight: tokens.fontWeight.semibold, marginBottom: 2 }}
                      >
                        {firstName(msg.instructors?.name)}
                      </div>
                      <div
                        style={{
                          background: tokens.white,
                          border: "0.5px solid #E2E6ED",
                          borderRadius: "8px 8px 8px 8px",
                          padding: "10px 14px",
                          fontSize: tokens.fontSize.base,
                          lineHeight: 1.35,
                          color: tokens.navy,
                          wordBreak: "break-word",
                        }}
                      >
                        {highlight(msg.message)}
                      </div>
                      <div style={{ display: "flex", gap: 8, marginTop: 2, alignItems: "center" }}>
                        <span style={{ fontSize: tokens.fontSize.xs, color: tokens.textMuted }}>{time}</span>
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
                          <IconFlag stroke={1.5} size={11} color="#D1D5DB" />
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
          background: tokens.white,
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
            color: tokens.white,
            fontWeight: tokens.fontWeight.bold,
            fontSize: tokens.fontSize.sm,
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
          placeholder={`Message ${areaName}...`}
          style={{
            flex: 1,
            background: "#F7FAFC",
            border: "0.5px solid #E2E6ED",
            borderRadius: 8,
            padding: "10px 14px",
            fontSize: tokens.fontSize.base,
            outline: "none",
            color: tokens.navy,
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
            color: tokens.white,
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
          <IconSend stroke={1.5} size={16} color="#FFFFFF" />
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
    tapMedium();
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
            <div style={{ fontSize: tokens.fontSize.lg, fontWeight: tokens.fontWeight.bold, color: tokens.navy }}>Job thread</div>
            <div style={{ fontSize: tokens.fontSize.sm, color: "#8A93A3" }}>{jobLabel || "…"}</div>
          </div>
          <button
            onClick={onClose}
            style={{ padding: 6, background: "transparent", border: "none", cursor: "pointer" }}
            aria-label="Close"
          >
            <IconX stroke={1.5} size={20} color="#8A93A3" />
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
            <div style={{ color: "#8A93A3", fontSize: tokens.fontSize.base, textAlign: "center", padding: 20 }}>
              Loading…
            </div>
          ) : messages.length === 0 ? (
            <div style={{ color: "#8A93A3", fontSize: tokens.fontSize.base, textAlign: "center", padding: 20 }}>
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
                      borderRadius: 8,
                      padding: "8px 12px",
                      fontSize: tokens.fontSize.md,
                      boxShadow: mine ? "none" : "0 1px 2px rgba(0,0,0,0.05)",
                    }}
                  >
                    <div
                      style={{
                        fontSize: tokens.fontSize.xs,
                        opacity: 0.7,
                        marginBottom: 2,
                        textTransform: "uppercase",
                        letterSpacing: 0.3,
                      }}
                    >
                      {m.sender_type}
                    </div>
                    <div style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                      {m.message}
                    </div>
                    <div style={{ fontSize: tokens.fontSize.xs, opacity: 0.7, marginTop: 2, textAlign: "right" }}>
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
              borderRadius: 8,
              padding: "10px 14px",
              fontSize: tokens.fontSize.lg,
              outline: "none",
              ...FONT,
            }}
          />
          <button
            onClick={send}
            disabled={!draft.trim() || sending}
            style={{
              background: tokens.blue,
              color: "#fff",
              border: "none",
              borderRadius: 8,
              width: 40,
              height: 40,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: draft.trim() ? "pointer" : "not-allowed",
              opacity: draft.trim() ? 1 : 0.5,
            }}
          >
            <IconSend stroke={1.5} size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

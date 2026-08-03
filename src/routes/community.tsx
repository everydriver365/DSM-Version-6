import { createFileRoute, useNavigate } from "@tanstack/react-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { reverseGeocode } from "@/lib/geocode.functions";
import { IconBell, IconBellOff, IconSearch } from "@tabler/icons-react";


import {
  ArrowLeft,
  Plus,
  X,
  Send,
  Flag,
  ThumbsUp,
  MapPin,
  ChevronDown,
  AlertTriangle,
  Car,
  Building2 as Building,
  Clock,
  Info,
  GraduationCap,
  MessageSquare,
  MessageCircle,
  LayoutGrid,
  Search,
  Users,

} from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { BottomSheet } from "@/components/dsm/BottomSheetV2";

function commentTimeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const COMMENT_COLOURS = ["#7B4FC9", "#1877D6", "#0C8577", "#C4501E", "#3B6D11"];
function commentColour(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return COMMENT_COLOURS[Math.abs(h) % COMMENT_COLOURS.length];
}
function commentInitials(name: string | null | undefined): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length > 1) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return parts[0].slice(0, 2).toUpperCase();
}

export const Route = createFileRoute("/community")({
  validateSearch: (search: Record<string, unknown>): { tab?: string } => {
    const t = search.tab;
    return typeof t === "string" ? { tab: t } : {};
  },
  head: () => ({
    meta: [
      { title: "Community — DSM" },
      { name: "description", content: "Local alerts and chat for ADIs in your area." },
    ],
  }),
  component: CommunityPage,
});

type Alert = {
  id: string;
  instructor_id: string;
  alert_type: string;
  description: string;
  location_name: string | null;
  area: string | null;
  outcode: string | null;
  upvotes: number;
  upvoted_by: string[] | null;
  is_active: boolean;
  expires_at: string;
  created_at: string;
  source?: 'manual' | 'tomtom';
  instructors?: { name: string | null } | null;
};

type AlertComment = {
  id: string;
  body: string;
  created_at: string;
  instructor_id: string;
  instructors: { name: string | null } | null;
};

type ChatRoom = { id: string; area_name: string; outcode: string; instructor_count?: number };
type ChatMessage = {
  id: string;
  room_id: string;
  instructor_id: string;
  message: string;
  created_at: string;
  is_flagged: boolean | null;
  flagged_by: string[] | null;
  deleted_at: string | null;
  instructors: { name: string | null; profile_image_url: string | null } | null;
};

const TYPE_CONFIG: Record<string, { label: string; bg: string; colour: string; Icon: any }> = {
  roadworks:         { label: "Roadworks",     bg: "#FEF3C7", colour: "#D97706", Icon: Car },
  road_closure:      { label: "Road closure",  bg: "#FEF3C7", colour: "#D97706", Icon: AlertTriangle },
  heavy_traffic:     { label: "Heavy traffic", bg: "#FEF3C7", colour: "#D97706", Icon: Car },
  hazard:            { label: "Hazard",        bg: "#FCEBEB", colour: "#A32D2D", Icon: AlertTriangle },
  test_centre_busy:  { label: "TC busy",       bg: "#FCEBEB", colour: "#A32D2D", Icon: Building },
  test_centre_delay: { label: "TC delay",      bg: "#FCEBEB", colour: "#A32D2D", Icon: Clock },
  examiner_tip:      { label: "Examiner tip",  bg: "#F5F3FF", colour: "#6B4FD6", Icon: GraduationCap },
  other:             { label: "Other",         bg: "#F3F4F6", colour: "#6B7280", Icon: Info },
};

const TYPE_ORDER = [
  "roadworks", "road_closure",
  "heavy_traffic", "hazard",
  "test_centre_busy", "test_centre_delay",
  "examiner_tip", "other",
];

function minutesUntilMidnight(): number {
  const now = new Date();
  const midnight = new Date();
  midnight.setHours(23, 59, 59, 0);
  return Math.max(1, Math.floor((midnight.getTime() - now.getTime()) / 60000));
}

function formatCountdown(expires: string): string {
  const diff = new Date(expires).getTime() - Date.now();
  if (diff <= 0) return "expired";
  const totalMins = Math.floor(diff / 60000);
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  if (h > 0) return `expires in ${h}h ${m}m`;
  return `expires in ${m}m`;
}

function firstName(name: string | null | undefined): string {
  if (!name) return "Someone";
  return name.trim().split(/\s+/)[0] || "Someone";
}

// -------------------- Google Maps (browser key) --------------------
const GMAPS_BROWSER_KEY = import.meta.env
  .VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY as string | undefined;
const GMAPS_SCRIPT_ID = "google-maps-js-script";

type GMapsWindow = Window & { google?: any };

function loadGoogleMaps(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  const w = window as GMapsWindow;
  if (w.google?.maps?.geometry) return Promise.resolve();
  const existing = document.getElementById(GMAPS_SCRIPT_ID) as HTMLScriptElement | null;
  if (existing) {
    return new Promise((resolve) => {
      const iv = setInterval(() => {
        if ((window as GMapsWindow).google?.maps?.geometry) {
          clearInterval(iv);
          resolve();
        }
      }, 150);
    });
  }
  return new Promise((resolve, reject) => {
    if (!GMAPS_BROWSER_KEY) { reject(new Error("Missing Google Maps browser key")); return; }
    const s = document.createElement("script");
    s.id = GMAPS_SCRIPT_ID;
    s.async = true;
    s.defer = true;
    s.src = `https://maps.googleapis.com/maps/api/js?key=${GMAPS_BROWSER_KEY}&libraries=geometry,places&loading=async`;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Failed to load Google Maps JS"));
    document.head.appendChild(s);
  });
}

function AlertSignIcon({ type, size = 28 }: { type: string; size?: number }) {
  const warning = (children: React.ReactNode) => (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      style={{ display: "block", filter: "drop-shadow(0 1px 1px rgba(0,0,0,0.08))" }}
    >
      <path
        d="M12 3 L21 20 H3 Z"
        fill="white"
        stroke="#C8102E"
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {children}
    </svg>
  );

  switch (type) {
    case "roadworks":
      return warning(
        <g fill="black">
          <rect x="11" y="8" width="2" height="5" rx="0.5" />
          <path d="M9 13 h6 l-1 4 h-4 z" />
        </g>
      );
    case "road_closure":
      return warning(<rect x="5" y="12" width="14" height="3" rx="0.5" fill="black" />);
    case "heavy_traffic":
      return warning(
        <g fill="black">
          <rect x="5" y="9" width="14" height="2" rx="0.5" />
          <rect x="6" y="12" width="12" height="2" rx="0.5" />
          <rect x="5" y="15" width="14" height="2" rx="0.5" />
        </g>
      );
    case "hazard":
    case "test_centre_busy":
      return warning(
        <g fill="black">
          <rect x="11" y="8" width="2" height="8" rx="0.5" />
          <circle cx="12" cy="18" r="1.5" />
        </g>
      );
    case "test_centre_delay":
      return warning(
        <g fill="none" stroke="black" strokeWidth="1.5" strokeLinecap="round">
          <circle cx="12" cy="13" r="4.5" />
          <path d="M12 9.5 V13 L14 14.5" />
        </g>
      );
    case "examiner_tip":
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          style={{ display: "block", filter: "drop-shadow(0 1px 1px rgba(0,0,0,0.08))" }}
        >
          <rect x="3" y="3" width="18" height="18" rx="2" fill="#005EB8" />
          <rect x="11" y="7" width="2" height="2" rx="0.5" fill="white" />
          <rect x="11" y="11" width="2" height="8" rx="0.5" fill="white" />
        </svg>
      );
    default:
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          style={{ display: "block", filter: "drop-shadow(0 1px 1px rgba(0,0,0,0.08))" }}
        >
          <circle cx="12" cy="12" r="10" fill="#9CA3AF" />
          <text
            x="12"
            y="16"
            textAnchor="middle"
            fill="white"
            fontSize="11"
            fontWeight="700"
            fontFamily="Inter, system-ui, sans-serif"
          >
            ?
          </text>
        </svg>
      );
  }
}

function CommunityPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const [activeTab, setActiveTab] = useState<"alerts" | "local" | "rooms" | "uk">("alerts");
  const [userId, setUserId] = useState<string | null>(null);
  const [instructorFirstName, setInstructorFirstNameState] = useState<string>("");
  const [instructorArea, setInstructorArea] = useState<string>("Your area");
  const [instructorOutcode, setInstructorOutcode] = useState<string | null>(null);
  const [coverageOutcodes, setCoverageOutcodes] = useState<string[]>([]);
  const [instructorProfile, setInstructorProfile] = useState<{ name: string | null; profile_image_url: string | null } | null>(null);
  const [unread, setUnread] = useState<{ local: number; uk: number }>({ local: 0, uk: 0 });
  const [selectedRoom, setSelectedRoom] = useState<{ outcode: string; area_name: string } | null>(null);

  useEffect(() => {
    if (search?.tab === "local") setActiveTab("local");
    else if (search?.tab === "uk") setActiveTab("uk");
    else if (search?.tab === "rooms") setActiveTab("rooms");
  }, []);

  // Unread counts per subscribed room
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    (async () => {
      const { data: subs } = await supabase
        .from("chat_room_subscriptions")
        .select("room_id, last_read_at, muted_until")
        .eq("instructor_id", userId);
      if (cancelled || !subs?.length) return;
      const roomIds = (subs as any[]).map((s) => s.room_id);
      const { data: rooms } = await supabase
        .from("local_chat_rooms")
        .select("id, outcode")
        .in("id", roomIds);
      if (cancelled) return;
      const next = { local: 0, uk: 0 };
      for (const s of subs as any[]) {
        const roomOutcode = (rooms as any[] | null)?.find((r) => r.id === s.room_id)?.outcode;
        const key: "local" | "uk" = roomOutcode === "UK" ? "uk" : "local";
        const { count } = await supabase
          .from("local_chat_messages")
          .select("id", { count: "exact", head: true })
          .eq("room_id", s.room_id)
          .neq("instructor_id", userId)
          .gt("created_at", s.last_read_at ?? new Date(0).toISOString());
        next[key] += count ?? 0;
      }
      if (!cancelled) setUnread(next);
    })();
    return () => { cancelled = true; };
  }, [userId]);


  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      const u = data.user;
      if (!u) return;
      setUserId(u.id);
      const { data: instructor } = await supabase
        .from("instructors")
        .select("name, profile_image_url, home_postcode, city")
        .eq("id", u.id)
        .maybeSingle();
      const outcode = (instructor as any)?.home_postcode?.substring(0, 4)?.trim()?.toUpperCase() ?? null;
      const area = (instructor as any)?.city || outcode || "Your area";
      console.log("[community] instructor fetch:", { area, outcode, instructor });
      setInstructorArea(area);
      setInstructorOutcode(outcode);
      setInstructorFirstNameState(firstName((instructor as any)?.name));
      setInstructorProfile({
        name: (instructor as any)?.name ?? null,
        profile_image_url: (instructor as any)?.profile_image_url ?? null,
      });

      // Coverage areas — alerts should span every area the instructor works, not just home
      const { data: coverageAreas } = await supabase
        .from("instructor_coverage_areas")
        .select("postcode_outcodes, centre_lat, centre_lng")
        .eq("instructor_id", u.id);
      const outcodesFromCoverage = ((coverageAreas ?? []) as any[])
        .flatMap((a) => a.postcode_outcodes ?? [])
        .map((o: string) => o.trim().toUpperCase())
        .filter(Boolean);
      // Home outcode always included as a fallback, even when coverage areas exist.
      const allOutcodes = Array.from(new Set([outcode, ...outcodesFromCoverage].filter(Boolean))) as string[];
      setCoverageOutcodes(allOutcodes);
    })();
  }, []);

  return (
    <div style={{ background: "#F7FAFC", minHeight: "100vh", paddingBottom: 80, fontFamily: "Inter, sans-serif" }}>
      {/* TOP BAR */}
      <div style={{
        background: "#0F2044", padding: "16px", display: "flex",
        alignItems: "center", justifyContent: "space-between", color: "white",
      }}>
        <button
          type="button"
          onClick={() => navigate({ to: "/home" as never })}
          aria-label="Back"
          style={{ background: "none", border: "none", color: "white", cursor: "pointer", display: "flex" }}
        >
          <ArrowLeft size={22} />
        </button>
        <div style={{ fontWeight: 700, fontSize: 18 }}>Community</div>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>{" "}</div>
      </div>

      {/* TABS */}
      <div style={{
        background: "white", borderBottom: "0.5px solid #E2E6ED",
        display: "flex", position: "sticky", top: 0, zIndex: 10,
      }}>
        {([
          { id: "alerts", label: "Alerts" },
          { id: "local", label: "Local" },
          { id: "rooms", label: "Rooms" },
          { id: "uk", label: "UK Chat" },
        ] as const).map((t) => {
          const active = activeTab === t.id;
          const badge = t.id === "local" ? unread.local : t.id === "uk" ? unread.uk : 0;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id)}
              style={{
                flex: 1, padding: "10px", textAlign: "center", fontSize: 11,
                fontWeight: 600, background: "none", border: "none", cursor: "pointer",
                borderBottom: active ? "2px solid #185FA5" : "2px solid transparent",
                color: active ? "#185FA5" : "#8A93A3",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              }}
            >
              {t.id === "rooms" && <LayoutGrid size={14} />}
              {t.label}
              {badge > 0 && (
                <span style={{
                  background: "#1877D6", color: "white", fontSize: 10, fontWeight: 700,
                  borderRadius: 999, padding: "1px 6px", minWidth: 18, lineHeight: "16px",
                }}>
                  {badge > 99 ? "99+" : badge}
                </span>
              )}
            </button>
          );
        })}

      </div>

      {activeTab === "alerts" && (
        <AlertsTab
          userId={userId}
          instructorFirstName={instructorFirstName}
          instructorArea={instructorArea}
          instructorOutcode={instructorOutcode}
          coverageOutcodes={coverageOutcodes}
        />
      )}
      {activeTab === "local" && (
        <ChatTab
          key={selectedRoom ? `room-${selectedRoom.outcode}` : "local"}
          scope="local"
          userId={userId}
          instructorProfile={instructorProfile}
          instructorArea={selectedRoom ? selectedRoom.area_name : instructorArea}
          instructorOutcode={selectedRoom ? selectedRoom.outcode : instructorOutcode}
          onRoomRead={(s) => setUnread((u) => ({ ...u, [s]: 0 }))}
        />
      )}
      {activeTab === "rooms" && (
        <RoomsTab
          userId={userId}
          instructorOutcode={instructorOutcode}
          onOpenRoom={(room) => {
            if (room.outcode === "UK") {
              setSelectedRoom(null);
              setActiveTab("uk");
            } else {
              setSelectedRoom(
                room.outcode === instructorOutcode
                  ? null
                  : { outcode: room.outcode, area_name: room.area_name ?? room.outcode }
              );
              setActiveTab("local");
            }
          }}
        />
      )}
      {activeTab === "uk" && (
        <ChatTab
          key="uk"
          scope="uk"
          userId={userId}
          instructorProfile={instructorProfile}
          instructorArea="All UK"
          instructorOutcode="UK"
          onRoomRead={(s) => setUnread((u) => ({ ...u, [s]: 0 }))}
        />
      )}

    </div>
  );
}

/* ============================================================ ROOMS TAB */

type BrowseRoom = {
  id: string;
  outcode: string;
  area_name: string | null;
  instructor_count: number | null;
  room_type: string | null;
  is_opt_in: boolean | null;
  image_url?: string | null;
  description?: string | null;
};

function RoomsTab({
  userId, instructorOutcode, onOpenRoom,
}: {
  userId: string | null;
  instructorOutcode: string | null;
  onOpenRoom: (room: BrowseRoom) => void;
}) {
  const [rooms, setRooms] = useState<BrowseRoom[]>([]);
  const [subscribedIds, setSubscribedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [joiningId, setJoiningId] = useState<string | null>(null);

  async function loadSubs() {
    if (!userId) return;
    const { data: mySubs } = await supabase
      .from("chat_room_subscriptions")
      .select("room_id")
      .eq("instructor_id", userId);
    setSubscribedIds(new Set(((mySubs ?? []) as any[]).map((s) => s.room_id)));
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data: allRooms } = await supabase
        .from("local_chat_rooms")
        .select("id, outcode, area_name, instructor_count, room_type, is_opt_in, image_url, description")
        .order("instructor_count", { ascending: false });
      if (cancelled) return;
      setRooms((allRooms ?? []) as BrowseRoom[]);
      await loadSubs();
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const myRooms = useMemo(
    () => rooms.filter((r) =>
      subscribedIds.has(r.id)
      || (!r.is_opt_in && (r.outcode === instructorOutcode || r.outcode === "UK"))),
    [rooms, subscribedIds, instructorOutcode]
  );
  const availableRooms = useMemo(() => {
    const mine = new Set(myRooms.map((r) => r.id));
    const q = query.trim().toLowerCase();
    return rooms
      .filter((r) => !mine.has(r.id))
      .filter((r) => !r.is_opt_in)
      .filter((r) => !q
        || (r.area_name ?? "").toLowerCase().includes(q)
        || r.outcode.toLowerCase().includes(q));
  }, [rooms, myRooms, query]);

  async function join(room: BrowseRoom) {
    if (!userId) return;
    setJoiningId(room.id);
    const { error } = await supabase.from("chat_room_subscriptions").insert({
      instructor_id: userId,
      room_id: room.id,
      last_read_at: new Date().toISOString(),
    });
    setJoiningId(null);
    if (error) {
      toast.error("Could not join room");
      return;
    }
    toast.success("Joined " + (room.area_name ?? room.outcode));
    await loadSubs();
    onOpenRoom(room);
  }

  const rowStyle: React.CSSProperties = {
    background: "white", border: "0.5px solid #E2E6ED", borderRadius: 12,
    padding: "12px 14px", display: "flex", alignItems: "center", gap: 10,
  };

  function RoomRow({ room, action }: { room: BrowseRoom; action: React.ReactNode }) {
    return (
      <div style={rowStyle}>
        {room.image_url ? (
          <img
            src={room.image_url}
            alt=""
            style={{ width: 52, height: 52, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
          />
        ) : (
          <div
            style={{
              width: 52, height: 52, borderRadius: "50%", background: "#0B1F3A", color: "white",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 17, fontWeight: 700, flexShrink: 0,
            }}
          >
            {(room.area_name || room.outcode).trim().charAt(0).toUpperCase()}
          </div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#0F2044", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {room.area_name || room.outcode}
            </div>
            <span style={{
              background: "#EAF2FC", color: "#1877D6", fontSize: 10, fontWeight: 700,
              borderRadius: 999, padding: "2px 8px", flexShrink: 0,
            }}>
              {room.outcode}
            </span>
            {room.is_opt_in && (
              <span style={{
                background: "#F1F3F7", color: "#6B7280", fontSize: 10, fontWeight: 700,
                borderRadius: 999, padding: "2px 8px", flexShrink: 0,
              }}>
                Private
              </span>
            )}
          </div>
          {room.description ? (
            <div style={{
              fontSize: 12, color: "#6B7686", marginTop: 2,
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>
              {room.description}
            </div>
          ) : null}
          <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 3, fontSize: 11, color: "#8A93A3" }}>
            <Users size={12} />
            {room.instructor_count ?? 0} instructors
          </div>
        </div>
        {action}
      </div>
    );
  }

  const btn = (bg: string): React.CSSProperties => ({
    height: 32, padding: "0 14px", borderRadius: 8, border: "none",
    background: bg, color: "white", fontSize: 12, fontWeight: 700, cursor: "pointer", flexShrink: 0,
  });

  return (
    <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 18 }}>
      <div>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#8A93A3", textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 8 }}>
          Your rooms
        </div>
        {loading ? (
          <div style={{ fontSize: 13, color: "#8A93A3" }}>Loading…</div>
        ) : myRooms.length === 0 ? (
          <div style={{ fontSize: 13, color: "#8A93A3" }}>You haven’t joined any rooms yet.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {myRooms.map((room) => (
              <RoomRow
                key={room.id}
                room={room}
                action={
                  <button type="button" style={btn("#185FA5")} onClick={() => onOpenRoom(room)}>
                    Open
                  </button>
                }
              />
            ))}
          </div>
        )}
      </div>

      <div>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#8A93A3", textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 8 }}>
          Available rooms
        </div>
        <div style={{
          display: "flex", alignItems: "center", gap: 8, background: "white",
          border: "0.5px solid #E2E6ED", borderRadius: 10, padding: "0 12px", height: 40, marginBottom: 10,
        }}>
          <Search size={15} color="#8A93A3" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search area or outcode"
            style={{ flex: 1, border: "none", outline: "none", fontSize: 13, color: "#0F2044", background: "transparent" }}
          />
        </div>
        {loading ? null : availableRooms.length === 0 ? (
          <div style={{ fontSize: 13, color: "#8A93A3" }}>No other rooms found.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {availableRooms.map((room) => (
              <RoomRow
                key={room.id}
                room={room}
                action={
                  <button
                    type="button"
                    disabled={joiningId === room.id}
                    style={{ ...btn("#0C8577"), opacity: joiningId === room.id ? 0.6 : 1 }}
                    onClick={() => join(room)}
                  >
                    {joiningId === room.id ? "Joining…" : "Join"}
                  </button>
                }
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}


/* ============================================================ ALERTS TAB */

const TOMTOM_FILTERS: { key: string; label: string }[] = [
  { key: "all", label: "All" },
  { key: "roadworks", label: "Roadworks" },
  { key: "accidents", label: "Accidents" },
  { key: "congestion", label: "Congestion" },
  { key: "hazards", label: "Hazards" },
];

const TOMTOM_FILTER_TYPES: Record<string, string[]> = {
  roadworks: ["roadworks", "road_closure"],
  accidents: ["accident", "collision"],
  congestion: ["heavy_traffic", "congestion"],
  hazards: ["hazard", "other"],
};

function AlertsTab({
  userId, instructorFirstName, instructorArea, instructorOutcode, coverageOutcodes,
}: {
  userId: string | null;
  instructorFirstName: string;
  instructorArea: string;
  instructorOutcode: string | null;
  coverageOutcodes: string[];
}) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [comments, setComments] = useState<AlertComment[]>([]);
  const [commentDraft, setCommentDraft] = useState("");
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({});
  const [reportSheetOpen, setReportSheetOpen] = useState(false);
  const setReportSheetOpenWithEvent = (open: boolean) => {
    setReportSheetOpen(open);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event(open ? "dsm-sheet-open" : "dsm-sheet-close"));
    }
  };

  const load = async () => {
    const { data } = await supabase
      .from("local_alerts")
      .select("*, instructors(name)")
      .eq("is_active", true)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false });
    const rows = (data ?? []) as Alert[];
    const filtered = rows.filter((a) => {
      // Always show own alerts regardless of outcode
      if (a.instructor_id === userId) return true;
      // Filter others by coverage area
      const aOutcode = (a.outcode ?? "").toUpperCase();
      if (coverageOutcodes.length > 0) return coverageOutcodes.includes(aOutcode);
      if (instructorOutcode) return aOutcode === instructorOutcode;
      return true;
    });
    setAlerts(filtered);

    if (filtered.length > 0) {
      const { data: commentRows } = await supabase
        .from("alert_comments")
        .select("alert_id")
        .in("alert_id", filtered.map((a) => a.id));
      const counts: Record<string, number> = {};
      for (const row of (commentRows ?? []) as { alert_id: string }[]) {
        counts[row.alert_id] = (counts[row.alert_id] ?? 0) + 1;
      }
      setCommentCounts(counts);
    } else {
      setCommentCounts({});
    }
  };

  useEffect(() => {
    if (!userId) return;
    load();
    const channel = supabase
      .channel(`local_alerts:${instructorOutcode ?? "all"}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "local_alerts" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, instructorOutcode, coverageOutcodes]);

  const myAlerts = useMemo(
    () => alerts.filter((a) => a.instructor_id === userId),
    [alerts, userId],
  );
  const otherAlerts = useMemo(
    () => alerts.filter((a) => a.instructor_id !== userId),
    [alerts, userId],
  );
  const instructorAlerts = useMemo(
    () => otherAlerts.filter((a) => (a.source ?? "manual") !== "tomtom"),
    [otherAlerts],
  );
  const officialAlerts = useMemo(
    () => otherAlerts.filter((a) => a.source === "tomtom"),
    [otherAlerts],
  );
  const instructorReportedCount = instructorAlerts.length;
  const officialCount = officialAlerts.length;

  const [tomtomOpen, setTomtomOpen] = useState(false);
  const [tomtomFilter, setTomtomFilter] = useState<string>("all");
  const filteredOfficialAlerts = useMemo(() => {
    if (tomtomFilter === "all") return officialAlerts;
    const types = TOMTOM_FILTER_TYPES[tomtomFilter] ?? [];
    return officialAlerts.filter((a) => types.includes(a.alert_type));
  }, [officialAlerts, tomtomFilter]);


  const handleUpvote = async (alert: Alert) => {
    if (!userId) return;
    const already = (alert.upvoted_by ?? []).includes(userId);
    if (already) {
      toast.info("You already confirmed this");
      return;
    }
    const newUpvotedBy = [...(alert.upvoted_by ?? []), userId];
    const newUpvotes = alert.upvotes + 1;
    const newExpires = new Date(new Date(alert.expires_at).getTime() + 30 * 60000).toISOString();
    setAlerts((prev) => prev.map((a) => a.id === alert.id
      ? { ...a, upvotes: newUpvotes, upvoted_by: newUpvotedBy, expires_at: newExpires }
      : a));
    const { error } = await supabase.rpc("upvote_local_alert", { p_alert_id: alert.id });
    if (error) {
      toast.error("Couldn't confirm — try again");
      load();
    }
  };

  const handleCancel = async (alert: Alert) => {
    const { error } = await supabase
      .from("local_alerts")
      .update({ is_active: false, expires_at: new Date().toISOString() })
      .eq("id", alert.id);
    if (error) {
      toast.error("Couldn't cancel");
      return;
    }
    toast.success("Alert cancelled");
    setAlerts((prev) => prev.filter((a) => a.id !== alert.id));
    load();
  };

  const loadComments = async (alertId: string) => {
    const { data } = await supabase
      .from("alert_comments")
      .select("id, body, created_at, instructor_id, instructors(name)")
      .eq("alert_id", alertId)
      .order("created_at", { ascending: true });
    setComments((data ?? []) as unknown as AlertComment[]);
  };

  useEffect(() => {
    if (!selectedAlert?.id) {
      setComments([]);
      return;
    }
    loadComments(selectedAlert.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAlert?.id]);

  useEffect(() => {
    if (!selectedAlert) return;
    const updated = alerts.find((a) => a.id === selectedAlert.id);
    if (!updated) return;
    const sameVotes =
      updated.upvotes === selectedAlert.upvotes &&
      updated.expires_at === selectedAlert.expires_at &&
      updated.is_active === selectedAlert.is_active;
    const sameVoters =
      (updated.upvoted_by ?? []).join(",") ===
      (selectedAlert.upvoted_by ?? []).join(",");
    if (!sameVotes || !sameVoters) {
      setSelectedAlert(updated);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alerts]);

  const handleAddComment = async () => {
    if (!selectedAlert || !userId) return;
    const body = commentDraft.trim();
    if (!body) return;
    const { error } = await supabase.from("alert_comments").insert({
      alert_id: selectedAlert.id,
      instructor_id: userId,
      body,
    });
    if (error) {
      toast.error("Couldn't post comment");
      return;
    }
    setCommentDraft("");
    await loadComments(selectedAlert.id);
    const already = (selectedAlert.upvoted_by ?? []).includes(userId);
    if (!already) {
      await handleUpvote(selectedAlert);
    }
  };

  return (
    <div style={{ padding: 16, paddingBottom: 100, marginBottom: 80 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: "#0F2044" }}>
          Alerts near {coverageOutcodes.length > 1 ? "your coverage areas" : instructorArea}
        </div>
        <div style={{ fontSize: 12, color: "#9CA3AF" }}>
          {otherAlerts.length === 0
            ? "0 active"
            : instructorReportedCount > 0 && officialCount > 0
              ? `${instructorReportedCount} from instructors · ${officialCount} official`
              : instructorReportedCount > 0
                ? `${instructorReportedCount} from instructors`
                : `${officialCount} official`}
        </div>
      </div>

      {/* SECTION 1 — Reported by instructors */}
      <div style={{ fontSize: 12, color: "#9CA3AF", fontWeight: 600, marginBottom: 8 }}>
        Reported by instructors
      </div>
      {instructorAlerts.length === 0 ? (
        myAlerts.length === 0 && officialAlerts.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center" }}>
            <MapPin size={48} color="#D1D5DB" style={{ margin: "0 auto 12px" }} />
            <div style={{ fontWeight: 600, color: "#6B7280" }}>No other alerts near {instructorArea}</div>
            <div style={{ fontSize: 12, color: "#9CA3AF", marginTop: 4 }}>Be the first to report an issue</div>
            <button
              type="button"
              onClick={() => {
                console.log("[community] FAB tapped (empty state)");
                setReportSheetOpenWithEvent(true);
              }}
              style={{
                background: "#CC2229", color: "white", border: "none", borderRadius: 12,
                padding: "10px 24px", marginTop: 16, fontWeight: 600, cursor: "pointer",
              }}
            >
              Report alert
            </button>
          </div>
        ) : (
          <div style={{
            padding: "14px 12px", textAlign: "center", background: "#F8FAFC",
            border: "1px dashed #E2E8F0", borderRadius: 12, fontSize: 12, color: "#9CA3AF",
          }}>
            No instructor reports in your area
          </div>
        )
      ) : (
        instructorAlerts.map((a) => (
          <AlertCard key={a.id} alert={a} userId={userId} onUpvote={handleUpvote} onSelect={setSelectedAlert} commentCount={commentCounts[a.id] ?? 0} />
        ))
      )}

      {/* SECTION 2 — Traffic & road data (collapsible) */}
      {officialAlerts.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <button
            type="button"
            onClick={() => setTomtomOpen((v) => !v)}
            style={{
              width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
              background: "white", border: "1px solid #E2E8F0", borderRadius: 12,
              padding: "11px 12px", cursor: "pointer",
            }}
          >
            <span style={{ fontSize: 13, fontWeight: 700, color: "#0B1F3A" }}>
              Traffic &amp; road data · {officialAlerts.length} incident{officialAlerts.length === 1 ? "" : "s"}
            </span>
            <ChevronDown
              size={18}
              color="#6B7280"
              style={{ transform: tomtomOpen ? "rotate(180deg)" : "none", transition: "transform .15s" }}
            />
          </button>

          {tomtomOpen && (
            <>
              <div style={{ display: "flex", gap: 6, overflowX: "auto", padding: "10px 0 2px" }}>
                {TOMTOM_FILTERS.map((f) => {
                  const active = tomtomFilter === f.key;
                  return (
                    <button
                      key={f.key}
                      type="button"
                      onClick={() => setTomtomFilter(f.key)}
                      style={{
                        flexShrink: 0,
                        border: `1px solid ${active ? "#0B1F3A" : "#E2E8F0"}`,
                        background: active ? "#0B1F3A" : "white",
                        color: active ? "white" : "#6B7280",
                        borderRadius: 20, padding: "5px 12px",
                        fontSize: 12, fontWeight: 600, cursor: "pointer",
                      }}
                    >
                      {f.label}
                    </button>
                  );
                })}
              </div>

              {filteredOfficialAlerts.length === 0 ? (
                <div style={{ padding: "14px 12px", textAlign: "center", fontSize: 12, color: "#9CA3AF" }}>
                  No matching incidents
                </div>
              ) : (
                <div style={{ marginTop: 8 }}>
                  {filteredOfficialAlerts.map((a) => (
                    <AlertCard key={a.id} alert={a} userId={userId} onUpvote={handleUpvote} onSelect={setSelectedAlert} commentCount={commentCounts[a.id] ?? 0} />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}


      {myAlerts.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <div style={{ fontSize: 12, color: "#9CA3AF", fontWeight: 600, marginBottom: 8 }}>
            Your active alerts
          </div>
          {myAlerts.map((a) => {
            const cfg = TYPE_CONFIG[a.alert_type] ?? TYPE_CONFIG.other;
            return (
              <div key={a.id} style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
                <div onClick={() => setSelectedAlert(a)} style={{
                  cursor: "pointer",
                  background: "white",
                  borderRadius: 14,
                  boxShadow: "0 3px 10px rgba(11,31,58,0.08)",
                  padding: "11px 12px",
                  display: "flex",
                  alignItems: "center",
                  gap: 11,
                }}>
                  <div style={{
                    width: 38,
                    height: 38,
                    borderRadius: 12,
                    flexShrink: 0,
                    background: "transparent",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}>
                    <AlertSignIcon type={a.alert_type} size={32} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
                    <div style={{
                      fontSize: 13.5,
                      fontWeight: 700,
                      color: "#0B1F3A",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      lineHeight: 1.2,
                    }}>
                      <span>{cfg.label}</span>
                      <span style={{ color: "#C7CDD9" }}> · </span>
                      <span>{a.description}</span>
                    </div>
                    {a.location_name && (
                      <div style={{
                        fontSize: 11,
                        color: "#9CA3AF",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}>
                        {a.location_name}
                      </div>
                    )}
                  </div>
                  <div style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: "#0B1F3A",
                      background: "#EEF2F7",
                      padding: "4px 9px",
                      borderRadius: 20,
                      whiteSpace: "nowrap",
                    }}>
                      {formatCountdown(a.expires_at)}
                    </div>
                    {(a.source ?? 'manual') !== 'tomtom' && (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleCancel(a); }}
                        style={{
                          width: 26,
                          height: 26,
                          borderRadius: "50%",
                          background: "#0B1F3A",
                          border: "none",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          cursor: "pointer",
                          padding: 0,
                        }}
                        aria-label="Cancel alert"
                      >
                        <X size={13} color="white" strokeWidth={2.4} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* REPORT FAB */}
      <button
        type="button"
        onClick={() => {
          console.log("[community] FAB tapped");
          console.log("[community] agreed:", typeof window !== "undefined" ? localStorage.getItem("community_agreed") : "n/a");
          console.log("[community] instructor area:", instructorArea, instructorOutcode);
          console.log("[community] userId:", userId);
          setReportSheetOpenWithEvent(true);
        }}
        aria-label="Report local issue"
        style={{
          position: "fixed",
          bottom: "calc(80px + env(safe-area-inset-bottom, 0px) + 12px)",
          right: 16, background: "#CC2229", border: "none", borderRadius: "50%",
          width: 56, height: 56, display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer", boxShadow: "0 4px 12px rgba(204,34,41,0.4)", zIndex: 50, color: "white",
        }}
      >
        <Plus size={24} />
      </button>

      {reportSheetOpen && (
        <ReportSheet
          reportSheetOpen={reportSheetOpen}
          onClose={() => setReportSheetOpenWithEvent(false)}
          onSubmitted={() => { setReportSheetOpenWithEvent(false); load(); }}
          userId={userId}
          instructorFirstName={instructorFirstName}
          instructorArea={instructorArea}
          instructorOutcode={instructorOutcode}
        />
      )}

      {selectedAlert && (() => {
        const cfg = TYPE_CONFIG[selectedAlert.alert_type] ?? TYPE_CONFIG.other;
        const isMine = selectedAlert.instructor_id === userId;
        const alreadyUpvoted = !!userId && (selectedAlert.upvoted_by ?? []).includes(userId);
        const rowStyle: React.CSSProperties = {
          display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "11px 14px", fontSize: 13,
        };
        const metaRows: { label: string; value: string }[] = [
          ...(selectedAlert.location_name ? [{ label: "Location", value: selectedAlert.location_name }] : []),
          { label: "Reported", value: selectedAlert.source === 'tomtom' ? "TomTom Traffic" : new Date(selectedAlert.created_at).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) },
          { label: "Expires", value: formatCountdown(selectedAlert.expires_at) },
          { label: "Confirmations", value: String(selectedAlert.upvotes) },
        ];
        return (
          <BottomSheet
            title={cfg.label}
            subtitle={selectedAlert.description}
            onClose={() => setSelectedAlert(null)}
            footer={
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  type="button"
                  onClick={() => setSelectedAlert(null)}
                  style={{
                    flex: 1, padding: "12px 0", borderRadius: 999, background: "white",
                    border: "1px solid #E2E6ED", color: "#0B1F3A", fontWeight: 600,
                    fontSize: 14, cursor: "pointer",
                  }}
                >
                  Close
                </button>
                {isMine && selectedAlert.source !== 'tomtom' ? (
                  <button
                    type="button"
                    onClick={() => { handleCancel(selectedAlert); setSelectedAlert(null); }}
                    style={{
                      flex: 1, padding: "12px 0", borderRadius: 999, background: "#0B1F3A",
                      border: "none", color: "white", fontWeight: 600, fontSize: 14, cursor: "pointer",
                    }}
                  >
                    Cancel alert
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleUpvote(selectedAlert)}
                    style={{
                      flex: 1, padding: "12px 0", borderRadius: 999,
                      background: "#F7FAFC", border: "1px solid #E2E6ED",
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                      cursor: "pointer",
                    }}
                  >
                    <ThumbsUp
                      size={14}
                      color={alreadyUpvoted ? "#1877D6" : "#9CA3AF"}
                      fill={alreadyUpvoted ? "#1877D6" : "none"}
                    />
                    <span style={{ fontSize: 14, fontWeight: 600, color: alreadyUpvoted ? "#1877D6" : "#6B7280" }}>
                      {selectedAlert.upvotes} confirmed
                    </span>
                  </button>
                )}
              </div>
            }
          >
            <div style={{ background: "white", borderRadius: 14, overflow: "hidden", marginBottom: 14 }}>
              {metaRows.map((r, i) => {
                const isReportedTomTom = r.label === "Reported" && selectedAlert.source === 'tomtom';
                return (
                  <div key={r.label} style={{ ...rowStyle, borderTop: i === 0 ? "none" : "0.5px solid #EEF0F3", alignItems: isReportedTomTom ? "flex-start" : "center" }}>
                    <span style={{ color: "#8A93A3" }}>{r.label}</span>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", marginLeft: 12 }}>
                      <span style={{ color: "#0B1F3A", fontWeight: 600, textAlign: "right" }}>{r.value}</span>
                      {isReportedTomTom && (
                        <span style={{ fontSize: 11, color: "#9CA3AF", marginTop: 2 }}>Updates automatically</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ fontSize: 12, fontWeight: 600, color: "#8A93A3", marginBottom: 6 }}>Description</div>
            <div style={{
              background: "white", borderRadius: 14, padding: "12px 14px",
              fontSize: 13.5, color: "#0B1F3A", lineHeight: 1.45, marginBottom: 14,
            }}>
              {selectedAlert.description}
            </div>

            <div style={{ fontSize: 12, fontWeight: 600, color: "#8A93A3", marginBottom: 6 }}>
              Comments · {comments.length}
            </div>
            {comments.length > 0 && (
              <div style={{ background: "white", borderRadius: 14, overflow: "hidden", marginBottom: 10 }}>
                {comments.map((c, i) => (
                  <div
                    key={c.id}
                    style={{
                      display: "flex", gap: 10, padding: "11px 14px",
                      borderTop: i === 0 ? "none" : "0.5px solid #EEF0F3",
                    }}
                  >
                    <div style={{
                      width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
                      background: commentColour(c.instructor_id), color: "white",
                      fontSize: 11, fontWeight: 700,
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      {commentInitials(c.instructors?.name)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, color: "#8A93A3" }}>
                        <span style={{ color: "#0B1F3A", fontWeight: 600 }}>{firstName(c.instructors?.name)}</span>
                        {" · "}{commentTimeAgo(c.created_at)}
                      </div>
                      <div style={{ fontSize: 13.5, color: "#0B1F3A", marginTop: 2, lineHeight: 1.4, wordBreak: "break-word" }}>
                        {c.body}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div style={{
              background: "white", borderRadius: 14, padding: 8, marginBottom: 6,
              display: "flex", alignItems: "center", gap: 8,
            }}>
              <div style={{
                width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
                background: userId ? commentColour(userId) : "#9CA3AF", color: "white",
                fontSize: 11, fontWeight: 700,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                {commentInitials(instructorFirstName)}
              </div>
              <input
                value={commentDraft}
                onChange={(e) => setCommentDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddComment(); } }}
                placeholder="Add an update…"
                style={{
                  flex: 1, minWidth: 0, border: "none", outline: "none",
                  fontSize: 13.5, color: "#0B1F3A", background: "transparent",
                }}
              />
              <button
                type="button"
                onClick={handleAddComment}
                disabled={!commentDraft.trim()}
                aria-label="Post comment"
                style={{
                  width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
                  background: "#1877D6", border: "none", color: "white",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: commentDraft.trim() ? "pointer" : "default",
                  opacity: commentDraft.trim() ? 1 : 0.4, padding: 0,
                }}
              >
                <Send size={15} />
              </button>
            </div>
          </BottomSheet>
        );
      })()}
    </div>
  );
}

function AlertCard({
  alert, userId, onUpvote, onSelect, commentCount,
}: {
  alert: Alert; userId: string | null; onUpvote: (a: Alert) => void; onSelect?: (a: Alert) => void; commentCount: number;
}) {
  const cfg = TYPE_CONFIG[alert.alert_type] ?? TYPE_CONFIG.other;
  const alreadyUpvoted = !!userId && (alert.upvoted_by ?? []).includes(userId);
  const reporter = firstName(alert.instructors?.name);
  const source = alert.source ?? 'manual';

  return (
    <div onClick={() => onSelect?.(alert)} style={{
      background: "white", borderRadius: 12, boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
      padding: "14px 16px", marginBottom: 8, cursor: "pointer",
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
        <div style={{
          width: 28, height: 28, borderRadius: 8, background: "transparent",
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
        }}>
          <AlertSignIcon type={alert.alert_type} size={28} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 10, fontWeight: 700, textTransform: "uppercase",
            color: cfg.colour, letterSpacing: 0.3,
          }}>
            {cfg.label}
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#0F2044", marginTop: 2 }}>
            {alert.description}
          </div>
          {alert.location_name && (
            <div style={{ fontSize: 12, color: "#9CA3AF", marginTop: 1 }}>{alert.location_name}</div>
          )}
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2, flexShrink: 0 }}>
          <div style={{ fontSize: 10, color: "#9CA3AF" }}>{formatCountdown(alert.expires_at)}</div>
          {source === 'tomtom' ? (
            <div style={{ background: '#E3EEFC', color: '#1877D6', fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 20 }}>
              TomTom
            </div>
          ) : (
            <div style={{ fontSize: 10, color: "#9CA3AF" }}>{reporter}</div>
          )}
        </div>
      </div>

      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        marginTop: 10, paddingTop: 8, borderTop: "0.5px solid #F3F4F6",
      }}>
        <div style={{ fontSize: 12, color: "#9CA3AF" }}>
          {source === 'tomtom' ? 'Official traffic data' : `${reporter} reported this`}
        </div>
        {commentCount > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <MessageCircle size={13} color="#9CA3AF" />
            <span style={{ fontSize: 12, color: "#9CA3AF" }}>{commentCount}</span>
          </div>
        )}
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onUpvote(alert); }}
          style={{
            display: "flex", alignItems: "center", gap: 4,
            background: "#F7FAFC", border: "0.5px solid #E2E6ED", borderRadius: 8,
            padding: "6px 12px", cursor: "pointer",
          }}
        >
          <ThumbsUp
            size={13}
            color={alreadyUpvoted ? "#185FA5" : "#9CA3AF"}
            fill={alreadyUpvoted ? "#185FA5" : "none"}
          />
          <span style={{ fontSize: 12, fontWeight: 600, color: alreadyUpvoted ? "#185FA5" : "#6B7280" }}>
            {alert.upvotes} confirmed
          </span>
        </button>
      </div>
    </div>
  );
}

/* ============================================================ REPORT SHEET */

function ReportSheet({
  reportSheetOpen, onClose, onSubmitted, userId, instructorFirstName, instructorArea, instructorOutcode,
}: {
  reportSheetOpen: boolean;
  onClose: () => void;
  onSubmitted: () => void;
  userId: string | null;
  instructorFirstName: string;
  instructorArea: string;
  instructorOutcode: string | null;
}) {
  const [agreed, setAgreed] = useState<boolean>(() => {
    try { return typeof window !== "undefined" && localStorage.getItem("community_agreed") === "true"; } catch { return false; }
  });
  const [selectedType, setSelectedType] = useState<string>("");
  const [location, setLocation] = useState("");
  const [town, setTown] = useState("");
  const [description, setDescription] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [expiry, setExpiry] = useState<"30min" | "1hour" | "2hours" | "allday">("1hour");
  const [submitting, setSubmitting] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState<string>("");
  const [suggestions, setSuggestions] = useState<{ placeId: string; text: string }[]>([]);
  const [reportLat, setReportLat] = useState<number | null>(null);
  const [reportLng, setReportLng] = useState<number | null>(null);
  const locationInputRef = useRef<HTMLInputElement | null>(null);
  const suppressSuggestRef = useRef(false);
  const sessionTokenRef = useRef<any>(null);



  useEffect(() => {
    setIsAnonymous(selectedType === "examiner_tip");
  }, [selectedType]);

  useEffect(() => {
    console.log("[community] ReportSheet mounted; agreed:", agreed);
    console.log("[community] report sheet open:", reportSheetOpen);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!reportSheetOpen) return;
    if (!navigator.geolocation) {
      setLocationLoading(false);
      return;
    }
    setLocationLoading(true);
    setLocationError("");
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setReportLat(latitude);
        setReportLng(longitude);
        try {
          const result = await reverseGeocode({ data: { lat: latitude, lng: longitude } });
          if (result.error) setLocationError(result.error);
          if (result.road) {
            suppressSuggestRef.current = true;
            setLocation(result.road);
          }
          if (result.town) setTown(result.town);
        } catch (err) {
          console.warn("[community] reverse geocode failed:", err);
          setLocationError("Could not detect your location — type it in below.");
        } finally {
          setLocationLoading(false);
        }
      },
      (error) => {
        console.warn("[community] geolocation error:", error);
        setLocationLoading(false);
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
    );
  }, [reportSheetOpen]);

  // Places (New) autocomplete suggestions for the road name input
  useEffect(() => {
    if (!reportSheetOpen) {
      setSuggestions([]);
      return;
    }
    if (suppressSuggestRef.current) {
      suppressSuggestRef.current = false;
      setSuggestions([]);
      return;
    }
    const query = location.trim();
    if (query.length < 3) {
      setSuggestions([]);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        await loadGoogleMaps();
        if (cancelled) return;
        const g = (window as GMapsWindow).google;
        const places: any = await g.maps.importLibrary("places");
        const { AutocompleteSuggestion, AutocompleteSessionToken } = places;
        if (!AutocompleteSuggestion) return;
        if (!sessionTokenRef.current) sessionTokenRef.current = new AutocompleteSessionToken();
        const { suggestions: results } = await AutocompleteSuggestion.fetchAutocompleteSuggestions({
          input: query,
          sessionToken: sessionTokenRef.current,
          includedRegionCodes: ["gb"],
        });
        if (cancelled) return;
        setSuggestions(
          (results ?? [])
            .slice(0, 5)
            .map((s: any) => ({
              placeId: s.placePrediction?.placeId as string,
              text: s.placePrediction?.text?.toString?.() ?? "",
            }))
            .filter((s: { placeId?: string }) => !!s.placeId)
        );
      } catch (err) {
        console.warn("[community] autocomplete failed:", err);
        if (!cancelled) setSuggestions([]);
      }
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [location, reportSheetOpen]);

  const pickSuggestion = async (placeId: string, fallbackText: string) => {
    suppressSuggestRef.current = true;
    setSuggestions([]);
    try {
      const g = (window as GMapsWindow).google;
      const places: any = await g.maps.importLibrary("places");
      const place = new places.Place({ id: placeId });
      await place.fetchFields({ fields: ["addressComponents", "displayName"] });
      const components: any[] = place.addressComponents ?? [];
      const road =
        components.find((c) => c.types.includes("route"))?.longText ||
        place.displayName ||
        fallbackText.split(",")[0];
      const detectedTown =
        components.find(
          (c) => c.types.includes("postal_town") || c.types.includes("locality")
        )?.longText ?? "";
      setLocation(road ?? "");
      if (detectedTown) setTown(detectedTown);
    } catch (err) {
      console.warn("[community] place details failed:", err);
      setLocation(fallbackText.split(",")[0]);
    } finally {
      sessionTokenRef.current = null;
    }
  };



  const canSubmit = !!selectedType && description.trim().length > 0 && !!userId && !!instructorOutcode && !submitting;

  const submit = async () => {
    console.log("[community] report sheet open:", reportSheetOpen);
    console.log("[community] selected type:", selectedType);
    console.log("[community] description:", description);
    console.log("[community] instructor area:", instructorArea, instructorOutcode);
    console.log("[community] canSubmit:", canSubmit, "userId:", userId);
    if (!canSubmit || !userId) {
      console.warn("[community] submit blocked: canSubmit/userId falsy");
      return;
    }
    setSubmitting(true);
    const expiryMinutes = expiry === "30min" ? 30
      : expiry === "1hour" ? 60
      : expiry === "2hours" ? 120
      : minutesUntilMidnight();
    const payload = {
      instructor_id: userId,
      alert_type: selectedType,
      description: description.trim(),
      location_name: [location.trim(), town.trim()].filter(Boolean).join(", ") || null,
      area: instructorArea,
      outcode: instructorOutcode,
      lat: reportLat,
      lng: reportLng,
      upvotes: 0,
      upvoted_by: [],
      is_active: true,
      expires_at: new Date(Date.now() + expiryMinutes * 60000).toISOString(),
    };
    console.log("[community] submit payload:", payload);
    const { data, error } = await supabase.from("local_alerts").insert(payload).select();
    console.log("[community] insert result:", data, error);
    setSubmitting(false);
    if (error) {
      console.error("[community] insert error:", error);
      toast.error("Failed to report: " + error.message);
      return;
    }
    toast.success("Alert reported — thanks for helping local ADIs!");
    onSubmitted();
  };


  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(15,32,68,0.4)", zIndex: 60,
      display: "flex", alignItems: "flex-end", justifyContent: "center",
    }} onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "white", borderRadius: "20px 20px 0 0",
          maxHeight: "90vh", overflowY: "auto", width: "100%", maxWidth: 560,
        }}
      >
        <div style={{ width: 36, height: 4, background: "#E5E7EB", borderRadius: 999, margin: "12px auto 4px" }} />

        {!agreed ? (
          <div style={{ padding: 20 }}>
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 12, color: "#0F2044" }}>Community guidelines</div>
            <ul style={{ fontSize: 14, color: "#6B7280", lineHeight: 1.6, paddingLeft: 18, margin: 0 }}>
              <li>Keep it relevant — driving related only</li>
              <li>Be professional and respectful to other ADIs</li>
              <li>No advertising or self-promotion</li>
              <li>Examiner tips: keep anonymous, no full names</li>
              <li>DSM moderates all content</li>
            </ul>
            <button
              type="button"
              onClick={() => {
                try { localStorage.setItem("community_agreed", "true"); } catch {}
                setAgreed(true);
              }}
              style={{
                background: "#0F2044", color: "white", border: "none", borderRadius: 12,
                width: "100%", padding: 12, marginTop: 16, fontWeight: 600, cursor: "pointer",
              }}
            >
              I agree — report my alert
            </button>
          </div>
        ) : (
          <>
            <div style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "12px 20px",
            }}>
              <div style={{ fontWeight: 700, fontSize: 16, color: "#0F2044" }}>Report a local issue</div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                style={{
                  width: 32, height: 32, borderRadius: "50%", background: "#F3F4F6",
                  border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
                }}
              >
                <X size={16} color="#6B7280" />
              </button>
            </div>

            <div style={{
              display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8,
              padding: "0 20px", marginBottom: 16,
            }}>
              {TYPE_ORDER.map((key) => {
                const cfg = TYPE_CONFIG[key];
                const Icon = cfg.Icon;
                const selected = selectedType === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSelectedType(key)}
                    style={{
                      background: selected ? cfg.bg : "#F7FAFC",
                      border: `0.5px solid ${selected ? cfg.colour : "#E2E6ED"}`,
                      borderRadius: 10, padding: "14px 12px", cursor: "pointer",
                      minHeight: 72, display: "flex", flexDirection: "column",
                      alignItems: "center", justifyContent: "center", gap: 6,
                    }}
                  >
                    <Icon size={20} color={cfg.colour} />
                    <span style={{ fontSize: 12, fontWeight: 600, color: selected ? cfg.colour : "#0F2044" }}>
                      {cfg.label}
                    </span>
                  </button>
                );
              })}
            </div>

            <div style={{ padding: "0 20px", marginBottom: 12 }}>
              <div style={{ fontSize: 12, color: "#9CA3AF", fontWeight: 600, marginBottom: 6 }}>Where?</div>
              <div style={{ position: "relative" }}>
                <MapPin size={16} color="#9CA3AF" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
                <input
                  ref={locationInputRef}
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}

                  placeholder={locationLoading ? "Detecting your location..." : "Road name or location..."}
                  disabled={locationLoading}
                  style={{
                    width: "100%",
                    padding: "11px 36px 11px 34px",
                    background: "#F7FAFC",
                    border: "0.5px solid " + (location ? "#86EFAC" : "#E2E6ED"),
                    borderRadius: 10,
                    fontSize: 13,
                    fontFamily: "Inter, sans-serif",
                    color: "#0F2044",
                    outline: "none",
                    boxSizing: "border-box",
                    opacity: locationLoading ? 0.7 : 1,
                  }}
                />
                {location && !locationLoading && (
                  <button
                    type="button"
                    onClick={() => setLocation("")}
                    style={{
                      position: "absolute", right: 10, top: "50%",
                      transform: "translateY(-50%)",
                      background: "none", border: "none",
                      cursor: "pointer", color: "#9CA3AF",
                      fontSize: 16, lineHeight: 1, padding: 4,
                    }}
                  >
                    ×
                  </button>
                )}
                {suggestions.length > 0 && (
                  <div
                    style={{
                      position: "absolute",
                      top: "calc(100% + 4px)",
                      left: 0,
                      right: 0,
                      background: "#FFFFFF",
                      border: "1px solid #E2E6ED",
                      borderRadius: 10,
                      boxShadow: "0 4px 14px rgba(0,0,0,0.08)",
                      overflow: "hidden",
                      zIndex: 20,
                    }}
                  >
                    {suggestions.map((s) => (
                      <button
                        key={s.placeId}
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => pickSuggestion(s.placeId, s.text)}
                        style={{
                          display: "block",
                          width: "100%",
                          textAlign: "left",
                          padding: "10px 12px",
                          background: "none",
                          border: "none",
                          borderBottom: "1px solid #F1F4F8",
                          fontSize: 13,
                          fontFamily: "Inter, sans-serif",
                          color: "#0F2044",
                          cursor: "pointer",
                        }}
                      >
                        {s.text}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {locationLoading && (
                <div style={{ fontSize: 12, color: "#185FA5", marginTop: 6 }}>
                  Getting your location...
                </div>
              )}
              {!!locationError && !locationLoading && (
                <div style={{ fontSize: 12, color: "#CC2229", marginTop: 6 }}>
                  {locationError}
                </div>
              )}

              {location && !locationLoading && (
                <div style={{ fontSize: 12, color: "#22C580", marginTop: 6 }}>
                  Location detected — edit if needed
                </div>
              )}
              <div style={{ marginTop: 10 }}>
                <div style={{ fontSize: 12, color: "#9CA3AF", fontWeight: 600, marginBottom: 6 }}>Town / area</div>
                <input
                  value={town}
                  onChange={(e) => setTown(e.target.value)}
                  placeholder="Town or area..."
                  style={{
                    width: "100%",
                    padding: "11px 14px",
                    background: "#F7FAFC",
                    border: "0.5px solid " + (town ? "#86EFAC" : "#E2E6ED"),
                    borderRadius: 10,
                    fontSize: 13,
                    fontFamily: "Inter, sans-serif",
                    color: "#0F2044",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
              </div>
            </div>


            <div style={{ padding: "0 20px", marginBottom: 12 }}>
              <div style={{ fontSize: 12, color: "#9CA3AF", fontWeight: 600, marginBottom: 6 }}>Details</div>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add details to help other ADIs..."
                style={{
                  width: "100%", minHeight: 80, background: "#F7FAFC",
                  border: "0.5px solid #E2E6ED", borderRadius: 10, padding: "11px 14px",
                  fontSize: 14, outline: "none", boxSizing: "border-box", resize: "vertical",
                  fontFamily: "inherit",
                }}
              />
            </div>

            <div style={{ padding: "0 20px", marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontSize: 14, color: "#0F2044" }}>Report anonymously</div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={isAnonymous}
                  onClick={() => setIsAnonymous((v) => !v)}
                  style={{
                    width: 40, height: 24, borderRadius: 999, border: "none", cursor: "pointer",
                    background: isAnonymous ? "#0F2044" : "#E5E7EB", position: "relative",
                    transition: "background 0.15s",
                  }}
                >
                  <span style={{
                    position: "absolute", top: 2, left: isAnonymous ? 18 : 2,
                    width: 20, height: 20, borderRadius: "50%", background: "white",
                    transition: "left 0.15s", boxShadow: "0 1px 2px rgba(0,0,0,0.2)",
                  }} />
                </button>
              </div>
              <div style={{ fontSize: 12, color: "#9CA3AF", marginTop: 2 }}>
                Your name won't be shown to other instructors
              </div>
            </div>

            <div style={{ padding: "0 20px", marginBottom: 16 }}>
              <div style={{ fontSize: 12, color: "#9CA3AF", fontWeight: 600, marginBottom: 8 }}>
                How long is this relevant?
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                {([
                  { id: "30min", label: "30 mins" },
                  { id: "1hour", label: "1 hour" },
                  { id: "2hours", label: "2 hours" },
                  { id: "allday", label: "All day" },
                ] as const).map((opt) => {
                  const active = expiry === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setExpiry(opt.id)}
                      style={{
                        flex: 1, borderRadius: 999, padding: "8px 10px", cursor: "pointer",
                        fontSize: 12, fontWeight: 600,
                        background: active ? "#0F2044" : "#F7FAFC",
                        color: active ? "white" : "#6B7280",
                        border: active ? "0.5px solid #0F2044" : "0.5px solid #E2E6ED",
                      }}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ padding: "0 20px 20px" }}>
              <button
                type="button"
                onClick={submit}
                disabled={!canSubmit}
                style={{
                  background: canSubmit ? "#CC2229" : "#F3F4F6",
                  color: canSubmit ? "white" : "#9CA3AF",
                  border: "none", borderRadius: 12, width: "100%", padding: 12,
                  fontWeight: 600, cursor: canSubmit ? "pointer" : "not-allowed",
                }}
              >
                {submitting ? "Posting…" : "Report alert"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ============================================================ CHAT TAB */

type ChatSubscription = { id: string; muted_until: string | null; last_read_at: string | null };

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function highlightMessage(text: string, query: string): React.ReactNode {
  const q = query.trim();
  if (!q) return text;
  const pattern = new RegExp(`(${escapeRegExp(q)})`, "gi");
  const parts = text.split(pattern);
  return parts.map((part, i) =>
    part.toLowerCase() === q.toLowerCase() ? (
      <span key={i} style={{ background: "#FEF3C7" }}>{part}</span>
    ) : part
  );
}

function ChatTab({
  scope, userId, instructorProfile, instructorArea, instructorOutcode, onRoomRead,
}: {
  scope: "local" | "uk";
  userId: string | null;
  instructorProfile: { name: string | null; profile_image_url: string | null } | null;
  instructorArea: string;
  instructorOutcode: string | null;
  onRoomRead?: (scope: "local" | "uk") => void;
}) {
  const [room, setRoom] = useState<ChatRoom | null>(null);
  const [noRoom, setNoRoom] = useState(false);
  const [noRoomMessage, setNoRoomMessage] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [subscription, setSubscription] = useState<ChatSubscription | null>(null);
  const [muteMenuOpen, setMuteMenuOpen] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<BrowseRoom | null>(null);
  const [roomSelectorOpen, setRoomSelectorOpen] = useState(false);
  const [myRooms, setMyRooms] = useState<BrowseRoom[]>([]);
  const [msgSearch, setMsgSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [isBanned, setIsBanned] = useState(false);
  const [contextMsg, setContextMsg] = useState<ChatMessage | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const checkBan = async (): Promise<boolean> => {
    if (!userId || !room) return false;
    const { data: ban } = await supabase
      .from("chat_bans")
      .select("id")
      .eq("instructor_id", userId)
      .or(`room_id.eq.${room.id},room_id.is.null`)
      .maybeSingle();
    return !!ban;
  };

  const startLongPress = (m: ChatMessage) => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
    longPressTimer.current = setTimeout(() => setContextMsg(m), 500);
  };
  const cancelLongPress = () => {
    if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; }
  };


  const isSubscribed = subscription !== null;
  const isMuted = !!subscription?.muted_until && new Date(subscription.muted_until) > new Date();

  const activeOutcode = selectedRoom ? selectedRoom.outcode : instructorOutcode;
  const activeAreaName = selectedRoom ? (selectedRoom.area_name ?? selectedRoom.outcode) : instructorArea;

  const displayed = useMemo(() => {
    const q = msgSearch.trim().toLowerCase();
    if (!q) return messages;
    return messages.filter((m) => m.message.toLowerCase().includes(q));
  }, [messages, msgSearch]);

  const scrollToBottom = () => {
    requestAnimationFrame(() => {
      const el = listRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    });
  };

  useEffect(() => {
    if (!userId) return;
    if (scope === "local" && !activeOutcode) return;
    let cancelled = false;
    (async () => {
      const outcode = scope === "uk" ? "UK" : activeOutcode!;
      const areaName = scope === "uk" ? "All UK ADIs" : activeAreaName;

      const { data: roomRow } = await supabase
        .from("local_chat_rooms")
        .select("*")
        .eq("outcode", outcode)
        .maybeSingle();
      if (cancelled) return;
      if (!roomRow) {
        setNoRoom(true);
        setRoom(null);
        setNoRoomMessage(
          "No chat room exists for your area yet. DSM will create one shortly — check back soon."
        );
        return;
      }
      setNoRoom(false);
      setRoom(roomRow as ChatRoom);

      const { data: msgs } = await supabase
        .from("local_chat_messages")
        .select("*, instructors(name, profile_image_url)")
        .eq("room_id", (roomRow as any).id)
        .is("deleted_at", null)
        .order("created_at", { ascending: true })
        .limit(100);
      if (cancelled) return;
      setMessages((msgs ?? []) as ChatMessage[]);
      setMsgSearch("");
      scrollToBottom();
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, scope, activeOutcode]);

  // Ban check for this room
  useEffect(() => {
    if (!room || !userId) { setIsBanned(false); return; }
    let cancelled = false;
    (async () => {
      const banned = await checkBan();
      if (!cancelled) setIsBanned(banned);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room, userId]);



  // Load subscribed local rooms for the room switcher
  useEffect(() => {
    if (!userId || scope !== "local") return;
    let cancelled = false;
    (async () => {
      const { data: rooms } = await supabase
        .from("local_chat_rooms")
        .select("id, outcode, area_name, instructor_count, room_type, is_opt_in")
        .neq("outcode", "UK");
      if (cancelled) return;
      const { data: subs } = await supabase
        .from("chat_room_subscriptions")
        .select("room_id")
        .eq("instructor_id", userId);
      if (cancelled) return;
      const subIds = new Set(((subs ?? []) as any[]).map((s) => s.room_id));
      const all = (rooms ?? []) as BrowseRoom[];
      const home = all.find((r) => r.outcode === instructorOutcode);
      const my = all.filter(
        (r) =>
          subIds.has(r.id) ||
          (home && r.id === home.id) ||
          (!r.is_opt_in && r.outcode === instructorOutcode)
      );
      setMyRooms(my);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, scope, instructorOutcode]);

  // Fetch subscription for this room + mark as read on open
  useEffect(() => {
    if (!room || !userId) return;
    let cancelled = false;
    (async () => {
      const { data: sub } = await supabase
        .from("chat_room_subscriptions")
        .select("id, muted_until, last_read_at")
        .eq("instructor_id", userId)
        .eq("room_id", room.id)
        .maybeSingle();
      if (cancelled) return;
      if (sub) {
        const now = new Date().toISOString();
        setSubscription({ ...(sub as ChatSubscription), last_read_at: now });
        await supabase
          .from("chat_room_subscriptions")
          .update({ last_read_at: now })
          .eq("id", (sub as any).id);
        onRoomRead?.(scope);
      } else {
        setSubscription(null);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room, userId]);

  useEffect(() => {
    if (!room) return;
    const channel = supabase
      .channel(`local_chat:${room.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "local_chat_messages", filter: `room_id=eq.${room.id}` },
        async (payload) => {
          const inserted = payload.new as ChatMessage;
          const { data: withInstructor } = await supabase
            .from("local_chat_messages")
            .select("*, instructors(name, profile_image_url)")
            .eq("id", inserted.id)
            .maybeSingle();
          setMessages((prev) => [...prev, (withInstructor ?? inserted) as ChatMessage]);
          scrollToBottom();

          // Notify when not actively viewing and not muted
          const notViewing = typeof document !== "undefined" && document.visibilityState !== "visible";
          const mutedNow = !!subscription?.muted_until && new Date(subscription.muted_until) > new Date();
          if (inserted.instructor_id !== userId && userId && subscription && !mutedNow && notViewing) {
            const body = inserted.message.length > 60 ? inserted.message.slice(0, 60) + "..." : inserted.message;
            await supabase.from("instructor_notifications").insert({
              instructor_id: userId,
              type: "chat_message",
              title: `New message in ${room.area_name} chat`,
              body,
              read: false,
              reference_type: "chat_room",
              reference_id: room.id,
            });
          }
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room, userId, subscription]);

  const send = async () => {
    if (!room || !userId) return;
    const msg = newMessage.trim();
    if (!msg) return;
    const banned = await checkBan();
    if (banned) {
      setIsBanned(true);
      toast.error("You have been removed from this chat room");
      return;
    }
    setNewMessage("");

    const { error } = await supabase.from("local_chat_messages").insert({
      room_id: room.id,
      instructor_id: userId,
      message: msg,
    });
    if (error) { toast.error("Couldn't send"); return; }

    // Auto-subscribe on first message
    if (!subscription) {
      const { data: newSub } = await supabase
        .from("chat_room_subscriptions")
        .insert({
          instructor_id: userId,
          room_id: room.id,
          last_read_at: new Date().toISOString(),
        })
        .select("id, muted_until, last_read_at")
        .maybeSingle();
      if (newSub) setSubscription(newSub as ChatSubscription);
    }
  };

  const subscribeToRoom = async () => {
    if (!room || !userId) return;
    const { data: newSub, error } = await supabase
      .from("chat_room_subscriptions")
      .insert({
        instructor_id: userId,
        room_id: room.id,
        last_read_at: new Date().toISOString(),
      })
      .select("id, muted_until, last_read_at")
      .maybeSingle();
    if (error || !newSub) { toast.error("Couldn't subscribe"); return; }
    setSubscription(newSub as ChatSubscription);
    toast.success("Subscribed — you'll be notified of new messages");
  };

  const muteFor = async (hours: number | null) => {
    if (!subscription) return;
    const mutedUntil = hours === null
      ? new Date(Date.now() + 1000 * 60 * 60 * 24 * 365 * 10).toISOString()
      : new Date(Date.now() + hours * 3600_000).toISOString();
    const { error } = await supabase
      .from("chat_room_subscriptions")
      .update({ muted_until: mutedUntil })
      .eq("id", subscription.id);
    setMuteMenuOpen(false);
    if (error) { toast.error("Couldn't mute"); return; }
    setSubscription({ ...subscription, muted_until: mutedUntil });
    toast.success(hours === null ? "Muted indefinitely" : `Muted for ${hours} hour${hours === 1 ? "" : "s"}`);
  };

  const unmute = async () => {
    if (!subscription) return;
    const { error } = await supabase
      .from("chat_room_subscriptions")
      .update({ muted_until: null })
      .eq("id", subscription.id);
    if (error) { toast.error("Couldn't unmute"); return; }
    setSubscription({ ...subscription, muted_until: null });
    toast.success("Notifications unmuted");
  };

  const unsubscribe = async () => {
    if (!subscription) return;
    const { error } = await supabase
      .from("chat_room_subscriptions")
      .delete()
      .eq("id", subscription.id);
    setMuteMenuOpen(false);
    if (error) { toast.error("Couldn't unsubscribe"); return; }
    setSubscription(null);
    toast.success("Unsubscribed from this chat");
  };

  const flag = async (msg: ChatMessage) => {
    setContextMsg(null);
    const current = msg.flagged_by ?? [];
    if (userId && current.includes(userId)) {
      toast.info("You've already reported this message");
      return;
    }
    const flaggedBy = [...current, userId ?? ""].filter(Boolean);
    const { error } = await supabase
      .from("local_chat_messages")
      .update({ is_flagged: true, flagged_by: flaggedBy })
      .eq("id", msg.id);
    if (error) { toast.error("Couldn't report message"); return; }
    toast.success("Message reported to admin");
  };


  const areaLabel = scope === "uk" ? "All UK" : (room?.area_name ?? activeAreaName);
  const memberCount = room?.instructor_count ?? 1;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 130px)" }}>
      {/* Header */}
      <div style={{
        background: "white", borderBottom: "0.5px solid #E2E6ED",
        padding: "12px 16px", position: "sticky", top: 45, zIndex: 5,
        display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8,
      }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: "#0F2044" }}>
            {scope === "uk" ? "All UK ADIs" : `${areaLabel} ADIs`}
          </div>
          <div style={{ fontSize: 12, color: "#9CA3AF" }}>
            {memberCount} members · {scope === "uk" ? "Chat with ADIs across the UK" : "Real names only"}
          </div>
        </div>

        {room && (
          <div style={{ position: "relative", flexShrink: 0, display: "flex", alignItems: "center", gap: 4 }}>
            <button
              type="button"
              aria-label="Search messages"
              onClick={() => setSearchOpen((v) => !v)}
              style={{
                background: "none", border: "none", cursor: "pointer",
                padding: 4, display: "flex", alignItems: "center",
              }}
            >
              <IconSearch size={20} color={searchOpen ? "#1877D6" : "#9CA3AF"} />
            </button>

            <button
              type="button"
              aria-label={!isSubscribed ? "Subscribe to notifications" : isMuted ? "Unmute notifications" : "Notification settings"}
              onClick={() => {
                if (!isSubscribed) { subscribeToRoom(); return; }
                if (isMuted) { unmute(); return; }
                setMuteMenuOpen((v) => !v);
              }}
              style={{
                background: "none", border: "none", cursor: "pointer",
                padding: 4, display: "flex", alignItems: "center",
              }}
            >
              {!isSubscribed ? (
                <IconBell size={20} color="#9CA3AF" />
              ) : isMuted ? (
                <IconBellOff size={20} color="#B45309" />
              ) : (
                <IconBell size={20} color="#1877D6" fill="#1877D6" />
              )}
            </button>

            {muteMenuOpen && (
              <>
                <div
                  onClick={() => setMuteMenuOpen(false)}
                  style={{ position: "fixed", inset: 0, zIndex: 40 }}
                />
                <div style={{
                  position: "absolute", top: 32, right: 0, zIndex: 41,
                  background: "white", border: "0.5px solid #E2E6ED", borderRadius: 12,
                  boxShadow: "0 1px 3px rgba(0,0,0,0.06)", overflow: "hidden", minWidth: 190,
                }}>
                  {[
                    { label: "Mute for 1 hour", hours: 1 },
                    { label: "Mute for 8 hours", hours: 8 },
                    { label: "Mute for 24 hours", hours: 24 },
                    { label: "Mute indefinitely", hours: null as number | null },
                  ].map((o) => (
                    <button
                      key={o.label}
                      type="button"
                      onClick={() => muteFor(o.hours)}
                      style={{
                        display: "block", width: "100%", textAlign: "left",
                        padding: "10px 14px", fontSize: 13, color: "#0F2044",
                        background: "none", border: "none", borderBottom: "0.5px solid #F1F4F8", cursor: "pointer",
                      }}
                    >
                      {o.label}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={unsubscribe}
                    style={{
                      display: "block", width: "100%", textAlign: "left",
                      padding: "10px 14px", fontSize: 13, color: "#CC2229", fontWeight: 600,
                      background: "none", border: "none", cursor: "pointer",
                    }}
                  >
                    Unsubscribe
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Room selector (local only) */}
      {scope === "local" && myRooms.length > 0 && (
        <div style={{ background: "white", borderBottom: "0.5px solid #E2E6ED", padding: "8px 16px", position: "relative" }}>
          <button
            type="button"
            onClick={() => setRoomSelectorOpen((v) => !v)}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              background: "none", border: "none", padding: 0, cursor: "pointer",
            }}
          >
            <span style={{ fontSize: 13, fontWeight: 600, color: "#0F2044" }}>
              {areaLabel}
            </span>
            <ChevronDown
              size={16}
              color="#6B7280"
              style={{ transform: roomSelectorOpen ? "rotate(180deg)" : "none", transition: "transform .15s" }}
            />
          </button>

          {roomSelectorOpen && (
            <>
              <div
                onClick={() => setRoomSelectorOpen(false)}
                style={{ position: "fixed", inset: 0, zIndex: 40 }}
              />
              <div style={{
                position: "absolute", top: 34, left: 16, right: 16, zIndex: 41,
                background: "white", border: "0.5px solid #E2E6ED", borderRadius: 12,
                boxShadow: "0 1px 3px rgba(0,0,0,0.06)", overflow: "hidden", maxHeight: 260, overflowY: "auto",
              }}>
                {myRooms.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => {
                      setSelectedRoom(r);
                      setRoomSelectorOpen(false);
                    }}
                    style={{
                      display: "block", width: "100%", textAlign: "left",
                      padding: "10px 14px", fontSize: 13, color: "#0F2044",
                      background: "none", border: "none", borderBottom: "0.5px solid #F1F4F8", cursor: "pointer",
                    }}
                  >
                    {r.area_name || r.outcode}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Message search */}
      {searchOpen && (
        <div style={{
          background: "white", borderBottom: "0.5px solid #E2E6ED",
          padding: "8px 16px", display: "flex", alignItems: "center", gap: 8,
        }}>
          <IconSearch size={16} color="#8A93A3" />
          <input
            value={msgSearch}
            onChange={(e) => setMsgSearch(e.target.value)}
            placeholder="Search messages..."
            autoFocus
            style={{
              flex: 1, border: "none", outline: "none", fontSize: 13, color: "#0F2044", background: "transparent",
            }}
          />
          {msgSearch && (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => setMsgSearch("")}
              style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex" }}
            >
              <X size={16} color="#8A93A3" />
            </button>
          )}
          <button
            type="button"
            onClick={() => { setMsgSearch(""); setSearchOpen(false); }}
            style={{ fontSize: 12, color: "#8A93A3", background: "none", border: "none", cursor: "pointer" }}
          >
            Close
          </button>
        </div>
      )}

      {/* Message list */}
      <div
        ref={listRef}
        style={{ flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column" }}
      >
        {noRoom ? (
          <div style={{ marginTop: 60, textAlign: "center", padding: "0 24px" }}>
            <MessageSquare size={40} color="#D1D5DB" style={{ margin: "0 auto 12px" }} />
            <div style={{ fontWeight: 600, color: "#6B7280" }}>
              No chat room yet for your area
            </div>
            <div style={{ fontSize: 12, color: "#9CA3AF", marginTop: 4, lineHeight: 1.5 }}>
              {noRoomMessage || "Check back soon, or contact support."}
            </div>
          </div>
        ) : displayed.length === 0 ? (
          <div style={{ marginTop: 40, textAlign: "center" }}>
            <div style={{ fontWeight: 600, color: "#6B7280" }}>
              {msgSearch.trim() ? "No messages match your search" : `Be the first to chat in ${areaLabel}!`}
            </div>
            <div style={{ fontSize: 12, color: "#9CA3AF", marginTop: 4 }}>
              {msgSearch.trim() ? "Try a different keyword" : "Connect with local ADIs, share tips and help each other"}
            </div>
          </div>
        ) : (
          displayed.map((m, idx) => {
            const prev = displayed[idx - 1];
            const showDateSep = !prev || new Date(prev.created_at).toDateString() !== new Date(m.created_at).toDateString();
            const isMine = m.instructor_id === userId;
            const time = new Date(m.created_at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
            const messageNode = highlightMessage(m.message, msgSearch);
            return (
              <div key={m.id}>
                {showDateSep && (
                  <div style={{ fontSize: 12, color: "#9CA3AF", textAlign: "center", padding: "8px 0" }}>
                    {new Date(m.created_at).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "short" })}
                  </div>
                )}
                {isMine ? (
                  <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
                    <div style={{ maxWidth: "75%" }}>
                      <div style={{
                        background: "#0F2044", color: "white",
                        borderRadius: "16px 16px 4px 16px", padding: "10px 14px",
                        fontSize: 13, whiteSpace: "pre-wrap", wordBreak: "break-word",
                      }}>
                        {messageNode}
                      </div>
                      <div style={{ fontSize: 10, color: "#9CA3AF", textAlign: "right", marginTop: 2 }}>{time}</div>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: "flex", justifyContent: "flex-start", gap: 8, marginBottom: 8 }}>
                    <ChatAvatar
                      name={m.instructors?.name ?? "Anon"}
                      photo={m.instructors?.profile_image_url ?? null}
                      size={32}
                    />
                    <div style={{ maxWidth: "75%" }}>
                      <div style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 600, marginBottom: 2 }}>
                        {firstName(m.instructors?.name)}
                      </div>
                      <div style={{
                        background: "white", border: "0.5px solid #E2E6ED",
                        borderRadius: "4px 16px 16px 16px", padding: "10px 14px",
                        fontSize: 13, color: "#0F2044", whiteSpace: "pre-wrap", wordBreak: "break-word",
                      }}>
                        {messageNode}
                      </div>
                      <div style={{ display: "flex", gap: 8, marginTop: 2, alignItems: "center" }}>
                        <span style={{ fontSize: 10, color: "#9CA3AF" }}>{time}</span>
                        <button
                          type="button"
                          onClick={() => flag(m)}
                          aria-label="Flag message"
                          style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex" }}
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
      </div>

      <div style={{
        background: "white", borderTop: "0.5px solid #E2E6ED",
        padding: "12px 16px",
        paddingBottom: "calc(12px + env(safe-area-inset-bottom, 0px))",
        display: "flex", alignItems: "center", gap: 8, position: "sticky", bottom: 0,
      }}>
        <ChatAvatar
          name={instructorProfile?.name ?? "You"}
          photo={instructorProfile?.profile_image_url ?? null}
          size={28}
        />
        <input
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          disabled={noRoom || !room}
          placeholder={noRoom ? "No room available yet" : `Message ${areaLabel} ADIs...`}
          style={{
            flex: 1, background: "#F7FAFC", border: "0.5px solid #E2E6ED",
            borderRadius: 20, padding: "10px 14px", fontSize: 13, outline: "none",
            opacity: noRoom || !room ? 0.6 : 1,
          }}
        />
        <button
          type="button"
          onClick={send}
          disabled={noRoom || !newMessage.trim() || !room}
          aria-label="Send"
          style={{
            width: 36, height: 36, borderRadius: "50%", border: "none",
            background: !noRoom && newMessage.trim() && room ? "#0F2044" : "#E5E7EB",
            color: "white", display: "flex", alignItems: "center", justifyContent: "center",
            cursor: !noRoom && newMessage.trim() && room ? "pointer" : "not-allowed", flexShrink: 0,
          }}
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}

function ChatAvatar({ name, photo, size }: { name: string; photo: string | null; size: number }) {
  const initials = (name || "?")
    .trim().split(/\s+/).slice(0, 2).map((s) => s[0]?.toUpperCase() ?? "").join("");
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%", background: "#1A52A0",
      color: "white", display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: Math.round(size * 0.38), fontWeight: 700, flexShrink: 0,
      backgroundImage: photo ? `url(${photo})` : undefined,
      backgroundSize: "cover", backgroundPosition: "center",
    }}>
      {!photo && initials}
    </div>
  );
}

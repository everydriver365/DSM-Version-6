import { useEffect, useRef, useState } from "react";
import { createFileRoute, useNavigate, Outlet, useRouterState } from "@tanstack/react-router";
import { ChevronLeft, Star, Users, BookOpen, Settings, FileText, ShoppingBag, Video, Mic, Briefcase, MessageCircle } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

export const Route = createFileRoute("/admin")({
  component: AdminHub,
});

type Status = "checking" | "allowed" | "denied";

function AdminTopBar({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 40,
        background: "#1877D6",
        color: "#fff",
        padding: "calc(env(safe-area-inset-top, 0px) + 12px) 16px 14px",
        display: "flex",
        alignItems: "center",
        gap: 12,
      }}
    >
      <button
        type="button"
        onClick={onBack}
        aria-label="Back"
        style={{
          width: 32,
          height: 32,
          borderRadius: "50%",
          background: "rgba(255,255,255,0.15)",
          border: "none",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          color: "#fff",
        }}
      >
        <ChevronLeft size={18} />
      </button>
      <span style={{ fontSize: 16, fontWeight: 600 }}>{title}</span>
    </div>
  );
}

export function useAdminGate() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<Status>("checking");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;
      if (!userId) {
        if (!cancelled) setStatus("denied");
        return;
      }
      const { data: adminRows, error: adminErr } = await supabase
        .from("admin_users")
        .select("role")
        .eq("user_id", userId)
        .limit(1);
      if (cancelled) return;
      if (adminErr) console.error("[admin] admin gate check error", adminErr);
      const adminCheck = adminRows?.[0] ?? null;
      setStatus(adminCheck ? "allowed" : "denied");
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // No auto-redirect on denied — show access denied screen with actions
  // so the user isn't punted into onboarding with no escape.

  return status;
}

function AdminSectionTile({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        background: "#fff",
        borderWidth: "0.5px",
        borderStyle: "solid",
        borderColor: "#EEF2F7",
        borderRadius: 12,
        padding: 16,
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        gap: 10,
        cursor: "pointer",
        textAlign: "left",
        fontFamily: "Inter, sans-serif",
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          background: "#FEECEE",
          color: "#1877D6",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {icon}
      </div>
      <div style={{ fontSize: 14, fontWeight: 600, color: "#0B1F3A" }}>{label}</div>
    </button>
  );
}

type ChatRoom = {
  id: string;
  area_name: string;
  outcode: string;
  instructor_count: number;
};

function ChatRoomsSection() {
  const [areaName, setAreaName] = useState("");
  const [outcode, setOutcode] = useState("");
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchRooms();
  }, []);

  async function fetchRooms() {
    const { data, error } = await supabase
      .from("local_chat_rooms")
      .select("id, area_name, outcode, instructor_count")
      .order("area_name", { ascending: true });
    if (error) {
      console.error("[admin] fetch rooms error", error);
      return;
    }
    setRooms((data as ChatRoom[]) || []);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!areaName.trim() || !outcode.trim()) return;
    setLoading(true);
    setError(null);
    const { error } = await supabase.from("local_chat_rooms").insert({
      area_name: areaName.trim(),
      outcode: outcode.trim().toUpperCase(),
      instructor_count: 0,
    });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setAreaName("");
    setOutcode("");
    await fetchRooms();
  }

  return (
    <div id="chat-rooms" style={{ padding: "24px 16px" }}>
      <div style={{ fontSize: 18, fontWeight: 600, color: "#0B1F3A", marginBottom: 16 }}>
        Chat rooms
      </div>
      <form onSubmit={handleCreate} style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 24 }}>
        <input
          type="text"
          placeholder="Area name (e.g. Southampton)"
          value={areaName}
          onChange={(e) => setAreaName(e.target.value)}
          style={{
            height: 44,
            borderRadius: 10,
            border: "1px solid #EEF2F7",
            padding: "0 12px",
            fontSize: 15,
            fontFamily: "Inter, sans-serif",
          }}
        />
        <input
          type="text"
          placeholder="Outcode (e.g. SO, PO)"
          value={outcode}
          onChange={(e) => setOutcode(e.target.value.toUpperCase())}
          style={{
            height: 44,
            borderRadius: 10,
            border: "1px solid #EEF2F7",
            padding: "0 12px",
            fontSize: 15,
            fontFamily: "Inter, sans-serif",
          }}
        />
        <button
          type="submit"
          disabled={loading || !areaName.trim() || !outcode.trim()}
          style={{
            height: 44,
            borderRadius: 10,
            background: "#1877D6",
            color: "#fff",
            border: "none",
            fontWeight: 600,
            cursor: "pointer",
            opacity: loading || !areaName.trim() || !outcode.trim() ? 0.6 : 1,
          }}
        >
          {loading ? "Creating…" : "Create room"}
        </button>
        {error && <div style={{ color: "#CC2229", fontSize: 13 }}>{error}</div>}
      </form>

      <div style={{ fontSize: 14, fontWeight: 600, color: "#0B1F3A", marginBottom: 12 }}>
        Existing rooms
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {rooms.length === 0 ? (
          <div style={{ color: "#6B7280", fontSize: 14 }}>No rooms yet.</div>
        ) : (
          rooms.map((room) => (
            <div
              key={room.id}
              style={{
                padding: 12,
                borderRadius: 10,
                background: "#F8FAFC",
                border: "1px solid #EEF2F7",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <div style={{ fontWeight: 600, color: "#0B1F3A", fontSize: 14 }}>{room.area_name}</div>
                <div style={{ color: "#6B7280", fontSize: 12, marginTop: 2 }}>Outcode: {room.outcode}</div>
              </div>
              <div style={{ color: "#6B7280", fontSize: 12 }}>{room.instructor_count ?? 0} instructors</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function AdminHub() {
  const navigate = useNavigate();
  const status = useAdminGate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isChildRoute = pathname !== "/admin" && pathname !== "/admin/";
  const chatRoomsRef = useRef<HTMLDivElement>(null);

  const scrollToChatRooms = () => {
    chatRoomsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // Child routes (e.g. /admin/featured) have their own admin gate and layout;
  // render the Outlet unconditionally so they mount instead of the hub.
  if (isChildRoute) return <Outlet />;

  if (status === "checking") {
    return (
      <div style={{ background: "#fff", minHeight: "100vh", padding: 24, fontFamily: "Inter, sans-serif", color: "#6B7280" }}>
        Checking access…
      </div>
    );
  }
  if (status === "denied") {
    return (
      <div style={{ background: "#fff", minHeight: "100vh", padding: 24, fontFamily: "Inter, sans-serif" }}>
        <div style={{ fontSize: 18, fontWeight: 600, color: "#1877D6" }}>Access denied</div>
        <div style={{ color: "#6B7280", marginTop: 8 }}>
          Your account doesn't have admin access.
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
          <button
            type="button"
            onClick={() => navigate({ to: "/home" })}
            style={{
              flex: 1,
              height: 44,
              borderRadius: 10,
              background: "#0B1F3A",
              color: "#fff",
              border: "none",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Go to home
          </button>
          <button
            type="button"
            onClick={async () => {
              await supabase.auth.signOut();
              navigate({ to: "/login" as never });
            }}
            style={{
              flex: 1,
              height: 44,
              borderRadius: 10,
              background: "#fff",
              color: "#1877D6",
              border: "1px solid #1877D6",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Sign out
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: "#fff", minHeight: "100vh", fontFamily: "Inter, sans-serif" }}>
      <AdminTopBar title="Admin" onBack={() => navigate({ to: "/home" })} />
      <div style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 64px)" }}>
        <div style={{ padding: 16, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <AdminSectionTile
            icon={<Star size={18} />}
            label="Featured listings"
            onClick={() => navigate({ to: "/admin/featured" })}
          />
          <AdminSectionTile
            icon={<FileText size={18} />}
            label="Applications"
            onClick={() => navigate({ to: "/admin/applications" as never })}
          />
          <AdminSectionTile
            icon={<ShoppingBag size={18} />}
            label="Marketplace listings"
            onClick={() => navigate({ to: "/admin/listings" as never })}
          />
          <AdminSectionTile
            icon={<Briefcase size={18} />}
            label="Job offers"
            onClick={() => navigate({ to: "/admin/job-offers" as never })}
          />
          <AdminSectionTile
            icon={<Video size={18} />}
            label="DSM Live"
            onClick={() => navigate({ to: "/admin/dsm-live" as never })}
          />
          <AdminSectionTile
            icon={<Mic size={18} />}
            label="Podcasts"
            onClick={() => navigate({ to: "/admin/podcasts" as never })}
          />
          <AdminSectionTile
            icon={<Users size={18} />}
            label="All instructors"
            onClick={() => navigate({ to: "/admin/applications" as never })}
          />
          <AdminSectionTile
            icon={<BookOpen size={18} />}
            label="All bookings"
            onClick={() => navigate({ to: "/bookings" as never })}
          />
          <AdminSectionTile
            icon={<Settings size={18} />}
            label="Platform settings"
            onClick={() => navigate({ to: "/settings" as never })}
          />
          <AdminSectionTile
            icon={<MessageCircle size={18} />}
            label="Chat rooms"
            onClick={scrollToChatRooms}
          />
        </div>
        <div ref={chatRoomsRef}>
          <ChatRoomsSection />
        </div>
      </div>
    </div>
  );
}

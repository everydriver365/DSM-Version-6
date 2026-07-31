import { useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ChevronLeft, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabaseClient";
import { useAdminGate } from "./admin";

export const Route = createFileRoute("/admin/chat-rooms")({
  component: AdminChatRooms,
});

type ChatRoom = {
  id: string;
  outcode: string;
  area_name: string | null;
  room_type: string | null;
  instructor_count: number | null;
  is_opt_in: boolean | null;
  created_at: string | null;
};

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

const inputStyle: React.CSSProperties = {
  height: 44,
  borderRadius: 10,
  border: "1px solid #E2E8F0",
  padding: "0 12px",
  fontSize: 15,
  fontFamily: "'Poppins', system-ui, -apple-system, sans-serif",
  color: "#0B1F3A",
  background: "#fff",
  width: "100%",
  boxSizing: "border-box",
};

function AdminChatRooms() {
  const navigate = useNavigate();
  const status = useAdminGate();

  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [loadingList, setLoadingList] = useState(true);

  const [outcode, setOutcode] = useState("");
  const [areaName, setAreaName] = useState("");
  const [roomType, setRoomType] = useState<"local" | "uk">("local");
  const [isOptIn, setIsOptIn] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Filters
  const [filterOutcode, setFilterOutcode] = useState("");
  const [filterType, setFilterType] = useState<"all" | "local" | "uk">("all");
  const [filterOptIn, setFilterOptIn] = useState<"all" | "opt-in">("all");

  useEffect(() => {
    if (status === "denied") navigate({ to: "/home" });
  }, [status, navigate]);

  useEffect(() => {
    if (status === "allowed") void fetchRooms();
  }, [status]);

  async function fetchRooms() {
    setLoadingList(true);
    const { data, error: err } = await supabase
      .from("local_chat_rooms")
      .select("id, outcode, area_name, room_type, instructor_count, is_opt_in, created_at")
      .order("outcode", { ascending: true });
    setLoadingList(false);
    if (err) {
      console.error("[admin] fetch chat rooms error", err);
      toast.error("Could not load chat rooms");
      return;
    }
    setRooms((data as ChatRoom[]) || []);
  }

  const filteredRooms = useMemo(() => {
    return rooms.filter((room) => {
      if (filterOutcode && !room.outcode.toUpperCase().includes(filterOutcode.toUpperCase().trim())) {
        return false;
      }
      if (filterType !== "all" && room.room_type !== filterType) {
        return false;
      }
      if (filterOptIn === "opt-in" && !room.is_opt_in) {
        return false;
      }
      return true;
    });
  }, [rooms, filterOutcode, filterType, filterOptIn]);

  async function handleCreate(e: React.FormEvent) {
    setError(null);
    const code = outcode.toUpperCase().trim();
    const area = areaName.trim();
    if (code.length < 2 || code.length > 4) {
      setError("Outcode must be 2–4 characters");
      return;
    }
    if (!area) {
      setError("Area name is required");
      return;
    }
    setCreating(true);
    const { data: existing, error: dupErr } = await supabase
      .from("local_chat_rooms")
      .select("id")
      .eq("outcode", code)
      .limit(1);
    if (dupErr) {
      setCreating(false);
      setError(dupErr.message);
      return;
    }
    if (existing && existing.length > 0) {
      setCreating(false);
      setError(`A room for ${code} already exists`);
      return;
    }
    const { error: insertErr } = await supabase.from("local_chat_rooms").insert({
      outcode: code,
      area_name: area,
      room_type: roomType,
      is_opt_in: isOptIn,
      instructor_count: 0,
    });
    setCreating(false);
    if (insertErr) {
      setError(insertErr.message);
      toast.error("Could not create room");
      return;
    }
    setOutcode("");
    setAreaName("");
    setRoomType("local");
    setIsOptIn(false);
    toast.success(`${code} chat room created`);
    await fetchRooms();
  }

  async function handleDelete(room: ChatRoom) {
    const ok = window.confirm(`Delete ${room.outcode} chat room? This cannot be undone.`);
    if (!ok) return;
    setDeletingId(room.id);
    const { error: delErr } = await supabase.from("local_chat_rooms").delete().eq("id", room.id);
    setDeletingId(null);
    if (delErr) {
      toast.error("Could not delete room");
      return;
    }
    toast.success(`${room.outcode} chat room deleted`);
    await fetchRooms();
  }

  if (status !== "allowed") {
    return (
      <div
        style={{
          background: "#fff",
          minHeight: "100vh",
          padding: 24,
          fontFamily: "'Poppins', system-ui, -apple-system, sans-serif",
          color: "#6B7280",
        }}
      >
        {status === "checking" ? "Checking access…" : "Access denied"}
      </div>
    );
  }

  return (
    <div
      style={{
        background: "#F8FAFC",
        minHeight: "100vh",
        fontFamily: "'Poppins', system-ui, -apple-system, sans-serif",
      }}
    >
      <AdminTopBar title="Chat rooms" onBack={() => navigate({ to: "/admin" })} />
      <div style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 64px)", padding: "calc(env(safe-area-inset-top, 0px) + 76px) 16px 40px" }}>
        {/* Create form */}
        <form
          onSubmit={handleCreate}
          style={{
            background: "#fff",
            border: "1px solid #E2E8F0",
            borderRadius: 14,
            padding: 16,
            display: "flex",
            flexDirection: "column",
            gap: 12,
            marginBottom: 20,
            boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
          }}
        >
          <div style={{ fontSize: 15, fontWeight: 700, color: "#0B1F3A" }}>Create room</div>
          <input
            type="text"
            placeholder="Outcode (e.g. SO30)"
            value={outcode}
            maxLength={4}
            onChange={(e) => setOutcode(e.target.value.toUpperCase().slice(0, 4))}
            style={inputStyle}
          />
          <input
            type="text"
            placeholder="Area name (e.g. Southampton)"
            value={areaName}
            onChange={(e) => setAreaName(e.target.value)}
            style={inputStyle}
          />
          <div style={{ display: "flex", gap: 8 }}>
            {(["local", "uk"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setRoomType(t)}
                style={{
                  flex: 1,
                  height: 40,
                  borderRadius: 10,
                  border: `1px solid ${roomType === t ? "#1877D6" : "#E2E8F0"}`,
                  background: roomType === t ? "#EAF2FC" : "#fff",
                  color: roomType === t ? "#1877D6" : "#6B7280",
                  fontWeight: 600,
                  fontSize: 14,
                  cursor: "pointer",
                  textTransform: "uppercase",
                }}
              >
                {t}
              </button>
            ))}
          </div>
          <label
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              fontSize: 14,
              color: "#0B1F3A",
              cursor: "pointer",
            }}
          >
            Opt-in only
            <input
              type="checkbox"
              checked={isOptIn}
              onChange={(e) => setIsOptIn(e.target.checked)}
              style={{ width: 18, height: 18, accentColor: "#1877D6" }}
            />
          </label>
          {error && <div style={{ color: "#CC2229", fontSize: 13 }}>{error}</div>}
          <button
            type="submit"
            disabled={creating}
            style={{
              height: 44,
              borderRadius: 10,
              background: "#1877D6",
              color: "#fff",
              border: "none",
              fontWeight: 600,
              fontSize: 15,
              cursor: "pointer",
              opacity: creating ? 0.6 : 1,
            }}
          >
            {creating ? "Creating…" : "Create room"}
          </button>
        </form>

        {/* List */}
        <div style={{ fontSize: 14, fontWeight: 700, color: "#0B1F3A", marginBottom: 10 }}>
          Existing rooms{rooms.length ? ` (${rooms.length})` : ""}
        </div>
        {loadingList ? (
          <div style={{ color: "#6B7280", fontSize: 14 }}>Loading…</div>
        ) : rooms.length === 0 ? (
          <div style={{ color: "#6B7280", fontSize: 14 }}>No rooms yet.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {rooms.map((room) => (
              <div
                key={room.id}
                style={{
                  background: "#fff",
                  border: "1px solid #E2E8F0",
                  borderRadius: 14,
                  padding: 14,
                  boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
                }}
              >
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 16, fontWeight: 700, color: "#0B1F3A" }}>{room.outcode}</div>
                    <div style={{ fontSize: 13, color: "#6B7280", marginTop: 2 }}>{room.area_name || "—"}</div>
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: "#1877D6",
                      background: "#EAF2FC",
                      borderRadius: 999,
                      padding: "4px 10px",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {room.instructor_count ?? 0} instructors
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      textTransform: "uppercase",
                      color: room.room_type === "uk" ? "#0B1F3A" : "#166534",
                      background: room.room_type === "uk" ? "#E7EBF2" : "#DCFCE7",
                      borderRadius: 999,
                      padding: "3px 8px",
                    }}
                  >
                    {room.room_type || "local"}
                  </span>
                  {room.is_opt_in && (
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        color: "#92400E",
                        background: "#FEF3C7",
                        borderRadius: 999,
                        padding: "3px 8px",
                      }}
                    >
                      Opt-in
                    </span>
                  )}
                  <span style={{ fontSize: 11, color: "#9CA3AF" }}>
                    {room.created_at ? new Date(room.created_at).toLocaleDateString("en-GB") : ""}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleDelete(room)}
                    disabled={deletingId === room.id}
                    style={{
                      marginLeft: "auto",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      height: 32,
                      padding: "0 12px",
                      borderRadius: 10,
                      border: "1px solid #CC2229",
                      background: "#fff",
                      color: "#CC2229",
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: "pointer",
                      opacity: deletingId === room.id ? 0.6 : 1,
                    }}
                  >
                    <Trash2 size={14} />
                    {deletingId === room.id ? "Deleting…" : "Delete"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

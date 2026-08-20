import { useEffect, useMemo, useState } from "react";
import { tokens } from "@/lib/tokens";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { IconCheck, IconChevronLeft, IconTrash } from "@tabler/icons-react";
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
        background: tokens.navy,
        color: "#fff",
        padding: "calc(env(safe-area-inset-top, 0px) + 12px) 16px 16px",
        borderRadius: "0 0 8px 8px",
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
          width: 34,
          height: 34,
          borderRadius: "50%",
          background: "rgba(255,255,255,0.08)",
          border: "none",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          color: "#fff",
          flexShrink: 0,
        }}
      >
        <IconChevronLeft size={18} />
      </button>
      <span style={{ fontSize: 24, fontWeight: tokens.fontWeight.extrabold, letterSpacing: "-0.4px", color: "#fff" }}>{title}</span>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  background: "#F2F2F7",
  borderRadius: 8,
  border: "none",
  padding: "13px 15px",
  fontSize: tokens.fontSize.md,
  fontFamily: "Poppins, sans-serif",
  color: "#000",
  width: "100%",
  boxSizing: "border-box",
  outline: "none",
};

const segmentWrapStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "row",
  background: "#F2F2F7",
  borderRadius: 8,
  padding: 4,
};

function segmentStyle(active: boolean): React.CSSProperties {
  return {
    flex: 1,
    padding: "11px 4px",
    borderRadius: 8,
    fontSize: tokens.fontSize.md,
    fontWeight: tokens.fontWeight.bold,
    textAlign: "center",
    border: "none",
    cursor: "pointer",
    fontFamily: "Poppins, sans-serif",
    background: active ? "#fff" : "transparent",
    color: active ? "#1877D6" : "#6B6B6F",
    boxShadow: active ? "0 2px 6px rgba(0,0,0,0.08)" : "none",
  };
}

function DSMCheckbox({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <span style={{ display: "inline-flex", position: "relative", width: 22, height: 22, flexShrink: 0 }}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        style={{ position: "absolute", inset: 0, opacity: 0, margin: 0, width: 22, height: 22, cursor: "pointer" }}
      />
      <span
        style={{
          width: 22,
          height: 22,
          borderRadius: 8,
          border: `1.5px solid ${checked ? "#1877D6" : "#D1D1D6"}`,
          background: checked ? "#1877D6" : "transparent",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          pointerEvents: "none",
        }}
      >
        {checked && <IconCheck size={12} color="#fff" stroke={3} />}
      </span>
    </span>
  );
}

function titleCase(value: string) {
  return value.replace(/\S+/g, (w) => (w.length > 4 ? w[0].toUpperCase() + w.slice(1).toLowerCase() : w));
}


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
          fontFamily: "Poppins, sans-serif",
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
        fontFamily: "Poppins, sans-serif",
      }}
    >
      <AdminTopBar title="Chat rooms" onBack={() => navigate({ to: "/admin" })} />
      <div style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 64px)", padding: "calc(env(safe-area-inset-top, 0px) + 76px) 16px 40px" }}>
        {/* Create form */}
        <form
          onSubmit={handleCreate}
          style={{
            background: "#fff",
            border: "none",
            borderRadius: 8,
            padding: 18,
            display: "flex",
            flexDirection: "column",
            gap: 12,
            marginBottom: 22,
            boxShadow: "0 4px 0 #E4E4E8, 0 14px 30px rgba(0,0,0,0.06)",
          }}
        >
          <div style={{ fontSize: 17, fontWeight: tokens.fontWeight.extrabold, color: "#000", letterSpacing: "-0.2px", marginBottom: 2 }}>
            Create room
          </div>
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
          <div style={segmentWrapStyle}>
            {(["local", "uk"] as const).map((t) => (
              <button key={t} type="button" onClick={() => setRoomType(t)} style={segmentStyle(roomType === t)}>
                {t === "uk" ? "UK" : "Local"}
              </button>
            ))}
          </div>
          <label
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              fontSize: tokens.fontSize.md,
              color: "#000",
              fontWeight: tokens.fontWeight.semibold,
              cursor: "pointer",
            }}
          >
            Opt-in only
            <DSMCheckbox checked={isOptIn} onChange={setIsOptIn} />
          </label>
          {error && <div style={{ color: tokens.red, fontSize: 13 }}>{error}</div>}
          <button
            type="submit"
            disabled={creating}
            style={{
              width: "100%",
              padding: 15,
              borderRadius: 8,
              background: tokens.blue,
              color: "#fff",
              border: "none",
              fontWeight: tokens.fontWeight.extrabold,
              fontSize: 15,
              fontFamily: "Poppins, sans-serif",
              cursor: "pointer",
              boxShadow: "0 4px 0 #0F52A8",
              opacity: creating ? 0.6 : 1,
            }}
          >
            {creating ? "Creating…" : "Create room"}
          </button>
        </form>

        {/* List */}
        <div style={{ fontSize: 19, fontWeight: tokens.fontWeight.extrabold, color: "#000", letterSpacing: "-0.3px", marginBottom: 12 }}>
          Existing rooms
          {filteredRooms.length ? (
            <span style={{ fontSize: 15, fontWeight: tokens.fontWeight.medium, color: "#8A8A8E" }}> ({filteredRooms.length})</span>
          ) : null}
        </div>


        {/* Filters */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
          <input
            type="text"
            placeholder="Search outcode…"
            value={filterOutcode}
            onChange={(e) => setFilterOutcode(e.target.value.toUpperCase())}
            style={{
              background: "#fff",
              border: "none",
              borderRadius: 8,
              padding: "13px 16px",
              fontSize: tokens.fontSize.md,
              fontFamily: "Poppins, sans-serif",
              color: "#000",
              width: "100%",
              boxSizing: "border-box",
              outline: "none",
              boxShadow: "0 4px 0 #E4E4E8, 0 10px 22px rgba(0,0,0,0.05)",
            }}
          />
          <div style={segmentWrapStyle}>
            {(["all", "local", "uk"] as const).map((t) => (
              <button key={t} type="button" onClick={() => setFilterType(t)} style={segmentStyle(filterType === t)}>
                {t === "uk" ? "UK" : t === "all" ? "All" : "Local"}
              </button>
            ))}
          </div>
          <label
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              fontSize: tokens.fontSize.md,
              fontWeight: tokens.fontWeight.semibold,
              color: "#000",
              cursor: "pointer",
              background: "#fff",
              border: "none",
              borderRadius: 8,
              padding: "13px 16px",
              boxShadow: "0 4px 0 #E4E4E8, 0 10px 22px rgba(0,0,0,0.05)",
            }}
          >
            Opt-in only
            <DSMCheckbox
              checked={filterOptIn === "opt-in"}
              onChange={(v) => setFilterOptIn(v ? "opt-in" : "all")}
            />
          </label>

        </div>

        {loadingList ? (
          <div style={{ color: "#6B7280", fontSize: 14 }}>Loading…</div>
        ) : filteredRooms.length === 0 ? (
          <div style={{ color: "#6B7280", fontSize: 14 }}>No rooms match your filters.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {filteredRooms.map((room) => (
              <div
                key={room.id}
                style={{
                  background: "#fff",
                  border: "none",
                  borderRadius: 8,
                  padding: 16,
                  boxShadow: "0 4px 0 #E4E4E8, 0 12px 26px rgba(0,0,0,0.06)",
                }}
              >
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 16.5, fontWeight: tokens.fontWeight.extrabold, color: "#000", letterSpacing: "-0.2px" }}>
                      {room.outcode}
                    </div>
                    <div style={{ fontSize: tokens.fontSize.base, fontWeight: tokens.fontWeight.medium, color: "#8A8A8E", marginTop: 4 }}>
                      {room.area_name ? titleCase(room.area_name) : "—"}
                    </div>
                  </div>
                  <div
                    style={{
                      fontSize: tokens.fontSize.sm,
                      fontWeight: tokens.fontWeight.extrabold,
                      color: tokens.blue,
                      background: "#E7F1FC",
                      borderRadius: 8,
                      padding: "5px 11px",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {room.instructor_count ?? 0} instructors
                  </div>
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginTop: 14,
                    paddingTop: 13,
                    borderTop: "1px solid #F0F0F2",
                    flexWrap: "wrap",
                  }}
                >
                  <span
                    style={{
                      fontSize: 10.5,
                      fontWeight: tokens.fontWeight.extrabold,
                      textTransform: "uppercase",
                      color: room.room_type === "uk" ? "#1877D6" : "#248A3D",
                      background: room.room_type === "uk" ? "#E7F1FC" : "#E6F7EC",
                      borderRadius: 8,
                      padding: "4px 10px",
                    }}
                  >
                    {room.room_type || "local"}
                  </span>
                  {room.is_opt_in && (
                    <span
                      style={{
                        fontSize: 11.5,
                        fontWeight: tokens.fontWeight.extrabold,
                        color: "#B45309",
                        background: "#FEF3C7",
                        borderRadius: 999,
                        padding: "4px 10px",
                      }}
                    >
                      Opt-in
                    </span>
                  )}
                  <span style={{ fontSize: 11.5, color: "#B0B0B5" }}>
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
                      padding: "8px 14px",
                      borderRadius: 8,
                      border: "1.5px solid #FF3B30",
                      background: "#fff",
                      color: "#FF3B30",
                      fontSize: 12.5,
                      fontWeight: tokens.fontWeight.bold,
                      fontFamily: "Poppins, sans-serif",
                      cursor: "pointer",
                      opacity: deletingId === room.id ? 0.6 : 1,
                    }}
                  >
                    <IconTrash size={12} />
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

import { useEffect, useRef, useState } from "react";
import { createFileRoute, useNavigate, Outlet, useRouterState } from "@tanstack/react-router";
import { ChevronLeft, Star, Users, BookOpen, Settings, FileText, FileCheck, ShoppingBag, Video, Mic, Briefcase, MessageCircle, PlayCircle, Pencil, Trash2, Flag, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
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
  is_opt_in: boolean | null;
  description: string | null;
  image_url: string | null;
  deleted_at: string | null;
};

type FlaggedMessage = {
  id: string;
  message: string;
  created_at: string;
  instructor_id: string | null;
  room_id: string | null;
  flagged_by: string[] | null;
  instructors: { name: string | null } | null;
  local_chat_rooms: { area_name: string | null } | null;
};

function FlaggedMessagesSection() {
  const [rows, setRows] = useState<FlaggedMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmBanId, setConfirmBanId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("local_chat_messages")
      .select("*, instructors(name), local_chat_rooms(area_name)")
      .eq("is_flagged", true)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });
    if (error) console.error("[admin] flagged messages", error);
    setRows((data ?? []) as unknown as FlaggedMessage[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const removeMessage = async (m: FlaggedMessage) => {
    setBusyId(m.id);
    const { error } = await supabase
      .from("local_chat_messages")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", m.id);
    setBusyId(null);
    if (error) { toast.error("Couldn't remove message"); return; }
    toast.success("Message removed");
    load();
  };

  const dismiss = async (m: FlaggedMessage) => {
    setBusyId(m.id);
    const { error } = await supabase
      .from("local_chat_messages")
      .update({ is_flagged: false, flagged_by: [] })
      .eq("id", m.id);
    setBusyId(null);
    if (error) { toast.error("Couldn't dismiss report"); return; }
    toast.success("Report dismissed");
    load();
  };

  const banUser = async (m: FlaggedMessage) => {
    setBusyId(m.id);
    const { data: userData } = await supabase.auth.getUser();
    const { error } = await supabase.from("chat_bans").insert({
      instructor_id: m.instructor_id,
      room_id: m.room_id,
      banned_by: userData?.user?.id ?? null,
      reason: "Flagged message: " + (m.message ?? "").slice(0, 100),
    });
    if (error) {
      setBusyId(null);
      toast.error("Couldn't ban user");
      return;
    }
    await supabase
      .from("local_chat_messages")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", m.id);
    setBusyId(null);
    setConfirmBanId(null);
    toast.success("User banned and message removed");
    load();
  };

  return (
    <div style={{ padding: "0 16px 32px" }}>
      <div style={{ fontSize: 15, fontWeight: 700, color: "#0B1F3A", margin: "8px 0 12px" }}>
        Flagged messages
      </div>

      {loading ? (
        <div style={{ fontSize: 13, color: "#8A93A3" }}>Loading…</div>
      ) : rows.length === 0 ? (
        <div style={{
          background: "#fff", border: "0.5px solid #EEF2F7", borderRadius: 12,
          padding: 24, textAlign: "center",
        }}>
          <ShieldCheck size={32} color="#16A34A" style={{ margin: "0 auto 8px" }} />
          <div style={{ fontSize: 13, fontWeight: 600, color: "#0B1F3A" }}>
            No flagged messages — all clear
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {rows.map((m) => {
            const reports = (m.flagged_by ?? []).length;
            const roomName = m.local_chat_rooms?.area_name ?? "Unknown room";
            const who = m.instructors?.name ?? "Unknown instructor";
            const when = new Date(m.created_at).toLocaleString("en-GB", {
              day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
            });
            const busy = busyId === m.id;
            return (
              <div
                key={m.id}
                style={{
                  background: "#fff", border: "0.5px solid #EEF2F7", borderRadius: 12,
                  padding: 14, boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "baseline" }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#0B1F3A" }}>{roomName}</div>
                  <div style={{
                    fontSize: 11, fontWeight: 700, color: "#CC2229",
                    background: "#FEF2F2", borderRadius: 999, padding: "2px 8px", flexShrink: 0,
                  }}>
                    {reports} report{reports === 1 ? "" : "s"}
                  </div>
                </div>
                <div style={{ fontSize: 12, color: "#8A93A3", marginTop: 2 }}>
                  {who} · {when}
                </div>
                <div style={{
                  marginTop: 8, fontSize: 13, color: "#0B1F3A", lineHeight: 1.45,
                  background: "#F7FAFC", borderRadius: 8, padding: "10px 12px",
                  whiteSpace: "pre-wrap", wordBreak: "break-word",
                }}>
                  {m.message}
                </div>

                {confirmBanId === m.id ? (
                  <div style={{
                    marginTop: 10, background: "#FEF2F2", border: "0.5px solid #FCA5A5",
                    borderRadius: 10, padding: 12,
                  }}>
                    <div style={{ fontSize: 12.5, color: "#7F1D1D", lineHeight: 1.45 }}>
                      Ban {who} from {roomName}? They will no longer be able to send messages.
                    </div>
                    <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => banUser(m)}
                        style={{
                          flex: 1, height: 36, borderRadius: 8, border: "none",
                          background: "#991B1B", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer",
                        }}
                      >
                        Confirm ban
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmBanId(null)}
                        style={{
                          flex: 1, height: 36, borderRadius: 8, background: "#fff",
                          border: "1px solid #D1D5DB", color: "#374151", fontSize: 13, fontWeight: 600, cursor: "pointer",
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => removeMessage(m)}
                      style={{
                        flex: 1, minWidth: 110, height: 36, borderRadius: 8, background: "#fff",
                        border: "1px solid #CC2229", color: "#CC2229", fontSize: 12.5, fontWeight: 600, cursor: "pointer",
                      }}
                    >
                      Remove message
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => dismiss(m)}
                      style={{
                        flex: 1, minWidth: 84, height: 36, borderRadius: 8, background: "#fff",
                        border: "1px solid #D1D5DB", color: "#6B7280", fontSize: 12.5, fontWeight: 600, cursor: "pointer",
                      }}
                    >
                      Dismiss
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => setConfirmBanId(m.id)}
                      style={{
                        flex: 1, minWidth: 84, height: 36, borderRadius: 8, border: "none",
                        background: "#991B1B", color: "#fff", fontSize: 12.5, fontWeight: 700, cursor: "pointer",
                      }}
                    >
                      Ban user
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}


function ChatRoomsSection() {
  const [areaName, setAreaName] = useState("");
  const [outcode, setOutcode] = useState("");
  const [isOptIn, setIsOptIn] = useState(false);
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Inline edit panel state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editImage, setEditImage] = useState<string | null>(null);
  const [editPrivate, setEditPrivate] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [showDeleted, setShowDeleted] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    fetchRooms();
  }, [showDeleted]);

  async function fetchRooms() {
    let q = supabase
      .from("local_chat_rooms")
      .select("id, area_name, outcode, instructor_count, is_opt_in, description, image_url, deleted_at");
    q = showDeleted ? q.not("deleted_at", "is", null) : q.is("deleted_at", null);
    const { data, error } = await q.order("area_name", { ascending: true });
    if (error) {
      console.error("[admin] fetch rooms error", error);
      return;
    }
    setRooms((data as ChatRoom[]) || []);
  }

  async function softDeleteRoom(room: ChatRoom) {
    setDeletingId(room.id);
    const { error } = await supabase
      .from("local_chat_rooms")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", room.id);
    setDeletingId(null);
    if (error) {
      toast.error("Could not delete room");
      return;
    }
    toast.success("Room deleted");
    if (editingId === room.id) cancelEdit();
    await fetchRooms();
  }

  async function restoreRoom(room: ChatRoom) {
    setDeletingId(room.id);
    const { error } = await supabase
      .from("local_chat_rooms")
      .update({ deleted_at: null })
      .eq("id", room.id);
    setDeletingId(null);
    if (error) {
      toast.error("Could not restore room");
      return;
    }
    toast.success("Room restored");
    await fetchRooms();
  }

  function startEdit(room: ChatRoom) {
    setEditingId(room.id);
    setEditName(room.area_name ?? "");
    setEditDesc(room.description ?? "");
    setEditImage(room.image_url ?? null);
    setEditPrivate(!!room.is_opt_in);
  }

  function cancelEdit() {
    setEditingId(null);
    setUploading(false);
    setEditSaving(false);
  }

  async function handleImageUpload(room: ChatRoom, file: File) {
    setUploading(true);
    const { error: upErr } = await supabase.storage
      .from("chat-room-images")
      .upload(room.id + ".jpg", file, { upsert: true, contentType: file.type || "image/jpeg" });
    if (upErr) {
      setUploading(false);
      toast.error("Image upload failed");
      return;
    }
    const { data: urlData } = supabase.storage
      .from("chat-room-images")
      .getPublicUrl(room.id + ".jpg");
    setEditImage(`${urlData.publicUrl}?t=${Date.now()}`);
    setUploading(false);
  }

  async function saveEdit(room: ChatRoom) {
    if (!editName.trim()) return;
    setEditSaving(true);
    const { error } = await supabase
      .from("local_chat_rooms")
      .update({
        area_name: editName.trim(),
        description: editDesc.trim() || null,
        image_url: editImage,
        is_opt_in: editPrivate,
      })
      .eq("id", room.id);
    setEditSaving(false);
    if (error) {
      toast.error("Could not update room");
      return;
    }
    toast.success("Room updated");
    setEditingId(null);
    await fetchRooms();
  }

  async function toggleOptIn(room: ChatRoom) {
    setSavingId(room.id);
    const { error } = await supabase
      .from("local_chat_rooms")
      .update({ is_opt_in: !room.is_opt_in })
      .eq("id", room.id);
    setSavingId(null);
    if (error) {
      setError(error.message);
      return;
    }
    await fetchRooms();
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
      is_opt_in: isOptIn,
    });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setAreaName("");
    setOutcode("");
    setIsOptIn(false);
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
          type="button"
          onClick={() => setIsOptIn((v) => !v)}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            height: 44,
            borderRadius: 10,
            border: "1px solid #EEF2F7",
            background: "#F8FAFC",
            padding: "0 12px",
            cursor: "pointer",
            textAlign: "left",
          }}
        >
          <span style={{ fontSize: 13, color: "#0B1F3A", fontWeight: 600 }}>
            Invite only <span style={{ color: "#6B7280", fontWeight: 400 }}>— hidden from room browser</span>
          </span>
          <span
            style={{
              width: 42,
              height: 24,
              borderRadius: 999,
              background: isOptIn ? "#1877D6" : "#CBD5E1",
              position: "relative",
              flexShrink: 0,
              transition: "background 0.15s",
            }}
          >
            <span
              style={{
                position: "absolute",
                top: 2,
                left: isOptIn ? 20 : 2,
                width: 20,
                height: 20,
                borderRadius: "50%",
                background: "#fff",
                boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
                transition: "left 0.15s",
              }}
            />
          </span>
        </button>
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

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
          marginBottom: 12,
        }}
      >
        <div style={{ fontSize: 14, fontWeight: 600, color: "#0B1F3A" }}>
          {showDeleted ? "Deleted rooms" : "Existing rooms"}
        </div>
        <button
          type="button"
          onClick={() => setShowDeleted((v) => !v)}
          style={{
            height: 30,
            padding: "0 12px",
            borderRadius: 8,
            border: "1px solid #E4E8EF",
            background: showDeleted ? "#EAF2FC" : "#fff",
            color: showDeleted ? "#1877D6" : "#6B7280",
            fontSize: 12,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          {showDeleted ? "Show active" : "Show deleted"}
        </button>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {rooms.length === 0 ? (
          <div style={{ color: "#6B7280", fontSize: 14 }}>
            {showDeleted ? "No deleted rooms." : "No rooms yet."}
          </div>
        ) : (
          rooms.map((room) => (
            <div
              key={room.id}
              style={{
                padding: 12,
                borderRadius: 10,
                background: "#F8FAFC",
                border: "1px solid #EEF2F7",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                  {room.image_url ? (
                    <img
                      src={room.image_url}
                      alt=""
                      style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
                    />
                  ) : null}
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ fontWeight: 600, color: "#0B1F3A", fontSize: 14 }}>{room.area_name}</div>
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          borderRadius: 999,
                          padding: "2px 8px",
                          background: room.is_opt_in ? "#F1F3F7" : "#EAF2FC",
                          color: room.is_opt_in ? "#6B7280" : "#1877D6",
                        }}
                      >
                        {room.is_opt_in ? "Private" : "Public"}
                      </span>
                    </div>
                    <div style={{ color: "#6B7280", fontSize: 12, marginTop: 2 }}>Outcode: {room.outcode}</div>
                    {room.description ? (
                      <div
                        style={{
                          color: "#6B7686",
                          fontSize: 12,
                          marginTop: 2,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {room.description}
                      </div>
                    ) : null}
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                  <div style={{ color: "#6B7280", fontSize: 12 }}>{room.instructor_count ?? 0}</div>
                  {room.deleted_at ? (
                    <button
                      type="button"
                      onClick={() => void restoreRoom(room)}
                      disabled={deletingId === room.id}
                      style={{
                        height: 30,
                        padding: "0 12px",
                        borderRadius: 8,
                        border: "1px solid #EEF2F7",
                        background: "#fff",
                        color: "#1877D6",
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: "pointer",
                        opacity: deletingId === room.id ? 0.6 : 1,
                      }}
                    >
                      {deletingId === room.id ? "Restoring…" : "Restore"}
                    </button>
                  ) : (
                    <>
                  <button
                    type="button"
                    aria-label="Edit room"
                    onClick={() => (editingId === room.id ? cancelEdit() : startEdit(room))}
                    style={{
                      height: 30,
                      width: 30,
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      borderRadius: 8,
                      border: "1px solid #E4E8EF",
                      background: "#fff",
                      color: "#6B7280",
                      cursor: "pointer",
                    }}
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    type="button"
                    aria-label="Delete room"
                    onClick={() => void softDeleteRoom(room)}
                    disabled={deletingId === room.id}
                    style={{
                      height: 30,
                      width: 30,
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      borderRadius: 8,
                      border: "1px solid #F3D5D7",
                      background: "#fff",
                      color: "#CC2229",
                      cursor: "pointer",
                      opacity: deletingId === room.id ? 0.6 : 1,
                    }}
                  >
                    <Trash2 size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleOptIn(room)}
                    disabled={savingId === room.id}
                    style={{
                      height: 30,
                      padding: "0 12px",
                      borderRadius: 8,
                      border: "1px solid #EEF2F7",
                      background: "#fff",
                      color: "#1877D6",
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: "pointer",
                      opacity: savingId === room.id ? 0.6 : 1,
                    }}
                  >
                    {savingId === room.id ? "Saving…" : room.is_opt_in ? "Make public" : "Make private"}
                  </button>
                    </>
                  )}
                </div>
              </div>

              {editingId === room.id && (
                <div
                  style={{
                    marginTop: 12,
                    paddingTop: 12,
                    borderTop: "1px solid #E4E8EF",
                    display: "flex",
                    flexDirection: "column",
                    gap: 10,
                  }}
                >
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="Area name"
                    style={{
                      height: 40,
                      borderRadius: 10,
                      border: "1px solid #E4E8EF",
                      padding: "0 12px",
                      fontSize: 14,
                      background: "#fff",
                    }}
                  />
                  <textarea
                    value={editDesc}
                    onChange={(e) => setEditDesc(e.target.value)}
                    placeholder="What is this room about?"
                    rows={3}
                    style={{
                      borderRadius: 10,
                      border: "1px solid #E4E8EF",
                      padding: 10,
                      fontSize: 14,
                      background: "#fff",
                      resize: "vertical",
                      fontFamily: "Inter, sans-serif",
                    }}
                  />
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    {editImage ? (
                      <img
                        src={editImage}
                        alt=""
                        style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover" }}
                      />
                    ) : null}
                    <label
                      style={{
                        height: 34,
                        display: "inline-flex",
                        alignItems: "center",
                        padding: "0 12px",
                        borderRadius: 8,
                        border: "1px solid #E4E8EF",
                        background: "#fff",
                        color: "#1877D6",
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: uploading ? "default" : "pointer",
                        opacity: uploading ? 0.6 : 1,
                      }}
                    >
                      {uploading ? "Uploading…" : editImage ? "Replace image" : "Upload image"}
                      <input
                        type="file"
                        accept="image/*"
                        style={{ display: "none" }}
                        disabled={uploading}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          e.target.value = "";
                          if (file) void handleImageUpload(room, file);
                        }}
                      />
                    </label>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditPrivate((v) => !v)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 12,
                      height: 40,
                      borderRadius: 10,
                      border: "1px solid #E4E8EF",
                      background: "#fff",
                      padding: "0 12px",
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                  >
                    <span style={{ fontSize: 13, color: "#0B1F3A", fontWeight: 600 }}>Private room</span>
                    <span
                      style={{
                        width: 42,
                        height: 24,
                        borderRadius: 999,
                        background: editPrivate ? "#1877D6" : "#CBD5E1",
                        position: "relative",
                        flexShrink: 0,
                        transition: "background 0.15s",
                      }}
                    >
                      <span
                        style={{
                          position: "absolute",
                          top: 2,
                          left: editPrivate ? 20 : 2,
                          width: 20,
                          height: 20,
                          borderRadius: "50%",
                          background: "#fff",
                          transition: "left 0.15s",
                        }}
                      />
                    </span>
                  </button>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      type="button"
                      onClick={() => void saveEdit(room)}
                      disabled={editSaving || uploading || !editName.trim()}
                      style={{
                        flex: 1,
                        height: 40,
                        borderRadius: 10,
                        background: "#1877D6",
                        color: "#fff",
                        border: "none",
                        fontWeight: 600,
                        cursor: "pointer",
                        opacity: editSaving || uploading || !editName.trim() ? 0.6 : 1,
                      }}
                    >
                      {editSaving ? "Saving…" : "Save changes"}
                    </button>
                    <button
                      type="button"
                      onClick={cancelEdit}
                      style={{
                        flex: 1,
                        height: 40,
                        borderRadius: 10,
                        background: "#fff",
                        color: "#0B1F3A",
                        border: "1px solid #E4E8EF",
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
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
  const flaggedRef = useRef<HTMLDivElement>(null);

  const scrollToChatRooms = () => {
    chatRoomsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const scrollToFlagged = () => {
    flaggedRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
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
            icon={<FileCheck size={18} />}
            label="Platform terms"
            onClick={() => navigate({ to: "/admin/terms" as never })}
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
            icon={<PlayCircle size={18} />}
            label="Learn videos"
            onClick={() => navigate({ to: "/admin/learn-videos" as never })}
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
          <AdminSectionTile
            icon={<Flag size={18} />}
            label="Flagged"
            onClick={scrollToFlagged}
          />
        </div>
        <div ref={chatRoomsRef}>
          <ChatRoomsSection />
        </div>
        <div ref={flaggedRef}>
          <FlaggedMessagesSection />
        </div>

      </div>
    </div>
  );
}

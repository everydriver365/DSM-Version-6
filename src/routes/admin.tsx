import { useEffect, useMemo, useRef, useState } from "react";
import { tokens } from "@/lib/tokens";
import { PartnerPreview, PerkPreview } from "@/components/admin/BenefitPreview";
import { createFileRoute, useNavigate, Outlet, useRouterState } from "@tanstack/react-router";
import { IconBook, IconBriefcase, IconGift, IconChevronLeft, IconChevronRight, IconFileCheck, IconFileText, IconFlag, IconMessageCircle, IconMicrophone, IconNews, IconPencil, IconPhoto, IconPlayerPlay, IconSearch, IconSettings, IconShieldCheck, IconShoppingBag, IconStar, IconTrash, IconUsers, IconVideo, IconX } from "@tabler/icons-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabaseClient";
import { DSMToggle } from "@/components/dsm/DSMToggle";
import type React from "react";



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
        background: tokens.navy,
        color: "#fff",
        padding: "calc(env(safe-area-inset-top, 0px) + 12px) 16px 16px",
        display: "flex",
        alignItems: "center",
        gap: 12,
        borderRadius: "0 0 16px 16px",
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
          padding: 0,
        }}
      >
        <IconChevronLeft stroke={1.8} size={18} color="#fff" />
      </button>
      <span style={{ fontSize: 26, fontWeight: tokens.fontWeight.extrabold, color: "#fff", letterSpacing: "-0.5px" }}>
        {title}
      </span>
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

function AdminGroupLabel({ children, first }: { children: React.ReactNode; first?: boolean }) {
  return (
    <div
      style={{
        color: "#8A8A8E",
        fontSize: 12,
        fontWeight: tokens.fontWeight.bold,
        letterSpacing: "0.5px",
        textTransform: "uppercase",
        margin: first ? "4px 4px 10px" : "22px 4px 10px",
      }}
    >
      {children}
    </div>
  );
}

function AdminGroupCard({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        background: "#fff",
        borderRadius: tokens.radiusCard,
        overflow: "hidden",
        boxShadow: "0 1px 2px rgba(0,0,0,0.04), 0 6px 16px rgba(0,0,0,0.05)",
      }}
    >
      {children}
    </div>
  );
}

function AdminSectionTile({
  icon,
  label,
  subtitle,
  onClick,
  first,
}: {
  icon: React.ReactNode;
  label: string;
  subtitle?: string;
  onClick: () => void;
  first?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: "100%",
        background: "#fff",
        border: "none",
        borderTop: first ? "none" : "1px solid #EFEFF2",
        padding: "14px 16px",
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        cursor: "pointer",
        textAlign: "left",
        fontFamily: "Poppins, sans-serif",
      }}
    >
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 12,
          background: "#F2F2F7",
          color: "#000",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15, fontWeight: tokens.fontWeight.semibold, color: "#000" }}>{label}</div>
        {subtitle && (
          <div style={{ fontSize: 12, color: "#8A8A8E", marginTop: 1 }}>{subtitle}</div>
        )}
      </div>
      <IconChevronRight size={14} stroke={2} color="#C7C7CC" style={{ flexShrink: 0 }} />
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
      <div style={{ fontSize: 15, fontWeight: tokens.fontWeight.bold, color: tokens.navy, margin: "8px 0 12px" }}>
        Flagged messages
      </div>

      {loading ? (
        <div style={{ fontSize: tokens.fontSize.base, color: "#8A93A3" }}>Loading…</div>
      ) : rows.length === 0 ? (
        <div style={{
          background: "#fff", border: "0.5px solid #EEF2F7", borderRadius: tokens.radiusCard,
          padding: 24, textAlign: "center",
        }}>
          <IconShieldCheck stroke={1.5} size={32} color="#16A34A" style={{ margin: "0 auto 8px" }} />
          <div style={{ fontSize: tokens.fontSize.base, fontWeight: tokens.fontWeight.semibold, color: tokens.navy }}>
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
                  background: "#fff", border: "0.5px solid #EEF2F7", borderRadius: tokens.radiusCard,
                  padding: 16, boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "baseline" }}>
                  <div style={{ fontSize: tokens.fontSize.base, fontWeight: tokens.fontWeight.bold, color: tokens.navy }}>{roomName}</div>
                  <div style={{
                    fontSize: tokens.fontSize.sm, fontWeight: tokens.fontWeight.bold, color: tokens.red,
                    background: "#FEF2F2", borderRadius: 999, padding: "2px 8px", flexShrink: 0,
                  }}>
                    {reports} report{reports === 1 ? "" : "s"}
                  </div>
                </div>
                <div style={{ fontSize: 12, color: "#8A93A3", marginTop: 2 }}>
                  {who} · {when}
                </div>
                <div style={{
                  marginTop: 8, fontSize: tokens.fontSize.base, color: tokens.navy, lineHeight: 1.45,
                  background: "#F7FAFC", borderRadius: tokens.radiusCard, padding: "12px 16px",
                  whiteSpace: "pre-wrap", wordBreak: "break-word",
                }}>
                  {m.message}
                </div>

                {confirmBanId === m.id ? (
                  <div style={{
                    marginTop: 10, background: "#FEF2F2", border: "0.5px solid #FCA5A5",
                    borderRadius: tokens.radiusCard, padding: 16,
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
                          flex: 1, height: 36, borderRadius: 12, border: "none",
                          background: "#B91C1C", color: "#fff", fontSize: tokens.fontSize.base, fontWeight: tokens.fontWeight.bold, cursor: "pointer",
                        }}
                      >
                        Confirm ban
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmBanId(null)}
                        style={{
                          flex: 1, height: 36, borderRadius: 12, background: "#fff",
                          border: "1px solid #D1D5DB", color: "#374151", fontSize: tokens.fontSize.base, fontWeight: tokens.fontWeight.semibold, cursor: "pointer",
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
                        flex: 1, minWidth: 110, height: 36, borderRadius: 12, background: "#fff",
                        border: "1px solid #CC2229", color: tokens.red, fontSize: 12.5, fontWeight: tokens.fontWeight.semibold, cursor: "pointer",
                      }}
                    >
                      Remove message
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => dismiss(m)}
                      style={{
                        flex: 1, minWidth: 84, height: 36, borderRadius: 12, background: "#fff",
                        border: "1px solid #D1D5DB", color: "#6B7280", fontSize: 12.5, fontWeight: tokens.fontWeight.semibold, cursor: "pointer",
                      }}
                    >
                      Dismiss
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => setConfirmBanId(m.id)}
                      style={{
                        flex: 1, minWidth: 84, height: 36, borderRadius: 12, border: "none",
                        background: "#B91C1C", color: "#fff", fontSize: 12.5, fontWeight: tokens.fontWeight.bold, cursor: "pointer",
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
      <div style={{ fontSize: tokens.fontSize.xl, fontWeight: tokens.fontWeight.semibold, color: tokens.navy, marginBottom: 16 }}>
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
            borderRadius: 12,
            border: "1px solid #EEF2F7",
            padding: "0 12px",
            fontSize: 15,
            fontFamily: "Poppins, sans-serif",
          }}
        />
        <input
          type="text"
          placeholder="Outcode (e.g. SO, PO)"
          value={outcode}
          onChange={(e) => setOutcode(e.target.value.toUpperCase())}
          style={{
            height: 44,
            borderRadius: 12,
            border: "1px solid #EEF2F7",
            padding: "0 12px",
            fontSize: 15,
            fontFamily: "Poppins, sans-serif",
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
            borderRadius: 12,
            border: "1px solid #EEF2F7",
            background: "#F8FAFC",
            padding: "0 12px",
            cursor: "pointer",
            textAlign: "left",
          }}
        >
          <span style={{ fontSize: tokens.fontSize.base, color: tokens.navy, fontWeight: 600 }}>
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
            borderRadius: 12,
            background: tokens.blue,
            color: "#fff",
            border: "none",
            fontWeight: tokens.fontWeight.semibold,
            cursor: "pointer",
            opacity: loading || !areaName.trim() || !outcode.trim() ? 0.6 : 1,
          }}
        >
          {loading ? "Creating…" : "Create room"}
        </button>
        {error && <div style={{ color: tokens.red, fontSize: 13 }}>{error}</div>}
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
        <div style={{ fontSize: tokens.fontSize.md, fontWeight: tokens.fontWeight.semibold, color: tokens.navy }}>
          {showDeleted ? "Deleted rooms" : "Existing rooms"}
        </div>
        <button
          type="button"
          onClick={() => setShowDeleted((v) => !v)}
          style={{
            height: 30,
            padding: "0 12px",
            borderRadius: 12,
            border: "1px solid #E4E8EF",
            background: showDeleted ? "#EAF2FC" : "#fff",
            color: showDeleted ? "#1877D6" : "#6B7280",
            fontSize: 12,
            fontWeight: tokens.fontWeight.bold,
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
                padding: 16,
                borderRadius: tokens.radiusCard,
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
                      <div style={{ fontWeight: tokens.fontWeight.semibold, color: tokens.navy, fontSize: 14 }}>{room.area_name}</div>
                      <span
                        style={{
                          fontSize: tokens.fontSize.xs,
                          fontWeight: tokens.fontWeight.bold,
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
                          color: tokens.textSecondary,
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
                        borderRadius: 12,
                        border: "1px solid #EEF2F7",
                        background: "#fff",
                        color: tokens.blue,
                        fontSize: 12,
                        fontWeight: tokens.fontWeight.bold,
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
                      borderRadius: 12,
                      border: "1px solid #E4E8EF",
                      background: "#fff",
                      color: "#6B7280",
                      cursor: "pointer",
                    }}
                  >
                    <IconPencil stroke={1.5} size={14} />
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
                      borderRadius: 12,
                      border: "1px solid #F3D5D7",
                      background: "#fff",
                      color: tokens.red,
                      cursor: "pointer",
                      opacity: deletingId === room.id ? 0.6 : 1,
                    }}
                  >
                    <IconTrash stroke={1.5} size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleOptIn(room)}
                    disabled={savingId === room.id}
                    style={{
                      height: 30,
                      padding: "0 12px",
                      borderRadius: 12,
                      border: "1px solid #EEF2F7",
                      background: "#fff",
                      color: tokens.blue,
                      fontSize: 12,
                      fontWeight: tokens.fontWeight.bold,
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
                      borderRadius: 12,
                      border: "1px solid #E4E8EF",
                      padding: "0 12px",
                      fontSize: tokens.fontSize.md,
                      background: "#fff",
                    }}
                  />
                  <textarea
                    value={editDesc}
                    onChange={(e) => setEditDesc(e.target.value)}
                    placeholder="What is this room about?"
                    rows={3}
                    style={{
                      borderRadius: tokens.radiusCard,
                      border: "1px solid #E4E8EF",
                      padding: 16,
                      fontSize: tokens.fontSize.md,
                      background: "#fff",
                      resize: "vertical",
                      fontFamily: "Poppins, sans-serif",
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
                        borderRadius: 12,
                        border: "1px solid #E4E8EF",
                        background: "#fff",
                        color: tokens.blue,
                        fontSize: 12,
                        fontWeight: tokens.fontWeight.bold,
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
                      borderRadius: 12,
                      border: "1px solid #E4E8EF",
                      background: "#fff",
                      padding: "0 12px",
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                  >
                    <span style={{ fontSize: tokens.fontSize.base, color: tokens.navy, fontWeight: 600 }}>Private room</span>
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
                        borderRadius: 12,
                        background: tokens.blue,
                        color: "#fff",
                        border: "none",
                        fontWeight: tokens.fontWeight.semibold,
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
                        borderRadius: 12,
                        background: "#fff",
                        color: tokens.navy,
                        border: "1px solid #E4E8EF",
                        fontWeight: tokens.fontWeight.semibold,
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
  const flaggedRef = useRef<HTMLDivElement>(null);

  const scrollToFlagged = () => {
    flaggedRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const [instructorCount, setInstructorCount] = useState<number>(0);

  useEffect(() => {
    (async () => {
      let { count, error } = await supabase
        .from("instructors")
        .select("id", { count: "exact", head: true })
        .is("deleted_at", null);
      if (error && (error as any).code === "42703") {
        const retry = await supabase
          .from("instructors")
          .select("id", { count: "exact", head: true });
        count = retry.count;
      }
      setInstructorCount(count ?? 0);
    })();
  }, []);




  // Child routes (e.g. /admin/featured) have their own admin gate and layout;
  // render the Outlet unconditionally so they mount instead of the hub.
  if (isChildRoute) return <Outlet />;

  if (status === "checking") {
    return (
      <div style={{ background: "#fff", minHeight: "100vh", padding: 24, fontFamily: "Poppins, sans-serif", color: "#6B7280" }}>
        Checking access…
      </div>
    );
  }
  if (status === "denied") {
    return (
      <div style={{ background: "#fff", minHeight: "100vh", padding: 24, fontFamily: "Poppins, sans-serif" }}>
        <div style={{ fontSize: tokens.fontSize.xl, fontWeight: tokens.fontWeight.semibold, color: tokens.blue }}>Access denied</div>
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
              borderRadius: 12,
              background: tokens.navy,
              color: "#fff",
              border: "none",
              fontWeight: tokens.fontWeight.semibold,
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
              borderRadius: 12,
              background: "#fff",
              color: tokens.blue,
              border: "1px solid #1877D6",
              fontWeight: tokens.fontWeight.semibold,
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
    <div style={{ background: "#fff", minHeight: "100vh", fontFamily: "Poppins, sans-serif" }}>
      <AdminTopBar title="Admin" onBack={() => navigate({ to: "/home" })} />
      <div style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 80px)" }}>
        <div style={{ padding: 16 }}>
          <AdminGroupLabel first>Marketplace</AdminGroupLabel>
          <AdminGroupCard>
            <AdminSectionTile
              first
              icon={<IconStar stroke={1.6} size={18} color="#000" />}
              label="Featured listings"
              onClick={() => navigate({ to: "/admin/featured" })}
            />
            <AdminSectionTile
              icon={<IconShoppingBag size={18} color="#000" />}
              label="Marketplace listings"
              onClick={() => navigate({ to: "/admin/listings" as never })}
            />
            <AdminSectionTile
              icon={<IconFileText stroke={1.6} size={18} color="#000" />}
              label="Applications"
              onClick={() => navigate({ to: "/admin/applications" as never })}
            />
            <AdminSectionTile
              icon={<IconBriefcase stroke={1.6} size={18} color="#000" />}
              label="Job offers"
              onClick={() => navigate({ to: "/admin/job-offers" as never })}
            />
            <AdminSectionTile
              icon={<IconFileCheck size={18} color="#000" />}
              label="Platform terms"
              onClick={() => navigate({ to: "/admin/terms" as never })}
            />
          </AdminGroupCard>

          <AdminGroupLabel>Content</AdminGroupLabel>
          <AdminGroupCard>
            <AdminSectionTile
              first
              icon={<IconVideo size={18} color="#000" />}
              label="DSM Live"
              onClick={() => navigate({ to: "/admin/dsm-live" as never })}
            />
            <AdminSectionTile
              icon={<IconPlayerPlay size={18} color="#000" />}
              label="Learn videos"
              onClick={() => navigate({ to: "/admin/learn-videos" as never })}
            />
            <AdminSectionTile
              icon={<IconBook size={18} color="#000" />}
              label="Bitesize videos"
              onClick={() => navigate({ to: "/admin/bitesize" as never })}
            />
            <AdminSectionTile
              icon={<IconMicrophone stroke={1.6} size={18} color="#000" />}
              label="Podcasts"
              onClick={() => navigate({ to: "/admin/podcasts" as never })}
            />
            <AdminSectionTile
              icon={<IconNews stroke={1.6} size={18} color="#000" />}
              label="News"
              onClick={() => navigate({ to: "/admin/news" as never })}
            />
            <AdminSectionTile
              icon={<IconGift stroke={1.6} size={18} color="#000" />}
              label="Benefits & perks"
              onClick={() => navigate({ to: "/admin/benefits" as never })}
            />

          </AdminGroupCard>

          <AdminGroupLabel>Instructors</AdminGroupLabel>
          <AdminGroupCard>
            <AdminSectionTile
              first
              icon={<IconUsers stroke={1.6} size={18} color="#000" />}
              label="All instructors"
              subtitle={`${instructorCount} registered`}
              onClick={() => navigate({ to: "/admin/instructors" as never })}
            />
          </AdminGroupCard>

          <AdminGroupLabel>Platform</AdminGroupLabel>
          <AdminGroupCard>
            <AdminSectionTile
              first
              icon={<IconBook size={18} color="#000" />}
              label="All bookings"
              onClick={() => navigate({ to: "/bookings" as never })}
            />
            <AdminSectionTile
              icon={<IconSettings stroke={1.6} size={18} color="#000" />}
              label="Platform settings"
              onClick={() => navigate({ to: "/settings" as never })}
            />
            <AdminSectionTile
              icon={<IconMessageCircle stroke={1.6} size={18} color="#000" />}
              label="Chat rooms"
              onClick={() => navigate({ to: "/admin/chat-rooms" as never })}
            />
            <AdminSectionTile
              icon={<IconFlag stroke={1.6} size={18} color="#000" />}
              label="Flagged"
              onClick={scrollToFlagged}
            />
          </AdminGroupCard>
        </div>

        <div ref={flaggedRef}>
          <FlaggedMessagesSection />
        </div>

      </div>
    </div>
  );
}

type BenefitPartner = {
  id: string;
  name: string;
  tagline: string | null;
  description: string | null;
  icon: string | null;
  icon_bg: string | null;
  icon_color: string | null;
  logo_url: string | null;
  hero_image_url: string | null;
  category: string | null;
  perks: string[] | null;
  saving: string | null;
  min_tier: string;
  cta_label: string | null;
  cta_action: string | null;
  coming_soon: boolean;
  exclusive: boolean;
  active: boolean;
  sort_order: number;
};

type BenefitPerk = {
  id: string;
  partner_id: string;
  name: string;
  description: string | null;
  detail_text: string | null;
  category: string | null;
  saving: string | null;
  min_tier: string;
  cta_label: string | null;
  cta_action: string | null;
  hero_image_url: string | null;
  gallery_urls: string[] | null;
  video_url: string | null;
  video_embed_url: string | null;
  bullet_points: string[] | null;
  links: any[];
  coming_soon: boolean;
  active: boolean;
  sort_order: number;
  created_at: string;
};


const PARTNER_TIERS: { id: string; label: string }[] = [
  { id: "free", label: "Free" },
  { id: "website", label: "Essential" },
  { id: "pro", label: "Pro" },
  { id: "managed", label: "Max" },
];

const PARTNER_TIER_STYLE: Record<string, { bg: string; color: string }> = {
  free: { bg: "#F1F5F9", color: tokens.textSecondary },
  website: { bg: "#EFF6FF", color: tokens.blue },
  pro: { bg: "#EDE9FE", color: "#7C3AED" },
  managed: { bg: "#FEF3C7", color: "#B45309" },
};

const removeImageBtnStyle: React.CSSProperties = {
  background: "#FEF2F2",
  color: tokens.red,
  border: "none",
  borderRadius: tokens.radiusCard,
  padding: "6px 16px",
  fontSize: tokens.fontSize.sm,
  fontWeight: tokens.fontWeight.bold,
  cursor: "pointer",
  fontFamily: "Poppins, sans-serif",
};

const uploadHintStyle: React.CSSProperties = {
  fontSize: tokens.fontSize.sm,
  color: tokens.textSecondary,
  marginTop: -6,
  marginBottom: 12,
  fontFamily: "Poppins, sans-serif",
};

const partnerInputStyle: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #E4E8EF",
  borderRadius: tokens.radiusCard,
  padding: "12px 16px",
  fontSize: tokens.fontSize.md,
  fontFamily: "Poppins, sans-serif",
  width: "100%",
  outline: "none",
  marginBottom: 12,
  boxSizing: "border-box",
};

const partnerLabelStyle: React.CSSProperties = {
  fontSize: tokens.fontSize.sm,
  fontWeight: tokens.fontWeight.semibold,
  color: tokens.textMuted,
  textTransform: "uppercase",
  marginBottom: 6,
};

export function BenefitPartnersSection() {
  const [partners, setPartners] = useState<BenefitPartner[]>([]);
  const [editingPartner, setEditingPartner] = useState<BenefitPartner | null>(null);
  const [partnerSheetOpen, setPartnerSheetOpen] = useState(false);
  const [savingPartner, setSavingPartner] = useState(false);

  // ---- perk management ----------------------------------------------------
  const [expandedPartner, setExpandedPartner] = useState<string | null>(null);
  const [partnerPerks, setPartnerPerks] = useState<Record<string, any[]>>({});
  const [editingPerk, setEditingPerk] = useState<any | null>(null);
  const [perkSheetOpen, setPerkSheetOpen] = useState(false);
  const [savingPerk, setSavingPerk] = useState(false);
  const [uploadingPartnerLogo, setUploadingPartnerLogo] = useState(false);
  const [uploadingPartnerHero, setUploadingPartnerHero] = useState(false);
  const [uploadingPerkHero, setUploadingPerkHero] = useState(false);
  const [uploadingPerkGallery, setUploadingPerkGallery] = useState(false);

  // ---- perk search & filter ------------------------------------------------
  const [perkSearch, setPerkSearch] = useState("");
  const [perkPartnerFilter, setPerkPartnerFilter] = useState<string | "all">("all");
  const [allPerks, setAllPerks] = useState<BenefitPerk[]>([]);

  // ---- perk form validation ------------------------------------------------
  const [perkErrors, setPerkErrors] = useState<Record<string, string>>({});
  const [perkVideoMode, setPerkVideoMode] = useState<"embed" | "upload">("upload");
  const perkHeroInputRef = useRef<HTMLInputElement>(null);
  const perkGalleryInputRef = useRef<HTMLInputElement>(null);
  const perkVideoInputRef = useRef<HTMLInputElement>(null);


  function validatePerk(perk: any): Record<string, string> {
    const errs: Record<string, string> = {};
    const name = (perk?.name ?? "").trim();
    const description = (perk?.description ?? "").trim();
    const saving = (perk?.saving ?? "").trim();
    const action = (perk?.cta_action ?? "").trim();

    if (!name) errs.name = "Perk name is required";
    else if (name.length > 100) errs.name = "Keep the name under 100 characters";

    if (!description) errs.description = "Description is required";
    else if (description.length > 500) errs.description = "Keep the description under 500 characters";

    if (!saving) errs.saving = "Price / saving text is required";
    else if (saving.length > 80) errs.saving = "Keep this under 80 characters";

    if (!action) {
      errs.cta_action = "Link is required (URL, /route or pirkx_sso)";
    } else if (!/^https?:\/\/\S+$/i.test(action) && !action.startsWith("/") && action !== "pirkx_sso") {
      errs.cta_action = "Use a full https:// URL, an in-app /route, or pirkx_sso";
    }

    if (!perk?.min_tier) errs.min_tier = "Choose a minimum tier";

    return errs;
  }

  function patchPerk(changes: Record<string, unknown>) {
    setEditingPerk((prev: any) => (prev ? { ...prev, ...changes } : prev));
    setPerkErrors((prev) => {
      const keys = Object.keys(changes).filter((k) => k in prev);
      if (keys.length === 0) return prev;
      const next = { ...prev };
      keys.forEach((k) => delete next[k]);
      return next;
    });
  }

  const perkFieldStyle = (field: string): React.CSSProperties =>
    perkErrors[field]
      ? { ...partnerInputStyle, borderColor: tokens.red, marginBottom: 4 }
      : partnerInputStyle;

  const PerkError = ({ field }: { field: string }) =>
    perkErrors[field] ? (
      <div style={{ fontSize: tokens.fontSize.sm, fontWeight: tokens.fontWeight.semibold, color: tokens.red, marginBottom: 12 }}>
        {perkErrors[field]}
      </div>
    ) : null;


  const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

  async function validateImageFile(
    file: File,
    opts: { minWidth: number; minHeight: number; label: string },
  ) {
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      throw new Error(`${opts.label}: use a JPG, PNG, WebP or GIF image.`);
    }
    if (file.size > MAX_IMAGE_BYTES) {
      throw new Error(
        `${opts.label}: image is ${(file.size / (1024 * 1024)).toFixed(1)}MB — max 5MB.`,
      );
    }
    const dims = await new Promise<{ w: number; h: number } | null>((resolve) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve({ w: img.naturalWidth, h: img.naturalHeight });
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(null);
      };
      img.src = url;
    });
    if (!dims) throw new Error(`${opts.label}: file is not a readable image.`);
    if (dims.w < opts.minWidth || dims.h < opts.minHeight) {
      throw new Error(
        `${opts.label}: image is ${dims.w}×${dims.h}px — minimum ${opts.minWidth}×${opts.minHeight}px.`,
      );
    }
  }

  async function uploadToBucket(bucket: string, prefix: string, file: File) {

    const ext = file.name.split(".").pop() || "bin";
    const path = `${prefix}${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error } = await supabase.storage
      .from(bucket)
      .upload(path, file, { cacheControl: "3600", upsert: false, contentType: file.type });
    if (error) throw error;
    return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
  }

  async function loadPartnerPerks(partnerId: string) {
    const { data, error } = await supabase
      .from("benefit_perks")
      .select("*")
      .eq("partner_id", partnerId)
      .order("sort_order");
    if (error) {
      console.error("[admin] benefit_perks load error", error);
    }
    setPartnerPerks((prev) => ({ ...prev, [partnerId]: data ?? [] }));
  }

  async function savePerk() {
    if (!editingPerk) return;
    const errs = validatePerk(editingPerk);
    setPerkErrors(errs);
    if (Object.keys(errs).length > 0) {
      toast.error("Please fix the highlighted fields");
      return;
    }
    setSavingPerk(true);
    try {

      if (editingPerk.id === "new") {
        const { id: _omit, ...payload } = editingPerk;
        const { error } = await supabase.from("benefit_perks").insert(payload);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("benefit_perks")
          .update(editingPerk)
          .eq("id", editingPerk.id);
        if (error) throw error;
      }
      toast.success("Perk saved");
      setPerkErrors({});
      setPerkSheetOpen(false);
      await loadPartnerPerks(editingPerk.partner_id);
      await loadAllPerks();
      setEditingPerk(null);
    } catch (e: any) {
      toast.error(e?.message ?? "Save failed");
    } finally {
      setSavingPerk(false);
    }
  }

  async function deletePerk(perk: any) {
    const { error } = await supabase.from("benefit_perks").delete().eq("id", perk.id);
    if (error) {
      toast.error("Delete failed");
      return;
    }
    await loadPartnerPerks(perk.partner_id);
    await loadAllPerks();
    toast.success("Perk removed");
  }




  async function loadAllPerks() {
    const { data, error } = await supabase
      .from("benefit_perks")
      .select("*")
      .order("sort_order");
    if (error) {
      console.error("[admin] all benefit_perks load error", error);
      return;
    }
    setAllPerks((data ?? []) as BenefitPerk[]);
  }

  async function loadPartners() {
    const { data, error } = await supabase
      .from("benefit_partners")
      .select("*")
      .order("sort_order");
    if (error) {
      console.error("[admin] benefit_partners load error", error);
      return;
    }
    setPartners((data ?? []) as BenefitPartner[]);
  }

  useEffect(() => {
    loadPartners();
    loadAllPerks();
  }, []);


  async function savePartner() {
    if (!editingPartner) return;
    setSavingPartner(true);
    try {
      if (editingPartner.id === "new") {
        const { id: _omit, ...payload } = editingPartner;
        const { error } = await supabase.from("benefit_partners").insert(payload);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("benefit_partners")
          .update(editingPartner)
          .eq("id", editingPartner.id);
        if (error) throw error;
      }
      toast.success("Partner saved");
      setPartnerSheetOpen(false);
      setEditingPartner(null);
      await loadPartners();
    } catch (e: any) {
      toast.error(e?.message ?? "Save failed");
    } finally {
      setSavingPartner(false);
    }
  }

  async function deletePartner(id: string) {
    const { error } = await supabase.from("benefit_partners").delete().eq("id", id);
    if (error) {
      toast.error("Delete failed");
      return;
    }
    setPartners(partners.filter((p) => p.id !== id));
    toast.success("Partner removed");
  }

  function patch(changes: Partial<BenefitPartner>) {
    setEditingPartner((prev) => (prev ? { ...prev, ...changes } : prev));
  }

  const filteredPerks = useMemo(() => {
    const q = perkSearch.trim().toLowerCase();
    return allPerks.filter((perk) => {
      const matchesName = perk.name.toLowerCase().includes(q);
      const matchesPartner =
        perkPartnerFilter === "all" || perk.partner_id === perkPartnerFilter;
      return matchesName && matchesPartner;
    });
  }, [allPerks, perkSearch, perkPartnerFilter]);

  const partnerName = (id: string) => partners.find((p) => p.id === id)?.name ?? "Unknown";

  return (
    <div style={{ paddingBottom: 32 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 16px",
          marginBottom: 8,
        }}
      >
        <span style={{ fontSize: tokens.fontSize.sm, fontWeight: tokens.fontWeight.semibold, color: tokens.textMuted, textTransform: "uppercase" }}>
          Benefits &amp; Perks
        </span>
        <button
          type="button"
          onClick={() => {
            setEditingPartner({
              id: "new",
              name: "",
              tagline: "",
              description: "",
              icon: "IconGift",
              icon_bg: "#EEF2F7",
              icon_color: tokens.navy,
              logo_url: null,
              hero_image_url: null,
              category: "Health",
              perks: [],
              saving: "",
              min_tier: "pro",
              cta_label: "Access →",
              cta_action: "",
              coming_soon: true,
              exclusive: false,
              active: true,
              sort_order: partners.length,
            });
            setPartnerSheetOpen(true);
          }}
          style={{
            background: tokens.blue,
            color: "#fff",
            borderRadius: tokens.radiusCard,
            padding: "6px 16px",
            fontSize: 12,
            fontWeight: tokens.fontWeight.bold,
            border: "none",
            cursor: "pointer",
            fontFamily: "Poppins, sans-serif",
          }}
        >
          Add partner +
        </button>
      </div>

      {/* Perk search & filter */}
      <div
        style={{
          margin: "0 16px 16px",
          background: "#fff",
          borderRadius: tokens.radiusCard,
          border: "1px solid #E4E8EF",
          padding: 16,
        }}
      >
        <div style={{ fontSize: tokens.fontSize.base, fontWeight: tokens.fontWeight.bold, color: tokens.navy, marginBottom: 10 }}>
          Find a perk
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              background: "#F8FAFC",
              borderRadius: 12,
              padding: "0 10px",
              height: 40,
              border: "1px solid #E4E8EF",
            }}
          >
            <IconSearch size={16} stroke={1.8} color="#6B7686" />
            <input
              type="text"
              value={perkSearch}
              onChange={(e) => setPerkSearch(e.target.value)}
              placeholder="Search perks by name…"
              style={{
                flex: 1,
                border: "none",
                background: "transparent",
                outline: "none",
                fontSize: tokens.fontSize.md,
                fontFamily: "Poppins, sans-serif",
                color: tokens.navy,
              }}
            />
            {perkSearch && (
              <button
                type="button"
                onClick={() => setPerkSearch("")}
                style={{
                  fontSize: tokens.fontSize.sm,
                  color: tokens.textSecondary,
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontFamily: "Poppins, sans-serif",
                }}
              >
                Clear
              </button>
            )}
          </div>
          <select
            value={perkPartnerFilter}
            onChange={(e) => setPerkPartnerFilter(e.target.value)}
            style={{
              height: 40,
              borderRadius: 12,
              border: "1px solid #E4E8EF",
              background: "#F8FAFC",
              padding: "0 10px",
              fontSize: tokens.fontSize.md,
              fontFamily: "Poppins, sans-serif",
              color: tokens.navy,
              outline: "none",
            }}
          >
            <option value="all">All partners</option>
            {partners.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        {filteredPerks.length > 0 && (
          <div style={{ marginTop: 12, fontSize: 12, color: tokens.textSecondary }}>
            {filteredPerks.length} perk{filteredPerks.length === 1 ? "" : "s"} found
          </div>
        )}

        {perkSearch && filteredPerks.length === 0 && (
          <div style={{ marginTop: 12, fontSize: 12, color: tokens.textMuted }}>
            No perks match your search.
          </div>
        )}

        {filteredPerks.length > 0 && (
          <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
            {filteredPerks.map((perk) => (
              <div
                key={perk.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "12px 16px",
                  background: "#F8FAFC",
                  borderRadius: tokens.radiusCard,
                  border: "1px solid #F0F4F8",
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: tokens.fontSize.base, fontWeight: tokens.fontWeight.semibold, color: tokens.navy }}>
                    {perk.name}
                  </div>
                  <div style={{ fontSize: tokens.fontSize.sm, color: tokens.textSecondary, marginTop: 2 }}>
                    {partnerName(perk.partner_id)}
                    {perk.category ? ` · ${perk.category}` : ""}
                  </div>
                </div>
                {perk.coming_soon && (
                  <span
                    style={{
                      background: "#FEF3C7",
                      color: "#B45309",
                      fontSize: tokens.fontSize.sm,
                      fontWeight: tokens.fontWeight.bold,
                      borderRadius: 999,
                      padding: "4px 10px",
                      flexShrink: 0,
                    }}
                  >
                    Coming soon
                  </span>
                )}
                <button
                  type="button"
                  aria-label="Edit perk"
                  onClick={() => {
                    setEditingPerk({ ...perk });
                    setPerkSheetOpen(true);
                  }}
                  style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}
                >
                  <IconPencil size={15} stroke={1.8} color="#6B7686" />
                </button>
                <button
                  type="button"
                  aria-label="Delete perk"
                  onClick={() => {
                    if (confirm(`Delete ${perk.name}?`)) deletePerk(perk);
                  }}
                  style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}
                >
                  <IconTrash size={15} stroke={1.8} color="#CC2229" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>


      <div
        style={{
          margin: "0 16px 16px",
          background: "#fff",
          borderRadius: 8,
          border: "1px solid #E4E8EF",
          overflow: "hidden",
        }}
      >
        {partners.length === 0 && (
          <div style={{ padding: 16, fontSize: tokens.fontSize.base, color: tokens.textSecondary }}>No partners yet.</div>
        )}
        {partners.map((partner, i) => {
          const tierStyle = PARTNER_TIER_STYLE[partner.min_tier] ?? PARTNER_TIER_STYLE.free;
          return (
            <div
              key={partner.id}
              style={{ borderTop: i === 0 ? "none" : "1px solid #F1F5F9" }}
            >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: 12,
              }}
            >

              <div
                style={{
                  width: 36,
                  height: 36,
                  background: partner.icon_bg ?? "#EEF2F7",
                  color: partner.icon_color ?? "#0B1F3A",
                  borderRadius: 12,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: tokens.fontSize.lg,
                  fontWeight: tokens.fontWeight.bold,
                  flexShrink: 0,
                }}
              >
                {partner.logo_url ? (
                  <img
                    src={partner.logo_url}
                    alt=""
                    style={{ width: 36, height: 36, borderRadius: 12, objectFit: "cover" }}
                  />
                ) : (
                  (partner.name || "?").charAt(0).toUpperCase()
                )}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: tokens.fontSize.md, fontWeight: tokens.fontWeight.semibold, color: tokens.navy }}>{partner.name}</div>
                {partner.tagline && (
                  <div style={{ fontSize: tokens.fontSize.sm, color: tokens.textSecondary, marginTop: 2 }}>{partner.tagline}</div>
                )}
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span
                  style={{
                    background: tierStyle.bg,
                    color: tierStyle.color,
                    fontSize: 9,
                    fontWeight: tokens.fontWeight.bold,
                    borderRadius: tokens.radiusCard,
                    padding: "2px 16px",
                  }}
                >
                  {PARTNER_TIERS.find((t) => t.id === partner.min_tier)?.label ?? partner.min_tier}
                </span>
                <span
                  role="button"
                  onClick={async () => {
                    const { error } = await supabase
                      .from("benefit_partners")
                      .update({ active: !partner.active })
                      .eq("id", partner.id);
                    if (error) {
                      toast.error("Update failed");
                      return;
                    }
                    setPartners(
                      partners.map((p) => (p.id === partner.id ? { ...p, active: !p.active } : p)),
                    );
                  }}
                  style={{
                    background: partner.active ? "#DCFCE7" : "#F1F5F9",
                    color: partner.active ? "#15803D" : "#9CA3AF",
                    fontSize: tokens.fontSize.sm,
                    fontWeight: tokens.fontWeight.bold,
                    borderRadius: 999,
                    padding: "4px 10px",
                    cursor: "pointer",
                  }}
                >
                  {partner.active ? "Active" : "Inactive"}
                </span>
                <button
                  type="button"
                  aria-label="Edit partner"
                  onClick={() => {
                    setEditingPartner(partner);
                    setPartnerSheetOpen(true);
                  }}
                  style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}
                >
                  <IconPencil size={16} stroke={1.8} color="#6B7686" />
                </button>
                <button
                  type="button"
                  aria-label="Delete partner"
                  onClick={() => {
                    if (confirm(`Delete ${partner.name}?`)) deletePartner(partner.id);
                  }}
                  style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}
                >
                  <IconTrash size={16} stroke={1.8} color="#CC2229" />
                </button>
              </div>
            </div>

            <div style={{ padding: "0 12px 10px" }}>
              <button
                type="button"
                onClick={async () => {
                  if (expandedPartner === partner.id) {
                    setExpandedPartner(null);
                  } else {
                    setExpandedPartner(partner.id);
                    await loadPartnerPerks(partner.id);
                  }
                }}
                style={{
                  background: tokens.canvas,
                  color: tokens.textSecondary,
                  borderRadius: tokens.radiusCard,
                  padding: "4px 16px",
                  fontSize: tokens.fontSize.sm,
                  fontWeight: tokens.fontWeight.semibold,
                  border: "none",
                  cursor: "pointer",
                  fontFamily: "Poppins, sans-serif",
                }}
              >
                Manage perks ({(partnerPerks[partner.id] ?? []).length})
              </button>
            </div>

            {expandedPartner === partner.id && (
              <div
                style={{
                  background: "#F8FAFC",
                  borderTop: "1px solid #E4E8EF",
                  padding: "12px 16px",
                }}
              >
                {(partnerPerks[partner.id] ?? []).length === 0 && (
                  <div style={{ fontSize: 12, color: tokens.textMuted }}>No perks yet.</div>
                )}
                {(partnerPerks[partner.id] ?? []).map((perk: any) => (
                  <div
                    key={perk.id}
                    style={{
                      display: "flex",
                      gap: 10,
                      alignItems: "center",
                      padding: "8px 0",
                      borderBottom: "1px solid #F0F4F8",
                    }}
                  >
                    <span style={{ fontSize: tokens.fontSize.base, fontWeight: tokens.fontWeight.medium, color: tokens.navy, flex: 1, minWidth: 0 }}>
                      {perk.name}
                    </span>
                    {perk.coming_soon && (
                      <span
                        style={{
                          background: "#FEF3C7",
                          color: "#B45309",
                          fontSize: tokens.fontSize.sm,
                          fontWeight: tokens.fontWeight.bold,
                          borderRadius: 999,
                          padding: "4px 10px",
                        }}
                      >
                        Coming soon
                      </span>
                    )}
                    <button
                      type="button"
                      aria-label="Edit perk"
                      onClick={() => {
                        setEditingPerk({ ...perk });
                        setPerkSheetOpen(true);
                      }}
                      style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}
                    >
                      <IconPencil size={15} stroke={1.8} color="#6B7686" />
                    </button>
                    <button
                      type="button"
                      aria-label="Delete perk"
                      onClick={() => {
                        if (confirm(`Delete ${perk.name}?`)) deletePerk(perk);
                      }}
                      style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}
                    >
                      <IconTrash size={15} stroke={1.8} color="#CC2229" />
                    </button>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={() => {
                    setEditingPerk({
                      id: "new",
                      partner_id: partner.id,
                      name: "",
                      description: "",
                      detail_text: "",
                      hero_image_url: null,
                      gallery_urls: [],
                      video_url: null,
                      video_embed_url: null,
                      bullet_points: [],
                      links: [],
                      category: partner.category,
                      saving: "",
                      min_tier: partner.min_tier,
                      cta_label: partner.cta_label,
                      cta_action: partner.cta_action,
                      coming_soon: true,
                      active: true,
                      sort_order: (partnerPerks[partner.id] ?? []).length,
                    });
                    setPerkSheetOpen(true);
                  }}
                  style={{
                    background: "#EFF6FF",
                    color: tokens.blue,
                    borderRadius: tokens.radiusCard,
                    padding: "5px 16px",
                    fontSize: tokens.fontSize.sm,
                    fontWeight: tokens.fontWeight.bold,
                    border: "none",
                    cursor: "pointer",
                    marginTop: 8,
                    fontFamily: "Poppins, sans-serif",
                  }}
                >
                  Add perk +
                </button>
              </div>
            )}
            </div>

          );
        })}
      </div>

      {partnerSheetOpen && editingPartner && (
        <div
          onClick={() => {
            setPartnerSheetOpen(false);
            setEditingPartner(null);
          }}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 300,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "flex-end",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "relative",
              background: tokens.canvas,
              borderRadius: "16px 16px 0 0",
              padding: "0 0 40px",
              maxHeight: "90vh",
              overflowY: "auto",
              width: "100%",
            }}
          >
            <div style={{ position: "relative", padding: "12px 16px 0" }}>
              <div style={{ width: 36, height: 5, borderRadius: 999, background: "#D1D1D6", margin: "0 auto" }} />
              <button
                type="button"
                aria-label="Close"
                onClick={() => {
                  setPartnerSheetOpen(false);
                  setEditingPartner(null);
                }}
                style={{
                  position: "absolute",
                  right: 16,
                  top: 8,
                  width: 30,
                  height: 30,
                  borderRadius: "50%",
                  background: tokens.canvas,
                  border: "1px solid #E4E8EF",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <IconX size={16} color="#6B7686" stroke={2} />
              </button>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: 16,
              }}
            >
              <span style={{ fontSize: tokens.fontSize.xl, fontWeight: tokens.fontWeight.extrabold, color: tokens.navy }}>
                {editingPartner.id === "new" ? "Add partner" : "Edit partner"}
              </span>
              <button
                type="button"
                aria-label="Close"
                onClick={() => {
                  setPartnerSheetOpen(false);
                  setEditingPartner(null);
                }}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontSize: 20,
                  color: tokens.textSecondary,
                }}
              >
                ×
              </button>
            </div>

            <div style={{ padding: "0 16px" }}>
              <PartnerPreview partner={editingPartner} />
              <div style={partnerLabelStyle}>Name</div>
              <input
                value={editingPartner.name}
                onChange={(e) => patch({ name: e.target.value })}
                style={partnerInputStyle}
              />

              <div style={partnerLabelStyle}>Tagline</div>
              <input
                value={editingPartner.tagline ?? ""}
                onChange={(e) => patch({ tagline: e.target.value })}
                style={partnerInputStyle}
              />

              <div style={partnerLabelStyle}>Description</div>
              <textarea
                rows={4}
                value={editingPartner.description ?? ""}
                onChange={(e) => patch({ description: e.target.value })}
                style={{ ...partnerInputStyle, resize: "vertical" }}
              />

              <div style={partnerLabelStyle}>Logo</div>
              {editingPartner.logo_url && (
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                  <img
                    src={editingPartner.logo_url}
                    alt=""
                    style={{ width: 56, height: 56, borderRadius: 8, objectFit: "cover", border: "1px solid #E4E8EF" }}
                  />
                  <button
                    type="button"
                    onClick={() => patch({ logo_url: null })}
                    style={removeImageBtnStyle}
                  >
                    Remove
                  </button>
                </div>
              )}
              <input
                type="file"
                accept="image/*"
                disabled={uploadingPartnerLogo}
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setUploadingPartnerLogo(true);
                  try {
                    await validateImageFile(file, { minWidth: 200, minHeight: 200, label: "Logo" });
                    const url = await uploadToBucket("marketplace-images", "benefits/partners/logo/", file);
                    patch({ logo_url: url });
                    toast.success("Logo uploaded");
                  } catch (err: any) {
                    toast.error(err?.message ?? "Upload failed");
                  } finally {
                    setUploadingPartnerLogo(false);
                    e.target.value = "";
                  }
                }}
                style={{ ...partnerInputStyle, padding: 8 }}
              />
              {uploadingPartnerLogo && (
                <div style={uploadHintStyle}>Uploading logo...</div>
              )}

              <div style={partnerLabelStyle}>Hero image</div>
              {editingPartner.hero_image_url && (
                <div style={{ marginBottom: 8 }}>
                  <img
                    src={editingPartner.hero_image_url}
                    alt=""
                    style={{ width: "100%", height: 130, borderRadius: 8, objectFit: "cover", border: "1px solid #E4E8EF" }}
                  />
                  <button
                    type="button"
                    onClick={() => patch({ hero_image_url: null })}
                    style={{ ...removeImageBtnStyle, marginTop: 8 }}
                  >
                    Remove
                  </button>
                </div>
              )}
              <input
                type="file"
                accept="image/*"
                disabled={uploadingPartnerHero}
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setUploadingPartnerHero(true);
                  try {
                    await validateImageFile(file, { minWidth: 800, minHeight: 400, label: "Hero image" });
                    const url = await uploadToBucket("marketplace-images", "benefits/partners/hero/", file);
                    patch({ hero_image_url: url });
                    toast.success("Hero image uploaded");
                  } catch (err: any) {
                    toast.error(err?.message ?? "Upload failed");
                  } finally {
                    setUploadingPartnerHero(false);
                    e.target.value = "";
                  }
                }}
                style={{ ...partnerInputStyle, padding: 8 }}
              />
              {uploadingPartnerHero && (
                <div style={uploadHintStyle}>Uploading hero image...</div>
              )}

              <div style={partnerLabelStyle}>Minimum tier</div>
              <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
                {PARTNER_TIERS.map((t) => {
                  const active = editingPartner.min_tier === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => patch({ min_tier: t.id })}
                      style={{
                        flex: 1,
                        background: active ? "#0B1F3A" : "#E5E5EA",
                        color: active ? "#fff" : "#6B6B6F",
                        border: "none",
                        borderRadius: tokens.radiusCard,
                        padding: "8px 0",
                        fontSize: 12,
                        fontWeight: tokens.fontWeight.bold,
                        cursor: "pointer",
                        fontFamily: "Poppins, sans-serif",
                      }}
                    >
                      {t.label}
                    </button>
                  );
                })}
              </div>

              <div style={partnerLabelStyle}>Category</div>
              <input
                value={editingPartner.category ?? ""}
                onChange={(e) => patch({ category: e.target.value })}
                placeholder="Health, Shopping, etc"
                style={partnerInputStyle}
              />

              <div style={partnerLabelStyle}>Saving text</div>
              <input
                value={editingPartner.saving ?? ""}
                onChange={(e) => patch({ saving: e.target.value })}
                placeholder="e.g. Worth £50+ per visit"
                style={partnerInputStyle}
              />

              <div style={partnerLabelStyle}>CTA label</div>
              <input
                value={editingPartner.cta_label ?? ""}
                onChange={(e) => patch({ cta_label: e.target.value })}
                placeholder="e.g. Access now →"
                style={partnerInputStyle}
              />

              <div style={partnerLabelStyle}>CTA action</div>
              <input
                value={editingPartner.cta_action ?? ""}
                onChange={(e) => patch({ cta_action: e.target.value })}
                placeholder="e.g. pirkx_sso"
                style={partnerInputStyle}
              />

              <div style={partnerLabelStyle}>Perks / features</div>
              {(editingPartner.perks ?? []).map((perk, i) => (
                <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                  <input
                    value={perk}
                    onChange={(e) => {
                      const updated = [...(editingPartner.perks ?? [])];
                      updated[i] = e.target.value;
                      patch({ perks: updated });
                    }}
                    placeholder={`Feature ${i + 1}`}
                    style={{ ...partnerInputStyle, flex: 1 }}
                  />
                  <button
                    type="button"
                    onClick={() => patch({ perks: (editingPartner.perks ?? []).filter((_, j) => j !== i) })}
                    style={{
                      background: "#FEE2E2",
                      border: "none",
                      borderRadius: 12,
                      width: 36,
                      height: 36,
                      cursor: "pointer",
                      color: tokens.red,
                      fontSize: tokens.fontSize.lg,
                      flexShrink: 0,
                    }}
                  >
                    ×
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => patch({ perks: [...(editingPartner.perks ?? []), ""] })}
                style={{
                  background: "#fff",
                  border: "1px solid #E4E8EF",
                  borderRadius: tokens.radiusCard,
                  padding: "8px 16px",
                  fontSize: 12,
                  fontWeight: tokens.fontWeight.bold,
                  color: tokens.blue,
                  cursor: "pointer",
                  marginBottom: 16,
                  fontFamily: "Poppins, sans-serif",
                }}
              >
                Add feature
              </button>

              <div style={{ display: "flex", gap: 16, marginBottom: 16, flexWrap: "wrap" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: tokens.fontWeight.semibold, color: tokens.navy }}>Coming soon</span>
                  <DSMToggle
                    checked={editingPartner.coming_soon}
                    onChange={(v) => patch({ coming_soon: v })}
                  />
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: tokens.fontWeight.semibold, color: tokens.navy }}>Exclusive</span>
                  <DSMToggle
                    checked={editingPartner.exclusive}
                    onChange={(v) => patch({ exclusive: v })}
                  />
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: tokens.fontWeight.semibold, color: tokens.navy }}>Active</span>
                  <DSMToggle checked={editingPartner.active} onChange={(v) => patch({ active: v })} />
                </div>
              </div>

              <div style={partnerLabelStyle}>Sort order</div>
              <input
                type="number"
                min={0}
                value={editingPartner.sort_order}
                onChange={(e) => patch({ sort_order: Number(e.target.value) || 0 })}
                style={partnerInputStyle}
              />
            </div>

            <button
              type="button"
              disabled={savingPartner}
              onClick={savePartner}
              style={{
                margin: "16px 16px 0",
                width: "calc(100% - 32px)",
                background: tokens.blue,
                color: "#fff",
                borderRadius: tokens.radiusCard,
                padding: 16,
                fontSize: 15,
                fontWeight: tokens.fontWeight.extrabold,
                border: "none",
                cursor: "pointer",
                fontFamily: "Poppins, sans-serif",
                boxShadow: "0 4px 0 #0F52A8",
                opacity: savingPartner ? 0.7 : 1,
              }}
            >
              {savingPartner ? "Saving..." : "Save partner"}
            </button>
          </div>
        </div>
      )}

      {perkSheetOpen && editingPerk && (
        <div
          onClick={() => {
            setPerkSheetOpen(false);
            setEditingPerk(null);
            setPerkErrors({});
          }}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 310,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "flex-end",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "relative",
              background: tokens.canvas,
              borderRadius: "16px 16px 0 0",
              padding: "0 0 40px",
              maxHeight: "90vh",
              overflowY: "auto",
              width: "100%",
            }}
          >
            <div style={{ position: "relative", padding: "12px 16px 0" }}>
              <div style={{ width: 36, height: 5, borderRadius: 999, background: "#D1D1D6", margin: "0 auto" }} />
              <button
                type="button"
                aria-label="Close"
                onClick={() => {
                  setPerkSheetOpen(false);
                  setEditingPerk(null);
                  setPerkErrors({});
                }}
                style={{
                  position: "absolute",
                  right: 16,
                  top: 8,
                  width: 30,
                  height: 30,
                  borderRadius: "50%",
                  background: tokens.canvas,
                  border: "1px solid #E4E8EF",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <IconX size={16} color="#6B7686" stroke={2} />
              </button>
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: 16 }}>
              <span style={{ fontSize: tokens.fontSize.xl, fontWeight: tokens.fontWeight.extrabold, color: tokens.navy }}>
                {editingPerk.id === "new" ? "Add perk" : "Edit perk"}
              </span>
              <button
                type="button"
                aria-label="Close"
                onClick={() => {
                  setPerkSheetOpen(false);
                  setEditingPerk(null);
                  setPerkErrors({});
                }}
                style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: tokens.textSecondary }}
              >
                ×
              </button>
            </div>

            <div style={{ padding: "0 16px" }}>
              <PerkPreview perk={editingPerk} partnerName={partnerName(editingPerk.partner_id)} />
              <div style={partnerLabelStyle}>Perk name *</div>
              <input
                value={editingPerk.name ?? ""}
                onChange={(e) => patchPerk({ name: e.target.value })}
                placeholder="e.g. 20% off servicing"
                style={perkFieldStyle("name")}
              />
              <PerkError field="name" />

              <div style={partnerLabelStyle}>Description *</div>
              <textarea
                rows={4}
                value={editingPerk.description ?? ""}
                onChange={(e) => patchPerk({ description: e.target.value })}
                placeholder="Short summary shown on the perk tile"
                style={{ ...perkFieldStyle("description"), resize: "vertical" }}
              />
              <PerkError field="description" />

              <div style={partnerLabelStyle}>Full detail</div>
              <textarea
                rows={6}
                value={editingPerk.detail_text ?? ""}
                onChange={(e) => patchPerk({ detail_text: e.target.value })}
                placeholder="Rich detail shown on the perk detail page..."
                style={{ ...partnerInputStyle, resize: "vertical" }}
              />

              <div style={partnerLabelStyle}>Minimum tier</div>
              <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
                {PARTNER_TIERS.filter((t) => t.id !== "free").map((t) => {
                  const active = editingPerk.min_tier === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => patchPerk({ min_tier: t.id })}
                      style={{
                        flex: 1,
                        background: active ? "#0B1F3A" : "#E5E5EA",
                        color: active ? "#fff" : "#6B6B6F",
                        border: "none",
                        borderRadius: tokens.radiusCard,
                        padding: "8px 0",
                        fontSize: 12,
                        fontWeight: tokens.fontWeight.bold,
                        cursor: "pointer",
                        fontFamily: "Poppins, sans-serif",
                      }}
                    >
                      {t.label}
                    </button>
                  );
                })}
              </div>
              <PerkError field="min_tier" />

              <div style={partnerLabelStyle}>Category</div>
              <input
                value={editingPerk.category ?? ""}
                onChange={(e) => patchPerk({ category: e.target.value })}
                placeholder="Health, Shopping, etc"
                style={partnerInputStyle}
              />

              <div style={partnerLabelStyle}>Price / saving *</div>
              <input
                value={editingPerk.saving ?? ""}
                onChange={(e) => patchPerk({ saving: e.target.value })}
                placeholder="e.g. Worth £50+ per visit, or Free"
                style={perkFieldStyle("saving")}
              />
              <PerkError field="saving" />

              <div style={partnerLabelStyle}>CTA label</div>
              <input
                value={editingPerk.cta_label ?? ""}
                onChange={(e) => patchPerk({ cta_label: e.target.value })}
                placeholder="e.g. Access now →"
                style={partnerInputStyle}
              />

              <div style={partnerLabelStyle}>Link *</div>
              <input
                value={editingPerk.cta_action ?? ""}
                onChange={(e) => patchPerk({ cta_action: e.target.value })}
                placeholder="https://... , /route or pirkx_sso"
                style={perkFieldStyle("cta_action")}
              />
              <PerkError field="cta_action" />

              <div style={partnerLabelStyle}>Bullet points</div>
              {((editingPerk.bullet_points ?? []) as string[]).map((bp, i) => (
                <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                  <input
                    value={bp}
                    onChange={(e) => {
                      const updated = [...(editingPerk.bullet_points ?? [])];
                      updated[i] = e.target.value;
                      patchPerk({ bullet_points: updated });
                    }}
                    placeholder={`Point ${i + 1}`}
                    style={{ ...partnerInputStyle, flex: 1 }}
                  />
                  <button
                    type="button"
                    onClick={() =>
                      patchPerk({
                        bullet_points: (editingPerk.bullet_points ?? []).filter(
                          (_: string, j: number) => j !== i,
                        ),
                      })
                    }
                    style={{
                      background: "#FEE2E2",
                      border: "none",
                      borderRadius: 12,
                      width: 36,
                      height: 36,
                      cursor: "pointer",
                      color: tokens.red,
                      fontSize: tokens.fontSize.lg,
                      flexShrink: 0,
                    }}
                  >
                    ×
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => patchPerk({ bullet_points: [...(editingPerk.bullet_points ?? []), ""] })}
                style={{
                  background: "#fff",
                  border: "1px solid #E4E8EF",
                  borderRadius: tokens.radiusCard,
                  padding: "8px 16px",
                  fontSize: 12,
                  fontWeight: tokens.fontWeight.bold,
                  color: tokens.blue,
                  cursor: "pointer",
                  marginBottom: 16,
                  fontFamily: "Poppins, sans-serif",
                }}
              >
                Add bullet point
              </button>

              <div style={partnerLabelStyle}>Links</div>
              {((editingPerk.links ?? []) as { label: string; url: string }[]).map((link, i) => (
                <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                  <input
                    value={link.label ?? ""}
                    onChange={(e) => {
                      const updated = [...(editingPerk.links ?? [])];
                      updated[i] = { ...updated[i], label: e.target.value };
                      patchPerk({ links: updated });
                    }}
                    placeholder="Label"
                    style={{ ...partnerInputStyle, flex: 1 }}
                  />
                  <input
                    value={link.url ?? ""}
                    onChange={(e) => {
                      const updated = [...(editingPerk.links ?? [])];
                      updated[i] = { ...updated[i], url: e.target.value };
                      patchPerk({ links: updated });
                    }}
                    placeholder="https://"
                    style={{ ...partnerInputStyle, flex: 1 }}
                  />
                  <button
                    type="button"
                    onClick={() =>
                      patchPerk({
                        links: (editingPerk.links ?? []).filter((_: unknown, j: number) => j !== i),
                      })
                    }
                    style={{
                      background: "#FEE2E2",
                      border: "none",
                      borderRadius: 12,
                      width: 36,
                      height: 36,
                      cursor: "pointer",
                      color: tokens.red,
                      fontSize: tokens.fontSize.lg,
                      flexShrink: 0,
                    }}
                  >
                    ×
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => patchPerk({ links: [...(editingPerk.links ?? []), { label: "", url: "" }] })}
                style={{
                  background: "#fff",
                  border: "1px solid #E4E8EF",
                  borderRadius: tokens.radiusCard,
                  padding: "8px 16px",
                  fontSize: 12,
                  fontWeight: tokens.fontWeight.bold,
                  color: tokens.blue,
                  cursor: "pointer",
                  marginBottom: 16,
                  fontFamily: "Poppins, sans-serif",
                }}
              >
                Add link
              </button>

              <div style={partnerLabelStyle}>Hero image</div>
              <input
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                ref={perkHeroInputRef}
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setUploadingPerkHero(true);
                  const path = `perks/hero/${Date.now()}-${Math.random().toString(36).slice(2)}`;
                  const { error } = await supabase.storage.from("marketplace-images").upload(path, file, { upsert: true });
                  if (!error) {
                    const { data: { publicUrl } } = supabase.storage.from("marketplace-images").getPublicUrl(path);
                    patchPerk({ hero_image_url: publicUrl });
                    toast.success("Hero image uploaded");
                  } else {
                    toast.error("Upload failed");
                  }
                  setUploadingPerkHero(false);
                  e.target.value = "";
                }}
              />
              {editingPerk.hero_image_url ? (
                <div style={{ marginBottom: 8 }}>
                  <img
                    src={editingPerk.hero_image_url}
                    alt=""
                    style={{
                      width: "100%",
                      height: 120,
                      objectFit: "cover",
                      borderRadius: 8,
                      marginBottom: 8,
                      display: "block",
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => perkHeroInputRef.current?.click()}
                    style={{ ...removeImageBtnStyle, marginBottom: 0 }}
                  >
                    Change
                  </button>
                </div>
              ) : (
                <div
                  onClick={() => perkHeroInputRef.current?.click()}
                  style={{
                    border: "1px dashed #E2E8F0",
                    borderRadius: tokens.radiusCard,
                    padding: 16,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                    cursor: "pointer",
                    marginBottom: 8,
                    background: "#F8FAFC",
                  }}
                >
                  <IconPhoto size={24} color="#9CA3AF" />
                  <span style={{ fontSize: tokens.fontSize.base, fontWeight: tokens.fontWeight.semibold, color: tokens.navy }}>Add hero image</span>
                  <span style={{ fontSize: tokens.fontSize.sm, color: tokens.textMuted }}>Shown at top of perk detail page</span>
                </div>
              )}
              {uploadingPerkHero && <div style={uploadHintStyle}>Uploading hero image...</div>}

              <div style={partnerLabelStyle}>
                Gallery photos {((editingPerk.gallery_urls ?? []) as string[]).length > 0 && `(${(editingPerk.gallery_urls ?? []).length})`}
              </div>
              <input
                type="file"
                accept="image/*"
                multiple
                style={{ display: "none" }}
                ref={perkGalleryInputRef}
                onChange={async (e) => {
                  const files = e.target.files;
                  if (!files) return;
                  setUploadingPerkGallery(true);
                  const uploaded: string[] = [];
                  for (const file of Array.from(files)) {
                    const path = `perks/gallery/${Date.now()}-${Math.random().toString(36).slice(2)}`;
                    const { error } = await supabase.storage.from("marketplace-images").upload(path, file, { upsert: true });
                    if (!error) {
                      const { data: { publicUrl } } = supabase.storage.from("marketplace-images").getPublicUrl(path);
                      uploaded.push(publicUrl);
                    }
                  }
                  patchPerk({
                    gallery_urls: [...(editingPerk?.gallery_urls ?? []), ...uploaded],
                  });
                  setUploadingPerkGallery(false);
                  toast.success(`${uploaded.length} photo${uploaded.length > 1 ? "s" : ""} added`);
                  e.target.value = "";
                }}
              />
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
                {((editingPerk.gallery_urls ?? []) as string[]).map((url, i, arr) => (
                  <div key={`${url}-${i}`} style={{ width: 72 }}>
                    <div
                      style={{
                        position: "relative",
                        width: 72,
                        height: 72,
                        borderRadius: 8,
                        overflow: "hidden",
                        background: "#F8FAFC",
                      }}
                    >
                      <img src={url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      <div
                        style={{
                          position: "absolute",
                          bottom: 2,
                          left: 2,
                          background: "rgba(11,31,58,0.8)",
                          color: "#fff",
                          borderRadius: tokens.radiusCard,
                          fontSize: tokens.fontSize.xs,
                          padding: "1px 16px",
                          fontFamily: "Poppins, sans-serif",
                        }}
                      >
                        {i + 1}
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          patchPerk({
                            gallery_urls: (editingPerk.gallery_urls ?? []).filter(
                              (_: string, j: number) => j !== i,
                            ),
                          })
                        }
                        style={{
                          position: "absolute",
                          top: 2,
                          right: 2,
                          width: 18,
                          height: 18,
                          borderRadius: "50%",
                          background: "rgba(0,0,0,0.6)",
                          border: "none",
                          cursor: "pointer",
                          color: "#fff",
                          fontSize: 12,
                          lineHeight: 1,
                        }}
                      >
                        ×
                      </button>
                    </div>
                    <div style={{ display: "flex", gap: 4, marginTop: 4 }}>
                      <button
                        type="button"
                        disabled={i === 0}
                        onClick={() => {
                          const next = [...arr];
                          [next[i - 1], next[i]] = [next[i], next[i - 1]];
                          patchPerk({ gallery_urls: next });
                        }}
                        style={{
                          flex: 1,
                          borderRadius: tokens.radiusCard,
                          border: "1px solid #E2E8F0",
                          background: i === 0 ? "#F1F5F9" : "#fff",
                          color: i === 0 ? "#CBD5E1" : "#0B1F3A",
                          cursor: i === 0 ? "default" : "pointer",
                          fontSize: tokens.fontSize.sm,
                          lineHeight: "18px",
                          padding: 0,
                        }}
                        aria-label="Move left"
                      >
                        ‹
                      </button>
                      <button
                        type="button"
                        disabled={i === arr.length - 1}
                        onClick={() => {
                          const next = [...arr];
                          [next[i], next[i + 1]] = [next[i + 1], next[i]];
                          patchPerk({ gallery_urls: next });
                        }}
                        style={{
                          flex: 1,
                          borderRadius: tokens.radiusCard,
                          border: "1px solid #E2E8F0",
                          background: i === arr.length - 1 ? "#F1F5F9" : "#fff",
                          color: i === arr.length - 1 ? "#CBD5E1" : "#0B1F3A",
                          cursor: i === arr.length - 1 ? "default" : "pointer",
                          fontSize: tokens.fontSize.sm,
                          lineHeight: "18px",
                          padding: 0,
                        }}
                        aria-label="Move right"
                      >
                        ›
                      </button>
                    </div>
                  </div>
                ))}
                <div
                  onClick={() => perkGalleryInputRef.current?.click()}
                  style={{
                    width: 72,
                    height: 72,
                    borderRadius: 8,
                    border: "1px dashed #E2E8F0",
                    background: "#F8FAFC",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    flexShrink: 0,
                  }}
                >
                  <IconPhoto size={24} color="#9CA3AF" />
                </div>
              </div>
              <div style={uploadHintStyle}>
                {uploadingPerkGallery
                  ? "Uploading photos..."
                  : "Select multiple images at once. Use ‹ › to set display order."}
              </div>


              <div style={{ fontSize: tokens.fontSize.sm, fontWeight: tokens.fontWeight.semibold, color: tokens.textMuted, textTransform: "uppercase", marginBottom: 8 }}>
                VIDEO
              </div>

              <div
                style={{
                  background: "#E5E5EA",
                  borderRadius: tokens.radiusCard,
                  padding: 4,
                  display: "flex",
                  gap: 4,
                  marginBottom: 12,
                }}
              >
                <button
                  type="button"
                  onClick={() => setPerkVideoMode("embed")}
                  style={{
                    flex: 1,
                    borderRadius: tokens.radiusCard,
                    border: "none",
                    padding: "6px 16px",
                    fontSize: tokens.fontSize.base,
                    fontWeight: tokens.fontWeight.semibold,
                    fontFamily: "Poppins, sans-serif",
                    cursor: "pointer",
                    background: perkVideoMode === "embed" ? "#fff" : "transparent",
                    color: perkVideoMode === "embed" ? "#0B1F3A" : "#6B6B6F",
                    boxShadow: perkVideoMode === "embed" ? "0 2px 6px rgba(0,0,0,0.08)" : "none",
                  }}
                >
                  Embed URL
                </button>
                <button
                  type="button"
                  onClick={() => setPerkVideoMode("upload")}
                  style={{
                    flex: 1,
                    borderRadius: tokens.radiusCard,
                    border: "none",
                    padding: "6px 16px",
                    fontSize: tokens.fontSize.base,
                    fontWeight: tokens.fontWeight.semibold,
                    fontFamily: "Poppins, sans-serif",
                    cursor: "pointer",
                    background: perkVideoMode === "upload" ? "#fff" : "transparent",
                    color: perkVideoMode === "upload" ? "#0B1F3A" : "#6B6B6F",
                    boxShadow: perkVideoMode === "upload" ? "0 2px 6px rgba(0,0,0,0.08)" : "none",
                  }}
                >
                  Upload
                </button>
              </div>

              {perkVideoMode === "embed" ? (
                <>
                  <div style={{ fontSize: tokens.fontSize.sm, fontWeight: tokens.fontWeight.semibold, color: tokens.textMuted, marginBottom: 6 }}>
                    YouTube or Vimeo URL
                  </div>
                  <input
                    value={editingPerk.video_embed_url ?? ""}
                    onChange={(e) => patchPerk({ video_embed_url: e.target.value })}
                    placeholder="https://www.youtube.com/watch?v=... or https://vimeo.com/..."
                    style={{
                      width: "100%",
                      border: "1px solid #E4E8EF",
                      borderRadius: tokens.radiusCard,
                      padding: "12px 16px",
                      fontSize: tokens.fontSize.base,
                      fontFamily: "Poppins, sans-serif",
                    }}
                  />
                  <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 6 }}>
                    Paste a YouTube or Vimeo URL — it will be embedded on the perk page
                  </div>
                  {toEmbedUrl(editingPerk.video_embed_url ?? "") ? (
                    <iframe
                      src={toEmbedUrl(editingPerk.video_embed_url ?? "") ?? undefined}
                      title="Video preview"
                      allowFullScreen
                      style={{
                        width: "100%",
                        aspectRatio: "16/9",
                        borderRadius: 10,
                        border: "1px solid #E4E8EF",
                        marginTop: 8,
                      }}
                    />
                  ) : null}
                </>

              ) : (
                <>
                  <input
                    type="file"
                    accept="video/mp4,video/webm,video/quicktime"
                    style={{ display: "none" }}
                    ref={perkVideoInputRef}
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      if (file.size > 500 * 1024 * 1024) {
                        toast.error("Video must be under 500MB");
                        return;
                      }
                      const path = `perks/${Date.now()}-${Math.random().toString(36).slice(2)}.${file.name.split(".").pop()}`;
                      const { error } = await supabase.storage.from("marketplace-videos").upload(path, file, { upsert: true });
                      if (!error) {
                        const { data: { publicUrl } } = supabase.storage.from("marketplace-videos").getPublicUrl(path);
                        patchPerk({ video_url: publicUrl });
                        toast.success("Video uploaded");
                      } else {
                        toast.error("Upload failed");
                      }
                      e.target.value = "";
                    }}
                  />
                  {editingPerk.video_url ? (
                    <>
                      <video
                        src={editingPerk.video_url}
                        controls
                        style={{
                          width: "100%",
                          borderRadius: 8,
                          maxHeight: 200,
                          marginBottom: 8,
                          border: "1px solid #E4E8EF",
                        }}
                      />
                      <div
                        onClick={() => perkVideoInputRef.current?.click()}
                        style={{
                          display: "flex",
                          gap: 8,
                          alignItems: "center",
                          cursor: "pointer",
                        }}
                      >
                        <IconVideo size={14} color="#1877D6" />
                        <span style={{ fontSize: tokens.fontSize.base, color: tokens.blue }}>Change video</span>
                      </div>
                      <div
                        onClick={() => patchPerk({ video_url: null })}
                        style={{ fontSize: 12, color: tokens.red, cursor: "pointer", marginTop: 4 }}
                      >
                        Remove
                      </div>
                    </>
                  ) : (
                    <div
                      onClick={() => perkVideoInputRef.current?.click()}
                      style={{
                        border: "2px dashed #E4E8EF",
                        borderRadius: tokens.radiusCard,
                        padding: 24,
                        textAlign: "center",
                        cursor: "pointer",
                        background: "#F8FAFC",
                      }}
                    >
                      <IconVideo size={28} color="#9CA3AF" stroke={1.5} />
                      <div style={{ fontSize: tokens.fontSize.base, fontWeight: tokens.fontWeight.semibold, color: tokens.navy, marginTop: 8 }}>Upload video</div>
                      <div style={{ fontSize: tokens.fontSize.sm, color: tokens.textMuted, marginTop: 4 }}>MP4, WebM or MOV · max 500MB</div>
                    </div>
                  )}
                </>
              )}


              <div style={{ display: "flex", gap: 16, marginBottom: 16, flexWrap: "wrap" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: tokens.fontWeight.semibold, color: tokens.navy }}>Coming soon</span>
                  <DSMToggle
                    checked={!!editingPerk.coming_soon}
                    onChange={(v) => patchPerk({ coming_soon: v })}
                  />
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: tokens.fontWeight.semibold, color: tokens.navy }}>Active</span>
                  <DSMToggle checked={!!editingPerk.active} onChange={(v) => patchPerk({ active: v })} />
                </div>
              </div>

              <div style={partnerLabelStyle}>Sort order</div>
              <input
                type="number"
                min={0}
                value={editingPerk.sort_order ?? 0}
                onChange={(e) => patchPerk({ sort_order: Number(e.target.value) || 0 })}
                style={partnerInputStyle}
              />
            </div>

            <button
              type="button"
              disabled={savingPerk}
              onClick={savePerk}
              style={{
                margin: "16px 16px 0",
                width: "calc(100% - 32px)",
                background: tokens.blue,
                color: "#fff",
                borderRadius: tokens.radiusCard,
                padding: 16,
                fontSize: 15,
                fontWeight: tokens.fontWeight.extrabold,
                border: "none",
                cursor: "pointer",
                fontFamily: "Poppins, sans-serif",
                boxShadow: "0 4px 0 #0F52A8",
                opacity: savingPerk ? 0.7 : 1,
              }}
            >
              {savingPerk ? "Saving..." : "Save perk"}
            </button>
          </div>
        </div>
      )}
    </div>

  );
}

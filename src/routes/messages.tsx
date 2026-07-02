import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { MessageSquare, SquarePen, X, Search } from "lucide-react";
import { supabase } from "../lib/supabaseClient";

export const Route = createFileRoute("/messages")({
  head: () => ({
    meta: [{ title: "Messages — DSM by EveryDriver" }],
  }),
  component: MessagesPage,
});

const POPPINS = { fontFamily: "Inter, sans-serif" } as const;

interface Conversation {
  id: string;
  instructor_id: string;
  pupil_id: string;
  last_message: string | null;
  last_message_at: string | null;
  unread_count: number | null;
  pupils: { id: string; name: string } | null;
}

interface PupilLite {
  id: string;
  name: string;
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  const a = parts[0]?.[0] ?? "";
  const b = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (a + b).toUpperCase() || "?";
}

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function formatWhen(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const now = new Date();
  if (startOfDay(d).getTime() === startOfDay(now).getTime()) {
    return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  }
  const y = new Date(now);
  y.setDate(now.getDate() - 1);
  if (startOfDay(d).getTime() === startOfDay(y).getTime()) return "Yesterday";
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function MessagesPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<Conversation[] | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [composeOpen, setComposeOpen] = useState(false);
  const [pupils, setPupils] = useState<PupilLite[]>([]);
  const [pupilQuery, setPupilQuery] = useState("");
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: user } = await supabase.auth.getUser();
      const uid = user.user?.id;
      if (!uid) return;
      setUserId(uid);
      const { data, error } = await supabase
        .from("conversations")
        .select(
          "id, instructor_id, pupil_id, last_message, last_message_at, unread_count, pupils(id, name)",
        )
        .eq("instructor_id", uid)
        .order("last_message_at", { ascending: false, nullsFirst: false });
      if (error) console.error("[messages] fetch error", error);
      setItems((data ?? []) as unknown as Conversation[]);
    })();
  }, []);

  async function openCompose() {
    if (!userId) return;
    setComposeOpen(true);
    if (pupils.length === 0) {
      const { data, error } = await supabase
        .from("pupils")
        .select("id, name")
        .eq("instructor_id", userId)
        .is("deleted_at", null)
        .order("name", { ascending: true });
      if (error) {
        console.error("[messages] pupils fetch error", error);
        return;
      }
      setPupils((data ?? []) as PupilLite[]);
    }
  }

  async function startConversation(pupilId: string) {
    if (!userId || starting) return;
    setStarting(true);
    const existing = items?.find((c) => c.pupil_id === pupilId);
    if (existing) {
      setComposeOpen(false);
      setStarting(false);
      navigate({ to: "/messages/$id", params: { id: existing.id } });
      return;
    }
    const { data, error } = await supabase
      .from("conversations")
      .insert({ instructor_id: userId, pupil_id: pupilId })
      .select("id")
      .single();
    setStarting(false);
    if (error || !data) {
      console.error("[messages] create conversation error", error);
      return;
    }
    setComposeOpen(false);
    navigate({ to: "/messages/$id", params: { id: data.id } });
  }

  const filteredPupils = useMemo(() => {
    const q = pupilQuery.trim().toLowerCase();
    if (!q) return pupils;
    return pupils.filter((p) => p.name.toLowerCase().includes(q));
  }, [pupils, pupilQuery]);

  return (
    <div className="min-h-screen bg-white pb-24 pb-safe" style={POPPINS}>
      {/* Top bar */}
      <div
        className="sticky top-0 z-40 flex items-center justify-between px-4"
        style={{ height: 52, backgroundColor: "#0B1F3A" }}
      >
        <div className="flex items-center gap-2">
          <span className="text-[15px] font-bold text-white" style={POPPINS}>DSM</span>
          <span className="text-[15px] text-white" style={POPPINS}>Messages</span>
        </div>
        <button
          type="button"
          aria-label="Compose message"
          onClick={openCompose}
          className="flex items-center justify-center"
          style={{ width: 32, height: 32 }}
        >
          <SquarePen size={20} color="#FFFFFF" />
        </button>
      </div>

      <div className="px-4 pt-3">
        {items === null ? null : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <MessageSquare size={32} color="#6B7280" />
            <p className="text-[14px] text-[#6B7280]" style={POPPINS}>No messages yet</p>
            <button
              type="button"
              onClick={openCompose}
              className="rounded-lg px-4 py-2 text-[13px] font-semibold text-white"
              style={{ backgroundColor: "#1877D6", ...POPPINS }}
            >
              Start a conversation
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {items.map((c) => {
              const name = c.pupils?.name ?? "Unknown pupil";
              const unread = Number(c.unread_count ?? 0);
              return (
                <Link
                  key={c.id}
                  to="/messages/$id"
                  params={{ id: c.id }}
                  className="block rounded-xl"
                  style={{
                    backgroundColor: "#F8F9FB",
                    borderWidth: "0.5px",
                    borderStyle: "solid",
                    borderColor: "#EEF2F7",
                  }}
                >
                  <div className="flex items-center gap-3 p-3">
                    <div
                      className="flex items-center justify-center rounded-full shrink-0 text-[13px] font-semibold"
                      style={{
                        width: 40,
                        height: 40,
                        backgroundColor: "#1877D6",
                        color: "#FFFFFF",
                        ...POPPINS,
                      }}
                    >
                      {initials(name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div
                        className="text-[14px] font-semibold text-[#0B1F3A] truncate"
                        style={POPPINS}
                      >
                        {name}
                      </div>
                      <div
                        className="text-[13px] text-[#6B7280] truncate"
                        style={POPPINS}
                      >
                        {c.last_message ?? ""}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className="text-[11px] text-[#6B7280]" style={POPPINS}>
                        {formatWhen(c.last_message_at)}
                      </span>
                      {unread > 0 && (
                        <span
                          className="text-[10px] font-bold text-white rounded-full flex items-center justify-center"
                          style={{
                            minWidth: 18,
                            height: 18,
                            padding: "0 5px",
                            backgroundColor: "#1877D6",
                            ...POPPINS,
                          }}
                        >
                          {unread}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {composeOpen && (
        <>
          <div
            className="fixed inset-0 z-50"
            style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
            onClick={() => setComposeOpen(false)}
          />
          <div
            className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] z-50 bg-white rounded-t-2xl pb-safe"
            style={{ maxHeight: "80vh", display: "flex", flexDirection: "column", ...POPPINS }}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "#EEF2F7" }}>
              <div className="text-[15px] font-semibold text-[#0B1F3A]" style={POPPINS}>
                New conversation
              </div>
              <button
                type="button"
                aria-label="Close"
                onClick={() => setComposeOpen(false)}
                className="flex items-center justify-center"
                style={{ width: 32, height: 32 }}
              >
                <X size={20} color="#6B7280" />
              </button>
            </div>
            <div className="px-4 py-3 border-b" style={{ borderColor: "#EEF2F7" }}>
              <div
                className="flex items-center gap-2 rounded-lg px-3"
                style={{ backgroundColor: "#F3F8FF", height: 40 }}
              >
                <Search size={16} color="#6B7280" />
                <input
                  type="text"
                  value={pupilQuery}
                  onChange={(e) => setPupilQuery(e.target.value)}
                  placeholder="Search pupils"
                  className="flex-1 bg-transparent outline-none text-[14px] text-[#0B1F3A]"
                  style={POPPINS}
                />
              </div>
            </div>
            <div className="overflow-y-auto px-2 py-2" style={{ flex: 1 }}>
              {filteredPupils.length === 0 ? (
                <div className="py-8 text-center text-[13px] text-[#6B7280]" style={POPPINS}>
                  {pupils.length === 0 ? "Loading pupils…" : "No matches"}
                </div>
              ) : (
                filteredPupils.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    disabled={starting}
                    onClick={() => startConversation(p.id)}
                    className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left"
                    style={{ backgroundColor: "transparent", ...POPPINS }}
                  >
                    <div
                      className="flex items-center justify-center rounded-full shrink-0 text-[13px] font-semibold"
                      style={{
                        width: 36,
                        height: 36,
                        backgroundColor: "#1877D6",
                        color: "#FFFFFF",
                        ...POPPINS,
                      }}
                    >
                      {initials(p.name)}
                    </div>
                    <div className="text-[14px] font-medium text-[#0B1F3A]" style={POPPINS}>
                      {p.name}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ChevronLeft, Plus, FileText } from "lucide-react";
import { Card } from "../components/dsm/Card";
import { supabase } from "../lib/supabaseClient";

export const Route = createFileRoute("/notes/")({
  head: () => ({
    meta: [
      { title: "Notes — DSM by EveryDriver" },
      { name: "description", content: "Capture and review your notes." },
    ],
  }),
  component: NotesListPage,
});

const POPPINS = { fontFamily: "Poppins, sans-serif" } as const;

interface NoteRow {
  id: string;
  title: string;
  body: string;
  updated_at: string;
}

function formatShortDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function NotesListPage() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [notes, setNotes] = useState<NoteRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user) setUserId(data.user.id);
      else setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (!userId) return;
    (async () => {
      const { data, error } = await supabase
        .from("notes")
        .select("id, title, body, updated_at")
        .eq("instructor_id", userId)
        .is("deleted_at", null)
        .order("updated_at", { ascending: false });
      if (error) console.error("[notes] fetch error", error);
      setNotes((data ?? []) as NoteRow[]);
      setLoading(false);
    })();
  }, [userId]);

  const createNote = async () => {
    if (!userId) return;
    const { data, error } = await supabase
      .from("notes")
      .insert({ instructor_id: userId, title: "", body: "" })
      .select("id")
      .single();
    if (error || !data) {
      console.error("[notes] create error", error);
      return;
    }
    navigate({ to: "/notes/$id", params: { id: data.id } });
  };

  return (
    <div className="min-h-screen bg-white pb-8" style={POPPINS}>
      {/* TOP BAR */}
      <div
        className="sticky top-0 z-40 h-[52px] px-4 flex items-center justify-between"
        style={{ backgroundColor: "#0F2044" }}
      >
        <button
          type="button"
          aria-label="Back"
          onClick={() => navigate({ to: "/home" })}
          className="flex items-center justify-center"
          style={{ width: 28, height: 28 }}
        >
          <ChevronLeft size={22} color="#ffffff" />
        </button>
        <div className="text-white text-[15px] font-semibold">Notes</div>
        <button
          type="button"
          aria-label="New note"
          onClick={createNote}
          className="flex items-center justify-center"
          style={{ width: 28, height: 28 }}
        >
          <Plus size={22} color="#ffffff" />
        </button>
      </div>

      <div className="px-4 mt-3 flex flex-col" style={{ gap: 8 }}>
        {loading ? null : notes.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center"
            style={{ padding: "64px 0", color: "#6B7280" }}
          >
            <FileText size={32} color="#9CA3AF" />
            <div className="mt-2 text-[13px]">No notes yet</div>
          </div>
        ) : (
          notes.map((n) => (
            <Card
              key={n.id}
              onClick={() => navigate({ to: "/notes/$id", params: { id: n.id } })}
              className="cursor-pointer"
            >
              <div className="flex items-start justify-between" style={{ gap: 8 }}>
                <div className="min-w-0 flex-1">
                  <div className="text-[14px] font-semibold text-[#0F2044] truncate">
                    {n.title?.trim() || "Untitled"}
                  </div>
                  <div
                    className="text-[13px] text-[#6B7280] mt-1"
                    style={{
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}
                  >
                    {n.body?.trim() || "No content"}
                  </div>
                </div>
                <div className="text-[11px] text-[#6B7280] shrink-0">
                  {formatShortDate(n.updated_at)}
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

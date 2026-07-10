import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ChevronLeft, Trash2 } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { ConfirmDialog } from "../components/ConfirmDialog";

export const Route = createFileRoute("/notes/$id")({
  head: () => ({
    meta: [{ title: "Note — DSM by EveryDriver" }],
  }),
  component: NoteEditPage,
});

const POPPINS = { fontFamily: "Inter, sans-serif" } as const;

function NoteEditPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [savedFlag, setSavedFlag] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flagTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("notes")
        .select("title, body")
        .eq("id", id)
        .is("deleted_at", null)
        .maybeSingle();
      if (error) console.error("[note] fetch error", error);
      setTitle((data?.title as string) ?? "");
      setBody((data?.body as string) ?? "");
      setLoaded(true);
    })();
  }, [id]);

  useEffect(() => {
    if (!loaded) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      const { error } = await supabase
        .from("notes")
        .update({ title, body, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) {
        console.error("[note] save error", error);
        return;
      }
      setSavedFlag(true);
      if (flagTimerRef.current) clearTimeout(flagTimerRef.current);
      flagTimerRef.current = setTimeout(() => setSavedFlag(false), 1500);
    }, 1000);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [title, body, loaded, id]);

  const deleteNote = async () => {
    setConfirmOpen(false);
    const { error } = await supabase
      .from("notes")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);
    if (error) {
      console.error("[note] delete error", error);
      return;
    }
    navigate({ to: "/notes" });
  };

  return (
    <div className="min-h-screen bg-[#EEF2F7] flex flex-col" style={POPPINS}>
      {/* TOP BAR */}
      <div
        className="sticky top-0 z-40 h-[52px] px-4 flex items-center justify-between"
        style={{ backgroundColor: "#0B1F3A" }}
      >
        <button
          type="button"
          aria-label="Back"
          onClick={() => navigate({ to: "/notes" })}
          className="flex items-center justify-center"
          style={{ width: 28, height: 28 }}
        >
          <ChevronLeft size={22} color="#ffffff" />
        </button>
        <div className="flex items-center" style={{ gap: 8 }}>
          <div className="text-white text-[15px] font-semibold">Note</div>
          {savedFlag && (
            <span className="text-[11px]" style={{ color: "#1877D6" }}>
              Saved
            </span>
          )}
        </div>
        <button
          type="button"
          aria-label="Delete note"
          onClick={() => setConfirmOpen(true)}
          className="flex items-center justify-center"
          style={{ width: 28, height: 28 }}
        >
          <Trash2 size={20} color="#1877D6" />
        </button>
      </div>

      <div className="flex flex-col flex-1 px-4 pt-4">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title"
          className="w-full text-[20px] font-semibold text-[#0B1F3A] bg-transparent outline-none border-0 placeholder-[#9CA3AF]"
          style={{ fontFamily: "Inter, sans-serif" }}
        />
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Start writing..."
          className="w-full flex-1 mt-3 text-[14px] text-[#0B1F3A] bg-transparent outline-none border-0 resize-none placeholder-[#9CA3AF]"
          style={{ fontFamily: "Inter, sans-serif", minHeight: "60vh" }}
        />
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="Delete this note?"
        message="This cannot be undone."
        confirmLabel="Delete"
        onConfirm={deleteNote}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}

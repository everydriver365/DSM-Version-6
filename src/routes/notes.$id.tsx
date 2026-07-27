import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import InstructorTopBar from "@/components/dsm/InstructorTopBar";
import { Trash2 } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { PageLayout } from "@/components/PageLayout";

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
    <PageLayout className="flex flex-col" style={POPPINS}>
      <InstructorTopBar
        firstName=""
        pageTitle="Note"
        onBack={() => navigate({ to: "/notes" as never })}
        onBell={() => navigate({ to: "/notifications" as never })}
        onPhone={() => navigate({ to: "/enquiries" as never })}
        onLiveTrack={() => navigate({ to: "/live" as never })}
        onMenu={() => navigate({ to: "/more" as never })}
        onMicPress={() => toast.info("Voice commands coming soon!")}
      />
      <div style={{ height: "calc(60px + env(safe-area-inset-top, 0px))" }} />

      {/* Actions row */}
      <div className="flex items-center justify-between px-4 pt-3">
        <span className="text-[11px]" style={{ color: "#1877D6" }}>{savedFlag ? "Saved" : ""}</span>
        <button
          type="button"
          aria-label="Delete note"
          onClick={() => setConfirmOpen(true)}
          className="inline-flex items-center gap-2 text-[13px] font-semibold"
          style={{ height: 34, padding: "0 12px", borderRadius: 10, border: "1px solid #E2E8F0", background: "#FFFFFF", color: "#CC2229" }}
        >
          <Trash2 size={15} />
          Delete
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
    </PageLayout>
  );
}

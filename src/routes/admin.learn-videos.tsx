import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ChevronLeft, Play, Pencil, Trash2, Plus, Upload } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabaseClient";
import { useAdminGate } from "./admin";

export const Route = createFileRoute("/admin/learn-videos")({
  component: AdminLearnVideosPage,
});

const POPPINS = { fontFamily: "Inter, sans-serif" } as const;
const NAVY = "#0B1F3A";
const BLUE = "#1877D6";
const GREY = "#6B7280";
const BORDER = "#E2E6ED";
const RED = "#CC2229";

interface LearnVideo {
  id: string;
  title: string;
  duration: string | null;
  url: string | null;
  sort_order: number | null;
}

function slugify(s: string) {
  return (
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "video"
  );
}

async function uploadVideo(file: File, title: string) {
  const ext = file.name.split(".").pop()?.toLowerCase() || "mp4";
  const path = `${slugify(title)}-${Date.now()}.${ext}`;
  const { error } = await supabase.storage
    .from("learn-videos")
    .upload(path, file, { cacheControl: "3600", upsert: false });
  if (error) throw error;
  const { data } = supabase.storage.from("learn-videos").getPublicUrl(path);
  return data.publicUrl;
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  height: 44,
  borderRadius: 10,
  border: `1px solid ${BORDER}`,
  padding: "0 12px",
  fontSize: 14,
  color: NAVY,
  background: "#fff",
  outline: "none",
  ...POPPINS,
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 13,
  fontWeight: 600,
  color: NAVY,
  marginBottom: 6,
  marginTop: 14,
};

function VideoForm({
  initial,
  onCancel,
  onSaved,
}: {
  initial: LearnVideo | null;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [duration, setDuration] = useState(initial?.duration ?? "");
  const [sortOrder, setSortOrder] = useState<string>(
    initial?.sort_order != null ? String(initial.sort_order) : "0",
  );
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<
    "idle" | "uploading" | "saved" | "error"
  >("idle");


  const handleSubmit = async () => {
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }
    setSaving(true);
    try {
      let url = initial?.url ?? null;
      if (file) {
        setUploadStatus("uploading");
        url = await uploadVideo(file, title.trim());
      }

      const payload = {
        title: title.trim(),
        duration: duration.trim() || null,
        url,
        sort_order: Number(sortOrder) || 0,
      };

      const { error } = initial?.id
        ? await supabase.from("learn_videos").update(payload).eq("id", initial.id)
        : await supabase.from("learn_videos").insert(payload);
      if (error) throw error;

      setUploadStatus("saved");
      setTimeout(() => {
        onSaved();
      }, 1500);
    } catch (e) {
      console.error("[admin/learn-videos] save failed", e);
      setUploadStatus("error");
      toast.error((e as Error).message || "Failed to save video");
    } finally {
      setSaving(false);
    }
  };


  return (
    <div
      style={{
        background: "#fff",
        border: `1px solid ${BORDER}`,
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
      }}
    >
      <div style={{ fontSize: 15, fontWeight: 600, color: NAVY }}>
        {initial ? "Edit video" : "Add video"}
      </div>

      <label style={labelStyle} htmlFor="lv-title">Title</label>
      <input
        id="lv-title"
        style={inputStyle}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Set up recurring lessons"
      />

      <label style={labelStyle} htmlFor="lv-duration">Duration</label>
      <input
        id="lv-duration"
        style={inputStyle}
        value={duration}
        onChange={(e) => setDuration(e.target.value)}
        placeholder="0:24"
      />

      <label style={labelStyle} htmlFor="lv-order">Sort order</label>
      <input
        id="lv-order"
        type="number"
        style={inputStyle}
        value={sortOrder}
        onChange={(e) => setSortOrder(e.target.value)}
      />

      <label style={labelStyle} htmlFor="lv-file">
        {initial?.url ? "Replace video file (optional)" : "Video file"}
      </label>
      <input
        id="lv-file"
        type="file"
        accept="video/*"
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        style={{ ...inputStyle, height: "auto", padding: 10, fontSize: 13 }}
      />
      {file && (
        <div style={{ fontSize: 12, color: GREY, marginTop: 6 }}>
          {file.name} · {(file.size / 1024 / 1024).toFixed(1)} MB
        </div>
      )}

      <div style={{ display: "flex", gap: 8, marginTop: 18 }}>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={saving}
          style={{
            flex: 1,
            height: 44,
            borderRadius: 10,
            background: BLUE,
            color: "#fff",
            border: "none",
            fontWeight: 600,
            cursor: "pointer",
            opacity: saving ? 0.7 : 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            ...POPPINS,
          }}
        >
          <Upload size={16} />
          {saving ? "Saving…" : "Save"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          style={{
            height: 44,
            padding: "0 18px",
            borderRadius: 10,
            background: "#fff",
            color: NAVY,
            border: `1px solid ${BORDER}`,
            fontWeight: 600,
            cursor: "pointer",
            ...POPPINS,
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function AdminLearnVideosPage() {
  const navigate = useNavigate();
  const gate = useAdminGate();

  const [loading, setLoading] = useState(true);
  const [videos, setVideos] = useState<LearnVideo[]>([]);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<LearnVideo | null>(null);

  useEffect(() => {
    if (gate === "denied") navigate({ to: "/home" });
  }, [gate, navigate]);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("learn_videos")
      .select("id, title, duration, url, sort_order")
      .order("sort_order", { ascending: true });
    if (error) {
      console.error("[admin/learn-videos] fetch failed", error);
      toast.error("Failed to load Learn videos");
    } else {
      setVideos((data as LearnVideo[]) ?? []);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (gate === "allowed") load();
  }, [gate]);

  const handleDelete = async (v: LearnVideo) => {
    if (!window.confirm(`Delete "${v.title}"?`)) return;
    const { error } = await supabase.from("learn_videos").delete().eq("id", v.id);
    if (error) {
      console.error("[admin/learn-videos] delete failed", error);
      toast.error("Failed to delete video");
      return;
    }
    toast.success("Video deleted");
    load();
  };

  if (gate === "checking") {
    return (
      <div style={{ background: "#fff", minHeight: "100vh", padding: 24, ...POPPINS, color: GREY }}>
        Checking access…
      </div>
    );
  }
  if (gate === "denied") {
    return (
      <div style={{ background: "#fff", minHeight: "100vh", padding: 24, ...POPPINS }}>
        <div style={{ fontSize: 18, fontWeight: 600, color: BLUE }}>Access denied</div>
      </div>
    );
  }

  return (
    <div style={{ background: "#DCE4F0", minHeight: "100vh", ...POPPINS, paddingBottom: 32 }}>
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 30,
          background: NAVY,
          color: "#fff",
          padding: "calc(env(safe-area-inset-top, 0px) + 12px) 16px 14px",
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <button
          type="button"
          onClick={() => navigate({ to: "/admin" })}
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
        <span style={{ fontSize: 16, fontWeight: 600, flex: 1 }}>Learn videos</span>
      </div>

      <div style={{ padding: 16 }}>
        {!adding && !editing && (
          <button
            type="button"
            onClick={() => setAdding(true)}
            style={{
              width: "100%",
              height: 44,
              borderRadius: 10,
              background: BLUE,
              color: "#fff",
              border: "none",
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              marginBottom: 16,
              ...POPPINS,
            }}
          >
            <Plus size={18} />
            Add video
          </button>
        )}

        {(adding || editing) && (
          <VideoForm
            initial={editing}
            onCancel={() => {
              setAdding(false);
              setEditing(null);
            }}
            onSaved={() => {
              setAdding(false);
              setEditing(null);
              load();
            }}
          />
        )}

        {loading ? (
          <div style={{ textAlign: "center", padding: 40, color: GREY, fontSize: 13 }}>Loading…</div>
        ) : videos.length === 0 ? (
          <div style={{ textAlign: "center", padding: 40, color: GREY, fontSize: 13 }}>
            No Learn videos yet.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {videos.map((v) => (
              <div
                key={v.id}
                style={{
                  background: "#fff",
                  border: `1px solid ${BORDER}`,
                  borderRadius: 12,
                  padding: 12,
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                <div
                  title={v.url ? "Video uploaded" : "No video uploaded yet"}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    background: v.url ? "#E8F1FC" : "#F1F3F6",
                    color: v.url ? BLUE : "#B4BCC7",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <Play size={16} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 600,
                      color: NAVY,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {v.title}
                  </div>
                  <div style={{ fontSize: 12, color: GREY, marginTop: 2 }}>
                    {v.duration || "—"} · #{v.sort_order ?? 0}
                    {!v.url && " · no video uploaded yet"}
                  </div>
                </div>
                <button
                  type="button"
                  aria-label="Edit"
                  onClick={() => {
                    setAdding(false);
                    setEditing(v);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 8,
                    border: `1px solid ${BORDER}`,
                    background: "#fff",
                    color: NAVY,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                  }}
                >
                  <Pencil size={15} />
                </button>
                <button
                  type="button"
                  aria-label="Delete"
                  onClick={() => handleDelete(v)}
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 8,
                    border: `1px solid ${BORDER}`,
                    background: "#fff",
                    color: RED,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                  }}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminLearnVideosPage;

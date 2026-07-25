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
  thumbnail_url: string | null;
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

function getYouTubeId(url: string): string | null {
  const match = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
  );
  return match ? match[1] : null;
}

function youtubeThumbnail(url: string): string | null {
  const id = getYouTubeId(url);
  return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null;
}

async function uploadToBucket(file: File, title: string, fallbackExt: string) {
  const ext = file.name.split(".").pop()?.toLowerCase() || fallbackExt;
  const path = `${slugify(title)}-${Date.now()}.${ext}`;
  const { error } = await supabase.storage
    .from("learn-videos")
    .upload(path, file, { cacheControl: "3600", upsert: false });
  if (error) throw error;
  const { data } = supabase.storage.from("learn-videos").getPublicUrl(path);
  return data.publicUrl;
}

async function uploadVideo(file: File, title: string) {
  return uploadToBucket(file, title, "mp4");
}

async function uploadThumbnail(file: File, title: string) {
  return uploadToBucket(file, `${title}-thumb`, "jpg");
}

/** Grab a poster frame from a locally selected video file. Returns null if the
 *  browser can't decode/render a frame (codec issues, blank canvas, etc). */
async function captureVideoFrame(file: File): Promise<File | null> {
  const objectUrl = URL.createObjectURL(file);
  try {
    const video = document.createElement("video");
    video.preload = "auto";
    video.muted = true;
    video.playsInline = true;
    video.crossOrigin = "anonymous";
    video.src = objectUrl;

    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("metadata timeout")), 8000);
      video.onloadedmetadata = () => {
        clearTimeout(timer);
        resolve();
      };
      video.onerror = () => {
        clearTimeout(timer);
        reject(new Error("video decode failed"));
      };
    });

    const duration = Number.isFinite(video.duration) ? video.duration : 0;
    const target = duration > 0 ? Math.min(1, duration * 0.1) : 0;

    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("seek timeout")), 8000);
      video.onseeked = () => {
        clearTimeout(timer);
        resolve();
      };
      video.onerror = () => {
        clearTimeout(timer);
        reject(new Error("seek failed"));
      };
      try {
        video.currentTime = target;
      } catch {
        clearTimeout(timer);
        reject(new Error("seek unsupported"));
      }
    });

    const canvas = document.createElement("canvas");
    canvas.width = 640;
    canvas.height = 360;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Blank-frame guard: sample a few pixels, bail if everything is identical.
    try {
      const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      let varied = false;
      const first = data[0] + data[1] + data[2];
      for (let i = 4; i < data.length; i += 4 * 997) {
        if (Math.abs(data[i] + data[i + 1] + data[i + 2] - first) > 6) {
          varied = true;
          break;
        }
      }
      if (!varied) return null;
    } catch {
      // getImageData can be blocked; keep the frame rather than failing.
    }

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), "image/jpeg", 0.8),
    );
    if (!blob) return null;
    return new File([blob], "poster.jpg", { type: "image/jpeg" });
  } catch (e) {
    console.warn("[admin/learn-videos] frame capture failed", e);
    return null;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
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
  const [thumbFile, setThumbFile] = useState<File | null>(null);
  const [autoThumb, setAutoThumb] = useState<File | null>(null);
  const [autoThumbUrl, setAutoThumbUrl] = useState<string | null>(null);
  const [capturing, setCapturing] = useState(false);
  const [source, setSource] = useState<"upload" | "youtube">(
    initial?.url && /youtu/.test(initial.url) ? "youtube" : "upload",
  );
  const [youtubeUrl, setYoutubeUrl] = useState(
    initial?.url && /youtu/.test(initial.url) ? initial.url : "",
  );
  const [saving, setSaving] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<
    "idle" | "uploading" | "saved" | "error"
  >("idle");

  const derivedYoutubeThumb = youtubeUrl.trim()
    ? youtubeThumbnail(youtubeUrl.trim())
    : null;

  const manualThumbUrl = thumbFile ? URL.createObjectURL(thumbFile) : null;
  useEffect(() => {
    return () => {
      if (manualThumbUrl) URL.revokeObjectURL(manualThumbUrl);
    };
  }, [manualThumbUrl]);

  useEffect(() => {
    return () => {
      if (autoThumbUrl) URL.revokeObjectURL(autoThumbUrl);
    };
  }, [autoThumbUrl]);

  const previewThumb = manualThumbUrl || autoThumbUrl || initial?.thumbnail_url || null;

  const handleFileChange = async (picked: File | null) => {
    setFile(picked);
    setAutoThumb(null);
    setAutoThumbUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    if (!picked) return;
    setCapturing(true);
    const frame = await captureVideoFrame(picked);
    setCapturing(false);
    if (frame) {
      setAutoThumb(frame);
      setAutoThumbUrl(URL.createObjectURL(frame));
    }
  };

  const handleSubmit = async () => {

    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }
    setSaving(true);
    try {
      let url = initial?.url ?? null;
      let thumbnailUrl = initial?.thumbnail_url ?? null;
      if (source === "youtube") {
        if (!youtubeUrl.trim()) {
          toast.error("Paste a YouTube link");
          setSaving(false);
          return;
        }
        url = youtubeUrl.trim();
        thumbnailUrl = youtubeThumbnail(url) ?? thumbnailUrl;
      } else {
        if (file) {
          setUploadStatus("uploading");
          url = await uploadVideo(file, title.trim());
        }
        // Manual thumbnail always wins, then the auto-captured poster frame.
        const coverFile = thumbFile ?? autoThumb;
        if (coverFile) {
          setUploadStatus("uploading");
          thumbnailUrl = await uploadThumbnail(coverFile, title.trim());
        }
      }



      const payload = {
        title: title.trim(),
        duration: duration.trim() || null,
        url,
        thumbnail_url: thumbnailUrl,
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

      <label style={labelStyle}>Video source</label>
      <div style={{ display: "flex", gap: 8 }}>
        {(["upload", "youtube"] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setSource(s)}
            style={{
              flex: 1,
              padding: "10px 12px",
              borderRadius: 10,
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              border: `1px solid ${source === s ? BLUE : BORDER}`,
              background: source === s ? "#E8F1FC" : "#fff",
              color: source === s ? BLUE : GREY,
            }}
          >
            {s === "upload" ? "Upload file" : "YouTube link"}
          </button>
        ))}
      </div>

      {source === "youtube" ? (
        <>
          <label style={labelStyle} htmlFor="lv-yt">YouTube link</label>
          <input
            id="lv-yt"
            style={inputStyle}
            value={youtubeUrl}
            onChange={(e) => setYoutubeUrl(e.target.value)}
            placeholder="https://www.youtube.com/watch?v=..."
          />
          {derivedYoutubeThumb && (
            <div
              style={{
                marginTop: 10,
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              <img
                src={derivedYoutubeThumb}
                alt="YouTube thumbnail preview"
                style={{
                  width: 96,
                  height: 54,
                  objectFit: "cover",
                  borderRadius: 8,
                  border: `1px solid ${BORDER}`,
                }}
              />
              <span style={{ fontSize: 12, color: GREY }}>
                Thumbnail set automatically
              </span>
            </div>
          )}
        </>
      ) : (
        <>
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

          <label style={labelStyle} htmlFor="lv-thumb">
            Thumbnail image (optional)
          </label>
          <input
            id="lv-thumb"
            type="file"
            accept="image/*"
            onChange={(e) => setThumbFile(e.target.files?.[0] ?? null)}
            style={{ ...inputStyle, height: "auto", padding: 10, fontSize: 13 }}
          />
          {thumbFile && (
            <div style={{ fontSize: 12, color: GREY, marginTop: 6 }}>
              {thumbFile.name} · {(thumbFile.size / 1024).toFixed(0)} KB
            </div>
          )}
        </>
      )}


      {file && (
        <div style={{ fontSize: 12, color: GREY, marginTop: 6 }}>
          {file.name} · {(file.size / 1024 / 1024).toFixed(1)} MB
        </div>
      )}

      {uploadStatus === "uploading" && (
        <div style={{ marginTop: 16 }}>
          <div
            style={{
              fontSize: 13,
              color: NAVY,
              fontWeight: 600,
              marginBottom: 8,
            }}
          >
            Uploading video...
          </div>
          <div
            style={{
              height: 6,
              borderRadius: 3,
              background: "#E2E6ED",
              overflow: "hidden",
              position: "relative",
            }}
          >
            <div
              className="lv-progress-bar"
              style={{
                height: "100%",
                width: "40%",
                background: BLUE,
                borderRadius: 3,
                position: "absolute",
                left: 0,
                top: 0,
              }}
            />
          </div>
          <style>{`
            @keyframes lv-progress-slide {
              0% { transform: translateX(-100%); }
              50% { transform: translateX(150%); }
              100% { transform: translateX(-100%); }
            }
            .lv-progress-bar {
              animation: lv-progress-slide 1.4s ease-in-out infinite;
            }
          `}</style>
        </div>
      )}

      {uploadStatus === "saved" && (
        <div
          style={{
            marginTop: 16,
            display: "flex",
            alignItems: "center",
            gap: 8,
            color: "#1E8E3E",
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
          Saved to Learn videos
        </div>
      )}

      {uploadStatus === "error" && (
        <div style={{ marginTop: 16, fontSize: 13, color: RED, fontWeight: 600 }}>
          Upload failed. Please try again.
        </div>
      )}

      <div style={{ display: "flex", gap: 8, marginTop: 18 }}>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={saving || uploadStatus === "saved"}
          style={{
            flex: 1,
            height: 44,
            borderRadius: 10,
            background: BLUE,
            color: "#fff",
            border: "none",
            fontWeight: 600,
            cursor: "pointer",
            opacity: saving || uploadStatus === "saved" ? 0.7 : 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            ...POPPINS,
          }}
        >
          <Upload size={16} />
          {uploadStatus === "uploading"
            ? "Uploading…"
            : uploadStatus === "saved"
              ? "Saved"
              : saving
                ? "Saving…"
                : "Save"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={saving || uploadStatus === "saved"}
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
      .select("id, title, duration, url, thumbnail_url, sort_order")
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

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabaseClient";
import { uploadVideo, uploadImage } from "@/lib/uploadFile";
import {
  IconChevronLeft,
  IconBook,
  IconPlus,
  IconPlayerPlay,
  IconEye,
  IconEyeOff,
  IconUpload,
  IconX,
  IconDotsVertical,
  IconPencil,
  IconTrash,
} from "@tabler/icons-react";


export const Route = createFileRoute("/bitesize")({
  head: () => ({
    meta: [
      { title: "DSM Bitesize — Short CPD videos for instructors" },
      {
        name: "description",
        content:
          "Bite-sized CPD videos for driving instructors: teaching techniques, DVSA updates, Standards Check prep and business tips.",
      },
      { property: "og:title", content: "DSM Bitesize — Short CPD videos" },
      {
        property: "og:description",
        content:
          "Bite-sized CPD videos for driving instructors: teaching techniques, DVSA updates and more.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: BitesizePage,
});

interface BitesizeVideo {
  id: string;
  title: string;
  description: string | null;
  video_url: string;
  thumbnail_url: string | null;
  category: string | null;
  duration_mins: number | null;
  is_published: boolean;
  views: number;
  created_at: string;
}

const CATEGORIES = [
  "All",
  "Teaching techniques",
  "DVSA updates",
  "Standards Check",
  "Business tips",
  "Pupil psychology",
  "Test centre tips",
];

const POPPINS = { fontFamily: "Poppins, sans-serif" } as const;

const labelStyle: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  color: "#6B7686",
  marginBottom: 6,
  display: "block",
  ...POPPINS,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  border: "1px solid #E4E8EF",
  borderRadius: 10,
  padding: "10px 12px",
  fontSize: 14,
  color: "#0B1F3A",
  background: "#fff",
  outline: "none",
  ...POPPINS,
};

function BitesizePage() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [videos, setVideos] = useState<BitesizeVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("All");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [playingVideo, setPlayingVideo] = useState<BitesizeVideo | null>(null);

  // Upload form state
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadDescription, setUploadDescription] = useState("");
  const [uploadCategory, setUploadCategory] = useState("Teaching techniques");
  const [uploadDuration, setUploadDuration] = useState("");
  const [uploadPublished, setUploadPublished] = useState(false);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [thumbFile, setThumbFile] = useState<File | null>(null);
  const [thumbPreview, setThumbPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");

  // Admin edit state
  const [editVideo, setEditVideo] = useState<BitesizeVideo | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editDuration, setEditDuration] = useState("");
  const [editPublished, setEditPublished] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id ?? null);
    });
  }, []);

  useEffect(() => {
    if (!userId) return;
    supabase
      .from("admin_users")
      .select("user_id")
      .eq("user_id", userId)
      .maybeSingle()
      .then(({ data }) => setIsAdmin(!!data));
  }, [userId]);

  useEffect(() => {
    setLoading(true);
    supabase
      .from("bitesize_videos")
      .select("*")
      .eq("is_published", true)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setVideos((data as BitesizeVideo[] | null) ?? []);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    supabase
      .from("bitesize_videos")
      .select("*")
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setVideos((data as BitesizeVideo[] | null) ?? []);
      });
  }, [isAdmin]);

  const filtered =
    activeCategory === "All"
      ? videos
      : videos.filter((v) => v.category === activeCategory);

  async function handleUpload() {
    if (!videoFile || !uploadTitle.trim()) return;
    setUploading(true);
    try {
      setUploadProgress("Uploading video...");
      const videoUrl = await uploadVideo(videoFile, "learn-videos", 500);

      let thumbnailUrl: string | null = null;
      if (thumbFile) {
        setUploadProgress("Uploading thumbnail...");
        thumbnailUrl = await uploadImage(thumbFile, "learn-videos");
      }

      setUploadProgress("Saving...");
      const { data, error } = await supabase
        .from("bitesize_videos")
        .insert({
          title: uploadTitle.trim(),
          description: uploadDescription.trim() || null,
          video_url: videoUrl,
          thumbnail_url: thumbnailUrl,
          category: uploadCategory,
          duration_mins: uploadDuration ? parseInt(uploadDuration) : null,
          is_published: uploadPublished,
          instructor_id: userId,
        })
        .select()
        .single();

      if (error) throw error;
      if (data) setVideos((prev) => [data as BitesizeVideo, ...prev]);

      setUploadOpen(false);
      setUploadTitle("");
      setUploadDescription("");
      setUploadDuration("");
      setUploadPublished(false);
      setVideoFile(null);
      setThumbFile(null);
      setThumbPreview(null);
      setUploadProgress("");
      toast.success("Video uploaded!");
    } catch (err: any) {
      toast.error(err?.message ?? "Upload failed");
    } finally {
      setUploading(false);
      setUploadProgress("");
    }
  }

  async function playVideo(video: BitesizeVideo) {
    setPlayingVideo(video);
    await supabase
      .from("bitesize_videos")
      .update({ views: (video.views ?? 0) + 1 })
      .eq("id", video.id);
    setVideos((prev) =>
      prev.map((v) =>
        v.id === video.id ? { ...v, views: (v.views ?? 0) + 1 } : v,
      ),
    );
  }

  async function togglePublish(video: BitesizeVideo) {
    await supabase
      .from("bitesize_videos")
      .update({ is_published: !video.is_published })
      .eq("id", video.id);
    setVideos((prev) =>
      prev.map((v) =>
        v.id === video.id ? { ...v, is_published: !v.is_published } : v,
      ),
    );
  }

  async function deleteVideo(video: BitesizeVideo) {
    if (!confirm(`Delete "${video.title}"? Cannot be undone.`)) return;
    await supabase
      .from("bitesize_videos")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", video.id);
    setVideos((prev) => prev.filter((v) => v.id !== video.id));
    toast.success("Video deleted");
  }

  function openEdit(video: BitesizeVideo) {
    setEditTitle(video.title ?? "");
    setEditDescription(video.description ?? "");
    setEditCategory(video.category ?? "Teaching techniques");
    setEditDuration(video.duration_mins?.toString() ?? "");
    setEditPublished(video.is_published ?? false);
    setEditVideo(video);
  }

  async function saveEdit() {
    if (!editVideo || !editTitle.trim()) return;
    setSaving(true);
    try {
      await supabase
        .from("bitesize_videos")
        .update({
          title: editTitle.trim(),
          description: editDescription.trim() || null,
          category: editCategory || null,
          duration_mins: editDuration ? parseInt(editDuration) : null,
          is_published: editPublished,
        })
        .eq("id", editVideo.id);
      setVideos((prev) =>
        prev.map((v) =>
          v.id === editVideo.id
            ? {
                ...v,
                title: editTitle.trim(),
                description: editDescription.trim() || null,
                category: editCategory || null,
                duration_mins: editDuration ? parseInt(editDuration) : null,
                is_published: editPublished,
              }
            : v,
        ),
      );
      setEditVideo(null);
      toast.success("Video updated");
    } catch (err: any) {
      toast.error(err.message ?? "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "#DCE4F0", ...POPPINS }}>
      {/* HEADER */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "12px 16px",
          paddingTop: "calc(12px + env(safe-area-inset-top, 0px))",
          background: "#0B1F3A",
        }}
      >
        <button
          type="button"
          aria-label="Back"
          onClick={() => navigate({ to: "/home" as never })}
          style={{
            background: "none",
            border: "none",
            padding: 0,
            display: "flex",
            color: "#fff",
            cursor: "pointer",
          }}
        >
          <IconChevronLeft size={22} />
        </button>
        <h1
          style={{
            flex: 1,
            fontSize: 18,
            fontWeight: 700,
            color: "#fff",
            margin: 0,
            ...POPPINS,
          }}
        >
          DSM Bitesize
        </h1>
        {isAdmin && (
          <button
            type="button"
            aria-label="Upload video"
            onClick={() => setUploadOpen(true)}
            style={{
              width: 36,
              height: 36,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.15)",
              border: "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              cursor: "pointer",
            }}
          >
            <IconPlus size={20} />
          </button>
        )}
      </div>

      {/* CATEGORY CHIPS */}
      <div
        style={{
          background: "#fff",
          padding: "10px 16px",
          borderBottom: "0.5px solid #E4E8EF",
          display: "flex",
          gap: 8,
          overflowX: "auto",
        }}
      >
        {CATEGORIES.map((cat) => {
          const active = cat === activeCategory;
          return (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveCategory(cat)}
              style={{
                flexShrink: 0,
                border: "none",
                cursor: "pointer",
                borderRadius: 20,
                padding: "6px 14px",
                fontSize: 12,
                fontWeight: 600,
                background: active ? "#1877D6" : "#F1F5F9",
                color: active ? "#fff" : "#6B7686",
                ...POPPINS,
              }}
            >
              {cat}
            </button>
          );
        })}
      </div>

      {/* ADMIN STATS ROW */}
      {isAdmin && (
        <div
          style={{
            background: "#fff",
            padding: "10px 16px",
            borderBottom: "0.5px solid #E4E8EF",
            display: "flex",
            gap: 20,
            overflowX: "auto",
          }}
        >
          {[
            { label: "Total videos", value: videos.length },
            {
              label: "Published",
              value: videos.filter((v) => v.is_published).length,
            },
            {
              label: "Drafts",
              value: videos.filter((v) => !v.is_published).length,
            },
            {
              label: "Total views",
              value: videos.reduce((a, v) => a + (v.views ?? 0), 0),
            },
          ].map((s) => (
            <div key={s.label} style={{ flexShrink: 0 }}>
              <div
                style={{
                  fontSize: 9,
                  fontWeight: 600,
                  color: "#9CA3AF",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  ...POPPINS,
                }}
              >
                {s.label}
              </div>
              <div
                style={{
                  fontSize: 16,
                  fontWeight: 700,
                  color: "#0B1F3A",
                  ...POPPINS,
                }}
              >
                {s.value}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CONTENT */}
      {loading ? (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            padding: "60px 0",
          }}
        >
          <div
            style={{
              width: 28,
              height: 28,
              border: "3px solid #E4E8EF",
              borderTopColor: "#7C3AED",
              borderRadius: "50%",
              animation: "spin 0.8s linear infinite",
            }}
          />
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ padding: "60px 32px", textAlign: "center" }}>
          <IconBook size={48} color="#7C3AED" />
          <div
            style={{
              fontSize: 16,
              fontWeight: 600,
              color: "#0B1F3A",
              marginTop: 12,
              ...POPPINS,
            }}
          >
            No videos yet
          </div>
          <div
            style={{
              fontSize: 13,
              color: "#6B7686",
              marginTop: 6,
              ...POPPINS,
            }}
          >
            {isAdmin ? "Tap + to upload the first video" : "Check back soon"}
          </div>
        </div>
      ) : (
        <div
          style={{
            padding: 16,
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 12,
          }}
        >
          {filtered.map((video) => (
            <div
              key={video.id}
              onClick={() => playVideo(video)}
              style={{
                background: "#fff",
                border: "0.5px solid #E4E8EF",
                borderRadius: 12,
                overflow: "hidden",
                cursor: "pointer",
                position: "relative",
              }}
            >
              {/* THUMBNAIL */}
              <div style={{ height: 100, position: "relative" }}>
                {video.thumbnail_url ? (
                  <img
                    src={video.thumbnail_url}
                    alt={video.title}
                    loading="lazy"
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      display: "block",
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: "100%",
                      height: "100%",
                      background:
                        "linear-gradient(135deg, #7C3AED, #4C1D95)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <IconBook size={32} color="#fff" />
                  </div>
                )}
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    background: "rgba(0,0,0,0.2)",
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    top: "50%",
                    left: "50%",
                    transform: "translate(-50%, -50%)",
                    width: 32,
                    height: 32,
                    borderRadius: "50%",
                    background: "#fff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <IconPlayerPlay size={14} color="#0B1F3A" />
                </div>
                {video.duration_mins != null && (
                  <div
                    style={{
                      position: "absolute",
                      right: 6,
                      bottom: 6,
                      background: "rgba(0,0,0,0.7)",
                      color: "#fff",
                      fontSize: 9,
                      fontWeight: 600,
                      borderRadius: 20,
                      padding: "2px 6px",
                      ...POPPINS,
                    }}
                  >
                    {video.duration_mins} min
                  </div>
                )}
                {isAdmin && !video.is_published && (
                  <div
                    style={{
                      position: "absolute",
                      left: 6,
                      top: 6,
                      background: "#FEF3C7",
                      color: "#92400E",
                      fontSize: 8,
                      fontWeight: 700,
                      borderRadius: 20,
                      padding: "2px 6px",
                      ...POPPINS,
                    }}
                  >
                    Draft
                  </div>
                )}
              </div>

              {/* BODY */}
              <div style={{ padding: "8px 10px 10px" }}>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: "#0B1F3A",
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                    ...POPPINS,
                  }}
                >
                  {video.title}
                </div>
                {video.category && (
                  <span
                    style={{
                      display: "inline-block",
                      marginTop: 5,
                      fontSize: 9,
                      fontWeight: 600,
                      color: "#7C3AED",
                      background: "#EFE7FB",
                      borderRadius: 20,
                      padding: "2px 6px",
                      ...POPPINS,
                    }}
                  >
                    {video.category}
                  </span>
                )}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    marginTop: 4,
                    fontSize: 10,
                    color: "#9CA3AF",
                    ...POPPINS,
                  }}
                >
                  <IconEye size={10} color="#9CA3AF" />
                  {video.views ?? 0} views
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* VIDEO PLAYER */}
      {playingVideo && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 200,
            background: "#000",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              zIndex: 2,
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: 12,
              padding: "8px 12px",
              paddingTop: "calc(8px + env(safe-area-inset-top, 0px))",
              background:
                "linear-gradient(rgba(0,0,0,0.6), transparent)",
            }}
          >
            <div
              style={{
                flex: 1,
                fontSize: 14,
                fontWeight: 600,
                color: "#fff",
                ...POPPINS,
              }}
            >
              {playingVideo.title}
            </div>
            <button
              type="button"
              aria-label="Close"
              onClick={() => setPlayingVideo(null)}
              style={{
                background: "none",
                border: "none",
                padding: 0,
                display: "flex",
                color: "#fff",
                cursor: "pointer",
              }}
            >
              <IconX size={20} />
            </button>
          </div>

          <video
            controls
            autoPlay
            playsInline
            src={playingVideo.video_url}
            style={{ width: "100%", height: "100%", objectFit: "contain" }}
          />

          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              padding: 16,
              background:
                "linear-gradient(transparent, rgba(0,0,0,0.8))",
              pointerEvents: "none",
            }}
          >
            <div
              style={{
                fontSize: 16,
                fontWeight: 700,
                color: "#fff",
                ...POPPINS,
              }}
            >
              {playingVideo.title}
            </div>
            {playingVideo.description && (
              <div
                style={{
                  fontSize: 13,
                  color: "rgba(255,255,255,0.7)",
                  marginTop: 4,
                  ...POPPINS,
                }}
              >
                {playingVideo.description}
              </div>
            )}
          </div>
        </div>
      )}

      {/* UPLOAD SHEET */}
      {uploadOpen && isAdmin && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 300,
            background: "#fff",
            overflowY: "auto",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "14px 16px",
              paddingTop: "calc(14px + env(safe-area-inset-top, 0px))",
              borderBottom: "0.5px solid #E4E8EF",
            }}
          >
            <div
              style={{
                fontSize: 16,
                fontWeight: 700,
                color: "#0B1F3A",
                ...POPPINS,
              }}
            >
              Upload video
            </div>
            <button
              type="button"
              aria-label="Close"
              onClick={() => setUploadOpen(false)}
              style={{
                background: "none",
                border: "none",
                padding: 0,
                display: "flex",
                color: "#6B7686",
                cursor: "pointer",
              }}
            >
              <IconX size={20} />
            </button>
          </div>

          <div
            style={{
              padding: 16,
              display: "flex",
              flexDirection: "column",
              gap: 16,
            }}
          >
            <div>
              <label style={labelStyle} htmlFor="bs-title">
                Title
              </label>
              <input
                id="bs-title"
                value={uploadTitle}
                onChange={(e) => setUploadTitle(e.target.value)}
                placeholder="Video title"
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle} htmlFor="bs-desc">
                Description
              </label>
              <textarea
                id="bs-desc"
                rows={3}
                value={uploadDescription}
                onChange={(e) => setUploadDescription(e.target.value)}
                placeholder="What's this video about?"
                style={{ ...inputStyle, resize: "vertical" }}
              />
            </div>

            <div>
              <label style={labelStyle} htmlFor="bs-cat">
                Category
              </label>
              <select
                id="bs-cat"
                value={uploadCategory}
                onChange={(e) => setUploadCategory(e.target.value)}
                style={inputStyle}
              >
                {CATEGORIES.filter((c) => c !== "All").map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={labelStyle} htmlFor="bs-dur">
                Duration (minutes)
              </label>
              <input
                id="bs-dur"
                type="number"
                value={uploadDuration}
                onChange={(e) => setUploadDuration(e.target.value)}
                placeholder="e.g. 5"
                style={inputStyle}
              />
            </div>

            <div>
              <span style={labelStyle}>Video file</span>
              <label
                htmlFor="bs-video"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  border: "2px dashed #DDD6FE",
                  borderRadius: 12,
                  padding: "24px 16px",
                  cursor: "pointer",
                  background: "#FAF8FF",
                }}
              >
                <IconUpload size={48} color="#7C3AED" />
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: "#0B1F3A",
                    ...POPPINS,
                  }}
                >
                  Tap to select video
                </div>
                <div style={{ fontSize: 12, color: "#6B7686", ...POPPINS }}>
                  MP4 or MOV · max 500MB
                </div>
                {videoFile && (
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: "#16A34A",
                      marginTop: 4,
                      wordBreak: "break-all",
                      textAlign: "center",
                      ...POPPINS,
                    }}
                  >
                    {videoFile.name}
                  </div>
                )}
              </label>
              <input
                id="bs-video"
                type="file"
                accept="video/*"
                style={{ display: "none" }}
                onChange={(e) => setVideoFile(e.target.files?.[0] ?? null)}
              />
            </div>

            <div>
              <span style={labelStyle}>Thumbnail (optional)</span>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <label
                  htmlFor="bs-thumb"
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: 10,
                    border: thumbPreview
                      ? "1px solid #E4E8EF"
                      : "2px dashed #E4E8EF",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    overflow: "hidden",
                    background: "#F8FAFC",
                    flexShrink: 0,
                  }}
                >
                  {thumbPreview ? (
                    <img
                      src={thumbPreview}
                      alt="Thumbnail preview"
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                      }}
                    />
                  ) : (
                    <IconUpload size={20} color="#9CA3AF" />
                  )}
                </label>
                {thumbPreview && (
                  <label
                    htmlFor="bs-thumb"
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: "#1877D6",
                      cursor: "pointer",
                      ...POPPINS,
                    }}
                  >
                    Change
                  </label>
                )}
              </div>
              <input
                id="bs-thumb"
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={(e) => {
                  const f = e.target.files?.[0] ?? null;
                  setThumbFile(f);
                  setThumbPreview(f ? URL.createObjectURL(f) : null);
                }}
              />
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: "#0B1F3A",
                    ...POPPINS,
                  }}
                >
                  Publish immediately
                </div>
                {!uploadPublished && (
                  <div
                    style={{ fontSize: 12, color: "#6B7686", ...POPPINS }}
                  >
                    Save as draft
                  </div>
                )}
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={uploadPublished}
                aria-label="Publish immediately"
                onClick={() => setUploadPublished((v) => !v)}
                style={{
                  width: 48,
                  height: 28,
                  borderRadius: 20,
                  border: "none",
                  cursor: "pointer",
                  background: uploadPublished ? "#7C3AED" : "#E4E8EF",
                  position: "relative",
                  transition: "background 0.15s ease",
                  flexShrink: 0,
                }}
              >
                <span
                  style={{
                    position: "absolute",
                    top: 3,
                    left: uploadPublished ? 23 : 3,
                    width: 22,
                    height: 22,
                    borderRadius: "50%",
                    background: "#fff",
                    transition: "left 0.15s ease",
                  }}
                />
              </button>
            </div>

            <button
              type="button"
              onClick={handleUpload}
              disabled={!videoFile || !uploadTitle.trim() || uploading}
              style={{
                width: "100%",
                background: "#7C3AED",
                color: "#fff",
                border: "none",
                borderRadius: 12,
                padding: "14px 16px",
                fontSize: 15,
                fontWeight: 700,
                cursor:
                  !videoFile || !uploadTitle.trim() || uploading
                    ? "not-allowed"
                    : "pointer",
                opacity:
                  !videoFile || !uploadTitle.trim() || uploading ? 0.5 : 1,
                ...POPPINS,
              }}
            >
              {uploading ? uploadProgress || "Uploading..." : "Upload video"}
            </button>
          </div>
        </div>
      )}

      {/* EDIT SHEET */}
      {editVideo && isAdmin && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 300,
            background: "#fff",
            overflowY: "auto",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "14px 16px",
              paddingTop: "calc(14px + env(safe-area-inset-top, 0px))",
              borderBottom: "0.5px solid #E4E8EF",
            }}
          >
            <div
              style={{
                fontSize: 16,
                fontWeight: 700,
                color: "#0B1F3A",
                ...POPPINS,
              }}
            >
              Edit video
            </div>
            <button
              type="button"
              aria-label="Close"
              onClick={() => setEditVideo(null)}
              style={{
                background: "none",
                border: "none",
                padding: 0,
                display: "flex",
                color: "#6B7686",
                cursor: "pointer",
              }}
            >
              <IconX size={20} />
            </button>
          </div>

          <div
            style={{
              padding: 16,
              display: "flex",
              flexDirection: "column",
              gap: 16,
            }}
          >
            <div>
              <label style={labelStyle} htmlFor="bs-edit-title">
                Title
              </label>
              <input
                id="bs-edit-title"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle} htmlFor="bs-edit-desc">
                Description
              </label>
              <textarea
                id="bs-edit-desc"
                rows={3}
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                style={{ ...inputStyle, resize: "vertical" }}
              />
            </div>

            <div>
              <label style={labelStyle} htmlFor="bs-edit-cat">
                Category
              </label>
              <select
                id="bs-edit-cat"
                value={editCategory}
                onChange={(e) => setEditCategory(e.target.value)}
                style={inputStyle}
              >
                <option value="">No category</option>
                {CATEGORIES.filter((c) => c !== "All").map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={labelStyle} htmlFor="bs-edit-dur">
                Duration (minutes)
              </label>
              <input
                id="bs-edit-dur"
                type="number"
                value={editDuration}
                onChange={(e) => setEditDuration(e.target.value)}
                style={inputStyle}
              />
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
              }}
            >
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: "#0B1F3A",
                  ...POPPINS,
                }}
              >
                Published
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={editPublished}
                aria-label="Published"
                onClick={() => setEditPublished((v) => !v)}
                style={{
                  width: 48,
                  height: 28,
                  borderRadius: 20,
                  border: "none",
                  cursor: "pointer",
                  background: editPublished ? "#7C3AED" : "#E4E8EF",
                  position: "relative",
                  transition: "background 0.15s ease",
                  flexShrink: 0,
                }}
              >
                <span
                  style={{
                    position: "absolute",
                    top: 3,
                    left: editPublished ? 23 : 3,
                    width: 22,
                    height: 22,
                    borderRadius: "50%",
                    background: "#fff",
                    transition: "left 0.15s ease",
                  }}
                />
              </button>
            </div>

            <button
              type="button"
              onClick={saveEdit}
              disabled={!editTitle.trim() || saving}
              style={{
                width: "100%",
                background: "#1877D6",
                color: "#fff",
                border: "none",
                borderRadius: 12,
                padding: "14px 16px",
                fontSize: 15,
                fontWeight: 700,
                cursor: !editTitle.trim() || saving ? "not-allowed" : "pointer",
                opacity: !editTitle.trim() || saving ? 0.5 : 1,
                ...POPPINS,
              }}
            >
              {saving ? "Saving..." : "Save changes"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}


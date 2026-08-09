import { DSMToggle } from "@/components/dsm/DSMToggle";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/dsm/PageHeader";
import { supabase } from "@/lib/supabaseClient";
import { uploadVideo, uploadImage } from "@/lib/uploadFile";
import { useConfirmSheet } from "@/components/dsm/ConfirmSheet";
import {
  IconChevronLeft,
  IconPlus,
  IconPencil,
  IconTrash,
  IconEye,
  IconEyeOff,
  IconBook,
  IconUpload,
  IconX,
} from "@tabler/icons-react";

export const Route = createFileRoute("/admin/bitesize")({
  head: () => ({
    meta: [
      { title: "Manage Bitesize videos — DSM Admin" },
      {
        name: "description",
        content:
          "Admin tools to upload, edit, publish and delete DSM Bitesize CPD videos.",
      },
      { property: "og:title", content: "Manage Bitesize videos — DSM Admin" },
      {
        property: "og:description",
        content: "Upload, edit and publish DSM Bitesize CPD videos.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminBitesizePage,
});

const CATEGORIES = [
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

function AdminBitesizePage() {
  const navigate = useNavigate();
  const [videos, setVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [editVideo, setEditVideo] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
  const { confirm: askConfirm, confirmSheet } = useConfirmSheet();

  // Upload/edit form fields
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Teaching techniques");
  const [duration, setDuration] = useState("");
  const [published, setPublished] = useState(false);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [thumbFile, setThumbFile] = useState<File | null>(null);
  const [thumbPreview, setThumbPreview] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    supabase
      .from("bitesize_videos")
      .select("*")
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setVideos(data ?? []);
        setLoading(false);
      });
  }, []);

  function resetForm() {
    setTitle("");
    setDescription("");
    setCategory("Teaching techniques");
    setDuration("");
    setPublished(false);
    setVideoFile(null);
    setThumbFile(null);
    setThumbPreview(null);
  }

  function openEdit(video: any) {
    setTitle(video.title ?? "");
    setDescription(video.description ?? "");
    setCategory(video.category ?? "Teaching techniques");
    setDuration(video.duration_mins?.toString() ?? "");
    setPublished(video.is_published ?? false);
    setThumbPreview(video.thumbnail_url ?? null);
    setEditVideo(video);
  }

  async function handleUpload() {
    if (!videoFile || !title.trim()) return;
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
          title: title.trim(),
          description: description.trim() || null,
          video_url: videoUrl,
          thumbnail_url: thumbnailUrl,
          category: category || null,
          duration_mins: duration ? parseInt(duration) : null,
          is_published: published,
        })
        .select()
        .single();

      if (error) throw error;
      if (data) setVideos((prev) => [data, ...prev]);
      resetForm();
      setUploadOpen(false);
      toast.success("Video uploaded!");
    } catch (err: any) {
      toast.error(err?.message ?? "Upload failed");
    } finally {
      setUploading(false);
      setUploadProgress("");
    }
  }

  async function handleEdit() {
    if (!editVideo || !title.trim()) return;
    setSaving(true);
    try {
      await supabase
        .from("bitesize_videos")
        .update({
          title: title.trim(),
          description: description.trim() || null,
          category: category || null,
          duration_mins: duration ? parseInt(duration) : null,
          is_published: published,
        })
        .eq("id", editVideo.id);

      setVideos((prev) =>
        prev.map((v) =>
          v.id === editVideo.id
            ? {
                ...v,
                title: title.trim(),
                description: description.trim() || null,
                category: category || null,
                duration_mins: duration ? parseInt(duration) : null,
                is_published: published,
              }
            : v,
        ),
      );
      setEditVideo(null);
      resetForm();
      toast.success("Video updated");
    } catch (err: any) {
      toast.error(err?.message ?? "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function togglePublish(video: any) {
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

  async function deleteVideo(video: any) {
    if (!(await askConfirm({ title: "Delete video", message: "Cannot be undone.", confirmLabel: "Delete" }))) return;
    await supabase
      .from("bitesize_videos")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", video.id);
    setVideos((prev) => prev.filter((v) => v.id !== video.id));
    toast.success("Video deleted");
  }

  const stats = [
    { label: "Total", value: videos.length },
    { label: "Published", value: videos.filter((v) => v.is_published).length },
    { label: "Drafts", value: videos.filter((v) => !v.is_published).length },
    { label: "Views", value: videos.reduce((a, v) => a + (v.views ?? 0), 0) },
  ];

  const formFields = (
    <>
      <div>
        <label style={labelStyle} htmlFor="ab-title">
          Title
        </label>
        <input
          id="ab-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Video title"
          style={inputStyle}
        />
      </div>

      <div>
        <label style={labelStyle} htmlFor="ab-desc">
          Description
        </label>
        <textarea
          id="ab-desc"
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What's this video about?"
          style={{ ...inputStyle, resize: "vertical" }}
        />
      </div>

      <div>
        <label style={labelStyle} htmlFor="ab-cat">
          Category
        </label>
        <select
          id="ab-cat"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          style={inputStyle}
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label style={labelStyle} htmlFor="ab-dur">
          Duration (minutes)
        </label>
        <input
          id="ab-dur"
          type="number"
          value={duration}
          onChange={(e) => setDuration(e.target.value)}
          placeholder="e.g. 5"
          style={inputStyle}
        />
      </div>
    </>
  );

  const publishToggle = (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
      }}
    >
      <div
        style={{ fontSize: 14, fontWeight: 600, color: "#0B1F3A", ...POPPINS }}
      >
        {editVideo ? "Published" : "Publish immediately"}
      </div>
      <DSMToggle checked={published} onChange={(v) => setPublished(v)} />
    </div>
  );

  function sheetHeader(heading: string, onClose: () => void) {
    return (
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
          {heading}
        </div>
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
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
    );
  }

  return (
    <>
    <div style={{ minHeight: "100vh", background: "#DCE4F0", ...POPPINS }}>
      <PageHeader
        title="Bitesize Videos"
        backTo="/admin"
        right={
          <button
            type="button"
            aria-label="Upload video"
            onClick={() => {
              resetForm();
              setUploadOpen(true);
            }}
            style={{
              width: 36,
              height: 36,
              borderRadius: "50%",
              background: "#1877D6",
              boxShadow: "0 3px 0 #0F52A8",
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
        }
      />

      {/* STATS ROW */}
      <div style={{ padding: "16px 16px 0" }}>
        <div
          style={{
            background: "#fff",
            borderRadius: 20,
            boxShadow: "0 4px 0 #D9D2C2, 0 12px 28px rgba(0,0,0,0.08)",
            display: "flex",
            overflow: "hidden",
          }}
        >
          {stats.map((s, i) => (
            <div
              key={s.label}
              style={{
                flex: 1,
                padding: "16px 10px",
                textAlign: "left",
                borderLeft: i > 0 ? "1.5px dashed #E4E4E8" : undefined,
              }}
            >
              <div
                style={{
                  fontSize: 26,
                  fontWeight: 900,
                  letterSpacing: "-0.8px",
                  color: "#000",
                  ...POPPINS,
                }}
              >
                {s.value}
              </div>
              <div
                style={{
                  fontSize: 9.5,
                  fontWeight: 700,
                  color: "#8A8A8E",
                  textTransform: "uppercase",
                  marginTop: 5,
                  ...POPPINS,
                }}
              >
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </div>


      {/* LIST */}
      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: 60 }}>
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
      ) : videos.length === 0 ? (
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
            style={{ fontSize: 13, color: "#6B7686", marginTop: 6, ...POPPINS }}
          >
            Tap + to upload the first video
          </div>
        </div>
      ) : (
        <div
          style={{
            padding: 16,
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          {videos.map((video) => (
            <div
              key={video.id}
              style={{
                background: "#fff",
                border: "0.5px solid #E4E8EF",
                borderRadius: 12,
                padding: 12,
                display: "flex",
                gap: 12,
                alignItems: "center",
              }}
            >
              {/* THUMB */}
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 8,
                  overflow: "hidden",
                  flexShrink: 0,
                  background: "#EFE7FB",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
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
                  <IconBook size={24} color="#7C3AED" />
                )}
              </div>

              {/* CONTENT */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    minWidth: 0,
                  }}
                >
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: "#0B1F3A",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      ...POPPINS,
                    }}
                  >
                    {video.title}
                  </div>
                  <span
                    style={{
                      flexShrink: 0,
                      fontSize: 8,
                      fontWeight: 700,
                      borderRadius: 20,
                      padding: "2px 6px",
                      background: video.is_published ? "#DCFCE7" : "#FEF3C7",
                      color: video.is_published ? "#15803D" : "#92400E",
                      ...POPPINS,
                    }}
                  >
                    {video.is_published ? "Published" : "Draft"}
                  </span>
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: "#6B7686",
                    marginTop: 2,
                    ...POPPINS,
                  }}
                >
                  {video.category ?? "Uncategorised"}
                  {video.duration_mins != null
                    ? ` · ${video.duration_mins} min`
                    : ""}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: "#9CA3AF",
                    marginTop: 2,
                    ...POPPINS,
                  }}
                >
                  {video.views ?? 0} views
                  {video.created_at
                    ? ` · ${new Date(video.created_at).toLocaleDateString("en-GB")}`
                    : ""}
                </div>
              </div>

              {/* ACTIONS */}
              <div style={{ flexShrink: 0, display: "flex", gap: 8 }}>
                <button
                  type="button"
                  aria-label={video.is_published ? "Unpublish" : "Publish"}
                  onClick={() => void togglePublish(video)}
                  style={{
                    background: "none",
                    border: "none",
                    padding: 0,
                    display: "flex",
                    cursor: "pointer",
                  }}
                >
                  {video.is_published ? (
                    <IconEye size={18} color="#15803D" />
                  ) : (
                    <IconEyeOff size={18} color="#9CA3AF" />
                  )}
                </button>
                <button
                  type="button"
                  aria-label="Edit"
                  onClick={() => openEdit(video)}
                  style={{
                    background: "none",
                    border: "none",
                    padding: 0,
                    display: "flex",
                    cursor: "pointer",
                  }}
                >
                  <IconPencil size={18} color="#1877D6" />
                </button>
                <button
                  type="button"
                  aria-label="Delete"
                  onClick={() => void deleteVideo(video)}
                  style={{
                    background: "none",
                    border: "none",
                    padding: 0,
                    display: "flex",
                    cursor: "pointer",
                  }}
                >
                  <IconTrash size={18} color="#CC2229" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* UPLOAD SHEET */}
      {uploadOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 200,
            background: "#fff",
            overflowY: "auto",
          }}
        >
          {sheetHeader("Upload video", () => setUploadOpen(false))}
          <div
            style={{
              padding: 16,
              display: "flex",
              flexDirection: "column",
              gap: 16,
            }}
          >
            {formFields}

            <div>
              <span style={labelStyle}>Video file</span>
              <label
                htmlFor="ab-video"
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
                    ✓ {videoFile.name}
                  </div>
                )}
              </label>
              <input
                id="ab-video"
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
                  htmlFor="ab-thumb"
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
                    htmlFor="ab-thumb"
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
                id="ab-thumb"
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

            {publishToggle}

            <button
              type="button"
              onClick={handleUpload}
              disabled={!videoFile || !title.trim() || uploading}
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
                  !videoFile || !title.trim() || uploading
                    ? "not-allowed"
                    : "pointer",
                opacity: !videoFile || !title.trim() || uploading ? 0.5 : 1,
                ...POPPINS,
              }}
            >
              {uploading ? uploadProgress || "Uploading..." : "Upload video"}
            </button>
          </div>
        </div>
      )}

      {/* EDIT SHEET */}
      {editVideo && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 200,
            background: "#fff",
            overflowY: "auto",
          }}
        >
          {sheetHeader("Edit video", () => {
            setEditVideo(null);
            resetForm();
          })}
          <div
            style={{
              padding: 16,
              display: "flex",
              flexDirection: "column",
              gap: 16,
            }}
          >
            {formFields}
            {publishToggle}

            <button
              type="button"
              onClick={handleEdit}
              disabled={!title.trim() || saving}
              style={{
                width: "100%",
                background: "#1877D6",
                color: "#fff",
                border: "none",
                borderRadius: 12,
                padding: "14px 16px",
                fontSize: 15,
                fontWeight: 700,
                cursor: !title.trim() || saving ? "not-allowed" : "pointer",
                opacity: !title.trim() || saving ? 0.5 : 1,
                ...POPPINS,
              }}
            >
              {saving ? "Saving..." : "Save changes"}
            </button>
          </div>
        </div>
      )}
    </div>
    {confirmSheet}
    </>
  );
}

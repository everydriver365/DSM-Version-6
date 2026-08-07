import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabaseClient";
import { uploadVideo, uploadImage } from "@/lib/uploadFile";
import {
  IconChevronLeft,
  IconPlayerPlay,
  IconPlus,
  IconEye,
  IconHeart,
  IconHeartFilled,
  IconMessageCircle,
  IconUpload,
  IconX,
  IconSend,
} from "@tabler/icons-react";

/* eslint-disable @typescript-eslint/no-explicit-any */
const db = supabase as any;

export const Route = createFileRoute("/showcase")({
  head: () => ({
    meta: [
      { title: "DSM Showcase — Community clips from driving instructors" },
      {
        name: "description",
        content:
          "Watch and share short community clips from driving instructors: lesson moments, test passes, tips and behind-the-scenes.",
      },
      { property: "og:title", content: "DSM Showcase — Community clips" },
      {
        property: "og:description",
        content:
          "Watch and share short community clips from driving instructors across the UK.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ShowcasePage,
});

interface ShowcaseVideo {
  id: string;
  title: string;
  description: string | null;
  video_url: string;
  thumbnail_url: string | null;
  category: string | null;
  duration_secs: number | null;
  is_published: boolean;
  views: number;
  likes_count?: number | null;
  created_by: string | null;
  created_at: string;
}

interface ShowcaseComment {
  id: string;
  video_id: string;
  user_id: string | null;
  author_name: string | null;
  body: string;
  created_at: string;
}

const CATEGORIES = [
  "All",
  "Test passes",
  "Lesson moments",
  "Tips & tricks",
  "Behind the scenes",
  "Funny",
];

const POPPINS = { fontFamily: "Poppins, sans-serif" } as const;
const NAVY = "#0B1F3A";
const RED = "#CC2229";
const BLUE = "#1877D6";

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
  color: NAVY,
  background: "#fff",
  outline: "none",
  ...POPPINS,
};

function ShowcasePage() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [videos, setVideos] = useState<ShowcaseVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("All");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [playing, setPlaying] = useState<ShowcaseVideo | null>(null);

  // Likes
  const [likedIds, setLikedIds] = useState<string[]>([]);
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>({});

  // Comments
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [comments, setComments] = useState<ShowcaseComment[]>([]);
  const [commentBody, setCommentBody] = useState("");
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({});

  // Upload form state
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadDescription, setUploadDescription] = useState("");
  const [uploadTags, setUploadTags] = useState("");
  const [uploadCategory, setUploadCategory] = useState("Test passes");
  const [uploadPublished, setUploadPublished] = useState(true);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [thumbFile, setThumbFile] = useState<File | null>(null);
  const [thumbPreview, setThumbPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");


  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  useEffect(() => {
    if (!userId) return;
    db.from("admin_users")
      .select("user_id")
      .eq("user_id", userId)
      .maybeSingle()
      .then(({ data }: any) => setIsAdmin(!!data));
  }, [userId]);

  const loadVideos = useCallback(async () => {
    setLoading(true);
    let query = db
      .from("showcase_videos")
      .select("*")
      .is("deleted_at", null)
      .order("created_at", { ascending: false });
    if (!isAdmin) query = query.eq("is_published", true);
    const { data } = await query;
    setVideos((data as ShowcaseVideo[] | null) ?? []);
    setLoading(false);
  }, [isAdmin]);

  useEffect(() => {
    loadVideos();
  }, [loadVideos]);

  // Load like state + counts
  useEffect(() => {
    if (videos.length === 0) return;
    const ids = videos.map((v) => v.id);
    (async () => {
      const { data } = await db
        .from("showcase_likes")
        .select("video_id, user_id")
        .in("video_id", ids);
      const rows = (data as { video_id: string; user_id: string }[] | null) ?? [];
      const counts: Record<string, number> = {};
      const mine: string[] = [];
      rows.forEach((r) => {
        counts[r.video_id] = (counts[r.video_id] ?? 0) + 1;
        if (userId && r.user_id === userId) mine.push(r.video_id);
      });
      setLikeCounts(counts);
      setLikedIds(mine);

      const { data: cData } = await db
        .from("showcase_comments")
        .select("video_id")
        .in("video_id", ids);
      const cCounts: Record<string, number> = {};
      ((cData as { video_id: string }[] | null) ?? []).forEach((r) => {
        cCounts[r.video_id] = (cCounts[r.video_id] ?? 0) + 1;
      });
      setCommentCounts(cCounts);
    })();
  }, [videos, userId]);

  const filtered =
    activeCategory === "All"
      ? videos
      : videos.filter((v) => v.category === activeCategory);

  async function toggleLike(video: ShowcaseVideo) {
    if (!userId) {
      toast.error("Sign in to like clips");
      return;
    }
    const liked = likedIds.includes(video.id);
    setLikedIds((prev) =>
      liked ? prev.filter((id) => id !== video.id) : [...prev, video.id],
    );
    setLikeCounts((prev) => ({
      ...prev,
      [video.id]: Math.max(0, (prev[video.id] ?? 0) + (liked ? -1 : 1)),
    }));
    try {
      if (liked) {
        await db
          .from("showcase_likes")
          .delete()
          .eq("video_id", video.id)
          .eq("user_id", userId);
      } else {
        await db
          .from("showcase_likes")
          .insert({ video_id: video.id, user_id: userId });
      }
    } catch (err: any) {
      toast.error(err?.message ?? "Could not update like");
    }
  }

  async function openComments(video: ShowcaseVideo) {
    setPlaying(video);
    setCommentsOpen(true);
    const { data } = await db
      .from("showcase_comments")
      .select("*")
      .eq("video_id", video.id)
      .order("created_at", { ascending: true });
    setComments((data as ShowcaseComment[] | null) ?? []);
  }

  async function postComment() {
    if (!playing || !commentBody.trim()) return;
    if (!userId) {
      toast.error("Sign in to comment");
      return;
    }
    const body = commentBody.trim();
    setCommentBody("");
    try {
      const { data, error } = await db
        .from("showcase_comments")
        .insert({ video_id: playing.id, user_id: userId, body })
        .select()
        .single();
      if (error) throw error;
      if (data) setComments((prev) => [...prev, data as ShowcaseComment]);
      setCommentCounts((prev) => ({
        ...prev,
        [playing.id]: (prev[playing.id] ?? 0) + 1,
      }));
    } catch (err: any) {
      toast.error(err?.message ?? "Could not post comment");
    }
  }

  async function handleUpload() {
    if (!videoFile || !uploadTitle.trim()) return;
    setUploading(true);
    try {
      setUploadProgress("Uploading video...");
      const videoUrl = await uploadVideo(videoFile, "showcase", 500);

      let thumbnailUrl: string | null = null;
      if (thumbFile) {
        setUploadProgress("Uploading thumbnail...");
        thumbnailUrl = await uploadImage(thumbFile, "showcase");
      }

      setUploadProgress("Saving...");
      const { data, error } = await db
        .from("showcase_videos")
        .insert({
          title: uploadTitle.trim(),
          description: uploadDescription.trim() || null,
          video_url: videoUrl,
          thumbnail_url: thumbnailUrl,
          category: uploadCategory,
          is_published: uploadPublished,
          created_by: userId,
        })
        .select()
        .single();

      if (error) throw error;
      if (data) setVideos((prev) => [data as ShowcaseVideo, ...prev]);

      setUploadOpen(false);
      setUploadTitle("");
      setUploadDescription("");
      setUploadPublished(true);
      setVideoFile(null);
      setThumbFile(null);
      setThumbPreview(null);
      toast.success("Clip uploaded!");
    } catch (err: any) {
      toast.error(err?.message ?? "Upload failed");
    } finally {
      setUploading(false);
      setUploadProgress("");
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
          background: NAVY,
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
          DSM Showcase
        </h1>
        <button
          type="button"
          aria-label="Upload clip"
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
      </div>

      {/* CATEGORY CHIPS */}
      <div
        style={{
          background: "#DCE4F0",
          padding: "10px 16px",
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
                background: active ? BLUE : "#fff",
                color: active ? "#fff" : "#5B6472",
                ...POPPINS,
              }}
            >
              {cat}
            </button>
          );
        })}
      </div>

      {/* CONTENT */}
      {loading ? (
        <div
          style={{ display: "flex", justifyContent: "center", padding: "60px 0" }}
        >
          <div
            style={{
              width: 28,
              height: 28,
              border: "3px solid #E4E8EF",
              borderTopColor: RED,
              borderRadius: "50%",
              animation: "spin 0.8s linear infinite",
            }}
          />
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ padding: "60px 32px", textAlign: "center" }}>
          <IconPlayerPlay size={48} color={RED} />
          <div
            style={{
              fontSize: 16,
              fontWeight: 600,
              color: NAVY,
              marginTop: 12,
              ...POPPINS,
            }}
          >
            No clips yet
          </div>
          <div style={{ fontSize: 13, color: "#6B7686", marginTop: 6, ...POPPINS }}>
            Tap + to share the first Showcase clip
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
          {filtered.map((video) => {
            const liked = likedIds.includes(video.id);
            return (
              <div
                key={video.id}
                style={{
                  background: "#fff",
                  border: "0.5px solid #E4E8EF",
                  borderRadius: 12,
                  overflow: "hidden",
                }}
              >
                {/* THUMBNAIL */}
                <div
                  onClick={() => setPlaying(video)}
                  style={{ height: 160, position: "relative", cursor: "pointer" }}
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
                    <div
                      style={{
                        width: "100%",
                        height: "100%",
                        background: `linear-gradient(135deg, ${RED}, ${NAVY})`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <IconPlayerPlay size={32} color="#fff" />
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
                      width: 34,
                      height: 34,
                      borderRadius: "50%",
                      background: "#fff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <IconPlayerPlay size={15} color={NAVY} />
                  </div>
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
                      color: NAVY,
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
                        color: RED,
                        background: "#FCE9E9",
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
                      gap: 10,
                      marginTop: 8,
                      fontSize: 10,
                      color: "#9CA3AF",
                      ...POPPINS,
                    }}
                  >
                    <button
                      type="button"
                      aria-label={liked ? "Unlike" : "Like"}
                      onClick={() => toggleLike(video)}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 3,
                        background: "none",
                        border: "none",
                        padding: 0,
                        cursor: "pointer",
                        color: liked ? RED : "#9CA3AF",
                        fontSize: 10,
                        ...POPPINS,
                      }}
                    >
                      {liked ? (
                        <IconHeartFilled size={13} color={RED} />
                      ) : (
                        <IconHeart size={13} color="#9CA3AF" />
                      )}
                      {likeCounts[video.id] ?? 0}
                    </button>
                    <button
                      type="button"
                      aria-label="Comments"
                      onClick={() => openComments(video)}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 3,
                        background: "none",
                        border: "none",
                        padding: 0,
                        cursor: "pointer",
                        color: "#9CA3AF",
                        fontSize: 10,
                        ...POPPINS,
                      }}
                    >
                      <IconMessageCircle size={13} color="#9CA3AF" />
                      {commentCounts[video.id] ?? 0}
                    </button>
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 3,
                      }}
                    >
                      <IconEye size={12} color="#9CA3AF" />
                      {video.views ?? 0}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* PLAYER */}
      {playing && !commentsOpen && (
        <div
          style={{ position: "fixed", inset: 0, zIndex: 200, background: "#000" }}
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
              background: "linear-gradient(rgba(0,0,0,0.6), transparent)",
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
              {playing.title}
            </div>
            <button
              type="button"
              aria-label="Close"
              onClick={() => setPlaying(null)}
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
            src={playing.video_url}
            style={{ width: "100%", height: "100%", objectFit: "contain" }}
          />

          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              padding: 16,
              background: "linear-gradient(transparent, rgba(0,0,0,0.8))",
            }}
          >
            <div
              style={{ fontSize: 16, fontWeight: 700, color: "#fff", ...POPPINS }}
            >
              {playing.title}
            </div>
            {playing.description && (
              <div
                style={{
                  fontSize: 13,
                  color: "rgba(255,255,255,0.7)",
                  marginTop: 4,
                  ...POPPINS,
                }}
              >
                {playing.description}
              </div>
            )}
            <div style={{ display: "flex", gap: 16, marginTop: 12 }}>
              <button
                type="button"
                aria-label="Like"
                onClick={() => toggleLike(playing)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  background: "rgba(255,255,255,0.15)",
                  border: "none",
                  borderRadius: 20,
                  padding: "8px 14px",
                  color: "#fff",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  ...POPPINS,
                }}
              >
                {likedIds.includes(playing.id) ? (
                  <IconHeartFilled size={16} color={RED} />
                ) : (
                  <IconHeart size={16} color="#fff" />
                )}
                {likeCounts[playing.id] ?? 0}
              </button>
              <button
                type="button"
                aria-label="Comments"
                onClick={() => openComments(playing)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  background: "rgba(255,255,255,0.15)",
                  border: "none",
                  borderRadius: 20,
                  padding: "8px 14px",
                  color: "#fff",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  ...POPPINS,
                }}
              >
                <IconMessageCircle size={16} color="#fff" />
                {commentCounts[playing.id] ?? 0}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* COMMENTS SHEET */}
      {commentsOpen && playing && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 250,
            background: "#fff",
            display: "flex",
            flexDirection: "column",
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
            <div style={{ fontSize: 16, fontWeight: 700, color: NAVY, ...POPPINS }}>
              Comments
            </div>
            <button
              type="button"
              aria-label="Close comments"
              onClick={() => setCommentsOpen(false)}
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

          <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
            {comments.length === 0 ? (
              <div
                style={{
                  textAlign: "center",
                  color: "#6B7686",
                  fontSize: 13,
                  padding: "40px 0",
                  ...POPPINS,
                }}
              >
                No comments yet — be the first
              </div>
            ) : (
              comments.map((c) => (
                <div key={c.id} style={{ marginBottom: 14 }}>
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: NAVY,
                      ...POPPINS,
                    }}
                  >
                    {c.author_name ?? "Instructor"}
                  </div>
                  <div
                    style={{
                      fontSize: 13,
                      color: "#374151",
                      marginTop: 2,
                      ...POPPINS,
                    }}
                  >
                    {c.body}
                  </div>
                </div>
              ))
            )}
          </div>

          <div
            style={{
              display: "flex",
              gap: 8,
              padding: 12,
              paddingBottom: "calc(12px + env(safe-area-inset-bottom, 0px))",
              borderTop: "0.5px solid #E4E8EF",
            }}
          >
            <input
              value={commentBody}
              onChange={(e) => setCommentBody(e.target.value)}
              placeholder="Add a comment..."
              aria-label="Add a comment"
              style={{ ...inputStyle, flex: 1 }}
            />
            <button
              type="button"
              aria-label="Send comment"
              onClick={postComment}
              disabled={!commentBody.trim()}
              style={{
                background: BLUE,
                border: "none",
                borderRadius: 10,
                width: 44,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
                cursor: commentBody.trim() ? "pointer" : "not-allowed",
                opacity: commentBody.trim() ? 1 : 0.5,
              }}
            >
              <IconSend size={18} />
            </button>
          </div>
        </div>
      )}

      {/* UPLOAD SHEET */}
      {uploadOpen && (
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
            <div style={{ fontSize: 16, fontWeight: 700, color: NAVY, ...POPPINS }}>
              Share a clip
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
            style={{ padding: 16, display: "flex", flexDirection: "column", gap: 16 }}
          >
            <div>
              <label style={labelStyle} htmlFor="sc-title">
                Title
              </label>
              <input
                id="sc-title"
                value={uploadTitle}
                onChange={(e) => setUploadTitle(e.target.value)}
                placeholder="Clip title"
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle} htmlFor="sc-desc">
                Description
              </label>
              <textarea
                id="sc-desc"
                rows={3}
                value={uploadDescription}
                onChange={(e) => setUploadDescription(e.target.value)}
                placeholder="What's happening in this clip?"
                style={{ ...inputStyle, resize: "vertical" }}
              />
            </div>

            <div>
              <label style={labelStyle} htmlFor="sc-cat">
                Category
              </label>
              <select
                id="sc-cat"
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
              <span style={labelStyle}>Video file</span>
              <label
                htmlFor="sc-video"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  border: "2px dashed #F5C9CB",
                  borderRadius: 12,
                  padding: "24px 16px",
                  cursor: "pointer",
                  background: "#FFF7F7",
                }}
              >
                <IconUpload size={48} color={RED} />
                <div
                  style={{ fontSize: 14, fontWeight: 600, color: NAVY, ...POPPINS }}
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
                id="sc-video"
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
                  htmlFor="sc-thumb"
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
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  ) : (
                    <IconUpload size={20} color="#9CA3AF" />
                  )}
                </label>
                {thumbPreview && (
                  <label
                    htmlFor="sc-thumb"
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: BLUE,
                      cursor: "pointer",
                      ...POPPINS,
                    }}
                  >
                    Change
                  </label>
                )}
              </div>
              <input
                id="sc-thumb"
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

            {isAdmin && (
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
                      color: NAVY,
                      ...POPPINS,
                    }}
                  >
                    Publish immediately
                  </div>
                  {!uploadPublished && (
                    <div style={{ fontSize: 12, color: "#6B7686", ...POPPINS }}>
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
                    background: uploadPublished ? RED : "#E4E8EF",
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
            )}

            <button
              type="button"
              onClick={handleUpload}
              disabled={!videoFile || !uploadTitle.trim() || uploading}
              style={{
                width: "100%",
                background: RED,
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
                opacity: !videoFile || !uploadTitle.trim() || uploading ? 0.5 : 1,
                ...POPPINS,
              }}
            >
              {uploading ? uploadProgress || "Uploading..." : "Upload clip"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

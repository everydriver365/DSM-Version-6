import { DSMToggle } from "@/components/dsm/DSMToggle";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/dsm/PageHeader";
import { SwipeableDetailShell } from "@/components/dsm/SwipeableDetailShell";
import { supabase } from "@/lib/supabaseClient";
import { uploadVideo, uploadImage } from "@/lib/uploadFile";
import {
  BottomSheet,
  SheetGroup,
  SheetRow,
  SheetRadioRow,
  PrimaryButton,
  GhostButton,
} from "@/components/dsm/BottomSheetV2";
import {
  IconChevronLeft,
  IconChevronRight,
  IconPlayerPlay,
  IconPlus,
  IconEye,
  IconThumbUp,
  IconThumbDown,
  IconMessageCircle,
  IconFlag,
  IconDots,
  IconUpload,
  IconX,
  IconSend,
  IconPlayerSkipForward,
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
  caption?: string | null;
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

const REPORT_REASONS = [
  "Inappropriate content",
  "Dangerous driving shown",
  "Pupil identifiable",
  "Spam or misleading",
  "Copyright issue",
  "Other",
];

const AVATAR_COLORS = ["#1877D6", "#CC2229", "#0B1F3A", "#0F9D58", "#8B5CF6"];

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

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
  const videoRef = useRef<HTMLVideoElement>(null);
  const [nextVideo, setNextVideo] = useState<ShowcaseVideo | null>(null);

  // Votes
  const [votes, setVotes] = useState<Record<string, "up" | "down" | null>>({});
  const [voteCounts, setVoteCounts] = useState<
    Record<string, { up: number; down: number }>
  >({});

  // Comments
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [comments, setComments] = useState<any[]>([]);
  const [commentBody, setCommentBody] = useState("");
  const [commentSort, setCommentSort] = useState<"newest" | "top">("newest");
  const [sendingComment, setSendingComment] = useState(false);
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({});

  // Reports
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportingId, setReportingId] = useState<string | null>(null);
  const [sendingReport, setSendingReport] = useState(false);

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

  // Load vote state + counts + comment counts
  useEffect(() => {
    if (videos.length === 0) return;
    const ids = videos.map((v) => v.id);
    (async () => {
      const { data } = await db
        .from("showcase_likes")
        .select("video_id, instructor_id, vote_type")
        .in("video_id", ids);
      const rows =
        (data as
          | { video_id: string; instructor_id: string; vote_type: string }[]
          | null) ?? [];
      const counts: Record<string, { up: number; down: number }> = {};
      const myVotes: Record<string, "up" | "down" | null> = {};
      rows.forEach((r) => {
        if (!counts[r.video_id]) counts[r.video_id] = { up: 0, down: 0 };
        if (r.vote_type === "down") counts[r.video_id].down++;
        else counts[r.video_id].up++;
        if (userId && r.instructor_id === userId) {
          myVotes[r.video_id] = r.vote_type === "down" ? "down" : "up";
        }
      });
      setVoteCounts(counts);
      setVotes(myVotes);

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

  // Load comments for the open video
  useEffect(() => {
    if (!commentsOpen || !playing) return;
    (async () => {
      const { data } = await db
        .from("showcase_comments")
        .select(
          "id, body, created_at, instructor:instructors!instructor_id(id, name)",
        )
        .eq("video_id", playing.id)
        .is("deleted_at", null)
        .order("created_at", { ascending: true });
      setComments(
        ((data as any[] | null) ?? []).map((c) => ({
          ...c,
          instructor: Array.isArray(c.instructor) ? c.instructor[0] : c.instructor,
        })),
      );
    })();
  }, [commentsOpen, playing]);


  const filtered =
    activeCategory === "All"
      ? videos
      : videos.filter((v) => v.category === activeCategory);

  async function incrementView(video: ShowcaseVideo) {
    try {
      await db
        .from("showcase_videos")
        .update({ views: (video.views ?? 0) + 1 })
        .eq("id", video.id);
    } catch {
      /* non-critical */
    }
    setVideos((prev) =>
      prev.map((v) =>
        v.id === video.id ? { ...v, views: (v.views ?? 0) + 1 } : v,
      ),
    );
  }

  function openPlayer(video: ShowcaseVideo) {
    setNextVideo(null);
    setPlaying(video);
    setCommentsOpen(false);
    incrementView(video);
  }

  async function toggleVote(videoId: string, type: "up" | "down") {
    if (!userId) {
      toast.error("Sign in to vote");
      return;
    }
    const current = votes[videoId];
    try {
      if (current === type) {
        await db
          .from("showcase_likes")
          .delete()
          .eq("video_id", videoId)
          .eq("instructor_id", userId);
        setVotes((prev) => ({ ...prev, [videoId]: null }));
        setVoteCounts((prev) => ({
          ...prev,
          [videoId]: {
            up: prev[videoId]?.up ?? 0,
            down: prev[videoId]?.down ?? 0,
            [type]: Math.max(0, (prev[videoId]?.[type] ?? 1) - 1),
          },
        }));
      } else {
        if (current) {
          await db
            .from("showcase_likes")
            .delete()
            .eq("video_id", videoId)
            .eq("instructor_id", userId);
          setVoteCounts((prev) => ({
            ...prev,
            [videoId]: {
              up: prev[videoId]?.up ?? 0,
              down: prev[videoId]?.down ?? 0,
              [current]: Math.max(0, (prev[videoId]?.[current] ?? 1) - 1),
            },
          }));
        }
        await db.from("showcase_likes").insert({
          video_id: videoId,
          instructor_id: userId,
          vote_type: type,
        });
        setVotes((prev) => ({ ...prev, [videoId]: type }));
        setVoteCounts((prev) => ({
          ...prev,
          [videoId]: {
            up: prev[videoId]?.up ?? 0,
            down: prev[videoId]?.down ?? 0,
            [type]: (prev[videoId]?.[type] ?? 0) + 1,
          },
        }));
      }
    } catch (err: any) {
      toast.error(err?.message ?? "Could not save vote");
    }
  }

  async function sendComment() {
    if (!commentBody.trim() || !userId || !playing) return;
    setSendingComment(true);
    try {
      const { data, error } = await db
        .from("showcase_comments")
        .insert({
          video_id: playing.id,
          instructor_id: userId,
          body: commentBody.trim(),
        })
        .select(
          "id, body, created_at, instructor:instructors!instructor_id(id, name)",
        )
        .single();
      if (error) throw error;
      if (data) {
        setComments((prev) => [
          ...prev,
          {
            ...data,
            instructor: Array.isArray((data as any).instructor)
              ? (data as any).instructor[0]
              : (data as any).instructor,
          },
        ]);
        setCommentCounts((prev) => ({
          ...prev,
          [playing.id]: (prev[playing.id] ?? 0) + 1,
        }));
      }
      setCommentBody("");
    } catch (err: any) {
      toast.error(err?.message ?? "Could not post comment");
    } finally {
      setSendingComment(false);
    }
  }

  async function sendReport() {
    if (!reportReason.trim() || !reportingId || !userId) return;
    setSendingReport(true);
    try {
      await db.from("showcase_reports").insert({
        video_id: reportingId,
        instructor_id: userId,
        reason: reportReason.trim(),
      });
      toast.success("Report sent to admin");
    } catch (err: any) {
      toast.error(err?.message ?? "Could not send report");
    } finally {
      setReportOpen(false);
      setReportReason("");
      setReportingId(null);
      setSendingReport(false);
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
          instructor_id: userId,
          video_url: videoUrl,
          thumbnail_url: thumbnailUrl ?? null,
          caption:
            uploadTitle.trim() +
            (uploadDescription.trim()
              ? " — " + uploadDescription.trim()
              : ""),
          category: uploadCategory || null,
          tags: uploadTags
            ? uploadTags.split(" ").filter((t) => t.startsWith("#"))
            : [],
          views: 0,
        })
        .select()
        .single();


      if (error) throw error;
      if (data) setVideos((prev) => [data as ShowcaseVideo, ...prev]);

      setUploadOpen(false);
      setUploadTitle("");
      setUploadDescription("");
      setUploadTags("");
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
      <PageHeader
        title="DSM Showcase"
        right={
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
        }
      />

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
          {playing && (
            <div style={{ gridColumn: "1 / -1" }}>
            <SwipeableDetailShell<ShowcaseVideo>
              items={filtered}
              index={Math.max(0, filtered.findIndex((v) => v.id === playing.id))}
              onIndexChange={(i) => {
                const nx = filtered[i];
                if (nx) openPlayer(nx);
              }}
              getKey={(v, i) => String(v.id ?? i)}
              variant="video"
              renderItem={(panelVideo, isActive) =>
                !isActive ? (
                  <div
                    style={{
                      borderRadius: 12,
                      overflow: "hidden",
                      background: "#000",
                      aspectRatio: "16 / 9",
                    }}
                  >
                    {panelVideo.thumbnail_url && (
                      <img
                        src={panelVideo.thumbnail_url}
                        alt={panelVideo.title ?? "Clip"}
                        loading="lazy"
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                          opacity: 0.7,
                        }}
                      />
                    )}
                  </div>
                ) : (
            <div
              style={{
                gridColumn: "1 / -1",
                background: "#000",
                borderRadius: 12,
                overflow: "hidden",
                marginBottom: 12,
                position: "relative",
              }}
            >
              <video
                ref={videoRef}
                key={playing.id}
                src={playing.video_url}
                poster={playing.thumbnail_url ?? undefined}
                autoPlay
                controls
                controlsList="nodownload noplaybackrate noremoteplayback"
                disablePictureInPicture
                disableRemotePlayback
                onContextMenu={(e) => e.preventDefault()}
                playsInline
                onCanPlay={(e) => {
                  const v = e.currentTarget;
                  // Attempt autoplay with audio
                  v.play().catch(() => {
                    // Browser blocked autoplay with audio
                    // — user must tap play manually
                    // Do nothing, controls are visible
                  });
                }}
                style={{
                  width: "100%",
                  maxHeight: 260,
                  display: "block",
                  objectFit: "contain",
                  background: "#000",
                }}
                onEnded={() => {
                  // Pause on last frame — don't black out
                  if (videoRef.current) {
                    videoRef.current.pause();
                    videoRef.current.currentTime = Math.max(
                      0,
                      videoRef.current.duration - 0.1,
                    );
                  }
                  setPlaying((prev) => prev); // keep playing state
                  // Show next up card below instead of overlay
                  const currentIndex = videos.findIndex(
                    (v) => v.id === playing?.id,
                  );
                  const next = videos[currentIndex + 1];
                  if (next) setNextVideo(next);
                }}
              />

              <div style={{ background: "#111", padding: "10px 12px" }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 6,
                  }}
                >
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: "#fff",
                      flex: 1,
                      minWidth: 0,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      ...POPPINS,
                    }}
                  >
                    {playing.caption ?? playing.title}
                  </div>
                  <button
                    type="button"
                    aria-label="Close player"
                    onClick={() => setPlaying(null)}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      padding: 4,
                      flexShrink: 0,
                      display: "flex",
                    }}
                  >
                    <IconX size={16} color="rgba(255,255,255,0.6)" />
                  </button>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  {/* Merged vote pill */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      background: "#F2F2F7",
                      borderRadius: 20,
                      overflow: "hidden",
                    }}
                  >
                    <button
                      type="button"
                      aria-label="Upvote"
                      onClick={() => toggleVote(playing.id, "up")}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        padding: "9px 14px",
                        border: "none",
                        cursor: "pointer",
                        fontSize: 13,
                        fontWeight: 700,
                        background:
                          votes[playing.id] === "up" ? BLUE : "transparent",
                        color: votes[playing.id] === "up" ? "#fff" : BLUE,
                        ...POPPINS,
                      }}
                    >
                      <IconThumbUp
                        size={15}
                        stroke={1.8}
                        color={votes[playing.id] === "up" ? "#fff" : BLUE}
                      />
                      {voteCounts[playing.id]?.up ?? 0}
                    </button>
                    <div
                      style={{ width: 1, height: 18, background: "#E0E0E4" }}
                    />
                    <button
                      type="button"
                      aria-label="Downvote"
                      onClick={() => toggleVote(playing.id, "down")}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        padding: "9px 14px",
                        border: "none",
                        cursor: "pointer",
                        fontSize: 13,
                        fontWeight: 700,
                        background:
                          votes[playing.id] === "down" ? RED : "transparent",
                        color: votes[playing.id] === "down" ? "#fff" : "#6B6B6F",
                        ...POPPINS,
                      }}
                    >
                      <IconThumbDown
                        size={15}
                        stroke={1.8}
                        color={
                          votes[playing.id] === "down" ? "#fff" : "#6B6B6F"
                        }
                      />
                    </button>
                  </div>

                  {/* Comment pill */}
                  <button
                    type="button"
                    aria-label="Comments"
                    onClick={() => setCommentsOpen(true)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      background: "#F2F2F7",
                      borderRadius: 20,
                      padding: "9px 14px",
                      border: "none",
                      cursor: "pointer",
                      color: "#6B6B6F",
                      fontSize: 13,
                      fontWeight: 700,
                      ...POPPINS,
                    }}
                  >
                    <IconMessageCircle size={15} stroke={1.8} color="#6B6B6F" />
                    {commentCounts[playing.id] ?? 0}
                  </button>

                  {/* View count (non-interactive) */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 5,
                      marginLeft: "auto",
                      color: "#B0B0B5",
                      fontSize: 12.5,
                      fontWeight: 600,
                      ...POPPINS,
                    }}
                  >
                    <IconEye size={14} stroke={1.8} color="#B0B0B5" />
                    {playing.views ?? 0}
                  </div>

                  <button
                    type="button"
                    aria-label="Report video"
                    onClick={() => {
                      setReportingId(playing.id);
                      setReportOpen(true);
                    }}
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: "50%",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      padding: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <IconFlag size={14} stroke={1.8} color="#C7C7CC" />
                  </button>
                </div>


                {nextVideo && (
                  <div
                    style={{
                      margin: "8px 0 0",
                      background: "#fff",
                      border: "none",
                      borderRadius: 12,
                      boxShadow: "0 1px 3px rgba(11,31,58,0.06)",
                      padding: "10px 12px",
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      cursor: "pointer",
                    }}
                    onClick={() => {
                      openPlayer(nextVideo);
                    }}
                  >
                    {/* Thumbnail */}
                    <div
                      style={{
                        width: 52,
                        height: 36,
                        borderRadius: 6,
                        overflow: "hidden",
                        flexShrink: 0,
                        background: "linear-gradient(135deg, #CC2229, #7C1D1D)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {nextVideo.thumbnail_url ? (
                        <img
                          src={nextVideo.thumbnail_url}
                          alt=""
                          style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        />
                      ) : (
                        <IconPlayerPlay size={16} color="#fff" stroke={1.5} />
                      )}
                    </div>
                    {/* Text */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 10,
                          fontWeight: 600,
                          color: "#9CA3AF",
                          textTransform: "uppercase",
                          letterSpacing: "0.06em",
                          fontFamily: "Poppins, sans-serif",
                          marginBottom: 2,
                        }}
                      >
                        Up next
                      </div>
                      <div
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          color: "#0B1F3A",
                          fontFamily: "Poppins, sans-serif",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {nextVideo.caption ?? "Next video"}
                      </div>
                    </div>
                    <IconChevronRight size={16} color="#9CA3AF" stroke={1.5} />
                  </div>
                )}
              </div>
            </div>
                )
              }
            />
            </div>
          )}

          {filtered.map((video) => {
            const upvoted = votes[video.id] === "up";
            const downvoted = votes[video.id] === "down";
            return (
              <div
                key={video.id}
                style={{
                  background: "#fff",
                  border: "none",
                  borderRadius: 16,
                  boxShadow: "0 1px 3px rgba(11,31,58,0.06)",
                  overflow: "hidden",
                }}
              >
                {/* THUMBNAIL */}
                <div
                  onClick={() => openPlayer(video)}

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
                      gap: 12,
                      marginTop: 8,
                      fontSize: 11,
                      color: "#8A8A8E",
                      ...POPPINS,
                    }}
                  >
                    <button
                      type="button"
                      aria-label="Upvote"
                      onClick={() => toggleVote(video.id, "up")}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                        background: "none",
                        border: "none",
                        padding: 0,
                        cursor: "pointer",
                        color: upvoted ? BLUE : "#8A8A8E",
                        fontSize: 11,
                        fontWeight: 600,
                        ...POPPINS,
                      }}
                    >
                      <IconThumbUp size={11} color={upvoted ? BLUE : "#8A8A8E"} />
                      {voteCounts[video.id]?.up ?? 0}
                    </button>

                    <button
                      type="button"
                      aria-label="Comments"
                      onClick={() => {
                        openPlayer(video);
                        setCommentsOpen(true);
                      }}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                        background: "none",
                        border: "none",
                        padding: 0,
                        cursor: "pointer",
                        color: "#8A8A8E",
                        fontSize: 11,
                        fontWeight: 600,
                        ...POPPINS,
                      }}
                    >
                      <IconMessageCircle size={11} color="#8A8A8E" />
                      {commentCounts[video.id] ?? 0}
                    </button>

                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                        fontSize: 11,
                        fontWeight: 600,
                        color: "#8A8A8E",
                      }}
                    >
                      <IconEye size={11} color="#8A8A8E" />
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



      {/* COMMENTS SHEET */}
      {commentsOpen && playing && (
        <div style={{ position: "fixed", inset: 0, zIndex: 200 }}>
          <div
            onClick={() => setCommentsOpen(false)}
            style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)" }}
          />
          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              background: "#fff",
              borderRadius: "20px 20px 0 0",
              maxHeight: "78vh",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            {/* Header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                padding: "16px 18px",
                borderBottom: "1px solid #E4E4E8",
              }}
            >
              <div
                style={{
                  color: "#000",
                  fontSize: 16,
                  fontWeight: 800,
                  ...POPPINS,
                }}
              >
                {comments.length} Comments
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {(["newest", "top"] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setCommentSort(s)}
                    style={{
                      borderRadius: 20,
                      padding: "5px 12px",
                      fontSize: 12,
                      fontWeight: 700,
                      border: "none",
                      cursor: "pointer",
                      background: commentSort === s ? BLUE : "#F2F2F7",
                      color: commentSort === s ? "#fff" : "#6B6B6F",
                      ...POPPINS,
                    }}
                  >
                    {s === "newest" ? "Newest" : "Top"}
                  </button>
                ))}
                <button
                  type="button"
                  aria-label="Close comments"
                  onClick={() => setCommentsOpen(false)}
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    background: "#E5E5EA",
                    border: "none",
                    cursor: "pointer",
                    padding: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <IconX size={12} color="#6B6B6F" />
                </button>
              </div>
            </div>

            {/* List */}
            <div style={{ flex: 1, overflowY: "auto", padding: "16px 18px" }}>
              {comments.length === 0 ? (
                <div
                  style={{
                    textAlign: "center",
                    color: "#B0B0B5",
                    fontSize: 13,
                    padding: "30px 0",
                    ...POPPINS,
                  }}
                >
                  No comments yet — be the first
                </div>
              ) : (
                (() => {
                  const displayedComments =
                    commentSort === "newest"
                      ? [...comments].sort(
                          (a, b) =>
                            new Date(b.created_at).getTime() -
                            new Date(a.created_at).getTime(),
                        )
                      : [...comments];
                  return displayedComments.map((c: any, i: number) => {
                    const name = c.instructor?.name ?? c.author_name ?? "Instructor";
                    return (
                      <div
                        key={c.id}
                        style={{
                          display: "flex",
                          gap: 11,
                          marginBottom: 18,
                          alignItems: "flex-start",
                        }}
                      >
                        <div
                          style={{
                            width: 36,
                            height: 36,
                            flexShrink: 0,
                            borderRadius: "50%",
                            background: AVATAR_COLORS[i % AVATAR_COLORS.length],
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "#fff",
                            fontSize: 12,
                            fontWeight: 700,
                            ...POPPINS,
                          }}
                        >
                          {initials(name)}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 7,
                            }}
                          >
                            <span
                              style={{
                                fontSize: 13.5,
                                fontWeight: 700,
                                color: "#000",
                                ...POPPINS,
                              }}
                            >
                              {name}
                            </span>
                            <span
                              style={{
                                fontSize: 11,
                                color: "#B0B0B5",
                                ...POPPINS,
                              }}
                            >
                              {timeAgo(c.created_at)}
                            </span>
                          </div>
                          <div
                            style={{
                              fontSize: 14,
                              fontWeight: 400,
                              color: NAVY,
                              marginTop: 3,
                              lineHeight: 1.4,
                              ...POPPINS,
                            }}
                          >
                            {c.body}
                          </div>
                        </div>
                      </div>
                    );
                  });
                })()
              )}
            </div>

            {/* Compose bar */}
            <div
              style={{
                display: "flex",
                gap: 10,
                alignItems: "center",
                padding: "12px 16px",
                background: "#fff",
                borderTop: "1px solid #E4E4E8",
              }}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  flexShrink: 0,
                  borderRadius: "50%",
                  background: BLUE,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#fff",
                  fontSize: 11,
                  fontWeight: 700,
                  ...POPPINS,
                }}
              >
                {initials("Me")}
              </div>
              <input
                value={commentBody}
                onChange={(e) => setCommentBody(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    sendComment();
                  }
                }}
                placeholder="Add a comment..."
                aria-label="Add a comment"
                style={{
                  flex: 1,
                  minWidth: 0,
                  background: "#F2F2F7",
                  border: "none",
                  outline: "none",
                  borderRadius: 20,
                  padding: "9px 16px",
                  color: NAVY,
                  fontSize: 13.5,
                  ...POPPINS,
                }}
              />
              <button
                type="button"
                aria-label="Send comment"
                onClick={sendComment}
                disabled={sendingComment || !commentBody.trim()}
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: "50%",
                  background: BLUE,
                  border: "none",
                  padding: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  cursor: "pointer",
                  opacity: commentBody.trim() ? 1 : 0.5,
                }}
              >
                <IconSend size={14} color="#fff" />
              </button>
            </div>
          </div>
        </div>
      )}


      {/* REPORT SHEET */}
      {reportOpen && (
        <BottomSheet
          title="Report video"
          subtitle="Help us keep DSM Showcase safe"
          onClose={() => setReportOpen(false)}
          footer={
            <>
              <PrimaryButton
                color={RED}
                disabled={!reportReason.trim() || sendingReport}
                onClick={sendReport}
              >
                {sendingReport ? "Sending..." : "Send report"}
              </PrimaryButton>
              <GhostButton color="#6B7686" bg="#F1F5F9" onClick={() => setReportOpen(false)}>
                Cancel
              </GhostButton>
            </>
          }
        >
          <SheetGroup>
            {REPORT_REASONS.map((r) => (
              <SheetRadioRow
                key={r}
                title={r}
                selected={reportReason === r}
                onSelect={() => setReportReason(r)}
              />
            ))}
          </SheetGroup>

          {reportReason === "Other" && (
            <SheetGroup>
              <SheetRow>
                <textarea
                  rows={3}
                  placeholder="Tell us more..."
                  aria-label="Report details"
                  onChange={(e) =>
                    setReportReason(e.target.value ? e.target.value : "Other")
                  }
                  className="w-full bg-transparent focus:outline-none resize-none"
                  style={{ fontSize: 16, color: NAVY, ...POPPINS }}
                />
              </SheetRow>
            </SheetGroup>
          )}
        </BottomSheet>
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
              <label style={labelStyle} htmlFor="sc-tags">
                Tags (optional)
              </label>
              <input
                id="sc-tags"
                value={uploadTags}
                onChange={(e) => setUploadTags(e.target.value)}
                placeholder="#testpass #dashcam #teaching"
                style={inputStyle}
              />
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
                <DSMToggle checked={uploadPublished} onChange={(v) => setUploadPublished(v)} />
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

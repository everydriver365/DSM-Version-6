import { DSMToggle } from "@/components/dsm/DSMToggle";
import { tokens } from "@/lib/tokens";
import { useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";
import { SwipeableDetailShell } from "@/components/dsm/SwipeableDetailShell";
import { ConfirmSheet } from "@/components/dsm/ConfirmSheet";
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
  fontSize: tokens.fontSize.xs,
  fontWeight: tokens.fontWeight.bold,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  color: tokens.textSecondary,
  marginBottom: 6,
  display: "block",
  ...POPPINS,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  border: "1px solid #E4E8EF",
  borderRadius: tokens.radiusCard,
  padding: "12px 16px",
  fontSize: tokens.fontSize.md,
  color: NAVY,
  background: "#fff",
  outline: "none",
  ...POPPINS,
};

export default function ShowcasePageBody() {
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
  const [voteCounts, setVoteCounts] = useState<Record<string, { up: number; down: number }>>({});

  // Comments
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [comments, setComments] = useState<any[]>([]);
  const [commentBody, setCommentBody] = useState("");
  const [commentSort, setCommentSort] = useState<"newest" | "top">("newest");
  const [sendingComment, setSendingComment] = useState(false);
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({});
  const [replyTo, setReplyTo] = useState<{ id: string; name: string } | null>(null);
  // Comment pagination (paginates top-level threads; replies load with their parent)
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [loadingMoreComments, setLoadingMoreComments] = useState(false);
  const [hasMoreComments, setHasMoreComments] = useState(false);
  const rootOffsetRef = useRef(0);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  // Per-comment likes
  const [commentLikeCounts, setCommentLikeCounts] = useState<Record<string, number>>({});
  const [myCommentLikes, setMyCommentLikes] = useState<Record<string, boolean>>({});

  // Reports
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportingId, setReportingId] = useState<string | null>(null);
  const [sendingReport, setSendingReport] = useState(false);
  const [reportCommentId, setReportCommentId] = useState<string | null>(null);
  const [reportedComments, setReportedComments] = useState<Record<string, boolean>>({});

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
        (data as { video_id: string; instructor_id: string; vote_type: string }[] | null) ?? [];
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

  // Load comments for the open video, one page of top-level threads at a time
  const COMMENT_PAGE_SIZE = 15;

  const loadCommentPage = useCallback(
    async (videoId: string, replace: boolean) => {
      const from = replace ? 0 : rootOffsetRef.current;
      if (replace) setCommentsLoading(true);
      else setLoadingMoreComments(true);
      try {
        const select =
          "id, body, created_at, parent_id, instructor_id, instructor:instructors!instructor_id(id, name)";
        const { data: rootData } = await db
          .from("showcase_comments")
          .select(select)
          .eq("video_id", videoId)
          .is("deleted_at", null)
          .is("parent_id", null)
          .order("created_at", { ascending: true })
          .range(from, from + COMMENT_PAGE_SIZE - 1);
        const rootRows = ((rootData as any[] | null) ?? []).map((c) => ({
          ...c,
          instructor: Array.isArray(c.instructor) ? c.instructor[0] : c.instructor,
        }));
        const rootIds = rootRows.map((c) => c.id);

        let replyRows: any[] = [];
        if (rootIds.length > 0) {
          const { data: replyData } = await db
            .from("showcase_comments")
            .select(select)
            .eq("video_id", videoId)
            .is("deleted_at", null)
            .in("parent_id", rootIds)
            .order("created_at", { ascending: true });
          replyRows = ((replyData as any[] | null) ?? []).map((c) => ({
            ...c,
            instructor: Array.isArray(c.instructor) ? c.instructor[0] : c.instructor,
          }));
        }

        const pageRows = [...rootRows, ...replyRows];
        rootOffsetRef.current = from + rootRows.length;
        setHasMoreComments(rootRows.length === COMMENT_PAGE_SIZE);
        setComments((prev) => {
          if (replace) return pageRows;
          const seen = new Set(prev.map((c: any) => c.id));
          return [...prev, ...pageRows.filter((c) => !seen.has(c.id))];
        });

        const ids = pageRows.map((c) => c.id);
        if (ids.length === 0) {
          if (replace) {
            setCommentLikeCounts({});
            setMyCommentLikes({});
          }
          return;
        }
        const { data: likeRows } = await db
          .from("showcase_comment_likes")
          .select("comment_id, instructor_id")
          .in("comment_id", ids);
        const counts: Record<string, number> = {};
        const mine: Record<string, boolean> = {};
        ((likeRows as { comment_id: string; instructor_id: string }[] | null) ?? []).forEach(
          (r) => {
            counts[r.comment_id] = (counts[r.comment_id] ?? 0) + 1;
            if (userId && r.instructor_id === userId) mine[r.comment_id] = true;
          },
        );
        setCommentLikeCounts((prev) => (replace ? counts : { ...prev, ...counts }));
        setMyCommentLikes((prev) => (replace ? mine : { ...prev, ...mine }));
      } finally {
        setCommentsLoading(false);
        setLoadingMoreComments(false);
      }
    },
    [userId],
  );

  useEffect(() => {
    if (!commentsOpen || !playing) return;
    setReplyTo(null);
    setComments([]);
    rootOffsetRef.current = 0;
    setHasMoreComments(false);
    void loadCommentPage(playing.id, true);
  }, [commentsOpen, playing, loadCommentPage]);

  // Infinite scroll: fetch the next page when the sentinel scrolls into view
  useEffect(() => {
    if (!commentsOpen || !playing || !hasMoreComments) return;
    const el = loadMoreRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !loadingMoreComments && !commentsLoading) {
          void loadCommentPage(playing.id, false);
        }
      },
      { rootMargin: "200px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [
    commentsOpen,
    playing,
    hasMoreComments,
    loadingMoreComments,
    commentsLoading,
    loadCommentPage,
  ]);

  async function toggleCommentLike(commentId: string) {
    if (!userId) {
      toast.error("Sign in to like comments");
      return;
    }
    const liked = !!myCommentLikes[commentId];
    // optimistic
    setMyCommentLikes((prev) => ({ ...prev, [commentId]: !liked }));
    setCommentLikeCounts((prev) => ({
      ...prev,
      [commentId]: Math.max(0, (prev[commentId] ?? 0) + (liked ? -1 : 1)),
    }));
    try {
      if (liked) {
        const { error } = await db
          .from("showcase_comment_likes")
          .delete()
          .eq("comment_id", commentId)
          .eq("instructor_id", userId);
        if (error) throw error;
      } else {
        const { error } = await db
          .from("showcase_comment_likes")
          .insert({ comment_id: commentId, instructor_id: userId });
        if (error) throw error;
      }
    } catch (err: any) {
      // revert
      setMyCommentLikes((prev) => ({ ...prev, [commentId]: liked }));
      setCommentLikeCounts((prev) => ({
        ...prev,
        [commentId]: Math.max(0, (prev[commentId] ?? 0) + (liked ? 1 : -1)),
      }));
      toast.error(err?.message ?? "Could not save like");
    }
  }

  const filtered =
    activeCategory === "All" ? videos : videos.filter((v) => v.category === activeCategory);

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
      prev.map((v) => (v.id === video.id ? { ...v, views: (v.views ?? 0) + 1 } : v)),
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
          parent_id: replyTo?.id ?? null,
        })
        .select(
          "id, body, created_at, parent_id, instructor_id, instructor:instructors!instructor_id(id, name)",
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
      setReplyTo(null);
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

  async function confirmReportComment() {
    const commentId = reportCommentId;
    if (!commentId) return;
    if (!userId) {
      toast.error("Sign in to report comments");
      setReportCommentId(null);
      return;
    }
    setReportCommentId(null);
    setReportedComments((p) => ({ ...p, [commentId]: true }));
    try {
      const { error } = await db.from("showcase_comment_reports").insert({
        comment_id: commentId,
        instructor_id: userId,
      });
      if (error && error.code !== "23505") throw error;
      toast.success("Reported — thanks, an admin will review it");
    } catch (err: any) {
      setReportedComments((p) => {
        const next = { ...p };
        delete next[commentId];
        return next;
      });
      toast.error(err?.message ?? "Could not send report");
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
            uploadTitle.trim() + (uploadDescription.trim() ? " — " + uploadDescription.trim() : ""),
          category: uploadCategory || null,
          tags: uploadTags ? uploadTags.split(" ").filter((t) => t.startsWith("#")) : [],
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
    <div style={{ background: "#DCE4F0", ...POPPINS }}>
      <div style={{ display: "flex", justifyContent: "flex-end", padding: "10px 16px 0" }}>
        <button
          type="button"
          aria-label="Upload clip"
          onClick={() => setUploadOpen(true)}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            borderRadius: tokens.radiusCard,
            border: "none",
            background: "#0B1F3A",
            color: "#fff",
            padding: "8px 14px",
            fontSize: 13,
            fontWeight: tokens.fontWeight.semibold,
            cursor: "pointer",
            ...POPPINS,
          }}
        >
          <IconPlus size={16} />
          Upload clip
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
                borderRadius: tokens.radiusCard,
                padding: "6px 16px",
                fontSize: 12,
                fontWeight: tokens.fontWeight.semibold,
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
        <div style={{ display: "flex", justifyContent: "center", padding: "60px 0" }}>
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
              fontSize: tokens.fontSize.lg,
              fontWeight: tokens.fontWeight.semibold,
              color: NAVY,
              marginTop: 12,
              ...POPPINS,
            }}
          >
            No clips yet
          </div>
          <div
            style={{
              fontSize: tokens.fontSize.base,
              color: tokens.textSecondary,
              marginTop: 6,
              ...POPPINS,
            }}
          >
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
                index={Math.max(
                  0,
                  filtered.findIndex((v) => v.id === playing.id),
                )}
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
                        borderRadius: 8,
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
                        borderRadius: 8,
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
                          const currentIndex = videos.findIndex((v) => v.id === playing?.id);
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
                              fontSize: tokens.fontSize.base,
                              fontWeight: tokens.fontWeight.semibold,
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
                              borderRadius: 8,
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
                                fontSize: tokens.fontSize.base,
                                fontWeight: tokens.fontWeight.bold,
                                background: votes[playing.id] === "up" ? BLUE : "transparent",
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
                            <div style={{ width: 1, height: 18, background: "#E0E0E4" }} />
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
                                fontSize: tokens.fontSize.base,
                                fontWeight: tokens.fontWeight.bold,
                                background: votes[playing.id] === "down" ? RED : "transparent",
                                color: votes[playing.id] === "down" ? "#fff" : "#6B6B6F",
                                ...POPPINS,
                              }}
                            >
                              <IconThumbDown
                                size={15}
                                stroke={1.8}
                                color={votes[playing.id] === "down" ? "#fff" : "#6B6B6F"}
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
                              borderRadius: tokens.radiusCard,
                              padding: "9px 16px",
                              border: "none",
                              cursor: "pointer",
                              color: "#6B6B6F",
                              fontSize: tokens.fontSize.base,
                              fontWeight: tokens.fontWeight.bold,
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
                              gap: 4,
                              marginLeft: "auto",
                              color: "#B0B0B5",
                              fontSize: 12.5,
                              fontWeight: tokens.fontWeight.semibold,
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
                              borderRadius: tokens.radiusCard,
                              boxShadow: "0 1px 3px rgba(11,31,58,0.06)",
                              padding: "12px 16px",
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
                                borderRadius: 8,
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
                                  fontSize: tokens.fontSize.xs,
                                  fontWeight: tokens.fontWeight.semibold,
                                  color: tokens.textMuted,
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
                                  fontWeight: tokens.fontWeight.semibold,
                                  color: tokens.navy,
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
            return (
              <div key={video.id} style={{ position: "relative" }}>
                <VideoCard
                  thumbnail={video.thumbnail_url}
                  title={video.title}
                  placeholderColor={RED}
                  onPlay={() => openPlayer(video)}
                />

                {isAdmin && !video.is_published && (
                  <div
                    style={{
                      position: "absolute",
                      left: 6,
                      top: 6,
                      background: "#FEF3C7",
                      color: "#B45309",
                      fontSize: 9,
                      fontWeight: tokens.fontWeight.semibold,
                      borderRadius: 999,
                      padding: "2px 8px",
                      ...POPPINS,
                    }}
                  >
                    Draft
                  </div>
                )}

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    marginTop: 6,
                    paddingLeft: 2,
                    fontSize: tokens.fontSize.sm,
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
                      fontSize: tokens.fontSize.sm,
                      fontWeight: tokens.fontWeight.semibold,
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
                      fontSize: tokens.fontSize.sm,
                      fontWeight: tokens.fontWeight.semibold,
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
                      fontSize: tokens.fontSize.sm,
                      fontWeight: tokens.fontWeight.semibold,
                      color: "#8A8A8E",
                    }}
                  >
                    <IconEye size={11} color="#8A8A8E" />
                    {video.views ?? 0}
                  </span>
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
              borderRadius: "16px 16px 0 0",
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
                  fontSize: tokens.fontSize.lg,
                  fontWeight: tokens.fontWeight.extrabold,
                  ...POPPINS,
                }}
              >
                {Math.max(commentCounts[playing.id] ?? 0, comments.length)} Comments
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {(["newest", "top"] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setCommentSort(s)}
                    style={{
                      borderRadius: tokens.radiusCard,
                      padding: "5px 16px",
                      fontSize: 12,
                      fontWeight: tokens.fontWeight.bold,
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
                    fontSize: tokens.fontSize.base,
                    padding: "30px 0",
                    ...POPPINS,
                  }}
                >
                  {commentsLoading ? "Loading comments…" : "No comments yet — be the first"}
                </div>
              ) : (
                (() => {
                  const nameOf = (c: any) => c?.instructor?.name ?? c?.author_name ?? "Instructor";
                  const byId: Record<string, any> = {};
                  comments.forEach((c: any) => (byId[c.id] = c));
                  const roots = comments.filter((c: any) => !c.parent_id || !byId[c.parent_id]);
                  const repliesByParent: Record<string, any[]> = {};
                  comments.forEach((c: any) => {
                    if (!c.parent_id || !byId[c.parent_id]) return;
                    (repliesByParent[c.parent_id] ??= []).push(c);
                  });
                  Object.values(repliesByParent).forEach((list) =>
                    list.sort(
                      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
                    ),
                  );
                  const sortedRoots =
                    commentSort === "newest"
                      ? [...roots].sort(
                          (a, b) =>
                            new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
                        )
                      : [...roots].sort(
                          (a, b) => (commentLikeCounts[b.id] ?? 0) - (commentLikeCounts[a.id] ?? 0),
                        );

                  const renderComment = (c: any, i: number, isReply: boolean, parent?: any) => {
                    const name = nameOf(c);
                    const liked = !!myCommentLikes[c.id];
                    const count = commentLikeCounts[c.id] ?? 0;
                    const isCreator =
                      !!playing?.created_by && c.instructor_id === playing.created_by;
                    const isMine = !!userId && c.instructor_id === userId;
                    const avatar = isReply ? 28 : 36;
                    // Replies always attach to the top-level thread parent.
                    const threadParent = isReply ? (parent ?? c) : c;
                    return (
                      <div
                        key={c.id}
                        style={{
                          display: "flex",
                          gap: 12,
                          marginBottom: isReply ? 14 : 18,
                          alignItems: "flex-start",
                        }}
                      >
                        <div
                          style={{
                            width: avatar,
                            height: avatar,
                            flexShrink: 0,
                            borderRadius: "50%",
                            background: AVATAR_COLORS[i % AVATAR_COLORS.length],
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "#fff",
                            fontSize: isReply ? 10.5 : 12,
                            fontWeight: tokens.fontWeight.bold,
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
                              gap: 8,
                              flexWrap: "wrap",
                            }}
                          >
                            <span
                              style={{
                                fontSize: isReply ? 12.5 : 13.5,
                                fontWeight: tokens.fontWeight.bold,
                                color: "#000",
                                ...POPPINS,
                              }}
                            >
                              {name}
                            </span>
                            {isCreator && (
                              <span
                                style={{
                                  fontSize: tokens.fontSize.xs,
                                  fontWeight: tokens.fontWeight.bold,
                                  color: "#fff",
                                  background: BLUE,
                                  borderRadius: 999,
                                  padding: "2px 7px",
                                  ...POPPINS,
                                }}
                              >
                                Creator
                              </span>
                            )}
                            {isMine && !isCreator && (
                              <span
                                style={{
                                  fontSize: tokens.fontSize.xs,
                                  fontWeight: tokens.fontWeight.bold,
                                  color: "#6B6B6F",
                                  background: "#F2F2F7",
                                  borderRadius: 999,
                                  padding: "2px 7px",
                                  ...POPPINS,
                                }}
                              >
                                You
                              </span>
                            )}
                            <span
                              style={{ fontSize: tokens.fontSize.sm, color: "#B0B0B5", ...POPPINS }}
                            >
                              {timeAgo(c.created_at)}
                            </span>
                          </div>
                          <div
                            style={{
                              fontSize: isReply ? 13.5 : 14,
                              fontWeight: tokens.fontWeight.regular,
                              color: NAVY,
                              marginTop: 3,
                              lineHeight: 1.4,
                              ...POPPINS,
                            }}
                          >
                            {isReply && parent && (
                              <span
                                style={{
                                  color: BLUE,
                                  fontWeight: tokens.fontWeight.semibold,
                                  marginRight: 5,
                                }}
                              >
                                @{nameOf(parent)}
                              </span>
                            )}
                            {c.body}
                          </div>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 8,
                              marginTop: 7,
                            }}
                          >
                            <button
                              type="button"
                              onClick={() => toggleCommentLike(c.id)}
                              aria-pressed={liked}
                              aria-label={liked ? "Unlike comment" : "Like comment"}
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 4,
                                padding: "5px 10px",
                                borderRadius: 999,
                                border: "none",
                                background: liked ? "#E7F1FC" : "#F2F2F7",
                                color: liked ? BLUE : "#6B6B6F",
                                fontSize: 12,
                                fontWeight: tokens.fontWeight.semibold,
                                ...POPPINS,
                              }}
                            >
                              <IconThumbUp
                                size={13}
                                stroke={liked ? 2.2 : 1.7}
                                fill={liked ? BLUE : "none"}
                              />
                              {count > 0 ? count : "Like"}
                            </button>
                            <button
                              type="button"
                              onClick={() => setReplyTo({ id: threadParent.id, name })}
                              aria-label={`Reply to ${name}`}
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 4,
                                padding: "5px 10px",
                                borderRadius: 999,
                                border: "none",
                                background: "#F2F2F7",
                                color: "#6B6B6F",
                                fontSize: 12,
                                fontWeight: tokens.fontWeight.semibold,
                                ...POPPINS,
                              }}
                            >
                              <IconMessageCircle size={13} stroke={1.7} />
                              Reply
                            </button>
                            {(() => {
                              const reported = Boolean(reportedComments[c.id]);
                              return (
                                <button
                                  type="button"
                                  disabled={reported}
                                  onClick={() => setReportCommentId(c.id)}
                                  aria-label={
                                    reported ? "Comment reported" : `Report comment by ${name}`
                                  }
                                  title={reported ? "Reported" : "Report"}
                                  style={{
                                    marginLeft: "auto",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    width: 26,
                                    height: 26,
                                    borderRadius: 999,
                                    border: "none",
                                    background: "transparent",
                                    color: reported ? "#CC2229" : "#C7C7CC",
                                    flexShrink: 0,
                                  }}
                                >
                                  <IconFlag
                                    size={13}
                                    stroke={1.7}
                                    fill={reported ? "#CC2229" : "none"}
                                  />
                                </button>
                              );
                            })()}
                          </div>
                        </div>
                      </div>
                    );
                  };

                  return sortedRoots.map((c: any, i: number) => {
                    const replies = repliesByParent[c.id] ?? [];
                    return (
                      <div key={c.id}>
                        {renderComment(c, i, false)}
                        {replies.length > 0 && (
                          <div
                            style={{
                              marginLeft: 18,
                              paddingLeft: 16,
                              borderLeft: "2px solid #ECECF1",
                            }}
                          >
                            {replies.map((r: any, ri: number) =>
                              renderComment(r, i + ri + 1, true, c),
                            )}
                          </div>
                        )}
                      </div>
                    );
                  });
                })()
              )}

              {/* Infinite-scroll sentinel / manual fallback */}
              {(hasMoreComments || loadingMoreComments) && (
                <div
                  ref={loadMoreRef}
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    padding: "8px 0 16px",
                  }}
                >
                  <button
                    type="button"
                    disabled={loadingMoreComments}
                    onClick={() => playing && void loadCommentPage(playing.id, false)}
                    style={{
                      border: "none",
                      background: "#F2F2F7",
                      color: "#6B6B6F",
                      borderRadius: 999,
                      padding: "7px 16px",
                      fontSize: 12.5,
                      fontWeight: tokens.fontWeight.bold,
                      ...POPPINS,
                    }}
                  >
                    {loadingMoreComments ? "Loading…" : "Load more comments"}
                  </button>
                </div>
              )}
            </div>

            {/* Replying-to strip */}
            {replyTo && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "8px 16px",
                  background: "#F7F8FA",
                  borderTop: "1px solid #E4E4E8",
                }}
              >
                <IconMessageCircle size={14} stroke={1.7} color={BLUE} />
                <span style={{ fontSize: 12.5, color: "#6B6B6F", flex: 1, ...POPPINS }}>
                  Replying to <span style={{ color: BLUE, fontWeight: 600 }}>@{replyTo.name}</span>
                </span>
                <button
                  type="button"
                  onClick={() => setReplyTo(null)}
                  aria-label="Cancel reply"
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: "50%",
                    border: "none",
                    background: "#E9E9EE",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <IconX size={12} color="#6B6B6F" />
                </button>
              </div>
            )}

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
                  fontSize: tokens.fontSize.sm,
                  fontWeight: tokens.fontWeight.bold,
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
                placeholder={replyTo ? `Reply to @${replyTo.name}...` : "Add a comment..."}
                aria-label={replyTo ? "Write a reply" : "Add a comment"}
                style={{
                  flex: 1,
                  minWidth: 0,
                  background: "#F2F2F7",
                  border: "none",
                  outline: "none",
                  borderRadius: tokens.radiusCard,
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
      <ConfirmSheet
        open={reportCommentId !== null}
        title="Report this comment?"
        message="This comment will be sent to a DSM admin for review. The comment stays visible in the thread until an admin acts on it."
        confirmLabel="Report comment"
        cancelLabel="Cancel"
        onConfirm={confirmReportComment}
        onCancel={() => setReportCommentId(null)}
      />

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
                  onChange={(e) => setReportReason(e.target.value ? e.target.value : "Other")}
                  className="w-full bg-transparent focus:outline-none resize-none"
                  style={{ fontSize: tokens.fontSize.lg, color: NAVY, ...POPPINS }}
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
            <div
              style={{
                fontSize: tokens.fontSize.lg,
                fontWeight: tokens.fontWeight.bold,
                color: NAVY,
                ...POPPINS,
              }}
            >
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
                color: tokens.textSecondary,
                cursor: "pointer",
              }}
            >
              <IconX size={20} />
            </button>
          </div>

          <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 16 }}>
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
                  borderRadius: tokens.radiusCard,
                  padding: "24px 16px",
                  cursor: "pointer",
                  background: "#FFF7F7",
                }}
              >
                <IconUpload size={48} color={RED} />
                <div
                  style={{
                    fontSize: tokens.fontSize.md,
                    fontWeight: tokens.fontWeight.semibold,
                    color: NAVY,
                    ...POPPINS,
                  }}
                >
                  Tap to select video
                </div>
                <div style={{ fontSize: 12, color: tokens.textSecondary, ...POPPINS }}>
                  MP4 or MOV · max 500MB
                </div>
                {videoFile && (
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: tokens.fontWeight.semibold,
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
                    borderRadius: 8,
                    border: thumbPreview ? "1px solid #E4E8EF" : "2px dashed #E4E8EF",
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
                      fontSize: tokens.fontSize.base,
                      fontWeight: tokens.fontWeight.semibold,
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
                      fontSize: tokens.fontSize.md,
                      fontWeight: tokens.fontWeight.semibold,
                      color: NAVY,
                      ...POPPINS,
                    }}
                  >
                    Publish immediately
                  </div>
                  {!uploadPublished && (
                    <div style={{ fontSize: 12, color: tokens.textSecondary, ...POPPINS }}>
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
                borderRadius: tokens.radiusCard,
                padding: "14px 16px",
                fontSize: 15,
                fontWeight: tokens.fontWeight.bold,
                cursor: !videoFile || !uploadTitle.trim() || uploading ? "not-allowed" : "pointer",
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

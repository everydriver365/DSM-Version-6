import { tokens } from "@/lib/tokens";
import { useEffect, useMemo, useState } from "react";
import {
  IconBookmark,
  IconBookmarkFilled,
  IconClock,
  IconMovie,
  IconPlayerPlay,
  IconSearch,
  IconX,
} from "@tabler/icons-react";
import { supabase } from "@/lib/supabaseClient";
import {
  AUDIENCE_LABEL,
  VIDEO_CATEGORIES,
  VIDEO_CATEGORY_EMOJI,
  formatVideoDuration,
  isLibraryVideo,
  isPublished,
  searchVideos,
  videoEmbed,
  videoThumbnail,
  type LearnVideo,
} from "@/lib/learnVideos";
import { loadSaved, loadSeen, markSeen, toggleSaved } from "@/lib/learnSaved";

const NAVY = "#0B1F3A";
const BLUE = "#1877D6";
const CARD_SHADOW = "0 1px 3px rgba(0,0,0,0.06)";
const GRAY_BODY = "#6B7A90";
const GRAY_LABEL = "#5F6B7A";
const FONT = "Poppins, sans-serif";

/** Saved/seen ids are namespaced so videos share the existing Learn favourites. */
export const videoKey = (id: string) => `video:${id}`;

type Filter = "All" | "Saved" | (typeof VIDEO_CATEGORIES)[number];

function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        flexShrink: 0,
        padding: "7px 14px",
        borderRadius: 999,
        border: active ? "none" : "0.5px solid #E2E6ED",
        background: active ? NAVY : "#FFFFFF",
        color: active ? "#FFFFFF" : NAVY,
        fontSize: 12.5,
        fontWeight: tokens.fontWeight.semibold,
        fontFamily: FONT,
        whiteSpace: "nowrap",
        cursor: "pointer",
      }}
    >
      {label}
    </button>
  );
}

export function VideoPlayerSheet({
  video,
  onClose,
}: {
  video: LearnVideo;
  onClose: () => void;
}) {
  const playable = videoEmbed(video);
  return (
    <div
      role="dialog"
      aria-label={video.title}
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 2100,
        background: "rgba(0,0,0,0.94)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: 12,
        fontFamily: FONT,
      }}
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        aria-label="Close video"
        style={{
          position: "absolute",
          top: "calc(12px + env(safe-area-inset-top, 0px))",
          left: 12,
          width: 34,
          height: 34,
          borderRadius: "50%",
          border: "none",
          background: "rgba(255,255,255,0.15)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
        }}
      >
        <IconX stroke={1.5} size={20} color="#FFFFFF" />
      </button>

      <div onClick={(e) => e.stopPropagation()}>
        {playable?.type === "embed" ? (
          <iframe
            src={playable.src}
            title={video.title}
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
            style={{
              width: "100%",
              aspectRatio: "16 / 9",
              maxHeight: "70vh",
              border: "none",
              borderRadius: 8,
              background: "#000",
            }}
          />
        ) : playable ? (
          <video
            src={playable.src}
            poster={video.thumbnail_url ?? undefined}
            controls
            autoPlay
            playsInline
            style={{ width: "100%", maxHeight: "70vh", borderRadius: 8, background: "#000" }}
          />
        ) : (
          <div style={{ color: "#fff", textAlign: "center" }}>This video isn't available yet.</div>
        )}

        <div style={{ color: tokens.white, marginTop: 14 }}>
          <div style={{ fontSize: tokens.fontSize.lg, fontWeight: tokens.fontWeight.bold, lineHeight: 1.3 }}>{video.title}</div>
          <div style={{ fontSize: 12.5, color: "rgba(255,255,255,0.7)", marginTop: 4 }}>
            {[video.source, formatVideoDuration(video)].filter(Boolean).join(" · ")}
          </div>
          {video.description && (
            <div style={{ fontSize: tokens.fontSize.base, color: "rgba(255,255,255,0.8)", marginTop: 8, lineHeight: 1.4 }}>
              {video.description}
            </div>
          )}
          {video.source_url && (
            <a
              href={video.source_url}
              target="_blank"
              rel="noreferrer noopener"
              style={{ fontSize: 12, color: "#8CC0F5", marginTop: 8, display: "inline-block" }}
            >
              Source: {video.source ?? "publisher"}
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

function VideoCard({
  v,
  saved,
  onPlay,
  onSave,
  wide,
}: {
  v: LearnVideo;
  saved: boolean;
  onPlay: () => void;
  onSave: () => void;
  wide?: boolean;
}) {
  const thumb = videoThumbnail(v);
  const cat = (v.categories ?? [])[0];
  return (
    <div
      style={{
        width: wide ? 250 : undefined,
        flexShrink: wide ? 0 : undefined,
        background: tokens.white,
        borderRadius: 8,
        boxShadow: CARD_SHADOW,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        fontFamily: FONT,
      }}
    >
      <button
        type="button"
        onClick={onPlay}
        aria-label={`Watch ${v.title}`}
        style={{
          position: "relative",
          border: "none",
          padding: 0,
          background: NAVY,
          cursor: "pointer",
          width: "100%",
          aspectRatio: "16 / 9",
          backgroundImage: thumb ? `url(${thumb})` : undefined,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        {!thumb && (
          <IconMovie size={40} color="#FFFFFF" stroke={1} style={{ opacity: 0.3 }} />
        )}
        <span
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <span
            style={{
              width: 40,
              height: 40,
              borderRadius: "50%",
              background: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 3px 10px rgba(0,0,0,0.25)",
            }}
          >
            <IconPlayerPlay size={15} color={NAVY} fill={NAVY} style={{ marginLeft: 2 }} />
          </span>
        </span>
        {formatVideoDuration(v) && (
          <span
            style={{
              position: "absolute",
              bottom: 6,
              right: 6,
              padding: "2px 7px",
              borderRadius: 8,
              background: "rgba(0,0,0,0.65)",
              color: "#fff",
              fontSize: 10.5,
              fontWeight: tokens.fontWeight.bold,
            }}
          >
            {formatVideoDuration(v)}
          </span>
        )}
      </button>

      <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 5, flex: 1 }}>
        {cat && (
          <div style={{ fontSize: tokens.fontSize.sm, fontWeight: tokens.fontWeight.semibold, color: BLUE }}>
            {VIDEO_CATEGORY_EMOJI[cat] ?? "🎥"} {cat}
          </div>
        )}
        <div style={{ fontSize: tokens.fontSize.md, fontWeight: tokens.fontWeight.semibold, color: NAVY, lineHeight: 1.3 }}>{v.title}</div>
        {v.description && (
          <div style={{ fontSize: 12, color: GRAY_BODY, lineHeight: 1.35 }}>{v.description}</div>
        )}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: "auto", paddingTop: 6 }}>
          <IconClock stroke={1.5} size={13} color={GRAY_BODY} />
          <span style={{ fontSize: 11.5, color: GRAY_BODY, flex: 1, minWidth: 0 }}>
            {[v.source, AUDIENCE_LABEL[String(v.audience ?? "instructor")]]
              .filter(Boolean)
              .join(" · ")}
          </span>
          <button
            type="button"
            onClick={onSave}
            aria-label={saved ? "Remove from saved" : "Save for later"}
            style={{ border: "none", background: "transparent", padding: 2, cursor: "pointer" }}
          >
            {saved ? (
              <IconBookmarkFilled size={17} color={BLUE} />
            ) : (
              <IconBookmark stroke={1.5} size={17} color={GRAY_BODY} />
            )}
          </button>
        </div>
        <button
          type="button"
          onClick={onPlay}
          style={{
            marginTop: 2,
            border: "none",
            borderRadius: 8,
            background: "#E8F1FC",
            color: BLUE,
            fontWeight: tokens.fontWeight.bold,
            fontSize: 12.5,
            padding: "8px 10px",
            cursor: "pointer",
            fontFamily: FONT,
          }}
        >
          ▶ Watch
        </button>
      </div>
    </div>
  );
}

export default function LearnVideosSection() {
  const [videos, setVideos] = useState<LearnVideo[]>([]);
  const [filter, setFilter] = useState<Filter>("All");
  const [query, setQuery] = useState("");
  const [saved, setSaved] = useState<string[]>([]);
  const [seen, setSeen] = useState<string[]>([]);
  const [playing, setPlaying] = useState<LearnVideo | null>(null);

  useEffect(() => {
    setSaved(loadSaved());
    setSeen(loadSeen());
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("learn_videos")
        .select("*")
        .order("sort_order", { ascending: true });
      if (cancelled || error || !data) return;
      setVideos((data as LearnVideo[]).filter((v) => isLibraryVideo(v) && isPublished(v)));
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const featured = useMemo(() => videos.filter((v) => v.is_featured), [videos]);

  const continueWatching = useMemo(() => {
    const order = seen.filter((s) => s.startsWith("video:")).map((s) => s.slice(6));
    return order
      .map((id) => videos.find((v) => v.id === id))
      .filter((v): v is LearnVideo => !!v)
      .slice(0, 8);
  }, [seen, videos]);

  const list = useMemo(() => {
    let out = videos;
    if (filter === "Saved") out = out.filter((v) => saved.includes(videoKey(v.id)));
    else if (filter !== "All") out = out.filter((v) => (v.categories ?? []).includes(filter));
    return searchVideos(out, query);
  }, [videos, filter, saved, query]);

  const open = (v: LearnVideo) => {
    setPlaying(v);
    setSeen(markSeen(videoKey(v.id)));
  };

  const save = (v: LearnVideo) => setSaved(toggleSaved(videoKey(v.id)));

  if (videos.length === 0) return null;

  return (
    <div style={{ marginTop: 26, fontFamily: FONT }}>
      <div style={{ display: "flex", alignItems: "center", gap: 7, padding: "0 16px 10px" }}>
        <span style={{ fontSize: 15 }}>🎥</span>
        <span style={{ fontSize: 15, fontWeight: tokens.fontWeight.extrabold, color: NAVY }}>Videos</span>
        <span style={{ fontSize: 12, color: GRAY_LABEL, marginLeft: "auto" }}>
          {videos.length} videos
        </span>
      </div>

      <div style={{ padding: "0 16px 10px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: tokens.white,
            borderRadius: 8,
            padding: "9px 12px",
            boxShadow: CARD_SHADOW,
          }}
        >
          <IconSearch stroke={1.5} size={16} color={GRAY_BODY} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search junctions, Part 3, coaching, EV…"
            aria-label="Search videos"
            style={{
              flex: 1,
              border: "none",
              outline: "none",
              fontSize: 13.5,
              color: NAVY,
              fontFamily: FONT,
              background: "transparent",
            }}
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Clear search"
              style={{ border: "none", background: "transparent", cursor: "pointer", padding: 0 }}
            >
              <IconX stroke={1.5} size={15} color={GRAY_BODY} />
            </button>
          )}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          gap: 8,
          overflowX: "auto",
          padding: "0 16px 12px",
          scrollbarWidth: "none",
        }}
      >
        {(["All", "Saved", ...VIDEO_CATEGORIES] as Filter[]).map((c) => (
          <Chip
            key={c}
            label={c === "All" || c === "Saved" ? c : `${VIDEO_CATEGORY_EMOJI[c] ?? ""} ${c}`}
            active={filter === c}
            onClick={() => setFilter(c)}
          />
        ))}
      </div>

      {continueWatching.length > 0 && filter === "All" && !query && (
        <>
          <div style={{ padding: "4px 16px 8px", fontSize: 12.5, fontWeight: tokens.fontWeight.bold, color: GRAY_LABEL }}>
            Continue watching
          </div>
          <div style={{ display: "flex", gap: 12, overflowX: "auto", padding: "0 16px 14px" }}>
            {continueWatching.map((v) => (
              <VideoCard
                key={`cw-${v.id}`}
                v={v}
                wide
                saved={saved.includes(videoKey(v.id))}
                onPlay={() => open(v)}
                onSave={() => save(v)}
              />
            ))}
          </div>
        </>
      )}

      {featured.length > 0 && filter === "All" && !query && (
        <>
          <div style={{ padding: "4px 16px 8px", fontSize: 12.5, fontWeight: tokens.fontWeight.bold, color: GRAY_LABEL }}>
            ⭐ Featured videos
          </div>
          <div style={{ display: "flex", gap: 12, overflowX: "auto", padding: "0 16px 14px" }}>
            {featured.map((v) => (
              <VideoCard
                key={`f-${v.id}`}
                v={v}
                wide
                saved={saved.includes(videoKey(v.id))}
                onPlay={() => open(v)}
                onSave={() => save(v)}
              />
            ))}
          </div>
        </>
      )}

      <div style={{ display: "grid", gap: 12, padding: "0 16px" }}>
        {list.map((v) => (
          <VideoCard
            key={v.id}
            v={v}
            saved={saved.includes(videoKey(v.id))}
            onPlay={() => open(v)}
            onSave={() => save(v)}
          />
        ))}
        {list.length === 0 && (
          <div style={{ fontSize: tokens.fontSize.base, color: GRAY_BODY, padding: "8px 2px" }}>
            No videos match that yet.
          </div>
        )}
      </div>

      {playing && <VideoPlayerSheet video={playing} onClose={() => setPlaying(null)} />}
    </div>
  );
}

import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  IconChevronRight,
  IconDeviceTv,
  IconMicrophone,
  IconPlayerPlay,
  IconX,
} from "@tabler/icons-react";

import { supabase } from "@/lib/supabaseClient";
import { toast } from "@/lib/toast";
import { sanitizeNewsTitle } from "@/lib/newsText";
import { PODCAST_SHOWS, type PodcastEpisode } from "@/lib/podcasts";
import { getPodcastEpisodes } from "@/lib/podcasts.functions";

const POPPINS = { fontFamily: "Poppins, sans-serif" } as const;
const NAVY = "#0B2341";
const BLUE = "#2C97DE";
const MUTED = "#536579";
const LINE = "#E4E8EF";

export type MediaTabKey = "news" | "tv" | "podcasts" | "live";

interface MediaHubProps {
  onNavigate?: (to: string) => void;
}

/* ---------------------------------- utils --------------------------------- */

function timeAgo(iso: string | null | undefined): string {
  if (!iso) return "";
  const ms = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(ms)) return "";
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function formatDuration(secs: number | null): string {
  if (!secs || secs <= 0) return "";
  const m = Math.round(secs / 60);
  if (m < 60) return `${m} min`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}

function FilterPills({
  options,
  value,
  onChange,
}: {
  options: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        gap: 8,
        overflowX: "auto",
        padding: 12,
        scrollbarWidth: "none",
      }}
    >
      {options.map((opt) => {
        const active = opt === value;
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            style={{
              flexShrink: 0,
              border: `0.5px solid ${LINE}`,
              borderRadius: 20,
              padding: "5px 14px",
              fontSize: 11,
              fontWeight: 600,
              background: active ? NAVY : "#fff",
              color: active ? "#fff" : MUTED,
              cursor: "pointer",
              ...POPPINS,
            }}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div
      style={{
        padding: "32px 16px",
        textAlign: "center",
        color: MUTED,
        fontSize: 12,
        ...POPPINS,
      }}
    >
      {label}
    </div>
  );
}

/* --------------------------------- NEWS ---------------------------------- */

interface NewsRow {
  id: string;
  title: string | null;
  description: string | null;
  image_url: string | null;
  category: string | null;
  source: string | null;
  published_at: string | null;
  read_time_mins: number | null;
}

const NEWS_FILTERS = ["All", "Top Stories", "Latest", "Road Safety", "Motoring"];

function NewsTab({ onNavigate }: { onNavigate: (to: string) => void }) {
  const [rows, setRows] = useState<NewsRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("All");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("news_articles")
        .select(
          "id, title, description, image_url, category, source, published_at, read_time_mins",
        )
        .eq("is_hidden", false)
        .order("published_at", { ascending: false })
        .limit(20);
      if (cancelled) return;
      setRows((data ?? []) as NewsRow[]);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    if (filter === "All" || filter === "Top Stories" || filter === "Latest") return rows;
    const term = filter.toLowerCase();
    return rows.filter((r) => {
      const cat = (r.category ?? "").toLowerCase();
      if (term === "road safety") return cat.includes("road") || cat.includes("safety");
      return cat.includes("car") || cat.includes("ev") || cat.includes("motor");
    });
  }, [rows, filter]);

  const [hero, ...rest] = filtered;

  return (
    <div style={{ paddingBottom: 24 }}>
      <FilterPills options={NEWS_FILTERS} value={filter} onChange={setFilter} />

      {loading ? (
        <EmptyState label="Loading news…" />
      ) : !hero ? (
        <EmptyState label="No stories yet." />
      ) : (
        <>
          <div
            onClick={() => onNavigate(`/news/${hero.id}`)}
            style={{
              background: "#fff",
              borderRadius: 14,
              margin: "0 16px 12px",
              overflow: "hidden",
              cursor: "pointer",
            }}
          >
            <div style={{ width: "100%", height: 180, background: LINE }}>
              {hero.image_url ? (
                <img
                  src={hero.image_url}
                  alt=""
                  style={{ width: "100%", height: 180, objectFit: "cover", display: "block" }}
                />
              ) : null}
            </div>
            <div style={{ background: NAVY, padding: "12px 14px" }}>
              <span
                style={{
                  display: "inline-block",
                  background: BLUE,
                  color: "#fff",
                  fontSize: 9,
                  fontWeight: 700,
                  borderRadius: 4,
                  padding: "2px 7px",
                  marginBottom: 6,
                  textTransform: "uppercase",
                  ...POPPINS,
                }}
              >
                {hero.category ?? "News"}
              </span>
              <div
                style={{
                  color: "#fff",
                  fontSize: 16,
                  fontWeight: 700,
                  lineHeight: 1.3,
                  marginBottom: 6,
                  ...POPPINS,
                }}
              >
                {sanitizeNewsTitle(hero.title)}
              </div>
              <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 11, ...POPPINS }}>
                {timeAgo(hero.published_at)}
                {hero.read_time_mins ? ` · ${hero.read_time_mins} min read` : ""}
              </div>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 10,
              padding: "0 16px 16px",
            }}
          >
            {rest.map((a) => (
              <div
                key={a.id}
                onClick={() => onNavigate(`/news/${a.id}`)}
                style={{
                  background: "#fff",
                  borderRadius: 12,
                  border: `0.5px solid ${LINE}`,
                  overflow: "hidden",
                  cursor: "pointer",
                }}
              >
                <div style={{ width: "100%", height: 90, background: LINE }}>
                  {a.image_url ? (
                    <img
                      src={a.image_url}
                      alt=""
                      style={{ width: "100%", height: 90, objectFit: "cover", display: "block" }}
                    />
                  ) : null}
                </div>
                <div style={{ padding: "8px 10px" }}>
                  <div
                    style={{
                      color: BLUE,
                      fontSize: 9,
                      fontWeight: 700,
                      marginBottom: 4,
                      textTransform: "uppercase",
                      ...POPPINS,
                    }}
                  >
                    {a.category ?? "News"}
                  </div>
                  <div
                    style={{
                      color: NAVY,
                      fontSize: 12,
                      fontWeight: 600,
                      lineHeight: 1.3,
                      display: "-webkit-box",
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                      ...POPPINS,
                    }}
                  >
                    {sanitizeNewsTitle(a.title)}
                  </div>
                  <div style={{ color: MUTED, fontSize: 10, marginTop: 4, ...POPPINS }}>
                    {timeAgo(a.published_at)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/* ---------------------------------- TV ----------------------------------- */

interface VideoItem {
  id: string;
  title: string;
  description: string | null;
  video_url: string | null;
  embed_url: string | null;
  thumbnail_url: string | null;
  category: string | null;
  duration: string | null;
  source: "howto" | "bitesize";
}

const TV_FILTERS = [
  "All",
  "How To",
  "Bitesize",
  "Getting Started",
  "Training",
  "Business",
  "Wellbeing",
  "News",
  "CPD",
  "Showcase",
];

function PlayOverlay({ size = 48 }: { size?: number }) {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          background: "rgba(255,255,255,0.15)",
          border: "2px solid rgba(255,255,255,0.3)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <IconPlayerPlay size={size < 40 ? 14 : 20} color="#fff" fill="#fff" />
      </div>
    </div>
  );
}

function VideoModal({ video, onClose }: { video: VideoItem; onClose: () => void }) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.9)",
        zIndex: 200,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div style={{ display: "flex", justifyContent: "flex-end", padding: 16 }}>
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          style={{ background: "none", border: "none", cursor: "pointer", display: "flex" }}
        >
          <IconX size={24} color="#fff" />
        </button>
      </div>
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 16,
        }}
      >
        <div style={{ width: "100%" }}>
          {video.embed_url ? (
            <iframe
              src={video.embed_url}
              title={video.title}
              style={{ width: "100%", height: 220, border: "none", borderRadius: 8 }}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture"
              allowFullScreen
            />
          ) : video.video_url ? (
            <video
              src={video.video_url}
              controls
              playsInline
              style={{ width: "100%", borderRadius: 8, background: "#000" }}
            />
          ) : null}
          <div
            style={{
              color: "#fff",
              fontSize: 13,
              fontWeight: 600,
              marginTop: 12,
              ...POPPINS,
            }}
          >
            {video.title}
          </div>
        </div>
      </div>
    </div>
  );
}

function VideoCard({ video, onPlay }: { video: VideoItem; onPlay: (v: VideoItem) => void }) {
  return (
    <div
      onClick={() => onPlay(video)}
      style={{
        width: 150,
        flexShrink: 0,
        background: "#fff",
        borderRadius: 12,
        border: `0.5px solid ${LINE}`,
        overflow: "hidden",
        cursor: "pointer",
      }}
    >
      <div
        style={{
          position: "relative",
          height: 85,
          background: NAVY,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {video.thumbnail_url ? (
          <img
            src={video.thumbnail_url}
            alt=""
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          />
        ) : (
          <IconDeviceTv size={28} color="rgba(255,255,255,0.2)" />
        )}
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(0,0,0,0.2)",
          }}
        >
          <IconPlayerPlay size={18} color="#fff" fill="#fff" />
        </div>
        <span
          style={{
            position: "absolute",
            top: 5,
            left: 5,
            background: video.source === "bitesize" ? "#7B61FF" : BLUE,
            color: "#fff",
            fontSize: 8,
            fontWeight: 700,
            borderRadius: 3,
            padding: "1px 5px",
            ...POPPINS,
          }}
        >
          {video.source === "bitesize" ? "BITESIZE" : "HOW TO"}
        </span>
        {video.duration ? (
          <span
            style={{
              position: "absolute",
              bottom: 5,
              right: 5,
              background: "rgba(0,0,0,0.6)",
              color: "#fff",
              fontSize: 9,
              borderRadius: 3,
              padding: "1px 5px",
              ...POPPINS,
            }}
          >
            {video.duration}
          </span>
        ) : null}
      </div>
      <div
        style={{
          padding: "8px 8px 10px",
          fontSize: 11,
          fontWeight: 600,
          color: NAVY,
          lineHeight: 1.3,
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
          ...POPPINS,
        }}
      >
        {sanitizeNewsTitle(video.title)}
      </div>
    </div>
  );
}

function TvTab({ onNavigate: _onNavigate }: { onNavigate: (to: string) => void }) {
  const [allVideos, setAllVideos] = useState<VideoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("All");
  const [playing, setPlaying] = useState<VideoItem | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [howtoRes, bitesizeRes] = await Promise.all([
        supabase
          .from("howto_videos")
          .select(
            "id, title, description, video_url, video_embed_url, thumbnail_url, category, is_published, sort_order",
          )
          .eq("is_published", true)
          .order("sort_order", { ascending: true })
          .limit(50),
        supabase
          .from("bitesize_videos")
          .select(
            "id, title, description, video_url, thumbnail_url, category, is_published, duration_mins, created_at",
          )
          .eq("is_published", true)
          .is("deleted_at", null)
          .order("created_at", { ascending: false })
          .limit(50),
      ]);
      if (cancelled) return;

      const howto: VideoItem[] = ((howtoRes.data ?? []) as any[]).map((r) => ({
        id: String(r.id),
        title: r.title ?? "Untitled",
        description: r.description ?? null,
        video_url: r.video_url ?? null,
        embed_url: r.video_embed_url ?? null,
        thumbnail_url: r.thumbnail_url ?? null,
        category: r.category ?? null,
        duration: null,
        source: "howto" as const,
      }));

      const bitesize: VideoItem[] = ((bitesizeRes.data ?? []) as any[]).map((r) => ({
        id: String(r.id),
        title: r.title ?? "Untitled",
        description: r.description ?? null,
        video_url: r.video_url ?? null,
        embed_url: null,
        thumbnail_url: r.thumbnail_url ?? null,
        category: r.category ?? null,
        duration: r.duration_mins ? `${r.duration_mins} min` : null,
        source: "bitesize" as const,
      }));

      setAllVideos([...howto, ...bitesize]);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    if (filter === "All") return allVideos;
    if (filter === "How To") return allVideos.filter((v) => v.source === "howto");
    if (filter === "Bitesize") return allVideos.filter((v) => v.source === "bitesize");
    const term = filter.toLowerCase();
    return allVideos.filter((v) => (v.category ?? "").toLowerCase().includes(term));
  }, [allVideos, filter]);

  const featured = useMemo(
    () => filtered.find((v) => v.source === "howto") ?? filtered[0],
    [filtered],
  );

  const sections = useMemo(() => {
    const map = new Map<string, VideoItem[]>();
    for (const v of filtered) {
      if (featured && v.id === featured.id && v.source === featured.source) continue;
      const key = v.category?.trim() || "More videos";
      const list = map.get(key);
      if (list) list.push(v);
      else map.set(key, [v]);
    }
    return Array.from(map.entries());
  }, [filtered, featured]);

  function play(v: VideoItem) {
    if (!v.embed_url && !v.video_url) {
      toast.info("Video coming soon");
      return;
    }
    setPlaying(v);
  }

  return (
    <div style={{ paddingBottom: 24 }}>
      <FilterPills options={TV_FILTERS} value={filter} onChange={setFilter} />

      {loading ? (
        <EmptyState label="Loading PRO TV…" />
      ) : !featured ? (
        <EmptyState label="No videos yet." />
      ) : (
        <>
          <div
            onClick={() => play(featured)}
            style={{
              background: "#fff",
              borderRadius: 14,
              margin: "0 16px 12px",
              overflow: "hidden",
              cursor: "pointer",
            }}
          >
            <div
              style={{
                position: "relative",
                height: 180,
                background: NAVY,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {featured.thumbnail_url ? (
                <img
                  src={featured.thumbnail_url}
                  alt=""
                  style={{ width: "100%", height: 180, objectFit: "cover", display: "block" }}
                />
              ) : (
                <IconDeviceTv size={60} color="rgba(255,255,255,0.2)" />
              )}
              <PlayOverlay />
              <span
                style={{
                  position: "absolute",
                  top: 10,
                  left: 10,
                  background: featured.source === "bitesize" ? "#7B61FF" : BLUE,
                  color: "#fff",
                  fontSize: 9,
                  fontWeight: 700,
                  borderRadius: 4,
                  padding: "2px 7px",
                  textTransform: "uppercase",
                  ...POPPINS,
                }}
              >
                {featured.category ?? "PRO TV"}
              </span>
              <span
                style={{
                  position: "absolute",
                  bottom: 10,
                  right: 10,
                  background: "rgba(0,0,0,0.5)",
                  color: "#fff",
                  fontSize: 10,
                  borderRadius: 4,
                  padding: "2px 7px",
                  ...POPPINS,
                }}
              >
                {featured.duration ?? "Watch"}
              </span>
            </div>
            <div style={{ padding: "12px 14px" }}>
              <div style={{ color: NAVY, fontSize: 15, fontWeight: 700, ...POPPINS }}>
                {sanitizeNewsTitle(featured.title)}
              </div>
              {featured.description ? (
                <div
                  style={{
                    color: MUTED,
                    fontSize: 12,
                    marginTop: 4,
                    lineHeight: 1.4,
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                    ...POPPINS,
                  }}
                >
                  {featured.description}
                </div>
              ) : null}
            </div>
          </div>

          {sections.map(([category, videos]) => (
            <div key={category}>
              <div
                style={{
                  fontSize: 11,
                  color: MUTED,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: ".6px",
                  padding: "12px 16px 8px",
                  ...POPPINS,
                }}
              >
                {category}
              </div>
              <div
                style={{
                  display: "flex",
                  gap: 10,
                  padding: "0 16px 12px",
                  overflowX: "auto",
                  scrollbarWidth: "none",
                }}
              >
                {videos.map((v) => (
                  <VideoCard key={`${v.source}-${v.id}`} video={v} onPlay={play} />
                ))}
              </div>
            </div>
          ))}
        </>
      )}

      {playing ? <VideoModal video={playing} onClose={() => setPlaying(null)} /> : null}
    </div>
  );
}

/* -------------------------------- PODCASTS -------------------------------- */

const PODCAST_FILTERS = ["All", "Featured", "Driving Tips", "Road Stories", "Interviews", "Interesting"];

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 11,
        color: MUTED,
        textTransform: "uppercase",
        letterSpacing: ".6px",
        fontWeight: 600,
        padding: "0 16px 8px",
        ...POPPINS,
      }}
    >
      {children}
    </div>
  );
}

function Artwork({
  src,
  size,
  radius,
}: {
  src: string | null | undefined;
  size: number;
  radius: number;
}) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        background: "#EAF5FC",
        flexShrink: 0,
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {src ? (
        <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      ) : (
        <IconMicrophone size={size / 2.4} color={BLUE} />
      )}
    </div>
  );
}

function PodcastsTab() {
  const loadEpisodes = useServerFn(getPodcastEpisodes);
  const [episodes, setEpisodes] = useState<PodcastEpisode[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("All");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const eps = await loadEpisodes();
        if (!cancelled) setEpisodes(eps ?? []);
      } catch {
        if (!cancelled) setEpisodes([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    if (filter === "All") return episodes.filter((e) => e.showInteresting !== true);
    if (filter === "Interesting") return episodes.filter((e) => e.showInteresting === true);
    if (filter === "Featured") {
      return episodes.filter((e) => e.showFeatured && e.showInteresting !== true);
    }
    const term = filter.toLowerCase();
    return episodes.filter(
      (e) =>
        e.showInteresting !== true &&
        e.showCategories.some((c) => c.toLowerCase().includes(term.split(" ")[0] ?? term)),
    );
  }, [episodes, filter]);

  const featured = useMemo(() => {
    if (filter === "Interesting") {
      return filtered.find((e) => e.showInteresting === true) ?? filtered[0];
    }
    return filtered.find((e) => e.showInteresting !== true && e.showFeatured) ?? filtered[0];
  }, [filtered, filter]);

  const latest = filtered.filter((e) => e.id !== featured?.id).slice(0, 8);

  const shows = useMemo(() => {
    if (filter === "Interesting") return PODCAST_SHOWS.filter((s) => s.interesting === true);
    return PODCAST_SHOWS.filter((s) => s.interesting !== true);
  }, [filter]);

  const open = (url: string | null | undefined) => {
    if (url) window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div style={{ paddingBottom: 24 }}>
      <FilterPills options={PODCAST_FILTERS} value={filter} onChange={setFilter} />

      {loading ? (
        <EmptyState label="Loading podcasts…" />
      ) : (
        <>
          {featured ? (
            <div
              onClick={() => open(featured.link ?? featured.audioUrl)}
              style={{
                background: "#fff",
                borderRadius: 14,
                margin: "0 16px 12px",
                overflow: "hidden",
                padding: "12px 14px",
                display: "flex",
                gap: 12,
                cursor: "pointer",
              }}
            >
              <Artwork src={featured.imageUrl} size={80} radius={10} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <span
                  style={{
                    display: "inline-block",
                    background: BLUE,
                    color: "#fff",
                    fontSize: 9,
                    fontWeight: 700,
                    borderRadius: 4,
                    padding: "2px 7px",
                    marginBottom: 6,
                    ...POPPINS,
                  }}
                >
                  NEW EPISODE
                </span>
                <div style={{ color: NAVY, fontSize: 14, fontWeight: 700, ...POPPINS }}>
                  {featured.title}
                </div>
                <div
                  style={{
                    color: MUTED,
                    fontSize: 12,
                    marginTop: 4,
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                    ...POPPINS,
                  }}
                >
                  {featured.description}
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginTop: 8,
                  }}
                >
                  <span style={{ color: MUTED, fontSize: 11, ...POPPINS }}>
                    {formatDuration(featured.durationSecs) || featured.showName}
                  </span>
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: "50%",
                      background: NAVY,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <IconPlayerPlay size={14} color="#fff" fill="#fff" />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <EmptyState label="No episodes yet." />
          )}

          {latest.length > 0 ? (
            <>
              <SectionLabel>Latest episodes</SectionLabel>
              {latest.map((ep) => (
                <div
                  key={ep.id}
                  onClick={() => open(ep.link ?? ep.audioUrl)}
                  style={{
                    background: "#fff",
                    padding: "12px 14px",
                    display: "flex",
                    gap: 10,
                    alignItems: "center",
                    margin: "0 16px 8px",
                    borderRadius: 12,
                    cursor: "pointer",
                  }}
                >
                  <Artwork src={ep.imageUrl} size={52} radius={8} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: MUTED, fontSize: 10, ...POPPINS }}>{ep.showName}</div>
                    <div
                      style={{
                        color: NAVY,
                        fontSize: 13,
                        fontWeight: 700,
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                        ...POPPINS,
                      }}
                    >
                      {ep.title}
                    </div>
                    <div style={{ color: MUTED, fontSize: 11, ...POPPINS }}>
                      {formatDuration(ep.durationSecs) || timeAgo(ep.pubDate)}
                    </div>
                  </div>
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: "50%",
                      background: NAVY,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <IconPlayerPlay size={14} color="#fff" fill="#fff" />
                  </div>
                </div>
              ))}
            </>
          ) : null}

          <div style={{ height: 8 }} />
          <SectionLabel>Popular shows</SectionLabel>
          {shows.map((s) => {
            const count = episodes.filter((e) => e.showId === s.id).length;
            return (
              <div
                key={s.id}
                onClick={() => open(s.siteUrl)}
                style={{
                  background: "#fff",
                  padding: "12px 14px",
                  display: "flex",
                  gap: 12,
                  alignItems: "center",
                  margin: "0 16px 8px",
                  borderRadius: 12,
                  cursor: "pointer",
                }}
              >
                <Artwork src={s.artworkUrl} size={52} radius={8} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: NAVY, fontSize: 13, fontWeight: 700, ...POPPINS }}>
                    {s.name}
                  </div>
                  <div
                    style={{
                      color: MUTED,
                      fontSize: 11,
                      marginTop: 2,
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                      ...POPPINS,
                    }}
                  >
                    {s.recommendedNote ?? s.categories.join(" · ")}
                  </div>
                  {count > 0 ? (
                    <div style={{ color: MUTED, fontSize: 10, marginTop: 2, ...POPPINS }}>
                      {count} episode{count === 1 ? "" : "s"}
                    </div>
                  ) : null}
                </div>
                <IconChevronRight size={18} color="#D1D5DB" />
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}

/* --------------------------------- LIVE ---------------------------------- */

interface LiveRow {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  host_name: string | null;
  session_date: string;
  session_time: string;
  duration_minutes: number | null;
  max_spaces: number | null;
  spaces_taken: number | null;
  price_display: string | null;
  image_url: string | null;
  is_live: boolean | null;
}

const LIVE_FILTERS = [
  "All",
  "Standards Check",
  "Business Coaching",
  "CPD Webinar",
  "New ADI",
  "Q&A",
];

function liveDateLabel(dateStr: string, timeStr: string): string {
  try {
    const d = new Date(`${dateStr}T00:00:00`);
    const day = d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
    const [h, m] = (timeStr ?? "").split(":");
    const t = new Date();
    t.setHours(Number(h), Number(m), 0, 0);
    const time = t.toLocaleTimeString("en-GB", { hour: "numeric", minute: "2-digit", hour12: true });
    return `${day} · ${time}`;
  } catch {
    return dateStr;
  }
}

function LiveTab({ onNavigate }: { onNavigate: (to: string) => void }) {
  const [rows, setRows] = useState<LiveRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("All");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const today = new Date().toISOString().slice(0, 10);
      const { data } = await supabase
        .from("dsm_live_sessions")
        .select(
          "id, title, description, category, host_name, session_date, session_time, duration_minutes, max_spaces, spaces_taken, price_display, image_url, is_live",
        )
        .is("deleted_at", null)
        .gte("session_date", today)
        .order("session_date", { ascending: true })
        .order("session_time", { ascending: true })
        .limit(20);
      if (cancelled) return;
      setRows((data ?? []) as LiveRow[]);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(
    () => (filter === "All" ? rows : rows.filter((r) => (r.category ?? "") === filter)),
    [rows, filter],
  );

  const [hero, ...rest] = filtered;

  return (
    <div style={{ paddingBottom: 24 }}>
      <FilterPills options={LIVE_FILTERS} value={filter} onChange={setFilter} />

      {loading ? (
        <EmptyState label="Loading sessions…" />
      ) : !hero ? (
        <EmptyState label="No live sessions scheduled." />
      ) : (
        <>
          <div
            onClick={() => onNavigate(`/dsm-live/${hero.id}`)}
            style={{
              background: "#fff",
              borderRadius: 14,
              margin: "0 16px 12px",
              overflow: "hidden",
              cursor: "pointer",
            }}
          >
            <div
              style={{
                width: "100%",
                height: 180,
                background: LINE,
                position: "relative",
              }}
            >
              {hero.image_url ? (
                <img
                  src={hero.image_url}
                  alt=""
                  style={{ width: "100%", height: 180, objectFit: "cover", display: "block" }}
                />
              ) : null}
              {hero.is_live ? (
                <span
                  style={{
                    position: "absolute",
                    top: 12,
                    left: 12,
                    background: "rgba(229,57,53,0.92)",
                    color: "#fff",
                    fontSize: 9,
                    fontWeight: 700,
                    borderRadius: 4,
                    padding: "3px 8px",
                    ...POPPINS,
                  }}
                >
                  LIVE NOW
                </span>
              ) : null}
            </div>
            <div style={{ background: NAVY, padding: "12px 14px" }}>
              <span
                style={{
                  display: "inline-block",
                  background: BLUE,
                  color: "#fff",
                  fontSize: 9,
                  fontWeight: 700,
                  borderRadius: 4,
                  padding: "2px 7px",
                  marginBottom: 6,
                  textTransform: "uppercase",
                  ...POPPINS,
                }}
              >
                {hero.category ?? "Live session"}
              </span>
              <div
                style={{
                  color: "#fff",
                  fontSize: 16,
                  fontWeight: 700,
                  lineHeight: 1.3,
                  marginBottom: 6,
                  ...POPPINS,
                }}
              >
                {hero.title}
              </div>
              <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 11, ...POPPINS }}>
                {liveDateLabel(hero.session_date, hero.session_time)}
                {hero.host_name ? ` · ${hero.host_name}` : ""}
              </div>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 10,
              padding: "0 16px 16px",
            }}
          >
            {rest.map((s) => (
              <div
                key={s.id}
                onClick={() => onNavigate(`/dsm-live/${s.id}`)}
                style={{
                  background: "#fff",
                  borderRadius: 12,
                  border: `0.5px solid ${LINE}`,
                  overflow: "hidden",
                  cursor: "pointer",
                }}
              >
                <div style={{ width: "100%", height: 90, background: LINE, position: "relative" }}>
                  {s.image_url ? (
                    <img
                      src={s.image_url}
                      alt=""
                      style={{ width: "100%", height: 90, objectFit: "cover", display: "block" }}
                    />
                  ) : null}
                </div>
                <div style={{ padding: "8px 10px" }}>
                  <div
                    style={{
                      color: BLUE,
                      fontSize: 9,
                      fontWeight: 700,
                      marginBottom: 4,
                      textTransform: "uppercase",
                      ...POPPINS,
                    }}
                  >
                    {s.category ?? "Live session"}
                  </div>
                  <div
                    style={{
                      color: NAVY,
                      fontSize: 12,
                      fontWeight: 600,
                      lineHeight: 1.3,
                      display: "-webkit-box",
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                      ...POPPINS,
                    }}
                  >
                    {s.title}
                  </div>
                  <div style={{ color: MUTED, fontSize: 10, marginTop: 4, ...POPPINS }}>
                    {liveDateLabel(s.session_date, s.session_time)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/* -------------------------------- MediaHub -------------------------------- */

const TABS: { key: MediaTabKey; label: string }[] = [
  { key: "news", label: "NEWS" },
  { key: "tv", label: "PRO TV" },
  { key: "podcasts", label: "PODCASTS" },
  { key: "live", label: "LIVE" },
];


export function MediaHub({ onNavigate }: MediaHubProps) {
  const [activeTab, setActiveTab] = useState<MediaTabKey>("news");
  const go = (to: string) => onNavigate?.(to);

  return (
    <div
      style={{
        minHeight: "100%",
        display: "flex",
        flexDirection: "column",
        background: "#F4F6F8",
        ...POPPINS,
      }}
    >
      <div
        style={{
          background: NAVY,
          paddingTop:
            "calc(var(--dsm-safe-top, env(safe-area-inset-top, 0px)) + 44px)",
          paddingLeft: 16,
          paddingRight: 16,
          paddingBottom: 0,
          position: "sticky",
          top: 0,
          zIndex: 5,
        }}
      >
        <div
          style={{
            display: "flex",
            gap: 0,
            borderBottom: "1px solid rgba(255,255,255,0.1)",
          }}
        >
          {TABS.map((t) => {
            const active = activeTab === t.key;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setActiveTab(t.key)}
                style={{
                  background: "transparent",
                  border: "none",
                  borderBottom: `2px solid ${active ? BLUE : "transparent"}`,
                  color: active ? "#fff" : "rgba(255,255,255,0.5)",
                  fontWeight: active ? 700 : 500,
                  fontSize: 13,
                  padding: "10px 16px",
                  cursor: "pointer",
                  ...POPPINS,
                }}
              >
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      <div
        style={{
          background: "#F4F6F8",
          flex: 1,
          overflowY: "auto",
          paddingBottom: "calc(90px + env(safe-area-inset-bottom, 0px))",
        }}
      >
        {activeTab === "news" ? <NewsTab onNavigate={go} /> : null}
        {activeTab === "tv" ? <TvTab onNavigate={go} /> : null}
        {activeTab === "podcasts" ? <PodcastsTab /> : null}
        {activeTab === "live" ? <LiveTab onNavigate={go} /> : null}
      </div>
    </div>
  );
}

export default MediaHub;

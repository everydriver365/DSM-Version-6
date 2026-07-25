import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ChevronRight, Star, TrendingUp, Play, ShoppingBag, Award, CalendarOff, Zap, X, Download, Check } from "lucide-react";
import { IconPlayerPlay } from "@tabler/icons-react";
import { toast } from "sonner";
import { PageLayout } from "@/components/PageLayout";
import InstructorTopBar from "@/components/dsm/InstructorTopBar";

export const Route = createFileRoute("/learn")({
  head: () => ({
    meta: [
      { title: "Learn — DSM" },
      { name: "description", content: "Quick guides and how-to videos to help you get more out of DSM." },
      { property: "og:title", content: "Learn — DSM" },
      { property: "og:description", content: "Quick guides and how-to videos to help you get more out of DSM." },
    ],
  }),
  component: LearnPage,
});

const NAVY = "#0B1F3A";
const BLUE = "#1877D6";
const CANVAS = "#EEF2F7";
const CARD_SHADOW = "0 1px 3px rgba(0,0,0,0.06)";
const GRAY_BODY = "#6B7A90";
const GRAY_LABEL = "#5F6B7A";
const GRAY_SUBTITLE = "#8A94A3";
const FONT = "Poppins, sans-serif";

type Video = { id?: string; title: string; duration: string; url: string | null };

type Guide = { icon: any; title: string; description: string; route: string };

const GROUPS: { heading: string; items: Guide[] }[] = [
  {
    heading: "Grow your business",
    items: [
      { icon: ShoppingBag, title: "Marketplace", description: "Sell courses, resources and services to other ADIs.", route: "/marketplace" },
      { icon: Award, title: "Accreditations", description: "Show pupils the qualifications you've earned.", route: "/certifications" },
    ],
  },
  {
    heading: "Organize your day",
    items: [
      { icon: CalendarOff, title: "Gap Filler", description: "Find pupils to book into empty slots automatically.", route: "/gaps" },
      { icon: Zap, title: "Auto-booking", description: "Let pupils book themselves into your free time.", route: "/availability" },
    ],
  },
];

function getYouTubeEmbedUrl(url: string): string | null {
  const match = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
  );
  return match ? `https://www.youtube.com/embed/${match[1]}?autoplay=1` : null;
}

const LEARN_VIDEO_CACHE = "dsm-learn-videos-v1";

async function isVideoCached(url: string): Promise<boolean> {
  if (typeof window === "undefined" || !("caches" in window)) return false;
  try {
    const cache = await caches.open(LEARN_VIDEO_CACHE);
    const match = await cache.match(url);
    return !!match;
  } catch {
    return false;
  }
}

async function downloadVideoForOffline(url: string): Promise<void> {
  if (typeof window === "undefined" || !("caches" in window)) return;
  const cache = await caches.open(LEARN_VIDEO_CACHE);
  await cache.add(url);
}

async function getCachedObjectUrl(url: string): Promise<string | null> {
  if (typeof window === "undefined" || !("caches" in window)) return null;
  try {
    const cache = await caches.open(LEARN_VIDEO_CACHE);
    const match = await cache.match(url);
    if (!match) return null;
    const blob = await match.blob();
    return URL.createObjectURL(blob);
  } catch {
    return null;
  }
}

function VideoCard({ v, color, onPlay }: { v: Video; color: string; onPlay: () => void }) {
  const downloadable = !!v.url && !getYouTubeEmbedUrl(v.url);
  const [cached, setCached] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!downloadable || !v.url) return;
    isVideoCached(v.url).then((r) => {
      if (!cancelled) setCached(r);
    });
    return () => {
      cancelled = true;
    };
  }, [v.url, downloadable]);

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!v.url || cached || downloading) return;
    setDownloading(true);
    try {
      await downloadVideoForOffline(v.url);
      setCached(true);
      toast.success("Available offline");
    } catch {
      toast.error("Couldn't download this video");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onPlay}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onPlay();
      }}
      style={{
        background: "transparent",
        border: "none",
        padding: 0,
        cursor: "pointer",
        textAlign: "left",
        fontFamily: FONT,
      }}
    >

      <div
        style={{
          position: "relative",
          width: "100%",
          aspectRatio: "1 / 1",
          borderRadius: 14,
          overflow: "hidden",
          background: color,
          boxShadow: CARD_SHADOW,
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: "50%",
              background: "white",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Play size={18} color={NAVY} fill={NAVY} style={{ marginLeft: 2 }} />
          </div>
        </div>
        <div
          style={{
            position: "absolute",
            bottom: 8,
            right: 8,
            padding: "4px 8px",
            borderRadius: 999,
            background: "rgba(0,0,0,0.55)",
            color: "white",
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: 0.2,
          }}
        >
          {v.duration}
        </div>
        {downloadable && (
          <button
            type="button"
            onClick={handleDownload}
            aria-label={cached ? "Available offline" : "Download for offline"}
            style={{
              position: "absolute",
              top: 8,
              right: 8,
              width: 28,
              height: 28,
              borderRadius: "50%",
              border: "none",
              background: cached ? "#1E8E3E" : "rgba(0,0,0,0.55)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: cached ? "default" : "pointer",
              opacity: downloading ? 0.6 : 1,
            }}
          >
            {cached ? (
              <Check size={15} color="#FFFFFF" strokeWidth={3} />
            ) : (
              <Download size={15} color="#FFFFFF" />
            )}
          </button>
        )}
      </div>
      <div
        style={{
          marginTop: 8,
          fontSize: 13,
          fontWeight: 600,
          color: NAVY,
          lineHeight: 1.3,
        }}
      >
        {v.title}
      </div>
    </div>

  );
}

function SectionLabel({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "0 16px 12px",
      }}
    >
      {icon}
      <span
        style={{
          fontSize: 12,
          fontWeight: 600,
          color: GRAY_LABEL,
          fontFamily: FONT,
        }}
      >
        {label}
      </span>
    </div>
  );
}

function ArticleRow({ onGo, isLast }: { onGo: () => void; isLast: boolean }) {
  return (
    <button
      type="button"
      onClick={onGo}
      style={{
        width: "100%",
        background: "white",
        border: "none",
        padding: "12px 14px",
        display: "flex",
        alignItems: "center",
        gap: 12,
        cursor: "pointer",
        textAlign: "left",
        fontFamily: FONT,
        borderBottom: isLast ? "none" : "1px solid #F0F3F7",
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          background: "#E6F1FB",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <Star size={17} color={BLUE} fill={BLUE} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: NAVY, lineHeight: 1.3 }}>
          Get more 5 star reviews
        </div>
        <div style={{ fontSize: 12, color: GRAY_SUBTITLE, lineHeight: 1.35, marginTop: 1 }}>
          2 min read
        </div>
      </div>
      <ChevronRight size={18} color={GRAY_SUBTITLE} />
    </button>
  );
}

function GuideRow({ g, onGo, isLast }: { g: Guide; onGo: () => void; isLast: boolean }) {
  const Icon = g.icon;
  return (
    <button
      type="button"
      onClick={onGo}
      style={{
        width: "100%",
        background: "white",
        border: "none",
        padding: "12px 14px",
        display: "flex",
        alignItems: "center",
        gap: 12,
        cursor: "pointer",
        textAlign: "left",
        fontFamily: FONT,
        borderBottom: isLast ? "none" : "1px solid #F0F3F7",
      }}
    >
      <div
        style={{
          width: 34,
          height: 34,
          borderRadius: 10,
          background: "#E5EFFA",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <Icon size={17} color={BLUE} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: NAVY, lineHeight: 1.3 }}>
          {g.title}
        </div>
        <div style={{ fontSize: 12.5, color: GRAY_BODY, lineHeight: 1.35, marginTop: 1 }}>
          {g.description}
        </div>
      </div>
      <ChevronRight size={18} color={GRAY_SUBTITLE} />
    </button>
  );
}

function LearnPage() {
  const navigate = useNavigate();
  const [playing, setPlaying] = useState<Video | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("learn_videos")
        .select("id, title, duration, url")
        .order("sort_order", { ascending: true });
      if (!cancelled && !error && data) setVideos(data as Video[]);
    })();
    return () => {
      cancelled = true;
    };
  }, []);



  return (
    <PageLayout className="pb-24" style={{ fontFamily: FONT, background: CANVAS }}>
      <InstructorTopBar
        firstName=""
        pageTitle="Learn"
        onBack={() => navigate({ to: "/more" as never })}
        onBell={() => navigate({ to: "/notifications" as never })}
        onPhone={() => navigate({ to: "/enquiries" as never })}
        onLiveTrack={() => navigate({ to: "/live" as never })}
        onMenu={() => navigate({ to: "/more" as never })}
        onMicPress={() => toast.info("Voice commands coming soon!")}
      />
      <div style={{ height: "calc(60px + env(safe-area-inset-top, 0px))" }} />

      <div style={{ padding: "8px 16px 4px" }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: NAVY, margin: 0, lineHeight: 1.15 }}>
          Learn
        </h1>
        <p style={{ fontSize: 14, color: GRAY_BODY, margin: "4px 0 0" }}>
          Quick guides to get more out of DSM.
        </p>
      </div>

      <div style={{ marginTop: 20 }}>
        <SectionLabel
          icon={<IconPlayerPlay size={14} color={BLUE} />}
          label="How to"
        />
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 12,
            padding: "0 16px",
          }}
        >
          {videos.map((v, i) => (
            <VideoCard
              key={v.id ?? i}
              v={v}
              color={i % 2 === 0 ? NAVY : BLUE}
              onPlay={() => {
                if (v.url) setPlaying(v);
                else toast.info("Video coming soon");
              }}
            />
          ))}
        </div>
      </div>

      <div style={{ marginTop: 24 }}>
        <SectionLabel
          icon={<TrendingUp size={14} color={BLUE} />}
          label="Grow your business"
        />
        <div
          style={{
            margin: "0 16px",
            background: "white",
            borderRadius: 14,
            boxShadow: CARD_SHADOW,
            overflow: "hidden",
          }}
        >
          <ArticleRow
            onGo={() => navigate({ to: "/reviews" as never })}
            isLast={false}
          />
          {GROUPS[0].items.map((g, i) => (
            <GuideRow
              key={g.title}
              g={g}
              onGo={() => navigate({ to: g.route as never })}
              isLast={i === GROUPS[0].items.length - 1}
            />
          ))}
        </div>
      </div>

      {GROUPS.slice(1).map((group) => (
        <div key={group.heading} style={{ marginTop: 24 }}>
          <SectionLabel
            icon={<IconPlayerPlay size={14} color={BLUE} />}
            label={group.heading}
          />
          <div
            style={{
              margin: "0 16px",
              background: "white",
              borderRadius: 14,
              boxShadow: CARD_SHADOW,
              overflow: "hidden",
            }}
          >
            {group.items.map((g, i) => (
              <GuideRow
                key={g.title}
                g={g}
                onGo={() => navigate({ to: g.route as never })}
                isLast={i === group.items.length - 1}
              />
            ))}
          </div>
        </div>
      ))}

      {playing && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 2000,
            background: "rgba(0,0,0,0.94)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          onClick={() => setPlaying(null)}
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setPlaying(null);
            }}
            aria-label="Close video"
            style={{
              position: "absolute",
              top: "calc(16px + env(safe-area-inset-top, 0px))",
              right: 16,
              width: 36,
              height: 36,
              borderRadius: "50%",
              border: "none",
              background: "rgba(255,255,255,0.18)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
          >
            <X size={20} color="#FFFFFF" />
          </button>
          {(() => {
            const embed = playing.url ? getYouTubeEmbedUrl(playing.url) : null;
            if (embed) {
              return (
                <iframe
                  src={embed}
                  title={playing.title ?? "Video"}
                  allow="autoplay; encrypted-media"
                  allowFullScreen
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    width: "100%",
                    maxHeight: "80vh",
                    aspectRatio: "16 / 9",
                    border: "none",
                    background: "#000",
                  }}
                />
              );
            }
            return (
              <video
                src={playbackSrc ?? playing.url ?? undefined}

                controls
                autoPlay
                playsInline
                onClick={(e) => e.stopPropagation()}
                style={{ width: "100%", maxHeight: "80vh", background: "#000" }}
              />
            );
          })()}

        </div>
      )}
    </PageLayout>
  );
}

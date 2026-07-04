import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Play, Music } from "lucide-react";

const SUPABASE_URL = "https://bjpqxfrihwjcqprmoqfs.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJqcHF4ZnJpaHdqY3Fwcm1vcWZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0NzQ4MjEsImV4cCI6MjA5NzA1MDgyMX0.HKlgx3dxP3uxX9wMRRUnfb0IPwaBpFcut_iUgT5XFeo";

type Podcast = {
  id: string;
  episode_number: number | null;
  title: string;
  description: string | null;
  guest_name: string | null;
  guest_title: string | null;
  duration_minutes: number | null;
  category: string | null;
  audio_url: string | null;
  spotify_url: string | null;
  apple_url: string | null;
  image_url: string | null;
  tags: string[] | null;
  published_at: string | null;
};

export const Route = createFileRoute("/dsm-live/podcast/$podcastId")({
  component: PodcastDetailPage,
});

function authHeaders() {
  return {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  };
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "Date not set";
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-GB", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function PodcastDetailPage() {
  const navigate = useNavigate();
  const { podcastId } = Route.useParams();
  const [podcast, setPodcast] = useState<Podcast | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `${SUPABASE_URL}/rest/v1/dsm_podcasts?id=eq.${podcastId}&is_published=eq.true&deleted_at=is.null`,
          { headers: authHeaders() },
        );
        const rows = (await res.json()) as Podcast[];
        if (!cancelled) setPodcast(rows?.[0] ?? null);
      } catch {
        if (!cancelled) setPodcast(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [podcastId]);

  const openUrl = (url: string | null) => {
    if (!url) return;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  if (!podcast) {
    return (
      <div style={{ background: "#fff", minHeight: "calc(100vh - 80px)", padding: 24, color: "#6B7280" }}>
        Loading…
      </div>
    );
  }

  const hasAnyLink = podcast.spotify_url || podcast.apple_url || podcast.audio_url;

  return (
    <div style={{ background: "#fff", minHeight: "calc(100vh - 80px)" }}>
      <div
        style={{
          background: "#0F2044",
          color: "#fff",
          padding: "12px 16px",
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <button
          type="button"
          onClick={() => navigate({ to: "/dsm-live" })}
          style={{ background: "transparent", border: 0, color: "#fff", padding: 4, cursor: "pointer" }}
          aria-label="Back"
        >
          <ArrowLeft size={22} />
        </button>
        <div
          style={{
            fontWeight: 700,
            fontSize: 15,
            flex: 1,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {podcast.title}
        </div>
      </div>

      <div
        style={{
          background: "linear-gradient(135deg, #7C3AED, #0F2044)",
          color: "#fff",
          padding: "24px 16px",
        }}
      >
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            background: "rgba(255,255,255,0.92)",
            color: "#7C3AED",
            fontSize: 10,
            fontWeight: 800,
            padding: "4px 8px",
            borderRadius: 4,
            textTransform: "uppercase",
            letterSpacing: "0.04em",
          }}
        >
          <Music size={12} /> Podcast
        </div>
        <div style={{ fontWeight: 900, fontSize: 20, marginTop: 12 }}>{podcast.title}</div>
        {podcast.guest_name && (
          <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 14, marginTop: 2 }}>
            with {podcast.guest_name}
            {podcast.guest_title ? ` · ${podcast.guest_title}` : ""}
          </div>
        )}
        <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 13, marginTop: 8 }}>
          {formatDate(podcast.published_at)}
          {podcast.duration_minutes ? ` · ${podcast.duration_minutes} mins` : ""}
        </div>
      </div>

      <div style={{ padding: 16 }}>
        {podcast.image_url && (
          <div
            style={{
              width: "100%",
              aspectRatio: "16 / 9",
              borderRadius: 14,
              overflow: "hidden",
              background: `url(${podcast.image_url}) center/cover no-repeat`,
              marginBottom: 16,
            }}
          />
        )}

        {podcast.description && (
          <div
            style={{
              background: "#fff",
              border: "0.5px solid #E2E6ED",
              borderRadius: 12,
              padding: 16,
              marginBottom: 12,
            }}
          >
            <div style={{ fontWeight: 700, fontSize: 15, color: "#0F2044", marginBottom: 10 }}>
              About this episode
            </div>
            <div style={{ fontSize: 14, color: "#374151", whiteSpace: "pre-wrap", lineHeight: 1.5 }}>
              {podcast.description}
            </div>
            {podcast.tags && podcast.tags.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
                {podcast.tags.map((t) => (
                  <span
                    key={t}
                    style={{
                      background: "#F1F5F9",
                      color: "#0F2044",
                      fontSize: 11,
                      padding: "3px 8px",
                      borderRadius: 999,
                    }}
                  >
                    {t}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        <div
          style={{
            background: "#fff",
            border: "0.5px solid #E2E6ED",
            borderRadius: 12,
            padding: 16,
            fontSize: 13,
            color: "#374151",
            display: "grid",
            gap: 8,
            marginBottom: 12,
          }}
        >
          <div>🎙️ Type: Podcast</div>
          <div>📅 Published: {formatDate(podcast.published_at)}</div>
          {podcast.duration_minutes && <div>⏱ Duration: {podcast.duration_minutes} minutes</div>}
          {podcast.episode_number != null && <div>🔢 Episode: {podcast.episode_number}</div>}
          {podcast.category && <div>🏷 Category: {podcast.category}</div>}
        </div>

        {hasAnyLink && (
          <div
            style={{
              background: "#F7FAFC",
              border: "0.5px solid #E2E6ED",
              borderRadius: 12,
              padding: 16,
            }}
          >
            <div style={{ fontWeight: 700, fontSize: 15, color: "#0F2044", marginBottom: 12 }}>
              Listen now
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {podcast.spotify_url && (
                <button
                  type="button"
                  onClick={() => openUrl(podcast.spotify_url)}
                  style={{
                    background: "#1DB954",
                    color: "#fff",
                    fontSize: 13,
                    fontWeight: 600,
                    borderRadius: 8,
                    padding: "10px 14px",
                    border: 0,
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  🎵 Spotify
                </button>
              )}
              {podcast.apple_url && (
                <button
                  type="button"
                  onClick={() => openUrl(podcast.apple_url)}
                  style={{
                    background: "#FC3C44",
                    color: "#fff",
                    fontSize: 13,
                    fontWeight: 600,
                    borderRadius: 8,
                    padding: "10px 14px",
                    border: 0,
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  🎧 Apple
                </button>
              )}
              {podcast.audio_url && (
                <button
                  type="button"
                  onClick={() => openUrl(podcast.audio_url)}
                  style={{
                    background: "#CC2229",
                    color: "#fff",
                    fontSize: 13,
                    fontWeight: 600,
                    borderRadius: 8,
                    padding: "10px 14px",
                    border: 0,
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <Play size={14} /> Play now
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  IconBroadcast,
  IconChevronRight,
  IconClock,
  IconMicrophone,
  IconNews,
  IconPlayerPlayFilled,
  IconPlayerPauseFilled,
  IconPlayerTrackNextFilled,
  IconSearch,
  IconX,

} from "@tabler/icons-react";
import InstructorTopBar from "@/components/dsm/InstructorTopBar";
import { supabase } from "@/lib/supabaseClient";
import { formatSessionDate, formatSessionTime, type LiveSession } from "./dsm-live";
import { sanitizeNewsTitle } from "@/lib/newsText";
import {
  getPodcastEpisodes,
  getPodcastTranscript,
  type PodcastEpisode,
} from "@/lib/podcasts.functions";
import { PODCAST_SHOWS } from "@/lib/podcasts";

export const Route = createFileRoute("/live-news")({
  component: LiveNewsPage,
});

const POPPINS = { fontFamily: "Poppins, sans-serif" } as const;

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function formatSessionDay(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric" });
}

function formatSessionMonth(iso: string | null | undefined): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-GB", { month: "short" });
}

function LiveNewsPage() {
  const navigate = useNavigate();
  const canGoBack = typeof window !== "undefined" && window.history.length > 1;
  function goBack(fallback: string) {
    if (canGoBack) {
      navigate({ to: -1 as any });
    } else {
      navigate({ to: fallback as never });
    }
  }
  const [activeTab, setActiveTab] = useState<"live" | "news" | "podcasts">("live");
  const [sessions, setSessions] = useState<LiveSession[] | null>(null);
  const [articles, setArticles] = useState<any[] | null>(null);
  const [episodes, setEpisodes] = useState<PodcastEpisode[] | null>(null);
  const [selectedEpisode, setSelectedEpisode] = useState<PodcastEpisode | null>(null);
  const [playing, setPlaying] = useState<PodcastEpisode | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [showFilter, setShowFilter] = useState<string>("all");
  const [podcastQuery, setPodcastQuery] = useState("");
  const [topicFilter, setTopicFilter] = useState<string>("all");



  useEffect(() => {
    let cancelled = false;

    (async () => {
      const { data: liveData } = await supabase
        .from("dsm_live_sessions")
        .select("*")
        .order("session_date", { ascending: false })
        .limit(10);
      if (!cancelled) setSessions(liveData ?? []);
    })();

    (async () => {
      const { data: newsData } = await supabase
        .from("news_articles")
        .select(
          "id, title, description, image_url, published_at, read_time_mins, source, category, link"
        )
        .eq("is_hidden", false)
        .order("published_at", { ascending: false })
        .limit(10);
      if (!cancelled) setArticles(newsData ?? []);
    })();

    (async () => {
      try {
        const eps = await getPodcastEpisodes();
        if (!cancelled) setEpisodes(eps ?? []);
      } catch {
        if (!cancelled) setEpisodes([]);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const activeSession = sessions?.find((s) => s.is_live) ?? null;
  const podcastTopics = Array.from(
    new Set(PODCAST_SHOWS.flatMap((s) => s.categories)),
  ).sort((a, b) => a.localeCompare(b));
  const podcastSearch = podcastQuery.trim().toLowerCase();
  const visibleEpisodes = (episodes ?? []).filter((ep) => {
    const showOk =
      showFilter === "all"
        ? true
        : showFilter === "featured"
          ? ep.showFeatured
          : ep.showId === showFilter;
    if (!showOk) return false;
    if (topicFilter !== "all" && !ep.showCategories.includes(topicFilter)) return false;
    if (!podcastSearch) return true;
    return (
      ep.title.toLowerCase().includes(podcastSearch) ||
      ep.description.toLowerCase().includes(podcastSearch) ||
      ep.showName.toLowerCase().includes(podcastSearch) ||
      ep.showCategories.some((c) => c.toLowerCase().includes(podcastSearch))
    );
  });


  const playEpisode = useCallback((ep: PodcastEpisode) => {
    if (!ep.audioUrl) return;
    setPlaying((prev) => {
      if (prev?.id === ep.id) {
        const el = audioRef.current;
        if (el) {
          if (el.paused) void el.play();
          else el.pause();
        }
        return prev;
      }
      setCurrentTime(0);
      setDuration(0);
      return ep;
    });
  }, []);

  const togglePlay = useCallback(() => {
    const el = audioRef.current;
    if (!el) return;
    if (el.paused) void el.play();
    else el.pause();
  }, []);

  const seekTo = useCallback((secs: number) => {
    const el = audioRef.current;
    if (!el) return;
    el.currentTime = secs;
    setCurrentTime(secs);
  }, []);

  const playNext = useCallback(() => {
    if (!playing) return;
    const list = visibleEpisodes.filter((e) => e.audioUrl);
    const idx = list.findIndex((e) => e.id === playing.id);
    const next = idx >= 0 ? list[idx + 1] : list[0];
    if (!next) return;
    setCurrentTime(0);
    setDuration(0);
    setPlaying(next);
    if (selectedEpisode) setSelectedEpisode(next);
  }, [playing, visibleEpisodes, selectedEpisode]);

  useEffect(() => {
    const el = audioRef.current;
    if (!el || !playing) return;
    el.load();
    void el.play().catch(() => setIsPlaying(false));
  }, [playing]);

  const upcomingSessions = sessions?.filter((s) => !s.is_live) ?? [];
  const allSessions = activeSession ? [activeSession, ...upcomingSessions] : upcomingSessions;

  const tabButton = (
    key: "live" | "news" | "podcasts",
    label: string,
    count: number,
  ) => {
    const isActive = activeTab === key;
    return (
      <button
        key={key}
        type="button"
        onClick={() => setActiveTab(key)}
        style={{
          flex: 1,
          padding: "12px 0",
          textAlign: "center",
          cursor: "pointer",
          border: "none",
          background: "none",
          fontFamily: "Poppins, sans-serif",
          position: "relative",
          color: isActive ? "#0B1F3A" : "#9CA3AF",
          fontSize: 14,
          fontWeight: isActive ? 700 : 500,
        }}
      >
        {label}
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            background: isActive ? "#1877D6" : "#E4E8EF",
            color: isActive ? "#fff" : "#9CA3AF",
            fontSize: 10,
            fontWeight: 700,
            borderRadius: 20,
            padding: "1px 6px",
            marginLeft: 6,
            minWidth: 18,
          }}
        >
          {count}
        </span>
        {isActive && (
          <span
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              height: 2,
              background: "#1877D6",
              borderRadius: "2px 2px 0 0",
            }}
          />
        )}
      </button>
    );
  };

  return (
    <div style={{ background: "#EEF2F7", minHeight: "100vh", ...POPPINS }}>
      <InstructorTopBar
        firstName=""
        pageTitle="Live & News"
        onBack={() => goBack('/home')}
        onBell={() => navigate({ to: "/notifications" as never })}
        onPhone={() => navigate({ to: "/enquiries" as never })}
        onLiveTrack={() => navigate({ to: "/live" as never })}
        onMenu={() => navigate({ to: "/more" as never })}
        onMicPress={() => {}}
      />
      <div style={{ height: "calc(60px + env(safe-area-inset-top, 0px))" }} />

      <div
        style={{
          background: "#fff",
          borderBottom: "1px solid #E4E8EF",
          display: "flex",
          padding: "0 16px",
        }}
      >
        {tabButton("live", "Live", sessions?.length ?? 0)}
        {tabButton("news", "News", articles?.length ?? 0)}
        {tabButton("podcasts", "Podcasts", episodes?.length ?? 0)}
      </div>

      <div
        style={{
          padding: "16px 16px 24px",
          paddingBottom: "calc(100px + env(safe-area-inset-bottom, 0px))",
          display: "flex",
          flexDirection: "column",
          gap: 24,
        }}
      >
        {activeTab === "live" && (
          <section>
            {sessions === null ? (
              <div style={{ padding: "24px 0", textAlign: "center", color: "#9CA3AF", fontSize: 13 }}>
                Loading…
              </div>
            ) : allSessions.length === 0 ? (
              <EmptyState message="No live sessions scheduled" />
            ) : (
              <div style={{ display: "flex", flexDirection: "column" }}>
                {allSessions.map((s) => {
                  const subtitle = (s as any).description || s.category;
                  return (
                    <div
                      key={s.id}
                      role="button"
                      tabIndex={0}
                      onClick={() =>
                        navigate({
                          to: "/dsm-live/$sessionId",
                          params: { sessionId: s.id },
                        })
                      }
                      style={{
                        background: "#fff",
                        borderRadius: 16,
                        border: "1px solid #E4E8EF",
                        boxShadow: "0 1px 3px rgba(11,31,58,0.06)",
                        padding: "14px 16px",
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        marginBottom: 10,
                        cursor: "pointer",
                      }}
                    >
                      <div
                        style={{
                          width: 44,
                          flexShrink: 0,
                          background: "#EFF6FF",
                          borderRadius: 10,
                          padding: "8px 4px",
                          textAlign: "center",
                        }}
                      >
                        <div
                          style={{ fontSize: 20, fontWeight: 800, color: "#1877D6", lineHeight: 1 }}
                        >
                          {formatSessionDay(s.session_date)}
                        </div>
                        <div
                          style={{
                            fontSize: 9,
                            fontWeight: 700,
                            color: "#1877D6",
                            textTransform: "uppercase",
                            marginTop: 2,
                          }}
                        >
                          {formatSessionMonth(s.session_date)}
                        </div>
                      </div>

                      <div
                        style={{
                          flex: 1,
                          minWidth: 0,
                          display: "flex",
                          flexDirection: "column",
                        }}
                      >
                        <div
                          style={{
                            fontSize: 14,
                            fontWeight: 700,
                            color: "#0B1F3A",
                            fontFamily: "Poppins, sans-serif",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            marginBottom: subtitle ? 2 : 0,
                          }}
                        >
                          {s.title}
                        </div>
                        {subtitle && (
                          <div
                            style={{
                              fontSize: 12,
                              color: "#6B7686",
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              marginBottom: 4,
                            }}
                          >
                            {subtitle}
                          </div>
                        )}
                        {s.is_live ? (
                          <span
                            style={{
                              background: "#FEE2E2",
                              color: "#CC2229",
                              fontSize: 10,
                              fontWeight: 700,
                              borderRadius: 20,
                              padding: "2px 8px",
                              display: "inline-block",
                              alignSelf: "flex-start",
                            }}
                          >
                            🔴 Live now
                          </span>
                        ) : (
                          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                            <IconClock size={11} color="#9CA3AF" stroke={1.5} />
                            <span style={{ fontSize: 11, color: "#9CA3AF" }}>
                              {formatSessionTime(s.session_time)}
                            </span>
                          </div>
                        )}
                      </div>

                      <IconChevronRight size={16} color="#C7D0DC" strokeWidth={2} />
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {activeTab === "news" && (
          <section>
            {articles === null ? (
              <div style={{ padding: "24px 0", textAlign: "center", color: "#9CA3AF", fontSize: 13 }}>
                Loading…
              </div>
            ) : articles.length === 0 ? (
              <EmptyState message="No news yet" />
            ) : (
              <div style={{ display: "flex", flexDirection: "column" }}>
                {articles.map((a) => (
                  <div
                    key={a.id}
                    role="button"
                    tabIndex={0}
                    onClick={() =>
                      navigate({
                        to: "/news/$articleId",
                        params: { articleId: a.id },
                      })
                    }
                    style={{
                      background: "#fff",
                      borderRadius: 16,
                      border: "1px solid #E4E8EF",
                      boxShadow: "0 1px 3px rgba(11,31,58,0.06)",
                      padding: 12,
                      display: "flex",
                      gap: 12,
                      alignItems: "flex-start",
                      marginBottom: 10,
                      cursor: "pointer",
                    }}
                  >
                    <div
                      style={{
                        width: 76,
                        height: 76,
                        flexShrink: 0,
                        borderRadius: 10,
                        overflow: "hidden",
                        background: a.image_url ? undefined : "#EEF2F7",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {a.image_url ? (
                        <img
                          src={a.image_url}
                          alt=""
                          loading="lazy"
                          style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        />
                      ) : (
                        <IconNews size={24} color="#6B7686" />
                      )}
                    </div>

                    <div
                      style={{
                        flex: 1,
                        minWidth: 0,
                        display: "flex",
                        flexDirection: "column",
                      }}
                    >
                      <span
                        style={{
                          background: "#EFF6FF",
                          color: "#1877D6",
                          fontSize: 10,
                          fontWeight: 700,
                          borderRadius: 20,
                          padding: "2px 8px",
                          display: "inline-block",
                          alignSelf: "flex-start",
                          marginBottom: 4,
                        }}
                      >
                        {a.category || a.source || "News"}
                      </span>
                      <div
                        style={{
                          fontSize: 14,
                          fontWeight: 700,
                          color: "#0B1F3A",
                          fontFamily: "Poppins, sans-serif",
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                          lineHeight: 1.4,
                          marginBottom: 4,
                        }}
                      >
                        {sanitizeNewsTitle(a.title)}
                      </div>
                      <div style={{ fontSize: 11, color: "#9CA3AF" }}>
                        {formatDate(a.published_at)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {activeTab === "podcasts" && (
          <section>
            {episodes === null ? (
              <div style={{ padding: "24px 0", textAlign: "center", color: "#9CA3AF", fontSize: 13 }}>
                Loading…
              </div>
            ) : episodes.length === 0 ? (
              <EmptyState message="Podcast episodes unavailable right now" />
            ) : (
              <div style={{ display: "flex", flexDirection: "column" }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    marginBottom: 10,
                    color: "#6B7686",
                    fontSize: 12,
                  }}
                >
                  <IconMicrophone size={14} color="#1877D6" stroke={1.8} />
                  <span>
                    Latest episodes from{" "}
                    <strong style={{ color: "#0B1F3A" }}>
                      {PODCAST_SHOWS.length} instructor podcasts
                    </strong>
                  </span>
                </div>

                <div
                  style={{
                    position: "relative",
                    display: "flex",
                    alignItems: "center",
                    background: "#fff",
                    border: "1px solid #E4E8EF",
                    borderRadius: 12,
                    padding: "0 10px",
                    marginBottom: 10,
                    boxShadow: "0 1px 3px rgba(11,31,58,0.06)",
                  }}
                >
                  <IconSearch size={16} color="#9CA3AF" stroke={1.9} />
                  <input
                    type="text"
                    value={podcastQuery}
                    onChange={(e) => setPodcastQuery(e.target.value)}
                    placeholder="Search episodes, shows or topics"
                    aria-label="Search podcast episodes"
                    style={{
                      flex: 1,
                      minWidth: 0,
                      border: "none",
                      outline: "none",
                      background: "transparent",
                      padding: "11px 8px",
                      fontFamily: "Poppins, sans-serif",
                      fontSize: 13,
                      color: "#0B1F3A",
                    }}
                  />
                  {podcastQuery && (
                    <button
                      type="button"
                      onClick={() => setPodcastQuery("")}
                      aria-label="Clear search"
                      style={{
                        border: "none",
                        background: "transparent",
                        padding: 4,
                        cursor: "pointer",
                        display: "flex",
                      }}
                    >
                      <IconX size={15} color="#9CA3AF" stroke={2} />
                    </button>
                  )}
                </div>

                <div
                  style={{
                    display: "flex",
                    gap: 6,
                    overflowX: "auto",
                    paddingBottom: 10,
                    scrollbarWidth: "none",
                  }}
                >
                  {["all", ...podcastTopics].map((topic) => {
                    const active = topicFilter === topic;
                    return (
                      <button
                        key={topic}
                        type="button"
                        onClick={() => setTopicFilter(topic)}
                        style={{
                          flexShrink: 0,
                          padding: "6px 11px",
                          borderRadius: 999,
                          border: `1px solid ${active ? "#1877D6" : "#E4E8EF"}`,
                          background: active ? "#EFF6FF" : "#fff",
                          color: active ? "#1877D6" : "#6B7686",
                          fontFamily: "Poppins, sans-serif",
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: "pointer",
                        }}
                      >
                        {topic === "all" ? "All topics" : topic}
                      </button>
                    );
                  })}
                </div>



                <div
                  style={{
                    display: "flex",
                    gap: 6,
                    overflowX: "auto",
                    paddingBottom: 10,
                    marginBottom: 4,
                    scrollbarWidth: "none",
                  }}
                >
                  {[
                    { id: "all", name: "All" },
                    { id: "featured", name: "Featured" },
                    ...PODCAST_SHOWS.map((s) => ({ id: s.id, name: s.name })),
                  ].map((chip) => {
                    const active = showFilter === chip.id;
                    const count =
                      chip.id === "all"
                        ? episodes.length
                        : chip.id === "featured"
                          ? episodes.filter((e) => e.showFeatured).length
                          : episodes.filter((e) => e.showId === chip.id).length;
                    return (
                      <button
                        key={chip.id}
                        type="button"
                        onClick={() => setShowFilter(chip.id)}
                        style={{
                          flexShrink: 0,
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          padding: "7px 12px",
                          borderRadius: 999,
                          border: `1px solid ${active ? "#0B1F3A" : "#E4E8EF"}`,
                          background: active ? "#0B1F3A" : "#fff",
                          color: active ? "#fff" : "#0B1F3A",
                          fontFamily: "Poppins, sans-serif",
                          fontSize: 12.5,
                          fontWeight: 600,
                          cursor: "pointer",
                        }}
                      >
                        {chip.name}
                        {count > 0 && (
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 700,
                              color: active ? "#fff" : "#1877D6",
                              opacity: active ? 0.85 : 1,
                            }}
                          >
                            {count}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {visibleEpisodes.length === 0 && (
                  <EmptyState
                    message={
                      podcastSearch || topicFilter !== "all"
                        ? "No episodes match your search"
                        : "No episodes for this podcast right now"
                    }
                  />

                )}

                {visibleEpisodes.map((ep) => {

                  const isOpen = selectedEpisode?.id === ep.id;
                  return (
                    <div
                      key={ep.id}
                      style={{
                        background: "#fff",
                        borderRadius: 16,
                        border: `1px solid ${isOpen ? "#1877D6" : "#E4E8EF"}`,
                        boxShadow: "0 1px 3px rgba(11,31,58,0.06)",
                        padding: 12,
                        marginBottom: 10,
                      }}
                    >
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => setSelectedEpisode(ep)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") setSelectedEpisode(ep);
                        }}
                        style={{
                          display: "flex",
                          gap: 12,
                          alignItems: "flex-start",
                          cursor: "pointer",
                        }}
                      >
                        <div
                          style={{
                            width: 76,
                            height: 76,
                            flexShrink: 0,
                            borderRadius: 10,
                            overflow: "hidden",
                            background: ep.imageUrl ? undefined : "#EEF2F7",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          {ep.imageUrl ? (
                            <img
                              src={ep.imageUrl}
                              alt=""
                              loading="lazy"
                              style={{ width: "100%", height: "100%", objectFit: "cover" }}
                            />
                          ) : (
                            <IconMicrophone size={24} color="#6B7686" />
                          )}
                        </div>

                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            style={{
                              display: "inline-block",
                              maxWidth: "100%",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                              background: "#EFF6FF",
                              color: "#1877D6",
                              borderRadius: 6,
                              padding: "2px 6px",
                              fontSize: 10,
                              fontWeight: 700,
                              letterSpacing: "0.02em",
                              marginBottom: 5,
                            }}
                          >
                            {ep.showName}
                          </div>
                          <div

                            style={{
                              fontSize: 14,
                              fontWeight: 700,
                              color: "#0B1F3A",
                              fontFamily: "Poppins, sans-serif",
                              display: "-webkit-box",
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: "vertical",
                              overflow: "hidden",
                              lineHeight: 1.4,
                              marginBottom: 4,
                            }}
                          >
                            {ep.title}
                          </div>
                          <div
                            style={{
                              fontSize: 11,
                              color: "#9CA3AF",
                              display: "flex",
                              alignItems: "center",
                              gap: 6,
                            }}
                          >
                            <span>{formatDate(ep.pubDate)}</span>
                            {ep.durationSecs ? (
                              <>
                                <span>·</span>
                                <span>{formatDuration(ep.durationSecs)}</span>
                              </>
                            ) : null}
                          </div>
                        </div>

                        <button
                          type="button"
                          aria-label={
                            playing?.id === ep.id && isPlaying ? "Pause episode" : "Play episode"
                          }
                          onClick={(e) => {
                            e.stopPropagation();
                            playEpisode(ep);
                          }}
                          disabled={!ep.audioUrl}
                          style={{
                            width: 36,
                            height: 36,
                            flexShrink: 0,
                            borderRadius: 18,
                            border: "none",
                            background: playing?.id === ep.id ? "#1877D6" : "#EFF6FF",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            alignSelf: "center",
                            cursor: ep.audioUrl ? "pointer" : "not-allowed",
                          }}
                        >
                          {playing?.id === ep.id && isPlaying ? (
                            <IconPlayerPauseFilled size={16} color="#fff" />
                          ) : (
                            <IconPlayerPlayFilled
                              size={16}
                              color={playing?.id === ep.id ? "#fff" : "#1877D6"}
                            />
                          )}
                        </button>
                      </div>

                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}
      </div>

      {playing ? (
        // eslint-disable-next-line jsx-a11y/media-has-caption
        <audio
          ref={audioRef}
          src={playing.audioUrl}
          preload="metadata"
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
          onLoadedMetadata={(e) => setDuration(e.currentTarget.duration || 0)}
          onEnded={playNext}
          style={{ display: "none" }}
        />
      ) : null}

      {selectedEpisode && (
        <EpisodeModal
          episode={selectedEpisode}
          onClose={() => setSelectedEpisode(null)}
          isCurrent={playing?.id === selectedEpisode.id}
          isPlaying={playing?.id === selectedEpisode.id && isPlaying}
          currentTime={playing?.id === selectedEpisode.id ? currentTime : 0}
          duration={playing?.id === selectedEpisode.id ? duration : 0}
          onPlay={() => playEpisode(selectedEpisode)}
          onSeek={seekTo}
          onNext={playNext}
        />
      )}

      {playing && (
        <MiniPlayer
          episode={playing}
          isPlaying={isPlaying}
          currentTime={currentTime}
          duration={duration}
          onToggle={togglePlay}
          onSeek={seekTo}
          onNext={playNext}
          onOpen={() => setSelectedEpisode(playing)}
          onClose={() => {
            setPlaying(null);
            setIsPlaying(false);
          }}
        />
      )}
    </div>
  );
}

function EpisodeModal({
  episode,
  onClose,
}: {
  episode: PodcastEpisode;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<"notes" | "transcript">("notes");
  const [transcript, setTranscript] = useState<string | null>(null);
  const [transcriptError, setTranscriptError] = useState<string | null>(null);
  const [loadingTranscript, setLoadingTranscript] = useState(false);

  useEffect(() => {
    if (tab !== "transcript" || !episode.transcriptUrl || transcript || transcriptError) return;
    let cancelled = false;
    setLoadingTranscript(true);
    (async () => {
      try {
        const res = await getPodcastTranscript({
          data: { url: episode.transcriptUrl!, type: episode.transcriptType },
        });
        if (cancelled) return;
        if (res.error || !res.text) setTranscriptError(res.error || "Transcript unavailable");
        else setTranscript(res.text);
      } catch {
        if (!cancelled) setTranscriptError("Transcript unavailable");
      } finally {
        if (!cancelled) setLoadingTranscript(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tab, episode, transcript, transcriptError]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const modalTab = (key: "notes" | "transcript", label: string, disabled?: boolean) => (
    <button
      type="button"
      onClick={() => !disabled && setTab(key)}
      disabled={disabled}
      style={{
        flex: 1,
        padding: "9px 8px",
        borderRadius: 10,
        border: "none",
        background: tab === key ? "#fff" : "transparent",
        boxShadow: tab === key ? "0 1px 3px rgba(11,31,58,0.10)" : "none",
        color: disabled ? "#C3CAD4" : tab === key ? "#0B1F3A" : "#6B7686",
        fontSize: 13,
        fontWeight: 700,
        cursor: disabled ? "not-allowed" : "pointer",
        ...POPPINS,
      }}
    >
      {label}
    </button>
  );

  return (
    <div
      role="presentation"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 200,
        background: "rgba(11,31,58,0.45)",
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={episode.title}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 520,
          maxHeight: "92vh",
          background: "#F6F8FB",
          borderTopLeftRadius: 22,
          borderTopRightRadius: 22,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          ...POPPINS,
        }}
      >
        <div style={{ padding: "10px 0 0", display: "flex", justifyContent: "center" }}>
          <div style={{ width: 42, height: 4, borderRadius: 2, background: "#D7DEE8" }} />
        </div>

        <div style={{ padding: "12px 16px 0", display: "flex", gap: 12 }}>
          <div
            style={{
              width: 68,
              height: 68,
              flexShrink: 0,
              borderRadius: 12,
              overflow: "hidden",
              background: "#EEF2F7",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {episode.imageUrl ? (
              <img
                src={episode.imageUrl}
                alt=""
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            ) : (
              <IconMicrophone size={24} color="#6B7686" />
            )}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                display: "inline-block",
                background: "#EFF6FF",
                color: "#1877D6",
                borderRadius: 6,
                padding: "2px 6px",
                fontSize: 10,
                fontWeight: 700,
                marginBottom: 5,
              }}
            >
              {episode.showName}
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#0B1F3A", lineHeight: 1.35 }}>
              {episode.title}
            </div>
            <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 4 }}>
              {formatDate(episode.pubDate)}
              {episode.durationSecs ? ` · ${formatDuration(episode.durationSecs)}` : ""}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close episode details"
            style={{
              width: 32,
              height: 32,
              flexShrink: 0,
              borderRadius: 16,
              border: "none",
              background: "#EEF2F7",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
          >
            <IconX size={16} color="#6B7686" stroke={2} />
          </button>
        </div>

        {episode.audioUrl ? (
          <div style={{ padding: "12px 16px 0" }}>
            {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
            <audio src={episode.audioUrl} controls preload="none" style={{ width: "100%" }} />
          </div>
        ) : null}

        <div style={{ padding: "12px 16px 0" }}>
          <div
            style={{
              display: "flex",
              gap: 4,
              background: "#EAEFF6",
              borderRadius: 12,
              padding: 4,
            }}
          >
            {modalTab("notes", "Show notes")}
            {modalTab(
              "transcript",
              episode.transcriptUrl ? "Transcript" : "No transcript",
              !episode.transcriptUrl,
            )}
          </div>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px 24px" }}>
          <div
            style={{
              background: "#fff",
              border: "1px solid #E4E8EF",
              borderRadius: 16,
              padding: 14,
              fontSize: 13,
              lineHeight: 1.6,
              color: "#435063",
              whiteSpace: "pre-wrap",
            }}
          >
            {tab === "notes" ? (
              episode.showNotes || episode.description || "No show notes for this episode."
            ) : loadingTranscript ? (
              "Loading transcript…"
            ) : transcriptError ? (
              transcriptError
            ) : (
              transcript || "Transcript unavailable."
            )}
          </div>

          {episode.link && (
            <a
              href={episode.link}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                marginTop: 12,
                fontSize: 12,
                fontWeight: 600,
                color: "#1877D6",
                textDecoration: "none",
              }}
            >
              Open episode page
              <IconChevronRight size={13} stroke={2} />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

function formatDuration(secs: number): string {
  const h = Math.floor(secs / 3600);
  const m = Math.round((secs % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m} min`;
}

function EmptyState({ message }: { message: string }) {
  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #E4E8EF",
        borderRadius: 16,
        padding: 32,
        textAlign: "center",
        color: "#9CA3AF",
        fontSize: 14,
        ...POPPINS,
      }}
    >
      {message}
    </div>
  );
}

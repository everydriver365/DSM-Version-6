import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  IconBookmark,
  IconBookmarkFilled,
  IconBriefcase,
  IconBroadcast,
  IconCar,
  IconChevronRight,
  IconClock,
  IconHeart,
  IconLayoutGrid,
  IconMicrophone,
  IconNews,
  IconPlayerPlayFilled,
  IconPlayerPauseFilled,
  IconPlayerTrackNextFilled,
  IconSchool,
  IconSearch,
  IconShare,
  IconTag,
  IconX,
} from "@tabler/icons-react";

import InstructorTopBar from "@/components/dsm/InstructorTopBar";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";
import { formatSessionDate, formatSessionTime, type LiveSession } from "./dsm-live";
import { sanitizeNewsTitle } from "@/lib/newsText";
import {
  getPodcastEpisodes,
  getPodcastTranscript,
  type PodcastEpisode,
} from "@/lib/podcasts.functions";
import { PODCAST_SHOWS } from "@/lib/podcasts";
import {
  loadProgress,
  saveProgress,
  isFinished,
  resumePosition,
  remainingLabel,
  type EpisodeProgress,
  type ProgressMap,
} from "@/lib/podcastProgress";
import {
  loadSaved,
  toggleSaved,
  savedList,
  type SavedMap,
} from "@/lib/podcastSaved";

export const Route = createFileRoute("/live-news")({
  component: LiveNewsPage,
});

const POPPINS = { fontFamily: "Poppins, sans-serif" } as const;

/** Small icon for a podcast category chip. */
function categoryIcon(topic: string) {
  const t = topic.toLowerCase();
  if (t.includes("business") || t.includes("industry") || t.includes("growth")) return IconBriefcase;
  if (t.includes("cpd") || t.includes("teach") || t.includes("training") || t.includes("standards"))
    return IconSchool;
  if (t.includes("well") || t.includes("health") || t.includes("mind")) return IconHeart;
  if (t.includes("driv") || t.includes("road") || t.includes("vehicle")) return IconCar;
  return IconTag;
}


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

async function handleShareEpisode(episode: PodcastEpisode) {
  const url = episode.link || episode.audioUrl;
  if (!url) {
    toast.error("No link available for this episode");
    return;
  }
  const title = episode.title;
  const text = `Check out this episode from ${episode.showName}`;
  try {
    if (
      typeof window !== "undefined" &&
      typeof navigator.share === "function"
    ) {
      await navigator.share({ title, text, url });
      return;
    }
  } catch {
    /* user cancelled or share failed — fall back to copy */
  }
  try {
    await navigator.clipboard.writeText(url);
    toast.success("Episode link copied");
  } catch {
    toast.error("Could not copy link");
  }
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
  const [activeTab, setActiveTab] = useState<"live" | "news" | "podcasts" | "saved">("live");
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

  // ---- saved / bookmarked episodes (per device) ----
  const [saved, setSaved] = useState<SavedMap>({});
  useEffect(() => {
    setSaved(loadSaved());
  }, []);
  const toggleSave = useCallback((ep: PodcastEpisode) => {
    setSaved((prev) => {
      const next = toggleSaved(prev, ep);
      toast.success(next[ep.id] ? "Saved for later" : "Removed from saved");
      return next;
    });
  }, []);
  const savedEpisodes = savedList(saved);

  // ---- listening progress (per device) ----
  const [progress, setProgress] = useState<ProgressMap>({});
  const progressRef = useRef<ProgressMap>({});
  const playingRef = useRef<PodcastEpisode | null>(null);
  const lastSaveRef = useRef(0);
  const restartRef = useRef<string | null>(null);
  const resumeTargetRef = useRef<{ id: string; target: number; startedAt: number } | null>(null);

  useEffect(() => {
    const stored = loadProgress();
    progressRef.current = stored;
    setProgress(stored);
  }, []);

  const commitProgress = useCallback(
    (epId: string, position: number, dur: number, opts?: { played?: boolean; force?: boolean }) => {
      if (!epId || !Number.isFinite(position)) return;
      const now = Date.now();
      if (!opts?.force && !opts?.played && now - lastSaveRef.current < 5000) return;
      lastSaveRef.current = now;
      const entry: EpisodeProgress = {
        position: opts?.played ? 0 : Math.max(0, position),
        duration: Number.isFinite(dur) ? dur : 0,
        played: opts?.played ?? false,
        updatedAt: now,
      };
      const next = { ...progressRef.current, [epId]: entry };
      progressRef.current = next;
      setProgress(next);
      saveProgress(next);
    },
    [],
  );

  /**
   * Seek a freshly loaded episode to its stored position. Called from both
   * loadedmetadata and canplay because some hosts ignore a seek before the
   * first byte range is available.
   */
  const applyResume = useCallback((el: HTMLAudioElement) => {
    const ep = playingRef.current;
    if (!ep) return;
    if (resumeTargetRef.current?.id !== ep.id) {
      if (restartRef.current === ep.id) {
        restartRef.current = null;
        resumeTargetRef.current = { id: ep.id, target: 0, startedAt: Date.now() };
        el.currentTime = 0;
        setCurrentTime(0);
        return;
      }
      const resumeAt = resumePosition(progressRef.current[ep.id]);
      const usable = resumeAt > 0 && (!el.duration || resumeAt < el.duration - 30);
      resumeTargetRef.current = { id: ep.id, target: usable ? resumeAt : 0, startedAt: Date.now() };
    }
    const pending = resumeTargetRef.current;
    // Some CDNs ignore a seek issued before playback is underway, so keep
    // retrying for a short window until the position sticks.
    if (!pending || pending.target <= 0 || Date.now() - pending.startedAt > 20000) return;
    if (Math.abs(el.currentTime - pending.target) < 3) {
      pending.target = 0; // resumed — stop tracking so manual seeks stick
      return;
    }
    el.currentTime = pending.target;
    setCurrentTime(pending.target);
  }, []);

  const flushProgress = useCallback(() => {
    const el = audioRef.current;
    const ep = playingRef.current;
    if (!el || !ep) return;
    commitProgress(ep.id, el.currentTime, el.duration || 0, { force: true });
  }, [commitProgress]);

  useEffect(() => {
    playingRef.current = playing;
  }, [playing]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onLeave = () => flushProgress();
    window.addEventListener("beforeunload", onLeave);
    return () => {
      window.removeEventListener("beforeunload", onLeave);
      onLeave();
    };
  }, [flushProgress]);



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
          : showFilter === "ted"
            ? ep.showId.startsWith("ted-")
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


  const playEpisode = useCallback(
    (ep: PodcastEpisode, opts?: { restart?: boolean }) => {
      if (!ep.audioUrl) return;
      if (opts?.restart) restartRef.current = ep.id;
      setPlaying((prev) => {
        if (prev?.id === ep.id) {
          const el = audioRef.current;
          if (el) {
            if (opts?.restart) {
              el.currentTime = 0;
              setCurrentTime(0);
              void el.play();
            } else if (el.paused) {
              void el.play();
            } else {
              el.pause();
            }
          }
          return prev;
        }
        flushProgress();
        setCurrentTime(0);
        setDuration(0);
        return ep;
      });
    },
    [flushProgress],
  );

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
    const source = activeTab === "saved" ? savedEpisodes : visibleEpisodes;
    const list = source.filter((e) => e.audioUrl);
    const idx = list.findIndex((e) => e.id === playing.id);
    const next = idx >= 0 ? list[idx + 1] : list[0];
    if (!next) return;
    flushProgress();
    setCurrentTime(0);
    setDuration(0);
    setPlaying(next);
    if (selectedEpisode) setSelectedEpisode(next);
  }, [playing, visibleEpisodes, savedEpisodes, activeTab, selectedEpisode, flushProgress]);

  useEffect(() => {
    const el = audioRef.current;
    if (!el || !playing) return;
    resumeTargetRef.current = null;
    el.load();
    void el.play().catch(() => setIsPlaying(false));
  }, [playing]);

  const upcomingSessions = sessions?.filter((s) => !s.is_live) ?? [];
  const allSessions = activeSession ? [activeSession, ...upcomingSessions] : upcomingSessions;

  const tabButton = (
    key: "live" | "news" | "podcasts" | "saved",
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
        {tabButton("saved", "Saved", savedEpisodes.length)}
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
                {playing ? <div style={{ height: 96 }} /> : null}
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
                {/* ---- header block ---- */}
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                  <span
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 22,
                      background: "#EAF3FB",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <IconMicrophone size={22} color="#1877D6" stroke={1.9} />
                  </span>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 20, fontWeight: 800, color: "#0B1F3A", letterSpacing: "-0.3px" }}>
                      Podcasts
                    </div>
                    <div style={{ fontSize: 12.5, color: "#6B7686" }}>
                      {PODCAST_SHOWS.length} podcasts · {episodes.length} episodes
                    </div>
                  </div>
                </div>

                {/* ---- continue listening ---- */}
                {(() => {
                  const inProgress = (episodes ?? [])
                    .filter((e) => {
                      const entry = progress[e.id];
                      return !!entry && !isFinished(entry) && resumePosition(entry) > 0;
                    })
                    .sort(
                      (a, b) => (progress[b.id]?.updatedAt ?? 0) - (progress[a.id]?.updatedAt ?? 0),
                    );
                  const ep = inProgress[0];
                  if (!ep) return null;
                  const entry = progress[ep.id];
                  const pct = entry?.duration
                    ? Math.min(100, Math.round((entry.position / entry.duration) * 100))
                    : 0;
                  return (
                    <div style={{ marginBottom: 18 }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          marginBottom: 8,
                        }}
                      >
                        <div style={{ fontSize: 15, fontWeight: 700, color: "#0B1F3A" }}>
                          Continue listening
                        </div>
                        {inProgress.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setSelectedEpisode(ep)}
                            style={{
                              border: "none",
                              background: "none",
                              padding: 0,
                              cursor: "pointer",
                              color: "#1877D6",
                              fontFamily: "Poppins, sans-serif",
                              fontSize: 12.5,
                              fontWeight: 600,
                            }}
                          >
                            View all
                          </button>
                        )}
                      </div>
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => setSelectedEpisode(ep)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") setSelectedEpisode(ep);
                        }}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 12,
                          background: "#fff",
                          border: "1px solid #E4E8EF",
                          borderRadius: 16,
                          boxShadow: "0 1px 3px rgba(11,31,58,0.06)",
                          padding: 12,
                          cursor: "pointer",
                        }}
                      >
                        <div
                          style={{
                            width: 64,
                            height: 64,
                            borderRadius: 12,
                            overflow: "hidden",
                            flexShrink: 0,
                            background: "#EEF2F7",
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
                            <IconMicrophone size={22} color="#6B7686" />
                          )}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 11, fontWeight: 600, color: "#1877D6" }}>
                            {ep.showName}
                          </div>
                          <div
                            style={{
                              fontSize: 14,
                              fontWeight: 700,
                              color: "#0B1F3A",
                              lineHeight: 1.35,
                              display: "-webkit-box",
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: "vertical",
                              overflow: "hidden",
                              margin: "2px 0 8px",
                            }}
                          >
                            {ep.title}
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <div
                              style={{
                                flex: 1,
                                height: 4,
                                borderRadius: 2,
                                background: "#E4E8EF",
                                overflow: "hidden",
                              }}
                            >
                              <div
                                style={{ width: `${pct}%`, height: "100%", background: "#1877D6" }}
                              />
                            </div>
                            <span style={{ fontSize: 11, color: "#6B7686", whiteSpace: "nowrap" }}>
                              {remainingLabel(entry) ?? ""}
                            </span>
                          </div>
                        </div>
                        <div style={{ textAlign: "center", flexShrink: 0 }}>
                          <button
                            type="button"
                            aria-label={`Continue ${ep.title}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              playEpisode(ep);
                            }}
                            style={{
                              width: 48,
                              height: 48,
                              borderRadius: 24,
                              border: "none",
                              background: "#1877D6",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              cursor: "pointer",
                              boxShadow: "0 3px 8px rgba(24,119,214,0.25)",
                            }}
                          >
                            {playing?.id === ep.id && isPlaying ? (
                              <IconPlayerPauseFilled size={20} color="#fff" />
                            ) : (
                              <IconPlayerPlayFilled size={20} color="#fff" />
                            )}
                          </button>
                          <div
                            style={{
                              fontSize: 11,
                              fontWeight: 600,
                              color: "#1877D6",
                              marginTop: 4,
                            }}
                          >
                            Continue
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* ---- featured shows ---- */}
                <div style={{ marginBottom: 18 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: 8,
                    }}
                  >
                    <div style={{ fontSize: 15, fontWeight: 700, color: "#0B1F3A" }}>Featured</div>
                    <button
                      type="button"
                      onClick={() => setShowFilter("featured")}
                      style={{
                        border: "none",
                        background: "none",
                        padding: 0,
                        cursor: "pointer",
                        color: "#1877D6",
                        fontFamily: "Poppins, sans-serif",
                        fontSize: 12.5,
                        fontWeight: 600,
                      }}
                    >
                      View all
                    </button>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      gap: 12,
                      overflowX: "auto",
                      paddingBottom: 4,
                      scrollbarWidth: "none",
                    }}
                  >
                    {PODCAST_SHOWS.filter((sh) => sh.recommended).map((sh) => {
                      const latest =
                        (episodes ?? []).find((e) => e.showId === sh.id && e.audioUrl) ?? null;
                      const active = showFilter === sh.id;
                      return (
                        <div key={sh.id} style={{ flex: "0 0 auto", width: 116 }}>
                          <div
                            role="button"
                            tabIndex={0}
                            onClick={() => setShowFilter(active ? "all" : sh.id)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ")
                                setShowFilter(active ? "all" : sh.id);
                            }}
                            style={{
                              position: "relative",
                              width: 116,
                              height: 116,
                              borderRadius: 14,
                              overflow: "hidden",
                              background: "#EEF2F7",
                              border: `1px solid ${active ? "#1877D6" : "#E4E8EF"}`,
                              boxShadow: "0 1px 3px rgba(11,31,58,0.06)",
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            {latest?.imageUrl ? (
                              <img
                                src={latest.imageUrl}
                                alt=""
                                loading="lazy"
                                style={{ width: "100%", height: "100%", objectFit: "cover" }}
                              />
                            ) : (
                              <IconMicrophone size={26} color="#6B7686" />
                            )}
                            <button
                              type="button"
                              aria-label={`Play latest episode of ${sh.name}`}
                              disabled={!latest}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (latest) playEpisode(latest);
                              }}
                              style={{
                                position: "absolute",
                                right: 8,
                                bottom: 8,
                                width: 34,
                                height: 34,
                                borderRadius: 17,
                                border: "none",
                                background: "#fff",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                cursor: latest ? "pointer" : "not-allowed",
                                boxShadow: "0 2px 6px rgba(11,31,58,0.25)",
                                opacity: latest ? 1 : 0.5,
                              }}
                            >
                              {latest && playing?.id === latest.id && isPlaying ? (
                                <IconPlayerPauseFilled size={15} color="#1877D6" />
                              ) : (
                                <IconPlayerPlayFilled size={15} color="#1877D6" />
                              )}
                            </button>
                          </div>
                          <div
                            style={{
                              fontSize: 13,
                              fontWeight: 700,
                              color: "#0B1F3A",
                              marginTop: 6,
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {sh.name}
                          </div>
                          <div style={{ fontSize: 11, color: "#9CA3AF" }}>
                            {latest?.durationSecs ? formatDuration(latest.durationSecs) : "—"}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* ---- search ---- */}
                <div
                  style={{
                    position: "relative",
                    display: "flex",
                    alignItems: "center",
                    background: "#fff",
                    border: "1px solid #E4E8EF",
                    borderRadius: 999,
                    padding: "0 14px",
                    marginBottom: 18,
                    boxShadow: "0 1px 3px rgba(11,31,58,0.06)",
                  }}
                >
                  <IconSearch size={17} color="#9CA3AF" stroke={1.9} />
                  <input
                    type="text"
                    value={podcastQuery}
                    onChange={(e) => setPodcastQuery(e.target.value)}
                    placeholder="Search podcasts, episodes or topics"
                    aria-label="Search podcast episodes"
                    style={{
                      flex: 1,
                      minWidth: 0,
                      border: "none",
                      outline: "none",
                      background: "transparent",
                      padding: "14px 10px",
                      fontFamily: "Poppins, sans-serif",
                      fontSize: 13.5,
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

                {/* ---- browse by category ---- */}
                <div style={{ fontSize: 15, fontWeight: 700, color: "#0B1F3A", marginBottom: 8 }}>
                  Browse by category
                </div>
                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    overflowX: "auto",
                    paddingBottom: 10,
                    scrollbarWidth: "none",
                  }}
                >
                  {["all", ...podcastTopics].map((topic) => {
                    const active = topicFilter === topic;
                    const Icon = topic === "all" ? IconLayoutGrid : categoryIcon(topic);
                    return (
                      <button
                        key={topic}
                        type="button"
                        onClick={() => setTopicFilter(topic)}
                        style={{
                          flexShrink: 0,
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          padding: "9px 14px",
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
                        <Icon size={15} stroke={1.9} />
                        {topic === "all" ? "All" : topic}
                      </button>
                    );
                  })}
                </div>

                {/* ---- show filter chips ---- */}
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
                    { id: "ted", name: "TED Talks" },
                    ...PODCAST_SHOWS.map((s) => ({ id: s.id, name: s.name })),
                  ].map((chip) => {
                    const active = showFilter === chip.id;
                    const count =
                      chip.id === "all"
                        ? episodes.length
                        : chip.id === "featured"
                          ? episodes.filter((e) => e.showFeatured).length
                          : chip.id === "ted"
                            ? episodes.filter((e) => e.showId.startsWith("ted-")).length
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
                          border: `1px solid ${active ? "#1877D6" : "#E4E8EF"}`,
                          background: active ? "#EFF6FF" : "#fff",
                          color: active ? "#1877D6" : "#6B7686",
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
                              color: active ? "#1877D6" : "#9CA3AF",
                            }}
                          >
                            {count}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                <div style={{ fontSize: 15, fontWeight: 700, color: "#0B1F3A", margin: "8px 0 8px" }}>
                  Latest episodes
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

                {visibleEpisodes.map((ep) => (
                  <EpisodeCard
                    key={ep.id}
                    ep={ep}
                    isOpen={selectedEpisode?.id === ep.id}
                    onOpen={() => setSelectedEpisode(ep)}
                    isCurrent={playing?.id === ep.id}
                    isPlaying={isPlaying}
                    onPlay={() => playEpisode(ep)}
                    progressEntry={progress[ep.id]}
                    isSaved={!!saved[ep.id]}
                    onToggleSave={() => toggleSave(ep)}
                  />
                ))}
              </div>
            )}
          </section>
        )}

        {activeTab === "saved" && (
          <section>
            {savedEpisodes.length === 0 ? (
              <EmptyState message="No saved episodes yet — tap the bookmark on any episode to save it here" />
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
                  <IconBookmarkFilled size={14} color="#1877D6" />
                  <span>
                    <strong style={{ color: "#0B1F3A" }}>{savedEpisodes.length}</strong> saved{" "}
                    {savedEpisodes.length === 1 ? "episode" : "episodes"} on this device
                  </span>
                </div>
                {savedEpisodes.map((ep) => (
                  <EpisodeCard
                    key={ep.id}
                    ep={ep}
                    isOpen={selectedEpisode?.id === ep.id}
                    onOpen={() => setSelectedEpisode(ep)}
                    isCurrent={playing?.id === ep.id}
                    isPlaying={isPlaying}
                    onPlay={() => playEpisode(ep)}
                    progressEntry={progress[ep.id]}
                    isSaved
                    onToggleSave={() => toggleSave(ep)}
                  />
                ))}
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
          onPause={(e) => {
            setIsPlaying(false);
            commitProgress(playing.id, e.currentTarget.currentTime, e.currentTarget.duration || 0, {
              force: true,
            });
          }}
          onPlaying={(e) => applyResume(e.currentTarget)}
          onTimeUpdate={(e) => {
            applyResume(e.currentTarget);
            setCurrentTime(e.currentTarget.currentTime);
            commitProgress(playing.id, e.currentTarget.currentTime, e.currentTarget.duration || 0);
          }}
          onLoadedMetadata={(e) => {
            setDuration(e.currentTarget.duration || 0);
            applyResume(e.currentTarget);
          }}
          onCanPlay={(e) => applyResume(e.currentTarget)}
          onEnded={(e) => {
            commitProgress(playing.id, 0, e.currentTarget.duration || 0, { played: true });
            playNext();
          }}
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
          onRestart={() => playEpisode(selectedEpisode, { restart: true })}
          progressEntry={progress[selectedEpisode.id]}
          onSeek={seekTo}
          onNext={playNext}
          isSaved={!!saved[selectedEpisode.id]}
          onToggleSave={() => toggleSave(selectedEpisode)}
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

function formatClock(secs: number): string {
  if (!Number.isFinite(secs) || secs < 0) return "0:00";
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

function ProgressBar({
  currentTime,
  duration,
  onSeek,
}: {
  currentTime: number;
  duration: number;
  onSeek: (secs: number) => void;
}) {
  return (
    <input
      type="range"
      min={0}
      max={duration || 0}
      step={1}
      value={Math.min(currentTime, duration || 0)}
      disabled={!duration}
      aria-label="Seek"
      onChange={(e) => onSeek(Number(e.target.value))}
      style={{ width: "100%", accentColor: "#1877D6", cursor: duration ? "pointer" : "default" }}
    />
  );
}

function MiniPlayer({
  episode,
  isPlaying,
  currentTime,
  duration,
  onToggle,
  onSeek,
  onNext,
  onOpen,
  onClose,
}: {
  episode: PodcastEpisode;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  onToggle: () => void;
  onSeek: (secs: number) => void;
  onNext: () => void;
  onOpen: () => void;
  onClose: () => void;
}) {
  return (
    <div
      style={{
        position: "fixed",
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 190,
        background: "#fff",
        borderTop: "1px solid #E4E8EF",
        boxShadow: "0 -4px 16px rgba(11,31,58,0.10)",
        padding: "8px 12px calc(8px + env(safe-area-inset-bottom))",
        ...POPPINS,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div
          role="button"
          tabIndex={0}
          onClick={onOpen}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") onOpen();
          }}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            flex: 1,
            minWidth: 0,
            cursor: "pointer",
          }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              flexShrink: 0,
              borderRadius: 8,
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
              <IconMicrophone size={18} color="#6B7686" />
            )}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 12.5,
                fontWeight: 700,
                color: "#0B1F3A",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {episode.title}
            </div>
            <div
              style={{
                fontSize: 10.5,
                color: "#9CA3AF",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {episode.showName}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onToggle}
          aria-label={isPlaying ? "Pause" : "Play"}
          style={{
            width: 38,
            height: 38,
            borderRadius: 19,
            border: "none",
            background: "#1877D6",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
          }}
        >
          {isPlaying ? (
            <IconPlayerPauseFilled size={16} color="#fff" />
          ) : (
            <IconPlayerPlayFilled size={16} color="#fff" />
          )}
        </button>
        <button
          type="button"
          onClick={onNext}
          aria-label="Next episode"
          style={{
            width: 34,
            height: 34,
            borderRadius: 17,
            border: "none",
            background: "#EFF6FF",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
          }}
        >
          <IconPlayerTrackNextFilled size={15} color="#1877D6" />
        </button>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close player"
          style={{
            width: 28,
            height: 28,
            borderRadius: 14,
            border: "none",
            background: "transparent",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
          }}
        >
          <IconX size={15} color="#9CA3AF" stroke={2} />
        </button>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 2 }}>
        <span style={{ fontSize: 10, color: "#9CA3AF", width: 34 }}>
          {formatClock(currentTime)}
        </span>
        <div style={{ flex: 1 }}>
          <ProgressBar currentTime={currentTime} duration={duration} onSeek={onSeek} />
        </div>
        <span style={{ fontSize: 10, color: "#9CA3AF", width: 34, textAlign: "right" }}>
          {formatClock(duration)}
        </span>
      </div>
    </div>
  );
}

function EpisodeModal({
  episode,
  onClose,
  isCurrent,
  isPlaying,
  currentTime,
  duration,
  onPlay,
  onRestart,
  progressEntry,
  onSeek,
  onNext,
  isSaved,
  onToggleSave,
}: {
  episode: PodcastEpisode;
  onClose: () => void;
  isCurrent: boolean;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  onPlay: () => void;
  onRestart: () => void;
  progressEntry?: EpisodeProgress;
  onSeek: (secs: number) => void;
  onNext: () => void;
  isSaved: boolean;
  onToggleSave: () => void;
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
            <div
              style={{
                background: "#fff",
                border: "1px solid #E4E8EF",
                borderRadius: 14,
                padding: 12,
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              <button
                type="button"
                onClick={onPlay}
                aria-label={isPlaying ? "Pause" : "Play"}
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 26,
                  border: "none",
                  background: "#1877D6",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  boxShadow: "0 3px 8px rgba(24,119,214,0.25)",
                  transform: isPlaying ? "scale(1.05)" : "scale(1)",
                  transition: "transform 0.15s ease",
                }}
              >
                {isPlaying ? (
                  <IconPlayerPauseFilled size={24} color="#fff" />
                ) : (
                  <IconPlayerPlayFilled size={24} color="#fff" />
                )}
              </button>
              <div style={{ flex: 1, minWidth: 0 }}>
                <ProgressBar
                  currentTime={isCurrent ? currentTime : 0}
                  duration={isCurrent ? duration : 0}
                  onSeek={onSeek}
                />
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: 10,
                    color: "#9CA3AF",
                  }}
                >
                  <span>{formatClock(isCurrent ? currentTime : 0)}</span>
                  <span>
                    {formatClock(
                      isCurrent && duration ? duration : (episode.durationSecs ?? 0),
                    )}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={onNext}
                aria-label="Next episode"
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  border: "none",
                  background: "#EFF6FF",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                }}
              >
                <IconPlayerTrackNextFilled size={16} color="#1877D6" />
              </button>
            </div>
            {(() => {
              const finished = isFinished(progressEntry);
              const left = remainingLabel(progressEntry);
              if (!finished && !left) return null;
              return (
                <div
                  style={{
                    marginTop: 8,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 10,
                  }}
                >
                  <span style={{ fontSize: 11, fontWeight: 600, color: finished ? "#16A34A" : "#6B7686" }}>
                    {finished ? "Played" : `Resumes with ${left}`}
                  </span>
                  <button
                    type="button"
                    onClick={onRestart}
                    style={{
                      border: "none",
                      background: "transparent",
                      padding: 0,
                      fontSize: 11,
                      fontWeight: 700,
                      color: "#1877D6",
                      cursor: "pointer",
                      fontFamily: "Poppins, sans-serif",
                    }}
                  >
                    Start from beginning
                  </button>
                </div>
              );
            })()}
            <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
              <button
                type="button"
                onClick={onToggleSave}
                aria-label={isSaved ? "Remove from saved" : "Save episode"}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  border: `1px solid ${isSaved ? "#1877D6" : "#E4E8EF"}`,
                  borderRadius: 8,
                  background: isSaved ? "#EFF6FF" : "#fff",
                  color: isSaved ? "#1877D6" : "#6B7686",
                  padding: "6px 10px",
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer",
                  ...POPPINS,
                }}
              >
                {isSaved ? (
                  <IconBookmarkFilled size={18} color="#1877D6" />
                ) : (
                  <IconBookmark size={18} stroke={1.5} />
                )}
                {isSaved ? "Saved" : "Save"}
              </button>
              <button
                type="button"
                onClick={() => handleShareEpisode(episode)}
                aria-label="Share episode"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  border: "1px solid #1877D6",
                  borderRadius: 8,
                  background: "#fff",
                  color: "#1877D6",
                  padding: "6px 10px",
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer",
                  ...POPPINS,
                }}
              >
                <IconShare size={18} stroke={1.5} />
                Share
              </button>
            </div>
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

function EpisodeCard({
  ep,
  isOpen,
  onOpen,
  isCurrent,
  isPlaying,
  onPlay,
  progressEntry,
  isSaved,
  onToggleSave,
}: {
  ep: PodcastEpisode;
  isOpen: boolean;
  onOpen: () => void;
  isCurrent: boolean;
  isPlaying: boolean;
  onPlay: () => void;
  progressEntry?: EpisodeProgress;
  isSaved: boolean;
  onToggleSave: () => void;
}) {
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
        onClick={() => onOpen()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") onOpen();
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
        {isSaved ? (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 3,
              marginLeft: 6,
              verticalAlign: "middle",
              background: "#EFF6FF",
              color: "#1877D6",
              borderRadius: 6,
              padding: "2px 6px",
              fontSize: 10,
              fontWeight: 700,
              marginBottom: 5,
            }}
          >
            <IconBookmarkFilled size={10} color="#1877D6" />
            Saved
          </span>
        ) : null}
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
          {(() => {
            const entry = progressEntry;
            const finished = isFinished(entry);
            const left = remainingLabel(entry);
            if (!finished && !left) return null;
            const pct =
              entry && entry.duration
                ? Math.min(100, Math.round((entry.position / entry.duration) * 100))
                : 100;
            return (
              <div style={{ marginTop: 6 }}>
                <div
                  style={{
                    height: 3,
                    borderRadius: 2,
                    background: "#E4E8EF",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${pct}%`,
                      height: "100%",
                      background: finished ? "#16A34A" : "#1877D6",
                    }}
                  />
                </div>
                <div
                  style={{
                    marginTop: 3,
                    fontSize: 10,
                    fontWeight: 600,
                    color: finished ? "#16A34A" : "#1877D6",
                  }}
                >
                  {finished ? "Played" : left}
                </div>
              </div>
            );
          })()}
        </div>


        <button
          type="button"
          aria-label={isSaved ? "Remove from saved" : "Save episode"}
          onClick={(e) => {
            e.stopPropagation();
            onToggleSave();
          }}
          style={{
            width: 36,
            height: 36,
            flexShrink: 0,
            borderRadius: 18,
            border: `1px solid ${isSaved ? "#1877D6" : "#E4E8EF"}`,
            background: isSaved ? "#EFF6FF" : "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            alignSelf: "center",
            marginRight: 8,
            cursor: "pointer",
          }}
        >
          {isSaved ? (
            <IconBookmarkFilled size={18} color="#1877D6" />
          ) : (
            <IconBookmark size={18} color="#6B7686" stroke={1.8} />
          )}
        </button>
        <button
          type="button"
          aria-label={
            isCurrent && isPlaying ? "Pause episode" : "Play episode"
          }
          onClick={(e) => {
            e.stopPropagation();
            onPlay();
          }}
          disabled={!ep.audioUrl}
          style={{
            width: 48,
            height: 48,
            flexShrink: 0,
            borderRadius: 24,
            border: "none",
            background: "#1877D6",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            alignSelf: "center",
            cursor: ep.audioUrl ? "pointer" : "not-allowed",
            boxShadow: "0 3px 8px rgba(24,119,214,0.25)",
            opacity: ep.audioUrl ? 1 : 0.5,
            transform: isCurrent ? "scale(1.05)" : "scale(1)",
            transition: "transform 0.15s ease",
          }}
        >
          {isCurrent && isPlaying ? (
            <IconPlayerPauseFilled size={22} color="#fff" />
          ) : (
            <IconPlayerPlayFilled size={22} color="#fff" />
          )}
        </button>
      </div>

    </div>
  );
}

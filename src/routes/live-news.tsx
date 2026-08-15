import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { IconBroadcast, IconChevronRight, IconClock, IconNews } from "@tabler/icons-react";
import InstructorTopBar from "@/components/dsm/InstructorTopBar";
import { supabase } from "@/lib/supabaseClient";
import { formatSessionDate, formatSessionTime, type LiveSession } from "./dsm-live";
import { sanitizeNewsTitle } from "@/lib/newsText";

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
  const [activeTab, setActiveTab] = useState<"live" | "news">("live");
  const [sessions, setSessions] = useState<LiveSession[] | null>(null);
  const [articles, setArticles] = useState<any[] | null>(null);

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

    return () => {
      cancelled = true;
    };
  }, []);

  const activeSession = sessions?.find((s) => s.is_live) ?? null;
  const upcomingSessions = sessions?.filter((s) => !s.is_live) ?? [];
  const allSessions = activeSession ? [activeSession, ...upcomingSessions] : upcomingSessions;

  const tabButton = (key: "live" | "news", label: string, count: number) => {
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
      </div>
    </div>
  );
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

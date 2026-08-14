import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Clock, Newspaper } from "lucide-react";
import { IconBroadcast } from "@tabler/icons-react";
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

function LiveNewsPage() {
  const navigate = useNavigate();
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

  return (
    <div style={{ background: "#DCE4F0", minHeight: "calc(100vh - 80px)", ...POPPINS }}>
      <InstructorTopBar
        firstName=""
        pageTitle="Live & News"
        onBack={() => navigate({ to: "/home" as never })}
        onBell={() => navigate({ to: "/notifications" as never })}
        onPhone={() => navigate({ to: "/enquiries" as never })}
        onLiveTrack={() => navigate({ to: "/live" as never })}
        onMenu={() => navigate({ to: "/more" as never })}
        onMicPress={() => {}}
      />
      <div style={{ height: "calc(60px + env(safe-area-inset-top, 0px))" }} />

      <div style={{ padding: "16px 16px 24px", display: "flex", flexDirection: "column", gap: 24 }}>
        {/* LIVE SECTION */}
        <section>
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: "#9CA3AF",
              textTransform: "uppercase",
              letterSpacing: "0.04em",
              marginBottom: 12,
            }}
          >
            DSM LIVE
          </div>

          {activeSession && (
            <div
              role="button"
              tabIndex={0}
              onClick={() =>
                navigate({
                  to: "/dsm-live/$sessionId",
                  params: { sessionId: activeSession.id },
                })
              }
              style={{
                background: "#CC2229",
                borderRadius: 16,
                padding: 16,
                marginBottom: 8,
                color: "#fff",
                cursor: "pointer",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: "#fff",
                    animation: "dsmLivePulse 1.5s infinite",
                    display: "inline-block",
                  }}
                />
                <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.04em" }}>Live now</span>
              </div>
              <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>{activeSession.title}</div>
              <button
                type="button"
                style={{
                  background: "#fff",
                  color: "#CC2229",
                  border: "none",
                  borderRadius: 999,
                  padding: "8px 16px",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  ...POPPINS,
                }}
              >
                Join session →
              </button>
            </div>
          )}

          {sessions === null ? (
            <div style={{ padding: "24px 0", textAlign: "center", color: "#9CA3AF", fontSize: 13 }}>
              Loading…
            </div>
          ) : upcomingSessions.length === 0 && !activeSession ? (
            <EmptyState message="No live sessions scheduled" />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {upcomingSessions.map((s) => (
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
                    border: "0.5px solid #E3E8F0",
                    borderRadius: 16,
                    padding: 14,
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                    cursor: "pointer",
                  }}
                >
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#1877D6" }}>
                    {formatSessionDate(s.session_date)} · {formatSessionTime(s.session_time)}
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "#0B1F3A" }}>{s.title}</div>
                  {s.category && (
                    <div style={{ fontSize: 11, color: "#9CA3AF", textTransform: "capitalize" }}>
                      {s.category}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* NEWS SECTION */}
        <section>
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: "#9CA3AF",
              textTransform: "uppercase",
              letterSpacing: "0.04em",
              marginBottom: 12,
            }}
          >
            NEWS
          </div>

          {articles === null ? (
            <div style={{ padding: "24px 0", textAlign: "center", color: "#9CA3AF", fontSize: 13 }}>
              Loading…
            </div>
          ) : articles.length === 0 ? (
            <EmptyState message="No news yet" />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
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
                    display: "flex",
                    gap: 12,
                    background: "#fff",
                    border: "1px solid #E3E8F0",
                    borderRadius: 16,
                    padding: 12,
                    cursor: "pointer",
                  }}
                >
                  <div
                    style={{
                      width: 78,
                      height: 78,
                      borderRadius: 12,
                      flexShrink: 0,
                      overflow: "hidden",
                      background: a.image_url ? undefined : "#0B1F3A",
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
                      <Newspaper size={24} color="#FFFFFF" />
                    )}
                  </div>

                  <div
                    style={{
                      flex: 1,
                      minWidth: 0,
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                    }}
                  >
                    <div
                      style={{
                        fontSize: 15,
                        fontWeight: 700,
                        color: "#0B1F3A",
                        lineHeight: 1.25,
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                        marginBottom: 6,
                      }}
                    >
                      {sanitizeNewsTitle(a.title)}
                    </div>
                    {(() => {
                      const isOfficial = String(a.category ?? "").toLowerCase() === "official";
                      return (
                        <div
                          style={{
                            display: "inline-flex",
                            background: isOfficial ? "#0B1F3A" : "#E7F1FC",
                            color: isOfficial ? "#FFFFFF" : "#1877D6",
                            fontSize: 11,
                            fontWeight: 700,
                            textTransform: "uppercase",
                            letterSpacing: "0.3px",
                            borderRadius: 20,
                            padding: "5px 11px",
                            alignSelf: "flex-start",
                            marginBottom: 6,
                          }}
                        >
                          {a.category || a.source || "News"}
                        </div>
                      );
                    })()}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        fontSize: 11,
                        color: "#9CA3AF",
                      }}
                    >
                      <Clock size={11} />
                      <span>{a.read_time_mins ? `${a.read_time_mins} min` : "—"}</span>
                      <span>·</span>
                      <span>{formatDate(a.published_at)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <style>{`
        @keyframes dsmLivePulse {
          0% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.3); }
          100% { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #E3E8F0",
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

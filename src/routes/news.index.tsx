import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { IconChevronLeft, IconClock, IconNews } from "@tabler/icons-react";
import { sanitizeNewsTitle } from "../lib/newsText";
import { supabase } from "../lib/supabaseClient";
import { PageLayout } from "@/components/PageLayout";

export const Route = createFileRoute("/news/")({
  head: () => ({
    meta: [
      { title: "Industry news — DSM by EveryDriver" },
      { name: "description", content: "Driving industry news and official updates." },
    ],
  }),
  component: NewsIndexPage,
});

const POPPINS = { fontFamily: "Poppins, sans-serif" } as const;
const INTER = { fontFamily: "Poppins, sans-serif" } as const;

function formatDate(iso: string | null | undefined) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

const FILTERS: { key: "all" | "official" | "industry"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "official", label: "Official" },
  { key: "industry", label: "Industry" },
];

function NewsIndexPage() {
  const navigate = useNavigate();
  const [articles, setArticles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "official" | "industry">("all");

  useEffect(() => {
    supabase
      .from("news_articles")
      .select(
        "id, title, description, image_url, published_at, read_time_mins, source, category, link"
      )
      .eq("is_hidden", false)
      .order("published_at", { ascending: false })
      .limit(50)
      .then(({ data }) => {
        setArticles(data ?? []);
        setLoading(false);
      });
  }, []);

  const filtered =
    filter === "all" ? articles : articles.filter((a) => a.category === filter);

  return (
    <PageLayout style={{ background: "#DCE4F0" }}>
      {/* Header */}
      <div
        className="flex items-center px-4"
        style={{
          gap: 12,
          height: "calc(60px + env(safe-area-inset-top, 0px))",
          paddingTop: "env(safe-area-inset-top, 0px)",
          backgroundColor: "#0B1F3A",
          borderRadius: "0 0 28px 28px",
        }}
      >
        <button
          type="button"
          aria-label="Back"
          onClick={() => navigate({ to: "/home" })}
          className="flex items-center justify-center"
          style={{
            width: 34,
            height: 34,
            borderRadius: 999,
            flexShrink: 0,
            border: "none",
            background: "rgba(255,255,255,0.08)",
            color: "#FFFFFF",
            cursor: "pointer",
          }}
        >
          <IconChevronLeft size={20} />
        </button>
        <span
          className="text-white"
          style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.4px", ...POPPINS }}
        >
          Industry news
        </span>
      </div>


      {/* Filter chips */}
      <div
        style={{
          display: "flex",
          gap: 8,
          padding: "12px 16px",
          borderBottom: "0.5px solid #E4E8EF",
          background: "#DCE4F0",
        }}
      >
        {FILTERS.map((f) => {
          const active = filter === f.key;
          return (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              style={{
                fontSize: 12,
                fontWeight: 600,
                fontFamily: "Poppins, sans-serif",
                borderRadius: 20,
                padding: "6px 14px",
                border: "none",
                cursor: "pointer",
                background: active ? "#1877D6" : "#F1F5F9",
                color: active ? "#FFFFFF" : "#5B6472",
              }}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      {/* Article list */}
      <div style={{ flex: 1, overflow: "auto" }}>
        {loading ? (
          <div
            className="flex items-center justify-center"
            style={{ minHeight: "60vh" }}
          >
            <div
              className="animate-spin rounded-full border-2 border-[#0B1F3A]/30 border-t-[#0B1F3A]"
              style={{ width: 32, height: 32 }}
            />
          </div>
        ) : filtered.length === 0 ? (
          <div
            className="flex items-center justify-center"
            style={{ minHeight: "60vh", padding: 24 }}
          >
            <p style={{ fontSize: 14, color: "#9CA3AF", ...POPPINS }}>
              No articles yet
            </p>
          </div>
        ) : (
          <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: 8 }}>
            {filtered.map((a) => (
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
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    navigate({
                      to: "/news/$articleId",
                      params: { articleId: a.id },
                    });
                  }
                }}
                style={{
                  display: "flex",
                  gap: 12,
                  background: "#FFFFFF",
                  border: "1px solid #E3E8F0",
                  borderRadius: 16,
                  padding: 12,
                  cursor: "pointer",
                }}
              >
                {/* Thumbnail */}
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
                    <IconNews size={24} color="#FFFFFF" />
                  )}
                </div>

                {/* Content */}
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
                      fontSize: 16.5,
                      fontWeight: 800,
                      color: "#0B1F3A",
                      fontFamily: "Poppins, sans-serif",
                      letterSpacing: "-0.2px",
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
                          marginBottom: 8,
                          background: isOfficial ? "#0B1F3A" : "#E7F1FC",
                          color: isOfficial ? "#FFFFFF" : "#1877D6",
                          fontSize: 11,
                          fontWeight: 800,
                          fontFamily: "Poppins, sans-serif",
                          textTransform: "uppercase",
                          letterSpacing: "0.3px",
                          borderRadius: 20,
                          padding: "5px 11px",
                          alignSelf: "flex-start",
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
                      justifyContent: "space-between",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        fontSize: 11,
                        color: "#9CA3AF",
                        ...INTER,
                      }}
                    >
                      <IconClock size={11} />
                      <span>{a.read_time_mins ? `${a.read_time_mins} min` : "—"}</span>
                      <span>·</span>
                      <span>{formatDate(a.published_at)}</span>
                    </div>
                    <span
                      style={{
                        background: "#1877D6",
                        color: "#fff",
                        fontSize: 12,
                        fontWeight: 600,
                        fontFamily: "Poppins, sans-serif",
                        padding: "8px 15px",
                        borderRadius: 9,
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      Read <span style={{ fontSize: 14 }}>›</span>
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </PageLayout>
  );
}

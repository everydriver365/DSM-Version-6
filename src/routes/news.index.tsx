import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ChevronLeft, Clock, Newspaper } from "lucide-react";
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
const INTER = { fontFamily: "Inter, sans-serif" } as const;

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
    <PageLayout style={{ background: "#FFFFFF" }}>
      {/* Header */}
      <div
        className="flex items-center justify-between px-4"
        style={{
          height: "calc(60px + env(safe-area-inset-top, 0px))",
          paddingTop: "env(safe-area-inset-top, 0px)",
          backgroundColor: "#0B1F3A",
        }}
      >
        <button
          type="button"
          aria-label="Back"
          onClick={() => navigate({ to: "/home" })}
          className="flex items-center justify-center"
          style={{ width: 36, height: 36, color: "#FFFFFF" }}
        >
          <ChevronLeft size={28} />
        </button>
        <span
          className="text-white"
          style={{ fontSize: 15, fontWeight: 600, ...POPPINS }}
        >
          Industry news
        </span>
        <div style={{ width: 36 }} />
      </div>

      {/* Filter chips */}
      <div
        style={{
          display: "flex",
          gap: 8,
          padding: "12px 16px",
          borderBottom: "0.5px solid #E4E8EF",
          background: "#FFFFFF",
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
          filtered.map((a) => (
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
                padding: "14px 16px",
                borderBottom: "0.5px solid #E4E8EF",
                cursor: "pointer",
                background: "#FFFFFF",
              }}
            >
              {/* Thumbnail */}
              <div
                style={{
                  width: 64,
                  height: 64,
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
                  <Newspaper size={20} color="#FFFFFF" />
                )}
              </div>

              {/* Content */}
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
                    display: "inline-flex",
                    marginBottom: 4,
                    background: "#E6F1FB",
                    color: "#1877D6",
                    fontSize: 9,
                    fontWeight: 700,
                    fontFamily: "Poppins, sans-serif",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    borderRadius: 20,
                    padding: "2px 7px",
                    alignSelf: "flex-start",
                  }}
                >
                  {a.source || "News"}
                </div>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: "#0B1F3A",
                    fontFamily: "Poppins, sans-serif",
                    lineHeight: 1.35,
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                    margin: "4px 0",
                  }}
                >
                  {a.title}
                </div>
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
                  <Clock size={11} />
                  <span>{a.read_time_mins ? `${a.read_time_mins} min` : "—"}</span>
                  <span>·</span>
                  <span>{formatDate(a.published_at)}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </PageLayout>
  );
}

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ChevronLeft, ExternalLink, User, Clock, Calendar } from "lucide-react";
import { IconNews, IconChevronRight } from "@tabler/icons-react";
import { sanitizeNewsTitle } from "../lib/newsText";
import { supabase } from "../lib/supabaseClient";
import { PageLayout } from "@/components/PageLayout";

export const Route = createFileRoute("/news/$articleId")({
  head: () => ({
    meta: [{ title: "Industry news — DSM by EveryDriver" }],
  }),
  component: NewsArticlePage,
});

const POPPINS = { fontFamily: "Poppins, sans-serif" } as const;
const INTER = { fontFamily: "Poppins, sans-serif" } as const;

function formatDate(iso: string | null | undefined) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function cleanContent(raw: string): string {
  if (!raw) return "";
  return raw
    .split("\n")
    .filter((line) => {
      const trimmed = line.trim();
      if (!trimmed) return true;
      if (/^https?:\/\/\S+$/.test(trimmed)) return false;
      if (trimmed.length < 3) return false;
      const navTerms = [
        "skip to main content",
        "gov.uk",
        "home",
        "search",
        "menu",
        "navigation",
        "cookie",
        "accept",
        "reject",
        "sign in",
        "log in",
      ];
      if (navTerms.some((t) => trimmed.toLowerCase() === t)) return false;
      return true;
    })
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}


function NewsArticlePage() {
  const { articleId } = Route.useParams();
  const navigate = useNavigate();

  const [article, setArticle] = useState<any>(null);
  const [nextArticle, setNextArticle] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!articleId) return;
    supabase
      .from("news_articles")
      .select("*")
      .eq("id", articleId)
      .single()
      .then(({ data }) => {
        setArticle(data);
        setLoading(false);
      });
  }, [articleId]);

  // After article is loaded, fetch next article
  useEffect(() => {
    if (!article?.published_at) return;
    supabase
      .from("news_articles")
      .select("id, title, source, image_url, published_at, read_time_mins")
      .eq("is_hidden", false)
      .lt("published_at", article.published_at)
      .order("published_at", { ascending: false })
      .limit(1)
      .single()
      .then(({ data }) => {
        if (data) setNextArticle(data);
      });
  }, [article?.published_at]);

  if (loading) {
    return (
      <PageLayout style={{ background: "#0B1F3A" }}>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full border-2 border-white/30 border-t-white" style={{ width: 32, height: 32 }} />
        </div>
      </PageLayout>
    );
  }

  if (!article) {
    return (
      <PageLayout style={{ background: "#0B1F3A" }}>
        <div className="flex flex-col items-center justify-center min-h-screen text-white">
          <p className="text-[16px]" style={{ ...POPPINS, marginBottom: 16 }}>
            Article not found
          </p>
          <button
            type="button"
            onClick={() => navigate({ to: "/home" })}
            className="flex items-center gap-2 text-white"
            style={{ fontSize: 14, ...POPPINS }}
          >
            <ChevronLeft size={18} />
            Back to home
          </button>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout style={{ background: "#F8F9FB" }}>
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
        <button
          type="button"
          aria-label="Open original article"
          title="Open original article"
          onClick={() => window.open(article?.link, "_blank")}
          className="flex items-center justify-center"
          style={{ width: 36, height: 36, color: "#FFFFFF" }}
        >
          <ExternalLink size={22} />
        </button>
      </div>

      {/* Hero image */}
      {article.image_url ? (
        <img
          src={article.image_url}
          alt={article.title}
          style={{ width: "100%", height: 200, objectFit: "cover" }}
        />
      ) : (
        <div
          style={{
            width: "100%",
            height: 200,
            background: "linear-gradient(135deg, #1e3a5f 0%, #0B1F3A 100%)",
          }}
        />
      )}

      {/* Article body */}
      <div style={{ padding: 16, background: "#FFFFFF" }}>
        {/* Source pill */}
        <div
          style={{
            display: "inline-flex",
            backgroundColor: "#E6F1FB",
            color: "#1877D6",
            fontSize: 9,
            fontWeight: 700,
            textTransform: "uppercase",
            borderRadius: 20,
            padding: "3px 8px",
            marginBottom: 10,
            ...INTER,
            letterSpacing: "0.06em",
          }}
        >
          {article.source}
        </div>

        {/* Title */}
        <h1
          style={{
            fontSize: 20,
            fontWeight: 700,
            color: "#0B1F3A",
            marginBottom: 8,
            ...POPPINS,
            lineHeight: 1.3,
          }}
        >
          {article.title}
        </h1>

        {/* Meta row */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 12,
            marginBottom: 16,
            color: "#9CA3AF",
            fontSize: 13,
            ...INTER,
          }}
        >
          {article.author && (
            <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <User size={13} />
              {article.author}
            </span>
          )}
          {article.read_time_mins && (
            <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <Clock size={13} />
              {article.read_time_mins} min read
            </span>
          )}
          <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <Calendar size={13} />
            {formatDate(article.published_at)}
          </span>
        </div>

        {/* Divider */}
        <div style={{ width: "100%", height: 1, backgroundColor: "#E4E8EF", marginBottom: 16 }} />

        {/* Content body */}
        <div
          style={{
            fontSize: 14,
            lineHeight: 1.7,
            color: "#374151",
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
            ...POPPINS,
          }}
        >
          {cleanContent(article.content)}
        </div>

        {/* Attribution footer */}
        <div
          style={{
            marginTop: 24,
            paddingTop: 16,
            borderTop: "1px solid #E4E8EF",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span style={{ fontSize: 12, color: "#9CA3AF", ...INTER }}>
            Source: {article.source}
          </span>
          <button
            type="button"
            aria-label="Open original article"
            onClick={() => window.open(article.link, "_blank")}
            style={{ color: "#1877D6", display: "flex", alignItems: "center", gap: 4 }}
          >
            <ExternalLink size={14} />
          </button>
        </div>

        {/* Next article */}
        {nextArticle && (
          <div
            onClick={() =>
              navigate({
                to: "/news/$articleId",
                params: { articleId: nextArticle.id },
              })
            }
            style={{
              marginTop: 24,
              borderTop: "0.5px solid #E4E8EF",
              paddingTop: 16,
              cursor: "pointer",
            }}
          >
            {/* Label */}
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                textTransform: "uppercase",
                color: "#1877D6",
                letterSpacing: "0.06em",
                marginBottom: 12,
                ...INTER,
              }}
            >
              Next article
            </div>

            {/* Card */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                background: "#F8F9FB",
                borderRadius: 10,
                padding: 12,
                border: "1px solid #E4E8EF",
              }}
            >
              {/* Thumbnail */}
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 8,
                  overflow: "hidden",
                  flexShrink: 0,
                  background: "#E4E8EF",
                }}
              >
                {nextArticle.image_url ? (
                  <img
                    src={nextArticle.image_url}
                    alt={nextArticle.title}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                ) : (
                  <div
                    style={{
                      width: "100%",
                      height: "100%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#1877D6",
                    }}
                  >
                    <IconNews size={24} />
                  </div>
                )}
              </div>

              {/* Text */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 9,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    color: "#1877D6",
                    letterSpacing: "0.06em",
                    marginBottom: 4,
                    ...INTER,
                  }}
                >
                  {nextArticle.source}
                </div>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: "#0B1F3A",
                    lineHeight: 1.3,
                    marginBottom: 4,
                    ...POPPINS,
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  }}
                >
                  {nextArticle.title}
                </div>
                <div style={{ fontSize: 11, color: "#9CA3AF", ...INTER }}>
                  {nextArticle.read_time_mins} min read
                </div>
              </div>

              {/* Chevron */}
              <div style={{ color: "#1877D6", flexShrink: 0 }}>
                <IconChevronRight size={20} />
              </div>
            </div>
          </div>
        )}
      </div>
    </PageLayout>
  );
}

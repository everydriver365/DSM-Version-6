import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ChevronLeft, ExternalLink, User, Clock, Calendar } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { PageLayout } from "@/components/PageLayout";

export const Route = createFileRoute("/news/$articleId")({
  head: () => ({
    meta: [{ title: "Industry news — DSM by EveryDriver" }],
  }),
  component: NewsArticlePage,
});

const POPPINS = { fontFamily: "Poppins, sans-serif" } as const;
const INTER = { fontFamily: "Inter, sans-serif" } as const;

function formatDate(iso: string | null | undefined) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function NewsArticlePage() {
  const { articleId } = Route.useParams();
  const navigate = useNavigate();

  const [article, setArticle] = useState<any>(null);
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
          {article.content}
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
      </div>
    </PageLayout>
  );
}

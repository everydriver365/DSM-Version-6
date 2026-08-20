import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { IconAlertTriangle, IconChevronLeft, IconClock, IconMapPin, IconNews, IconStar } from "@tabler/icons-react";
import { sanitizeNewsTitle } from "../lib/newsText";
import { supabase } from "../lib/supabaseClient";
import DSMTopSheet from "@/components/dsm/DSMTopSheet";
import {
  NEWS_CATEGORIES,
  categoryOf,
  normaliseCategory,
  type NewsCategoryKey,
} from "@/lib/newsCategories";

export const Route = createFileRoute("/news/")({
  head: () => ({
    meta: [
      { title: "Instructor news & information — DSM by EveryDriver" },
      {
        name: "description",
        content:
          "Curated DVSA, industry, road safety and business news for UK driving instructors, with why-it-matters context.",
      },
      { property: "og:title", content: "Instructor news & information — DSM" },
      {
        property: "og:description",
        content: "Curated DVSA, industry and road safety news for UK driving instructors.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: NewsIndexPage,
});

const POPPINS = { fontFamily: "Poppins, sans-serif" } as const;

type Article = {
  id: string;
  title: string;
  description: string | null;
  summary?: string | null;
  why_matters?: string | null;
  image_url: string | null;
  published_at: string | null;
  read_time_mins: number | null;
  source: string | null;
  extra_sources?: string[] | null;
  category: string | null;
  importance?: string | null;
  tier?: number | null;
  status?: string | null;
  local_area?: string | null;
  link: string | null;
};

function formatDate(iso: string | null | undefined) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

/** Categories shown as rails, in the order the News page presents them. */
const RAIL_ORDER: NewsCategoryKey[] = [
  "dvsa",
  "instructor",
  "tests",
  "road-safety",
  "business",
  "cars-ev",
  "tech-ai",
  "wellbeing",
  "data",
];

function NewsCard({
  article,
  onOpen,
  compact,
}: {
  article: Article;
  onOpen: () => void;
  compact?: boolean;
}) {
  const cat = categoryOf(article.category);
  const important = article.importance === "important";
  const sources = [article.source, ...(article.extra_sources ?? [])].filter(Boolean) as string[];
  const summary = article.summary || article.description || "";

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onOpen();
      }}
      style={{
        display: "flex",
        gap: 12,
        background: "#FFFFFF",
        border: important ? "1px solid #F3C0C2" : "1px solid #E3E8F0",
        borderRadius: 8,
        padding: 12,
        cursor: "pointer",
        minWidth: compact ? 268 : undefined,
        maxWidth: compact ? 268 : undefined,
        flexDirection: compact ? "column" : "row",
      }}
    >
      <div
        style={{
          width: compact ? "100%" : 78,
          height: compact ? 96 : 78,
          borderRadius: 8,
          flexShrink: 0,
          overflow: "hidden",
          background: article.image_url ? undefined : "#0B1F3A",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {article.image_url ? (
          <img
            src={article.image_url}
            alt=""
            loading="lazy"
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          <IconNews size={24} color="#FFFFFF" />
        )}
      </div>

      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 6 }}>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <span
            style={{
              background: important ? "#CC2229" : cat.bg,
              color: important ? "#FFFFFF" : cat.colour,
              fontSize: 10,
              fontWeight: 800,
              textTransform: "uppercase",
              letterSpacing: "0.3px",
              borderRadius: 8,
              padding: "4px 9px",
              ...POPPINS,
            }}
          >
            {important ? "🚨 Important" : `${cat.emoji} ${cat.label}`}
          </span>
        </div>

        <div
          style={{
            fontSize: 15.5,
            fontWeight: 800,
            color: "#0B1F3A",
            letterSpacing: "-0.2px",
            lineHeight: 1.25,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
            ...POPPINS,
          }}
        >
          {sanitizeNewsTitle(article.title)}
        </div>

        {summary ? (
          <div
            style={{
              fontSize: 12,
              color: "#5B6472",
              lineHeight: 1.4,
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
              ...POPPINS,
            }}
          >
            {summary}
          </div>
        ) : null}

        {article.why_matters ? (
          <div
            style={{
              background: "#FFF8E7",
              border: "1px solid #F3E3BC",
              borderRadius: 8,
              padding: "6px 9px",
              fontSize: 11.5,
              color: "#7A5B10",
              lineHeight: 1.35,
              ...POPPINS,
            }}
          >
            <strong style={{ fontWeight: 800 }}>Why this matters · </strong>
            {article.why_matters}
          </div>
        ) : null}

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              fontSize: 11,
              color: "#9CA3AF",
              minWidth: 0,
              ...POPPINS,
            }}
          >
            <IconClock size={11} />
            <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {sources.join(" · ") || "News"}
            </span>
            <span>·</span>
            <span style={{ whiteSpace: "nowrap" }}>{formatDate(article.published_at)}</span>
          </div>
          <span
            style={{
              background: "#1877D6",
              color: "#fff",
              fontSize: 12,
              fontWeight: 600,
              padding: "7px 13px",
              borderRadius: 8,
              flexShrink: 0,
              ...POPPINS,
            }}
          >
            Read ›
          </span>
        </div>
      </div>
    </div>
  );
}

function SectionHeading({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div style={{ padding: "4px 0 8px" }}>
      <div style={{ fontSize: 16, fontWeight: 800, color: "#0B1F3A", letterSpacing: "-0.3px", ...POPPINS }}>
        {title}
      </div>
      {subtitle ? (
        <div style={{ fontSize: 11.5, color: "#5B6472", marginTop: 2, ...POPPINS }}>{subtitle}</div>
      ) : null}
    </div>
  );
}

function NewsIndexPage() {
  const navigate = useNavigate();
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | NewsCategoryKey>("all");
  const [interests, setInterests] = useState<{ tests: number; ev: boolean; area: string | null }>({
    tests: 0,
    ev: false,
    area: null,
  });

  useEffect(() => {
    supabase
      .from("news_articles")
      .select(
        "id, title, description, summary, why_matters, image_url, published_at, read_time_mins, source, extra_sources, category, importance, tier, status, local_area, link",
      )
      .eq("is_hidden", false)
      .order("published_at", { ascending: false })
      .limit(120)
      .then(({ data }) => {
        const rows = (data ?? []).filter((a: Article) => (a.status ?? "approved") === "approved");
        setArticles(rows);
        setLoading(false);
      });
  }, []);

  // Personalisation signals — counts only, never pupil detail.
  useEffect(() => {
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;
      if (!userId) return;
      const soon = new Date();
      soon.setDate(soon.getDate() + 60);
      const [tests, vehicle, profile] = await Promise.all([
        supabase
          .from("driving_tests")
          .select("id", { count: "exact", head: true })
          .eq("instructor_id", userId)
          .gte("test_date", new Date().toISOString().slice(0, 10))
          .lte("test_date", soon.toISOString().slice(0, 10)),
        supabase.from("vehicles").select("fuel_type").eq("instructor_id", userId).maybeSingle(),
        supabase.from("instructors").select("city, home_postcode").eq("id", userId).maybeSingle(),
      ]);
      const fuel = String((vehicle.data as { fuel_type?: string } | null)?.fuel_type ?? "").toLowerCase();
      const prof = profile.data as { city?: string | null; home_postcode?: string | null } | null;
      setInterests({
        tests: tests.count ?? 0,
        ev: fuel.includes("electric") || fuel.includes("hybrid"),
        area: prof?.city ?? null,
      });

    })();
  }, []);

  const important = useMemo(
    () => articles.filter((a) => a.importance === "important").slice(0, 4),
    [articles],
  );

  const forYou = useMemo(() => {
    const scored = articles
      .filter((a) => a.importance !== "important")
      .map((a) => {
        const cat = normaliseCategory(a.category);
        let score = 0;
        if (interests.tests > 0 && (cat === "tests" || cat === "dvsa")) score += 3;
        if (interests.ev && cat === "cars-ev") score += 3;
        if (cat === "business") score += 1;
        if (cat === "instructor" || cat === "training") score += 2;
        if ((a.tier ?? 2) === 1) score += 1;
        return { a, score };
      })
      .filter((x) => x.score > 0)
      .sort((x, y) => y.score - x.score);
    return scored.slice(0, 6).map((x) => x.a);
  }, [articles, interests]);

  const localNews = useMemo(() => {
    if (!interests.area) return [];
    const area = interests.area.toLowerCase();
    return articles
      .filter((a) => {
        const hay = `${a.local_area ?? ""} ${a.title} ${a.summary ?? a.description ?? ""}`.toLowerCase();
        return hay.includes(area);
      })
      .slice(0, 4);
  }, [articles, interests.area]);

  const rails = useMemo(() => {
    return RAIL_ORDER.map((key) => ({
      key,
      items: articles.filter((a) => normaliseCategory(a.category) === key).slice(0, 5),
    })).filter((r) => r.items.length > 0);
  }, [articles]);

  const latest = useMemo(
    () => (filter === "all" ? articles : articles.filter((a) => normaliseCategory(a.category) === filter)),
    [articles, filter],
  );

  const open = (id: string) => navigate({ to: "/news/$articleId", params: { articleId: id } });

  const whyForYou = (a: Article) => {
    const cat = normaliseCategory(a.category);
    if (interests.tests > 0 && (cat === "tests" || cat === "dvsa"))
      return `Relevant because you have ${interests.tests} pupil${interests.tests === 1 ? "" : "s"} with a test booked in the next 60 days.`;
    if (interests.ev && cat === "cars-ev") return "Relevant because your tuition vehicle is electric or hybrid.";
    if (cat === "business") return "Relevant to running your driving school.";
    return "Relevant to your work as an instructor.";
  };

  return (
    <DSMTopSheet title="News">
    <div style={{ background: "#DCE4F0", minHeight: "100%" }}>

      {/* Category chips */}
      <div
        style={{
          display: "flex",
          gap: 8,
          padding: "12px 16px",
          overflowX: "auto",
          borderBottom: "0.5px solid #E4E8EF",
          background: "#DCE4F0",
        }}
      >
        {[{ key: "all" as const, emoji: "", label: "All" }, ...NEWS_CATEGORIES].map((f) => {
          const active = filter === f.key;
          return (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key as "all" | NewsCategoryKey)}
              style={{
                fontSize: 12,
                fontWeight: 600,
                whiteSpace: "nowrap",
                borderRadius: 8,
                padding: "6px 14px",
                border: "none",
                cursor: "pointer",
                background: active ? "#1877D6" : "#F1F5F9",
                color: active ? "#FFFFFF" : "#5B6472",
                ...POPPINS,
              }}
            >
              {"emoji" in f && f.emoji ? `${f.emoji} ` : ""}
              {f.label}
            </button>
          );
        })}
      </div>

      <div style={{ flex: 1, overflow: "auto" }}>
        {loading ? (
          <div className="flex items-center justify-center" style={{ minHeight: "60vh" }}>
            <div
              className="animate-spin rounded-full border-2 border-[#0B1F3A]/30 border-t-[#0B1F3A]"
              style={{ width: 32, height: 32 }}
            />
          </div>
        ) : articles.length === 0 ? (
          <div className="flex items-center justify-center" style={{ minHeight: "60vh", padding: 24 }}>
            <p style={{ fontSize: 14, color: "#9CA3AF", ...POPPINS }}>No articles yet</p>
          </div>
        ) : (
          <div style={{ padding: "16px 16px 40px", display: "flex", flexDirection: "column", gap: 18 }}>
            {/* Important for instructors */}
            {filter === "all" && important.length > 0 ? (
              <section>
                <SectionHeading
                  title="🚨 Important for instructors"
                  subtitle="Official changes that need your attention"
                />
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {important.map((a) => (
                    <NewsCard key={a.id} article={a} onOpen={() => open(a.id)} />
                  ))}
                </div>
              </section>
            ) : null}

            {/* For you */}
            {filter === "all" && forYou.length > 0 ? (
              <section>
                <SectionHeading title="⭐ For you" subtitle="Picked from your DSM activity" />
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {forYou.map((a) => (
                    <div key={a.id}>
                      <NewsCard article={a} onOpen={() => open(a.id)} />
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          fontSize: 11,
                          color: "#5B6472",
                          padding: "6px 4px 0",
                          ...POPPINS,
                        }}
                      >
                        <IconStar size={12} color="#B8860B" />
                        {whyForYou(a)}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            {/* Category rails */}
            {filter === "all"
              ? rails.map((rail) => {
                  const cat = categoryOf(rail.key);
                  return (
                    <section key={rail.key}>
                      <SectionHeading title={`${cat.emoji} ${cat.label}`} />
                      <div
                        style={{
                          display: "flex",
                          gap: 10,
                          overflowX: "auto",
                          paddingBottom: 4,
                          scrollSnapType: "x mandatory",
                        }}
                      >
                        {rail.items.map((a) => (
                          <div key={a.id} style={{ scrollSnapAlign: "start" }}>
                            <NewsCard article={a} onOpen={() => open(a.id)} compact />
                          </div>
                        ))}
                      </div>
                    </section>
                  );
                })
              : null}

            {/* Local news — policy / test centres / campaigns, never live traffic */}
            {filter === "all" && localNews.length > 0 ? (
              <section>
                <SectionHeading
                  title="📍 Local news"
                  subtitle={`Around ${interests.area} — live road conditions stay in Road Alerts`}
                />
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {localNews.map((a) => (
                    <NewsCard key={a.id} article={a} onOpen={() => open(a.id)} />
                  ))}
                </div>
              </section>
            ) : null}

            {/* Road alerts pointer */}
            {filter === "all" ? (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  background: "#FFF3F3",
                  border: "1px solid #F3C0C2",
                  borderRadius: 8,
                  padding: "12px 14px",
                  ...POPPINS,
                }}
              >
                <IconAlertTriangle size={18} color="#CC2229" />
                <span style={{ fontSize: 12.5, color: "#0B1F3A", fontWeight: 600 }}>
                  Live traffic, closures and incidents live in Road Alerts
                </span>
                <IconMapPin size={16} color="#CC2229" style={{ marginLeft: "auto" }} />
              </div>

            ) : null}

            {/* Latest */}
            <section>
              <SectionHeading title={filter === "all" ? "Latest" : `${categoryOf(filter).emoji} ${categoryOf(filter).label}`} />
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {latest.length === 0 ? (
                  <p style={{ fontSize: 13, color: "#9CA3AF", ...POPPINS }}>Nothing here yet</p>
                ) : (
                  latest.slice(0, 40).map((a) => (
                    <NewsCard key={a.id} article={a} onOpen={() => open(a.id)} />
                  ))
                )}
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
    </DSMTopSheet>
  );
}

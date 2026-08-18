import { useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  IconEye,
  IconEyeOff,
  IconPlus,
  IconStar,
  IconTrash,
  IconX,
} from "@tabler/icons-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/dsm/PageHeader";
import { PageLoader } from "@/components/dsm/LoadingSpinner";
import { supabase } from "@/lib/supabaseClient";
import { useAdminGate } from "./admin";
import { NEWS_CATEGORIES, categoryOf } from "@/lib/newsCategories";
import { LEARN_LIBRARY } from "@/lib/learnLibrary";
import { PODCAST_SHOWS } from "@/lib/podcasts";

export const Route = createFileRoute("/admin/news")({
  component: AdminNews,
});

const POPPINS = { fontFamily: "Poppins, sans-serif" } as const;

type Source = {
  id: string;
  name: string;
  url: string;
  feed_url: string | null;
  kind: string;
  tier: number;
  default_category: string;
  requires_approval: boolean;
  enabled: boolean;
  priority: number;
};

type Article = {
  id: string;
  title: string;
  summary: string | null;
  description: string | null;
  why_matters: string | null;
  category: string | null;
  importance: string | null;
  status: string | null;
  is_hidden: boolean | null;
  is_featured: boolean | null;
  display_order: number | null;
  related_learn_id: string | null;
  related_podcast_show: string | null;
  source: string | null;
  published_at: string | null;
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  border: "1px solid #E3E8F0",
  borderRadius: 8,
  padding: "9px 11px",
  fontSize: 13,
  color: "#0B1F3A",
  background: "#fff",
  ...POPPINS,
};

const labelStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  color: "#5B6472",
  marginBottom: 4,
  display: "block",
  ...POPPINS,
};

function AdminNews() {
  const status = useAdminGate();
  const navigate = useNavigate();
  const [tab, setTab] = useState<"sources" | "articles">("sources");
  const [sources, setSources] = useState<Source[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<Source> | null>(null);
  const [editArticle, setEditArticle] = useState<Article | null>(null);
  const [articleFilter, setArticleFilter] = useState<"all" | "pending" | "important">("all");

  const load = async () => {
    setLoading(true);
    const [s, a] = await Promise.all([
      supabase.from("news_sources").select("*").order("priority", { ascending: true }),
      supabase
        .from("news_articles")
        .select(
          "id, title, summary, description, why_matters, category, importance, status, is_hidden, is_featured, display_order, related_learn_id, related_podcast_show, source, published_at",
        )
        .order("published_at", { ascending: false })
        .limit(150),
    ]);
    setSources((s.data as Source[]) ?? []);
    setArticles((a.data as Article[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    if (status === "allowed") void load();
  }, [status]);

  const saveSource = async () => {
    if (!editing?.name || !editing?.url) {
      toast.error("Name and URL are required");
      return;
    }
    const payload = {
      name: editing.name,
      url: editing.url,
      feed_url: editing.feed_url || null,
      kind: editing.kind ?? "rss",
      tier: Number(editing.tier ?? 2),
      default_category: editing.default_category ?? "general",
      requires_approval: !!editing.requires_approval,
      enabled: editing.enabled ?? true,
      priority: Number(editing.priority ?? 100),
    };
    const res = editing.id
      ? await supabase.from("news_sources").update(payload).eq("id", editing.id)
      : await supabase.from("news_sources").insert(payload);
    if (res.error) {
      toast.error(res.error.message);
      return;
    }
    toast.success("Source saved");
    setEditing(null);
    void load();
  };

  const patchSource = async (id: string, patch: Partial<Source>) => {
    const { error } = await supabase.from("news_sources").update(patch).eq("id", id);
    if (error) return toast.error(error.message);
    setSources((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  };

  const removeSource = async (id: string) => {
    const { error } = await supabase.from("news_sources").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setSources((prev) => prev.filter((s) => s.id !== id));
  };

  const patchArticle = async (id: string, patch: Partial<Article>) => {
    const { error } = await supabase.from("news_articles").update(patch).eq("id", id);
    if (error) return toast.error(error.message);
    setArticles((prev) => prev.map((a) => (a.id === id ? { ...a, ...patch } : a)));
  };

  const filteredArticles = useMemo(() => {
    if (articleFilter === "pending") return articles.filter((a) => a.status === "pending");
    if (articleFilter === "important") return articles.filter((a) => a.importance === "important");
    return articles;
  }, [articles, articleFilter]);

  if (status === "checking") return <PageLoader />;
  if (status === "denied") {
    return (
      <div style={{ padding: 24, ...POPPINS }}>
        <p style={{ fontWeight: 700, color: "#0B1F3A" }}>Admin access required</p>
        <button type="button" onClick={() => navigate({ to: "/home" })} style={{ color: "#1877D6" }}>
          Back to home
        </button>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#DCE4F0", paddingBottom: 40 }}>
      <PageHeader title="News" onBack={() => navigate({ to: "/admin" })} />

      <div style={{ display: "flex", gap: 8, padding: "12px 16px" }}>
        {(["sources", "articles"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            style={{
              flex: 1,
              padding: "9px 12px",
              borderRadius: 8,
              border: "none",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 700,
              background: tab === t ? "#0B1F3A" : "#FFFFFF",
              color: tab === t ? "#FFFFFF" : "#5B6472",
              ...POPPINS,
            }}
          >
            {t === "sources" ? "Sources" : "Articles"}
          </button>
        ))}
      </div>

      {loading ? (
        <PageLoader />
      ) : tab === "sources" ? (
        <div style={{ padding: "0 16px", display: "flex", flexDirection: "column", gap: 10 }}>
          <button
            type="button"
            onClick={() =>
              setEditing({ kind: "rss", tier: 2, default_category: "general", enabled: true, priority: 100 })
            }
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              background: "#1877D6",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              padding: "11px 14px",
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              ...POPPINS,
            }}
          >
            <IconPlus size={16} /> Add source
          </button>

          {sources.map((s) => (
            <div
              key={s.id}
              style={{
                background: "#fff",
                border: "1px solid #E3E8F0",
                borderRadius: 8,
                padding: 12,
                opacity: s.enabled ? 1 : 0.55,
                ...POPPINS,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 14, fontWeight: 800, color: "#0B1F3A", flex: 1, minWidth: 0 }}>
                  {s.name}
                </span>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 800,
                    background: "#EEF2F7",
                    color: "#334155",
                    borderRadius: 8,
                    padding: "3px 8px",
                  }}
                >
                  Tier {s.tier}
                </span>
                <button
                  type="button"
                  aria-label={s.enabled ? "Disable source" : "Enable source"}
                  onClick={() => patchSource(s.id, { enabled: !s.enabled })}
                  style={{ color: "#1877D6", background: "none", border: "none", cursor: "pointer" }}
                >
                  {s.enabled ? <IconEye size={18} /> : <IconEyeOff size={18} />}
                </button>
                <button
                  type="button"
                  aria-label="Delete source"
                  onClick={() => removeSource(s.id)}
                  style={{ color: "#CC2229", background: "none", border: "none", cursor: "pointer" }}
                >
                  <IconTrash size={17} />
                </button>
              </div>
              <div style={{ fontSize: 11, color: "#5B6472", marginTop: 4, wordBreak: "break-all" }}>
                {s.feed_url || s.url}
              </div>
              <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
                <span style={{ fontSize: 11, color: "#0B1F3A", fontWeight: 700 }}>
                  {categoryOf(s.default_category).emoji} {categoryOf(s.default_category).label}
                </span>
                <span style={{ fontSize: 11, color: "#9CA3AF" }}>· priority {s.priority}</span>
                {s.requires_approval ? (
                  <span style={{ fontSize: 11, color: "#B8860B", fontWeight: 700 }}>· needs approval</span>
                ) : null}
                <button
                  type="button"
                  onClick={() => setEditing(s)}
                  style={{
                    marginLeft: "auto",
                    fontSize: 12,
                    fontWeight: 700,
                    color: "#1877D6",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  Edit
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ padding: "0 16px", display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", gap: 8 }}>
            {(["all", "pending", "important"] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setArticleFilter(f)}
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  borderRadius: 8,
                  padding: "6px 14px",
                  border: "none",
                  cursor: "pointer",
                  background: articleFilter === f ? "#1877D6" : "#FFFFFF",
                  color: articleFilter === f ? "#fff" : "#5B6472",
                  ...POPPINS,
                }}
              >
                {f[0]!.toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>

          {filteredArticles.map((a) => (
            <div
              key={a.id}
              style={{
                background: "#fff",
                border: "1px solid #E3E8F0",
                borderRadius: 8,
                padding: 12,
                opacity: a.is_hidden ? 0.5 : 1,
                ...POPPINS,
              }}
            >
              <div style={{ fontSize: 13.5, fontWeight: 800, color: "#0B1F3A", lineHeight: 1.3 }}>
                {a.title}
              </div>
              <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 3 }}>
                {a.source} · {categoryOf(a.category).label} · {a.status ?? "approved"}
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                {a.status === "pending" ? (
                  <>
                    <button
                      type="button"
                      onClick={() => patchArticle(a.id, { status: "approved" })}
                      style={{ fontSize: 12, fontWeight: 700, color: "#0F9D58", background: "none", border: "none", cursor: "pointer" }}
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      onClick={() => patchArticle(a.id, { status: "rejected" })}
                      style={{ fontSize: 12, fontWeight: 700, color: "#CC2229", background: "none", border: "none", cursor: "pointer" }}
                    >
                      Reject
                    </button>
                  </>
                ) : null}
                <button
                  type="button"
                  onClick={() =>
                    patchArticle(a.id, {
                      importance: a.importance === "important" ? "normal" : "important",
                    })
                  }
                  style={{ fontSize: 12, fontWeight: 700, color: a.importance === "important" ? "#CC2229" : "#5B6472", background: "none", border: "none", cursor: "pointer" }}
                >
                  {a.importance === "important" ? "Important ✓" : "Mark important"}
                </button>
                <button
                  type="button"
                  onClick={() => patchArticle(a.id, { is_featured: !a.is_featured })}
                  style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 700, color: a.is_featured ? "#B8860B" : "#5B6472", background: "none", border: "none", cursor: "pointer" }}
                >
                  <IconStar size={14} /> Feature
                </button>
                <button
                  type="button"
                  onClick={() => patchArticle(a.id, { is_hidden: !a.is_hidden })}
                  style={{ fontSize: 12, fontWeight: 700, color: "#5B6472", background: "none", border: "none", cursor: "pointer" }}
                >
                  {a.is_hidden ? "Unhide" : "Hide"}
                </button>
                <button
                  type="button"
                  onClick={() => setEditArticle(a)}
                  style={{ marginLeft: "auto", fontSize: 12, fontWeight: 700, color: "#1877D6", background: "none", border: "none", cursor: "pointer" }}
                >
                  Edit
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Source editor */}
      {editing ? (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(11,31,58,0.45)",
            display: "flex",
            alignItems: "flex-end",
            zIndex: 60,
          }}
          onClick={() => setEditing(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              background: "#fff",
              borderRadius: "8px 8px 0 0",
              padding: 16,
              maxHeight: "88vh",
              overflowY: "auto",
              ...POPPINS,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", marginBottom: 12 }}>
              <span style={{ fontSize: 16, fontWeight: 800, color: "#0B1F3A", flex: 1 }}>
                {editing.id ? "Edit source" : "Add source"}
              </span>
              <button type="button" aria-label="Close" onClick={() => setEditing(null)} style={{ background: "none", border: "none", cursor: "pointer" }}>
                <IconX size={20} color="#5B6472" />
              </button>
            </div>

            <label style={labelStyle}>Name</label>
            <input style={inputStyle} value={editing.name ?? ""} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />

            <label style={{ ...labelStyle, marginTop: 10 }}>Website URL</label>
            <input style={inputStyle} value={editing.url ?? ""} onChange={(e) => setEditing({ ...editing, url: e.target.value })} />

            <label style={{ ...labelStyle, marginTop: 10 }}>Feed URL (RSS/Atom)</label>
            <input style={inputStyle} value={editing.feed_url ?? ""} onChange={(e) => setEditing({ ...editing, feed_url: e.target.value })} />

            <label style={{ ...labelStyle, marginTop: 10 }}>Default category</label>
            <select
              style={inputStyle}
              value={editing.default_category ?? "general"}
              onChange={(e) => setEditing({ ...editing, default_category: e.target.value })}
            >
              {NEWS_CATEGORIES.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.emoji} {c.label}
                </option>
              ))}
            </select>

            <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Tier</label>
                <select style={inputStyle} value={editing.tier ?? 2} onChange={(e) => setEditing({ ...editing, tier: Number(e.target.value) })}>
                  <option value={1}>1 — Official</option>
                  <option value={2}>2 — Industry</option>
                  <option value={3}>3 — Motoring</option>
                  <option value={4}>4 — Social</option>
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Priority</label>
                <input
                  type="number"
                  style={inputStyle}
                  value={editing.priority ?? 100}
                  onChange={(e) => setEditing({ ...editing, priority: Number(e.target.value) })}
                />
              </div>
            </div>

            <label style={{ ...labelStyle, marginTop: 10, display: "flex", alignItems: "center", gap: 8 }}>
              <input
                type="checkbox"
                checked={!!editing.requires_approval}
                onChange={(e) => setEditing({ ...editing, requires_approval: e.target.checked })}
              />
              Imported items need admin approval
            </label>
            <label style={{ ...labelStyle, display: "flex", alignItems: "center", gap: 8 }}>
              <input
                type="checkbox"
                checked={editing.enabled ?? true}
                onChange={(e) => setEditing({ ...editing, enabled: e.target.checked })}
              />
              Enabled
            </label>

            <button
              type="button"
              onClick={saveSource}
              style={{
                marginTop: 14,
                width: "100%",
                background: "#1877D6",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                padding: "12px 16px",
                fontSize: 14,
                fontWeight: 700,
                cursor: "pointer",
                ...POPPINS,
              }}
            >
              Save source
            </button>
          </div>
        </div>
      ) : null}

      {/* Article editor */}
      {editArticle ? (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(11,31,58,0.45)",
            display: "flex",
            alignItems: "flex-end",
            zIndex: 60,
          }}
          onClick={() => setEditArticle(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              background: "#fff",
              borderRadius: "8px 8px 0 0",
              padding: 16,
              maxHeight: "88vh",
              overflowY: "auto",
              ...POPPINS,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", marginBottom: 12 }}>
              <span style={{ fontSize: 16, fontWeight: 800, color: "#0B1F3A", flex: 1 }}>Edit article</span>
              <button type="button" aria-label="Close" onClick={() => setEditArticle(null)} style={{ background: "none", border: "none", cursor: "pointer" }}>
                <IconX size={20} color="#5B6472" />
              </button>
            </div>

            <label style={labelStyle}>Category</label>
            <select
              style={inputStyle}
              value={editArticle.category ?? "general"}
              onChange={(e) => setEditArticle({ ...editArticle, category: e.target.value })}
            >
              {NEWS_CATEGORIES.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.emoji} {c.label}
                </option>
              ))}
            </select>

            <label style={{ ...labelStyle, marginTop: 10 }}>Short summary</label>
            <textarea
              style={{ ...inputStyle, minHeight: 70 }}
              value={editArticle.summary ?? ""}
              onChange={(e) => setEditArticle({ ...editArticle, summary: e.target.value })}
            />

            <label style={{ ...labelStyle, marginTop: 10 }}>Why this matters</label>
            <textarea
              style={{ ...inputStyle, minHeight: 70 }}
              value={editArticle.why_matters ?? ""}
              onChange={(e) => setEditArticle({ ...editArticle, why_matters: e.target.value })}
            />

            <label style={{ ...labelStyle, marginTop: 10 }}>Related DSM Learn item</label>
            <select
              style={inputStyle}
              value={editArticle.related_learn_id ?? ""}
              onChange={(e) => setEditArticle({ ...editArticle, related_learn_id: e.target.value || null })}
            >
              <option value="">None</option>
              {LEARN_LIBRARY.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.title}
                </option>
              ))}
            </select>

            <label style={{ ...labelStyle, marginTop: 10 }}>Related podcast show</label>
            <select
              style={inputStyle}
              value={editArticle.related_podcast_show ?? ""}
              onChange={(e) => setEditArticle({ ...editArticle, related_podcast_show: e.target.value || null })}
            >
              <option value="">None</option>
              {PODCAST_SHOWS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>

            <label style={{ ...labelStyle, marginTop: 10 }}>Display order</label>
            <input
              type="number"
              style={inputStyle}
              value={editArticle.display_order ?? 0}
              onChange={(e) => setEditArticle({ ...editArticle, display_order: Number(e.target.value) })}
            />

            <button
              type="button"
              onClick={async () => {
                await patchArticle(editArticle.id, {
                  category: editArticle.category,
                  summary: editArticle.summary,
                  why_matters: editArticle.why_matters,
                  related_learn_id: editArticle.related_learn_id,
                  related_podcast_show: editArticle.related_podcast_show,
                  display_order: editArticle.display_order,
                });
                toast.success("Article updated");
                setEditArticle(null);
              }}
              style={{
                marginTop: 14,
                width: "100%",
                background: "#1877D6",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                padding: "12px 16px",
                fontSize: 14,
                fontWeight: 700,
                cursor: "pointer",
                ...POPPINS,
              }}
            >
              Save changes
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

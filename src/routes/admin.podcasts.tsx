import { useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ChevronLeft, Plus, X, Pencil, Trash2, Eye, EyeOff, Music } from "lucide-react";
import { useAdminGate } from "./admin";

export const Route = createFileRoute("/admin/podcasts")({
  component: AdminPodcasts,
});

const SUPABASE_URL = "https://bjpqxfrihwjcqprmoqfs.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJqcHF4ZnJpaHdqY3Fwcm1vcWZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0NzQ4MjEsImV4cCI6MjA5NzA1MDgyMX0.HKlgx3dxP3uxX9wMRRUnfb0IPwaBpFcut_iUgT5XFeo";

const CATEGORIES = [
  "Test Preparation",
  "Business",
  "Standards Check",
  "New ADI",
  "General",
];

type Podcast = {
  id: string;
  episode_number: number | null;
  title: string;
  description: string | null;
  guest_name: string | null;
  guest_title: string | null;
  duration_minutes: number | null;
  category: string | null;
  audio_url: string | null;
  spotify_url: string | null;
  apple_url: string | null;
  image_url: string | null;
  tags: string[] | null;
  is_published: boolean | null;
  published_at: string | null;
  play_count: number | null;
  deleted_at: string | null;
};

async function restFetch(path: string, init?: RequestInit) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...(init?.headers || {}),
    },
  });
  if (!res.ok) throw new Error(await res.text());
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

function emptyForm(): Partial<Podcast> & { tagsStr?: string } {
  return {
    episode_number: 1,
    title: "",
    description: "",
    guest_name: "",
    guest_title: "",
    duration_minutes: 30,
    category: CATEGORIES[0],
    audio_url: "",
    spotify_url: "",
    apple_url: "",
    image_url: "",
    tagsStr: "",
    is_published: false,
    published_at: "",
  };
}

function AdminPodcasts() {
  const navigate = useNavigate();
  const status = useAdminGate();
  const [items, setItems] = useState<Podcast[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const [editing, setEditing] = useState<Podcast | null>(null);
  const [showSheet, setShowSheet] = useState(false);
  const [form, setForm] = useState<Partial<Podcast> & { tagsStr?: string }>(emptyForm());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (status === "denied") navigate({ to: "/home" });
  }, [status, navigate]);

  async function load() {
    setLoading(true);
    try {
      const data = await restFetch(
        "dsm_podcasts?deleted_at=is.null&order=episode_number.desc"
      );
      setItems(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (status === "allowed") load();
  }, [status]);

  const stats = useMemo(() => {
    let published = 0;
    let plays = 0;
    for (const p of items) {
      if (p.is_published) published++;
      plays += p.play_count || 0;
    }
    return { published, plays, total: items.length };
  }, [items]);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2000);
  }

  function openAdd() {
    setEditing(null);
    const nextEp = items.length ? (items[0].episode_number || 0) + 1 : 1;
    setForm({ ...emptyForm(), episode_number: nextEp });
    setShowSheet(true);
  }

  function openEdit(p: Podcast) {
    setEditing(p);
    setForm({
      ...p,
      tagsStr: (p.tags || []).join(", "),
      published_at: p.published_at ? p.published_at.slice(0, 10) : "",
    });
    setShowSheet(true);
  }

  async function handleSave() {
    if (!form.title) {
      showToast("Title is required");
      return;
    }
    setSaving(true);
    try {
      const tags = (form.tagsStr || "")
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
      const payload: any = {
        episode_number: Number(form.episode_number) || null,
        title: form.title,
        description: form.description || null,
        guest_name: form.guest_name || null,
        guest_title: form.guest_title || null,
        duration_minutes: Number(form.duration_minutes) || null,
        category: form.category || null,
        audio_url: form.audio_url || null,
        spotify_url: form.spotify_url || null,
        apple_url: form.apple_url || null,
        image_url: form.image_url || null,
        tags: tags.length ? tags : null,
        is_published: !!form.is_published,
        published_at: form.published_at ? new Date(form.published_at).toISOString() : null,
      };
      if (editing) {
        await restFetch(`dsm_podcasts?id=eq.${editing.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
        showToast("Episode updated");
      } else {
        await restFetch("dsm_podcasts", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        showToast("Episode added");
      }
      setShowSheet(false);
      load();
    } catch (e) {
      console.error(e);
      showToast("Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(p: Podcast) {
    if (!confirm(`Delete "${p.title}"?`)) return;
    try {
      await restFetch(`dsm_podcasts?id=eq.${p.id}`, {
        method: "PATCH",
        body: JSON.stringify({ deleted_at: new Date().toISOString() }),
      });
      showToast("Deleted");
      load();
    } catch (e) {
      console.error(e);
      showToast("Delete failed");
    }
  }

  async function togglePublish(p: Podcast) {
    try {
      const next = !p.is_published;
      await restFetch(`dsm_podcasts?id=eq.${p.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          is_published: next,
          published_at: next ? new Date().toISOString() : null,
        }),
      });
      showToast(next ? "Published" : "Unpublished");
      load();
    } catch (e) {
      console.error(e);
      showToast("Update failed");
    }
  }

  if (status === "checking") {
    return (
      <div style={{ background: "#fff", minHeight: "100vh", padding: 24, color: "#6B7280", fontFamily: "Inter, sans-serif" }}>
        Checking access…
      </div>
    );
  }
  if (status === "denied") return null;

  return (
    <div style={{ background: "#fff", minHeight: "100vh", fontFamily: "Inter, sans-serif", paddingBottom: 40 }}>
      {/* Top bar */}
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 30,
          background: "#CC2229",
          color: "#fff",
          padding: "calc(env(safe-area-inset-top, 0px) + 12px) 16px 12px",
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <button
          type="button"
          onClick={() => navigate({ to: "/admin" })}
          aria-label="Back"
          style={{
            width: 32,
            height: 32,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.15)",
            border: "none",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            color: "#fff",
          }}
        >
          <ChevronLeft size={18} />
        </button>
        <span style={{ fontSize: 16, fontWeight: 600, flex: 1 }}>DSM Podcasts</span>
        <button
          type="button"
          onClick={openAdd}
          style={{
            background: "#fff",
            color: "#CC2229",
            border: 0,
            padding: "8px 12px",
            borderRadius: 8,
            fontWeight: 700,
            fontSize: 13,
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          <Plus size={14} /> Add episode
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, padding: 16 }}>
        {[
          { label: "Published", value: stats.published },
          { label: "Total plays", value: stats.plays },
          { label: "Episodes", value: stats.total },
        ].map((s) => (
          <div
            key={s.label}
            style={{
              background: "#fff",
              border: "0.5px solid #E2E6ED",
              borderRadius: 12,
              padding: 12,
              textAlign: "center",
            }}
          >
            <div style={{ fontWeight: 800, fontSize: 20, color: "#0F2044" }}>{s.value}</div>
            <div style={{ fontSize: 11, color: "#6B7280", marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div style={{ padding: 24, color: "#6B7280" }}>Loading…</div>
      ) : items.length === 0 ? (
        <div style={{ padding: 32, textAlign: "center", color: "#6B7280" }}>
          <Music size={40} style={{ margin: "0 auto", opacity: 0.4 }} />
          <div style={{ marginTop: 12, fontWeight: 600, color: "#0F2044" }}>No episodes yet</div>
          <div style={{ fontSize: 13, marginTop: 4 }}>Tap "Add episode" to create one.</div>
        </div>
      ) : (
        items.map((p) => (
          <div
            key={p.id}
            style={{
              background: "#fff",
              border: "0.5px solid #E2E6ED",
              borderRadius: 12,
              padding: 16,
              margin: "0 16px 8px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#CC2229" }}>
                  EP {p.episode_number ?? "?"}
                </div>
                <div style={{ fontWeight: 700, color: "#0F2044", fontSize: 15, marginTop: 2 }}>
                  {p.title}
                </div>
                <div style={{ fontSize: 12, color: "#6B7280", marginTop: 4 }}>
                  {p.guest_name || "—"}
                  {p.duration_minutes ? ` · ${p.duration_minutes} mins` : ""}
                </div>
              </div>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  padding: "3px 8px",
                  borderRadius: 999,
                  background: p.is_published ? "#DCFCE7" : "#FEF3C7",
                  color: p.is_published ? "#166534" : "#92400E",
                  whiteSpace: "nowrap",
                }}
              >
                {p.is_published ? "Published" : "Draft"}
              </span>
            </div>
            <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 8 }}>
              {p.play_count ?? 0} plays
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={() => openEdit(p)}
                style={btn("#0F2044", "#fff")}
              >
                <Pencil size={12} /> Edit
              </button>
              <button
                type="button"
                onClick={() => togglePublish(p)}
                style={btn(p.is_published ? "#F3F4F6" : "#16A34A", p.is_published ? "#0F2044" : "#fff")}
              >
                {p.is_published ? <EyeOff size={12} /> : <Eye size={12} />}
                {p.is_published ? "Unpublish" : "Publish"}
              </button>
              <button
                type="button"
                onClick={() => handleDelete(p)}
                style={btn("#fff", "#CC2229", "#CC2229")}
              >
                <Trash2 size={12} /> Delete
              </button>
            </div>
          </div>
        ))
      )}

      {/* Bottom sheet */}
      {showSheet && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.4)",
            zIndex: 50,
            display: "flex",
            alignItems: "flex-end",
          }}
          onClick={() => setShowSheet(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#fff",
              width: "100%",
              maxHeight: "90vh",
              overflowY: "auto",
              borderTopLeftRadius: 16,
              borderTopRightRadius: 16,
              padding: 16,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div style={{ fontWeight: 700, fontSize: 16, color: "#0F2044" }}>
                {editing ? "Edit episode" : "New episode"}
              </div>
              <button
                type="button"
                onClick={() => setShowSheet(false)}
                style={{ background: "transparent", border: 0, cursor: "pointer", color: "#6B7280" }}
              >
                <X size={20} />
              </button>
            </div>

            <Field label="Episode number">
              <input
                type="number"
                value={form.episode_number ?? ""}
                onChange={(e) => setForm({ ...form, episode_number: e.target.value ? Number(e.target.value) : null })}
                style={inputStyle}
              />
            </Field>
            <Field label="Title *">
              <input
                value={form.title || ""}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                style={inputStyle}
              />
            </Field>
            <Field label="Description">
              <textarea
                value={form.description || ""}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={4}
                style={{ ...inputStyle, resize: "vertical" }}
              />
            </Field>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <Field label="Guest name">
                <input
                  value={form.guest_name || ""}
                  onChange={(e) => setForm({ ...form, guest_name: e.target.value })}
                  style={inputStyle}
                />
              </Field>
              <Field label="Guest title/role">
                <input
                  value={form.guest_title || ""}
                  onChange={(e) => setForm({ ...form, guest_title: e.target.value })}
                  style={inputStyle}
                />
              </Field>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <Field label="Duration (minutes)">
                <input
                  type="number"
                  value={form.duration_minutes ?? ""}
                  onChange={(e) => setForm({ ...form, duration_minutes: e.target.value ? Number(e.target.value) : null })}
                  style={inputStyle}
                />
              </Field>
              <Field label="Category">
                <select
                  value={form.category || ""}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  style={inputStyle}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </Field>
            </div>
            <Field label="Audio URL (MP3)">
              <input
                value={form.audio_url || ""}
                onChange={(e) => setForm({ ...form, audio_url: e.target.value })}
                style={inputStyle}
                placeholder="https://…"
              />
            </Field>
            <Field label="Spotify URL">
              <input
                value={form.spotify_url || ""}
                onChange={(e) => setForm({ ...form, spotify_url: e.target.value })}
                style={inputStyle}
              />
            </Field>
            <Field label="Apple Podcasts URL">
              <input
                value={form.apple_url || ""}
                onChange={(e) => setForm({ ...form, apple_url: e.target.value })}
                style={inputStyle}
              />
            </Field>
            <Field label="Episode image URL">
              <input
                value={form.image_url || ""}
                onChange={(e) => setForm({ ...form, image_url: e.target.value })}
                style={inputStyle}
              />
            </Field>
            <Field label="Tags (comma separated)">
              <input
                value={form.tagsStr || ""}
                onChange={(e) => setForm({ ...form, tagsStr: e.target.value })}
                style={inputStyle}
                placeholder="adi, cpd, standards"
              />
            </Field>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <Field label="Published">
                <label style={{ display: "flex", alignItems: "center", gap: 8, height: 40 }}>
                  <input
                    type="checkbox"
                    checked={!!form.is_published}
                    onChange={(e) => setForm({ ...form, is_published: e.target.checked })}
                  />
                  <span style={{ fontSize: 13, color: "#0F2044" }}>Visible to users</span>
                </label>
              </Field>
              <Field label="Published date">
                <input
                  type="date"
                  value={form.published_at || ""}
                  onChange={(e) => setForm({ ...form, published_at: e.target.value })}
                  style={inputStyle}
                />
              </Field>
            </div>

            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              style={{
                width: "100%",
                background: "#CC2229",
                color: "#fff",
                border: 0,
                padding: "12px",
                borderRadius: 10,
                fontWeight: 700,
                fontSize: 14,
                marginTop: 12,
                cursor: saving ? "wait" : "pointer",
                opacity: saving ? 0.7 : 1,
              }}
            >
              {saving ? "Saving…" : editing ? "Save changes" : "Add episode"}
            </button>
          </div>
        </div>
      )}

      {toast && (
        <div
          style={{
            position: "fixed",
            bottom: 24,
            left: "50%",
            transform: "translateX(-50%)",
            background: "#0F2044",
            color: "#fff",
            padding: "10px 16px",
            borderRadius: 999,
            fontSize: 13,
            zIndex: 60,
          }}
        >
          {toast}
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 4 }}>{label}</div>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  border: "1px solid #E2E6ED",
  borderRadius: 8,
  fontSize: 14,
  color: "#0F2044",
  fontFamily: "inherit",
  background: "#fff",
  boxSizing: "border-box",
};

function btn(bg: string, color: string, border?: string): React.CSSProperties {
  return {
    background: bg,
    color,
    border: border ? `1px solid ${border}` : 0,
    padding: "6px 12px",
    borderRadius: 8,
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
  };
}
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type CSSProperties } from "react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabaseClient";

export const Route = createFileRoute("/marketplace/edit")({
  component: MarketplaceEditPage,
});

type Tile = {
  id?: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  badge: string | null;
  price_display: string | null;
  link_url: string | null;
  image_url: string | null;
  category: string | null;
  display_order: number;
  is_active: boolean;
  gradient?: string | null;
};

const CATEGORIES = ["tracking", "hardware", "health", "learning", "promotion"];

const emptyTile = (order: number): Tile => ({
  title: "",
  subtitle: "",
  description: "",
  badge: "",
  price_display: "",
  link_url: "",
  image_url: "",
  category: "promotion",
  display_order: order,
  is_active: true,
});

function MarketplaceEditPage() {
  const navigate = useNavigate();
  const [tiles, setTiles] = useState<Tile[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    setLoading(true);
    setLoadError(null);
    console.log("[marketplace.edit] fetching marketplace_tiles…");
    const { data: sess } = await supabase.auth.getSession();
    console.log("[marketplace.edit] session user:", sess.session?.user?.id ?? "(none)");
    const res = await supabase
      .from("marketplace_tiles")
      .select("*", { count: "exact" })
      .order("display_order", { ascending: true });
    console.log("[marketplace.edit] fetch result", {
      status: res.status,
      statusText: res.statusText,
      count: res.count,
      rows: res.data?.length ?? 0,
      data: res.data,
      error: res.error,
    });
    if (res.error) {
      const e = res.error;
      const msg = `${e.message}${e.details ? ` — ${e.details}` : ""}${e.hint ? ` (hint: ${e.hint})` : ""}`;
      setLoadError(msg);
      toast.error("Failed to load tiles");
      console.error("[marketplace.edit] load error", e);
    } else {
      setTiles((res.data as Tile[]) ?? []);
    }
    setLoading(false);
  }

  function updateTile(idx: number, patch: Partial<Tile>) {
    setTiles((prev) => prev.map((t, i) => (i === idx ? { ...t, ...patch } : t)));
  }

  async function saveTile(idx: number) {
    const tile = tiles[idx];
    const key = tile.id ?? `new-${idx}`;
    setSavingId(key);
    try {
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        toast.error("Not signed in");
        return;
      }
      const payload = {
        title: tile.title,
        subtitle: tile.subtitle,
        description: tile.description,
        badge: tile.badge,
        price_display: tile.price_display,
        link_url: tile.link_url,
        image_url: tile.image_url,
        category: tile.category,
        display_order: Number(tile.display_order) || 0,
        is_active: tile.is_active,
      };
      if (tile.id) {
        const { error } = await supabase
          .from("marketplace_tiles")
          .update(payload)
          .eq("id", tile.id);
        if (error) throw error;
        toast.success("Saved");
      } else {
        const { data, error } = await supabase
          .from("marketplace_tiles")
          .insert(payload)
          .select()
          .single();
        if (error) throw error;
        updateTile(idx, data as Tile);
        toast.success("Created");
      }
    } catch (e: any) {
      console.error(e);
      toast.error(e.message ?? "Save failed");
    } finally {
      setSavingId(null);
    }
  }

  async function deleteTile(idx: number) {
    const tile = tiles[idx];
    if (!tile.id) {
      setTiles((prev) => prev.filter((_, i) => i !== idx));
      return;
    }
    if (!confirm("Delete this tile?")) return;
    const { error } = await supabase.from("marketplace_tiles").delete().eq("id", tile.id);
    if (error) {
      toast.error("Delete failed");
      return;
    }
    setTiles((prev) => prev.filter((_, i) => i !== idx));
    toast.success("Deleted");
  }

  async function uploadImage(idx: number, file: File) {
    const tile = tiles[idx];
    const key = tile.id ?? `new-${idx}`;
    setUploadingId(key);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("marketplace-images")
        .upload(path, file, { cacheControl: "3600", upsert: false });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from("marketplace-images").getPublicUrl(path);
      updateTile(idx, { image_url: data.publicUrl });
      toast.success("Image uploaded");
    } catch (e: any) {
      console.error(e);
      toast.error(e.message ?? "Upload failed");
    } finally {
      setUploadingId(null);
    }
  }

  function addNew() {
    const maxOrder = tiles.reduce((m, t) => Math.max(m, t.display_order || 0), 0);
    setTiles((prev) => [...prev, emptyTile(maxOrder + 1)]);
  }

  const labelStyle: CSSProperties = {
    fontSize: 12,
    fontWeight: 600,
    color: "#475569",
    marginBottom: 4,
    display: "block",
  };
  const inputStyle: CSSProperties = {
    width: "100%",
    padding: "8px 10px",
    border: "1px solid #e2e8f0",
    borderRadius: 6,
    fontSize: 14,
    background: "#fff",
    color: "#0f172a",
  };

  return (
    <div style={{ minHeight: "100vh", background: "#fff" }}>
      <div
        style={{
          background: "#0F2044",
          color: "#fff",
          padding: "14px 16px",
          display: "flex",
          alignItems: "center",
          gap: 12,
          position: "sticky",
          top: 0,
          zIndex: 10,
        }}
      >
        <button
          onClick={() => navigate({ to: "/marketplace" })}
          style={{
            background: "transparent",
            border: "none",
            color: "#fff",
            fontSize: 22,
            cursor: "pointer",
            padding: 4,
          }}
          aria-label="Back"
        >
          ←
        </button>
        <h1 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Edit Marketplace</h1>
      </div>

      <div style={{ maxWidth: 720, margin: "0 auto", padding: 16 }}>
        {loading ? (
          <p style={{ color: "#64748b" }}>Loading…</p>
        ) : (
          <>
            {tiles.map((tile, idx) => {
              const key = tile.id ?? `new-${idx}`;
              return (
                <div
                  key={key}
                  style={{
                    border: "1px solid #e2e8f0",
                    borderRadius: 10,
                    padding: 14,
                    marginBottom: 14,
                    background: "#fff",
                  }}
                >
                  <div style={{ marginBottom: 10 }}>
                    <label style={labelStyle}>Image</label>
                    {tile.image_url ? (
                      <img
                        src={tile.image_url}
                        alt=""
                        style={{
                          width: "100%",
                          maxHeight: 140,
                          objectFit: "cover",
                          borderRadius: 6,
                          marginBottom: 6,
                        }}
                      />
                    ) : null}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) void uploadImage(idx, f);
                      }}
                      disabled={uploadingId === key}
                      style={{ fontSize: 13 }}
                    />
                    {uploadingId === key && (
                      <span style={{ fontSize: 12, color: "#64748b", marginLeft: 8 }}>
                        Uploading…
                      </span>
                    )}
                  </div>

                  <div style={{ marginBottom: 10 }}>
                    <label style={labelStyle}>Title</label>
                    <input
                      style={inputStyle}
                      value={tile.title ?? ""}
                      onChange={(e) => updateTile(idx, { title: e.target.value })}
                    />
                  </div>

                  <div style={{ marginBottom: 10 }}>
                    <label style={labelStyle}>Subtitle</label>
                    <input
                      style={inputStyle}
                      value={tile.subtitle ?? ""}
                      onChange={(e) => updateTile(idx, { subtitle: e.target.value })}
                    />
                  </div>

                  <div style={{ marginBottom: 10 }}>
                    <label style={labelStyle}>Description</label>
                    <textarea
                      style={{ ...inputStyle, minHeight: 70, resize: "vertical" }}
                      value={tile.description ?? ""}
                      onChange={(e) => updateTile(idx, { description: e.target.value })}
                    />
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <div style={{ marginBottom: 10 }}>
                      <label style={labelStyle}>Badge</label>
                      <input
                        style={inputStyle}
                        value={tile.badge ?? ""}
                        onChange={(e) => updateTile(idx, { badge: e.target.value })}
                      />
                    </div>
                    <div style={{ marginBottom: 10 }}>
                      <label style={labelStyle}>Price display</label>
                      <input
                        style={inputStyle}
                        value={tile.price_display ?? ""}
                        onChange={(e) => updateTile(idx, { price_display: e.target.value })}
                      />
                    </div>
                  </div>

                  <div style={{ marginBottom: 10 }}>
                    <label style={labelStyle}>Link URL</label>
                    <input
                      style={inputStyle}
                      value={tile.link_url ?? ""}
                      onChange={(e) => updateTile(idx, { link_url: e.target.value })}
                    />
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <div style={{ marginBottom: 10 }}>
                      <label style={labelStyle}>Category</label>
                      <select
                        style={inputStyle}
                        value={tile.category ?? "promotion"}
                        onChange={(e) => updateTile(idx, { category: e.target.value })}
                      >
                        {CATEGORIES.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div style={{ marginBottom: 10 }}>
                      <label style={labelStyle}>Display order</label>
                      <input
                        type="number"
                        style={inputStyle}
                        value={tile.display_order}
                        onChange={(e) =>
                          updateTile(idx, { display_order: Number(e.target.value) })
                        }
                      />
                    </div>
                  </div>

                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      marginBottom: 12,
                      fontSize: 14,
                      color: "#0f172a",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={tile.is_active}
                      onChange={(e) => updateTile(idx, { is_active: e.target.checked })}
                    />
                    Active
                  </label>

                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      onClick={() => saveTile(idx)}
                      disabled={savingId === key}
                      style={{
                        flex: 1,
                        background: "#0F2044",
                        color: "#fff",
                        border: "none",
                        padding: "10px 14px",
                        borderRadius: 6,
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      {savingId === key ? "Saving…" : "Save"}
                    </button>
                    <button
                      onClick={() => deleteTile(idx)}
                      style={{
                        background: "#fff",
                        color: "#b91c1c",
                        border: "1px solid #fecaca",
                        padding: "10px 14px",
                        borderRadius: 6,
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}

            <button
              onClick={addNew}
              style={{
                width: "100%",
                background: "#fff",
                color: "#0F2044",
                border: "2px dashed #0F2044",
                padding: "14px",
                borderRadius: 10,
                fontWeight: 600,
                cursor: "pointer",
                marginTop: 8,
              }}
            >
              + Add new tile
            </button>
          </>
        )}
      </div>
    </div>
  );
}

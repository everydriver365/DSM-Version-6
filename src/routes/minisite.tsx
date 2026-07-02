import { createFileRoute, useNavigate } from "@tanstack/react-router";
import type React from "react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  ArrowLeft,
  Copy,
  ExternalLink,
  Camera,
  X,
  Check,
  Loader2,
} from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { SectionHeader } from "../components/dsm/SectionHeader";
import { Button } from "../components/dsm/Button";
import { Input } from "../components/dsm/Input";
import { Card } from "../components/dsm/Card";

export const Route = createFileRoute("/minisite")({
  head: () => ({
    meta: [
      { title: "My website — DSM by EveryDriver" },
      { name: "description", content: "Edit your public mini website." },
    ],
  }),
  component: MiniSitePage,
});

const POPPINS = { fontFamily: "Inter, sans-serif" } as const;
const SITE_BASE = "everydriver.co.uk/i/";

type Theme = "classic" | "modern" | "warm" | "bold";
type Font = "Poppins" | "Inter" | "Playfair Display";
type HeaderStyle = "standard" | "centered" | "split";

const THEMES: { key: Theme; label: string; swatch: string[] }[] = [
  { key: "classic", label: "Classic", swatch: ["#0C2340", "#1A4A6E", "#FFFFFF"] },
  { key: "modern", label: "Modern", swatch: ["#111111", "#2A2A2A", "#F5F5F5"] },
  { key: "warm", label: "Warm", swatch: ["#C2410C", "#FB923C", "#FFF7ED"] },
  { key: "bold", label: "Bold", swatch: ["#000000", "#DC2626", "#FFFFFF"] },
];

const FONTS: Font[] = ["Poppins", "Inter", "Playfair Display"];
const HEADER_STYLES: { key: HeaderStyle; label: string }[] = [
  { key: "standard", label: "Standard" },
  { key: "centered", label: "Centered" },
  { key: "split", label: "Split" },
];

const COLOUR_SWATCHES = [
  "#1A4A6E", "#0C2340", "#16A34A", "#DC2626",
  "#D97706", "#7C3AED", "#0EA5E9", "#111111",
];

function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 40);
}

function MiniSitePage() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Slug
  const [originalSlug, setOriginalSlug] = useState<string>("");
  const [slug, setSlug] = useState("");
  const [slugChecking, setSlugChecking] = useState(false);
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);
  const [claiming, setClaiming] = useState(false);

  // Publish
  const [published, setPublished] = useState(false);

  // Content
  const [websiteBio, setWebsiteBio] = useState("");
  const [heroUrl, setHeroUrl] = useState<string | null>(null);
  const [gallery, setGallery] = useState<string[]>([]);
  const [uploadingHero, setUploadingHero] = useState(false);
  const [uploadingGallery, setUploadingGallery] = useState(false);

  // Appearance
  const [theme, setTheme] = useState<Theme>("classic");
  const [font, setFont] = useState<Font>("Poppins");
  const [headerStyle, setHeaderStyle] = useState<HeaderStyle>("standard");
  const [brandColour, setBrandColour] = useState<string>("#1A4A6E");

  const heroInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  // Load
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate({ to: "/login" as never });
        return;
      }
      setUserId(user.id);
      const { data, error } = await supabase
        .from("instructors")
        .select("name, app_slug, website_published, website_bio, website_hero_image_url, website_gallery_urls, website_theme, website_font, website_header_style, brand_colour")
        .eq("id", user.id)
        .maybeSingle();
      if (error) console.error("[minisite] load error", error);
      if (data) {
        const d = data as any;
        const existingSlug = d.app_slug ?? "";
        setOriginalSlug(existingSlug);
        setSlug(existingSlug || slugify(d.name ?? user.email?.split("@")[0] ?? ""));
        setPublished(Boolean(d.website_published));
        setWebsiteBio(d.website_bio ?? "");
        setHeroUrl(d.website_hero_image_url ?? null);
        setGallery(Array.isArray(d.website_gallery_urls) ? d.website_gallery_urls : []);
        if (d.website_theme) setTheme(d.website_theme);
        if (d.website_font) setFont(d.website_font);
        if (d.website_header_style) setHeaderStyle(d.website_header_style);
        if (d.brand_colour) setBrandColour(d.brand_colour);
      }
      setLoading(false);
    })();
  }, [navigate]);

  // Debounced slug availability check
  useEffect(() => {
    if (!userId) return;
    if (!slug || slug === originalSlug) {
      setSlugAvailable(null);
      return;
    }
    if (!/^[a-z0-9-]+$/.test(slug) || slug.length < 3) {
      setSlugAvailable(false);
      return;
    }
    setSlugChecking(true);
    const t = setTimeout(async () => {
      const { data, error } = await supabase
        .from("instructors")
        .select("id")
        .eq("app_slug", slug)
        .neq("id", userId)
        .maybeSingle();
      if (error) console.error("[minisite] slug check", error);
      setSlugAvailable(!data);
      setSlugChecking(false);
    }, 400);
    return () => clearTimeout(t);
  }, [slug, originalSlug, userId]);

  const publicUrl = `https://${SITE_BASE}${originalSlug || slug || "your-slug"}`;
  const displayUrl = `${SITE_BASE}${originalSlug || slug || "your-slug"}`;

  async function claimSlug() {
    if (!userId || !slug || slugAvailable !== true) return;
    setClaiming(true);
    const { error } = await supabase
      .from("instructors")
      .upsert({ id: userId, app_slug: slug });
    setClaiming(false);
    if (error) {
      console.error("[minisite] claim slug", error);
      toast.error("Couldn't claim address");
      return;
    }
    setOriginalSlug(slug);
    toast.success("Address claimed");
  }

  async function togglePublished(next: boolean) {
    if (!userId) return;
    if (next && !originalSlug) {
      toast.error("Claim your website address first");
      return;
    }
    setPublished(next);
    const { error } = await supabase
      .from("instructors")
      .upsert({ id: userId, website_published: next });
    if (error) {
      console.error("[minisite] publish toggle", error);
      toast.error("Couldn't update publish state");
      setPublished(!next);
      return;
    }
    toast.success(next ? "Website live" : "Set to draft");
  }

  async function copyUrl() {
    try {
      await navigator.clipboard.writeText(publicUrl);
      toast.success("Link copied");
    } catch {
      toast.error("Couldn't copy");
    }
  }

  async function uploadFile(f: File, folder: "hero" | "gallery"): Promise<string | null> {
    if (!userId) return null;
    const ext = f.name.split(".").pop() ?? "jpg";
    const path = `${userId}/website/${folder}-${Date.now()}.${ext}`;
    const uploadResult = await supabase.storage
      .from("course-images")
      .upload(path, f, { contentType: f.type, upsert: true });
    if (uploadResult.error) {
      console.error("[minisite] upload", uploadResult.error);
      toast.error("Couldn't upload image");
      return null;
    }
    const { data: pub } = supabase.storage.from("course-images").getPublicUrl(path);
    return pub.publicUrl;
  }

  async function onPickHero(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f || !userId) return;
    if (!/^image\//.test(f.type)) { toast.error("Use an image"); return; }
    if (f.size > 8 * 1024 * 1024) { toast.error("Image must be under 8MB"); return; }
    setUploadingHero(true);
    const url = await uploadFile(f, "hero");
    if (url) {
      setHeroUrl(url);
      await supabase.from("instructors").upsert({ id: userId, website_hero_image_url: url });
      toast.success("Hero image updated");
    }
    setUploadingHero(false);
  }

  async function onPickGallery(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (!files.length || !userId) return;
    const slotsLeft = 6 - gallery.length;
    if (slotsLeft <= 0) { toast.error("Gallery limit is 6"); return; }
    const toUpload = files.slice(0, slotsLeft);
    setUploadingGallery(true);
    const uploaded: string[] = [];
    for (const f of toUpload) {
      if (!/^image\//.test(f.type)) continue;
      if (f.size > 8 * 1024 * 1024) continue;
      const url = await uploadFile(f, "gallery");
      if (url) uploaded.push(url);
    }
    if (uploaded.length) {
      const next = [...gallery, ...uploaded];
      setGallery(next);
      await supabase.from("instructors").upsert({ id: userId, website_gallery_urls: next });
      toast.success(`Added ${uploaded.length} image${uploaded.length > 1 ? "s" : ""}`);
    }
    setUploadingGallery(false);
  }

  async function removeGalleryItem(idx: number) {
    if (!userId) return;
    const next = gallery.filter((_, i) => i !== idx);
    setGallery(next);
    await supabase.from("instructors").upsert({ id: userId, website_gallery_urls: next });
  }

  async function saveAll() {
    if (!userId) return;
    setSaving(true);
    const payload = {
      id: userId,
      website_bio: websiteBio.trim() || null,
      website_theme: theme,
      website_font: font,
      website_header_style: headerStyle,
      brand_colour: brandColour,
    };
    const { error } = await supabase.from("instructors").upsert(payload);
    setSaving(false);
    if (error) {
      console.error("[minisite] save", error);
      toast.error("Couldn't save");
      return;
    }
    toast.success("Saved");
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ ...POPPINS, backgroundColor: "#F3F8FF" }}>
        <Loader2 className="animate-spin" color="#1A4A6E" />
      </div>
    );
  }

  const slugValidFormat = /^[a-z0-9-]+$/.test(slug) && slug.length >= 3;

  return (
    <div className="min-h-screen pb-32" style={{ ...POPPINS, backgroundColor: "#F3F8FF", paddingTop: 52 }}>
      {/* TOP BAR */}
      <div
        className="fixed top-0 left-0 right-0 z-40 px-4 flex items-center"
        style={{ backgroundColor: "#072b47", height: 52 }}
      >
        <button
          onClick={() => navigate({ to: "/home" })}
          aria-label="Back"
          style={{ background: "none", border: "none", color: "#fff", display: "flex", alignItems: "center", cursor: "pointer" }}
        >
          <ArrowLeft size={22} />
        </button>
        <div className="flex-1 text-center text-white text-[16px] font-medium" style={{ marginRight: 22 }}>
          My website
        </div>
      </div>

      <div className="px-4 pt-4">
        {/* PREVIEW LINK CARD */}
        <div
          className="bg-white mb-3"
          style={{ borderRadius: 12, padding: 16, borderWidth: "0.5px", borderStyle: "solid", borderColor: "#EEF2F7" }}
        >
          <div className="text-[10px] uppercase mb-1" style={{ color: "#9CA3AF", letterSpacing: "0.05em" }}>
            Your website
          </div>
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="text-[14px] truncate" style={{ color: "#1A4A6E" }}>{displayUrl}</div>
            <button
              onClick={copyUrl}
              aria-label="Copy URL"
              style={{ background: "none", border: "none", cursor: "pointer", color: "#1A4A6E", display: "flex" }}
            >
              <Copy size={18} />
            </button>
          </div>

          <div className="flex items-center justify-between gap-2 mb-3">
            <Button
              variant="ghost"
              inline
              onClick={() => window.open(publicUrl, "_blank", "noopener,noreferrer")}
              disabled={!originalSlug}
            >
              <ExternalLink size={16} style={{ marginRight: 6 }} />
              Preview website
            </Button>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span
                className="rounded-full"
                style={{
                  width: 8, height: 8,
                  backgroundColor: published ? "#16A34A" : "#F59E0B",
                }}
              />
              <span className="text-[13px]" style={{ color: published ? "#16A34A" : "#B45309", fontWeight: 600 }}>
                {published ? "Live" : "Draft"}
              </span>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={published}
              onClick={() => togglePublished(!published)}
              style={{
                width: 44, height: 26, borderRadius: 999,
                background: published ? "#16A34A" : "#EEF2F7",
                border: "none", cursor: "pointer", position: "relative",
                transition: "background 0.15s",
              }}
            >
              <span
                style={{
                  position: "absolute", top: 3, left: published ? 21 : 3,
                  width: 20, height: 20, borderRadius: 999, background: "#fff",
                  transition: "left 0.15s",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.2)",
                }}
              />
            </button>
          </div>
        </div>

        {/* SLUG CLAIM */}
        {!originalSlug && (
          <Card className="mb-3" style={{ background: "#fff" }}>
            <div className="text-[13px] font-medium mb-2" style={{ color: "#1A1A2E" }}>
              Choose your website address
            </div>
            <Input
              value={slug}
              onChange={(e) => setSlug(slugify(e.target.value))}
              placeholder="your-name"
            />
            <div className="text-[12px] mt-2" style={{ color: "#6B7280" }}>
              {SITE_BASE}<span style={{ color: "#1A4A6E", fontWeight: 600 }}>{slug || "your-slug"}</span>
            </div>
            <div className="text-[12px] mt-1 flex items-center gap-1" style={{ minHeight: 18 }}>
              {!slugValidFormat && slug && (
                <span style={{ color: "#DC2626" }}>Use lowercase letters, numbers, hyphens (min 3 chars)</span>
              )}
              {slugValidFormat && slugChecking && (
                <span style={{ color: "#6B7280" }}>Checking…</span>
              )}
              {slugValidFormat && !slugChecking && slugAvailable === true && (
                <span style={{ color: "#16A34A", display: "inline-flex", alignItems: "center", gap: 4 }}>
                  <Check size={14} /> Available
                </span>
              )}
              {slugValidFormat && !slugChecking && slugAvailable === false && (
                <span style={{ color: "#DC2626" }}>Already taken</span>
              )}
            </div>
            <div className="mt-3">
              <Button
                onClick={claimSlug}
                disabled={!slugValidFormat || slugAvailable !== true || claiming}
              >
                {claiming ? "Claiming…" : "Claim this address"}
              </Button>
            </div>
          </Card>
        )}

        {/* CONTENT */}
        <SectionHeader>CONTENT</SectionHeader>

        <Card className="mb-3" style={{ background: "#fff" }}>
          <label
            className="block mb-1 text-[12px] font-medium"
            style={{ color: "#6B7280", fontFamily: "Inter, sans-serif" }}
          >
            Website bio
          </label>
          <textarea
            value={websiteBio}
            onChange={(e) => setWebsiteBio(e.target.value)}
            placeholder="Tell pupils about yourself, your teaching style, and why they should choose you"
            rows={5}
            className="w-full rounded-lg px-3 py-2 text-[14px] text-[#1A1A2E] bg-white focus:border-[#1A4A6E] focus:outline-none"
            style={{
              fontFamily: "Inter, sans-serif",
              borderWidth: "0.5px", borderStyle: "solid", borderColor: "#EEF2F7",
              resize: "vertical",
            }}
          />
        </Card>

        {/* HERO IMAGE */}
        <Card className="mb-3" style={{ background: "#fff" }}>
          <label
            className="block mb-2 text-[12px] font-medium"
            style={{ color: "#6B7280" }}
          >
            Hero image
          </label>
          {heroUrl ? (
            <div className="relative" style={{ borderRadius: 12, overflow: "hidden" }}>
              <img src={heroUrl} alt="Hero" style={{ width: "100%", height: 180, objectFit: "cover", display: "block" }} />
              <button
                onClick={() => heroInputRef.current?.click()}
                style={{
                  position: "absolute", bottom: 8, right: 8,
                  background: "rgba(15,32,68,0.85)", color: "#fff",
                  border: "none", borderRadius: 8, padding: "6px 10px",
                  fontSize: 12, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4,
                }}
              >
                <Camera size={14} /> Replace
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => heroInputRef.current?.click()}
              className="w-full flex flex-col items-center justify-center"
              style={{
                borderWidth: "1px", borderStyle: "dashed", borderColor: "#EEF2F7",
                borderRadius: 12, padding: 24, background: "#FAFBFC", cursor: "pointer",
              }}
            >
              {uploadingHero ? (
                <Loader2 className="animate-spin" color="#1A4A6E" />
              ) : (
                <>
                  <Camera size={28} color="#9CA3AF" />
                  <div className="text-[13px] mt-2" style={{ color: "#6B7280" }}>Tap to upload hero image</div>
                </>
              )}
            </button>
          )}
          <input ref={heroInputRef} type="file" accept="image/*" hidden onChange={onPickHero} />
        </Card>

        {/* GALLERY */}
        <Card className="mb-3" style={{ background: "#fff" }}>
          <div className="flex items-center justify-between mb-2">
            <label className="text-[12px] font-medium" style={{ color: "#6B7280" }}>
              Gallery
            </label>
            <span className="text-[11px]" style={{ color: "#9CA3AF" }}>{gallery.length}/6</span>
          </div>

          {gallery.length > 0 && (
            <div className="grid grid-cols-3 gap-2 mb-2">
              {gallery.map((url, i) => (
                <div key={url + i} className="relative" style={{ borderRadius: 8, overflow: "hidden" }}>
                  <img src={url} alt={`Gallery ${i + 1}`} style={{ width: "100%", height: 80, objectFit: "cover", display: "block" }} />
                  <button
                    onClick={() => removeGalleryItem(i)}
                    aria-label="Remove image"
                    style={{
                      position: "absolute", top: 4, right: 4,
                      width: 22, height: 22, borderRadius: 999,
                      background: "rgba(0,0,0,0.6)", color: "#fff",
                      border: "none", cursor: "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {gallery.length < 6 && (
            <button
              type="button"
              onClick={() => galleryInputRef.current?.click()}
              className="w-full flex flex-col items-center justify-center"
              style={{
                borderWidth: "1px", borderStyle: "dashed", borderColor: "#EEF2F7",
                borderRadius: 12, padding: 16, background: "#FAFBFC", cursor: "pointer",
              }}
            >
              {uploadingGallery ? (
                <Loader2 className="animate-spin" color="#1A4A6E" />
              ) : (
                <>
                  <Camera size={22} color="#9CA3AF" />
                  <div className="text-[12px] mt-1" style={{ color: "#6B7280" }}>Add images</div>
                </>
              )}
            </button>
          )}
          <input ref={galleryInputRef} type="file" accept="image/*" multiple hidden onChange={onPickGallery} />
        </Card>

        {/* APPEARANCE */}
        <SectionHeader>APPEARANCE</SectionHeader>

        <Card className="mb-3" style={{ background: "#fff" }}>
          <label className="block mb-2 text-[12px] font-medium" style={{ color: "#6B7280" }}>Theme</label>
          <div className="grid grid-cols-2 gap-2">
            {THEMES.map((t) => {
              const selected = theme === t.key;
              return (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setTheme(t.key)}
                  style={{
                    borderWidth: selected ? "2px" : "0.5px", borderStyle: "solid",
                    borderColor: selected ? "#1A4A6E" : "#EEF2F7",
                    borderRadius: 12, padding: 10, background: "#fff",
                    cursor: "pointer", textAlign: "left",
                  }}
                >
                  <div className="flex gap-1 mb-2">
                    {t.swatch.map((c) => (
                      <span key={c} style={{ width: 18, height: 18, borderRadius: 4, background: c, border: "0.5px solid #EEF2F7" }} />
                    ))}
                  </div>
                  <div className="text-[13px] font-medium" style={{ color: "#1A1A2E" }}>{t.label}</div>
                </button>
              );
            })}
          </div>
        </Card>

        <Card className="mb-3" style={{ background: "#fff" }}>
          <label className="block mb-2 text-[12px] font-medium" style={{ color: "#6B7280" }}>Font</label>
          <div className="flex flex-col gap-2">
            {FONTS.map((f) => {
              const selected = font === f;
              return (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFont(f)}
                  style={{
                    borderWidth: selected ? "2px" : "0.5px", borderStyle: "solid",
                    borderColor: selected ? "#1A4A6E" : "#EEF2F7",
                    borderRadius: 10, padding: "10px 12px", background: "#fff",
                    cursor: "pointer", textAlign: "left",
                    fontFamily: `${f}, sans-serif`, fontSize: 14, color: "#1A1A2E",
                  }}
                >
                  {f}
                </button>
              );
            })}
          </div>
        </Card>

        <Card className="mb-3" style={{ background: "#fff" }}>
          <label className="block mb-2 text-[12px] font-medium" style={{ color: "#6B7280" }}>Header style</label>
          <div className="grid grid-cols-3 gap-2">
            {HEADER_STYLES.map((h) => {
              const selected = headerStyle === h.key;
              return (
                <button
                  key={h.key}
                  type="button"
                  onClick={() => setHeaderStyle(h.key)}
                  style={{
                    borderWidth: selected ? "2px" : "0.5px", borderStyle: "solid",
                    borderColor: selected ? "#1A4A6E" : "#EEF2F7",
                    borderRadius: 10, padding: "10px 8px", background: "#fff",
                    cursor: "pointer", textAlign: "center",
                    fontSize: 12, color: "#1A1A2E",
                  }}
                >
                  {h.label}
                </button>
              );
            })}
          </div>
        </Card>

        <Card className="mb-3" style={{ background: "#fff" }}>
          <label className="block mb-2 text-[12px] font-medium" style={{ color: "#6B7280" }}>Brand colour</label>
          <div className="flex items-center gap-2 mb-2">
            <span
              style={{
                width: 32, height: 32, borderRadius: 8,
                background: brandColour, border: "0.5px solid #EEF2F7",
              }}
            />
            <Input
              value={brandColour}
              onChange={(e) => setBrandColour(e.target.value)}
              placeholder="#1A4A6E"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {COLOUR_SWATCHES.map((c) => (
              <button
                key={c}
                type="button"
                aria-label={`Use ${c}`}
                onClick={() => setBrandColour(c)}
                style={{
                  width: 28, height: 28, borderRadius: 999,
                  background: c, cursor: "pointer",
                  border: brandColour.toLowerCase() === c.toLowerCase() ? "2px solid #1A1A2E" : "0.5px solid #EEF2F7",
                }}
              />
            ))}
          </div>
        </Card>

        <div className="mt-4">
          <Button onClick={saveAll} disabled={saving}>
            {saving ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </div>
    </div>
  );
}

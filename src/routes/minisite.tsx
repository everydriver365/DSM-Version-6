import { createFileRoute, useNavigate } from "@tanstack/react-router";
import type React from "react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { PageLoader } from "@/components/dsm/LoadingSpinner";
import { IconBrush, IconCamera, IconCheck, IconChevronDown, IconChevronLeft, IconCopy, IconExternalLink, IconFileText, IconLayoutBoard, IconLoader2, IconPalette, IconPhoto, IconTypography, IconX } from "@tabler/icons-react";
import { supabase } from "../lib/supabaseClient";
import { Button } from "../components/dsm/Button";
import { Input } from "../components/dsm/Input";
import { Card } from "../components/dsm/Card";
import {
  TIERS as TIER_CARDS,
  COMPARISON_ROWS,
  COMPARISON_COLS,
  TIER_ORDER as SHARED_TIER_ORDER,
  TIER_NAMES as SHARED_TIER_NAMES,
  checkDomainAvailability,
  createSubscriptionPaymentLink,
  type TierId as SharedTierId,
} from "@/lib/websiteUpgrade";

export const Route = createFileRoute("/minisite")({
  head: () => ({
    meta: [
      { title: "My website — DSM by EveryDriver" },
      { name: "description", content: "Edit your public mini website." },
    ],
  }),
  component: MiniSitePage,
});

const POPPINS = { fontFamily: "Poppins, sans-serif" } as const;
const SITE_BASE = "sites.everydriver.co.uk/";

type Theme = "classic" | "modern" | "warm" | "bold";
type Font = "Poppins" | "Playfair Display";
type HeaderStyle = "standard" | "centered" | "split";
type TierId = SharedTierId;

const TIER_ORDER = SHARED_TIER_ORDER;
const TIER_NAMES = SHARED_TIER_NAMES;

const MANAGED_WA =
  "https://wa.me/447767693279?text=" +
  encodeURIComponent("Hi, I'm interested in DSM Managed Website");

const PRICES = {
  website: { monthly: 9.99, annual: 89.90 },
  pro: { monthly: 19.99, annual: 179.90 },
  managed: { monthly: 39.99, annual: 359.90 },
};

const ANNUAL_SAVING = {
  website: 29.98,
  pro: 59.98,
  managed: 119.98,
};


const THEMES: { key: Theme; label: string; swatch: string[] }[] = [
  { key: "classic", label: "Classic", swatch: ["#0B1F3A", "#1877D6", "#FFFFFF"] },
  { key: "modern", label: "Modern", swatch: ["#111111", "#2A2A2A", "#F5F5F5"] },
  { key: "warm", label: "Warm", swatch: ["#C2410C", "#FB923C", "#FFF7ED"] },
  { key: "bold", label: "Bold", swatch: ["#000000", "#DC2626", "#FFFFFF"] },
];

const FONTS: Font[] = ["Poppins", "Playfair Display"];
const HEADER_STYLES: { key: HeaderStyle; label: string }[] = [
  { key: "standard", label: "Standard" },
  { key: "centered", label: "Centered" },
  { key: "split", label: "Split" },
];

const COLOUR_SWATCHES = [
  "#1877D6", "#0B1F3A", "#1877D6", "#DC2626",
  "#0B1F3A", "#1877D6", "#0EA5E9", "#111111",
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

  // Domain registration state (for the optional domain-search result card)
  const [customDomain, setCustomDomain] = useState<string | null>(null);
  const [customDomainStatus, setCustomDomainStatus] = useState<"pending" | null>(null);
  const [showDomainSearch, setShowDomainSearch] = useState(false);

  // Upgrade flow: domain search happens before payment
  const [upgradeStep, setUpgradeStep] = useState<
    "idle" | "domain" | "choose-tier" | "processing"
  >("idle");
  const [chosenDomain, setChosenDomain] = useState<string | null>(null);
  const [chosenTier, setChosenTier] = useState<
    "website" | "pro" | "managed" | null
  >(null);
  const [confirmTier, setConfirmTier] = useState<
    "website" | "pro" | "managed" | null
  >(null);
  const [billingPeriod, setBillingPeriod] = useState<
    "monthly" | "annual"
  >("annual");
  const [domainQuery, setDomainQuery] = useState("");
  const [domainChecking, setDomainChecking] = useState(false);
  const [domainResult, setDomainResult] = useState<
    { domain: string; available: boolean } | null
  >(null);

  console.log('[upgrade] step:', upgradeStep, 'result:', domainResult);



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
  const [brandColour, setBrandColour] = useState<string>("#1877D6");

  // Current subscription tier (from instructors.website_tier)
  const [websiteTier, setWebsiteTier] = useState<TierId>("free");

  // Tabs + collapsible rows
  const [tab, setTab] = useState<"content" | "appearance" | "upgrade">("content");
  const [openRow, setOpenRow] = useState<string | null>(null);

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
        .select("name, app_slug, website_published, website_bio, website_hero_image_url, website_gallery_urls, website_theme, website_font, website_header_style, brand_colour, website_tier")
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
        if (d.website_tier && TIER_ORDER.includes(d.website_tier)) {
          setWebsiteTier(d.website_tier as TierId);
        }

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

  async function checkDomain() {
    const raw = domainQuery.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
    if (raw.length < 3) return;
    setDomainChecking(true);
    setDomainResult(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const result = await checkDomainAvailability(raw, session?.access_token);
      setDomainResult({ domain: result.domain, available: result.available });
    } catch (e: any) {
      toast.error(e.message ?? "Couldn't check that domain");
    } finally {
      setDomainChecking(false);
    }
  }

  async function handleUpgrade(
    tier: 'website' | 'pro' | 'managed'
  ) {
    try {
      const { data: { session } } =
        await supabase.auth.getSession();
      if (!session) {
        toast.error('Please log in first');
        setUpgradeStep('choose-tier');
        return;
      }

      const { url } = await createSubscriptionPaymentLink(
        tier,
        chosenDomain ?? null,
        session.access_token,
        billingPeriod,
      );

      // Redirect to Square checkout
      window.location.href = url;

    } catch (e: any) {
      toast.error(
        e.message ?? 'Could not start upgrade');
      setUpgradeStep('choose-tier');
    }
  }

  async function registerDomain(
    domain: string) {
    try {
      const { data: { session } } =
        await supabase.auth.getSession();
      toast.loading('Registering domain...');

      const res = await fetch(
        'https://bjpqxfrihwjcqprmoqfs.supabase.co/functions/v1/register-domain',
        {
          method: 'POST',
          headers: {
            'Content-IconTypography': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`,
            'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJqcHF4ZnJpaHdqY3Fwcm1vcWZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0NzQ4MjEsImV4cCI6MjA5NzA1MDgyMX0.HKlgx3dxP3uxX9wMRRUnfb0IPwaBpFcut_iUgT5XFeo',
          },
          body: JSON.stringify({ domain }),
        }
      );

      const data = await res.json();

      if (data.error) {
        toast.dismiss();
        toast.error(data.error);
        return;
      }

      toast.dismiss();
      toast.success(
        `${domain} registered! 🎉`,
        {
          description:
            'DNS propagation takes up to 24 hours. Your site will be live soon.',
          duration: 8000,
        }
      );

      setCustomDomain(domain);
      setCustomDomainStatus('pending');
      setShowDomainSearch(false);
    } catch (e: any) {
      toast.dismiss();
      toast.error(
        e.message ?? 'Domain registration failed');
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ ...POPPINS, backgroundColor: "#F3F8FF" }}>
        <IconLoader2 className="animate-spin" color="#1877D6" />
      </div>
    );
  }

  const slugValidFormat = /^[a-z0-9-]+$/.test(slug) && slug.length >= 3;

  const currentIdx = TIER_ORDER.indexOf(websiteTier);

  const TIERS = TIER_CARDS;


  function renderTiers(
    onPick: (tier: "website" | "pro" | "managed") => void,
    ctaLabel: string | null,
  ) {
    return TIERS.map((t) => (
      <div
        key={t.id}
        style={{
          background: "#fff",
          borderRadius: 16,
          boxShadow: "0 1px 3px rgba(11,31,58,0.06)",
          padding: 16,
          marginBottom: 10,
        }}
      >
        <div className="flex items-center justify-between">
          <span
            style={{
              background: t.pillBg,
              color: t.pillColor,
              fontSize: 12,
              fontWeight: 700,
              borderRadius: 20,
              padding: "4px 10px",
            }}
          >
            {billingPeriod === "annual"
              ? `£${PRICES[t.id].annual.toFixed(2)}/year`
              : `£${PRICES[t.id].monthly.toFixed(2)}/month`}
          </span>
          {t.badge && (
            <span
              style={{
                background: "#FEF3C7",
                color: "#92400E",
                fontSize: 10,
                fontWeight: 700,
                borderRadius: 20,
                padding: "3px 8px",
              }}
            >
              {t.badge}
            </span>
          )}
        </div>
        {billingPeriod === "annual" && (
          <div
            style={{
              fontSize: 11,
              color: "#15803D",
              fontWeight: 600,
              marginTop: 4,
            }}
          >
            Save £{ANNUAL_SAVING[t.id].toFixed(2)} vs monthly
          </div>
        )}
        <div
          style={{
            fontSize: 16,
            fontWeight: 800,
            color: "#0B1F3A",
            marginTop: 8,
            fontFamily: "Poppins, sans-serif",
          }}
        >
          {t.name}
        </div>
        <div className="mt-3" style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {t.features.map((f) => (
            <div key={f} className="flex items-center" style={{ gap: 8 }}>
              <IconCheck size={12} color="#15803D" />
              <span style={{ fontSize: 12, color: "#6B7686" }}>{f}</span>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => onPick(t.id)}
          style={{
            width: "100%",
            background: t.btnBg,
            color: "#fff",
            borderRadius: 12,
            padding: 12,
            fontSize: 14,
            fontWeight: 700,
            marginTop: 12,
            border: "none",
            cursor: "pointer",
            fontFamily: "Poppins, sans-serif",
            boxShadow: t.btnShadow,
          }}
        >
          {ctaLabel ?? t.cta}
        </button>
      </div>
    ));
  }

  function promptUpgrade(tier: "website" | "pro" | "managed") {
    setConfirmTier(tier);
  }

  function confirmUpgrade() {
    if (!confirmTier) return;
    setConfirmTier(null);
    startUpgrade(confirmTier);
  }

  function startUpgrade(tier: "website" | "pro" | "managed") {
    setChosenTier(tier);
    setUpgradeStep("domain");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const cardShadow = "0 4px 0 #E4E4E8, 0 12px 26px rgba(0,0,0,0.06)";
  const rowShadow = "0 3px 0 #E4E4E8, 0 8px 18px rgba(0,0,0,0.04)";

  function Eyebrow({ label }: { label: string }) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "18px 0 10px" }}>
        <span style={{ width: 3, height: 14, borderRadius: 2, background: "#1877D6" }} />
        <span
          style={{
            color: "#1877D6",
            fontSize: 12,
            fontWeight: 800,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
          }}
        >
          {label}
        </span>
      </div>
    );
  }

  function CollapsibleRow({
    id,
    icon,
    title,
    summary,
    children,
  }: {
    id: string;
    icon: React.ReactNode;
    title: string;
    summary: string;
    children: React.ReactNode;
  }) {
    const open = openRow === id;
    return (
      <div
        style={{
          background: "#fff",
          borderRadius: 16,
          padding: "14px 16px",
          boxShadow: rowShadow,
          marginBottom: 10,
        }}
      >
        <button
          type="button"
          onClick={() => setOpenRow(open ? null : id)}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            gap: 12,
            background: "none",
            border: "none",
            padding: 0,
            cursor: "pointer",
            textAlign: "left",
            fontFamily: "Poppins, sans-serif",
          }}
        >
          <span
            style={{
              width: 34,
              height: 34,
              borderRadius: 10,
              background: "#E7F1FC",
              color: "#1877D6",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            {icon}
          </span>
          <span style={{ flex: 1, minWidth: 0 }}>
            <span
              style={{
                display: "block",
                fontSize: 15,
                fontWeight: 700,
                color: "#0B1F3A",
              }}
            >
              {title}
            </span>
            <span
              style={{
                display: "block",
                fontSize: 11.5,
                color: "#8A8A8E",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {summary}
            </span>
          </span>
          <IconChevronDown
            size={14}
            color="#C7C7CC"
            style={{
              flexShrink: 0,
              transform: open ? "rotate(180deg)" : "none",
              transition: "transform 0.15s",
            }}
          />
        </button>
        {open && <div style={{ marginTop: 14 }}>{children}</div>}
      </div>
    );
  }

  const COMPARE_GROUPS = COMPARISON_ROWS;


  const COMPARE_COLS = COMPARISON_COLS;


  const gridCols = "1.4fr 1fr 1fr 1fr 1fr";

  return (
    <div className="min-h-screen pb-32" style={{ ...POPPINS, backgroundColor: "#F3F8FF" }}>
      {/* HEADER */}
      <div
        style={{
          background: "#0B1F3A",
          borderRadius: "0 0 28px 28px",
          padding: "calc(16px + env(safe-area-inset-top, 0px)) 16px 22px",
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <button
          type="button"
          aria-label="Back"
          onClick={() => navigate({ to: "/home" as never })}
          style={{
            width: 34,
            height: 34,
            borderRadius: 999,
            background: "rgba(255,255,255,0.08)",
            border: "none",
            cursor: "pointer",
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <IconChevronLeft size={20} />
        </button>
        <div style={{ color: "#fff", fontSize: 22, fontWeight: 800 }}>My Mini Website</div>
      </div>

      <div className="px-4 pt-4">
        {/* URL / STATUS CARD */}
        <div style={{ background: "#fff", borderRadius: 18, padding: 18, boxShadow: cardShadow }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  color: "#8A8A8E",
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  marginBottom: 3,
                }}
              >
                Your website
              </div>
              <div
                style={{
                  color: "#1877D6",
                  fontSize: 15,
                  fontWeight: 700,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {displayUrl}
              </div>
            </div>
            <button
              onClick={copyUrl}
              aria-label="IconCopy URL"
              style={{
                width: 32,
                height: 32,
                borderRadius: 10,
                background: "#F2F2F7",
                border: "none",
                cursor: "pointer",
                color: "#0B1F3A",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <IconCopy size={16} />
            </button>
          </div>

          <button
            type="button"
            onClick={() => window.open(publicUrl, "_blank", "noopener,noreferrer")}
            disabled={!originalSlug}
            style={{
              width: "100%",
              marginTop: 14,
              background: "#F2F2F7",
              color: "#0B1F3A",
              fontSize: 14,
              fontWeight: 700,
              padding: 13,
              borderRadius: 12,
              border: "none",
              cursor: originalSlug ? "pointer" : "not-allowed",
              opacity: originalSlug ? 1 : 0.5,
              fontFamily: "Poppins, sans-serif",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
            }}
          >
            <IconExternalLink size={16} />
            Preview website
          </button>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              borderTop: "1px solid #F0F0F2",
              paddingTop: 14,
              marginTop: 14,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 999,
                  background: published ? "#15803D" : "#C7C7CC",
                }}
              />
              <span style={{ fontSize: 13, fontWeight: 600, color: "#0B1F3A" }}>
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
                background: published ? "#1877D6" : "#E5E5EA",
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

        {/* TABS */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: 4,
            background: "#E5E5EA",
            borderRadius: 14,
            padding: 4,
            marginTop: 14,
          }}
        >
          {(["content", "appearance", "upgrade"] as const).map((t) => {
            const active = tab === t;
            const isUpgrade = t === "upgrade";
            return (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                style={{
                  background: isUpgrade
                    ? active
                      ? "#fff"
                      : "linear-gradient(135deg, #D68A1B, #A56A0F)"
                    : active
                      ? "#fff"
                      : "transparent",
                  color: isUpgrade ? (active ? "#D68A1B" : "#fff") : active ? "#0B1F3A" : "#6B6B6F",
                  boxShadow: isUpgrade
                    ? active
                      ? "0 2px 6px rgba(0,0,0,0.08)"
                      : "0 2px 6px rgba(214,138,27,0.4)"
                    : active
                      ? "0 2px 6px rgba(0,0,0,0.08)"
                      : "none",
                  border: "none",
                  borderRadius: isUpgrade ? 10 : 11,
                  padding: "9px 6px",
                  fontSize: 13,
                  fontWeight: 800,
                  cursor: "pointer",
                  fontFamily: "Poppins, sans-serif",
                  textTransform: isUpgrade ? "none" : "capitalize",
                }}
              >
                {isUpgrade ? "✦ Upgrade" : t}
              </button>
            );
          })}
        </div>

        {/* SLUG CLAIM */}
        {!originalSlug && (
          <Card className="mt-3" style={{ background: "#fff" }}>
            <div className="text-[13px] font-medium mb-2" style={{ color: "#0B1F3A" }}>
              Choose your website address
            </div>
            <Input
              value={slug}
              onChange={(e) => setSlug(slugify(e.target.value))}
              placeholder="your-name"
            />
            <div className="text-[12px] mt-2" style={{ color: "#6B7280" }}>
              {SITE_BASE}<span style={{ color: "#1877D6", fontWeight: 600 }}>{slug || "your-slug"}</span>
            </div>
            <div className="text-[12px] mt-1 flex items-center gap-1" style={{ minHeight: 18 }}>
              {!slugValidFormat && slug && (
                <span style={{ color: "#DC2626" }}>Use lowercase letters, numbers, hyphens (min 3 chars)</span>
              )}
              {slugValidFormat && slugChecking && (
                <span style={{ color: "#6B7280" }}>Checking…</span>
              )}
              {slugValidFormat && !slugChecking && slugAvailable === true && (
                <span style={{ color: "#1877D6", display: "inline-flex", alignItems: "center", gap: 4 }}>
                  <IconCheck size={14} /> Available
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

        {/* ================= CONTENT TAB ================= */}
        {tab === "content" && (
          <>
            <Eyebrow label="Content" />

            <CollapsibleRow
              id="bio"
              icon={<IconFileText size={17} />}
              title="Bio"
              summary={
                websiteBio.trim()
                  ? websiteBio.trim().slice(0, 30) + (websiteBio.trim().length > 30 ? "…" : "")
                  : "Not set"
              }
            >
              <textarea
                value={websiteBio}
                onChange={(e) => setWebsiteBio(e.target.value)}
                placeholder="Tell pupils about yourself, your teaching style, and why they should choose you"
                rows={5}
                className="w-full rounded-lg px-3 py-2 text-[14px] text-[#0B1F3A] bg-white focus:border-[#1877D6] focus:outline-none"
                style={{
                  fontFamily: "Poppins, sans-serif",
                  borderWidth: "0.5px", borderStyle: "solid", borderColor: "#EEF2F7",
                  resize: "vertical",
                }}
              />
            </CollapsibleRow>

            <CollapsibleRow
              id="hero"
              icon={<IconPhoto size={17} />}
              title="Hero image"
              summary={heroUrl ? "Set ✓" : "Not set"}
            >
              {heroUrl ? (
                <div className="relative" style={{ borderRadius: 12, overflow: "hidden" }}>
                  <img src={heroUrl} alt="Hero" style={{ width: "100%", height: 180, objectFit: "cover", display: "block" }} />
                  <button
                    onClick={() => heroInputRef.current?.click()}
                    style={{
                      position: "absolute", bottom: 8, right: 8,
                      background: "rgba(11,31,58,0.85)", color: "#fff",
                      border: "none", borderRadius: 8, padding: "6px 10px",
                      fontSize: 12, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4,
                    }}
                  >
                    <IconCamera size={14} /> Replace
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
                    <IconLoader2 className="animate-spin" color="#1877D6" />
                  ) : (
                    <>
                      <IconCamera size={28} color="#9CA3AF" />
                      <div className="text-[13px] mt-2" style={{ color: "#6B7280" }}>Tap to upload hero image</div>
                    </>
                  )}
                </button>
              )}
              <input ref={heroInputRef} type="file" accept="image/*" hidden onChange={onPickHero} />
            </CollapsibleRow>

            <CollapsibleRow
              id="gallery"
              icon={<IconPhoto size={17} />}
              title="Gallery"
              summary={gallery.length ? `${gallery.length} photos added` : "No photos yet"}
            >
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
                        <IconX size={14} />
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
                    <IconLoader2 className="animate-spin" color="#1877D6" />
                  ) : (
                    <>
                      <IconCamera size={22} color="#9CA3AF" />
                      <div className="text-[12px] mt-1" style={{ color: "#6B7280" }}>Add images</div>
                    </>
                  )}
                </button>
              )}
              <input ref={galleryInputRef} type="file" accept="image/*" multiple hidden onChange={onPickGallery} />
            </CollapsibleRow>
          </>
        )}

        {/* ================= APPEARANCE TAB ================= */}
        {tab === "appearance" && (
          <>
            <Eyebrow label="Appearance" />

            <CollapsibleRow
              id="theme"
              icon={<IconPalette size={17} />}
              title="Theme"
              summary={THEMES.find((t) => t.key === theme)?.label ?? "Classic"}
            >
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
                        borderColor: selected ? "#1877D6" : "#EEF2F7",
                        borderRadius: 12, padding: 10, background: "#fff",
                        cursor: "pointer", textAlign: "left",
                      }}
                    >
                      <div className="flex gap-1 mb-2">
                        {t.swatch.map((c) => (
                          <span key={c} style={{ width: 18, height: 18, borderRadius: 4, background: c, border: "0.5px solid #EEF2F7" }} />
                        ))}
                      </div>
                      <div className="text-[13px] font-medium" style={{ color: "#0B1F3A" }}>{t.label}</div>
                    </button>
                  );
                })}
              </div>
            </CollapsibleRow>

            <CollapsibleRow
              id="font"
              icon={<IconTypography size={17} />}
              title="Font"
              summary={font}
            >
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
                        borderColor: selected ? "#1877D6" : "#EEF2F7",
                        borderRadius: 10, padding: "10px 12px", background: "#fff",
                        cursor: "pointer", textAlign: "left",
                        fontFamily: `${f}, sans-serif`, fontSize: 14, color: "#0B1F3A",
                      }}
                    >
                      {f}
                    </button>
                  );
                })}
              </div>
            </CollapsibleRow>

            <CollapsibleRow
              id="header"
              icon={<IconLayoutBoard size={17} />}
              title="Header style"
              summary={HEADER_STYLES.find((h) => h.key === headerStyle)?.label ?? "Standard"}
            >
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
                        borderColor: selected ? "#1877D6" : "#EEF2F7",
                        borderRadius: 10, padding: "10px 8px", background: "#fff",
                        cursor: "pointer", textAlign: "center",
                        fontSize: 12, color: "#0B1F3A",
                      }}
                    >
                      {h.label}
                    </button>
                  );
                })}
              </div>
            </CollapsibleRow>

            <CollapsibleRow
              id="colour"
              icon={<IconBrush size={17} />}
              title="Brand colour"
              summary={brandColour}
            >
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
                  placeholder="#1877D6"
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
                      border: brandColour.toLowerCase() === c.toLowerCase() ? "2px solid #0B1F3A" : "0.5px solid #EEF2F7",
                    }}
                  />
                ))}
              </div>
            </CollapsibleRow>
          </>
        )}

        {(tab === "content" || tab === "appearance") && (
          <button
            type="button"
            onClick={saveAll}
            disabled={saving}
            style={{
              width: "100%",
              background: "#1877D6",
              color: "#fff",
              fontSize: 15,
              fontWeight: 800,
              padding: 16,
              borderRadius: 14,
              border: "none",
              cursor: "pointer",
              boxShadow: "0 4px 0 #0F52A8",
              fontFamily: "Poppins, sans-serif",
              marginTop: 8,
              opacity: saving ? 0.6 : 1,
            }}
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
        )}



        {/* ================= UPGRADE TAB ================= */}
        {tab === "upgrade" && (
          <>
            {/* CURRENT PLAN */}
            <div
              style={{
                background: "#E7F1FC",
                border: "1.5px solid #1877D6",
                borderRadius: 18,
                padding: 16,
                display: "flex",
                gap: 12,
                alignItems: "center",
                marginTop: 16,
              }}
            >
              <span
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 999,
                  background: "#1877D6",
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <IconCheck size={18} />
              </span>
              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    color: "#1877D6",
                    fontSize: 10.5,
                    fontWeight: 800,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                  }}
                >
                  Current plan
                </div>
                <div style={{ fontSize: 15, fontWeight: 800, color: "#0B1F3A" }}>
                  {TIER_NAMES[websiteTier]}
                </div>
              </div>
            </div>

            <Eyebrow label="Upgrade your website" />

            {/* TIER 1 — FREE */}
            {currentIdx <= 0 && (
              <div
                style={{
                  background: "#fff",
                  borderRadius: 18,
                  padding: 18,
                  boxShadow: cardShadow,
                  marginBottom: 12,
                  opacity: websiteTier === "free" ? 1 : 0.85,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span
                    style={{
                      background: "#F2F2F7",
                      color: "#6B6B6F",
                      fontSize: 12,
                      fontWeight: 700,
                      borderRadius: 20,
                      padding: "4px 12px",
                    }}
                  >
                    Free
                  </span>
                  {websiteTier === "free" && (
                    <span
                      style={{
                        background: "#1877D6",
                        color: "#fff",
                        fontSize: 10,
                        fontWeight: 800,
                        borderRadius: 20,
                        padding: "3px 10px",
                      }}
                    >
                      Your plan
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 16, fontWeight: 800, color: "#0B1F3A", marginTop: 8 }}>
                  DSM Mini Website (Free)
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 5, marginTop: 12 }}>
                  {[
                    "Professional mini-site",
                    "Online booking",
                    "Square payments",
                    "Enquiry form",
                    "sites.everydriver.co.uk/slug",
                  ].map((f) => (
                    <div key={f} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <IconCheck size={12} color="#15803D" />
                      <span style={{ fontSize: 12, color: "#6B7686" }}>{f}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TIER 2 — DSM WEBSITE */}
            {currentIdx <= 1 && (
              <div
                style={{
                  background: "#fff",
                  borderRadius: 18,
                  padding: 18,
                  boxShadow: cardShadow,
                  marginBottom: 12,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span
                    style={{
                      background: "#EFF6FF",
                      color: "#1877D6",
                      fontSize: 12,
                      fontWeight: 700,
                      borderRadius: 20,
                      padding: "4px 12px",
                    }}
                  >
                    £9.99/mo
                  </span>
                  {websiteTier === "website" && (
                    <span
                      style={{
                        background: "#1877D6",
                        color: "#fff",
                        fontSize: 10,
                        fontWeight: 800,
                        borderRadius: 20,
                        padding: "3px 10px",
                      }}
                    >
                      Your plan
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 16, fontWeight: 800, color: "#0B1F3A", marginTop: 8 }}>
                  DSM Website
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 5, marginTop: 12 }}>
                  {[
                    "Everything in Free",
                    "Your own .co.uk domain",
                    'Remove "Powered by EveryDriver"',
                    "Gallery (20 photos)",
                    "Video intro",
                    "Google reviews widget",
                    "Analytics dashboard",
                    "Priority listing on EveryDriver",
                  ].map((f) => (
                    <div key={f} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <IconCheck size={12} color="#15803D" />
                      <span style={{ fontSize: 12, color: "#6B7686" }}>{f}</span>
                    </div>
                  ))}
                </div>
                {websiteTier !== "website" && (
                  <button
                    type="button"
                    onClick={() => promptUpgrade("website")}
                    style={{
                      width: "100%",
                      background: "#1877D6",
                      color: "#fff",
                      borderRadius: 12,
                      padding: 13,
                      fontSize: 14,
                      fontWeight: 800,
                      marginTop: 14,
                      border: "none",
                      cursor: "pointer",
                      boxShadow: "0 4px 0 #0F52A8",
                      fontFamily: "Poppins, sans-serif",
                    }}
                  >
                    Upgrade to DSM Website →
                  </button>
                )}
              </div>
            )}

            {/* TIER 3 — PRO */}
            {currentIdx <= 2 && (
              <div
                style={{
                  background: "linear-gradient(150deg, #14509E, #0B1F3A)",
                  borderRadius: 18,
                  padding: 18,
                  position: "relative",
                  overflow: "hidden",
                  marginBottom: 12,
                }}
              >
                <span
                  style={{
                    position: "absolute",
                    top: -40,
                    right: -40,
                    width: 160,
                    height: 160,
                    borderRadius: "50%",
                    background: "rgba(99,179,237,0.15)",
                  }}
                />
                <span
                  style={{
                    position: "absolute",
                    top: 14,
                    right: -24,
                    background: "#15803D",
                    color: "#fff",
                    fontSize: 9,
                    fontWeight: 900,
                    padding: "4px 32px",
                    transform: "rotate(38deg)",
                  }}
                >
                  MOST POPULAR
                </span>
                <div style={{ position: "relative" }}>
                  <span
                    style={{
                      display: "inline-block",
                      background: "rgba(255,255,255,0.15)",
                      color: "#fff",
                      fontSize: 12,
                      fontWeight: 700,
                      borderRadius: 20,
                      padding: "4px 12px",
                    }}
                  >
                    PRO
                  </span>
                  {websiteTier === "pro" && (
                    <span
                      style={{
                        display: "inline-block",
                        marginLeft: 8,
                        background: "#1877D6",
                        color: "#fff",
                        fontSize: 10,
                        fontWeight: 800,
                        borderRadius: 20,
                        padding: "3px 10px",
                      }}
                    >
                      Your plan
                    </span>
                  )}
                  <div style={{ marginTop: 10, display: "flex", alignItems: "baseline", gap: 6 }}>
                    <span style={{ fontSize: 38, fontWeight: 800, color: "#fff", letterSpacing: -1 }}>
                      £19.99
                    </span>
                    <span style={{ fontSize: 14, color: "rgba(255,255,255,0.6)" }}>/month</span>
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: "#fff", marginTop: 2 }}>
                    DSM Website Pro
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 12 }}>
                    {[
                      "Everything in DSM Website",
                      "Multiple area pages",
                      "Blog & content pages",
                      "Advanced SEO tools",
                      "Google Search Console",
                      "Promo codes on booking",
                      "Instructor login to edit site",
                    ].map((f) => (
                      <div key={f} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span
                          style={{
                            width: 16,
                            height: 16,
                            borderRadius: 999,
                            background: "#15803D",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                          }}
                        >
                          <IconCheck size={10} color="#fff" />
                        </span>
                        <span style={{ fontSize: 12, color: "rgba(255,255,255,0.85)" }}>{f}</span>
                      </div>
                    ))}
                  </div>
                  {websiteTier !== "pro" && (
                    <button
                      type="button"
                      onClick={() => promptUpgrade("pro")}
                      style={{
                        width: "100%",
                        background: "#fff",
                        color: "#0B1F3A",
                        borderRadius: 12,
                        padding: 13,
                        fontSize: 14,
                        fontWeight: 800,
                        marginTop: 14,
                        border: "none",
                        cursor: "pointer",
                        boxShadow: "0 4px 0 rgba(0,0,0,0.3)",
                        fontFamily: "Poppins, sans-serif",
                      }}
                    >
                      Upgrade to Pro →
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* TIER 4 — MANAGED */}
            <div
              style={{
                background: "linear-gradient(150deg, #1a1a1a, #000)",
                borderRadius: 18,
                padding: 18,
                position: "relative",
                overflow: "hidden",
                marginBottom: 12,
              }}
            >
              <span
                style={{
                  position: "absolute",
                  top: -40,
                  right: -40,
                  width: 160,
                  height: 160,
                  borderRadius: "50%",
                  background: "rgba(214,138,27,0.2)",
                }}
              />
              <div style={{ position: "relative" }}>
                <span
                  style={{
                    display: "inline-block",
                    background: "#D68A1B",
                    color: "#fff",
                    fontSize: 9,
                    fontWeight: 900,
                    padding: "3px 10px",
                    borderRadius: 20,
                  }}
                >
                  WHITE GLOVE
                </span>
                {websiteTier === "managed" && (
                  <span
                    style={{
                      display: "inline-block",
                      marginLeft: 8,
                      background: "#1877D6",
                      color: "#fff",
                      fontSize: 10,
                      fontWeight: 800,
                      borderRadius: 20,
                      padding: "3px 10px",
                    }}
                  >
                    Your plan
                  </span>
                )}
                <div style={{ marginTop: 10, display: "flex", alignItems: "baseline", gap: 6 }}>
                  <span style={{ fontSize: 38, fontWeight: 800, color: "#fff", letterSpacing: -1 }}>
                    £29.99
                  </span>
                  <span style={{ fontSize: 14, color: "rgba(255,255,255,0.6)" }}>/month</span>
                </div>
                <div style={{ fontSize: 15, fontWeight: 800, color: "#fff", marginTop: 2 }}>
                  DSM Managed Website
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 12 }}>
                  {[
                    "Everything in Pro",
                    "We build your site for you",
                    "Monthly content updates",
                    "SEO reporting & management",
                    "Google Business Profile setup",
                    "Dedicated account manager",
                  ].map((f) => (
                    <div key={f} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span
                        style={{
                          width: 16,
                          height: 16,
                          borderRadius: 999,
                          background: "#D68A1B",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        <IconCheck size={10} color="#fff" />
                      </span>
                      <span style={{ fontSize: 12, color: "rgba(255,255,255,0.85)" }}>{f}</span>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => window.open(MANAGED_WA, "_blank")}
                  style={{
                    width: "100%",
                    background: "#D68A1B",
                    color: "#fff",
                    borderRadius: 12,
                    padding: 13,
                    fontSize: 14,
                    fontWeight: 800,
                    marginTop: 14,
                    border: "none",
                    cursor: "pointer",
                    boxShadow: "0 4px 0 #A56A0F",
                    fontFamily: "Poppins, sans-serif",
                  }}
                >
                  Contact us →
                </button>
              </div>
            </div>

            {/* COMPARISON TABLE */}
            <Eyebrow label="Compare plans" />
            <div
              style={{
                background: "#fff",
                borderRadius: 18,
                overflow: "hidden",
                boxShadow: cardShadow,
              }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: gridCols,
                  position: "sticky",
                  top: 0,
                  zIndex: 10,
                  background: "#fff",
                  boxShadow: "0 2px 8px rgba(11,31,58,0.06)",
                }}
              >
                <div />
                {COMPARE_COLS.map((c) => (
                  <div
                    key={c.id}
                    style={{
                      padding: "12px 4px",
                      textAlign: "center",
                      background: c.id === websiteTier ? "#F7FAFE" : "transparent",
                    }}
                  >
                    <div style={{ fontSize: 11, fontWeight: 800, color: "#0B1F3A" }}>{c.name}</div>
                    <div style={{ fontSize: 9, color: "#8A8A8E", marginTop: 1 }}>{c.price}</div>
                    {c.id === websiteTier && (
                      <div
                        style={{
                          display: "inline-block",
                          background: "#1877D6",
                          color: "#fff",
                          fontSize: 9,
                          fontWeight: 800,
                          borderRadius: 20,
                          padding: "2px 7px",
                          marginTop: 4,
                        }}
                      >
                        CURRENT
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {COMPARE_GROUPS.map((g, groupIdx) => (
                <div key={g.title}>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: gridCols,
                      borderTop: "1px solid #E8EDF3",
                      background: "#F7FAFE",
                    }}
                  >
                    <div
                      style={{
                        gridColumn: "1 / -1",
                        padding: "8px 12px",
                        fontSize: 10,
                        fontWeight: 800,
                        color: "#1877D6",
                        letterSpacing: "0.04em",
                        textTransform: "uppercase",
                      }}
                    >
                      {g.title}
                    </div>
                  </div>
                  {g.rows.map((r, rowIdx) => (
                    <div
                      key={r.label}
                      style={{
                        display: "grid",
                        gridTemplateColumns: gridCols,
                        borderTop: "1px solid #F0F0F2",
                        alignItems: "center",
                        background: groupIdx % 2 === 1 ? "rgba(243,248,255,0.35)" : "transparent",
                      }}
                    >
                      <div style={{ fontSize: 11.5, color: "#0B1F3A", padding: "10px 12px" }}>{r.label}</div>
                      {COMPARE_COLS.map((c, i) => (
                        <div
                          key={c.id}
                          style={{
                            textAlign: "center",
                            padding: "10px 4px",
                            background: c.id === websiteTier ? "#F7FAFE" : "transparent",
                          }}
                        >
                          {i >= r.from ? (
                            <span
                              style={{
                                display: "inline-flex",
                                width: 16,
                                height: 16,
                                borderRadius: 999,
                                background: "#15803D",
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                            >
                              <IconCheck size={10} color="#fff" />
                            </span>
                          ) : (
                            <span style={{ color: "#C7C7CC", fontSize: 13 }}>—</span>
                          )}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              ))}

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: gridCols,
                  borderTop: "1px solid #F0F0F2",
                  alignItems: "center",
                }}
              >
                <div />
                {COMPARE_COLS.map((c) => {
                  const isCurrent = c.id === websiteTier;
                  const isManaged = c.id === "managed";
                  const above = TIER_ORDER.indexOf(c.id) > currentIdx;
                  return (
                    <div key={c.id} style={{ padding: "10px 4px", textAlign: "center" }}>
                      {isCurrent ? (
                        <span
                          style={{
                            display: "inline-block",
                            background: "#F2F2F7",
                            color: "#9CA3AF",
                            fontSize: 10,
                            fontWeight: 800,
                            borderRadius: 10,
                            padding: "6px 8px",
                          }}
                        >
                          Current
                        </span>
                      ) : isManaged ? (
                        <button
                          type="button"
                          onClick={() => window.open(MANAGED_WA, "_blank")}
                          style={{
                            background: "#D68A1B",
                            color: "#fff",
                            fontSize: 10,
                            fontWeight: 800,
                            borderRadius: 10,
                            padding: "6px 8px",
                            border: "none",
                            cursor: "pointer",
                            fontFamily: "Poppins, sans-serif",
                          }}
                        >
                          Contact
                        </button>
                      ) : above ? (
                        <button
                          type="button"
                          onClick={() => promptUpgrade(c.id as "website" | "pro")}
                          style={{
                            background: "#1877D6",
                            color: "#fff",
                            fontSize: 10,
                            fontWeight: 800,
                            borderRadius: 10,
                            padding: "6px 8px",
                            border: "none",
                            cursor: "pointer",
                            fontFamily: "Poppins, sans-serif",
                          }}
                        >
                          Upgrade
                        </button>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>

            <div
              style={{
                textAlign: "center",
                fontSize: 12,
                color: "#6B7686",
                marginTop: 12,
              }}
            >
              All plans include SSL, hosting and mobile optimised design. Cancel anytime.
            </div>
          </>
        )}
      </div>

      {/* UPGRADE CONFIRMATION DIALOG */}
      {confirmTier && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(11,31,58,0.55)",
            zIndex: 190,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
          onClick={() => setConfirmTier(null)}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: 20,
              padding: 24,
              maxWidth: 400,
              width: "100%",
              boxShadow: "0 20px 60px rgba(11,31,58,0.25)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontSize: 18, fontWeight: 800, color: "#0B1F3A", marginBottom: 4 }}>
              Confirm upgrade
            </div>
            <div style={{ fontSize: 13, color: "#6B7686", marginBottom: 20 }}>
              You’re about to start upgrading to the {TIER_NAMES[confirmTier]}. You can choose or skip a custom domain on the next step.
            </div>
            <div
              style={{
                background: "#F3F8FF",
                borderRadius: 14,
                padding: 16,
                marginBottom: 20,
              }}
            >
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: "#0B1F3A" }}>{TIER_NAMES[confirmTier]}</span>
                <span style={{ fontSize: 14, fontWeight: 800, color: "#1877D6" }}>
                  {confirmTier === "website" ? "£9.99" : confirmTier === "pro" ? "£19.99" : "£29.99"}/mo
                </span>
              </div>
              <div style={{ fontSize: 12, color: "#6B7686" }}>
                {confirmTier === "website" && "Your own .co.uk domain, gallery, video intro, Google reviews widget and analytics."}
                {confirmTier === "pro" && "Everything in Website, plus blog & content pages, advanced SEO, promo codes and instructor login."}
                {confirmTier === "managed" && "Everything in Pro, plus we build your site for you, monthly updates and dedicated account manager."}
              </div>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                type="button"
                onClick={() => setConfirmTier(null)}
                style={{
                  flex: 1,
                  background: "#F3F8FF",
                  color: "#0B1F3A",
                  borderRadius: 12,
                  padding: 13,
                  fontSize: 14,
                  fontWeight: 700,
                  border: "none",
                  cursor: "pointer",
                  fontFamily: "Poppins, sans-serif",
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmUpgrade}
                style={{
                  flex: 1,
                  background: "#1877D6",
                  color: "#fff",
                  borderRadius: 12,
                  padding: 13,
                  fontSize: 14,
                  fontWeight: 800,
                  border: "none",
                  cursor: "pointer",
                  fontFamily: "Poppins, sans-serif",
                }}
              >
                Continue →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 1 — DOMAIN SEARCH OVERLAY */}
      {upgradeStep === "domain" && (
        <div style={{ position: "fixed", inset: 0, background: "#EEF2F7", zIndex: 200, overflowY: "auto" }}>
          <div style={{ background: "#0B1F3A", padding: 16, display: "flex", gap: 12, alignItems: "center" }}>
            <button
              type="button"
              onClick={() => setUpgradeStep("idle")}
              aria-label="Back"
              style={{ background: "none", border: "none", cursor: "pointer", color: "#fff", display: "flex" }}
            >
              <IconChevronLeft size={22} />
            </button>
            <div style={{ color: "#fff", fontSize: 18, fontWeight: 800 }}>Choose your domain</div>
          </div>

          <div style={{ maxWidth: 480, margin: "0 auto", padding: "24px 16px" }}>
            <div
              style={{
                background: "#fff",
                borderRadius: 16,
                padding: 16,
                marginBottom: 16,
                boxShadow: "0 1px 3px rgba(11,31,58,0.06)",
              }}
            >
              <div style={{ fontSize: 20, marginBottom: 6 }}>🌐</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#0B1F3A" }}>
                Your domain is included free with your subscription
              </div>
              <div style={{ fontSize: 12, color: "#6B7686", marginTop: 4 }}>
                Search for your school name — we'll register it automatically when you subscribe.
              </div>
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <input
                value={domainQuery}
                onChange={(e) => {
                  setDomainQuery(e.target.value);
                  setDomainResult(null);
                }}
                placeholder="yourschoolname.co.uk"
                style={{
                  flex: 1,
                  background: "#fff",
                  border: "0.5px solid #E4E8EF",
                  borderRadius: 12,
                  padding: "12px 14px",
                  fontSize: 14,
                  fontFamily: "Poppins, sans-serif",
                  color: "#0B1F3A",
                }}
              />
              <button
                type="button"
                onClick={checkDomain}
                disabled={domainChecking || domainQuery.trim().length < 3}
                style={{
                  background: "#1877D6",
                  color: "#fff",
                  border: "none",
                  borderRadius: 12,
                  padding: "0 18px",
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: "pointer",
                  fontFamily: "Poppins, sans-serif",
                  opacity: domainChecking || domainQuery.trim().length < 3 ? 0.5 : 1,
                }}
              >
                {domainChecking ? "…" : "IconCheck"}
              </button>
            </div>

            {domainResult && !domainResult.available && (
              <div
                style={{
                  marginTop: 12,
                  background: "#FEF2F2",
                  border: "0.5px solid #FECACA",
                  borderRadius: 16,
                  padding: 16,
                  fontSize: 13,
                  color: "#CC2229",
                  fontWeight: 600,
                }}
              >
                {domainResult.domain} is already taken — try another name.
              </div>
            )}

            {domainResult && domainResult.available && (
              <div
                style={{
                  marginTop: 12,
                  background: "#F0FDF4",
                  border: "0.5px solid #BBF7D0",
                  borderRadius: 16,
                  padding: 16,
                }}
              >
                <div style={{ fontSize: 15, fontWeight: 800, color: "#0B1F3A" }}>{domainResult.domain}</div>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#15803D", marginTop: 4 }}>
                  ✓ Available — this domain is yours
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setChosenDomain(domainResult.domain);
                    setUpgradeStep("choose-tier");
                  }}
                  style={{
                    width: "100%",
                    background: "#15803D",
                    color: "#fff",
                    borderRadius: 12,
                    padding: 12,
                    fontSize: 14,
                    fontWeight: 700,
                    marginTop: 12,
                    border: "none",
                    cursor: "pointer",
                    fontFamily: "Poppins, sans-serif",
                  }}
                >
                  Continue with {domainResult.domain} →
                </button>
              </div>
            )}

            <div
              style={{
                textAlign: "center",
                marginTop: 32,
                paddingTop: 16,
                borderTop: "1px solid #E4E8EF",
              }}
            >
              <button
                type="button"
                onClick={() => setUpgradeStep("choose-tier")}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontSize: 11,
                  color: "#C7D0DC",
                  fontFamily: "Poppins, sans-serif",
                  padding: "4px 8px",
                }}
              >
                Skip — I don't need a domain
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 2 — CHOOSE TIER OVERLAY */}
      {upgradeStep === "choose-tier" && (
        <div style={{ position: "fixed", inset: 0, background: "#EEF2F7", zIndex: 200, overflowY: "auto" }}>
          <div style={{ background: "#0B1F3A", padding: 16, display: "flex", gap: 12, alignItems: "center" }}>
            <button
              type="button"
              onClick={() => setUpgradeStep("domain")}
              aria-label="Back"
              style={{ background: "none", border: "none", cursor: "pointer", color: "#fff", display: "flex" }}
            >
              <IconChevronLeft size={22} />
            </button>
            <div style={{ color: "#fff", fontSize: 18, fontWeight: 800 }}>Choose your plan</div>
          </div>

          <div style={{ maxWidth: 480, margin: "0 auto", padding: "24px 16px" }}>
            {chosenDomain && (
              <div style={{ marginBottom: 16 }}>
                <span
                  style={{
                    display: "inline-block",
                    background: "#DCFCE7",
                    color: "#15803D",
                    fontSize: 11,
                    fontWeight: 700,
                    borderRadius: 20,
                    padding: "4px 12px",
                  }}
                >
                  ✓ {chosenDomain} reserved
                </span>
              </div>
            )}

            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 0,
                background: "#E5E5EA",
                borderRadius: 14,
                padding: 4,
                margin: "0 0 16px",
              }}
            >
              <button
                type="button"
                onClick={() => setBillingPeriod("monthly")}
                style={{
                  flex: 1,
                  padding: "8px 0",
                  borderRadius: 10,
                  border: "none",
                  cursor: "pointer",
                  fontFamily: "Poppins, sans-serif",
                  fontSize: 13,
                  fontWeight: 600,
                  background: billingPeriod === "monthly" ? "#fff" : "transparent",
                  color: billingPeriod === "monthly" ? "#0B1F3A" : "#6B6B6F",
                  boxShadow: billingPeriod === "monthly" ? "0 2px 6px rgba(0,0,0,0.08)" : "none",
                  transition: "all 0.15s",
                }}
              >
                Monthly
              </button>
              <button
                type="button"
                onClick={() => setBillingPeriod("annual")}
                style={{
                  flex: 1,
                  padding: "8px 0",
                  borderRadius: 10,
                  border: "none",
                  cursor: "pointer",
                  fontFamily: "Poppins, sans-serif",
                  fontSize: 13,
                  fontWeight: 600,
                  background: billingPeriod === "annual" ? "#fff" : "transparent",
                  color: billingPeriod === "annual" ? "#0B1F3A" : "#6B6B6F",
                  boxShadow: billingPeriod === "annual" ? "0 2px 6px rgba(0,0,0,0.08)" : "none",
                  transition: "all 0.15s",
                  position: "relative",
                }}
              >
                Annual
                <span
                  style={{
                    marginLeft: 6,
                    background: "#15803D",
                    color: "#fff",
                    fontSize: 9,
                    fontWeight: 800,
                    borderRadius: 20,
                    padding: "2px 6px",
                    verticalAlign: "middle",
                  }}
                >
                  2 months free
                </span>
              </button>
            </div>

            {renderTiers(
              (tier) => {
                setChosenTier(tier);
                setUpgradeStep("processing");
                handleUpgrade(tier);
              },
              chosenDomain ? "Subscribe & register domain →" : "Subscribe →",
            )}
          </div>
        </div>
      )}

      {/* STEP 3 — PROCESSING */}
      {upgradeStep === "processing" && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "#EEF2F7",
            zIndex: 210,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "column",
          }}
        >
          <PageLoader />
          <div style={{ fontSize: 14, fontWeight: 600, color: "#0B1F3A" }}>
            Setting up your subscription...
          </div>
        </div>
      )}
    </div>
  );
}

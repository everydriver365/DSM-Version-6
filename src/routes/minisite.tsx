import { createFileRoute, useNavigate } from "@tanstack/react-router";
import type React from "react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import InstructorTopBar from "@/components/dsm/InstructorTopBar";
import {
  Copy,
  ExternalLink,
  Camera,
  X,
  Check,
  Loader2,
  ChevronLeft,
} from "lucide-react";
import { PageLoader } from "@/components/dsm/LoadingSpinner";
import { IconCheck } from "@tabler/icons-react";
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

const POPPINS = { fontFamily: "Poppins, sans-serif" } as const;
const SITE_BASE = "sites.everydriver.co.uk/";

type Theme = "classic" | "modern" | "warm" | "bold";
type Font = "Poppins" | "Playfair Display";
type HeaderStyle = "standard" | "centered" | "split";
type TierId = "free" | "website" | "pro" | "managed";

const TIER_ORDER: TierId[] = ["free", "website", "pro", "managed"];
const TIER_NAMES: Record<TierId, string> = {
  free: "DSM Mini Website (Free)",
  website: "DSM Website",
  pro: "DSM Website Pro",
  managed: "DSM Managed Website",
};
const MANAGED_WA =
  "https://wa.me/447767693279?text=" +
  encodeURIComponent("Hi, I'm interested in DSM Managed Website");


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

  async function checkDomain() {
    const raw = domainQuery.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
    if (raw.length < 3) return;
    const domain = raw.includes(".") ? raw : `${raw.replace(/[^a-z0-9-]/g, "")}.co.uk`;
    setDomainChecking(true);
    setDomainResult(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        'https://bjpqxfrihwjcqprmoqfs.supabase.co/functions/v1/check-domain',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`,
            'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJqcHF4ZnJpaHdqY3Fwcm1vcWZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0NzQ4MjEsImV4cCI6MjA5NzA1MDgyMX0.HKlgx3dxP3uxX9wMRRUnfb0IPwaBpFcut_iUgT5XFeo',
          },
          body: JSON.stringify({ domain }),
        }
      );
      const data = await res.json();
      if (data.error) {
        toast.error(data.error);
        return;
      }
      setDomainResult({ domain: data.domain ?? domain, available: !!data.available });
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

      const res = await fetch(
        'https://bjpqxfrihwjcqprmoqfs.supabase.co/functions/v1/square-create-subscription',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
            'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJqcHF4ZnJpaHdqY3Fwcm1vcWZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0NzQ4MjEsImV4cCI6MjA5NzA1MDgyMX0.HKlgx3dxP3uxX9wMRRUnfb0IPwaBpFcut_iUgT5XFeo',
          },
          body: JSON.stringify({
            tier,
            domain: chosenDomain ?? null,
            redirect_url: `https://drivingschoolmanager.co.uk/subscription-success?tier=${tier}&domain=${chosenDomain ?? ''}`,
          }),
        }
      );

      const data = await res.json();

      if (data.error) {
        toast.error(data.error);
        setUpgradeStep('choose-tier');
        return;
      }

      // Redirect to Square checkout
      window.location.href = data.url;
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
            'Content-Type': 'application/json',
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
        <Loader2 className="animate-spin" color="#1877D6" />
      </div>
    );
  }

  const slugValidFormat = /^[a-z0-9-]+$/.test(slug) && slug.length >= 3;

  const TIERS: {
    id: "website" | "pro" | "managed";
    name: string;
    price: string;
    pillBg: string;
    pillColor: string;
    badge?: string;
    features: string[];
    cta: string;
    btnBg: string;
    btnShadow: string;
  }[] = [
    {
      id: "website",
      name: "DSM Website",
      price: "£9.99/mo",
      pillBg: "#EFF6FF",
      pillColor: "#1877D6",
      badge: "Most popular",
      features: [
        "Your own .co.uk domain included",
        'Remove "Powered by EveryDriver"',
        "Gallery (up to 20 photos)",
        "Video intro",
        "Google reviews widget",
        "Priority listing on EveryDriver",
        "Analytics dashboard",
      ],
      cta: "Upgrade to DSM Website →",
      btnBg: "#1877D6",
      btnShadow: "0 3px 0 #0F52A8",
    },
    {
      id: "pro",
      name: "DSM Website Pro",
      price: "£19.99/mo",
      pillBg: "#EDE9FE",
      pillColor: "#7C3AED",
      features: [
        "Everything in DSM Website",
        "Multiple area pages",
        "Blog & content pages",
        "Advanced SEO tools",
        "Google Search Console",
        "Promo codes on booking",
        "Instructor login to edit site",
      ],
      cta: "Upgrade to Pro →",
      btnBg: "#7C3AED",
      btnShadow: "0 3px 0 #5B21B6",
    },
    {
      id: "managed",
      name: "DSM Managed Website",
      price: "£29.99/mo",
      pillBg: "#F1F5F9",
      pillColor: "#0B1F3A",
      features: [
        "Everything in Pro",
        "We build your website for you",
        "Monthly content updates",
        "SEO reporting & management",
        "Google Business Profile setup",
        "Dedicated account manager",
      ],
      cta: "Get a managed website →",
      btnBg: "#0B1F3A",
      btnShadow: "0 3px 0 #050D1C",
    },
  ];

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
            {t.price}
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

  return (
    <div className="min-h-screen pb-32" style={{ ...POPPINS, backgroundColor: "#F3F8FF" }}>
      <InstructorTopBar
        firstName=""
        pageTitle="My website"
        onBack={() => navigate({ to: "/home" as never })}
        onBell={() => navigate({ to: "/notifications" as never })}
        onPhone={() => navigate({ to: "/enquiries" as never })}
        onLiveTrack={() => navigate({ to: "/live" as never })}
        onMenu={() => navigate({ to: "/more" as never })}
        onMicPress={() => toast.info("Voice commands coming soon!")}
      />
      <div style={{ height: "calc(60px + env(safe-area-inset-top, 0px))" }} />


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
            <div className="text-[14px] truncate" style={{ color: "#1877D6" }}>{displayUrl}</div>
            <button
              onClick={copyUrl}
              aria-label="Copy URL"
              style={{ background: "none", border: "none", cursor: "pointer", color: "#1877D6", display: "flex" }}
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
                  backgroundColor: published ? "#1877D6" : "#1877D6",
                }}
              />
              <span className="text-[13px]" style={{ color: published ? "#1877D6" : "#0B1F3A", fontWeight: 600 }}>
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
                background: published ? "#1877D6" : "#EEF2F7",
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
            style={{ color: "#6B7280", fontFamily: "Poppins, sans-serif" }}
          >
            Website bio
          </label>
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
                  background: "rgba(11,31,58,0.85)", color: "#fff",
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
                <Loader2 className="animate-spin" color="#1877D6" />
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
                <Loader2 className="animate-spin" color="#1877D6" />
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
        </Card>

        <div className="mt-4">
          <Button onClick={saveAll} disabled={saving}>
            {saving ? "Saving…" : "Save changes"}
          </Button>
        </div>

        {/* UPGRADE TIERS */}
        <div className="pt-2">
          <div
            className="mb-3"
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: "#9CA3AF",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
            }}
          >
            Upgrade your website
          </div>

          {renderTiers((tier) => {
            setChosenTier(tier);
            setUpgradeStep("domain");
            window.scrollTo({ top: 0, behavior: "smooth" });
          }, null)}

          <div
            style={{
              textAlign: "center",
              fontSize: 12,
              color: "#6B7686",
              marginTop: 12,
              fontFamily: "Poppins, sans-serif",
            }}
          >
            All plans include SSL, hosting and mobile optimised design. Cancel anytime.
          </div>
        </div>
      </div>

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
              <ChevronLeft size={22} />
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
                {domainChecking ? "…" : "Check"}
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
              <ChevronLeft size={22} />
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

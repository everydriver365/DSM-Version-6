import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  IconCheck,
  IconChevronLeft,
  IconChevronRight,
  IconCircleCheck,
  IconExternalLink,
  IconLock,
  IconX,
} from "@tabler/icons-react";
import { supabase } from "@/lib/supabaseClient";
import InstructorTopBar, { TOP_BAR_SPACER } from "@/components/dsm/InstructorTopBar";
import { PageLoader } from "@/components/dsm/LoadingSpinner";
import { useGoBack } from "@/hooks/useGoBack";
import { createSubscriptionPaymentLink, type PaidTierId } from "@/lib/websiteUpgrade";

export const Route = createFileRoute("/perks_/$perkId")({
  head: () => ({
    meta: [
      { title: "Perk details — Driving School Manager" },
      {
        name: "description",
        content: "Member perk details, savings and how to access it with your DSM plan.",
      },
      { property: "og:title", content: "Perk details — Driving School Manager" },
      {
        property: "og:description",
        content: "Member perk details, savings and how to access it with your DSM plan.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PerkDetailPage,
});

const TIER_ORDER = ["free", "website", "pro", "managed"];

const TIER_DISPLAY: Record<string, string> = {
  free: "Free",
  website: "Essential",
  pro: "Pro",
  managed: "Max",
};

function hasAccess(userTier: string, minTier: string): boolean {
  return TIER_ORDER.indexOf(userTier) >= TIER_ORDER.indexOf(minTier);
}

type PerkDetail = {
  id: string;
  partner_id: string;
  name: string;
  description: string | null;
  detail_text: string | null;
  category: string | null;
  saving: string | null;
  min_tier: string;
  cta_label: string | null;
  cta_action: string | null;
  coming_soon: boolean;
  hero_image_url: string | null;
  gallery_urls: string[] | null;
  bullet_points: string[] | null;
  links: { label: string; url: string }[] | null;
  video_url: string | null;
  video_embed_url: string | null;
  partner: {
    name: string;
    icon_bg: string | null;
    icon_color: string | null;
  } | null;
};

const CARD: React.CSSProperties = {
  margin: "0 16px 16px",
  background: "#fff",
  borderRadius: 16,
  border: "1px solid #E4E8EF",
  padding: 16,
  boxShadow: "0 1px 3px rgba(11,31,58,0.06)",
  fontFamily: "Poppins, sans-serif",
};

const LABEL: React.CSSProperties = {
  color: "#9CA3AF",
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  marginBottom: 10,
  fontFamily: "Poppins, sans-serif",
};

function PerkDetailPage() {
  const { perkId } = Route.useParams();
  const navigate = useNavigate();
  const goBack = useGoBack();

  const [perk, setPerk] = useState<PerkDetail | null>(null);
  const [websiteTier, setWebsiteTier] = useState("free");
  const [loading, setLoading] = useState(true);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: perkRow } = await supabase
        .from("benefit_perks")
        .select("*, partner:benefit_partners(*)")
        .eq("id", perkId)
        .single();
      setPerk((perkRow as PerkDetail) ?? null);

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: tierRow } = await supabase
          .from("instructors")
          .select("website_tier")
          .eq("id", user.id)
          .single();
        setWebsiteTier(tierRow?.website_tier ?? "free");
      }
      setLoading(false);
    })();
  }, [perkId]);

  async function startUpgrade(tier: string) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast.error("Please log in first");
      return;
    }
    try {
      const { url } = await createSubscriptionPaymentLink(
        (tier as PaidTierId) ?? "website",
        null,
        session.access_token,
      );
      window.location.href = url;
    } catch (e: any) {
      toast.error(e?.message ?? "Could not start upgrade");
    }
  }

  function handleCta() {
    if (!perk) return;
    const action = perk.cta_action ?? "";
    if (action.startsWith("http")) {
      window.open(action, "_blank", "noopener,noreferrer");
      return;
    }
    if (action.startsWith("/")) {
      navigate({ to: action as never });
      return;
    }
    toast.info("We're setting this up — you'll be notified when it's live");
  }

  if (loading) return <PageLoader />;

  if (!perk) {
    return (
      <div style={{ background: "#EEF2F7", minHeight: "100vh", fontFamily: "Poppins, sans-serif" }}>
        <InstructorTopBar
          firstName=""
          pageTitle="Perk"
          onBack={() => goBack("/perks")}
          onBell={() => navigate({ to: "/notifications" as never })}
          onPhone={() => navigate({ to: "/enquiries" as never })}
          onLiveTrack={() => navigate({ to: "/live" as never })}
          onMenu={() => navigate({ to: "/more" as never })}
          onMicPress={() => toast.info("Voice commands coming soon!")}
        />
        <div style={{ height: TOP_BAR_SPACER }} />
        <div style={{ ...CARD, textAlign: "center", color: "#6B7686", fontSize: 14 }}>
          This perk is no longer available.
        </div>
      </div>
    );
  }

  const canAccess = hasAccess(websiteTier, perk.min_tier);
  const galleryPhotos = perk.gallery_urls ?? [];
  const links = perk.links ?? [];
  const bullets = perk.bullet_points ?? [];
  const body = perk.detail_text || perk.description || "";
  const partnerName = perk.partner?.name ?? "DSM partner";

  return (
    <div
      style={{
        background: "#EEF2F7",
        minHeight: "100vh",
        paddingBottom: 100,
        fontFamily: "Poppins, sans-serif",
      }}
    >
      <InstructorTopBar
        firstName=""
        pageTitle={perk.name}
        onBack={() => goBack("/perks")}
        onBell={() => navigate({ to: "/notifications" as never })}
        onPhone={() => navigate({ to: "/enquiries" as never })}
        onLiveTrack={() => navigate({ to: "/live" as never })}
        onMenu={() => navigate({ to: "/more" as never })}
        onMicPress={() => toast.info("Voice commands coming soon!")}
      />
      <div style={{ height: TOP_BAR_SPACER }} />

      {/* HERO */}
      {perk.hero_image_url ? (
        <img
          src={perk.hero_image_url}
          alt={perk.name}
          style={{ width: "100%", height: 220, objectFit: "cover", display: "block" }}
        />
      ) : (
        <div
          style={{
            height: 180,
            background: "linear-gradient(135deg, #14509E, #0B1F3A)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
            fontSize: 44,
            fontWeight: 800,
          }}
        >
          {partnerName.charAt(0).toUpperCase()}
        </div>
      )}

      {/* PLAN BADGE */}
      <div
        style={{
          margin: 16,
          background: canAccess ? "#F0FDF4" : "#FEF3C7",
          borderRadius: 16,
          border: `1px solid ${canAccess ? "#DCFCE7" : "#FDE68A"}`,
          padding: "14px 16px",
          display: "flex",
          gap: 12,
          alignItems: "center",
        }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: "50%",
            background: canAccess ? "#DCFCE7" : "#FEF3C7",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          {canAccess ? (
            <IconCircleCheck size={20} color="#15803D" stroke={2} />
          ) : (
            <IconLock size={20} color="#92400E" stroke={1.5} />
          )}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          {canAccess ? (
            <>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#15803D" }}>
                Included in your plan
              </div>
              <div style={{ fontSize: 12, color: "#15803D", opacity: 0.8 }}>
                Available with your DSM {TIER_DISPLAY[websiteTier] ?? websiteTier}
              </div>
            </>
          ) : (
            <>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#92400E" }}>
                Requires {TIER_DISPLAY[perk.min_tier] ?? perk.min_tier} or above
              </div>
              <div style={{ fontSize: 12, color: "#92400E", opacity: 0.8 }}>
                Upgrade to unlock this perk
              </div>
            </>
          )}
        </div>

        {!canAccess && (
          <button
            type="button"
            onClick={() => startUpgrade(perk.min_tier)}
            style={{
              background: "#1877D6",
              color: "#fff",
              borderRadius: 20,
              padding: "7px 14px",
              fontSize: 12,
              fontWeight: 700,
              border: "none",
              cursor: "pointer",
              fontFamily: "Poppins, sans-serif",
              flexShrink: 0,
            }}
          >
            Upgrade →
          </button>
        )}
      </div>

      {/* TITLE CARD */}
      <div style={CARD}>
        <span
          style={{
            display: "inline-block",
            background: "#EFF6FF",
            color: "#1877D6",
            fontSize: 10,
            fontWeight: 700,
            borderRadius: 20,
            padding: "3px 10px",
            marginBottom: 8,
          }}
        >
          {partnerName}
        </span>
        <div style={{ fontSize: 20, fontWeight: 800, color: "#0B1F3A" }}>{perk.name}</div>
        {perk.saving && (
          <span
            style={{
              display: "inline-block",
              background: "#DCFCE7",
              color: "#15803D",
              fontSize: 11,
              fontWeight: 700,
              borderRadius: 20,
              padding: "4px 12px",
              marginTop: 8,
            }}
          >
            {perk.saving}
          </span>
        )}
        {perk.category && (
          <div style={{ fontSize: 12, color: "#9CA3AF", marginTop: 6 }}>{perk.category}</div>
        )}
      </div>

      {/* DESCRIPTION */}
      {body && (
        <div style={CARD}>
          <div style={LABEL}>About this perk</div>
          <div style={{ color: "#6B7686", fontSize: 14, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
            {body}
          </div>
        </div>
      )}

      {/* KEY POINTS */}
      {bullets.length > 0 && (
        <div style={CARD}>
          <div style={LABEL}>Key points</div>
          <ul
            style={{
              listStyle: "none",
              padding: 0,
              margin: 0,
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            {bullets.map((bp, i) => (
              <li
                key={i}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 8,
                  color: "#6B7686",
                  fontSize: 14,
                  lineHeight: 1.5,
                }}
              >
                <IconCheck size={18} color="#1A9B5C" stroke={2.2} style={{ flexShrink: 0, marginTop: 1 }} />
                <span>{bp}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* LINKS */}
      {links.length > 0 && (
        <div style={{ ...CARD, padding: 0, overflow: "hidden" }}>
          {links.map((link, i) => (
            <a
              key={i}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "13px 16px",
                borderBottom: i < links.length - 1 ? "1px solid #E4E8EF" : "none",
                textDecoration: "none",
              }}
            >
              <IconExternalLink size={18} color="#1877D6" stroke={1.8} />
              <span style={{ flex: 1, color: "#0B1F3A", fontSize: 14, fontWeight: 600 }}>
                {link.label}
              </span>
              <IconChevronRight size={18} color="#B0B0B5" stroke={1.8} />
            </a>
          ))}
        </div>
      )}

      {/* GALLERY */}
      {galleryPhotos.length > 0 && (
        <div style={{ margin: "0 16px 16px" }}>
          <div style={{ ...LABEL, marginBottom: 8 }}>Photos</div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 4,
              borderRadius: 16,
              overflow: "hidden",
              border: "1px solid #E4E8EF",
            }}
          >
            {galleryPhotos.map((url, i) => (
              <div
                key={i}
                onClick={() => setLightboxIndex(i)}
                style={{
                  aspectRatio: "1",
                  overflow: "hidden",
                  cursor: "pointer",
                  background: `#E7EDF5 url(${url}) center/cover`,
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* VIDEO */}
      {(perk.video_embed_url || perk.video_url) && (
        <>
          <div style={{ ...LABEL, margin: "0 16px 8px" }}>See it in action</div>
          <div
            style={{
              margin: "0 16px 16px",
              borderRadius: 16,
              overflow: "hidden",
              border: "1px solid #E4E8EF",
            }}
          >
            {perk.video_embed_url ? (
              <div
                dangerouslySetInnerHTML={{ __html: perk.video_embed_url }}
                style={{ width: "100%", aspectRatio: "16 / 9", background: "#000" }}
              />
            ) : (
              <video
                src={perk.video_url ?? undefined}
                controls
                style={{ width: "100%", aspectRatio: "16/9", display: "block", background: "#000" }}
              />
            )}
          </div>
        </>
      )}

      {/* CTA CARD */}
      <div style={CARD}>
        <div style={{ ...LABEL, marginBottom: 12 }}>How to access</div>

        {!canAccess && (
          <>
            <button
              type="button"
              onClick={() => startUpgrade(perk.min_tier)}
              style={{
                background: "#1877D6",
                color: "#fff",
                borderRadius: 20,
                padding: 14,
                fontSize: 15,
                fontWeight: 800,
                width: "100%",
                border: "none",
                cursor: "pointer",
                boxShadow: "0 4px 0 #0F52A8",
                fontFamily: "Poppins, sans-serif",
              }}
            >
              Upgrade to {TIER_DISPLAY[perk.min_tier] ?? perk.min_tier} to unlock
            </button>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
              {TIER_ORDER.filter(
                (t) => TIER_ORDER.indexOf(t) >= TIER_ORDER.indexOf(perk.min_tier),
              ).map((t) => (
                <span
                  key={t}
                  style={{
                    background: "#EFF6FF",
                    color: "#1877D6",
                    fontSize: 10,
                    fontWeight: 700,
                    borderRadius: 20,
                    padding: "3px 10px",
                  }}
                >
                  ✓ {TIER_DISPLAY[t] ?? t}
                </span>
              ))}
            </div>
          </>
        )}

        {canAccess && perk.coming_soon && (
          <div style={{ textAlign: "center", padding: "8px 0" }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>🚀</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#0B1F3A", marginBottom: 6 }}>
              Coming soon
            </div>
            <div style={{ fontSize: 13, color: "#6B7686", lineHeight: 1.5 }}>
              We're setting this up for you. We'll notify you as soon as it's ready.
            </div>
          </div>
        )}

        {canAccess && !perk.coming_soon && (
          <button
            type="button"
            onClick={handleCta}
            style={{
              background: "#15803D",
              color: "#fff",
              borderRadius: 20,
              padding: 14,
              fontSize: 15,
              fontWeight: 800,
              width: "100%",
              border: "none",
              cursor: "pointer",
              boxShadow: "0 4px 0 #14532D",
              fontFamily: "Poppins, sans-serif",
            }}
          >
            {perk.cta_label ?? "Access this perk →"}
          </button>
        )}
      </div>

      {/* PARTNER INFO */}
      <div
        onClick={() => navigate({ to: "/perks" as never })}
        style={{
          margin: "0 16px 16px",
          background: "#fff",
          borderRadius: 16,
          border: "1px solid #E4E8EF",
          padding: "14px 16px",
          display: "flex",
          gap: 12,
          alignItems: "center",
          cursor: "pointer",
        }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            background: perk.partner?.icon_bg ?? "#EEF2F7",
            color: perk.partner?.icon_color ?? "#0B1F3A",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 16,
            fontWeight: 800,
            flexShrink: 0,
          }}
        >
          {partnerName.charAt(0).toUpperCase()}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 11, color: "#9CA3AF" }}>Provided by</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#0B1F3A" }}>{partnerName}</div>
        </div>
        <IconChevronRight size={16} color="#C7D0DC" stroke={2} />
      </div>

      {/* LIGHTBOX */}
      {lightboxIndex !== null && (
        <div
          onClick={() => setLightboxIndex(null)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 400,
            background: "rgba(0,0,0,0.95)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <button
            type="button"
            onClick={() => setLightboxIndex(null)}
            aria-label="Close"
            style={{
              position: "absolute",
              top: 16,
              right: 16,
              width: 40,
              height: 40,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.15)",
              border: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <IconX size={22} color="#FFFFFF" stroke={2} />
          </button>

          <img
            src={galleryPhotos[lightboxIndex]}
            alt={`Photo ${lightboxIndex + 1} of ${galleryPhotos.length}`}
            style={{ maxWidth: "100%", maxHeight: "80vh", objectFit: "contain" }}
            onClick={(e) => e.stopPropagation()}
          />

          <div
            style={{
              position: "absolute",
              bottom: 32,
              color: "rgba(255,255,255,0.6)",
              fontSize: 13,
            }}
          >
            {lightboxIndex + 1} of {galleryPhotos.length}
          </div>

          {lightboxIndex > 0 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setLightboxIndex(lightboxIndex - 1);
              }}
              aria-label="Previous"
              style={{
                position: "absolute",
                left: 16,
                top: "50%",
                transform: "translateY(-50%)",
                width: 44,
                height: 44,
                borderRadius: "50%",
                background: "rgba(255,255,255,0.15)",
                border: "none",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <IconChevronLeft size={24} color="#FFFFFF" stroke={2} />
            </button>
          )}

          {lightboxIndex < galleryPhotos.length - 1 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setLightboxIndex(lightboxIndex + 1);
              }}
              aria-label="Next"
              style={{
                position: "absolute",
                right: 16,
                top: "50%",
                transform: "translateY(-50%)",
                width: 44,
                height: 44,
                borderRadius: "50%",
                background: "rgba(255,255,255,0.15)",
                border: "none",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <IconChevronRight size={24} color="#FFFFFF" stroke={2} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

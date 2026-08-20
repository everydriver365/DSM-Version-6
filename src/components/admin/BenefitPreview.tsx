import React, { useState } from "react";

const TIER_DISPLAY: Record<string, string> = {
  free: "Free",
  website: "Essential",
  pro: "Pro",
  managed: "Max",
};

const font = "Poppins, sans-serif";

function PreviewShell({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(true);
  return (
    <div
      style={{
        background: "#fff",
        borderRadius: 8,
        border: "1px solid #E4E8EF",
        marginBottom: 16,
        overflow: "hidden",
        fontFamily: font,
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 14px",
          background: "#0B1F3A",
          border: "none",
          cursor: "pointer",
          fontFamily: font,
        }}
      >
        <span style={{ fontSize: 12, fontWeight: 700, color: "#fff", letterSpacing: 0.3 }}>
          {title}
        </span>
        <span style={{ fontSize: 11, color: "#9FB6D4" }}>{open ? "Hide" : "Show"}</span>
      </button>
      {open && <div style={{ padding: 14, background: "#EEF2F7" }}>{children}</div>}
    </div>
  );
}

function SavingBadge({ text }: { text?: string | null }) {
  if (!text) return null;
  return (
    <span
      style={{
        display: "inline-block",
        background: "#F0FDF4",
        color: "#15803D",
        fontSize: 9,
        fontWeight: 700,
        borderRadius: 8,
        padding: "2px 7px",
        marginTop: 4,
      }}
    >
      {text}
    </span>
  );
}

function TierBadge({ tier }: { tier?: string | null }) {
  if (!tier || tier === "free") return null;
  return (
    <span
      style={{
        background: "#EFF6FF",
        color: "#1877D6",
        fontSize: 9,
        fontWeight: 700,
        borderRadius: 8,
        padding: "2px 7px",
      }}
    >
      {TIER_DISPLAY[tier] ?? tier} and above
    </span>
  );
}

function ListRow({
  logoUrl,
  fallback,
  iconBg,
  title,
  subtitle,
  saving,
  tier,
  comingSoon,
}: {
  logoUrl?: string | null;
  fallback: string;
  iconBg?: string | null;
  title: string;
  subtitle: string;
  saving?: string | null;
  tier?: string | null;
  comingSoon?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "13px 16px",
        background: "#fff",
        borderRadius: 8,
        border: "1px solid #E4E8EF",
        boxShadow: "0 1px 3px rgba(11,31,58,0.06)",
      }}
    >
      <span
        style={{
          width: 40,
          height: 40,
          borderRadius: 8,
          background: iconBg || "#EEF2F7",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 16,
          fontWeight: 800,
          color: "#0B1F3A",
          flexShrink: 0,
          overflow: "hidden",
        }}
      >
        {logoUrl ? (
          <img src={logoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          fallback
        )}
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "#0B1F3A" }}>
          {title || "Untitled"}
        </div>
        <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 2 }}>{subtitle}</div>
        <SavingBadge text={saving} />
      </span>
      <span style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 3 }}>
        {comingSoon && (
          <span
            style={{
              background: "#FEF3C7",
              color: "#B45309",
              fontSize: 11,
              fontWeight: 700,
              borderRadius: 999,
              padding: "4px 10px",
            }}
          >
            Coming soon
          </span>
        )}
        <TierBadge tier={tier} />
      </span>
    </div>
  );
}

export function PartnerPreview({ partner }: { partner: any }) {
  const initial = (partner?.name ?? "?").trim().charAt(0).toUpperCase() || "?";
  const perks: string[] = Array.isArray(partner?.perks) ? partner.perks : [];
  return (
    <PreviewShell title="LIVE PREVIEW — how this partner appears">
      {partner?.hero_image_url && (
        <img
          src={partner.hero_image_url}
          alt=""
          style={{
            width: "100%",
            height: 110,
            objectFit: "cover",
            borderRadius: 8,
            marginBottom: 10,
            display: "block",
          }}
        />
      )}
      <ListRow
        logoUrl={partner?.logo_url}
        fallback={partner?.icon || initial}
        iconBg={partner?.icon_bg}
        title={partner?.name ?? ""}
        subtitle={partner?.category || "No category"}
        saving={partner?.saving}
        tier={partner?.min_tier}
        comingSoon={partner?.coming_soon}
      />
      {(partner?.description || perks.length > 0) && (
        <div
          style={{
            background: "#fff",
            borderRadius: 8,
            border: "1px solid #E4E8EF",
            padding: 14,
            marginTop: 10,
          }}
        >
          {partner?.description && (
            <div style={{ fontSize: 12, color: "#6B7686", lineHeight: 1.5 }}>
              {partner.description}
            </div>
          )}
          {perks.map((p, i) => (
            <div
              key={i}
              style={{ fontSize: 12, color: "#0B1F3A", marginTop: 8, display: "flex", gap: 8 }}
            >
              <span style={{ color: "#1877D6" }}>•</span>
              <span>{p}</span>
            </div>
          ))}
        </div>
      )}
      {!partner?.active && (
        <div style={{ fontSize: 11, color: "#CC2229", marginTop: 10, fontWeight: 600 }}>
          Inactive — this partner will be hidden on the public site.
        </div>
      )}
    </PreviewShell>
  );
}

export function PerkPreview({ perk, partnerName }: { perk: any; partnerName?: string }) {
  const gallery: string[] = Array.isArray(perk?.gallery_urls) ? perk.gallery_urls : [];
  const bullets: string[] = Array.isArray(perk?.bullet_points) ? perk.bullet_points : [];
  const links: any[] = Array.isArray(perk?.links) ? perk.links : [];
  const initial = (perk?.name ?? "?").trim().charAt(0).toUpperCase() || "?";
  return (
    <PreviewShell title="LIVE PREVIEW — how this perk appears">
      <ListRow
        fallback={initial}
        title={perk?.name ?? ""}
        subtitle={`${partnerName || "Partner"} · ${perk?.category || "No category"}`}
        saving={perk?.saving}
        tier={perk?.min_tier}
        comingSoon={perk?.coming_soon}
      />

      <div
        style={{
          background: "#fff",
          borderRadius: 8,
          border: "1px solid #E4E8EF",
          overflow: "hidden",
          marginTop: 10,
        }}
      >
        {perk?.hero_image_url && (
          <img
            src={perk.hero_image_url}
            alt=""
            style={{ width: "100%", height: 130, objectFit: "cover", display: "block" }}
          />
        )}
        <div style={{ padding: 14 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: "#0B1F3A" }}>
            {perk?.name || "Untitled perk"}
          </div>
          {perk?.description && (
            <div style={{ fontSize: 12, color: "#6B7686", marginTop: 6, lineHeight: 1.5 }}>
              {perk.description}
            </div>
          )}
          {perk?.detail_text && (
            <div style={{ fontSize: 12, color: "#6B7686", marginTop: 8, lineHeight: 1.5 }}>
              {perk.detail_text}
            </div>
          )}

          {bullets.length > 0 && (
            <div style={{ marginTop: 10 }}>
              {bullets.map((b, i) => (
                <div
                  key={i}
                  style={{ fontSize: 12, color: "#0B1F3A", marginTop: 6, display: "flex", gap: 8 }}
                >
                  <span style={{ color: "#1877D6" }}>✓</span>
                  <span>{b}</span>
                </div>
              ))}
            </div>
          )}

          {gallery.length > 0 && (
            <div style={{ display: "flex", gap: 8, overflowX: "auto", marginTop: 12 }}>
              {gallery.map((url, i) => (
                <img
                  key={`${url}-${i}`}
                  src={url}
                  alt=""
                  style={{
                    width: 96,
                    height: 72,
                    objectFit: "cover",
                    borderRadius: 8,
                    flexShrink: 0,
                  }}
                />
              ))}
            </div>
          )}

          {links.length > 0 && (
            <div style={{ marginTop: 12 }}>
              {links.map((l: any, i: number) => (
                <div
                  key={i}
                  style={{
                    fontSize: 12,
                    color: "#1877D6",
                    fontWeight: 600,
                    marginTop: 6,
                    wordBreak: "break-all",
                  }}
                >
                  {l?.label || l?.url || "Link"}
                </div>
              ))}
            </div>
          )}

          <div
            style={{
              marginTop: 14,
              background: "#1877D6",
              color: "#fff",
              borderRadius: 8,
              padding: "10px 16px",
              textAlign: "center",
              fontSize: 13,
              fontWeight: 700,
            }}
          >
            {perk?.cta_label || "View perk"}
          </div>
        </div>
      </div>

      {!perk?.active && (
        <div style={{ fontSize: 11, color: "#CC2229", marginTop: 10, fontWeight: 600 }}>
          Inactive — this perk will be hidden on the public site.
        </div>
      )}
    </PreviewShell>
  );
}

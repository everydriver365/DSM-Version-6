import type { CSSProperties } from "react";

export type MarketplaceToken = {
  id: string;
  headline: string;
  body: string;
  cta: string;
  imageUrl?: string | null;
  /** Card background — defaults to DSM navy */
  background?: string;
};

type Props = {
  tokens: MarketplaceToken[];
  activeIndex?: number;
  onSelect?: (token: MarketplaceToken) => void;
  onDotPress?: (index: number) => void;
};

const NAVY = "#0B1F3A";

const cardStyle = (bg: string): CSSProperties => ({
  position: "relative",
  width: "100%",
  borderRadius: 18,
  background: bg,
  overflow: "hidden",
  boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
  border: "1px solid rgba(255,255,255,0.06)",
  fontFamily: "Poppins, system-ui, sans-serif",
  textAlign: "left",
  padding: 0,
  cursor: "pointer",
  display: "block",
});

/** Faint line-art car + calendar watermark on the right of the card. */
function Watermark() {
  return (
    <svg
      viewBox="0 0 220 140"
      aria-hidden="true"
      style={{
        position: "absolute",
        right: -10,
        top: 6,
        width: 190,
        height: 130,
        opacity: 0.13,
        pointerEvents: "none",
      }}
      fill="none"
      stroke="#FFFFFF"
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="118" y="10" width="76" height="66" rx="10" />
      <path d="M118 30h76M140 10v12M172 10v12" />
      <circle cx="146" cy="50" r="4" />
      <circle cx="166" cy="50" r="4" />
      <path d="M28 108h150l-8-22c-4-11-14-18-26-18H62c-12 0-22 7-26 18l-8 22z" />
      <circle cx="62" cy="112" r="12" />
      <circle cx="150" cy="112" r="12" />
      <path d="M60 86h92" />
    </svg>
  );
}

/** Small stylised phone showing an app screen; used when no image is supplied. */
function PhoneMock() {
  return (
    <div
      style={{
        width: 96,
        height: 132,
        borderRadius: 18,
        border: "3px solid #0A1526",
        background: "#FFFFFF",
        overflow: "hidden",
        transform: "rotate(-4deg)",
        boxShadow: "0 8px 20px rgba(0,0,0,0.28)",
        flexShrink: 0,
        position: "relative",
        padding: 7,
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 5,
          left: "50%",
          transform: "translateX(-50%)",
          width: 26,
          height: 4,
          borderRadius: 999,
          background: "#0A1526",
        }}
      />
      <div style={{ height: 8 }} />
      <div style={{ height: 7, width: 46, borderRadius: 999, background: "#DBE7F7" }} />
      <div
        style={{
          marginTop: 8,
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 5,
        }}
      >
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            style={{
              height: 24,
              borderRadius: 6,
              background: "#F1F5FB",
              border: "1px solid #E4EBF5",
            }}
          />
        ))}
      </div>
      <div
        style={{
          marginTop: 6,
          height: 28,
          borderRadius: 8,
          background: "#EAF2FE",
          border: "1px solid #DCE8FA",
        }}
      />
    </div>
  );
}

export function MarketplaceTokenBanner({
  tokens,
  activeIndex = 0,
  onSelect,
  onDotPress,
}: Props) {
  const token = tokens[activeIndex] ?? tokens[0];
  if (!token) return null;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect?.(token)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onSelect?.(token);
      }}
      style={cardStyle(token.background ?? NAVY)}
    >
      <Watermark />

      <div
        style={{
          position: "relative",
          display: "flex",
          alignItems: "center",
          gap: 14,
          padding: "16px 16px 26px 14px",
        }}
      >
        {token.imageUrl ? (
          <img
            src={token.imageUrl}
            alt=""
            style={{
              width: 96,
              height: 132,
              objectFit: "cover",
              borderRadius: 14,
              flexShrink: 0,
              boxShadow: "0 8px 20px rgba(0,0,0,0.28)",
            }}
          />
        ) : (
          <PhoneMock />
        )}

        <div style={{ flex: 1, minWidth: 0 }}>
          <h3
            style={{
              margin: 0,
              color: "#FFFFFF",
              fontSize: 19,
              lineHeight: 1.2,
              fontWeight: 700,
              letterSpacing: "-0.01em",
            }}
          >
            {token.headline}
          </h3>
          <p
            style={{
              margin: "6px 0 0",
              color: "rgba(255,255,255,0.78)",
              fontSize: 12.5,
              lineHeight: 1.4,
              fontWeight: 500,
            }}
          >
            {token.body}
          </p>
          <span
            style={{
              display: "inline-block",
              marginTop: 14,
              background: "#FFFFFF",
              color: token.background ?? NAVY,
              fontSize: 13,
              fontWeight: 700,
              padding: "9px 20px",
              borderRadius: 999,
              boxShadow: "0 1px 3px rgba(0,0,0,0.18)",
            }}
          >
            {token.cta}
          </span>
        </div>
      </div>

      {tokens.length > 1 && (
        <div
          style={{
            position: "absolute",
            bottom: 10,
            left: 0,
            right: 0,
            display: "flex",
            justifyContent: "center",
            gap: 6,
          }}
        >
          {tokens.map((t, i) => (
            <button
              key={t.id}
              type="button"
              aria-label={`Show promotion ${i + 1}`}
              onClick={(e) => {
                e.stopPropagation();
                onDotPress?.(i);
              }}
              style={{
                width: i === activeIndex ? 8 : 7,
                height: i === activeIndex ? 8 : 7,
                padding: 0,
                border: "none",
                borderRadius: 999,
                background:
                  i === activeIndex ? "#FFFFFF" : "rgba(255,255,255,0.32)",
                cursor: "pointer",
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default MarketplaceTokenBanner;

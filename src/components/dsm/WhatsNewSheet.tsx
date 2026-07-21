import { useEffect, useRef, useState } from "react";
import { Play } from "lucide-react";
import {
  APP_VERSION,
  WHATS_NEW_BY_VERSION,
  getLastSeenVersion,
  isNewerVersion,
  setLastSeenVersion,
  type WhatsNewItem,
} from "@/lib/whatsNew";

const NAVY = "#0F2044";
const BLUE = "#1877D6";
const GRAY_BODY = "#6B7A90";
const FONT = "Poppins, sans-serif";

function Thumb({ size = 72 }: { size?: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: 12,
        background: `linear-gradient(135deg, ${NAVY} 0%, ${BLUE} 100%)`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <div
        style={{
          width: size * 0.42,
          height: size * 0.42,
          borderRadius: "50%",
          background: "white",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
        }}
      >
        <Play size={size * 0.2} color={NAVY} fill={NAVY} style={{ marginLeft: 2 }} />
      </div>
    </div>
  );
}

export function WhatsNewSheet({
  items,
  onDismiss,
  onLater,
}: {
  items: WhatsNewItem[];
  onDismiss: () => void;
  onLater: () => void;
}) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        fontFamily: FONT,
      }}
    >
      <div
        onClick={onDismiss}
        style={{ position: "absolute", inset: 0, background: "rgba(15,32,68,0.35)" }}
      />
      <div
        style={{
          position: "relative",
          width: "100%",
          maxWidth: 480,
          background: "white",
          borderTopLeftRadius: 22,
          borderTopRightRadius: 22,
          padding: "10px 20px 24px",
          boxShadow: "0 -4px 24px rgba(0,0,0,0.15)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "center", padding: "4px 0 12px" }}>
          <div style={{ width: 40, height: 5, borderRadius: 999, background: "#C7CDD6" }} />
        </div>

        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: BLUE,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            marginBottom: 4,
          }}
        >
          Just added
        </div>
        <h2 style={{ fontSize: 19, fontWeight: 700, color: NAVY, margin: 0, marginBottom: 16 }}>
          {items.length === 1 ? "1 new thing in DSM" : `${items.length} new things in DSM`}
        </h2>

        <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 20 }}>
          {items.slice(0, 3).map((it, i) => (
            <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
              <Thumb size={72} />
              <div style={{ flex: 1, minWidth: 0, paddingTop: 2 }}>
                <div style={{ fontSize: 14.5, fontWeight: 700, color: NAVY, lineHeight: 1.3 }}>
                  {it.title}
                </div>
                <div style={{ fontSize: 12.5, color: GRAY_BODY, lineHeight: 1.4, marginTop: 2 }}>
                  {it.description}
                </div>
              </div>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={onDismiss}
          style={{
            width: "100%",
            padding: "14px 16px",
            borderRadius: 12,
            background: NAVY,
            color: "white",
            fontWeight: 600,
            fontSize: 15,
            border: "none",
            cursor: "pointer",
            fontFamily: FONT,
          }}
        >
          Got it
        </button>
        <button
          type="button"
          onClick={onLater}
          style={{
            width: "100%",
            background: "transparent",
            border: "none",
            color: GRAY_BODY,
            fontSize: 13,
            padding: "12px 0 4px",
            cursor: "pointer",
            textAlign: "center",
            fontFamily: FONT,
          }}
        >
          Show me later
        </button>
      </div>
    </div>
  );
}

/**
 * Self-contained controller. Renders the sheet once per version bump per
 * instructor. Dismissal ("Got it" or backdrop) updates last-seen version.
 * "Show me later" leaves it unchanged so it re-appears next session.
 */
export function WhatsNewController({ userId }: { userId: string | null }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<WhatsNewItem[]>([]);

  useEffect(() => {
    if (!userId) return;
    const last = getLastSeenVersion(userId);
    if (!isNewerVersion(APP_VERSION, last)) return;
    const versionItems = WHATS_NEW_BY_VERSION[APP_VERSION] ?? [];
    if (versionItems.length === 0) {
      // Nothing to show — mark as seen so we don't keep checking.
      setLastSeenVersion(userId, APP_VERSION);
      return;
    }
    setItems(versionItems);
    setOpen(true);
  }, [userId]);

  if (!open || !userId) return null;

  return (
    <WhatsNewSheet
      items={items}
      onDismiss={() => {
        setLastSeenVersion(userId, APP_VERSION);
        setOpen(false);
      }}
      onLater={() => setOpen(false)}
    />
  );
}

import React from "react";
import { ChevronLeft, ChevronRight, Bell, Headphones, Mic, MessageCircle } from "lucide-react";
import { CarIcon, MenuIcon, PoundIcon } from "@/components/icons/DrivingIcons";
import { useNavigate } from "@tanstack/react-router";
import iconMarkAsset from "../../assets/dsm-icon-white.png.asset.json";

export type InstructorTopBarProps = {
  onMicPress?: () => void;
  unreadMessages?: number;
  unreadNotifications?: number;
  onBack?: () => void;
  pageTitle?: string;
  firstName?: string;
  heroTitle?: string;
  heroSubtitle?: string;
  // Legacy props (accepted but unused)
  avatarUrl?: string | null;
  unreadCount?: number;
  onPhone?: () => void;
  onLiveTrack?: () => void;
  onBell?: () => void;
  onMenu?: () => void;
  onProfile?: () => void;
  statusDot?: React.ReactNode;
};

const ICON_BTN: React.CSSProperties = {
  width: 40,
  height: 40,
  borderRadius: "50%",
  background: "rgba(255,255,255,0.06)",
  border: "none",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  position: "relative",
  padding: 0,
  flexShrink: 0,
};

function IconBtn({
  ariaLabel,
  onClick,
  children,
  style,
}: {
  ariaLabel: string;
  onClick: () => void;
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <button type="button" aria-label={ariaLabel} onClick={onClick} style={{ ...ICON_BTN, ...style }}>
      {children}
    </button>
  );
}

function Badge({ count, color }: { count: number; color: string }) {
  if (count <= 0) return null;
  return (
    <span
      style={{
        position: "absolute",
        top: -2,
        right: -2,
        background: color,
        color: "#FFFFFF",
        fontSize: 10,
        fontWeight: 700,
        minWidth: 16,
        height: 16,
        borderRadius: 8,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        border: "2px solid #0B1F3A",
        padding: "0 3px",
        fontFamily: "Poppins, sans-serif",
        lineHeight: 1,
      }}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}

export default function InstructorTopBar({
  unreadNotifications = 0,
  unreadMessages = 0,
  onBack,
  onMicPress = () => {},
  pageTitle,
  firstName,
  heroTitle,
  heroSubtitle,
}: InstructorTopBarProps) {
  const navigate = useNavigate();
  const isSubpage = typeof onBack === "function";
  const hasHero = !!heroTitle;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 40,
        background: "#0B1F3A",
        padding: "calc(env(safe-area-inset-top, 0px) + 10px) 14px 0",
        borderRadius: hasHero ? "0 0 32px 32px" : "0 0 24px 24px",
      }}
    >
      {/* ICON ROW */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          paddingBottom: 12,
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        {isSubpage ? (
          <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
            <IconBtn ariaLabel="Back" onClick={onBack!}>
              <ChevronLeft size={18} strokeWidth={2} color="#ffffff" />
            </IconBtn>
            <span
              style={{
                color: "#ffffff",
                fontSize: 16,
                fontWeight: 600,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                fontFamily: "Poppins, sans-serif",
              }}
            >
              {pageTitle ?? ""}
            </span>
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button
              type="button"
              onClick={() => navigate({ to: "/profile" as never })}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                background: "transparent",
                border: "none",
                padding: 0,
                cursor: "pointer",
                minWidth: 0,
              }}
            >
              <img
                src={iconMarkAsset.url}
                alt="DSM"
                width={40}
                height={40}
                style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
              />
            </button>
            <IconBtn ariaLabel="Voice commands" onClick={onMicPress} style={{ background: "#CC2229" }}>
              <Mic size={19} strokeWidth={2} color="#ffffff" />
            </IconBtn>
          </div>
        )}

        {/* RIGHT — icon group */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <IconBtn ariaLabel="Messages" onClick={() => navigate({ to: "/messages" as never })}>
            <MessageCircle size={18} strokeWidth={2} color="#ffffff" />
            <Badge count={unreadMessages} color="#1877D6" />
          </IconBtn>
          <IconBtn ariaLabel="Support" onClick={() => navigate({ to: "/help" as never })}>
            <Headphones size={18} strokeWidth={2} color="#ffffff" />
          </IconBtn>
          <IconBtn ariaLabel="Vehicle" onClick={() => navigate({ to: "/vehicle" as never })}>
            <CarIcon size={18} strokeWidth={2} color="#ffffff" />
          </IconBtn>
          <IconBtn ariaLabel="Take payment" onClick={() => navigate({ to: "/take-payment" as never })}>
            <PoundIcon size={18} strokeWidth={2} color="#ffffff" />
          </IconBtn>
          <IconBtn ariaLabel="Notifications" onClick={() => navigate({ to: "/notifications" as never })}>
            <Bell size={18} strokeWidth={2} color="#ffffff" />
            <Badge count={unreadNotifications} color="#CC2229" />
          </IconBtn>
          <IconBtn ariaLabel="More" onClick={() => navigate({ to: "/settings" as never })}>
            <MenuIcon size={18} strokeWidth={2} color="#ffffff" />
          </IconBtn>
        </div>
      </div>

      {/* HERO ROW (Dashboard title + subtitle + logo) */}
      {hasHero && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            padding: "13px 2px 24px",
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                color: "#ffffff",
                fontSize: 22,
                fontWeight: 700,
                lineHeight: 1.1,
                fontFamily: "Poppins, sans-serif",
              }}
            >
              Welcome{firstName ? `, ${firstName}` : ""}
            </div>
            {heroSubtitle && (
              <div
                style={{
                  color: "rgba(255,255,255,0.6)",
                  fontSize: 15,
                  fontWeight: 400,
                  marginTop: 6,
                  fontFamily: "Inter, sans-serif",
                }}
              >
                {heroSubtitle}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

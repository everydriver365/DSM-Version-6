import React from "react";
import { ChevronLeft, Mic, MessageCircle, Bell, LifeBuoy } from "lucide-react";
import { CarIcon, MenuIcon, PoundIcon } from "@/components/icons/DrivingIcons";
import { useNavigate } from "@tanstack/react-router";
import iconMarkAsset from "../../assets/icon-192.png.asset.json";

export type InstructorTopBarProps = {
  onMicPress: () => void;
  unreadMessages?: number;
  unreadNotifications?: number;
  onBack?: () => void;
  pageTitle?: string;
  // Legacy props (accepted but unused by new design)
  firstName?: string;
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
  width: 36,
  height: 36,
  borderRadius: "50%",
  background: "rgba(255,255,255,0.08)",
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
  onMicPress,
  unreadMessages = 0,
  unreadNotifications = 0,
  onBack,
  pageTitle,
}: InstructorTopBarProps) {
  const navigate = useNavigate();
  const isSubpage = typeof onBack === "function";

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 40,
        background: "#0B1F3A",
        padding: "calc(env(safe-area-inset-top, 0px) + 10px) 12px 12px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 8,
        boxShadow: "inset 0 -1px 0 rgba(255,255,255,0.04)",
      }}
    >
      {/* LEFT — mic alone (or back button on subpages) */}
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
          <IconBtn ariaLabel="Home" onClick={() => navigate({ to: "/home" })} style={{ background: "transparent" }}>
            <img
              src={iconMarkAsset.url}
              alt="DSM"
              width={36}
              height={36}
              style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover" }}
            />
          </IconBtn>
          <IconBtn
            ariaLabel="Voice commands"
            onClick={onMicPress}
            style={{ background: "#CC2229" }}
          >
            <Mic size={19} strokeWidth={2} color="#ffffff" />
          </IconBtn>
        </div>
      )}

      {/* RIGHT — icon group */}
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <IconBtn ariaLabel="Messages" onClick={() => navigate({ to: "/messages" })}>
          <MessageCircle size={18} strokeWidth={2} color="#ffffff" />
          <Badge count={unreadMessages} color="#1877D6" />
        </IconBtn>
        <IconBtn ariaLabel="Notifications" onClick={() => navigate({ to: "/notifications" as never })}>
          <Bell size={18} strokeWidth={2} color="#ffffff" />
          <Badge count={unreadNotifications} color="#CC2229" />
        </IconBtn>

        {/* Divider */}
        <span
          aria-hidden
          style={{
            width: 1,
            height: 20,
            background: "rgba(255,255,255,0.15)",
            margin: "0 2px",
            flexShrink: 0,
          }}
        />

        <IconBtn ariaLabel="Support" onClick={() => navigate({ to: "/help" as never })}>
          <LifeBuoy size={18} strokeWidth={2} color="#ffffff" />
        </IconBtn>
        <IconBtn ariaLabel="Vehicle" onClick={() => navigate({ to: "/vehicle" as never })}>
          <CarIcon size={18} strokeWidth={2} color="#ffffff" />
        </IconBtn>
        <IconBtn ariaLabel="Take payment" onClick={() => navigate({ to: "/take-payment" as never })}>
          <PoundIcon size={18} strokeWidth={2} color="#ffffff" />
        </IconBtn>
        <IconBtn ariaLabel="More" onClick={() => navigate({ to: "/settings" as never })}>
          <MenuIcon size={18} strokeWidth={2} color="#ffffff" />
        </IconBtn>
      </div>
    </div>
  );
}

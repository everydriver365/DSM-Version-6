import React from "react";
import { ChevronLeft, Bell, Mic } from "lucide-react";
import { PhoneIcon, CarIcon, MenuIcon, PoundIcon, MessagesIcon } from "@/components/icons/DrivingIcons";
import { useNavigate } from "@tanstack/react-router";
import dsmLogoWhite from "@/assets/dsm-logo-white.png.asset.json";

export type InstructorTopBarProps = {
  firstName: string;
  avatarUrl?: string | null;
  unreadCount?: number;
  onPhone: () => void;
  onLiveTrack: () => void;
  onBell: () => void;
  onMenu: () => void;
  onMicPress: () => void;
  onProfile?: () => void;
  onBack?: () => void;
  pageTitle?: string;
};

const ICON_BTN: React.CSSProperties = {
  width: 32,
  height: 32,
  borderRadius: "50%",
  background: "rgba(255,255,255,0.10)",
  border: "none",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  position: "relative",
  padding: 0,
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

export default function InstructorTopBar({
  firstName,
  avatarUrl,
  unreadCount = 0,
  onPhone,
  onLiveTrack,
  onBell,
  onMenu,
  onMicPress,
  onProfile,
  onBack,
  pageTitle,
}: InstructorTopBarProps) {
  const isSubpage = typeof onBack === "function";
  const navigate = useNavigate();

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 40,
        background: "#0B1F3A",
        padding: "calc(env(safe-area-inset-top, 0px) + 12px) 18px 16px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        borderBottom: "none",
        boxShadow: "inset 0 -1px 0 rgba(255,255,255,0.04)",
      }}
    >
      {/* LEFT */}
      {isSubpage ? (
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <IconBtn ariaLabel="Back" onClick={onBack!}>
            <ChevronLeft size={17} strokeWidth={1.8} color="#ffffff" />
          </IconBtn>
          <span style={{ color: "#ffffff", fontSize: 16, fontWeight: 600 }}>
            {pageTitle ?? ""}
          </span>
        </div>
      ) : (
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button
            type="button"
            aria-label="Open profile"
            onClick={onProfile}
            style={{
              background: "none",
              border: "none",
              padding: 0,
              cursor: onProfile ? "pointer" : "default",
              display: "flex",
              alignItems: "center",
            }}
          >
            <img
              src={dsmLogoWhite.url}
              alt="DSM"
              style={{ height: 32, width: "auto", objectFit: "contain", display: "block" }}
            />
          </button>
          <IconBtn
            ariaLabel="Voice commands"
            onClick={onMicPress}
            style={{ background: "#1877D6", width: 36, height: 36 }}
          >
            <Mic size={19} strokeWidth={1.8} color="#ffffff" />
          </IconBtn>
        </div>
      )}

      {/* RIGHT */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <IconBtn ariaLabel="Phone" onClick={onPhone}>
          <PhoneIcon size={17} strokeWidth={1.8} color="#ffffff" />
        </IconBtn>
        <IconBtn ariaLabel="Live track" onClick={onLiveTrack}>
          <CarIcon size={17} strokeWidth={1.8} color="#ffffff" />
        </IconBtn>
        <IconBtn ariaLabel="Take payment" onClick={() => navigate({ to: "/take-payment" })}>
          <PoundIcon size={17} strokeWidth={1.8} color="#ffffff" />
        </IconBtn>
        <button
          type="button"
          aria-label="Notifications"
          onClick={() => navigate({ to: '/notifications' as never })}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 4,
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <Bell size={22} color="rgba(255,255,255,0.8)" />
          {unreadCount > 0 && (
            <span style={{
              position: 'absolute',
              top: -2,
              right: -2,
              background: '#CC2229',
              color: 'white',
              fontSize: 10,
              fontWeight: 700,
              minWidth: 16,
              height: 16,
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '2px solid #0F2044',
              padding: '0 3px',
              fontFamily: 'Poppins, sans-serif',
            }}>
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>
        <IconBtn ariaLabel="Menu" onClick={onMenu}>
          <MenuIcon size={17} strokeWidth={1.8} color="#ffffff" />
        </IconBtn>
      </div>
    </div>
  );
}

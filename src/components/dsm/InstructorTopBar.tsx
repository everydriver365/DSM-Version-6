import React from "react";
import { Phone, Car, Bell, Menu, ChevronRight, ChevronLeft } from "lucide-react";

export type InstructorTopBarProps = {
  firstName: string;
  avatarUrl?: string | null;
  unreadCount?: number;
  onPhone: () => void;
  onLiveTrack: () => void;
  onBell: () => void;
  onMenu: () => void;
  onProfile?: () => void;
  onBack?: () => void;
  pageTitle?: string;
  statusDot?: React.ReactNode;
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
}: {
  ariaLabel: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button type="button" aria-label={ariaLabel} onClick={onClick} style={ICON_BTN}>
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
  onProfile,
  onBack,
  pageTitle,
  statusDot,
}: InstructorTopBarProps) {
  const isSubpage = typeof onBack === "function";

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 40,
        background: "#072b47",
        borderBottomLeftRadius: 20,
        borderBottomRightRadius: 20,
        padding: "calc(env(safe-area-inset-top, 0px) + 12px) 18px 16px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
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
            gap: 8,
          }}
        >
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={`${firstName} profile`}
              style={{ width: 32, height: 32, borderRadius: "50%", objectFit: "cover" }}
            />
          ) : (
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                background: "rgba(255,255,255,0.2)",
                color: "#ffffff",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 13,
                fontWeight: 700,
              }}
            >
              {(firstName?.charAt(0) ?? "I").toUpperCase()}
            </div>
          )}
          <span style={{ color: "#ffffff", fontSize: 15 }}>{firstName}</span>
          <ChevronRight size={16} strokeWidth={1.8} color="rgba(255,255,255,0.7)" />
          {statusDot}
        </button>
      )}

      {/* RIGHT */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <IconBtn ariaLabel="Phone" onClick={onPhone}>
          <Phone size={17} strokeWidth={1.8} color="#ffffff" />
        </IconBtn>
        <IconBtn ariaLabel="Live track" onClick={onLiveTrack}>
          <Car size={17} strokeWidth={1.8} color="#ffffff" />
        </IconBtn>
        <IconBtn ariaLabel="Notifications" onClick={onBell}>
          <Bell size={17} strokeWidth={1.8} color="#ffffff" />
          {unreadCount > 0 && (
            <span
              style={{
                position: "absolute",
                top: -2,
                right: -2,
                minWidth: 14,
                height: 14,
                borderRadius: "50%",
                background: "#CC2229",
                color: "#ffffff",
                fontSize: 7,
                fontWeight: 700,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "0 3px",
                border: "2px solid #072b47",
                lineHeight: 1,
              }}
            >
              {unreadCount}
            </span>
          )}
        </IconBtn>
        <IconBtn ariaLabel="Menu" onClick={onMenu}>
          <Menu size={17} strokeWidth={1.8} color="#ffffff" />
        </IconBtn>
      </div>
    </div>
  );
}

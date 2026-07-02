import React from "react";
import { Phone, Car, Bell, Menu, ChevronRight, ChevronLeft, PoundSterling } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";

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
        borderBottom: "1px solid #132A4A",
        boxShadow:
          "inset 0 -1px 0 rgba(255,255,255,0.04), 0 6px 0 0 #132A4A, 0 7px 0 0 rgba(11,31,58,0.10)",
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
        <IconBtn ariaLabel="Take payment" onClick={() => navigate({ to: "/take-payment" })}>
          <PoundSterling size={17} strokeWidth={1.8} color="#ffffff" />
        </IconBtn>
        <button
          type="button"
          aria-label="Notifications"
          onClick={onBell}
          style={{
            ...ICON_BTN,
            animation: unreadCount > 0 ? "dsmBellPulse 1.8s ease-in-out infinite" : "none",
          }}
        >
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
                background: "#1877D6",
                color: "#ffffff",
                fontSize: 7,
                fontWeight: 700,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "0 3px",
                border: "2px solid #0B1F3A",
                lineHeight: 1,
              }}
            >
              {unreadCount}
            </span>
          )}
        </button>
        <style>{`
          @keyframes dsmBellPulse {
            0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(204,34,41,0.55); }
            50% { transform: scale(1.08); box-shadow: 0 0 0 6px rgba(204,34,41,0); }
          }
        `}</style>
        <IconBtn ariaLabel="Menu" onClick={onMenu}>
          <Menu size={17} strokeWidth={1.8} color="#ffffff" />
        </IconBtn>
      </div>
    </div>
  );
}

import React from "react";
import { tokens } from "@/lib/tokens";
import { IconChevronLeft, IconMicrophone } from "@tabler/icons-react";
import {
  IconHeadset,
  IconDownload,
  IconCar,
  IconCurrencyPound,
  
  IconAdjustmentsHorizontal,
} from "@tabler/icons-react";
import { useNavigate } from "@tanstack/react-router";
import dsmLogoWhite from "@/assets/dsm-logo-white.png.asset.json";

export const TOP_BAR_SPACER = "calc(max(env(safe-area-inset-top, 0px), 24px) + 64px)";

export type InstructorTopBarProps = {
  firstName: string;
  avatarUrl?: string | null;
  unreadCount?: number;
  callsActive?: boolean;
  onPhone: () => void;
  onLiveTrack: () => void;
  onBell: () => void;
  onMenu: () => void;
  onMicPress: () => void;
  onProfile?: () => void;
  onBack?: () => void;
  pageTitle?: string;
  titleStyle?: React.CSSProperties;
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
  callsActive = false,
  onPhone,
  onLiveTrack,
  onBell,
  onMenu,
  onMicPress,
  onProfile,
  onBack,
  pageTitle,
  titleStyle,
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
        background: tokens.navy,
        padding: "calc(max(env(safe-area-inset-top, 0px), 24px) + 12px) 18px 16px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        borderBottom: "none",
        borderRadius: 0,
        boxShadow: "inset 0 -1px 0 rgba(255,255,255,0.04)",
      }}
    >
      {/* LEFT */}
      {isSubpage ? (
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <IconBtn ariaLabel="Back" onClick={onBack!}>
            <IconChevronLeft size={17} strokeWidth={1.8} color="#C7D0DE" />
          </IconBtn>
          <span
            style={{
              color: "#ffffff",
              fontSize: tokens.fontSize.lg,
              fontWeight: tokens.fontWeight.semibold,
              flex: 1,
              minWidth: 0,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              ...titleStyle,
            }}
          >
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
              style={{ height: 48, width: "auto", objectFit: "contain", display: "block" }}
            />
          </button>
          <IconBtn
            ariaLabel="Voice commands"
            onClick={onMicPress}
            style={{ background: tokens.blue, width: 30, height: 30 }}
          >
            <IconMicrophone size={16} strokeWidth={1.8} color="#ffffff" />
          </IconBtn>
        </div>
      )}

      {/* RIGHT */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {!isSubpage && (
          <>
            <IconBtn
              ariaLabel="Calls answering"
              onClick={onPhone}
              style={
                callsActive
                  ? { background: tokens.blue }
                  : undefined
              }
            >
              <IconHeadset
                size={17}
                stroke={1.8}
                color={callsActive ? "#FFFFFF" : "#C7D0DE"}
              />
            </IconBtn>
            <IconBtn ariaLabel="Messages" onClick={() => navigate({ to: "/messages" })}>
              <IconDownload size={17} stroke={1.8} color="#C7D0DE" />
            </IconBtn>
            <IconBtn ariaLabel="Live track" onClick={onLiveTrack}>
              <IconCar size={17} stroke={1.8} color="#C7D0DE" />
            </IconBtn>
            <IconBtn ariaLabel="Take payment" onClick={() => navigate({ to: "/take-payment" })}>
              <IconCurrencyPound size={17} stroke={1.8} color="#C7D0DE" />
            </IconBtn>
          </>
        )}
        <IconBtn ariaLabel="Notifications" onClick={onBell}>
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            {unreadCount > 0 ? (
              <defs>
                <linearGradient id="dsmBellGrad" x1="4" y1="2" x2="20" y2="22" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#FFC94A" />
                  <stop offset="1" stopColor="#F08A2E" />
                </linearGradient>
              </defs>
            ) : null}
            <path
              d="M12 2.6c-3.5 0-6.1 2.7-6.1 6.2v3.1c0 .8-.28 1.55-.79 2.15l-.74.88c-.72.86-.13 2.17 1 2.17h13.26c1.13 0 1.72-1.31 1-2.17l-.74-.88a3.35 3.35 0 0 1-.79-2.15V8.8c0-3.5-2.6-6.2-6.1-6.2Z"
              fill={unreadCount > 0 ? "url(#dsmBellGrad)" : "#C7D0DE"}
            />
            <path
              d="M9.5 19.4h5a2.5 2.5 0 0 1-5 0Z"
              fill={unreadCount > 0 ? "url(#dsmBellGrad)" : "#C7D0DE"}
            />
          </svg>

          {unreadCount > 0 && (
            <span style={{
              position: "absolute",
              top: -2,
              right: -2,
              background: tokens.red,
              color: "#ffffff",
              fontSize: tokens.fontSize.xs,
              fontWeight: tokens.fontWeight.semibold,
              minWidth: 17,
              height: 17,
              borderRadius: 8,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "1.5px solid #0B1F3A",
              padding: "0 3px",
              fontFamily: "Poppins, sans-serif",
            }}>
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </IconBtn>
        <IconBtn
          ariaLabel="Menu"
          onClick={() => window.dispatchEvent(new Event("dsm-open-menu"))}
        >
          <IconAdjustmentsHorizontal size={17} stroke={1.8} color="#C7D0DE" />
        </IconBtn>
      </div>
    </div>
  );
}


import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { tokens } from "@/lib/tokens";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useNavigate,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, useState, useRef, useCallback, type ReactNode } from "react";
import { IconAward, IconBolt, IconCalendar, IconCalendarCheck, IconCar, IconChartBar, IconChevronRight, IconClipboardCheck, IconCreditCard, IconCurrencyPound, IconFileText, IconGift, IconLogout, IconMapPin, IconMenu2, IconMessageCircle, IconMoon, IconNavigation, IconPhone, IconRefresh, IconSchool, IconShieldCheck, IconStar, IconSun, IconTrendingUp, IconUsers, IconX } from "@tabler/icons-react";
import { IconCalculator, IconCalendarPlus, IconHelpCircle, IconListCheck, IconReceipt, IconSettings, IconSignature, IconSparkles, IconSpeakerphone, IconBell, IconBriefcase, IconHelp, IconMail } from "@tabler/icons-react";

import appCss from "../styles.css?url";
import icon192 from "../assets/icon-192.png.asset.json";
import icon512 from "../assets/icon-512.png.asset.json";
import headerLogoAsset from "../assets/edp_transparent_logo_big_letters.png.asset.json";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { BottomNav, type NavKey } from "../components/dsm/BottomNav";
import { CommandPalette } from "../components/dsm/CommandPalette";
import { PushPermissionSheet } from "../components/dsm/PushPermissionSheet";
import { supabase } from "../lib/supabaseClient";
import { useUnreadCount } from "@/hooks/useUnreadCount";

import { isBiometricAvailable, authenticate } from "@/lib/biometric";
import { IconFingerprint } from "@tabler/icons-react";
import { App } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { SplashScreen } from "@capacitor/splash-screen";
import OneSignal from "@onesignal/capacitor-plugin";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { EventToastController, emitLiveEvent, type LiveEventKind } from "../components/dsm/EventToast";
import { MessageAlert } from "../components/dsm/MessageAlert";

import { Toaster } from "@/components/ui/sonner";










function getNotificationUrl(notification: any): string {
  if (notification.reference_type === "course_booking") {
    return notification.reference_id ? `/bookings?selected=${notification.reference_id}` : "/bookings";
  }
  if (notification.reference_type === "quote") return "/quotes";

  if (notification.reference_type === "reflective_log") return `/reflective-log/${notification.reference_id}`;
  if (notification.reference_type === "job_offer" && notification.reference_id)
    return `/messages?jobOfferId=${notification.reference_id}`;
  if (notification.reference_type === "payment") return "/payments";
  if (notification.reference_type === "lesson" && notification.reference_id)
    return `/lessons/${notification.reference_id}`;
  if (notification.reference_type === "pupil" && notification.reference_id)
    return `/pupils/${notification.reference_id}`;
  if (notification.type === "rewards") return "/rewards";
  return "/notifications";
}


function getActiveNav(pathname: string): NavKey | undefined {
  if (pathname === "/" || pathname === "/home") return "home";
  if (pathname.startsWith("/pupils")) return "pupils";
  if (pathname.startsWith("/schedule") || pathname.startsWith("/lessons")) return "schedule";
  if (pathname.startsWith("/messages")) return "messages";
  if (pathname === "/more") return "more";

  if (
    pathname.startsWith("/settings") ||
    pathname === "/profile" ||
    pathname === "/calendarsync" ||
    pathname === "/notificationsettings" ||
    pathname === "/availability" ||
    pathname === "/quickavailability"
  ) {
    return "settings";
  }
  return undefined;
}

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/home"
            className="inline-flex items-center justify-center rounded-lg border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { name: "viewport", content: "width=device-width, initial-scale=1.0, viewport-fit=cover, maximum-scale=1.0, user-scalable=no" },
      { charSet: "utf-8" },
      { title: "Every Driver Pro — Free forever for UK driving instructors" },
      { name: "description", content: "Manage lessons, take payments, track pupils and grow your driving school — all from one free app. Built for UK ADIs & PDIs." },
      { name: "author", content: "Lovable" },
      { name: "application-name", content: "Every Driver Pro" },
      { property: "og:site_name", content: "Every Driver Pro" },
      { property: "og:title", content: "Every Driver Pro — Free forever for UK driving instructors" },
      { property: "og:description", content: "Manage lessons, take payments, track pupils and grow your driving school — all from one free app. Built for UK ADIs & PDIs." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:site", content: "@Lovable" },
      { name: "twitter:title", content: "Every Driver Pro — Free forever for UK driving instructors" },
      { name: "twitter:description", content: "Manage lessons, take payments, track pupils and grow your driving school — all from one free app. Built for UK ADIs & PDIs." },
      { property: "og:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/62b8f50b-7e25-459c-b287-3277155d3f31" },
      { name: "twitter:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/62b8f50b-7e25-459c-b287-3277155d3f31" },
      { name: "theme-color", content: "#0B1F3A" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { name: "apple-mobile-web-app-title", content: "Every Driver Pro" },
      { name: "mobile-web-app-capable", content: "yes" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/manifest.json" },
      { rel: "apple-touch-icon", href: icon192.url },
      { rel: "icon", type: "image/png", href: "/favicon.png" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Sora:wght@600;700;800&family=Poppins:wght@400;500;600;700;800&display=swap",
      },

    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

type MenuItem = {
  label: string;
  icon: any;
  to?: string;
  event?: string;
  fallback?: string;
  signOut?: boolean;
};

const QUICK_ACTIONS: MenuItem[] = [
  { label: "Call a pupil", icon: IconPhone, to: "/messages" },
  { label: "Live track", icon: IconMapPin, to: "/live" },
  { label: "Take payment", icon: IconCurrencyPound, event: "dsm-open-unified-payment-sheet", fallback: "/home" },
  { label: "Add lesson", icon: IconCalendarPlus, event: "dsm-open-add-lesson-sheet", fallback: "/home" },
];

const MENU_GROUPS: { title: string; items: MenuItem[] }[] = [
  {
    title: "Daily",
    items: [
      { label: "Day briefing", icon: IconSun, to: "/briefing" },
      { label: "Outstanding", icon: IconListCheck, to: "/outstanding" },
      { label: "End of day", icon: IconMoon, to: "/end-of-day" },
      { label: "What's changed", icon: IconSparkles, to: "/whats-changed" },
    ],
  },
  {
    title: "Money",
    items: [
      { label: "Earnings", icon: IconTrendingUp, to: "/earnings" },
      { label: "Expenses", icon: IconReceipt, to: "/expenses" },
      { label: "Mileage", icon: IconCar, to: "/mileage" },
      { label: "Tax & MTD", icon: IconCalculator, to: "/mtd" },
      { label: "Invoices", icon: IconFileText, to: "/invoices" },
    ],
  },
  {
    title: "Pupils & lessons",
    items: [
      { label: "Tests", icon: IconClipboardCheck, to: "/tests" },
      { label: "Courses", icon: IconSchool, to: "/courses" },
      { label: "Quotes", icon: IconSignature, to: "/quotes" },
      { label: "Waiting list", icon: IconUsers, to: "/waitinglist" },
      { label: "Waivers", icon: IconShieldCheck, to: "/waivers" },
    ],
  },
  {
    title: "Growth & business",
    items: [
      { label: "Reviews", icon: IconStar, to: "/reviews" },
      { label: "Referrals", icon: IconGift, to: "/referrals" },
      { label: "Broadcast", icon: IconSpeakerphone, to: "/broadcast" },
      { label: "Reports", icon: IconChartBar, to: "/reports" },
      { label: "CPD & certs", icon: IconAward, to: "/cpd" },
      { label: "Community", icon: IconMessageCircle, to: "/community" },
    ],
  },
  {
    title: "Account",
    items: [
      { label: "Settings", icon: IconSettings, to: "/settings" },
      { label: "Calendar sync", icon: IconRefresh, to: "/calendarsync" },
      { label: "Help", icon: IconHelpCircle, to: "/help" },
      { label: "Sign out", icon: IconLogout, signOut: true },
    ],
  },
];

type MenuTile = {
  label: string;
  icon: any;
  to: string;
  bg: string;
};

const ACTION_TILES: MenuTile[] = [
  { label: "Schedule", icon: IconCalendar, to: "/schedule", bg: "#0B2341" },
  { label: "Calls", icon: IconPhone, to: "/calls", bg: "#16A34A" },
  { label: "Payment", icon: IconCreditCard, to: "/take-payment", bg: "#2C97DE" },
  { label: "Tracking", icon: IconMapPin, to: "/live", bg: "#E53935" },
  { label: "Courses", icon: IconSchool, to: "/courses", bg: "#0B2341" },
  { label: "Availability", icon: IconCalendarCheck, to: "/availability", bg: "#18A999" },
  { label: "Jobs", icon: IconBriefcase, to: "/jobs", bg: "#F59E0B" },
  { label: "Enquiries", icon: IconMail, to: "/enquiries", bg: "#7B61FF" },
];

function GlobalMenu() {
  const [open, setOpen] = useState(false);
  const [profile, setProfile] = useState<{ name: string; email: string; profile_image_url: string | null } | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener("dsm-open-menu", handler);
    return () => window.removeEventListener("dsm-open-menu", handler);
  }, []);

  useEffect(() => {
    if (!open) return;
    let mounted = true;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !mounted) return;
      const email = user.email ?? "";
      const { data } = await supabase.from("instructors").select("name, profile_image_url").eq("id", user.id).limit(1).single();
      if (mounted) {
        setProfile({ name: data?.name ?? "Instructor", email, profile_image_url: data?.profile_image_url ?? null });
      }
    })();
    return () => { mounted = false; };
  }, [open]);

  if (!open) return null;

  const go = (to: string) => {
    setOpen(false);
    navigate({ to: to as never });
  };

  const signOut = async () => {
    setOpen(false);
    await supabase.auth.signOut();
    navigate({ to: "/login" as never, replace: true });
  };

  

  return (
    <div
      onClick={() => setOpen(false)}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        zIndex: 60,
        display: "flex",
        justifyContent: "flex-start",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "85%",
          maxWidth: 360,
          height: "100vh",
          background: "#F4F6F8",
          boxShadow: "4px 0 24px rgba(0,0,0,0.2)",
          display: "flex",
          flexDirection: "column",
          fontFamily: "Poppins, sans-serif",
        }}
      >
        {/* Profile section */}
        <div style={{ position: "relative", background: "#0B2341", paddingTop: "calc(env(safe-area-inset-top) + 20px)", paddingLeft: 16, paddingRight: 16, paddingBottom: 20 }}>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close menu"
            style={{
              position: "absolute",
              top: 16,
              right: 16,
              width: 32,
              height: 32,
              borderRadius: 8,
              background: "rgba(255,255,255,0.15)",
              border: "none",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              padding: 0,
            }}
          >
            <IconX stroke={1.5} size={20} color="#fff" />
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 14, paddingRight: 40 }}>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div
                style={{
                  color: "#fff",
                  fontSize: 16,
                  fontWeight: tokens.fontWeight.bold,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {profile?.name ?? "Every Driver Pro"}
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginTop: 2,
                  minWidth: 0,
                }}
              >
                <span
                  style={{
                    color: "rgba(255,255,255,0.6)",
                    fontSize: 12,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    flex: 1,
                    minWidth: 0,
                  }}
                >
                  {profile?.email ?? ""}
                </span>
                <span
                  style={{
                    flexShrink: 0,
                    background: "#2C97DE",
                    color: "#fff",
                    fontSize: 9,
                    fontWeight: tokens.fontWeight.bold,
                    padding: "2px 8px",
                    borderRadius: 999,
                    textTransform: "uppercase",
                    letterSpacing: 0.3,
                  }}
                >
                  Pro plan
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 2-column action grid */}
        <div
          style={{
            background: "#F4F6F8",
            padding: 10,
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 6,
            borderBottom: "1px solid #E4E8EF",
          }}
        >
          {ACTION_TILES.map((tile) => {
            const Icon = tile.icon;
            return (
              <button
                key={tile.label}
                type="button"
                onClick={() => go(tile.to)}
                style={{
                  background: "#fff",
                  border: "1px solid #E4E8EF",
                  borderRadius: 12,
                  padding: "10px 10px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-start",
                  gap: 8,
                  cursor: "pointer",
                }}
              >
                <span
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 8,
                    background: tile.bg,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <Icon size={14} stroke={1.8} color="#fff" />
                </span>
                <span style={{ fontSize: 12, fontWeight: tokens.fontWeight.semibold, color: "#0B2341" }}>
                  {tile.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Bottom actions */}
        <div style={{ flex: 1, background: "#fff", display: "flex", flexDirection: "column" }}>
          <button
            type="button"
            onClick={() => go("/settings")}
            style={{
              width: "100%",
              textAlign: "left",
              padding: "14px 16px",
              background: "none",
              border: "none",
              borderBottom: "1px solid #E4E8EF",
              display: "flex",
              alignItems: "center",
              gap: 12,
              cursor: "pointer",
            }}
          >
            <span
              style={{
                width: 34,
                height: 34,
                borderRadius: 8,
                background: "#EAF5FC",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <IconSettings size={18} stroke={1.8} color="#2C97DE" />
            </span>
            <span style={{ fontSize: 14, fontWeight: tokens.fontWeight.semibold, color: "#0B2341" }}>Settings</span>
          </button>
          <button
            type="button"
            onClick={() => go("/help")}
            style={{
              width: "100%",
              textAlign: "left",
              padding: "14px 16px",
              background: "none",
              border: "none",
              borderBottom: "1px solid #E4E8EF",
              display: "flex",
              alignItems: "center",
              gap: 12,
              cursor: "pointer",
            }}
          >
            <span
              style={{
                width: 34,
                height: 34,
                borderRadius: 8,
                background: "#EAF5FC",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <IconHelp size={18} stroke={1.8} color="#2C97DE" />
            </span>
            <span style={{ fontSize: 14, fontWeight: tokens.fontWeight.semibold, color: "#0B2341" }}>Help & support</span>
          </button>
          <button
            type="button"
            onClick={signOut}
            style={{
              width: "100%",
              textAlign: "left",
              padding: "14px 16px",
              background: "none",
              border: "none",
              borderTop: "1px solid #E4E8EF",
              display: "flex",
              alignItems: "center",
              gap: 12,
              cursor: "pointer",
            }}
          >
            <span
              style={{
                width: 34,
                height: 34,
                borderRadius: 8,
                background: "#FEE2E2",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <IconLogout size={18} stroke={1.8} color="#E53935" />
            </span>
            <span style={{ fontSize: 14, fontWeight: tokens.fontWeight.semibold, color: "#E53935" }}>Sign out</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function Header({ unreadCount }: { unreadCount: number }) {
  const navigate = useNavigate();
  const hasUnread = unreadCount > 0;
  const openMenu = () => window.dispatchEvent(new Event("dsm-open-menu"));

  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        background: "#0B2341",
        paddingTop: "calc(env(safe-area-inset-top) + 12px)",
        paddingLeft: "calc(env(safe-area-inset-left) + 16px)",
        paddingRight: "calc(env(safe-area-inset-right) + 16px)",
        paddingBottom: 10,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        fontFamily: "Poppins, sans-serif",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
        <IconMenu2
          stroke={1.5}
          size={24}
          color="#fff"
          style={{ cursor: "pointer" }}
          onClick={openMenu}
        />
      </div>

      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "calc(env(safe-area-inset-top) + 12px)",
          bottom: 10,
          transform: "translateX(-50%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          pointerEvents: "none",
        }}
      >
        <img
          src={headerLogoAsset.url}
          alt="Every Driver Pro"
          style={{ height: 36, width: "auto", objectFit: "contain" }}
        />
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
        <div
          style={{ position: "relative", cursor: "pointer" }}
          onClick={() => navigate({ to: "/notifications" as never })}
        >
          <IconBell stroke={1.5} size={20} color="#fff" />
          {unreadCount > 0 && (
            <div
              style={{
                position: "absolute",
                top: -6,
                right: -6,
                minWidth: 18,
                height: 18,
                borderRadius: 9,
                background: "#E53935",
                border: "2px solid #0B2341",
                color: "#fff",
                fontSize: 10,
                fontWeight: 700,
                fontFamily: "Poppins, sans-serif",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "0 4px",
              }}
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

function RootComponent() {
  // Keep the native app-icon badge in sync with the real unread count on every
  // screen, not just the handful of pages that mount this hook themselves.
  const unreadCount = useUnreadCount();

  // Desktop redirect: native app stays, mobile browser stays, desktop goes to web app
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!Capacitor.isNativePlatform() && window.innerWidth > 768) {
      window.location.href = "https://desktop.everydriver.pro";
    }
  }, []);


  const { queryClient } = Route.useRouteContext();
  const router = useRouter();
  const [sheetOpen, setSheetOpen] = useState(false);
  const active = getActiveNav(router.state.location.pathname);
  const pathname = router.state.location.pathname;
  const hideNavExact = new Set([
    "/login",
    "/register",
    "/forgotpassword",
    "/resetpassword",
    "/onboarding",
    "/livesession",
    "/live",
    "/satnav",
  ]);
  const hideNav =
    hideNavExact.has(pathname) ||
    pathname.startsWith("/i/") ||
    pathname.startsWith("/quote/");


  const whiteBgPaths = new Set([
    "/login",
    "/register",
    "/onboarding",
    "/forgotpassword",
    "/resetpassword",
    "/satnav",
    "/livesession",
  ]);
  const useWhiteBg = whiteBgPaths.has(pathname);

  const showHeader = !hideNav;

  const wrapperStyle: Record<string, string | number> = {};
  if (showHeader) {
    wrapperStyle.paddingTop = 'calc(env(safe-area-inset-top, 0px) + 46px)';
  } else {
    wrapperStyle.paddingTop = 'env(safe-area-inset-top, 0px)';
  }
  if (!hideNav) {
    wrapperStyle.paddingBottom =
      'calc(80px + env(safe-area-inset-bottom, 0px))';
  }
  if (!useWhiteBg) wrapperStyle.backgroundColor = "#EEF2F7";

  // Track recent screens for the search screen's "Recent" list.
  useEffect(() => {
    if (pathname === "/search") return;
    import("./search").then((m) => m.recordRecentScreen(pathname)).catch(() => {});
  }, [pathname]);

  // Native wrappers: App lifecycle listeners only.
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let appStateSub: Promise<{ remove: () => void }> | undefined;
    let backSub: Promise<{ remove: () => void }> | undefined;

    (async () => {
      try {
        // App state changes: on resume, refresh unread count and sync badge to it
        try {
          appStateSub = App.addListener("appStateChange", async ({ isActive }) => {
            if (isActive) {
              window.dispatchEvent(new Event("dsm-notifications-updated"));
              try {
                const playerId = await OneSignal.User.pushSubscription.getIdAsync();
                if (playerId) {
                  const { data: { user } } = await supabase.auth.getUser();
                  if (user) {
                    await supabase
                      .from('instructors')
                      .upsert({
                        id: user.id,
                        onesignal_player_id: playerId
                      }, { onConflict: 'id' });
                    console.log('[OneSignal] player ID saved on foreground:', playerId);
                    OneSignal.login(user.id);
                    console.log('[OneSignal] external ID set on foreground:', user.id);
                  }
                }
              } catch (e) {
                console.warn('[OneSignal] foreground player ID save failed:', e);
              }
              // Badge sync intentionally omitted here: the
              // "dsm-notifications-updated" event dispatched above causes
              // useUnreadCount() to refetch the real unread count and set
              // (not clear) the native badge to match it. Resuming the app
              // must reflect the true unread count, not wipe it to zero.
            }
          });
        } catch (e) {
          console.warn('App.addListener appStateChange', e);
        }

        // Android back button
        try {
          backSub = App.addListener("backButton", ({ canGoBack }) => {
            if (canGoBack) {
              window.history.back();
            } else {
              try {
                void App.exitApp();
              } catch (e) {
                console.warn('App.exitApp', e);
              }
            }
          });
        } catch (e) {
          console.warn('App.addListener backButton', e);
        }

        // OneSignal push notifications
        try {
          await OneSignal.initialize('70d001f6-c98e-434d-8251-354c62447cb5');

          // iOS system prompt: "Every Driver Pro would like to send you notifications"
          if (Capacitor.isNativePlatform()) {
            const alreadyGranted = await OneSignal.Notifications.hasPermission();
            if (alreadyGranted) {
              console.log('[OneSignal] permission already granted');
            } else {
              let asked = false;
              try { asked = localStorage.getItem('dsm.push.asked') === 'true'; } catch { /* ignore */ }
              if (!asked) {
                try { localStorage.setItem('dsm.push.asked', 'true'); } catch { /* ignore */ }
                // fallbackToSettings = false: only the real iOS system prompt, never
                // OneSignal's "Open Settings" dialog.
                await OneSignal.Notifications.requestPermission(false);
                const isGranted = await OneSignal.Notifications.hasPermission();
                console.log(`[OneSignal] permission ${isGranted ? 'granted' : 'not granted'}`);
              } else {
                console.log('[OneSignal] permission not granted; already asked once, skipping prompt');
              }
            }
          }

          try { localStorage.removeItem('dsm.push.initError'); } catch { /* ignore */ }
          OneSignal.Notifications.addEventListener('click', (event) => {
            const data = event.notification.additionalData as any;
            const type = data?.type ?? '';
            const url = data?.url;
            try {
              window.dispatchEvent(new Event('dsm-notifications-updated'));
            } catch { /* ignore */ }
            if (typeof url === 'string' && url) {
              router.navigate({ to: url as never });
            } else if (type === 'message' || type === 'instructor_dm') {
              router.navigate({ to: '/messages' as never });
            } else if (type === 'overdue_payment' || type === 'payment') {
              router.navigate({ to: '/payments' as never });
            } else if (type === 'lesson_cancelled' || type === 'tracking' || type === 'lesson') {
              router.navigate({ to: '/schedule' as never });
            } else if (type === 'test_tomorrow' || type === 'test') {
              router.navigate({ to: '/schedule' as never });
            } else if (type === 'pupil_churn' || type === 'pupil') {
              router.navigate({ to: '/pupils' as never });
            } else if (type === 'enquiry' || type === 'new_enquiry') {
              router.navigate({ to: '/enquiries' as never });
            } else if (type === 'live_starting_soon' || type === 'dsm_live') {
              router.navigate({ to: '/dsm-live' as never });
            } else {
              router.navigate({ to: '/notifications' as never });
            }
            console.log('[OneSignal] navigating for type:', type, 'url:', url);
          });
          const requestRecount = (reason: string) => {
            const fire = () => {
              try {
                window.dispatchEvent(new Event('dsm-notifications-updated'));
              } catch { /* ignore */ }
            };
            console.log('[OneSignal] recount requested:', reason);
            fire();
            // The notification row may land a moment after the push arrives.
            setTimeout(fire, 1500);
            setTimeout(fire, 5000);
          };
          OneSignal.Notifications.addEventListener('foregroundWillDisplay', (event) => {
            const data = event.getNotification().additionalData as any;
            console.log('[OneSignal] foreground will display', data);
            requestRecount('foregroundWillDisplay');
          });
          try {
            OneSignal.Notifications.addEventListener('permissionChange', (granted: boolean) => {
              console.log('[OneSignal] permission change:', granted);
              if (granted) requestRecount('permissionChange');
            });
          } catch (e) { console.warn('[OneSignal] permissionChange listener failed', e); }
          try {
            OneSignal.User.pushSubscription.addEventListener('change', (event: any) => {
              console.log('[OneSignal] push subscription change:', event?.current?.optedIn);
              requestRecount('pushSubscriptionChange');
            });
          } catch (e) { console.warn('[OneSignal] subscription change listener failed', e); }
          console.log('[OneSignal] initialized');


          // Save OneSignal Player ID to DB
          try {
            const playerId = await OneSignal.User.pushSubscription.getIdAsync();
            if (playerId) {
              const { data: { user } } = await supabase.auth.getUser();
              if (user) {
                await supabase
                  .from('instructors')
                  .upsert({
                    id: user.id,
                    onesignal_player_id: playerId
                  }, { onConflict: 'id' });
                console.log('[OneSignal] player ID saved:', playerId);
                OneSignal.login(user.id);
                console.log('[OneSignal] external ID set:', user.id);
              }
            }
          } catch (e) {
            console.warn('[OneSignal] player ID save failed:', e);
          }
        } catch (e: any) {
          console.error('[OneSignal] FULL ERROR:', e?.message, e?.stack, JSON.stringify(e));
          // Surface the failure in Notification settings instead of failing silently.
          try {
            localStorage.setItem('dsm.push.initError', String(e?.message ?? 'init failed'));
          } catch { /* ignore */ }
        }
      } catch (e) {
        console.error('[native init] error:', e);
        // Never throw — never crash
      }
    })();

    return () => {
      
      if (appStateSub) void appStateSub.then((s) => s.remove());
      if (backSub) void backSub.then((s) => s.remove());
    };
  }, []);

  // ---- Face ID / Touch ID app lock ----
  const [locked, setLocked] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const lastActiveRef = useRef<number>(Date.now());

  const unlock = useCallback(async () => {
    const success = await authenticate("Unlock EDP");
    if (success) {
      setLocked(false);
      lastActiveRef.current = Date.now();
    }
  }, []);

  useEffect(() => {
    let cleanup: (() => void) | undefined;
    let cancelled = false;

    (async () => {
      let available = false;
      try {
        available = await isBiometricAvailable();
      } catch {
        available = false;
      }
      if (cancelled) return;
      setBiometricEnabled(available);

      let pref: string | null = null;
      try {
        pref = localStorage.getItem("dsm_biometric_lock");
      } catch {
        /* ignore */
      }
      if (pref !== "true") return;

      const handleVisibilityChange = () => {
        if (document.hidden) {
          lastActiveRef.current = Date.now();
        } else {
          const elapsed = Date.now() - lastActiveRef.current;
          if (elapsed > 5 * 60 * 1000 && available) {
            setLocked(true);
          }
        }
      };

      document.addEventListener("visibilitychange", handleVisibilityChange);
      cleanup = () =>
        document.removeEventListener("visibilitychange", handleVisibilityChange);
    })();

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, []);

  // Prompt automatically as soon as the lock screen appears.
  useEffect(() => {
    if (!locked) return;
    const t = setTimeout(() => { void unlock(); }, 500);
    return () => clearTimeout(t);
  }, [locked, unlock]);




  // Register the service worker only. Permission is requested by the
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker
      .register('/sw.js')
      .then(() => console.log("[push] service worker registered"))
      .catch((err) => console.warn("[push] sw register failed:", err));
  }, []);

  // Track current user id for realtime notification subscription.
  const [userId, setUserId] = useState<string | null>(null);
  useEffect(() => {
    let mounted = true;
    supabase.auth.getUser().then(async ({ data }: any) => {
      if (mounted) setUserId(data.user?.id ?? null);
      try {
        await SplashScreen.hide();
      } catch (e) {
        // ignore
      }
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
      const uid = session?.user?.id ?? null;
      setUserId(uid);
      // Register device with OneSignal for push notifications
      if (uid && typeof window !== 'undefined' && (window as any).despia) {
        (window as any).despia(
          `setonesignalexternalid://?external_id=${uid}`
        );
        // Register for push notifications
        if (navigator.userAgent.toLowerCase().includes('despia')) {
          (window as any).despia('registerpush://');
          (window as any).despia(
            `setonesignalplayerid://?user_id=${uid}`
          );
        }
      }
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  // After login, if push notifications are blocked or not enabled on the device,
  // send the instructor to the notification settings page once per app session.
  useEffect(() => {
    if (!userId) return;
    if (!Capacitor.isNativePlatform()) return;
    let cancelled = false;

    (async () => {
      try {
        if (sessionStorage.getItem('dsm.push.settingsPrompted') === 'true') return;
      } catch { /* ignore */ }

      let granted = false;
      try {
        granted = await OneSignal.Notifications.hasPermission();
      } catch (e) {
        console.warn('[OneSignal] permission check failed:', e);
        return;
      }
      if (cancelled || granted) return;

      const path = window.location.pathname;
      if (path.startsWith('/notificationsettings')) return;

      try { sessionStorage.setItem('dsm.push.settingsPrompted', 'true'); } catch { /* ignore */ }
      console.log('[OneSignal] notifications not enabled — opening notification settings');
      router.navigate({ to: '/notificationsettings' as never });
    })();

    return () => { cancelled = true; };
  }, [userId, router]);



  // Hide bottom nav while any sheet (e.g. community report sheet) is open.
  useEffect(() => {
    const onOpen = () => setSheetOpen(true);
    const onClose = () => setSheetOpen(false);
    window.addEventListener("dsm-sheet-open", onOpen);
    window.addEventListener("dsm-sheet-close", onClose);
    return () => {
      window.removeEventListener("dsm-sheet-open", onOpen);
      window.removeEventListener("dsm-sheet-close", onClose);
    };
  }, []);

  // Check if current user is an admin (informational only, no redirects).
  const [isAdmin, setIsAdmin] = useState(false);
  useEffect(() => {
    if (!userId) return;
    let mounted = true;
    supabase
      .from("admin_users")
      .select("user_id")
      .eq("user_id", userId)
      .limit(1)
      .then(({ data }: any) => {
        if (mounted) setIsAdmin(!!data?.length);
      });
    return () => {
      mounted = false;
    };
  }, [userId]);

  // Route every new instructor_notifications row through the shared event bus.
  // Foreground → in-app toast; background → native push (via SW).
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel("instructor-notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "instructor_notifications",
          filter: `instructor_id=eq.${userId}`,
        },
        async (payload: any) => {
          const n: any = payload.new ?? {};
          const url = getNotificationUrl(n);
          const kind: LiveEventKind = (() => {
            const t = String(n.type || "").toLowerCase();
            if (t.includes("job")) return "job";
            if (t.includes("enquir")) return "enquiry";
            if (t.includes("payment")) return "payment";
            if (t.includes("booking") || t.includes("lesson")) return "booking";
            if (t.includes("call")) return "call";
            return "message";
          })();

          const title = n.title ? String(n.title) : undefined;
          const text = n.body ? String(n.body) : title ? "" : "New activity";
          emitLiveEvent({
            kind,
            title,
            text,
            url,
            dedupeKey: n.id ? `notif:${n.id}` : undefined,
          });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  // Admin-only realtime subscription for new job-offer messages from instructors.
  useEffect(() => {
    if (!isAdmin) return;
    const channel = supabase
      .channel("admin-job-offer-messages")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "job_offer_messages",
          filter: "sender_type=eq.instructor",
        },
        async (payload: any) => {
          const m: any = payload.new ?? {};
          let instructorName = "Instructor";
          let pupilName = "job offer";
          try {
            const [{ data: senderData }, { data: jobData }] = await Promise.all([
              supabase.from("instructors").select("name").eq("id", m.sender_id).limit(1),
              supabase.from("job_offers").select("pupil_name").eq("id", m.job_offer_id).limit(1),
            ]);
            instructorName = senderData?.[0]?.name || instructorName;
            pupilName = jobData?.[0]?.pupil_name || pupilName;
          } catch (e) {
            console.warn("[admin-job-msg] lookup failed", e);
          }
          emitLiveEvent({
            kind: "message",
            text: `New message from ${instructorName} re: ${pupilName}`,
            url: "/messages",
          });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAdmin]);


  // Silent background sync of external calendar on app load.
  useEffect(() => {
    if (!userId) return;

    const syncCalendar = async () => {
      try {
        // Throttle: Google rate-limits (HTTP 429) ICS feeds that are polled
        // too often. At most one background sync every 15 minutes per device.
        const THROTTLE_MS = 15 * 60 * 1000;
        const lastKey = `dsm:calendar-sync:${userId}`;
        const last = Number(localStorage.getItem(lastKey) || 0);
        if (Date.now() - last < THROTTLE_MS) return;

        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        if (!token) return;


        const SUPABASE_URL = "https://bjpqxfrihwjcqprmoqfs.supabase.co";
        const SUPABASE_ANON_KEY =
          "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJqcHF4ZnJpaHdqY3Fwcm1vcWZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0NzQ4MjEsImV4cCI6MjA5NzA1MDgyMX0.HKlgx3dxP3uxX9wMRRUnfb0IPwaBpFcut_iUgT5XFeo";

        // Check if instructor has an external calendar URL before syncing
        const instRes = await fetch(
          `${SUPABASE_URL}/rest/v1/instructors?id=eq.${userId}&select=external_calendar_url`,
          { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${token}` } },
        );
        const instData = await instRes.json();
        const url: string | undefined = instData?.[0]?.external_calendar_url;
        if (!url) return;
        // Guard against malformed values stored in the DB
        try {
          const u = new URL(url);
          if (u.protocol !== "https:" && u.protocol !== "http:" && u.protocol !== "webcal:") return;
        } catch {
          return;
        }

        // Silent background sync
        localStorage.setItem(`dsm:calendar-sync:${userId}`, String(Date.now()));
        const syncRes = await fetch(`${SUPABASE_URL}/functions/v1/sync-external-calendar`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ instructorId: userId }),
        });
        if (!syncRes.ok) {
          // e.g. the calendar provider rate-limited us (HTTP 429) — ignore silently
          console.warn('[calendar] External calendar sync skipped:', syncRes.status);
          return;
        }

        console.log('[calendar] External calendar synced on app open');
        window.dispatchEvent(new Event('calendar-synced'));

      } catch (err) {
        // Silent fail — never block app load
        console.warn('[calendar] External calendar sync failed:', err);
      }
    };

    // Delay by 3 seconds so it doesn't compete with critical app startup
    const timer = setTimeout(syncCalendar, 3000);
    return () => clearTimeout(timer);
  }, [userId]);



  return (
    <QueryClientProvider client={queryClient}>
      {locked && biometricEnabled && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 100000,
            background: tokens.navy,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 12,
            padding: 24,
            fontFamily: "Poppins, sans-serif",
          }}
        >
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: 20,
              background: tokens.blue,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 8,
            }}
          >
            <span style={{ fontSize: 24, fontWeight: tokens.fontWeight.extrabold, color: "#fff" }}>EDP</span>
          </div>
          <div style={{ fontSize: tokens.fontSize.xl, fontWeight: tokens.fontWeight.bold, color: "#fff" }}>
            EDP by EveryDriver
          </div>
          <div
            style={{
              fontSize: tokens.fontSize.md,
              color: "rgba(255,255,255,0.5)",
              marginTop: -12,
            }}
          >
            Locked
          </div>
          <button
            type="button"
            onClick={() => { void unlock(); }}
            style={{
              marginTop: 16,
              background: tokens.blue,
              color: "#fff",
              borderRadius: tokens.radiusCard,
              padding: "14px 16px",
              fontSize: 15,
              fontWeight: tokens.fontWeight.extrabold,
              border: "none",
              cursor: "pointer",
              fontFamily: "Poppins, sans-serif",
              boxShadow: "0 4px 0 #0F52A8",
              display: "flex",
              gap: 10,
              alignItems: "center",
            }}
          >
            <IconFingerprint size={20} />
            Unlock with Face ID
          </button>
        </div>
      )}
      {showHeader && <Header unreadCount={unreadCount} />}
      {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
      <div style={Object.keys(wrapperStyle).length ? wrapperStyle : undefined}>
        <Outlet />
      </div>
      {!hideNav && !sheetOpen && <BottomNav active={active} />}
      <CommandPalette />
      <GlobalMenu />
      <EventToastController />
      <MessageAlert userId={userId} />

      <PushPermissionSheet userId={userId} />
      <Toaster />
    </QueryClientProvider>
  );
}




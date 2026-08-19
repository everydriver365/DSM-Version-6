import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
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
import { IconAward, IconBolt, IconCalendar, IconCalendarCheck, IconCar, IconChartBar, IconChevronRight, IconClipboardCheck, IconCreditCard, IconCurrencyPound, IconFileText, IconGift, IconLogout, IconMapPin, IconMenu2, IconMessageCircle, IconMoon, IconNavigation, IconPhone, IconRefresh, IconSchool, IconSearch, IconShieldCheck, IconStar, IconSun, IconTrendingUp, IconUsers, IconX } from "@tabler/icons-react";
import { IconCalculator, IconCalendarPlus, IconHelpCircle, IconListCheck, IconReceipt, IconSettings, IconSignature, IconSparkles, IconSpeakerphone } from "@tabler/icons-react";

import appCss from "../styles.css?url";
import icon192 from "../assets/icon-192.png.asset.json";
import icon512 from "../assets/icon-512.png.asset.json";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { BottomNav, type NavKey } from "../components/dsm/BottomNav";
import { CommandPalette } from "../components/dsm/CommandPalette";
import { PushPermissionSheet } from "../components/dsm/PushPermissionSheet";
import { supabase } from "../lib/supabaseClient";
import { setupEdgeToEdgeStatusBar } from "../lib/statusBar";
import { isBiometricAvailable, authenticate } from "@/lib/biometric";
import { IconFingerprint } from "@tabler/icons-react";
import { StatusBar, Style } from "@capacitor/status-bar";
import { Keyboard } from "@capacitor/keyboard";
import { App } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
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
            href="/"
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
      { title: "Driving School Manager — Free forever for UK driving instructors" },
      { name: "description", content: "Manage lessons, take payments, track pupils and grow your driving school — all from one free app. Built for UK ADIs & PDIs." },
      { name: "author", content: "Lovable" },
      { property: "og:title", content: "Driving School Manager — Free forever for UK driving instructors" },
      { property: "og:description", content: "Manage lessons, take payments, track pupils and grow your driving school — all from one free app. Built for UK ADIs & PDIs." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:site", content: "@Lovable" },
      { name: "twitter:title", content: "Driving School Manager — Free forever for UK driving instructors" },
      { name: "twitter:description", content: "Manage lessons, take payments, track pupils and grow your driving school — all from one free app. Built for UK ADIs & PDIs." },
      { property: "og:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/62b8f50b-7e25-459c-b287-3277155d3f31" },
      { name: "twitter:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/62b8f50b-7e25-459c-b287-3277155d3f31" },
      { name: "theme-color", content: "#0B1F3A" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { name: "apple-mobile-web-app-title", content: "DSM" },
      { name: "mobile-web-app-capable", content: "yes" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/manifest.json" },
      { rel: "apple-touch-icon", href: icon192.url },
      { rel: "icon", type: "image/png", sizes: "192x192", href: "/__l5e/assets-v1/822269be-f3a7-47f7-9696-0d4e26d6be94/icon-192.png" },
      { rel: "icon", type: "image/png", sizes: "512x512", href: "/__l5e/assets-v1/822269be-f3a7-47f7-9696-0d4e26d6be94/icon-192.png" },
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

function GlobalMenu({ isAdmin }: { isAdmin: boolean }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener("dsm-open-menu", handler);
    return () => window.removeEventListener("dsm-open-menu", handler);
  }, []);

  if (!open) return null;

  const go = async (m: MenuItem) => {
    setOpen(false);
    if (m.signOut) {
      await supabase.auth.signOut();
      navigate({ to: "/" as never, replace: true });
      return;
    }
    if (m.event) {
      // Cancelable: a page that handles the event calls preventDefault(),
      // otherwise we fall back to a route.
      const handled = !window.dispatchEvent(new CustomEvent(m.event, { cancelable: true }));
      if (!handled && m.fallback) navigate({ to: m.fallback as never });
      return;
    }
    if (m.to) navigate({ to: m.to as never });
  };

  const Row = ({ m, first }: { m: MenuItem; first?: boolean }) => {
    const Icon = m.icon;
    return (
      <button
        type="button"
        onClick={() => go(m)}
        style={{
          width: "100%",
          textAlign: "left",
          padding: "14px 16px",
          background: "none",
          border: "none",
          borderTop: first ? "none" : "1px solid #EFEFF2",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: 13,
          fontFamily: "Poppins, sans-serif",
        }}
      >
        <span
          style={{
            width: 30,
            height: 30,
            borderRadius: 8,
            background: "#F2F2F7",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <Icon size={17} stroke={1.8} color="#000" />
        </span>
        <span style={{ flex: 1, fontSize: 15, fontWeight: 500, color: "#000" }}>{m.label}</span>
        <IconChevronRight size={14} color="#C7C7CC" />
      </button>
    );
  };

  const matches = (label: string) =>
    !query.trim() || label.toLowerCase().includes(query.trim().toLowerCase());

  const sections: { title: string; items: MenuItem[] }[] = [
    { title: "Quick actions", items: QUICK_ACTIONS },
    ...MENU_GROUPS.map((g) => ({
      title: g.title,
      items: g.items.filter((m) => !m.signOut),
    })),
  ]
    .map((s) => ({ title: s.title, items: s.items.filter((m) => matches(m.label)) }))
    .filter((s) => s.items.length > 0);

  const cardStyle: React.CSSProperties = {
    background: "#fff",
    borderRadius: 8,
    overflow: "hidden",
    boxShadow: "0 1px 2px rgba(0,0,0,0.04), 0 6px 16px rgba(0,0,0,0.05)",
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
        justifyContent: "flex-end",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(82vw, 320px)",
          height: "100vh",
          background: "#F2F2F7",
          boxShadow: "-4px 0 24px rgba(0,0,0,0.2)",
          display: "flex",
          flexDirection: "column",
          fontFamily: "Poppins, sans-serif",
        }}
      >
        <div
          style={{
            background: "#0B1F3A",
            color: "#fff",
            padding: "16px 18px 14px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ fontWeight: 700, fontSize: 16 }}>Menu</div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              {isAdmin && (
                <button
                  onClick={() => {
                    navigate({ to: "/admin" as never });
                    setOpen(false);
                  }}
                  style={{
                    fontSize: 10,
                    fontWeight: 500,
                    color: "rgba(255,255,255,0.5)",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: 0,
                  }}
                >
                  Admin
                </button>
              )}
              <button
                onClick={async () => {
                  setOpen(false);
                  await supabase.auth.signOut();
                  navigate({ to: "/" as never, replace: true });
                }}
                style={{
                  fontSize: 10,
                  fontWeight: 500,
                  color: "rgba(255,255,255,0.5)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: 0,
                }}
              >
                Sign out
              </button>
              <button
                onClick={() => setOpen(false)}
                aria-label="Close menu"
                style={{ background: "none", border: "none", color: "#fff", cursor: "pointer", display: "flex" }}
              >
                <IconX stroke={1.5} size={22} />
              </button>
            </div>
          </div>

          <div
            style={{
              marginTop: 12,
              background: "rgba(255,255,255,0.08)",
              borderRadius: 8,
              padding: "11px 14px",
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              gap: 9,
            }}
          >
            <IconSearch size={16} color="rgba(255,255,255,0.5)" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search menu"
              aria-label="Search menu"
              style={{
                flex: 1,
                background: "transparent",
                border: "none",
                outline: "none",
                color: "#fff",
                fontSize: 14,
                fontFamily: "Poppins, sans-serif",
              }}
            />
          </div>
        </div>

        <div style={{ overflowY: "auto", flex: 1, padding: "16px 14px 28px" }}>
          {sections.map((g, gi) => (
            <div key={g.title} style={{ marginTop: gi === 0 ? 0 : 22 }}>
              <div
                style={{
                  color: "#8A8A8E",
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: "0.5px",
                  textTransform: "uppercase",
                  margin: "4px 4px 10px",
                }}
              >
                {g.title}
              </div>
              <div style={cardStyle}>
                {g.items.map((m, i) => (
                  <Row key={m.label} m={m} first={i === 0} />
                ))}
              </div>
            </div>
          ))}

          <div style={{ marginTop: 28, ...cardStyle, padding: 15 }}>
            <button
              type="button"
              onClick={async () => {
                setOpen(false);
                await supabase.auth.signOut();
                navigate({ to: "/" as never, replace: true });
              }}
              style={{
                width: "100%",
                background: "none",
                border: "none",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
                fontFamily: "Poppins, sans-serif",
              }}
            >
              <IconLogout size={16} color="#FF3B30" />
              <span style={{ color: "#FF3B30", fontSize: 15, fontWeight: 700 }}>Sign out</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


function RootComponent() {
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
    "/features",
    "/pricing",
    "/how-it-works",
    "/about",
    "/contact",
  ]);
  const hasOwnMenu = new Set([
    "/home",
    "/schedule",
    "/pupils",
    "/payments",
    "/messages",
    "/more",
    "/community",
  ]);
  const isMessageThread = pathname.startsWith("/messages/");
  const showFloatingMenu =
    !hasOwnMenu.has(pathname) &&
    !hideNavExact.has(pathname) &&
    !isMessageThread &&
    // Pupil detail has its own "More" action; the FAB would float over
    // in-page controls (delete buttons, Cancel lesson row).
    !pathname.startsWith("/pupils/");
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

  const wrapperStyle: Record<string, string | number> = {};
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

  // Native wrappers: extend the webview under the iOS status bar.
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const keyboardListeners: Promise<{ remove: () => void }>[] = [];
    let appStateSub: Promise<{ remove: () => void }> | undefined;
    let backSub: Promise<{ remove: () => void }> | undefined;

    (async () => {
      try {
        setupEdgeToEdgeStatusBar();

        // Set navy status bar on native
        try {
          await StatusBar.setStyle({ style: Style.Dark });
        } catch (e) {
          console.warn('StatusBar.setStyle', e);
        }

        // Keyboard handling
        try {
          await Keyboard.setAccessoryBarVisible({ isVisible: true });
        } catch (e) {
          console.warn('Keyboard.setAccessoryBarVisible', e);
        }
        try {
          await Keyboard.setScroll({ isDisabled: false });
        } catch (e) {
          console.warn('Keyboard.setScroll', e);
        }
        try {
          keyboardListeners.push(
            Keyboard.addListener("keyboardWillShow", (info) => {
              document.documentElement.style.setProperty("--keyboard-height", `${info.keyboardHeight}px`);
            }),
          );
        } catch (e) {
          console.warn('Keyboard.addListener keyboardWillShow', e);
        }
        try {
          keyboardListeners.push(
            Keyboard.addListener("keyboardWillHide", () => {
              document.documentElement.style.setProperty("--keyboard-height", "0px");
            }),
          );
        } catch (e) {
          console.warn('Keyboard.addListener keyboardWillHide', e);
        }

        // App state changes: refresh unread count and clear badge on resume
        try {
          appStateSub = App.addListener("appStateChange", async ({ isActive }) => {
            if (isActive) {
              window.dispatchEvent(new Event("dsm-notifications-updated"));
              try {
                await (App as any).clearBadge?.();
              } catch (e) {
                console.warn('App.clearBadge', e);
              }
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
      } catch (e) {
        console.error('[native init] error:', e);
        // Never throw — never crash
      }
    })();

    return () => {
      keyboardListeners.forEach((l) => void l.then((s) => s.remove()));
      if (appStateSub) void appStateSub.then((s) => s.remove());
      if (backSub) void backSub.then((s) => s.remove());
    };
  }, []);

  // ---- Face ID / Touch ID app lock ----
  const [locked, setLocked] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const lastActiveRef = useRef<number>(Date.now());

  const unlock = useCallback(async () => {
    const success = await authenticate("Unlock DSM");
    if (success) {
      setLocked(false);
      lastActiveRef.current = Date.now();
    }
  }, []);

  useEffect(() => {
    let cleanup: (() => void) | undefined;
    let cancelled = false;

    (async () => {
      const available = await isBiometricAvailable();
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
  // in-app PushPermissionCard so the user sees a clear prompt first.
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
    supabase.auth.getUser().then(({ data }: any) => {
      if (mounted) setUserId(data.user?.id ?? null);
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
            background: "#0B1F3A",
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
              background: "#1877D6",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 8,
            }}
          >
            <span style={{ fontSize: 24, fontWeight: 800, color: "#fff" }}>DSM</span>
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#fff" }}>
            DSM by EveryDriver
          </div>
          <div
            style={{
              fontSize: 14,
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
              background: "#1877D6",
              color: "#fff",
              borderRadius: 20,
              padding: "14px 40px",
              fontSize: 15,
              fontWeight: 800,
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
      {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
      <div style={Object.keys(wrapperStyle).length ? wrapperStyle : undefined}>
        <Outlet />
      </div>
      {!hideNav && !sheetOpen && <BottomNav active={active} />}
      <CommandPalette />
      <GlobalMenu isAdmin={isAdmin} />
      <EventToastController />
      <MessageAlert userId={userId} />

      <PushPermissionSheet userId={userId} />
      <Toaster />
      {showFloatingMenu && (
        <button
          type="button"
          aria-label="Open menu"
          onClick={() => window.dispatchEvent(new Event("dsm-open-menu"))}
          style={{
            position: "fixed",
            bottom: "calc(env(safe-area-inset-bottom, 0px) + 88px)",
            right: 16,
            width: 44,
            height: 44,
            borderRadius: "50%",
            background: "#0B1F3A",
            boxShadow: "0 2px 12px rgba(0,0,0,0.2)",
            border: "none",
            cursor: "pointer",
            zIndex: 900,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <IconMenu2 size={20} color="#fff" />
        </button>
      )}
    </QueryClientProvider>
  );
}




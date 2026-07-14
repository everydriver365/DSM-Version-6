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
import { useEffect, useState, type ReactNode } from "react";
import {
  X, BookOpen, RefreshCw, Clock, Award, ArrowLeftRight, GraduationCap,
  ClipboardCheck, FileText, Receipt, Fuel, Car, MapPin, Settings, Calendar,
  Gift, FileCheck, Zap, BarChart3, Calculator, Moon, TrendingUp, Activity,
} from "lucide-react";

import appCss from "../styles.css?url";
import icon192 from "../assets/icon-192.png.asset.json";
import icon512 from "../assets/icon-512.png.asset.json";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { BottomNav, type NavKey } from "../components/dsm/BottomNav";
import { CommandPalette } from "../components/dsm/CommandPalette";
import { supabase } from "../lib/supabaseClient";


function getNotificationUrl(notification: any): string {
  if (notification.reference_type === "course_booking") return `/bookings/${notification.reference_id}`;
  if (notification.reference_type === "quote") return "/quotes";
  if (notification.reference_type === "reflective_log") return `/reflective-log/${notification.reference_id}`;
  if (notification.type === "rewards") return "/rewards";
  return "/notifications";
}

function getActiveNav(pathname: string): NavKey | undefined {
  if (pathname === "/" || pathname === "/home") return "home";
  if (pathname.startsWith("/pupils")) return "pupils";
  if (pathname.startsWith("/schedule") || pathname.startsWith("/lessons")) return "schedule";
  if (pathname.startsWith("/messages")) return "messages";
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
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
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
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
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
      { name: "viewport", content: "width=device-width, initial-scale=1.0" },
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
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Sora:wght@600;700;800&family=Manrope:wght@400;500;600;700&family=Poppins:wght@400;500;600;700;800&display=swap",
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

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const router = useRouter();
  const active = getActiveNav(router.state.location.pathname);
  const pathname = router.state.location.pathname;
  const hideNavExact = new Set([
    "/",
    "/satnav",
    "/weeklyreport",
    "/login",
    "/register",
    "/livesession",
    "/subscription",
    "/onboarding",
    "/forgotpassword",
    "/resetpassword",
    "/search",
    "/take-payment",
    "/features",
    "/pricing",
    "/how-it-works",
    "/about",
    "/contact",
  ]);
  const hideNav =
    hideNavExact.has(pathname) ||
    pathname === "/courses" ||
    pathname.startsWith("/courses/");


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
  if (!hideNav) wrapperStyle.paddingBottom = 80;
  if (!useWhiteBg) wrapperStyle.backgroundColor = "#EEF2F7";

  // Track recent screens for the search screen's "Recent" list.
  useEffect(() => {
    if (pathname === "/search") return;
    import("./search").then((m) => m.recordRecentScreen(pathname)).catch(() => {});
  }, [pathname]);

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
      setUserId(session?.user?.id ?? null);
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  // Show a browser notification for every new instructor_notifications row.
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
          console.log("[push] new notification received:", payload.new);
          if (
            typeof Notification !== "undefined" &&
            Notification.permission === "granted" &&
            "serviceWorker" in navigator
          ) {
            try {
              const registration = await navigator.serviceWorker.ready;
              const n: any = payload.new;
              registration.showNotification(n.title || "DSM", {
                body: n.body || "",
                icon: icon192.url,
                badge: icon192.url,
                tag: n.type || "dsm-notification",
                data: { url: getNotificationUrl(n) },
              });
            } catch (err) {
              console.warn("[push] showNotification failed:", err);
            }
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  // Silent background sync of external calendar on app load.
  useEffect(() => {
    if (!userId) return;

    const syncCalendar = async () => {
      try {
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
        await fetch(`${SUPABASE_URL}/functions/v1/sync-external-calendar`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ instructorId: userId }),
        });

        console.log('[calendar] External calendar synced on app open');
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
      {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
      <div style={Object.keys(wrapperStyle).length ? wrapperStyle : undefined}>
        <Outlet />
      </div>
      {!hideNav && <BottomNav active={active} />}
      <CommandPalette />
      <MoreMenu />
    </QueryClientProvider>
  );
}

function MoreMenu() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  useEffect(() => {
    const handler = () => {
      console.log("[more-menu] dsm-more-open event received");
      setOpen(true);
    };
    window.addEventListener('dsm-more-open', handler);
    return () => window.removeEventListener('dsm-more-open', handler);
  }, []);

  if (!open) return null;

  const close = () => setOpen(false);
  const go = (route: string) => { close(); navigate({ to: route as never }); };

  const groups: Array<{ label: string; items: Array<{ icon: any; colour: string; label: string; route: string }> }> = [
    { label: 'Teaching', items: [
      { icon: BookOpen, colour: '#1A52A0', label: 'EOL Wizard', route: '/eol' },
      { icon: RefreshCw, colour: '#1A52A0', label: 'Recurring', route: '/lesson-series' },
      { icon: Clock, colour: '#CC2229', label: 'Running late', route: '/running-late' },
      { icon: Award, colour: '#7C3AED', label: 'Log test', route: '/driving-test' },
      { icon: ArrowLeftRight, colour: '#7C3AED', label: 'Test swap', route: '/test-swaps' },
      { icon: GraduationCap, colour: '#16A34A', label: 'Syllabus', route: '/standards' },
      { icon: ClipboardCheck, colour: '#16A34A', label: 'Mock tests', route: '/mock-tests' },
      { icon: FileText, colour: '#9CA3AF', label: 'Lesson notes', route: '/lesson-notes' },
    ]},
    { label: 'Business', items: [
      { icon: Award, colour: '#D97706', label: 'Certifications', route: '/certifications' },
      { icon: GraduationCap, colour: '#16A34A', label: 'CPD log', route: '/cpd' },
      { icon: Receipt, colour: '#CC2229', label: 'Expenses', route: '/expenses' },
      { icon: Fuel, colour: '#D97706', label: 'Find fuel', route: '/fuel' },
      { icon: Car, colour: '#6B7280', label: 'Vehicle', route: '/vehicle' },
      { icon: MapPin, colour: '#6B7280', label: 'Mileage', route: '/mileage' },
      { icon: FileText, colour: '#1A52A0', label: 'Invoices', route: '/invoices' },
      { icon: MapPin, colour: '#1A52A0', label: 'Coverage', route: '/coverage-areas' },
    ]},
    { label: 'Admin', items: [
      { icon: Settings, colour: '#6B7280', label: 'Settings', route: '/settings' },
      { icon: Clock, colour: '#1A52A0', label: 'Availability', route: '/availability-settings' },
      { icon: Calendar, colour: '#1A52A0', label: 'Calendar sync', route: '/calendarsync' },
      { icon: Gift, colour: '#00B5A5', label: 'Referrals', route: '/referrals' },
      { icon: FileCheck, colour: '#16A34A', label: 'T&Cs', route: '/terms' },
      { icon: Zap, colour: '#D97706', label: 'Automations', route: '/automations' },
    ]},
    { label: 'Reports', items: [
      { icon: BarChart3, colour: '#1A52A0', label: 'MTD', route: '/mtd' },
      { icon: Calculator, colour: '#D97706', label: 'Tax report', route: '/tax-report' },
      { icon: Calendar, colour: '#16A34A', label: 'Weekly', route: '/weekly-report' },
      { icon: Moon, colour: '#7C3AED', label: 'End of day', route: '/end-of-day' },
      { icon: TrendingUp, colour: '#16A34A', label: 'Forecast', route: '/earnings-forecast' },
      { icon: Activity, colour: '#CC2229', label: 'Health', route: '/business-health' },
    ]},
  ];

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999, display: 'flex', flexDirection: 'column' }}>
      <div onClick={close} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)' }} />
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: '#F7FAFC', borderRadius: '20px 20px 0 0', maxHeight: '85vh', overflowY: 'auto', paddingBottom: 'calc(80px + env(safe-area-inset-bottom, 0px))' }}>
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px' }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: '#E5E7EB' }} />
        </div>
        <div style={{ padding: '8px 20px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: 700, fontSize: 18, color: '#0F2044', fontFamily: 'Poppins, sans-serif' }}>More</span>
          <button onClick={close} style={{ background: '#F3F4F6', border: 'none', borderRadius: '50%', width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={16} color="#6B7280" />
          </button>
        </div>
        {groups.map(group => (
          <div key={group.label} style={{ padding: '0 16px 16px' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10, fontFamily: 'Poppins, sans-serif' }}>
              {group.label}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
              {group.items.map(item => (
                <button
                  key={item.label}
                  onClick={() => go(item.route)}
                  style={{ background: 'white', border: '0.5px solid #F0F0F0', borderRadius: 14, padding: '12px 8px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, boxShadow: '0 2px 8px rgba(15,32,68,0.04)' }}
                >
                  <div style={{ width: 40, height: 40, borderRadius: 12, background: item.colour + '15', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <item.icon size={20} color={item.colour} />
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 600, color: '#0F2044', fontFamily: 'Poppins, sans-serif', textAlign: 'center', lineHeight: 1.2 }}>
                    {item.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ))}
        <div style={{ padding: '0 16px 16px', display: 'flex', gap: 8 }}>
          <button
            onClick={() => go('/dsm-live')}
            style={{ flex: 1, background: '#0F2044', color: 'white', border: 'none', borderRadius: 14, padding: '14px', cursor: 'pointer', fontFamily: 'Poppins, sans-serif', fontWeight: 600, fontSize: 13 }}
          >
            🔴 DSM Live
          </button>
          <button
            onClick={() => go('/marketplace')}
            style={{ flex: 1, background: '#1A52A0', color: 'white', border: 'none', borderRadius: 14, padding: '14px', cursor: 'pointer', fontFamily: 'Poppins, sans-serif', fontWeight: 600, fontSize: 13 }}
          >
            🛒 Marketplace
          </button>
        </div>
      </div>
    </div>
  );
}



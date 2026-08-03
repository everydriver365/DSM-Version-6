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
  X,
  Calendar,
  PoundSterling,
  CreditCard,
  CalendarCheck,
  Navigation,
  Zap,
  MapPin,
  Sun,
  ListTodo,
  Moon,
  Sparkles,
  TrendingUp,
  Receipt,
  Car,
  Calculator,
  FileText,
  ClipboardCheck,
  GraduationCap,
  FileSignature,
  Users,
  ShieldCheck,
  Star,
  Gift,
  Megaphone,
  BarChart3,
  Award,
  MessageCircle,
  Settings as SettingsIcon,
  RefreshCw,
  HelpCircle,
  LogOut,
} from "lucide-react";
import { IconLogout } from "@tabler/icons-react";

import appCss from "../styles.css?url";
import icon192 from "../assets/icon-192.png.asset.json";
import icon512 from "../assets/icon-512.png.asset.json";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { BottomNav, type NavKey } from "../components/dsm/BottomNav";
import { CommandPalette } from "../components/dsm/CommandPalette";
import { supabase } from "../lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { EventToastController, emitLiveEvent, type LiveEventKind } from "../components/dsm/EventToast";
import { Toaster } from "@/components/ui/sonner";



function getNotificationUrl(notification: any): string {
  if (notification.reference_type === "course_booking") return `/bookings/${notification.reference_id}`;
  if (notification.reference_type === "quote") return "/quotes";
  if (notification.reference_type === "reflective_log") return `/reflective-log/${notification.reference_id}`;
  if (notification.reference_type === "job_offer" && notification.reference_id)
    return `/messages?jobOfferId=${notification.reference_id}`;
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
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Sora:wght@600;700;800&family=Poppins:wght@400;500;600;700;800&display=swap",
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
  { label: "Schedule", icon: Calendar, to: "/schedule" },
  { label: "Take payment", icon: PoundSterling, event: "dsm-open-take-payment", fallback: "/take-payment" },
  { label: "Payments", icon: CreditCard, to: "/payments" },
  { label: "Availability", icon: CalendarCheck, to: "/availability" },
  { label: "Start tracking", icon: Navigation, to: "/live" },
  { label: "Fill slots", icon: Zap, to: "/gaps" },
  { label: "Nearby", icon: MapPin, event: "dsm-open-nearby", fallback: "/satnav" },
];

const MENU_GROUPS: { title: string; items: MenuItem[] }[] = [
  {
    title: "Daily",
    items: [
      { label: "Day briefing", icon: Sun, to: "/briefing" },
      { label: "Outstanding", icon: ListTodo, to: "/outstanding" },
      { label: "End of day", icon: Moon, to: "/end-of-day" },
      { label: "What's changed", icon: Sparkles, to: "/whats-changed" },
    ],
  },
  {
    title: "Money",
    items: [
      { label: "Earnings", icon: TrendingUp, to: "/earnings" },
      { label: "Expenses", icon: Receipt, to: "/expenses" },
      { label: "Mileage", icon: Car, to: "/mileage" },
      { label: "Tax & MTD", icon: Calculator, to: "/mtd" },
      { label: "Invoices", icon: FileText, to: "/invoices" },
    ],
  },
  {
    title: "Pupils & lessons",
    items: [
      { label: "Tests", icon: ClipboardCheck, to: "/tests" },
      { label: "Courses", icon: GraduationCap, to: "/courses" },
      { label: "Quotes", icon: FileSignature, to: "/quotes" },
      { label: "Waiting list", icon: Users, to: "/waitinglist" },
      { label: "Waivers", icon: ShieldCheck, to: "/waivers" },
    ],
  },
  {
    title: "Growth & business",
    items: [
      { label: "Reviews", icon: Star, to: "/reviews" },
      { label: "Referrals", icon: Gift, to: "/referrals" },
      { label: "Broadcast", icon: Megaphone, to: "/broadcast" },
      { label: "Reports", icon: BarChart3, to: "/reports" },
      { label: "CPD & certs", icon: Award, to: "/cpd" },
      { label: "Community", icon: MessageCircle, to: "/community" },
    ],
  },
  {
    title: "Account",
    items: [
      { label: "Settings", icon: SettingsIcon, to: "/settings" },
      { label: "Calendar sync", icon: RefreshCw, to: "/calendarsync" },
      { label: "Help", icon: HelpCircle, to: "/help" },
      { label: "Sign out", icon: LogOut, signOut: true },
    ],
  },
];

function GlobalMenu({ isAdmin }: { isAdmin: boolean }) {
  const [open, setOpen] = useState(false);
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

  const Row = ({ m, quick }: { m: MenuItem; quick?: boolean }) => {
    const Icon = m.icon;
    const isSignOut = !!m.signOut;
    return (
      <button
        type="button"
        onClick={() => go(m)}
        style={{
          width: "100%",
          minHeight: quick ? 44 : 42,
          textAlign: "left",
          padding: quick ? "10px 18px" : "9px 18px",
          background: "none",
          border: "none",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          fontFamily: "Inter, sans-serif",
        }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Icon
            size={quick ? 19 : 18}
            strokeWidth={1.8}
            color={isSignOut ? "#CC2229" : quick ? "#1877D6" : "#94A3B8"}
          />
          <span
            style={{
              fontSize: 14,
              fontWeight: quick ? 500 : 400,
              color: isSignOut ? "#CC2229" : "#0B1F3A",
            }}
          >
            {m.label}
          </span>
        </span>
      </button>
    );
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
          background: "#fff",
          boxShadow: "-4px 0 24px rgba(0,0,0,0.2)",
          display: "flex",
          flexDirection: "column",
          fontFamily: "Inter, sans-serif",
        }}
      >
        <div
          style={{
            background: "#0B1F3A",
            color: "#fff",
            padding: "16px 18px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
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
              onClick={() => setOpen(false)}
              aria-label="Close menu"
              style={{ background: "none", border: "none", color: "#fff", cursor: "pointer", display: "flex" }}
            >
              <X size={22} />
            </button>
          </div>
        </div>

        <div style={{ overflowY: "auto", flex: 1, paddingBottom: 24 }}>
          <div style={{ padding: "10px 0 10px", borderBottom: "2px solid #E2E8F0" }}>
            <div
              style={{
                fontSize: 10,
                textTransform: "uppercase",
                letterSpacing: "0.12em",
                color: "#94A3B8",
                fontWeight: 600,
                padding: "4px 18px 6px",
              }}
            >
              Quick actions
            </div>
            {QUICK_ACTIONS.map((m) => (
              <Row key={m.label} m={m} quick />
            ))}
            <Separator className="h-[0.5px] bg-[#F5CBCB]" />
            <Button
              variant="ghost"
              onClick={async () => {
                setOpen(false);
                await supabase.auth.signOut();
                navigate({ to: "/" as never, replace: true });
              }}
              className="w-full h-auto min-h-[44px] justify-start px-[18px] py-2.5 text-[13px] font-medium text-[#CC2229] hover:bg-transparent hover:text-[#CC2229] font-['Inter',sans-serif]"
            >
              <IconLogout size={16} color="#CC2229" />
              Sign out
            </Button>
          </div>

          {MENU_GROUPS.map((g) => (
            <div key={g.title} style={{ padding: "8px 0", borderBottom: "0.5px solid #EEF2F7" }}>
              <div
                style={{
                  fontSize: 10,
                  textTransform: "uppercase",
                  letterSpacing: "0.12em",
                  color: "#94A3B8",
                  fontWeight: 600,
                  padding: "4px 18px 6px",
                }}
              >
                {g.title}
              </div>
              {g.items.map((m) => (
                <Row key={m.label} m={m} />
              ))}
            </div>
          ))}
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
    "/",
    "/satnav",
    "/weeklyreport",
    "/login",
    "/register",
    "/livesession",
    "/live",
    "/gaps",
    "/community",
    "/subscription",
    "/onboarding",
    "/forgotpassword",
    "/resetpassword",
    "/search",
    "/messages",
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
            if (t.includes("booking") || t.includes("lesson")) return "booking";
            if (t.includes("call")) return "call";
            return "message";
          })();
          const text = n.title
            ? n.body
              ? `${n.title}: ${n.body}`
              : String(n.title)
            : String(n.body || "New activity");
          emitLiveEvent({ kind, text, url });
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
      {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
      <div style={Object.keys(wrapperStyle).length ? wrapperStyle : undefined}>
        <Outlet />
      </div>
      {!hideNav && !sheetOpen && <BottomNav active={active} />}
      <CommandPalette />
      <GlobalMenu isAdmin={isAdmin} />
      <EventToastController />
      <Toaster />
    </QueryClientProvider>
  );
}




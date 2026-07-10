import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";

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
  if (!useWhiteBg) wrapperStyle.backgroundColor = "#F3F8FF";

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

  return (
    <QueryClientProvider client={queryClient}>
      {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
      <div style={Object.keys(wrapperStyle).length ? wrapperStyle : undefined}>
        <Outlet />
      </div>
      {!hideNav && <BottomNav active={active} />}
      <CommandPalette />
    </QueryClientProvider>
  );
}


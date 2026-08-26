import { useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { App } from "@capacitor/app";
import { Badge } from "@capawesome/capacitor-badge";
import { supabase } from "../lib/supabaseClient";

export function useUnreadCount(options?: { skipBadge?: boolean }) {
  const skipBadge = options?.skipBadge ?? false;
  const [unreadCount, setUnreadCount] = useState(0);

  // Keep the native app-icon badge in sync with the actual unread count.
  // The database unread count remains the single source of truth here —
  // we only ever set the badge to it, never increment/clear independently.
  useEffect(() => {
    if (skipBadge) return;
    if (!Capacitor.isNativePlatform()) return;

    (async () => {
      try {
        let perm = await Badge.checkPermissions().catch(() => null);
        console.log("[badge] permission state:", perm?.display ?? "unknown");
        if (perm?.display !== "granted") {
          perm = await Badge.requestPermissions().catch(() => null);
          console.log("[badge] after request:", perm?.display ?? "unknown");
        }
        console.log("[badge] unread count:", unreadCount, "-> setting badge to:", unreadCount);

        if (unreadCount > 0) {
          await Badge.set({ count: unreadCount });
        } else {
          await Badge.clear();
        }
      } catch (e) {
        // A badge failure must never break notifications or unread-count.
        console.warn("[badge] failed to set badge:", e);
      }
    })();
  }, [unreadCount, skipBadge]);

  useEffect(() => {
    let mounted = true;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let retries = 0;

    async function fetch() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !mounted) return;

      const { count } = await supabase
        .from("instructor_notifications")
        .select("*", { count: "exact", head: true })
        .eq("instructor_id", user.id)
        .eq("read", false);

      if (mounted) setUnreadCount(count ?? 0);
    }

    // Realtime subscription. Each hook instance gets its own channel name —
    // reusing one name returns the same (already subscribed) channel and
    // adding a postgres_changes listener to it throws, crashing the page.
    // The channel is filtered to this instructor's rows and re-subscribes with
    // backoff if the socket drops, so badge counts update live without waiting
    // for a resume/foreground event.
    async function subscribe() {
      if (!mounted) return;
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;
      if (!userId || !mounted) return;

      // Realtime needs the current access token to pass RLS on the stream.
      try { supabase.realtime.setAuth(session!.access_token); } catch { /* ignore */ }

      try {
        channel = supabase
          .channel(`unread-count-${userId}-${Math.random().toString(36).slice(2)}`)
          .on("postgres_changes", {
            event: "*",
            schema: "public",
            table: "instructor_notifications",
            filter: `instructor_id=eq.${userId}`,
          }, () => { void fetch(); })
          .subscribe((status) => {
            console.log("[unread-count] realtime status:", status);
            if (status === "SUBSCRIBED") {
              retries = 0;
              void fetch();
              return;
            }
            if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
              if (!mounted) return;
              const delay = Math.min(30000, 1000 * 2 ** retries);
              retries += 1;
              if (retryTimer) clearTimeout(retryTimer);
              retryTimer = setTimeout(() => {
                if (!mounted) return;
                if (channel) { supabase.removeChannel(channel); channel = null; }
                void subscribe();
              }, delay);
            }
          });
      } catch (e) {
        console.warn("[unread-count] realtime subscribe failed:", e);
      }
    }

    void fetch();
    void subscribe();

    const onRefresh = () => { void fetch(); };
    window.addEventListener("dsm-notifications-updated", onRefresh);
    window.addEventListener("focus", onRefresh);
    document.addEventListener("visibilitychange", onRefresh);

    // Re-key the realtime socket when the session changes (token refresh,
    // sign-in/out) so the stream keeps passing RLS.
    const { data: authSub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "TOKEN_REFRESHED" && session?.access_token) {
        try { supabase.realtime.setAuth(session.access_token); } catch { /* ignore */ }
        return;
      }
      if (event === "SIGNED_IN" || event === "SIGNED_OUT") {
        if (channel) { supabase.removeChannel(channel); channel = null; }
        setUnreadCount(0);
        void fetch();
        void subscribe();
      }
    });

    let resumeListener: Promise<{ remove: () => void }> | null = null;
    if (Capacitor.isNativePlatform()) {
      try {
        resumeListener = App.addListener("resume", onRefresh);
      } catch (e) {
        console.warn("[unread-count] resume listener failed:", e);
      }
    }

    return () => {
      mounted = false;
      if (retryTimer) clearTimeout(retryTimer);
      if (channel) supabase.removeChannel(channel);
      authSub?.subscription?.unsubscribe();
      window.removeEventListener("dsm-notifications-updated", onRefresh);
      window.removeEventListener("focus", onRefresh);
      document.removeEventListener("visibilitychange", onRefresh);
      if (resumeListener) void resumeListener.then((s) => s.remove());
    };
  }, []);


  return unreadCount;
}


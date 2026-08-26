import { useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";
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

        await Badge.set({ count: unreadCount });
      } catch (e) {
        // A badge failure must never break notifications or unread-count.
        console.warn("[badge] failed to set badge:", e);
      }
    })();
  }, [unreadCount, skipBadge]);

  useEffect(() => {
    let mounted = true;

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

    fetch();


    // Realtime subscription
    const channel = supabase
      .channel("unread-count")
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "instructor_notifications",
      }, fetch)
      .subscribe();

    const onRefresh = () => { void fetch(); };
    window.addEventListener("dsm-notifications-updated", onRefresh);
    window.addEventListener("focus", onRefresh);
    document.addEventListener("visibilitychange", onRefresh);

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
      window.removeEventListener("dsm-notifications-updated", onRefresh);
      window.removeEventListener("focus", onRefresh);
      document.removeEventListener("visibilitychange", onRefresh);
    };
  }, []);

  return unreadCount;
}


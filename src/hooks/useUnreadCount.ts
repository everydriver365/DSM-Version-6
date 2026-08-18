import { useEffect, useState } from "react";
import { App } from "@capacitor/app";
import { supabase } from "../lib/supabaseClient";

export function useUnreadCount() {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        if (unreadCount > 0) {
          await App.setBadge?.({ count: unreadCount });
        } else {
          await App.clearBadge?.();
        }
      } catch {}
    })();
  }, [unreadCount]);

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

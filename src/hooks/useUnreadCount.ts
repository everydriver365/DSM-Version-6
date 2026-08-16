import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

export function useUnreadCount() {
  const [unreadCount, setUnreadCount] = useState(0);

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

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  return unreadCount;
}

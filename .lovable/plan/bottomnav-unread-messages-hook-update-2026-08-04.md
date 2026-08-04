# BottomNav unread messages hook update

## Scope
Only `src/components/dsm/BottomNav.tsx`, specifically the `useUnreadPupilMessages` hook (lines 11-44) and its single usage on line 128.

## Current hook
```tsx
function useUnreadPupilMessages(): number {
  const [count, setCount] = useState(0);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const { data: sessionRes } = await supabase.auth.getSession();
      const uid = sessionRes.session?.user?.id;
      if (!uid) {
        if (!cancelled) setCount(0);
        return;
      }
      const { count: c, error } = await supabase
        .from("chat_messages")
        .select("id", { count: "exact", head: true })
        .eq("instructor_id", uid)
        .eq("sender_type", "pupil")
        .is("read_at", null)
        .is("deleted_at", null);
      if (!cancelled && !error) setCount(c ?? 0);
    };

    load();
    const interval = window.setInterval(load, 60000);
    const onRead = () => load();
    window.addEventListener("dsm-messages-read", onRead);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
      window.removeEventListener("dsm-messages-read", onRead);
    };
  }, [pathname]);

  return count;
}
```

## Updated hook
```tsx
function useUnreadMessages(): number {
  const [count, setCount] = useState(0);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const { data: sessionRes } = await supabase.auth.getSession();
      const uid = sessionRes.session?.user?.id;
      if (!uid) {
        if (!cancelled) setCount(0);
        return;
      }

      // Count unread pupil messages via conversations
      const { data: convos } = await supabase
        .from("conversations")
        .select("unread_count")
        .eq("instructor_id", uid);

      const pupilUnread = (convos ?? []).reduce(
        (s, c) => s + (c.unread_count ?? 0),
        0
      );

      // Count unread local chat messages
      const { data: subs } = await supabase
        .from("chat_room_subscriptions")
        .select("room_id, last_read_at")
        .eq("instructor_id", uid);

      let chatUnread = 0;
      for (const sub of subs ?? []) {
        const { count: c } = await supabase
          .from("local_chat_messages")
          .select("id", { count: "exact", head: true })
          .eq("room_id", sub.room_id)
          .neq("instructor_id", uid)
          .gt("created_at", sub.last_read_at ?? "1970-01-01")
          .is("deleted_at", null);
        chatUnread += c ?? 0;
      }

      if (!cancelled) setCount(pupilUnread + chatUnread);
    };

    load();
    const interval = window.setInterval(load, 60000);
    const onRead = () => load();
    window.addEventListener("dsm-messages-read", onRead);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
      window.removeEventListener("dsm-messages-read", onRead);
    };
  }, [pathname]);

  return count;
}
```

## Rename usage
Line 128: `const unreadMessages = useUnreadPupilMessages();` becomes `const unreadMessages = useUnreadMessages();`.

No other changes to `BottomNav.tsx` will be made.

import { useEffect, useRef } from "react";
import { useRouterState } from "@tanstack/react-router";
import { supabase } from "@/lib/supabaseClient";
import { emitLiveEvent } from "./EventToast";

/**
 * Listens for incoming pupil / instructor messages and routes them into the
 * single shared notification banner (EventToastController). This component
 * renders nothing — there is only ever one banner on screen.
 */
export function MessageAlert({ userId }: { userId: string | null }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const pathRef = useRef(pathname);
  pathRef.current = pathname;

  useEffect(() => {
    if (!userId) return;

    const push = (p: {
      id: string;
      name: string;
      preview: string;
      url: string;
      avatarUrl?: string | null;
    }) => {
      // Don't interrupt if already viewing messages.
      if ((pathRef.current || "").startsWith("/messages")) return;
      emitLiveEvent({
        kind: "message",
        title: p.name,
        text: p.preview,
        url: p.url,
        avatarUrl: p.avatarUrl ?? null,
        dedupeKey: `message:${p.id}`,
      });
    };

    const channel = supabase
      .channel(`msg-alert-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `instructor_id=eq.${userId}`,
        },
        async (payload: any) => {
          const m: any = payload.new ?? {};
          if (String(m.sender_type || "") === "instructor") return;
          let name = "Pupil";
          let avatarUrl: string | null = null;
          try {
            const { data } = await supabase
              .from("pupils")
              .select("name, photo_url")
              .eq("id", m.pupil_id)
              .limit(1);
            name = (data as any)?.[0]?.name || name;
            avatarUrl = (data as any)?.[0]?.photo_url ?? null;
          } catch {
            /* ignore */
          }
          push({
            id: String(m.id ?? Date.now()),
            name,
            preview: String(m.body || "New message"),
            url: `/messages/${m.pupil_id}`,
            avatarUrl,
          });
        },
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "instructor_messages",
          filter: `to_instructor_id=eq.${userId}`,
        },
        async (payload: any) => {
          const m: any = payload.new ?? {};
          let name = "Instructor";
          try {
            const { data } = await supabase
              .from("instructors")
              .select("name")
              .eq("id", m.from_instructor_id)
              .limit(1);
            name = (data as any)?.[0]?.name || name;
          } catch {
            /* ignore */
          }
          push({
            id: String(m.id ?? Date.now()),
            name,
            preview: String(m.body || "New message"),
            url: `/messages/instructor/${m.conversation_id}`,
          });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  return null;
}

import { useEffect, useRef, useState } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

const FONT = "Poppins, sans-serif";
const NAVY = "#0B1F3A";
const BLUE = "#1877D6";

type AlertPayload = {
  id: string;
  kind: "pupil" | "instructor";
  name: string;
  preview: string;
  url: string;
  threadId: string;
};

function initials(name: string): string {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? "")
      .join("") || "?"
  );
}

export function MessageAlert({ userId }: { userId: string | null }) {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const pathRef = useRef(pathname);
  pathRef.current = pathname;

  const [alert, setAlert] = useState<AlertPayload | null>(null);
  const [shown, setShown] = useState(false);
  const timerRef = useRef<number | null>(null);

  const clearTimer = () => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const dismiss = () => {
    clearTimer();
    setShown(false);
    setAlert(null);
  };

  const push = (p: AlertPayload) => {
    // Don't interrupt if already viewing that conversation / the messages list.
    const path = pathRef.current || "";
    if (path.startsWith("/messages")) return;
    clearTimer();
    setAlert(p);
    setShown(false);
    window.requestAnimationFrame(() => setShown(true));
    timerRef.current = window.setTimeout(() => {
      setShown(false);
      window.setTimeout(() => setAlert(null), 200);
    }, 5000);
  };

  useEffect(() => {
    if (!userId) return;
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
          try {
            const { data } = await supabase
              .from("pupils")
              .select("name")
              .eq("id", m.pupil_id)
              .limit(1);
            name = (data as any)?.[0]?.name || name;
          } catch {
            /* ignore */
          }
          push({
            id: String(m.id ?? Date.now()),
            kind: "pupil",
            name,
            preview: String(m.body || "New message"),
            url: `/messages/${m.pupil_id}`,
            threadId: String(m.pupil_id),
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
            kind: "instructor",
            name,
            preview: String(m.body || "New message"),
            url: `/messages/instructor/${m.conversation_id}`,
            threadId: String(m.conversation_id ?? ""),
          });
        },
      )
      .subscribe();

    return () => {
      clearTimer();
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  if (!alert) return null;

  const isPupil = alert.kind === "pupil";

  return (
    <div
      style={{
        position: "fixed",
        top: "calc(env(safe-area-inset-top, 0px) + 12px)",
        left: 16,
        right: 16,
        zIndex: 9999,
        maxWidth: 390,
        margin: "0 auto",
        background: NAVY,
        borderRadius: 14,
        overflow: "hidden",
        fontFamily: FONT,
        boxShadow: "0 10px 30px rgba(11,31,58,0.35)",
        opacity: shown ? 1 : 0,
        transform: shown ? "translateY(0)" : "translateY(-20px)",
        transition: "transform 0.25s ease-out, opacity 0.25s ease-out",
      }}
    >
      {/* Top bar */}
      <div
        style={{
          padding: "6px 12px",
          display: "flex",
          alignItems: "center",
          gap: 6,
          borderBottom: "0.5px solid rgba(255,255,255,0.1)",
        }}
      >
        <span
          style={{ width: 6, height: 6, borderRadius: "50%", background: BLUE, flexShrink: 0 }}
        />
        <span
          style={{
            fontSize: 10,
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            color: "rgba(255,255,255,0.5)",
            flex: 1,
          }}
        >
          DSM · New message
        </span>
        <button
          type="button"
          aria-label="Dismiss"
          onClick={dismiss}
          style={{
            background: "none",
            border: "none",
            padding: 0,
            lineHeight: 0,
            cursor: "pointer",
          }}
        >
          <i
            className="ti ti-x"
            style={{ fontSize: 14, color: "rgba(255,255,255,0.4)" }}
          />
        </button>
      </div>

      {/* Main row */}
      <div style={{ padding: "10px 12px", display: "flex", alignItems: "center", gap: 10 }}>
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: "50%",
            flexShrink: 0,
            background: isPupil ? NAVY : BLUE,
            border: isPupil ? `2px solid ${BLUE}` : "none",
            color: "#FFFFFF",
            fontSize: 12,
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {initials(alert.name)}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#FFFFFF" }}>{alert.name}</div>
          <div
            style={{
              fontSize: 11,
              color: "rgba(255,255,255,0.55)",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {alert.preview}
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            const url = alert.url;
            dismiss();
            navigate({ to: url as never });
          }}
          style={{
            flexShrink: 0,
            background: "#E6F1FB",
            color: BLUE,
            fontFamily: FONT,
            fontSize: 12,
            fontWeight: 600,
            padding: "4px 12px",
            borderRadius: 20,
            border: "none",
            cursor: "pointer",
          }}
        >
          Reply
        </button>
      </div>
    </div>
  );
}

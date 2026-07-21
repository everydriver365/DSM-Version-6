import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Briefcase, MessageSquare, Mail, CalendarCheck, CalendarX, X } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

const NAVY = "#0F2044";
const BLUE = "#1877D6";
const GRAY_BODY = "#6B7A90";
const FONT = "Poppins, sans-serif";

type Row = {
  key: string;
  icon: React.ReactNode;
  tint: string;
  count: number;
  label: string;
  to: string;
};

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function storageKey(uid: string) {
  return `dsm.dailyCatchUp.lastShown.${uid}`;
}

export function DailyCatchUpSheet({
  rows,
  title,
  onDismiss,
  onRowClick,
}: {
  rows: Row[];
  title: string;
  onDismiss: () => void;
  onRowClick: (to: string) => void;
}) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        fontFamily: FONT,
      }}
    >
      <div
        onClick={onDismiss}
        style={{ position: "absolute", inset: 0, background: "rgba(15,32,68,0.35)" }}
      />
      <div
        style={{
          position: "relative",
          width: "100%",
          maxWidth: 480,
          background: "white",
          borderTopLeftRadius: 22,
          borderTopRightRadius: 22,
          padding: "10px 20px 24px",
          boxShadow: "0 -4px 24px rgba(0,0,0,0.15)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "center", padding: "4px 0 12px" }}>
          <div style={{ width: 40, height: 5, borderRadius: 999, background: "#C7CDD6" }} />
        </div>

        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: BLUE,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            marginBottom: 4,
          }}
        >
          Since yesterday
        </div>
        <h2 style={{ fontSize: 19, fontWeight: 700, color: NAVY, margin: 0, marginBottom: 14 }}>
          {title}
        </h2>

        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 18 }}>
          {rows.map((r) => (
            <button
              key={r.key}
              type="button"
              onClick={() => onRowClick(r.to)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "12px 14px",
                borderRadius: 12,
                background: "#F5F7FB",
                border: "none",
                cursor: "pointer",
                textAlign: "left",
                fontFamily: FONT,
                width: "100%",
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: r.tint,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                {r.icon}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14.5, fontWeight: 600, color: NAVY, lineHeight: 1.3 }}>
                  {r.count} {r.label}
                </div>
              </div>
              <div style={{ color: GRAY_BODY, fontSize: 18, lineHeight: 1 }}>›</div>
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={onDismiss}
          style={{
            width: "100%",
            padding: "14px 16px",
            borderRadius: 12,
            background: NAVY,
            color: "white",
            fontWeight: 600,
            fontSize: 15,
            border: "none",
            cursor: "pointer",
            fontFamily: FONT,
          }}
        >
          Got it
        </button>
      </div>
    </div>
  );
}

async function buildRows(uid: string, since: Date): Promise<Row[]> {
  const sinceIso = since.toISOString();
  const rows: Row[] = [];

  const [jobs, enquiries, messages, lessonsNew, lessonsCanc] = await Promise.all([
    supabase
      .from("job_offers")
      .select("id", { count: "exact", head: true })
      .eq("status", "open")
      .gte("created_at", sinceIso),
    supabase
      .from("enquiries")
      .select("id", { count: "exact", head: true })
      .eq("instructor_id", uid)
      .gte("created_at", sinceIso),
    supabase
      .from("chat_messages")
      .select("id", { count: "exact", head: true })
      .eq("instructor_id", uid)
      .eq("sender_type", "pupil")
      .is("read_at", null)
      .gte("created_at", sinceIso),
    supabase
      .from("lessons")
      .select("id", { count: "exact", head: true })
      .eq("instructor_id", uid)
      .neq("status", "cancelled")
      .gte("created_at", sinceIso),
    supabase
      .from("lessons")
      .select("id", { count: "exact", head: true })
      .eq("instructor_id", uid)
      .eq("status", "cancelled")
      .gte("updated_at", sinceIso),
  ]).catch(() => [] as any);

  const push = (
    count: number | null | undefined,
    key: string,
    labelSingular: string,
    labelPlural: string,
    icon: React.ReactNode,
    tint: string,
    to: string,
  ) => {
    const n = count ?? 0;
    if (n <= 0) return;
    rows.push({ key, count: n, label: n === 1 ? labelSingular : labelPlural, icon, tint, to });
  };

  push(jobs?.count, "jobs", "new job", "new jobs", <Briefcase size={18} color="#B5661E" />, "#FBEFDF", "/jobs");
  push(enquiries?.count, "enquiries", "new enquiry", "new enquiries", <Mail size={18} color={BLUE} />, "#E5EFFA", "/enquiries");
  push(messages?.count, "messages", "new message", "new messages", <MessageSquare size={18} color={BLUE} />, "#E5EFFA", "/messages");
  push(lessonsNew?.count, "bookings", "new booking", "new bookings", <CalendarCheck size={18} color="#1B7F3B" />, "#E7F5EE", "/schedule");
  push(lessonsCanc?.count, "cancellations", "cancellation", "cancellations", <CalendarX size={18} color="#CC2229" />, "#FBE6E7", "/schedule");

  return rows;
}

export function DailyCatchUpController({ userId }: { userId: string | null }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    (async () => {
      const key = storageKey(userId);
      let lastShown: string | null = null;
      try {
        lastShown = localStorage.getItem(key);
      } catch {}
      const today = todayKey();
      if (lastShown === today) return;

      // "Since yesterday": 24h window if we have a prior date, else last 24h.
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const built = await buildRows(userId, since);
      if (cancelled) return;
      // Always mark today so we don't re-query on every mount, even when empty.
      try {
        localStorage.setItem(key, today);
      } catch {}
      if (built.length === 0) return;
      setRows(built);
      setOpen(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  if (!open || !userId) return null;

  const total = rows.reduce((s, r) => s + r.count, 0);
  const title =
    total === 1 ? "1 thing needs your attention" : `${total} things need your attention`;

  return (
    <DailyCatchUpSheet
      rows={rows}
      title={title}
      onDismiss={() => setOpen(false)}
      onRowClick={(to) => {
        setOpen(false);
        navigate({ to });
      }}
    />
  );
}

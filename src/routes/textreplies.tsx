import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { IconRefresh } from "@tabler/icons-react";
import DSMTopSheet from "@/components/dsm/DSMTopSheet";
import { tokens } from "@/lib/tokens";
import { supabase } from "../lib/supabaseClient";

export const Route = createFileRoute("/textreplies")({
  head: () => ({
    meta: [
      { title: "Text replies — EDP by EveryDriver" },
      {
        name: "description",
        content: "Every incoming text reply with the time, pupil, message and what happened to it.",
      },
      { property: "og:title", content: "Text replies — EDP by EveryDriver" },
      {
        property: "og:description",
        content: "Every incoming text reply with the time, pupil, message and what happened to it.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TextRepliesPage,
});

const POPPINS = { fontFamily: "Poppins, sans-serif" } as const;

type LogRow = {
  id: string;
  created_at: string;
  instructor_id: string | null;
  pupil_id: string | null;
  from_number: string | null;
  body: string | null;
  outcome: string;
  detail: string | null;
};

const OUTCOME_LABEL: Record<string, string> = {
  invalid_signature: "Rejected — not verified as from the text network",
  no_pupil_match: "No pupil with this number",
  logged_only: "Saved to the chat",
  booked: "Lesson booked",
  clash: "Accepted, but the slot clashed",
  no_open_offer: "Said yes, but no offer was open",
  error: "Something went wrong",
};

const OUTCOME_COLOUR: Record<string, { bg: string; fg: string }> = {
  booked: { bg: "#E6F6EC", fg: "#1B7F45" },
  logged_only: { bg: "#EAF5FC", fg: "#1877D6" },
  clash: { bg: "#FFF3E0", fg: "#A05A00" },
  no_open_offer: { bg: "#FFF3E0", fg: "#A05A00" },
  no_pupil_match: { bg: "#FDECEC", fg: "#CC2229" },
  invalid_signature: { bg: "#FDECEC", fg: "#CC2229" },
  error: { bg: "#FDECEC", fg: "#CC2229" },
};

function whenLabel(iso: string): string {
  try {
    return new Date(iso).toLocaleString("en-GB", {
      weekday: "short",
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Europe/London",
    });
  } catch {
    return iso;
  }
}

function TextRepliesPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<LogRow[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data: userData } = await supabase.auth.getUser();
    const uid = userData.user?.id;
    if (!uid) {
      navigate({ to: "/login", replace: true });
      return;
    }

    const { data, error: err } = await supabase
      .from("sms_inbound_log")
      .select("id, created_at, instructor_id, pupil_id, from_number, body, outcome, detail")
      .order("created_at", { ascending: false })
      .limit(100);

    if (err) {
      setError(
        err.message?.includes("sms_inbound_log")
          ? "The reply log isn't set up on the database yet."
          : err.message || "Could not load the reply log.",
      );
      setRows([]);
      setLoading(false);
      return;
    }

    const list = (data ?? []) as LogRow[];
    setRows(list);

    const pupilIds = Array.from(
      new Set(list.map((r) => r.pupil_id).filter((v): v is string => !!v)),
    );
    if (pupilIds.length) {
      const { data: pupils } = await supabase
        .from("pupils")
        .select("id, name")
        .in("id", pupilIds);
      const map: Record<string, string> = {};
      for (const p of (pupils ?? []) as { id: string; name: string | null }[]) {
        if (p.name) map[p.id] = p.name;
      }
      setNames(map);
    }
    setLoading(false);
  }, [navigate]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <DSMTopSheet title="Text replies" onBack={() => navigate({ to: "/settings" as never })}>
      <div style={{ ...POPPINS, minHeight: "100%" }}>
        <div className="px-4 pb-16">
          <div
            className="mt-3"
            style={{
              backgroundColor: "#E7F1FC",
              borderRadius: tokens.radiusCard,
              padding: "14px 16px",
              fontSize: 13,
              color: "#0B2341",
              lineHeight: 1.45,
            }}
          >
            Every text that arrives on your number is listed here with what happened to it — so you
            can see exactly where a "YES" ended up.
          </div>

          <button
            type="button"
            onClick={() => void load()}
            style={{
              ...POPPINS,
              marginTop: 12,
              marginBottom: 4,
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: "transparent",
              border: "none",
              color: "#1877D6",
              fontSize: 13.5,
              fontWeight: 700,
              padding: 0,
            }}
          >
            <IconRefresh size={16} stroke={1.8} />
            Refresh
          </button>

          {loading ? (
            <p style={{ fontSize: 13.5, color: "#536579", marginTop: 16 }}>Loading…</p>
          ) : error ? (
            <p style={{ fontSize: 13.5, color: "#CC2229", marginTop: 16 }}>{error}</p>
          ) : rows.length === 0 ? (
            <p style={{ fontSize: 13.5, color: "#536579", marginTop: 16 }}>
              No incoming texts recorded yet.
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 12 }}>
              {rows.map((r) => {
                const colour = OUTCOME_COLOUR[r.outcome] ?? { bg: "#EEF1F5", fg: "#536579" };
                const who = r.pupil_id
                  ? names[r.pupil_id] ?? "Pupil"
                  : `Unknown number${r.from_number ? ` (${r.from_number})` : ""}`;
                return (
                  <div
                    key={r.id}
                    style={{
                      background: "#FFFFFF",
                      border: "1px solid #E4E8EF",
                      borderRadius: 12,
                      padding: "12px 14px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <span style={{ fontSize: 14, fontWeight: 700, color: "#0B2341" }}>{who}</span>
                      <span style={{ fontSize: 11.5, color: "#7A8BA0" }}>
                        {whenLabel(r.created_at)}
                      </span>
                    </div>

                    <p style={{ fontSize: 13.5, color: "#243B53", margin: "8px 0 10px" }}>
                      {r.body?.trim() ? r.body : "(no message text)"}
                    </p>

                    <span
                      style={{
                        display: "inline-block",
                        background: colour.bg,
                        color: colour.fg,
                        borderRadius: 999,
                        padding: "4px 10px",
                        fontSize: 11.5,
                        fontWeight: 700,
                      }}
                    >
                      {OUTCOME_LABEL[r.outcome] ?? r.outcome}
                    </span>

                    {r.detail ? (
                      <p style={{ fontSize: 12, color: "#7A8BA0", marginTop: 8 }}>{r.detail}</p>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </DSMTopSheet>
  );
}
